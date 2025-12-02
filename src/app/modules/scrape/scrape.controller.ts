/**
 * Scrape Controller
 * HTTP request handlers for scraping operations
 */

import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ScrapeService } from './scrape.service';

/**
 * Execute general scrape
 * POST /api/v1/scrape
 */
const executeScrape = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await ScrapeService.executeScrape(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.status === 'success'
      ? 'Scrape completed successfully'
      : result.status === 'partial'
      ? 'Scrape completed with some errors'
      : 'Scrape failed',
    data: result,
  });
});

/**
 * Scrape product page
 * POST /api/v1/scrape/product
 */
const scrapeProduct = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await ScrapeService.scrapeProduct(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Product scraped successfully',
    data: result,
  });
});

/**
 * Get user's scrape history
 * GET /api/v1/scrape/history
 */
const getScrapeHistory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await ScrapeService.getScrapeHistory(user, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Scrape history retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

/**
 * Get scrape by ID
 * GET /api/v1/scrape/:id
 */
const getScrapeById = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await ScrapeService.getScrapeById(user, req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Scrape result retrieved successfully',
    data: result,
  });
});

/**
 * Delete scrape by ID
 * DELETE /api/v1/scrape/:id
 */
const deleteScrape = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  await ScrapeService.deleteScrape(user, req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Scrape result deleted successfully',
  });
});

/**
 * Get scrape statistics
 * GET /api/v1/scrape/stats
 */
const getScrapeStats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await ScrapeService.getScrapeStats(user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Scrape statistics retrieved successfully',
    data: result,
  });
});

export const ScrapeController = {
  executeScrape,
  scrapeProduct,
  getScrapeHistory,
  getScrapeById,
  deleteScrape,
  getScrapeStats,
};
