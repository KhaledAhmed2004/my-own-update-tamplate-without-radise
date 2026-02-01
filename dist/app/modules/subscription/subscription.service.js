"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachStripeSubscriptionToUser = exports.setFreePlan = exports.createPortalSession = exports.createCheckoutSession = exports.getMySubscription = void 0;
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
const stripe_1 = require("../../../config/stripe");
const config_1 = __importDefault(require("../../../config"));
const subscription_model_1 = require("./subscription.model");
const subscription_interface_1 = require("./subscription.interface");
const user_model_1 = require("../user/user.model");
const PRICE_IDS = {
    [subscription_interface_1.SUBSCRIPTION_PLAN.FREE]: null,
    [subscription_interface_1.SUBSCRIPTION_PLAN.PREMIUM]: process.env.STRIPE_PRICE_PREMIUM || null,
    [subscription_interface_1.SUBSCRIPTION_PLAN.ENTERPRISE]: process.env.STRIPE_PRICE_ENTERPRISE || null,
};
const ensureSubscriptionDoc = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const id = new mongoose_1.Types.ObjectId(userId);
    const doc = yield subscription_model_1.Subscription.findByUser(id);
    if (doc)
        return doc;
    return yield subscription_model_1.Subscription.upsertForUser(id, {
        plan: subscription_interface_1.SUBSCRIPTION_PLAN.FREE,
        status: subscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
    });
});
const ensureStripeCustomerForUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield ensureSubscriptionDoc(userId);
    if (sub.stripeCustomerId)
        return sub.stripeCustomerId;
    const user = yield user_model_1.User.findById(userId).select('+email name').lean();
    if (!user)
        throw new ApiError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
    try {
        const customer = yield stripe_1.stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: { userId },
        });
        const updated = yield subscription_model_1.Subscription.upsertForUser(new mongoose_1.Types.ObjectId(userId), {
            stripeCustomerId: customer.id,
        });
        return updated.stripeCustomerId;
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Failed to create Stripe customer: ${(0, stripe_1.handleStripeError)(error)}`);
    }
});
const getMySubscription = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const sub = yield ensureSubscriptionDoc(userId);
    // If we have a Stripe subscription, fetch latest status
    if (sub.stripeSubscriptionId) {
        try {
            const stripeSub = yield stripe_1.stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
            const statusMap = {
                active: subscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
                trialing: subscription_interface_1.SUBSCRIPTION_STATUS.TRIALING,
                past_due: subscription_interface_1.SUBSCRIPTION_STATUS.PAST_DUE,
                canceled: subscription_interface_1.SUBSCRIPTION_STATUS.CANCELED,
                unpaid: subscription_interface_1.SUBSCRIPTION_STATUS.PAST_DUE,
            };
            const currentPeriodEnd = stripeSub.current_period_end
                ? new Date(stripeSub.current_period_end * 1000)
                : null;
            const normalizedStatus = statusMap[stripeSub.status] || subscription_interface_1.SUBSCRIPTION_STATUS.INACTIVE;
            const updated = yield subscription_model_1.Subscription.upsertForUser(new mongoose_1.Types.ObjectId(userId), {
                status: normalizedStatus,
                currentPeriodEnd,
            });
            return updated;
        }
        catch (e) {
            // If Stripe fetch fails, return existing doc without hard failure
            return sub;
        }
    }
    // If we don't have a subscription ID but have a customer, try to discover one
    if (sub.stripeCustomerId) {
        try {
            const list = yield stripe_1.stripe.subscriptions.list({ customer: sub.stripeCustomerId, status: 'all', limit: 1 });
            if (list.data && list.data.length > 0) {
                const found = list.data[0];
                const statusMap = {
                    active: subscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
                    trialing: subscription_interface_1.SUBSCRIPTION_STATUS.TRIALING,
                    past_due: subscription_interface_1.SUBSCRIPTION_STATUS.PAST_DUE,
                    canceled: subscription_interface_1.SUBSCRIPTION_STATUS.CANCELED,
                    unpaid: subscription_interface_1.SUBSCRIPTION_STATUS.PAST_DUE,
                };
                const currentPeriodEnd = found.current_period_end ? new Date(found.current_period_end * 1000) : null;
                const normalizedStatus = statusMap[found.status] || subscription_interface_1.SUBSCRIPTION_STATUS.INACTIVE;
                const updated = yield subscription_model_1.Subscription.upsertForUser(new mongoose_1.Types.ObjectId(userId), {
                    stripeSubscriptionId: found.id,
                    status: normalizedStatus,
                    currentPeriodEnd,
                });
                return updated;
            }
        }
        catch (_a) {
            // ignore discovery errors
        }
    }
    return sub;
});
exports.getMySubscription = getMySubscription;
const createCheckoutSession = (userId, plan, successUrl, cancelUrl) => __awaiter(void 0, void 0, void 0, function* () {
    if (plan === subscription_interface_1.SUBSCRIPTION_PLAN.FREE) {
        // Directly switch to free locally
        yield subscription_model_1.Subscription.upsertForUser(new mongoose_1.Types.ObjectId(userId), {
            plan,
            status: subscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
            stripeSubscriptionId: undefined,
        });
        return { url: `${config_1.default.frontend_url || 'http://localhost:5173'}/billing` };
    }
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Price ID missing for plan ${plan}. Set env STRIPE_PRICE_${plan}`);
    }
    const customerId = yield ensureStripeCustomerForUser(userId);
    const success = successUrl || `${config_1.default.frontend_url || 'http://localhost:5173'}/billing/success`;
    const cancel = cancelUrl || `${config_1.default.frontend_url || 'http://localhost:5173'}/billing/cancel`;
    try {
        const session = yield stripe_1.stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: success,
            cancel_url: cancel,
            allow_promotion_codes: true,
            metadata: { userId, plan },
        });
        return { url: session.url };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Failed to create checkout session: ${(0, stripe_1.handleStripeError)(error)}`);
    }
});
exports.createCheckoutSession = createCheckoutSession;
const createPortalSession = (userId, returnUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const customerId = yield ensureStripeCustomerForUser(userId);
    const return_url = returnUrl || `${config_1.default.frontend_url || 'http://localhost:5173'}/billing`;
    try {
        const session = yield stripe_1.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url,
        });
        return { url: session.url };
    }
    catch (error) {
        throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, `Failed to create billing portal session: ${(0, stripe_1.handleStripeError)(error)}`);
    }
});
exports.createPortalSession = createPortalSession;
const setFreePlan = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    return subscription_model_1.Subscription.upsertForUser(new mongoose_1.Types.ObjectId(userId), {
        plan: subscription_interface_1.SUBSCRIPTION_PLAN.FREE,
        status: subscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE,
        stripeSubscriptionId: undefined,
    });
});
exports.setFreePlan = setFreePlan;
const attachStripeSubscriptionToUser = (userId, stripeSubscriptionId, plan) => __awaiter(void 0, void 0, void 0, function* () {
    yield subscription_model_1.Subscription.upsertForUser(new mongoose_1.Types.ObjectId(userId), {
        stripeSubscriptionId,
        plan,
    });
});
exports.attachStripeSubscriptionToUser = attachStripeSubscriptionToUser;
const SubscriptionService = {
    getMySubscription: exports.getMySubscription,
    createCheckoutSession: exports.createCheckoutSession,
    createPortalSession: exports.createPortalSession,
    setFreePlan: exports.setFreePlan,
    attachStripeSubscriptionToUser: exports.attachStripeSubscriptionToUser,
};
exports.default = SubscriptionService;
