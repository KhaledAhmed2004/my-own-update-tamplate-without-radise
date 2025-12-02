/**
 * Scraping Pipeline
 * Main orchestrator - সব components কে coordinate করে scrape চালায়
 */

import {
  IScrapeOptions,
  IScrapeResult,
  IPipelineContext,
  ExtractorType,
  ScrapeMode,
} from './scraper.interface';
import { selectBestEngine, cleanupAllEngines } from './engines';
import { runExtractors } from './extractors';
import { smartDetectBlocking, isRetryableError } from './antiBot/captcha';
import { exponentialBackoff } from './antiBot/delay';
import { logger } from '../../shared/logger';
import ApiError from '../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// Default extractors
const DEFAULT_EXTRACTORS: ExtractorType[] = ['text', 'images', 'links'];

// ==================== Mode Configurations ====================
// Controls speed vs safety trade-off for scraping
// Each mode adjusts delays, timeouts, and behavior simulation

export interface IModeConfig {
  preDelay: { min: number; max: number }; // Pre-request random delay
  waitForMultiplier: number; // Multiplier for site-specific waitFor (1.0 = unchanged)
  scrollTimeout: number; // Max scroll duration in ms
  humanBehavior: boolean; // Whether to simulate human behavior
  scrollEnabled: boolean; // Whether to scroll for lazy content
}

export const MODE_CONFIGS: Record<ScrapeMode, IModeConfig> = {
  // Quick mode: Fastest, medium bot detection risk
  // Best for: Generic sites, testing, sites without bot protection
  quick: {
    preDelay: { min: 300, max: 800 }, // 0.3-0.8s (was 2-5s)
    waitForMultiplier: 0.4, // 40% of normal wait (e.g., 5s → 2s)
    scrollTimeout: 3000, // 3s max scroll (was 10s)
    humanBehavior: false, // Skip human simulation
    scrollEnabled: false, // Skip scrolling
  },

  // Balanced mode: Recommended, low risk
  // Best for: Most e-commerce sites, production use
  balanced: {
    preDelay: { min: 800, max: 1500 }, // 0.8-1.5s
    waitForMultiplier: 0.6, // 60% of normal wait (e.g., 5s → 3s)
    scrollTimeout: 5000, // 5s max scroll
    humanBehavior: true, // Minimal human simulation
    scrollEnabled: true, // Faster scroll
  },

  // Safe mode: Slowest, very low risk (current behavior)
  // Best for: Amazon, Walmart, Target, critical data
  safe: {
    preDelay: { min: 2000, max: 5000 }, // 2-5s (current)
    waitForMultiplier: 1.0, // 100% of normal wait (unchanged)
    scrollTimeout: 10000, // 10s max scroll (current)
    humanBehavior: true, // Full human simulation
    scrollEnabled: true, // Full scroll
  },
};

// Default mode for sites (user-provided mode always takes priority)
const SITE_DEFAULT_MODES: Record<string, ScrapeMode> = {
  'amazon.': 'safe', // Strict bot detection - always use safe
  // Other sites use balanced by default
};

/**
 * Get the effective mode for a scrape operation
 * User-provided mode > Site-specific default > Global default (balanced)
 */
export const getEffectiveMode = (
  options: IScrapeOptions
): ScrapeMode => {
  // User explicitly set mode - always respect it
  if (options.mode) {
    return options.mode;
  }

  // Check site-specific default
  const urlLower = options.url.toLowerCase();
  for (const [pattern, mode] of Object.entries(SITE_DEFAULT_MODES)) {
    if (urlLower.includes(pattern)) {
      return mode;
    }
  }

  // Global default: balanced
  return 'balanced';
};

/**
 * Get mode configuration for a scrape operation
 */
export const getModeConfig = (options: IScrapeOptions): IModeConfig => {
  const mode = getEffectiveMode(options);
  return MODE_CONFIGS[mode] || MODE_CONFIGS.balanced;
};

// JS-heavy sites that need extra wait time for React/Vue rendering
// waitUntil: 'domcontentloaded' is used for sites with endless background requests
const JS_HEAVY_SITES_WITH_WAIT = [
  { pattern: 'aliexpress.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 45000 },
  { pattern: 'tmall.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 45000 },
  { pattern: 'taobao.', waitFor: 5000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 45000 },
  { pattern: 'temu.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 40000 },
  { pattern: 'shein.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 40000 },
  { pattern: 'wish.', waitFor: 3000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 35000 },
  // Walmart and Target - NextJS/React sites with bot protection
  { pattern: 'walmart.', waitFor: 4000, scrollToBottom: true, waitUntil: 'domcontentloaded' as const, timeout: 40000 },
  { pattern: 'target.', waitFor: 3500, scrollToBottom: true, waitUntil: 'networkidle2' as const, timeout: 35000 },
];

/**
 * Apply site-specific browser options
 * JS-heavy sites এর জন্য extra wait time এবং scroll options add করে
 */
const applySiteSpecificOptions = (options: IScrapeOptions): IScrapeOptions => {
  const urlLower = options.url.toLowerCase();

  for (const site of JS_HEAVY_SITES_WITH_WAIT) {
    if (urlLower.includes(site.pattern)) {
      // Only apply if not explicitly set by user
      const browserOptions = options.browser || {};

      return {
        ...options,
        browser: {
          ...browserOptions,
          // Add extra wait time for JS rendering (5s for AliExpress)
          waitFor: browserOptions.waitFor ?? site.waitFor,
          // Enable scroll to load lazy content
          scrollToBottom: browserOptions.scrollToBottom ?? site.scrollToBottom,
          // Longer timeout for heavy JS sites (45s for AliExpress)
          timeout: browserOptions.timeout ?? site.timeout,
          // Use domcontentloaded for sites with endless background requests
          waitUntil: browserOptions.waitUntil ?? site.waitUntil,
        },
      };
    }
  }

  return options;
};

/**
 * Main scraping pipeline
 * URL থেকে data scrape করে return করে
 */
export const scrapePipeline = async (
  options: IScrapeOptions
): Promise<IScrapeResult> => {
  const startTime = Date.now();

  // Apply site-specific options (e.g., extra wait for AliExpress)
  const enhancedOptions = applySiteSpecificOptions(options);

  // Initialize context
  const context: IPipelineContext = {
    url: enhancedOptions.url,
    options: enhancedOptions,
    result: {
      url: enhancedOptions.url,
      status: 'success',
      engine: enhancedOptions.engine || 'auto',
      data: {},
      timing: {
        fetchMs: 0,
        extractMs: 0,
        totalMs: 0,
      },
    },
    errors: [],
    startTime,
  };

  // Select best engine
  const engine = selectBestEngine(enhancedOptions.url, enhancedOptions);
  context.result.engine = engine.name;

  // Log browser options for debugging JS-heavy sites
  if (enhancedOptions.browser?.waitFor) {
    logger.info(
      `[Scraper] Starting scrape: ${enhancedOptions.url} with ${engine.name} engine (waitFor: ${enhancedOptions.browser.waitFor}ms, scrollToBottom: ${enhancedOptions.browser.scrollToBottom})`
    );
  } else {
    logger.info(`[Scraper] Starting scrape: ${enhancedOptions.url} with ${engine.name} engine`);
  }

  // Retry configuration
  const maxRetries = enhancedOptions.protection?.maxRetries ?? 3;
  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Initialize engine
      await engine.initialize(enhancedOptions);

      // FETCH PHASE
      const fetchStart = Date.now();
      context.html = await engine.fetch(enhancedOptions.url, enhancedOptions);
      context.result.timing!.fetchMs = Date.now() - fetchStart;

      // Smart detection - considers page size and product content
      // Large pages (>50KB) with product indicators are accepted even if they have CAPTCHA words
      const blockingResult = smartDetectBlocking(context.html);

      if (blockingResult.isBlocked) {
        context.result.protection = {
          ...context.result.protection,
          captchaDetected: !!blockingResult.captchaType,
          blocked: !blockingResult.captchaType,
        };

        logger.warn(
          `[Scraper] Page blocked: ${blockingResult.reason} (confidence: ${blockingResult.confidence}%, size: ${Math.round(blockingResult.pageSize / 1024)}KB)`
        );

        throw new ApiError(
          StatusCodes.FORBIDDEN,
          blockingResult.captchaType
            ? `CAPTCHA detected (${blockingResult.captchaType}) - website requires human verification`
            : `Access blocked - ${blockingResult.reason || 'website denied the request'}`
        );
      }

      // Log if page was large and accepted despite potential CAPTCHA words
      if (blockingResult.hasProductContent && blockingResult.pageSize > 50000) {
        logger.info(
          `[Scraper] Large page (${Math.round(blockingResult.pageSize / 1024)}KB) with product content - accepted`
        );
      }

      // PARSE PHASE
      context.document = engine.getDocument(context.html);

      // EXTRACT PHASE
      const extractStart = Date.now();
      const extractors = enhancedOptions.extractors || DEFAULT_EXTRACTORS;

      const extractedData = await runExtractors(
        extractors,
        context.document,
        enhancedOptions.url,
        enhancedOptions.selectors
      );

      context.result.timing!.extractMs = Date.now() - extractStart;

      // Map extracted data to result
      if (extractedData.text) context.result.data!.text = extractedData.text;
      if (extractedData.images) context.result.data!.images = extractedData.images;
      if (extractedData.links) context.result.data!.links = extractedData.links;
      if (extractedData.tables) context.result.data!.tables = extractedData.tables;
      if (extractedData.prices) context.result.data!.prices = extractedData.prices;
      if (extractedData.product) context.result.data!.product = extractedData.product;
      if (extractedData.metadata) context.result.data!.metadata = extractedData.metadata;
      if (extractedData.custom) context.result.data!.custom = extractedData.custom;

      // Handle extraction errors
      if (extractedData._errors) {
        for (const err of extractedData._errors) {
          context.errors!.push({
            phase: 'extract',
            message: err.message,
            extractor: err.extractor,
          });
        }
      }

      // Success!
      logger.info(
        `[Scraper] Completed: ${enhancedOptions.url} in ${Date.now() - startTime}ms`
      );

      break; // Exit retry loop
    } catch (error: any) {
      lastError = error;

      // Record error
      context.errors!.push({
        phase: 'fetch',
        message: error.message || 'Unknown error',
      });

      // Check if retryable
      if (isRetryableError(error, context.html) && attempt < maxRetries) {
        logger.warn(
          `[Scraper] Attempt ${attempt} failed, retrying: ${error.message}`
        );

        // Exponential backoff
        await exponentialBackoff(attempt, enhancedOptions.protection?.retryDelay || 2000);

        // Track retry count
        context.result.protection = {
          ...context.result.protection,
          retryCount: attempt,
        };

        continue; // Retry
      }

      // Non-retryable or max retries reached
      context.result.status = 'failed';

      // Re-throw ApiError
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        `Scrape failed: ${error.message}`
      );
    }
  }

  // Finalize timing
  context.result.timing!.totalMs = Date.now() - startTime;

  // 🆕 Add mode to timing for API response visibility
  context.result.timing!.mode = getEffectiveMode(enhancedOptions);

  // Set status based on errors
  if (context.errors!.length > 0 && context.result.status === 'success') {
    context.result.status = 'partial';
  }

  // Add errors to result
  if (context.errors!.length > 0) {
    context.result.errors = context.errors;
  }

  return context.result as IScrapeResult;
};

/**
 * Scrape product specifically
 * Product page scrape করার জন্য shortcut function
 */
export const scrapeProduct = async (
  url: string,
  selectors?: IScrapeOptions['selectors']
): Promise<IScrapeResult['data']['product']> => {
  const result = await scrapePipeline({
    url,
    extractors: ['product'],
    selectors,
  });

  if (result.status === 'failed') {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      result.errors?.[0]?.message || 'Product scrape failed'
    );
  }

  return result.data.product;
};

/**
 * Quick scrape - just fetch and extract basics
 * দ্রুত scrape করার জন্য
 */
export const quickScrape = async (
  url: string
): Promise<IScrapeResult> => {
  return scrapePipeline({
    url,
    extractors: ['text', 'metadata'],
    protection: {
      maxRetries: 1,
      randomDelay: false,
    },
  });
};

/**
 * Cleanup all scraper resources
 * সব resources cleanup করে (browser close, etc.)
 */
export const cleanupScraper = async (): Promise<void> => {
  await cleanupAllEngines();
  logger.info('[Scraper] All resources cleaned up');
};

// Alias export for convenience
export { scrapePipeline as scrape };
