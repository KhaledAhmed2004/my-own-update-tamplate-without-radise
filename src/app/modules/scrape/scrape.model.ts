/**
 * Scrape Result Model
 * MongoDB schema for storing scrape results
 */

import mongoose, { Schema } from 'mongoose';
import { IScrapeResultDocument, ScrapeResultModel } from './scrape.interface';

const ScrapeResultSchema = new Schema<IScrapeResultDocument>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      required: true,
      index: true,
    },

    engine: {
      type: String,
      enum: ['cheerio', 'puppeteer', 'auto'],
      default: 'auto',
    },

    // Extracted data
    data: {
      text: {
        title: String,
        description: String,
        bodyText: String,
        headings: [
          {
            level: Number,
            text: String,
          },
        ],
      },

      images: [
        {
          src: String,
          alt: String,
          width: Number,
          height: Number,
        },
      ],

      links: [
        {
          href: String,
          text: String,
          rel: String,
          isExternal: Boolean,
        },
      ],

      tables: [
        {
          headers: [String],
          rows: [[String]],
        },
      ],

      prices: [
        {
          value: Number,
          currency: String,
          original: String,
          selector: String,
        },
      ],

      product: {
        title: String,
        price: {
          current: Number,
          original: Number,
          currency: String,
          discount: String,
        },
        images: [String],
        description: String,
        rating: Number,
        reviewCount: Number,
        availability: String,
        features: [String],
        brand: String,
        category: String,
        sku: String,
        url: String,
      },

      metadata: {
        title: String,
        description: String,
        keywords: [String],
        ogTitle: String,
        ogDescription: String,
        ogImage: String,
        canonical: String,
      },

      custom: Schema.Types.Mixed,
    },

    // Timing information
    timing: {
      fetchMs: Number,
      extractMs: Number,
      totalMs: Number,
    },

    // Protection/bot detection info
    protection: {
      captchaDetected: Boolean,
      blocked: Boolean,
      retryCount: Number,
    },

    // Errors during scraping
    errors: [
      {
        phase: {
          type: String,
          enum: ['fetch', 'parse', 'extract'],
        },
        message: String,
        extractor: String,
      },
    ],

    // User who performed the scrape
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Tags for organization
    tags: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'scrape_results',
  }
);

// Compound indexes for common queries
ScrapeResultSchema.index({ userId: 1, createdAt: -1 });
ScrapeResultSchema.index({ userId: 1, status: 1, createdAt: -1 });
ScrapeResultSchema.index({ url: 1, createdAt: -1 });
ScrapeResultSchema.index({ tags: 1, createdAt: -1 });

// TTL index - auto-delete after 30 days
ScrapeResultSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

// Text index for search
ScrapeResultSchema.index({
  url: 'text',
  'data.text.title': 'text',
  'data.product.title': 'text',
  tags: 'text',
});

export const ScrapeResult = mongoose.model<
  IScrapeResultDocument,
  ScrapeResultModel
>('ScrapeResult', ScrapeResultSchema);
