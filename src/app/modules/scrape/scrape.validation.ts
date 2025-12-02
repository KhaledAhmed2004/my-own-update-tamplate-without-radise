/**
 * Scrape Validation Schemas
 * Zod schemas for API request validation
 */

import { z } from 'zod';

// URL validation
const urlSchema = z
  .string({ required_error: 'URL is required' })
  .url('Invalid URL format')
  .refine(url => url.startsWith('http://') || url.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

// Engine validation
const engineSchema = z.enum(['cheerio', 'puppeteer', 'auto']).optional();

// Mode validation - controls speed vs safety trade-off
// quick: 5-8s (medium risk), balanced: 8-12s (low risk), safe: 15-25s (very low risk)
const modeSchema = z.enum(['quick', 'balanced', 'safe']).optional();

// Extractor types validation
const extractorSchema = z
  .array(
    z.enum([
      'text',
      'images',
      'links',
      'tables',
      'prices',
      'product',
      'metadata',
      'custom',
    ])
  )
  .optional();

// Selectors validation
const selectorsSchema = z
  .object({
    container: z.string().max(200).optional(),
    title: z.string().max(200).optional(),
    price: z.string().max(200).optional(),
    originalPrice: z.string().max(200).optional(),
    images: z.string().max(200).optional(),
    description: z.string().max(200).optional(),
    rating: z.string().max(200).optional(),
    reviewCount: z.string().max(200).optional(),
    availability: z.string().max(200).optional(),
    features: z.string().max(200).optional(),
    custom: z.record(z.string().max(200)).optional(),
  })
  .optional();

// Browser options validation
const browserOptionsSchema = z
  .object({
    headless: z.boolean().optional(),
    waitFor: z.union([z.string().max(200), z.number().min(0).max(60000)]).optional(),
    scrollToBottom: z.boolean().optional(),
    timeout: z.number().min(1000).max(120000).optional(),
  })
  .optional();

// Protection options validation
const protectionOptionsSchema = z
  .object({
    rotateUserAgent: z.boolean().optional(),
    randomDelay: z.boolean().optional(),
    minDelay: z.number().min(0).max(10000).optional(),
    maxDelay: z.number().min(0).max(30000).optional(),
    maxRetries: z.number().min(0).max(10).optional(),
  })
  .optional();

// ==================== Main Schemas ====================

/**
 * General scrape request validation
 */
export const createScrapeRequestSchema = z.object({
  body: z.object({
    url: urlSchema,
    engine: engineSchema,
    mode: modeSchema, // 🆕 Optional: 'quick' | 'balanced' | 'safe' (default: balanced)
    extractors: extractorSchema,
    selectors: selectorsSchema,
    browser: browserOptionsSchema,
    protection: protectionOptionsSchema,
    saveToDb: z.boolean().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
  }),
});

/**
 * Product scrape request validation
 */
export const createProductScrapeSchema = z.object({
  body: z.object({
    url: urlSchema,
    mode: modeSchema, // 🆕 Optional: 'quick' | 'balanced' | 'safe' (default: balanced)
    selectors: z
      .object({
        title: z.string().max(200).optional(),
        price: z.string().max(200).optional(),
        images: z.string().max(200).optional(),
        description: z.string().max(200).optional(),
        rating: z.string().max(200).optional(),
        reviewCount: z.string().max(200).optional(),
        availability: z.string().max(200).optional(),
        features: z.string().max(200).optional(),
      })
      .optional(),
    browser: z
      .object({
        waitFor: z.union([z.string().max(200), z.number().min(0).max(60000)]).optional(),
        scrollToBottom: z.boolean().optional(),
      })
      .optional(),
  }),
});

/**
 * Get scrape history query validation
 */
export const getScrapeHistorySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform(Number)
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .optional(),
    status: z.enum(['success', 'partial', 'failed']).optional(),
    url: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Get scrape by ID validation
 */
export const getScrapeByIdSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Scrape ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Scrape ID format'),
  }),
});

/**
 * Delete scrape validation
 */
export const deleteScrapeSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Scrape ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Scrape ID format'),
  }),
});

// Export all validations
export const ScrapeValidation = {
  createScrapeRequestSchema,
  createProductScrapeSchema,
  getScrapeHistorySchema,
  getScrapeByIdSchema,
  deleteScrapeSchema,
};
