/**
 * Image Extractor
 * Page থেকে image URLs extract করে
 */

import { CheerioAPI } from 'cheerio';
import {
  IExtractor,
  IExtractedImage,
  ICustomSelectors,
  ExtractorType,
} from '../scraper.interface';

export const ImageExtractor: IExtractor<IExtractedImage[]> = {
  name: 'images',

  /**
   * Extract images from document
   * Document থেকে সব images বের করে
   */
  async extract(
    $: CheerioAPI,
    baseUrl: string,
    selectors?: ICustomSelectors
  ): Promise<IExtractedImage[]> {
    const images: IExtractedImage[] = [];
    const seenUrls = new Set<string>();

    // Parse base URL for resolving relative URLs
    let baseUrlObj: URL;
    try {
      baseUrlObj = new URL(baseUrl);
    } catch {
      baseUrlObj = new URL('http://localhost');
    }

    // Selector for images
    const imageSelector = selectors?.images || 'img';

    $(imageSelector).each((_, el) => {
      const $img = $(el);

      // Get image source (check multiple attributes)
      let src =
        $img.attr('src') ||
        $img.attr('data-src') ||
        $img.attr('data-lazy-src') ||
        $img.attr('data-original') ||
        $img.attr('data-srcset')?.split(' ')[0] ||
        '';

      // Skip empty, data URIs, and tracking pixels
      if (
        !src ||
        src.startsWith('data:') ||
        src.includes('1x1') ||
        src.includes('pixel') ||
        src.includes('tracking')
      ) {
        return;
      }

      // Resolve relative URLs
      try {
        if (src.startsWith('//')) {
          src = baseUrlObj.protocol + src;
        } else if (src.startsWith('/')) {
          src = baseUrlObj.origin + src;
        } else if (!src.startsWith('http')) {
          src = new URL(src, baseUrl).href;
        }
      } catch {
        // Invalid URL, skip
        return;
      }

      // Skip duplicates
      if (seenUrls.has(src)) {
        return;
      }
      seenUrls.add(src);

      // Extract image data
      const image: IExtractedImage = {
        src,
        alt: $img.attr('alt')?.trim() || undefined,
      };

      // Get dimensions
      const width = parseInt($img.attr('width') || '0');
      const height = parseInt($img.attr('height') || '0');

      if (width > 0) image.width = width;
      if (height > 0) image.height = height;

      images.push(image);
    });

    // Also check for background images in style attributes
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

      if (match && match[1]) {
        let src = match[1];

        // Skip data URIs
        if (src.startsWith('data:')) return;

        // Resolve relative URLs
        try {
          if (src.startsWith('//')) {
            src = baseUrlObj.protocol + src;
          } else if (src.startsWith('/')) {
            src = baseUrlObj.origin + src;
          } else if (!src.startsWith('http')) {
            src = new URL(src, baseUrl).href;
          }
        } catch {
          return;
        }

        if (!seenUrls.has(src)) {
          seenUrls.add(src);
          images.push({ src });
        }
      }
    });

    // Limit to 100 images
    return images.slice(0, 100);
  },

  /**
   * Check if this extractor should run
   */
  shouldRun(extractors: ExtractorType[]): boolean {
    return extractors.includes('images');
  },
};
