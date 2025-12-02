/**
 * Scrape Routes
 * API routes for scraping operations
 */

import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ScrapeController } from './scrape.controller';
import { ScrapeValidation } from './scrape.validation';

const router = express.Router();

/**
 * POST /api/v1/scrape
 * Execute general scrape
 */
router.post(
  '/',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.createScrapeRequestSchema),
  ScrapeController.executeScrape
);

/**
 * POST /api/v1/scrape/product
 * Scrape product page (Amazon-optimized)
 */
router.post(
  '/product',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.createProductScrapeSchema),
  ScrapeController.scrapeProduct
);

/**
 * GET /api/v1/scrape/history
 * Get user's scrape history
 */
router.get(
  '/history',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.getScrapeHistorySchema),
  ScrapeController.getScrapeHistory
);

/**
 * GET /api/v1/scrape/stats
 * Get scrape statistics
 */
router.get(
  '/stats',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  ScrapeController.getScrapeStats
);

/**
 * GET /api/v1/scrape/:id
 * Get specific scrape result
 */
router.get(
  '/:id',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.getScrapeByIdSchema),
  ScrapeController.getScrapeById
);

/**
 * DELETE /api/v1/scrape/:id
 * Delete scrape result
 */
router.delete(
  '/:id',
  auth(USER_ROLES.POSTER, USER_ROLES.TASKER, USER_ROLES.SUPER_ADMIN),
  validateRequest(ScrapeValidation.deleteScrapeSchema),
  ScrapeController.deleteScrape
);

export const ScrapeRoutes = router;
