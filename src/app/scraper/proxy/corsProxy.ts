/**
 * CORSProxy.io Helper
 * Alternative CORS bypass proxy
 * Free, no API key needed
 */

import axios from 'axios';
import { logger } from '../../../shared/logger';
import { getRandomUserAgent } from '../antiBot/userAgent';
import { IProxyResult } from './allOrigins';

const CORSPROXY_URL = 'https://corsproxy.io';

/**
 * Fetch URL through CORSProxy.io
 * CORSProxy দিয়ে URL fetch করে - alternative proxy
 */
export async function fetchWithCorsProxy(url: string): Promise<IProxyResult> {
  try {
    logger.info(`[Scraper] Trying CORSProxy for: ${url}`);

    const proxyUrl = `${CORSPROXY_URL}/?${encodeURIComponent(url)}`;

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
          method: 'corsproxy',
        };
      }

      logger.info(`[Scraper] CORSProxy success: ${html.length} bytes`);
      return {
        success: true,
        html,
        method: 'corsproxy',
      };
    }

    return {
      success: false,
      error: `Unexpected status: ${response.status}`,
      method: 'corsproxy',
    };
  } catch (error: any) {
    logger.warn(`[Scraper] CORSProxy failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'corsproxy',
    };
  }
}
