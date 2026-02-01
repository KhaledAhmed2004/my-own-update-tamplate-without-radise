import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import { PreferenceCardController } from './preference-card.controller';
import {
  createPreferenceCardSchema,
  updatePreferenceCardSchema,
  paramIdSchema,
} from './preference-card.validation';

const router = express.Router();

// Create card
router.post(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(createPreferenceCardSchema),
  PreferenceCardController.createCard,
);

// List all own cards
router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  PreferenceCardController.listMyCards,
);

// List all public cards
router.get(
  '/public',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  PreferenceCardController.listPublicCards,
);

// Card details view by ID
router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(paramIdSchema),
  PreferenceCardController.getById,
);

// Update card by ID
router.patch(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(updatePreferenceCardSchema),
  PreferenceCardController.updateCard,
);

// Delete card by ID
router.delete(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(paramIdSchema),
  PreferenceCardController.deleteCard,
);

// Increment download count
router.post(
  '/:id/download',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(paramIdSchema),
  PreferenceCardController.incrementDownloadCount,
);

export const PreferenceCardRoutes = router;
