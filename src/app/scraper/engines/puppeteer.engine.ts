/**
 * Puppeteer Scraping Engine with Stealth Mode & Browser Pool
 * JavaScript-rendered pages scrape করার জন্য - Amazon, e-commerce sites
 * Bot detection bypass করতে puppeteer-extra-plugin-stealth use করা হয়েছে
 *
 * Browser Pool Benefits:
 * - Browser reuse করে performance বাড়ায় (~50% faster subsequent requests)
 * - Periodic restart করে rate limit এড়ায় (every 50 requests)
 * - Max concurrent pages limit করে memory stable রাখে
 */

import { Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { IScraperEngine, IScrapeOptions } from '../scraper.interface';
import { getRandomUserAgent } from '../antiBot/userAgent';
import { randomDelay, sleep } from '../antiBot/delay';
import { injectFingerprintSpoofing } from '../antiBot/fingerprint';
import { getStrategyForUrl } from '../antiBot/siteStrategies';
import { getModeConfig, IModeConfig } from '../pipeline';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../shared/logger';
import { browserPool, getRandomViewport } from './browserPool';

export const PuppeteerEngine: IScraperEngine = {
  name: 'puppeteer',

  /**
   * Initialize browser pool
   * Browser pool ready থাকলে subsequent requests faster হবে
   */
  async initialize(options: IScrapeOptions): Promise<void> {
    const headless = options.browser?.headless !== false;
    browserPool.updateConfig({ headless });
    // Pre-warm browser pool
    await browserPool.getBrowser();
  },

  /**
   * Fetch page using Puppeteer with Stealth Mode & Browser Pool
   * Browser pool থেকে page নিয়ে কাজ করে - ~50% faster subsequent requests
   * Human-like behavior simulate করে bot detection এড়ানো হয়
   */
  async fetch(url: string, options: IScrapeOptions): Promise<string> {
    const protection = options.protection || {};
    const browserOptions = options.browser || {};

    // 🆕 Get mode configuration for speed vs safety trade-off
    const modeConfig = getModeConfig(options);

    // Apply pre-request delay based on mode
    // quick: 0.3-0.8s, balanced: 0.8-1.5s, safe: 2-5s
    if (protection.randomDelay !== false) {
      const minDelay = protection.minDelay ?? modeConfig.preDelay.min;
      const maxDelay = protection.maxDelay ?? modeConfig.preDelay.max;
      await randomDelay(minDelay, maxDelay);
    }

    // Get page from browser pool (reuses browser, respects limits)
    let page: Page | null = null;

    try {
      page = await browserPool.getPage();

      // Log pool stats
      const stats = browserPool.getStats();
      logger.debug(
        `[Scraper] Using browser pool (requests: ${stats.requestCount}/${stats.maxRequestsBeforeRestart}, active: ${stats.activePages})`
      );

      // Set random viewport for each page
      const viewport = browserOptions.viewport || getRandomViewport();
      await page.setViewport(viewport);

      // NEW: Inject fingerprint spoofing (SAFE - fails silently, existing code continues)
      try {
        await injectFingerprintSpoofing(page);
      } catch {
        // Fingerprint spoofing failed - continue with existing flow
        logger.debug('[Scraper] Fingerprint spoofing skipped');
      }

      // NEW: Get site-specific strategy (SAFE - optional enhancement)
      const siteStrategy = getStrategyForUrl(url);
      if (siteStrategy) {
        try {
          await siteStrategy.preNavigationSetup(page);
          logger.debug(`[Scraper] Applied ${siteStrategy.name} pre-navigation setup`);
        } catch {
          // Strategy failed - continue with existing flow
          logger.debug(`[Scraper] Site strategy pre-navigation skipped for ${siteStrategy.domain}`);
        }
      }

      // Set user agent
      const userAgent =
        protection.rotateUserAgent !== false
          ? getRandomUserAgent()
          : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      await page.setUserAgent(userAgent);

      // Set extra headers to look more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
      });

      // Enable JavaScript
      await page.setJavaScriptEnabled(true);

      // Don't block resources for Amazon - they detect this
      // Only block fonts to save bandwidth
      await page.setRequestInterception(true);
      page.on('request', request => {
        const resourceType = request.resourceType();
        if (resourceType === 'font') {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Navigate to URL (20s default - enough for most pages, faster fail for broken pages)
      const timeout = browserOptions.timeout || 20000;
      // Use configurable waitUntil - 'domcontentloaded' for JS-heavy sites that never stop network activity
      const waitUntil = browserOptions.waitUntil || 'networkidle2';
      const response = await page.goto(url, {
        waitUntil,
        timeout,
      });

      // NEW: Apply site-specific post-navigation actions (SAFE - fails silently)
      if (siteStrategy) {
        try {
          await siteStrategy.postNavigationActions(page);
          logger.debug(`[Scraper] Applied ${siteStrategy.name} post-navigation actions`);
        } catch {
          // Post-navigation failed - continue with existing flow
          logger.debug(`[Scraper] Site strategy post-navigation skipped for ${siteStrategy.domain}`);
        }
      }

      // Add human-like behavior after page load (conditional based on mode)
      // quick: skip, balanced: minimal, safe: full
      if (modeConfig.humanBehavior) {
        await simulateHumanBehavior(page);
      }

      // Check response status
      const status = response?.status() || 0;

      if (status === 403) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied - website blocked the request');
      }

      if (status === 404) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Page not found');
      }

      if (status === 429) {
        throw new ApiError(
          StatusCodes.TOO_MANY_REQUESTS,
          'Rate limited - too many requests'
        );
      }

      // Wait for specific selector if provided
      // Apply mode's waitForMultiplier to reduce wait time in faster modes
      if (browserOptions.waitFor) {
        if (typeof browserOptions.waitFor === 'string') {
          try {
            // Selector timeout also scaled by mode (quick: 4s, balanced: 6s, safe: 10s)
            const selectorTimeout = Math.round(10000 * modeConfig.waitForMultiplier);
            await page.waitForSelector(browserOptions.waitFor, {
              timeout: selectorTimeout,
            });
          } catch {
            // Selector not found, continue anyway
            logger.warn(`[Scraper] Selector "${browserOptions.waitFor}" not found, continuing...`);
          }
        } else if (typeof browserOptions.waitFor === 'number') {
          // Apply mode multiplier to waitFor delay (e.g., 5000ms * 0.6 = 3000ms for balanced)
          const adjustedWait = Math.round(browserOptions.waitFor * modeConfig.waitForMultiplier);
          await sleep(adjustedWait);
        }
      }

      // Scroll to bottom for lazy-loaded content (conditional based on mode)
      // quick: skip, balanced/safe: scroll with mode-specific timeout
      if (browserOptions.scrollToBottom && modeConfig.scrollEnabled) {
        await autoScroll(page, modeConfig.scrollTimeout);
      }

      // Get rendered HTML
      const html = await page.content();

      return html;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error.message?.includes('timeout')) {
        throw new ApiError(StatusCodes.GATEWAY_TIMEOUT, 'Page load timed out');
      }

      throw new ApiError(
        StatusCodes.BAD_GATEWAY,
        `Puppeteer fetch failed: ${error.message}`
      );
    } finally {
      // Release page back to pool
      if (page) {
        await browserPool.releasePage(page);
      }
    }
  },

  /**
   * Parse HTML with Cheerio (for consistent extraction interface)
   */
  getDocument(html: string) {
    return cheerio.load(html, {
      xmlMode: false,
      decodeEntities: true,
    });
  },

  /**
   * Cleanup - close browser pool
   */
  async cleanup(): Promise<void> {
    await browserPool.cleanup();
  },

  /**
   * Check if Puppeteer should handle this request
   * JS-heavy sites এর জন্য Puppeteer use করা হয়
   */
  canHandle(url: string, options: IScrapeOptions): boolean {
    // If explicitly set to puppeteer, use it
    if (options.engine === 'puppeteer') {
      return true;
    }

    // Use Puppeteer for known JS-heavy domains
    const jsHeavyDomains = [
      'amazon.',
      'ebay.',
      'walmart.',
      'target.',
      'aliexpress.',
      'alibaba.com',
      'instagram.',
      'twitter.',
      'x.com',
      'facebook.',
      'linkedin.',
      'pinterest.',
      'airbnb.',
      'booking.com',
      'expedia.',
      'tripadvisor.',
      'yelp.',
    ];

    const urlLower = url.toLowerCase();
    for (const domain of jsHeavyDomains) {
      if (urlLower.includes(domain)) {
        return true;
      }
    }

    return false;
  },
};

/**
 * Simulate human-like behavior to avoid bot detection
 * মানুষের মতো behavior simulate করে bot detection এড়ানো হয়
 */
async function simulateHumanBehavior(page: Page): Promise<void> {
  try {
    // Random small delay
    await sleep(500 + Math.random() * 1000);

    // Move mouse randomly
    const viewport = page.viewport();
    if (viewport) {
      const x = Math.floor(Math.random() * viewport.width * 0.8) + 50;
      const y = Math.floor(Math.random() * viewport.height * 0.8) + 50;
      await page.mouse.move(x, y, { steps: 10 });
    }

    // Small scroll
    await page.evaluate(() => {
      window.scrollBy(0, Math.floor(Math.random() * 300) + 100);
    });

    // Wait a bit
    await sleep(300 + Math.random() * 500);

    // Scroll back up a little
    await page.evaluate(() => {
      window.scrollBy(0, -(Math.floor(Math.random() * 100) + 50));
    });

    await sleep(200 + Math.random() * 300);
  } catch {
    // Ignore errors in human simulation
  }
}

/**
 * Auto-scroll page to load lazy content
 * Lazy-loaded content load করতে scroll করে
 *
 * NOTE: Don't use async/await inside page.evaluate() - it runs in browser context
 * and TypeScript's __awaiter helper isn't available there.
 *
 * @param page - Puppeteer page instance
 * @param maxScrollTime - Max scroll time in ms (quick: 3s, balanced: 5s, safe: 10s)
 */
async function autoScroll(page: Page, maxScrollTime: number = 10000): Promise<void> {
  await page.evaluate((timeout: number) => {
    return new Promise<void>(resolve => {
      let totalHeight = 0;
      const distance = 300 + Math.floor(Math.random() * 200); // Random scroll distance
      const scrollDelay = 150 + Math.floor(Math.random() * 100); // Random delay

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo(0, 0);
          resolve();
        }
      }, scrollDelay);

      // Max scroll time based on mode (passed from Node.js)
      setTimeout(() => {
        clearInterval(timer);
        window.scrollTo(0, 0);
        resolve();
      }, timeout);
    });
  }, maxScrollTime);

  // Wait for any lazy-loaded content (reduced for faster modes)
  const waitTime = maxScrollTime < 5000 ? 500 : 1000;
  await sleep(waitTime + Math.random() * 300);
}
