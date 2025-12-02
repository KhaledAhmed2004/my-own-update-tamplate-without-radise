/**
 * Cheerio Scraping Engine
 * Static HTML pages scrape করার জন্য - দ্রুত ও lightweight
 */

import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { IScraperEngine, IScrapeOptions } from '../scraper.interface';
import { getRandomUserAgent } from '../antiBot/userAgent';
import { randomDelay } from '../antiBot/delay';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

export const CheerioEngine: IScraperEngine = {
  name: 'cheerio',

  /**
   * Initialize - Cheerio doesn't need initialization
   */
  async initialize(_options: IScrapeOptions): Promise<void> {
    // No initialization needed for Cheerio
  },

  /**
   * Fetch HTML using axios
   * axios দিয়ে HTTP request করে HTML নিয়ে আসে
   */
  async fetch(url: string, options: IScrapeOptions): Promise<string> {
    const protection = options.protection || {};

    // Apply random delay if enabled
    if (protection.randomDelay !== false) {
      await randomDelay(protection.minDelay || 1000, protection.maxDelay || 3000);
    }

    // Build request config
    const config: AxiosRequestConfig = {
      timeout: options.browser?.timeout || 30000,
      maxRedirects: 5,
      validateStatus: status => status < 500, // Accept 4xx for error handling
      headers: {
        'User-Agent':
          protection.rotateUserAgent !== false
            ? getRandomUserAgent()
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    };

    try {
      const response = await axios.get(url, config);

      // Check for error status codes
      if (response.status === 403) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied - website blocked the request');
      }

      if (response.status === 404) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Page not found');
      }

      if (response.status === 429) {
        throw new ApiError(
          StatusCodes.TOO_MANY_REQUESTS,
          'Rate limited - too many requests'
        );
      }

      return response.data;
    } catch (error: any) {
      // Handle axios errors
      if (error.response) {
        throw new ApiError(
          error.response.status || StatusCodes.BAD_GATEWAY,
          `Failed to fetch URL: ${error.response.status} ${error.response.statusText}`
        );
      }

      if (error.code === 'ECONNREFUSED') {
        throw new ApiError(StatusCodes.BAD_GATEWAY, 'Connection refused');
      }

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        throw new ApiError(StatusCodes.GATEWAY_TIMEOUT, 'Request timed out');
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(StatusCodes.BAD_GATEWAY, `Network error: ${error.message}`);
    }
  },

  /**
   * Parse HTML with Cheerio
   * HTML parse করে cheerio instance return করে
   */
  getDocument(html: string) {
    return cheerio.load(html, {
      xmlMode: false,
      decodeEntities: true,
    });
  },

  /**
   * Cleanup - nothing to cleanup for Cheerio
   */
  async cleanup(): Promise<void> {
    // No cleanup needed
  },

  /**
   * Check if Cheerio can handle this request
   * Cheerio static HTML এর জন্য, JS-heavy sites এর জন্য না
   */
  canHandle(url: string, options: IScrapeOptions): boolean {
    // If explicitly set to cheerio, use it
    if (options.engine === 'cheerio') {
      return true;
    }

    // Don't use for JS-heavy sites
    const jsHeavyDomains = [
      'amazon.',
      'ebay.',
      'walmart.',
      'target.',
      'instagram.',
      'twitter.',
      'x.com',
      'facebook.',
      'linkedin.',
      'pinterest.',
      'airbnb.',
      'booking.com',
    ];

    const urlLower = url.toLowerCase();
    for (const domain of jsHeavyDomains) {
      if (urlLower.includes(domain)) {
        return false; // Puppeteer should handle these
      }
    }

    // Default to Cheerio for simple sites
    return true;
  },
};
