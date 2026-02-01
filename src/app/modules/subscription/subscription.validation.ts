import { z } from 'zod';
import { SUBSCRIPTION_PLAN } from './subscription.interface';

const planEnum = z.nativeEnum(SUBSCRIPTION_PLAN);

export const SubscriptionValidation = {
  createCheckoutSessionSchema: z
    .object({
      body: z.object({
        plan: planEnum,
        successUrl: z.string().url().optional(),
        cancelUrl: z.string().url().optional(),
      }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    })
    .describe('SubscriptionCheckoutSchema'),

  createPortalSessionSchema: z
    .object({
      body: z.object({
        returnUrl: z.string().url().optional(),
      }),
      params: z.object({}).optional(),
      query: z.object({}).optional(),
    })
    .describe('SubscriptionPortalSchema'),
};