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
exports.getAdminDashboardStats = void 0;
const AggregationBuilder_1 = __importDefault(require("../../builder/AggregationBuilder"));
const user_model_1 = require("../user/user.model");
const preference_card_model_1 = require("../preference-card/preference-card.model");
const subscription_model_1 = require("../subscription/subscription.model");
const subscription_interface_1 = require("../subscription/subscription.interface");
// Dashboard metrics with growth statistics for admin
const getAdminDashboardStats = () => __awaiter(void 0, void 0, void 0, function* () {
    // Total users (no role filter in SUPER_ADMIN-only system)
    const doctorBuilder = new AggregationBuilder_1.default(user_model_1.User);
    const doctors = yield doctorBuilder.calculateGrowth({
        // No role filter; all users counted
        period: 'month',
    });
    // Total preference cards
    const cardBuilder = new AggregationBuilder_1.default(preference_card_model_1.PreferenceCardModel);
    const preferenceCards = yield cardBuilder.calculateGrowth({
        period: 'month',
    });
    // Verified (published) preference cards
    const verifiedPreferenceCards = yield cardBuilder.calculateGrowth({
        filter: { published: true },
        period: 'month',
    });
    // Active subscriptions
    const subBuilder = new AggregationBuilder_1.default(subscription_model_1.Subscription);
    const activeSubscriptions = yield subBuilder.calculateGrowth({
        filter: { status: subscription_interface_1.SUBSCRIPTION_STATUS.ACTIVE },
        period: 'month',
    });
    return {
        summary: {
            doctors,
            preferenceCards,
            verifiedPreferenceCards,
            activeSubscriptions,
        },
    };
});
exports.getAdminDashboardStats = getAdminDashboardStats;
