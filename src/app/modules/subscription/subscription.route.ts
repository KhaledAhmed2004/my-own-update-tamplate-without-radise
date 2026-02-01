import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLES } from '../../../enums/user';
import SubscriptionController from './subscription.controller';
import { SubscriptionValidation } from './subscription.validation';
import { rateLimitMiddleware } from '../../middlewares/rateLimit';

const router = express.Router();

// GET /subscription/me
// নিজের সাবস্ক্রিপশন স্ট্যাটাস/প্ল্যান দেখায় (Stripe থাকলে লাইভ সিঙ্ক)
router.get(
  '/me',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  SubscriptionController.getMySubscriptionController
);

// POST /subscription/checkout
// নির্দিষ্ট plan দিয়ে Stripe Checkout session তৈরি করে (redirect URL রিটার্ন)
router.post(
  '/checkout',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  rateLimitMiddleware({ windowMs: 60_000, max: 20, routeName: 'subscription-checkout' }),
  validateRequest(SubscriptionValidation.createCheckoutSessionSchema),
  SubscriptionController.createCheckoutSessionController
);

// POST /subscription/portal
// Stripe Billing Portal session তৈরি করে (Manage Subscription / Payment Method)
router.post(
  '/portal',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(SubscriptionValidation.createPortalSessionSchema),
  SubscriptionController.createPortalSessionController
);

// POST /subscription/choose/free
// লোকালি Free প্ল্যানে সুইচ করে (Stripe সাবস্ক্রিপশন ছাড়াই)
router.post(
  '/choose/free',
  auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  SubscriptionController.chooseFreePlanController
);

export const SubscriptionRoutes = router;