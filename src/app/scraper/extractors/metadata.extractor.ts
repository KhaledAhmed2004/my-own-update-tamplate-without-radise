/**
 * Metadata Extractor
 * Page থেকে meta tags এবং SEO data extract করে
 */

import { CheerioAPI } from 'cheerio';
import {
  IExtractor,
  IExtractedMetadata,
  ICustomSelectors,
  ExtractorType,
} from '../scraper.interface';

export const MetadataExtractor: IExtractor<IExtractedMetadata> = {
  name: 'metadata',

  /**
   * Extract metadata from document
   * Document থেকে meta tags বের করে
   */
  async extract(
    $: CheerioAPI,
    _baseUrl: string,
    _selectors?: ICustomSelectors
  ): Promise<IExtractedMetadata> {
    const metadata: IExtractedMetadata = {};

    // Title
    metadata.title =
      $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim();

    // Description
    metadata.description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim();

    // Keywords
    const keywordsStr = $('meta[name="keywords"]').attr('content')?.trim();
    if (keywordsStr) {
      metadata.keywords = keywordsStr
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
    }

    // Open Graph tags
    metadata.ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    metadata.ogDescription = $('meta[property="og:description"]')
      .attr('content')
      ?.trim();
    metadata.ogImage = $('meta[property="og:image"]').attr('content')?.trim();

    // Canonical URL
    metadata.canonical = $('link[rel="canonical"]').attr('href')?.trim();

    return metadata;
  },

  /**
   * Check if this extractor should run
   */
  shouldRun(extractors: ExtractorType[]): boolean {
    return extractors.includes('metadata');
  },
};
