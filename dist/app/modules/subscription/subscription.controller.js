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
exports.chooseFreePlanController = exports.createPortalSessionController = exports.createCheckoutSessionController = exports.getMySubscriptionController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const subscription_service_1 = __importDefault(require("./subscription.service"));
exports.getMySubscriptionController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const result = yield subscription_service_1.default.getMySubscription(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Subscription retrieved successfully',
        data: result,
    });
}));
exports.createCheckoutSessionController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const { plan, successUrl, cancelUrl } = req.body;
    const result = yield subscription_service_1.default.createCheckoutSession(id, plan, successUrl, cancelUrl);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Checkout session created successfully',
        data: result,
    });
}));
exports.createPortalSessionController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const { returnUrl } = req.body;
    const result = yield subscription_service_1.default.createPortalSession(id, returnUrl);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Billing portal session created successfully',
        data: result,
    });
}));
exports.chooseFreePlanController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.user;
    const result = yield subscription_service_1.default.setFreePlan(id);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Switched to Free plan successfully',
        data: result,
    });
}));
const SubscriptionController = {
    getMySubscriptionController: exports.getMySubscriptionController,
    createCheckoutSessionController: exports.createCheckoutSessionController,
    createPortalSessionController: exports.createPortalSessionController,
    chooseFreePlanController: exports.chooseFreePlanController,
};
exports.default = SubscriptionController;
