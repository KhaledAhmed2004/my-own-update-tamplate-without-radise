/**
 * Text Extractor
 * Page থেকে text content extract করে (title, description, body text)
 */

import { CheerioAPI } from 'cheerio';
import {
  IExtractor,
  IExtractedText,
  ICustomSelectors,
  ExtractorType,
} from '../scraper.interface';

export const TextExtractor: IExtractor<IExtractedText> = {
  name: 'text',

  /**
   * Extract text content from document
   * Document থেকে text content বের করে
   */
  async extract(
    $: CheerioAPI,
    _baseUrl: string,
    selectors?: ICustomSelectors
  ): Promise<IExtractedText> {
    const result: IExtractedText = {};

    // Extract title
    if (selectors?.title) {
      result.title = $(selectors.title).first().text().trim();
    } else {
      // Try common title selectors
      result.title =
        $('h1').first().text().trim() ||
        $('title').text().trim() ||
        $('[class*="title"]').first().text().trim() ||
        $('[class*="heading"]').first().text().trim();
    }

    // Extract description
    result.description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      $('[class*="description"]').first().text().trim().substring(0, 500);

    // Extract body text
    const contentSelector =
      selectors?.container ||
      selectors?.custom?.content ||
      'article, main, .content, .main-content, #content, #main, body';

    const $content = $(contentSelector).first().clone();

    // Remove unwanted elements
    $content
      .find(
        'script, style, noscript, iframe, nav, footer, header, aside, .sidebar, .navigation, .menu, .ad, .advertisement, .social-share'
      )
      .remove();

    // Get clean text
    let bodyText = $content.text();

    // Clean up whitespace
    bodyText = bodyText
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\n+/g, '\n') // Multiple newlines to single
      .trim();

    // Limit length
    if (bodyText.length > 10000) {
      bodyText = bodyText.substring(0, 10000) + '...';
    }

    result.bodyText = bodyText;

    // Extract headings
    result.headings = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const $heading = $(el);
      const level = parseInt(el.tagName?.charAt(1) || '0');
      const text = $heading.text().trim();

      if (text && text.length > 0 && text.length < 500) {
        result.headings!.push({ level, text });
      }
    });

    // Limit headings
    if (result.headings.length > 50) {
      result.headings = result.headings.slice(0, 50);
    }

    return result;
  },

  /**
   * Check if this extractor should run
   */
  shouldRun(extractors: ExtractorType[]): boolean {
    return extractors.includes('text');
  },
};
