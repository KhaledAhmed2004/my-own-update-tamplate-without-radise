/**
 * Scrape Helper
 * Web scraping এর জন্য main entry point
 *
 * Usage:
 * ```typescript
 * import { scrapeHelper } from '../helpers/scrapeHelper';
 *
 * // Simple product scrape
 * const product = await scrapeHelper.scrapeProduct('https://amazon.com/dp/B0EXAMPLE');
 *
 * // Full scrape with options
 * const result = await scrapeHelper.scrape({
 *   url: 'https://example.com',
 *   extractors: ['text', 'images', 'prices'],
 * });
 * ```
 */

import {
  IScrapeOptions,
  IScrapeResult,
  IExtractedProduct,
  IScrapeHelperResponse,
  ExtractorType,
  ScraperEngine,
} from '../app/scraper/scraper.interface';
import {
  scrapePipeline,
  scrapeProduct as pipelineScrapeProduct,
  quickScrape as pipelineQuickScrape,
  cleanupScraper,
} from '../app/scraper/pipeline';
import { getAvailableEngines } from '../app/scraper/engines';
import { getAvailableExtractors } from '../app/scraper/extractors';
import { logger } from '../shared/logger';

/**
 * Main scrape function
 * URL থেকে data scrape করে
 *
 * @param options - Scrape options
 * @returns Scrape result with extracted data
 *
 * @example
 * ```typescript
 * const result = await scrapeHelper.scrape({
 *   url: 'https://www.amazon.com/dp/B0EXAMPLE',
 *   extractors: ['product', 'images'],
 *   browser: {
 *     waitFor: '#productTitle',
 *   }
 * });
 * ```
 */
const scrape = async (options: IScrapeOptions): Promise<IScrapeHelperResponse> => {
  // Validate URL
  if (!options.url) {
    throw new Error('URL is required');
  }

  try {
    new URL(options.url);
  } catch {
    throw new Error('Invalid URL format');
  }

  logger.info(`[scrapeHelper] Starting scrape: ${options.url}`);

  const result = await scrapePipeline(options);

  return {
    ...result,
    savedToDb: false,
  };
};

/**
 * Scrape product page (Amazon-optimized)
 * E-commerce product page থেকে product data extract করে
 *
 * @param url - Product page URL
 * @param selectors - Optional custom selectors
 * @returns Product data
 *
 * @example
 * ```typescript
 * const product = await scrapeHelper.scrapeProduct(
 *   'https://www.amazon.com/dp/B0EXAMPLE'
 * );
 *
 * console.log(product.title);
 * console.log(product.price.current);
 * console.log(product.images);
 * ```
 */
const scrapeProduct = async (
  url: string,
  selectors?: IScrapeOptions['selectors']
): Promise<IExtractedProduct> => {
  // Validate URL
  if (!url) {
    throw new Error('URL is required');
  }

  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  logger.info(`[scrapeHelper] Scraping product: ${url}`);

  const product = await pipelineScrapeProduct(url, selectors);

  if (!product) {
    throw new Error('Failed to extract product data');
  }

  return product;
};

/**
 * Quick scrape - fast text and metadata extraction
 * দ্রুত basic data extract করতে
 *
 * @param url - Page URL
 * @returns Basic scrape result
 */
const quickScrape = async (url: string): Promise<IScrapeResult> => {
  if (!url) {
    throw new Error('URL is required');
  }

  logger.info(`[scrapeHelper] Quick scrape: ${url}`);

  return pipelineQuickScrape(url);
};

/**
 * Scrape multiple URLs
 * একাধিক URLs scrape করতে
 *
 * @param urls - Array of URLs
 * @param options - Common options for all URLs
 * @returns Array of scrape results
 *
 * @example
 * ```typescript
 * const results = await scrapeHelper.scrapeMultiple([
 *   'https://amazon.com/dp/B001',
 *   'https://amazon.com/dp/B002',
 * ], {
 *   extractors: ['product'],
 * });
 * ```
 */
const scrapeMultiple = async (
  urls: string[],
  options?: Omit<IScrapeOptions, 'url'>
): Promise<IScrapeHelperResponse[]> => {
  if (!urls || urls.length === 0) {
    throw new Error('At least one URL is required');
  }

  logger.info(`[scrapeHelper] Scraping ${urls.length} URLs`);

  const results: IScrapeHelperResponse[] = [];

  // Scrape sequentially to respect rate limits
  for (const url of urls) {
    try {
      const result = await scrape({
        ...options,
        url,
      });
      results.push(result);
    } catch (error: any) {
      // Add failed result
      results.push({
        url,
        status: 'failed',
        engine: options?.engine || 'auto',
        data: {},
        timing: { fetchMs: 0, extractMs: 0, totalMs: 0 },
        errors: [{ phase: 'fetch', message: error.message }],
        savedToDb: false,
      });
    }
  }

  return results;
};

/**
 * Get available scraping engines
 * Available engines এর list
 */
const getEngines = (): ScraperEngine[] => {
  return getAvailableEngines();
};

/**
 * Get available extractors
 * Available extractors এর list
 */
const getExtractors = (): ExtractorType[] => {
  return getAvailableExtractors();
};

/**
 * Cleanup scraper resources
 * Browser close করতে এবং resources free করতে
 */
const cleanup = async (): Promise<void> => {
  logger.info('[scrapeHelper] Cleaning up resources');
  await cleanupScraper();
};

/**
 * Check if URL is scrapeable
 * URL scrape করা যাবে কিনা check করে
 */
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Scrape Helper - Main export
 * সব scraping functions এক জায়গায়
 */
export const scrapeHelper = {
  // Main functions
  scrape,
  scrapeProduct,
  quickScrape,
  scrapeMultiple,

  // Utility functions
  getEngines,
  getExtractors,
  cleanup,
  isValidUrl,
};

// Named exports for convenience
export {
  scrape,
  scrapeProduct,
  quickScrape,
  scrapeMultiple,
  cleanup as cleanupScraper,
};
