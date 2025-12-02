/**
 * Scraping Engines Registry
 * সব scraping engines এক জায়গা থেকে manage করা হয়
 * Multi-method engine added for fallback support
 */

import { IScraperEngine, IScrapeOptions, ScraperEngine } from '../scraper.interface';
import { CheerioEngine } from './cheerio.engine';
import { PuppeteerEngine } from './puppeteer.engine';
import { MultiMethodEngine } from './multiMethod.engine';

// Engine registry
export const SCRAPER_ENGINES: Record<ScraperEngine, IScraperEngine> = {
  cheerio: CheerioEngine,
  puppeteer: PuppeteerEngine,
  'multi-method': MultiMethodEngine,
  auto: MultiMethodEngine, // Default to multi-method for better success rate
};

/**
 * Get engine by name
 * নাম দিয়ে engine পাওয়া যায়
 */
export const getEngine = (name: ScraperEngine): IScraperEngine => {
  const engine = SCRAPER_ENGINES[name];
  if (!engine) {
    throw new Error(
      `Unknown scraper engine: ${name}. Available: ${Object.keys(SCRAPER_ENGINES).join(', ')}`
    );
  }
  return engine;
};

/**
 * Select best engine based on URL and options
 * URL এবং options দেখে সবচেয়ে ভালো engine select করে
 *
 * Auto-detection logic:
 * 1. If engine explicitly specified, use that
 * 2. JS-heavy sites (AliExpress, etc.) → Puppeteer for JavaScript rendering
 * 3. Default to multi-method for better success rate with fallbacks
 */
export const selectBestEngine = (url: string, options: IScrapeOptions): IScraperEngine => {
  // If engine explicitly specified
  if (options.engine && options.engine !== 'auto') {
    return getEngine(options.engine);
  }

  // Detect JavaScript-heavy sites that need Puppeteer
  const urlLower = url.toLowerCase();
  const jsHeavySites = [
    'aliexpress.com',
    'aliexpress.us',
    'tmall.com',
    'taobao.com',
    'wish.com',
    'shein.com',
    'temu.com',
  ];

  if (jsHeavySites.some(site => urlLower.includes(site))) {
    return PuppeteerEngine;
  }

  // Default to multi-method engine for automatic fallback support
  // This tries: Direct → AllOrigins → CORSProxy
  return MultiMethodEngine;
};

/**
 * Get all available engine names
 */
export const getAvailableEngines = (): ScraperEngine[] => {
  return Object.keys(SCRAPER_ENGINES) as ScraperEngine[];
};

/**
 * Cleanup all engines
 * সব engine cleanup করে (browser close, etc.)
 */
export const cleanupAllEngines = async (): Promise<void> => {
  for (const engine of Object.values(SCRAPER_ENGINES)) {
    await engine.cleanup();
  }
};

// Export individual engines
export { CheerioEngine } from './cheerio.engine';
export { PuppeteerEngine } from './puppeteer.engine';
export { MultiMethodEngine } from './multiMethod.engine';
