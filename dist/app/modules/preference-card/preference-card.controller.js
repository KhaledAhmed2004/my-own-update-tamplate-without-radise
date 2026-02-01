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
exports.PreferenceCardController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const preference_card_service_1 = require("./preference-card.service");
exports.PreferenceCardController = {
    createCard: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        // Save the card in DB
        const result = yield preference_card_service_1.PreferenceCardService.createPreferenceCardInDB(user.id, req.body);
        // Send response
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.CREATED,
            message: 'Preference card created',
            data: result,
        });
    })),
    listAllCardsAdmin: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield preference_card_service_1.PreferenceCardService.listAllPreferenceCardsForAdmin({
            search: req.query.search || undefined,
            specialty: req.query.specialty || undefined,
            status: req.query.status || undefined,
            verified: req.query.verified || undefined,
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            sortBy: req.query.sortBy || undefined,
            sortOrder: req.query.sortOrder || undefined,
        });
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: 'All preference cards fetched',
            pagination: result.meta,
            data: result.data,
        });
    })),
    listMyCards: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        const result = yield preference_card_service_1.PreferenceCardService.listPreferenceCardsForUserFromDB(user.id);
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: 'Preference cards fetched',
            data: result,
        });
    })),
    getById: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        const result = yield preference_card_service_1.PreferenceCardService.getPreferenceCardByIdFromDB(req.params.id, user.id, user.role);
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: 'Preference card details fetched',
            data: result,
        });
    })),
    updateCard: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        const result = yield preference_card_service_1.PreferenceCardService.updatePreferenceCardInDB(req.params.id, user.id, user.role, req.body);
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: 'Preference card updated',
            data: result,
        });
    })),
    deleteCard: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user;
        const result = yield preference_card_service_1.PreferenceCardService.deletePreferenceCardFromDB(req.params.id, user.id, user.role);
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: 'Preference card deleted',
            data: result,
        });
    })),
    publishCard: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const user = req.user;
        // Body validated by publishPreferenceCardSchema: { published: boolean }
        const publish = (_a = req.body) === null || _a === void 0 ? void 0 : _a.published;
        const result = yield preference_card_service_1.PreferenceCardService.publishPreferenceCardInDB(req.params.id, user.id, user.role, publish);
        (0, sendResponse_1.default)(res, {
            success: true,
            statusCode: http_status_codes_1.StatusCodes.OK,
            message: publish
                ? 'Preference card published'
                : 'Preference card unpublished',
            data: result,
        });
    })),
};
