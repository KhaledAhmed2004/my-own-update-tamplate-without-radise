/**
 * Scrape Module Interfaces
 * API module এর জন্য interfaces
 */

import { Model, Types, Document } from 'mongoose';
import {
  IScrapeResult,
  IExtractedProduct,
  IExtractedText,
  IExtractedImage,
  IExtractedLink,
  IExtractedTable,
  IExtractedPrice,
  IExtractedMetadata,
  ScraperEngine,
  ExtractorType,
} from '../../scraper/scraper.interface';

// ==================== MongoDB Document ====================

export interface IScrapeResultDocument extends Document {
  _id: Types.ObjectId;
  url: string;
  status: 'success' | 'partial' | 'failed';
  engine: ScraperEngine;

  data: {
    text?: IExtractedText;
    images?: IExtractedImage[];
    links?: IExtractedLink[];
    tables?: IExtractedTable[];
    prices?: IExtractedPrice[];
    product?: IExtractedProduct;
    metadata?: IExtractedMetadata;
    custom?: Record<string, any>;
  };

  timing: {
    fetchMs: number;
    extractMs: number;
    totalMs: number;
  };

  protection?: {
    captchaDetected?: boolean;
    blocked?: boolean;
    retryCount?: number;
  };

  errors?: Array<{
    phase: 'fetch' | 'parse' | 'extract';
    message: string;
    extractor?: string;
  }>;

  userId?: Types.ObjectId;
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export type ScrapeResultModel = Model<IScrapeResultDocument>;

// ==================== API Request/Response ====================

export interface IScrapeRequest {
  url: string;
  engine?: ScraperEngine;
  extractors?: ExtractorType[];
  selectors?: {
    container?: string;
    title?: string;
    price?: string;
    originalPrice?: string;
    images?: string;
    description?: string;
    rating?: string;
    reviewCount?: string;
    availability?: string;
    features?: string;
    custom?: Record<string, string>;
  };
  browser?: {
    headless?: boolean;
    waitFor?: string | number;
    scrollToBottom?: boolean;
    timeout?: number;
  };
  protection?: {
    rotateUserAgent?: boolean;
    randomDelay?: boolean;
    minDelay?: number;
    maxDelay?: number;
    maxRetries?: number;
  };
  saveToDb?: boolean;
  tags?: string[];
}

export interface IScrapeResponse extends IScrapeResult {
  _id?: string;
  savedToDb?: boolean;
}

export interface IProductScrapeRequest {
  url: string;
  selectors?: {
    title?: string;
    price?: string;
    images?: string;
    description?: string;
    rating?: string;
    reviewCount?: string;
    availability?: string;
    features?: string;
  };
  browser?: {
    waitFor?: string | number;
    scrollToBottom?: boolean;
  };
}

export interface IProductScrapeResponse {
  success: boolean;
  product: IExtractedProduct;
  timing?: {
    totalMs: number;
  };
}

// ==================== Query Types ====================

export interface IScrapeHistoryQuery {
  page?: number;
  limit?: number;
  status?: 'success' | 'partial' | 'failed';
  url?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
