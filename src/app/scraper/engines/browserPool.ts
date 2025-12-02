/**
 * Browser Pool Manager
 * Puppeteer browser instance reuse করে performance optimize করে
 * Rate limit protection এর জন্য periodic restart এবং concurrent page limit
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { logger } from '../../../shared/logger';

// Use stealth plugin
puppeteer.use(StealthPlugin());

// Random viewport sizes to look more human-like
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
];

export const getRandomViewport = () => VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];

// Pool configuration
interface IBrowserPoolConfig {
  maxRequestsBeforeRestart: number;
  maxConcurrentPages: number;
  headless: boolean;
}

const DEFAULT_CONFIG: IBrowserPoolConfig = {
  maxRequestsBeforeRestart: 50, // Restart browser after 50 requests (fresh fingerprint)
  maxConcurrentPages: 5,        // Max 5 concurrent pages
  headless: true,
};

/**
 * Browser Pool Manager Class
 * Browser reuse করে performance বাড়ায়, periodic restart করে rate limit এড়ায়
 */
class BrowserPool {
  private browser: Browser | null = null;
  private browserLaunchPromise: Promise<Browser> | null = null;
  private requestCount = 0;
  private activePages = 0;
  private config: IBrowserPoolConfig;
  private isRestarting = false;

  constructor(config: Partial<IBrowserPoolConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get browser stats for monitoring
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      activePages: this.activePages,
      maxRequestsBeforeRestart: this.config.maxRequestsBeforeRestart,
      maxConcurrentPages: this.config.maxConcurrentPages,
      browserConnected: this.browser?.isConnected() || false,
    };
  }

  /**
   * Get or create browser instance
   * Automatic restart after max requests
   */
  async getBrowser(): Promise<Browser> {
    // Check if restart needed (fresh fingerprint for rate limit protection)
    if (this.requestCount >= this.config.maxRequestsBeforeRestart && !this.isRestarting) {
      logger.info(
        `[BrowserPool] Restarting browser after ${this.requestCount} requests (fingerprint refresh)`
      );
      await this.restart();
    }

    // Return existing browser if connected
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // Prevent multiple simultaneous launches
    if (this.browserLaunchPromise) {
      return this.browserLaunchPromise;
    }

    // Launch new browser
    this.browserLaunchPromise = this.launchBrowser();
    this.browser = await this.browserLaunchPromise;
    this.browserLaunchPromise = null;

    return this.browser;
  }

  /**
   * Launch browser with stealth options
   */
  private async launchBrowser(): Promise<Browser> {
    const viewport = getRandomViewport();

    const browser = await puppeteer.launch({
      headless: this.config.headless,
      args: [
        // Core sandbox/security args
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        `--window-size=${viewport.width},${viewport.height}`,
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--lang=en-US,en',
        // Performance optimization args (faster startup)
        '--no-first-run',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
      ],
      defaultViewport: viewport,
      ignoreDefaultArgs: ['--enable-automation'],
    }) as Browser;

    logger.info(
      `[BrowserPool] Browser launched (headless: ${this.config.headless}, viewport: ${viewport.width}x${viewport.height})`
    );

    // Handle browser disconnect
    browser.on('disconnected', () => {
      logger.warn('[BrowserPool] Browser disconnected unexpectedly');
      this.browser = null;
      this.requestCount = 0;
    });

    return browser;
  }

  /**
   * Get a new page from browser pool
   * Respects max concurrent pages limit
   */
  async getPage(): Promise<Page> {
    // Check concurrent page limit
    if (this.activePages >= this.config.maxConcurrentPages) {
      logger.warn(
        `[BrowserPool] Max concurrent pages (${this.config.maxConcurrentPages}) reached, waiting...`
      );
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getPage();
    }

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    this.activePages++;
    this.requestCount++;

    logger.debug(
      `[BrowserPool] Page opened (active: ${this.activePages}, total: ${this.requestCount})`
    );

    return page;
  }

  /**
   * Release a page back to pool (close it)
   */
  async releasePage(page: Page): Promise<void> {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch {
      // Ignore close errors
    }

    this.activePages = Math.max(0, this.activePages - 1);
    logger.debug(`[BrowserPool] Page released (active: ${this.activePages})`);
  }

  /**
   * Force restart browser and get a new page with fresh fingerprint
   * Block detect হলে fresh fingerprint পেতে browser restart করে
   * NOTE: This is for retry scenarios - existing flow unchanged
   *
   * @param delayMs - Optional delay before restart (simulate new user)
   * @returns New page with fresh browser context
   */
  async forceRestartAndGetPage(delayMs?: number): Promise<Page> {
    logger.info('[BrowserPool] Force restart for fresh fingerprint');

    // Close current browser completely
    await this.cleanup();

    // Optional delay to simulate new user arrival (5-15s by default)
    const delay = delayMs ?? 5000 + Math.random() * 10000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Get fresh page from new browser
    return this.getPage();
  }

  /**
   * Restart browser (fresh fingerprint)
   */
  async restart(): Promise<void> {
    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;

    try {
      // Wait for active pages to close (with timeout)
      const maxWait = 10000; // 10 seconds max
      const startWait = Date.now();

      while (this.activePages > 0 && Date.now() - startWait < maxWait) {
        logger.info(`[BrowserPool] Waiting for ${this.activePages} active pages to close...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Force close browser
      if (this.browser) {
        try {
          await this.browser.close();
        } catch {
          // Ignore close errors
        }
        this.browser = null;
      }

      this.requestCount = 0;
      this.activePages = 0;

      logger.info('[BrowserPool] Browser restarted successfully');
    } finally {
      this.isRestarting = false;
    }
  }

  /**
   * Cleanup - close browser completely
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        logger.info('[BrowserPool] Browser pool cleaned up');
      } catch {
        // Ignore close errors
      }
      this.browser = null;
    }

    this.requestCount = 0;
    this.activePages = 0;
  }

  /**
   * Check if browser is healthy
   */
  isHealthy(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IBrowserPoolConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info(`[BrowserPool] Config updated: ${JSON.stringify(this.config)}`);
  }
}

// Singleton instance
export const browserPool = new BrowserPool();

// Export class for custom instances
export { BrowserPool, IBrowserPoolConfig };
