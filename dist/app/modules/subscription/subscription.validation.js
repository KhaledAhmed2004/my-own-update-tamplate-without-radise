"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionValidation = void 0;
const zod_1 = require("zod");
const subscription_interface_1 = require("./subscription.interface");
const planEnum = zod_1.z.nativeEnum(subscription_interface_1.SUBSCRIPTION_PLAN);
exports.SubscriptionValidation = {
    createCheckoutSessionSchema: zod_1.z
        .object({
        body: zod_1.z.object({
            plan: planEnum,
            successUrl: zod_1.z.string().url().optional(),
            cancelUrl: zod_1.z.string().url().optional(),
        }),
        params: zod_1.z.object({}).optional(),
        query: zod_1.z.object({}).optional(),
    })
        .describe('SubscriptionCheckoutSchema'),
    createPortalSessionSchema: zod_1.z
        .object({
        body: zod_1.z.object({
            returnUrl: zod_1.z.string().url().optional(),
        }),
        params: zod_1.z.object({}).optional(),
        query: zod_1.z.object({}).optional(),
    })
        .describe('SubscriptionPortalSchema'),
};
