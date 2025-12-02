/**
 * Link Extractor
 * Page থেকে links extract করে
 */

import { CheerioAPI } from 'cheerio';
import {
  IExtractor,
  IExtractedLink,
  ICustomSelectors,
  ExtractorType,
} from '../scraper.interface';

export const LinkExtractor: IExtractor<IExtractedLink[]> = {
  name: 'links',

  /**
   * Extract links from document
   * Document থেকে সব links বের করে
   */
  async extract(
    $: CheerioAPI,
    baseUrl: string,
    selectors?: ICustomSelectors
  ): Promise<IExtractedLink[]> {
    const links: IExtractedLink[] = [];
    const seenUrls = new Set<string>();

    // Parse base URL
    let baseUrlObj: URL;
    try {
      baseUrlObj = new URL(baseUrl);
    } catch {
      baseUrlObj = new URL('http://localhost');
    }

    // Selector for links
    const linkSelector = selectors?.custom?.links || 'a[href]';

    $(linkSelector).each((_, el) => {
      const $link = $(el);
      let href = $link.attr('href') || '';

      // Skip empty, javascript, and anchor links
      if (
        !href ||
        href === '#' ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      // Resolve relative URLs
      try {
        if (href.startsWith('//')) {
          href = baseUrlObj.protocol + href;
        } else if (href.startsWith('/')) {
          href = baseUrlObj.origin + href;
        } else if (!href.startsWith('http')) {
          href = new URL(href, baseUrl).href;
        }
      } catch {
        // Invalid URL, skip
        return;
      }

      // Skip duplicates
      if (seenUrls.has(href)) {
        return;
      }
      seenUrls.add(href);

      // Get link text
      let text = $link.text().trim();
      if (text.length > 200) {
        text = text.substring(0, 200) + '...';
      }

      // Determine if external
      let isExternal = false;
      try {
        const linkUrl = new URL(href);
        isExternal = linkUrl.hostname !== baseUrlObj.hostname;
      } catch {
        // Invalid URL, assume internal
      }

      const link: IExtractedLink = {
        href,
        text: text || undefined,
        isExternal,
      };

      // Get rel attribute
      const rel = $link.attr('rel');
      if (rel) {
        link.rel = rel;
      }

      links.push(link);
    });

    // Limit to 500 links
    return links.slice(0, 500);
  },

  /**
   * Check if this extractor should run
   */
  shouldRun(extractors: ExtractorType[]): boolean {
    return extractors.includes('links');
  },
};
