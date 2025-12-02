/**
 * Scrape Service
 * Business logic for scraping operations
 */

import { Types } from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';
import { scrapeHelper } from '../../../helpers/scrapeHelper';
import { ScrapeResult } from './scrape.model';
import {
  IScrapeRequest,
  IScrapeResponse,
  IProductScrapeRequest,
  IProductScrapeResponse,
  IScrapeResultDocument,
} from './scrape.interface';
import { IScrapeOptions } from '../../scraper/scraper.interface';
import QueryBuilder from '../../builder/QueryBuilder';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../../shared/logger';

/**
 * Execute scrape request
 * URL scrape করে result return করে
 */
const executeScrape = async (
  user: JwtPayload,
  payload: IScrapeRequest
): Promise<IScrapeResponse> => {
  logger.info(`[ScrapeService] User ${user.id} scraping: ${payload.url}`);

  // Build scrape options
  const options: IScrapeOptions = {
    url: payload.url,
    engine: payload.engine,
    extractors: payload.extractors,
    selectors: payload.selectors,
    browser: payload.browser,
    protection: payload.protection,
    userId: user.id,
    saveToDb: payload.saveToDb ?? true,
  };

  // Execute scrape
  const result = await scrapeHelper.scrape(options);

  // Save to database if requested
  if (options.saveToDb !== false) {
    const savedResult = await ScrapeResult.create({
      url: result.url,
      status: result.status,
      engine: result.engine,
      data: result.data,
      timing: result.timing,
      protection: result.protection,
      errors: result.errors,
      userId: new Types.ObjectId(user.id),
      tags: payload.tags,
    });

    logger.info(`[ScrapeService] Result saved: ${savedResult._id}`);

    return {
      ...result,
      _id: savedResult._id.toString(),
      savedToDb: true,
    };
  }

  return {
    ...result,
    savedToDb: false,
  };
};

/**
 * Scrape product page
 * Product page থেকে product data extract করে
 */
const scrapeProduct = async (
  user: JwtPayload,
  payload: IProductScrapeRequest
): Promise<IProductScrapeResponse> => {
  logger.info(`[ScrapeService] User ${user.id} scraping product: ${payload.url}`);

  const startTime = Date.now();

  // Build options for product scraping
  // Don't set default waitFor here - let pipeline's site-specific options handle it
  // (e.g., AliExpress gets 5000ms, Amazon gets different timing, etc.)
  const options: IScrapeOptions = {
    url: payload.url,
    extractors: ['product'],
    selectors: payload.selectors,
    browser: payload.browser, // Pass through user's options, pipeline will add defaults
    userId: user.id,
  };

  // Execute scrape
  const result = await scrapeHelper.scrape(options);

  if (result.status === 'failed') {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      result.errors?.[0]?.message || 'Product scrape failed'
    );
  }

  if (!result.data.product) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Could not extract product data from this page'
    );
  }

  // Save to database
  await ScrapeResult.create({
    url: result.url,
    status: result.status,
    engine: result.engine,
    data: result.data,
    timing: result.timing,
    protection: result.protection,
    errors: result.errors,
    userId: new Types.ObjectId(user.id),
  });

  return {
    success: true,
    product: result.data.product,
    timing: {
      totalMs: Date.now() - startTime,
    },
  };
};

/**
 * Get user's scrape history
 * User এর scrape history pagination সহ
 */
const getScrapeHistory = async (
  user: JwtPayload,
  query: Record<string, unknown>
) => {
  const scrapeQuery = new QueryBuilder<IScrapeResultDocument>(
    ScrapeResult.find({ userId: new Types.ObjectId(user.id) }),
    query
  )
    .search(['url', 'data.text.title', 'data.product.title'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const results = await scrapeQuery.modelQuery;
  const paginationInfo = await scrapeQuery.getPaginationInfo();

  return {
    data: results,
    pagination: paginationInfo,
  };
};

/**
 * Get single scrape result by ID
 */
const getScrapeById = async (
  user: JwtPayload,
  scrapeId: string
): Promise<IScrapeResultDocument> => {
  const result = await ScrapeResult.findOne({
    _id: new Types.ObjectId(scrapeId),
    userId: new Types.ObjectId(user.id),
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scrape result not found');
  }

  return result;
};

/**
 * Delete scrape result
 */
const deleteScrape = async (
  user: JwtPayload,
  scrapeId: string
): Promise<void> => {
  const result = await ScrapeResult.findOneAndDelete({
    _id: new Types.ObjectId(scrapeId),
    userId: new Types.ObjectId(user.id),
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Scrape result not found');
  }

  logger.info(`[ScrapeService] Deleted scrape: ${scrapeId}`);
};

/**
 * Delete scrapes by tag
 */
const deleteScrapesByTag = async (
  user: JwtPayload,
  tag: string
): Promise<number> => {
  const result = await ScrapeResult.deleteMany({
    userId: new Types.ObjectId(user.id),
    tags: tag,
  });

  logger.info(`[ScrapeService] Deleted ${result.deletedCount} scrapes with tag: ${tag}`);

  return result.deletedCount;
};

/**
 * Get scrape statistics for user
 */
const getScrapeStats = async (user: JwtPayload) => {
  const stats = await ScrapeResult.aggregate([
    {
      $match: { userId: new Types.ObjectId(user.id) },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const totalScrapes = await ScrapeResult.countDocuments({
    userId: new Types.ObjectId(user.id),
  });

  const statusCounts: Record<string, number> = {
    success: 0,
    partial: 0,
    failed: 0,
  };

  for (const stat of stats) {
    statusCounts[stat._id] = stat.count;
  }

  return {
    total: totalScrapes,
    ...statusCounts,
  };
};

export const ScrapeService = {
  executeScrape,
  scrapeProduct,
  getScrapeHistory,
  getScrapeById,
  deleteScrape,
  deleteScrapesByTag,
  getScrapeStats,
};
