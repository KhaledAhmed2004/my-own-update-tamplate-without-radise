/**
 * Web Scraper Interfaces
 * ওয়েব স্ক্র্যাপিং সিস্টেমের সকল TypeScript interfaces
 */

import { Types } from 'mongoose';

// ==================== Engine Types ====================

export type ScraperEngine = 'cheerio' | 'puppeteer' | 'auto' | 'multi-method';

// ==================== Scrape Mode Types ====================

/**
 * Scrape mode controls the speed vs safety trade-off
 * - quick: Fastest (5-8s), medium bot detection risk
 * - balanced: Recommended (8-12s), low risk
 * - safe: Slowest (15-25s), very low risk
 */
export type ScrapeMode = 'quick' | 'balanced' | 'safe';

// ==================== Extractor Types ====================

export type ExtractorType =
  | 'text'
  | 'images'
  | 'links'
  | 'tables'
  | 'prices'
  | 'product'
  | 'metadata'
  | 'custom';

// ==================== Scrape Options ====================

export interface IScrapeOptions {
  url: string;
  engine?: ScraperEngine; // Default: 'auto'
  mode?: ScrapeMode; // Default: 'balanced' - controls speed vs safety trade-off
  extractors?: ExtractorType[]; // Default: ['text', 'images', 'links']
  selectors?: ICustomSelectors;

  // Browser options (Puppeteer only)
  browser?: IBrowserOptions;

  // Anti-bot protection options
  protection?: IProtectionOptions;

  // Storage options
  saveToDb?: boolean; // Default: true
  userId?: string | Types.ObjectId;
}

export interface ICustomSelectors {
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
}

export interface IBrowserOptions {
  headless?: boolean; // Default: true
  waitFor?: string | number; // CSS selector or milliseconds
  scrollToBottom?: boolean; // For lazy-loaded content
  timeout?: number; // Default: 30000ms
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'; // Default: 'networkidle2'
  viewport?: {
    width: number;
    height: number;
  };
}

export interface IProtectionOptions {
  rotateUserAgent?: boolean; // Default: true
  randomDelay?: boolean; // Default: true
  minDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 3000ms
  maxRetries?: number; // Default: 3
  retryDelay?: number; // Default: 2000ms
}

// ==================== Extracted Data Types ====================

export interface IExtractedText {
  title?: string;
  description?: string;
  bodyText?: string;
  headings?: Array<{ level: number; text: string }>;
}

export interface IExtractedImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface IExtractedLink {
  href: string;
  text?: string;
  rel?: string;
  isExternal: boolean;
}

export interface IExtractedTable {
  headers: string[];
  rows: string[][];
}

export interface IExtractedPrice {
  value: number;
  currency?: string;
  original?: string; // Original text before parsing
  selector?: string;
  confidence?: number; // 0-100 confidence score
}

export interface IExtractedMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
}

// ==================== Product Data (Amazon-like) ====================

export interface IExtractedProduct {
  title?: string;
  price?: {
    current: number;
    original?: number;
    currency: string;
    discount?: string;
    confidence?: number; // 0-100 confidence score
  };
  images?: string[];
  description?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  condition?: string; // eBay: New, Refurbished, Used, etc.
  seller?: string; // eBay/AliExpress: Seller name
  shipping?: string; // AliExpress: Shipping info
  features?: string[];
  brand?: string;
  category?: string;
  sku?: string;
  url?: string;
  confidence?: number; // Overall extraction confidence
  isBlocked?: boolean; // Was the page blocked/CAPTCHA?
  methodUsed?: string; // Which scraping method succeeded
}

// ==================== Scrape Result ====================

export interface IScrapeResult {
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
    mode?: ScrapeMode; // Which mode was used for this scrape
  };
  protection?: {
    captchaDetected?: boolean;
    blocked?: boolean;
    retryCount?: number;
    methodUsed?: string; // Which method succeeded (direct, allorigins, corsproxy)
    methodsTried?: string[]; // All methods attempted
  };
  errors?: Array<{
    phase: 'fetch' | 'parse' | 'extract';
    message: string;
    extractor?: string;
  }>;
}

// ==================== Engine Interface ====================

export interface IScraperEngine {
  name: ScraperEngine;

  /**
   * Initialize the engine (e.g., launch browser)
   */
  initialize(options: IScrapeOptions): Promise<void>;

  /**
   * Fetch HTML content from URL
   */
  fetch(url: string, options: IScrapeOptions): Promise<string>;

  /**
   * Parse HTML and return a queryable document
   */
  getDocument(html: string): any;

  /**
   * Cleanup resources (e.g., close browser)
   */
  cleanup(): Promise<void>;

  /**
   * Check if this engine can handle the given URL/options
   */
  canHandle(url: string, options: IScrapeOptions): boolean;
}

// ==================== Extractor Interface ====================

export interface IExtractor<T = any> {
  name: ExtractorType;

  /**
   * Extract data from the document
   */
  extract(
    document: any, // Cheerio instance
    baseUrl: string,
    selectors?: ICustomSelectors
  ): Promise<T>;

  /**
   * Check if this extractor should run based on options
   */
  shouldRun(extractors: ExtractorType[]): boolean;
}

// ==================== Pipeline Context ====================

export interface IPipelineContext {
  url: string;
  options: IScrapeOptions;
  html?: string;
  document?: any; // Cheerio instance
  result: Partial<IScrapeResult>;
  errors: IScrapeResult['errors'];
  startTime: number;
}

// ==================== MongoDB Document Types ====================

export interface IScrapeResultDocument {
  _id: Types.ObjectId;
  url: string;
  status: 'success' | 'partial' | 'failed';
  engine: ScraperEngine;
  data: IScrapeResult['data'];
  timing: IScrapeResult['timing'];
  protection?: IScrapeResult['protection'];
  errors?: IScrapeResult['errors'];
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Helper Response Types ====================

export interface IScrapeHelperResponse extends IScrapeResult {
  _id?: string;
  savedToDb?: boolean;
}
