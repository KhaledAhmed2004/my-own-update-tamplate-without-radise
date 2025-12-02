/**
 * Extractors Registry
 * সব extractors এক জায়গা থেকে manage করা হয়
 */

import { IExtractor, ExtractorType } from '../scraper.interface';
import { TextExtractor } from './text.extractor';
import { ImageExtractor } from './image.extractor';
import { LinkExtractor } from './link.extractor';
import { PriceExtractor } from './price.extractor';
import { ProductExtractor } from './product.extractor';
import { TableExtractor } from './table.extractor';
import { MetadataExtractor } from './metadata.extractor';

// Extractor registry
export const EXTRACTORS: Record<ExtractorType, IExtractor> = {
  text: TextExtractor,
  images: ImageExtractor,
  links: LinkExtractor,
  tables: TableExtractor,
  prices: PriceExtractor,
  product: ProductExtractor,
  metadata: MetadataExtractor,
  custom: TextExtractor, // Fallback for custom - handled specially
};

/**
 * Get extractor by name
 */
export const getExtractor = (name: ExtractorType): IExtractor => {
  const extractor = EXTRACTORS[name];
  if (!extractor) {
    throw new Error(
      `Unknown extractor: ${name}. Available: ${Object.keys(EXTRACTORS).join(', ')}`
    );
  }
  return extractor;
};

/**
 * Get all available extractor names
 */
export const getAvailableExtractors = (): ExtractorType[] => {
  return Object.keys(EXTRACTORS) as ExtractorType[];
};

/**
 * Run multiple extractors on a document
 * Document এ multiple extractors চালায়
 */
export const runExtractors = async (
  extractorNames: ExtractorType[],
  document: any,
  baseUrl: string,
  selectors?: any
): Promise<Record<string, any>> => {
  const results: Record<string, any> = {};
  const errors: Array<{ extractor: string; message: string }> = [];

  for (const name of extractorNames) {
    const extractor = EXTRACTORS[name];

    if (!extractor) {
      errors.push({
        extractor: name,
        message: `Unknown extractor: ${name}`,
      });
      continue;
    }

    if (!extractor.shouldRun(extractorNames)) {
      continue;
    }

    try {
      results[name] = await extractor.extract(document, baseUrl, selectors);
    } catch (error: any) {
      errors.push({
        extractor: name,
        message: error.message || 'Extraction failed',
      });
    }
  }

  if (errors.length > 0) {
    results._errors = errors;
  }

  return results;
};

// Export individual extractors
export { TextExtractor } from './text.extractor';
export { ImageExtractor } from './image.extractor';
export { LinkExtractor } from './link.extractor';
export { PriceExtractor } from './price.extractor';
export { ProductExtractor } from './product.extractor';
export { TableExtractor } from './table.extractor';
export { MetadataExtractor } from './metadata.extractor';
