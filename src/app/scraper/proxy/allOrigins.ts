/**
 * AllOrigins Proxy Helper
 * CORS bypass করার জন্য AllOrigins proxy use করা হয়
 * Free, no API key needed
 */

import axios from 'axios';
import { logger } from '../../../shared/logger';
import { getRandomUserAgent } from '../antiBot/userAgent';

const ALLORIGINS_URL = 'https://api.allorigins.win/raw';

export interface IProxyResult {
  success: boolean;
  html?: string;
  error?: string;
  method: string;
}

/**
 * Fetch URL through AllOrigins proxy
 * AllOrigins দিয়ে URL fetch করে - CORS bypass হয়
 */
export async function fetchWithAllOrigins(url: string): Promise<IProxyResult> {
  try {
    logger.info(`[Scraper] Trying AllOrigins proxy for: ${url}`);

    const proxyUrl = `${ALLORIGINS_URL}?url=${encodeURIComponent(url)}`;

    const response = await axios.get(proxyUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (response.status === 200 && response.data) {
      const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      // Check if we got actual HTML content
      if (html.length < 100) {
        return {
          success: false,
          error: 'Response too short - likely blocked',
          method: 'allorigins',
        };
      }

      logger.info(`[Scraper] AllOrigins success: ${html.length} bytes`);
      return {
        success: true,
        html,
        method: 'allorigins',
      };
    }

    return {
      success: false,
      error: `Unexpected status: ${response.status}`,
      method: 'allorigins',
    };
  } catch (error: any) {
    logger.warn(`[Scraper] AllOrigins failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'allorigins',
    };
  }
}
