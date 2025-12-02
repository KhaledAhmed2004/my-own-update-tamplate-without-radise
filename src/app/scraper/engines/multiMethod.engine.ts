/**
 * Multi-Method Scraping Engine
 * Multiple fallback methods দিয়ে scraping করে
 * Direct → AllOrigins → CORSProxy → Error
 *
 * Supabase scraping project এর মতো multi-method approach
 */

import * as cheerio from 'cheerio';
import { IScraperEngine, IScrapeOptions } from '../scraper.interface';
import { CheerioEngine } from './cheerio.engine';
import { PuppeteerEngine } from './puppeteer.engine';
import { fetchWithAllOrigins, fetchWithCorsProxy, IProxyResult } from '../proxy';
import { detectCaptcha, detectBlocking, getHumanReadableError } from '../antiBot/captcha';
import { logger } from '../../../shared/logger';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

// Track which methods were tried
export interface IMethodAttempt {
  method: string;
  success: boolean;
  error?: string;
  duration?: number;
}

export interface IMultiMethodResult {
  html: string;
  methodUsed: string;
  attempts: IMethodAttempt[];
}

/**
 * Check if HTML indicates blocking/CAPTCHA
 * HTML এ block বা CAPTCHA আছে কিনা check করে
 *
 * Smarter detection:
 * - Large HTML (>50KB) with product indicators = likely valid
 * - Small HTML (<10KB) with CAPTCHA = likely blocked
 * - Check for actual product content before declaring blocked
 */
function isBlocked(html: string): boolean {
  if (!html || html.length < 100) return true;

  const lowerHtml = html.toLowerCase();

  // If we have substantial content (>50KB) and product indicators, it's probably valid
  // Even if there are some CAPTCHA-related words in navigation/footer
  if (html.length > 50000) {
    // Check for product page indicators
    const productIndicators = [
      'addtocart', 'add-to-cart', 'buy-now', 'buynow',
      'product-title', 'producttitle', '#productTitle',
      'price', 'a-price', 'priceblock',
      'product-image', 'imgTagWrapperId',
      'product-description', 'feature-bullets',
      'reviews', 'rating', 'stars',
    ];

    const hasProductContent = productIndicators.some(indicator =>
      lowerHtml.includes(indicator.toLowerCase())
    );

    if (hasProductContent) {
      logger.info(`[Scraper] Large page (${Math.round(html.length/1024)}KB) with product content - accepting`);
      return false; // Valid product page
    }
  }

  // For smaller pages, check strictly for CAPTCHA
  const captchaInfo = detectCaptcha(html);

  // Only consider blocked if high confidence CAPTCHA (>50%)
  // AND the page is small (likely a CAPTCHA page, not a product page)
  if (captchaInfo.detected && captchaInfo.confidence > 50 && html.length < 50000) {
    logger.warn(`[Scraper] CAPTCHA detected (confidence: ${captchaInfo.confidence}%, type: ${captchaInfo.type})`);
    return true;
  }

  // Check for explicit blocking pages (usually small)
  if (html.length < 20000) {
    const blockInfo = detectBlocking(html);
    if (blockInfo.blocked) {
      logger.warn(`[Scraper] Blocking detected: ${blockInfo.reason}`);
      return true;
    }
  }

  return false;
}

/**
 * Determine which direct engine to use
 * URL দেখে কোন engine use করবে decide করে
 */
function selectDirectEngine(url: string, options: IScrapeOptions): IScraperEngine {
  // JS-heavy domains need Puppeteer
  const jsHeavyDomains = [
    'amazon.', 'ebay.', 'walmart.', 'target.',
    'instagram.', 'twitter.', 'x.com', 'facebook.',
    'linkedin.', 'pinterest.', 'airbnb.', 'booking.com',
  ];

  const urlLower = url.toLowerCase();
  const needsPuppeteer = jsHeavyDomains.some(domain => urlLower.includes(domain));

  if (options.engine === 'puppeteer' || needsPuppeteer) {
    return PuppeteerEngine;
  }

  if (options.engine === 'cheerio') {
    return CheerioEngine;
  }

  // Default to Cheerio for speed
  return CheerioEngine;
}

export const MultiMethodEngine: IScraperEngine = {
  name: 'auto', // Uses 'auto' as the engine name

  /**
   * Initialize - prepare engines
   */
  async initialize(options: IScrapeOptions): Promise<void> {
    // Initialize both engines
    await CheerioEngine.initialize(options);
    // Puppeteer will be initialized on-demand
  },

  /**
   * Fetch using multiple methods with fallback
   * একাধিক method দিয়ে চেষ্টা করে, এক fail হলে পরেরটা try করে
   */
  async fetch(url: string, options: IScrapeOptions): Promise<string> {
    const attempts: IMethodAttempt[] = [];
    let lastError: Error | null = null;

    // Method 1: Direct fetch (Cheerio or Puppeteer based on URL)
    const directEngine = selectDirectEngine(url, options);
    const directMethodName = directEngine.name === 'puppeteer' ? 'puppeteer' : 'direct';

    try {
      logger.info(`[Scraper] Method 1: ${directMethodName} fetch for ${url}`);
      const startTime = Date.now();

      await directEngine.initialize(options);
      const html = await directEngine.fetch(url, options);

      if (!isBlocked(html)) {
        attempts.push({
          method: directMethodName,
          success: true,
          duration: Date.now() - startTime,
        });
        logger.info(`[Scraper] ${directMethodName} succeeded`);
        return html;
      }

      attempts.push({
        method: directMethodName,
        success: false,
        error: 'Blocked or CAPTCHA detected',
        duration: Date.now() - startTime,
      });
      logger.warn(`[Scraper] ${directMethodName} blocked, trying proxies...`);
    } catch (error: any) {
      attempts.push({
        method: directMethodName,
        success: false,
        error: error.message,
      });
      lastError = error;
      logger.warn(`[Scraper] ${directMethodName} failed: ${error.message}`);
    }

    // Method 2: AllOrigins Proxy
    try {
      logger.info('[Scraper] Method 2: AllOrigins proxy');
      const startTime = Date.now();
      const result: IProxyResult = await fetchWithAllOrigins(url);

      if (result.success && result.html && !isBlocked(result.html)) {
        attempts.push({
          method: 'allorigins',
          success: true,
          duration: Date.now() - startTime,
        });
        logger.info('[Scraper] AllOrigins succeeded');
        return result.html;
      }

      attempts.push({
        method: 'allorigins',
        success: false,
        error: result.error || 'Blocked',
        duration: Date.now() - startTime,
      });
    } catch (error: any) {
      attempts.push({
        method: 'allorigins',
        success: false,
        error: error.message,
      });
      lastError = error;
    }

    // Method 3: CORSProxy.io
    try {
      logger.info('[Scraper] Method 3: CORSProxy');
      const startTime = Date.now();
      const result: IProxyResult = await fetchWithCorsProxy(url);

      if (result.success && result.html && !isBlocked(result.html)) {
        attempts.push({
          method: 'corsproxy',
          success: true,
          duration: Date.now() - startTime,
        });
        logger.info('[Scraper] CORSProxy succeeded');
        return result.html;
      }

      attempts.push({
        method: 'corsproxy',
        success: false,
        error: result.error || 'Blocked',
        duration: Date.now() - startTime,
      });
    } catch (error: any) {
      attempts.push({
        method: 'corsproxy',
        success: false,
        error: error.message,
      });
      lastError = error;
    }

    // All methods failed - throw human-readable error
    const methodsTried = attempts.map(a => a.method);
    const errorInfo = getHumanReadableError('ALL_METHODS_FAILED', url, methodsTried);

    logger.error(`[Scraper] All ${attempts.length} methods failed for ${url}`);

    // Create error with human-readable message and full details
    const error = new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      `${errorInfo.message}. ${errorInfo.suggestion}`
    );

    // Attach error details for API response
    (error as any).errorInfo = errorInfo;

    throw error;
  },

  /**
   * Parse HTML with Cheerio
   */
  getDocument(html: string) {
    return cheerio.load(html, {
      xmlMode: false,
      decodeEntities: true,
    });
  },

  /**
   * Cleanup all engines
   */
  async cleanup(): Promise<void> {
    await CheerioEngine.cleanup();
    await PuppeteerEngine.cleanup();
  },

  /**
   * Multi-method can handle any URL
   */
  canHandle(_url: string, _options: IScrapeOptions): boolean {
    return true; // Can handle any URL with fallbacks
  },
};

export default MultiMethodEngine;
