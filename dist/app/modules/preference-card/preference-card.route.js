"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferenceCardRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_1 = require("../../../enums/user");
const preference_card_controller_1 = require("./preference-card.controller");
const preference_card_validation_1 = require("./preference-card.validation");
const router = express_1.default.Router();
// Create card
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(preference_card_validation_1.createPreferenceCardSchema), preference_card_controller_1.PreferenceCardController.createCard);
// List all own cards
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), preference_card_controller_1.PreferenceCardController.listMyCards);
// Admin list: all cards with surgeon/procedure/specialty/status/verified/createdAt
router.get('/admin', (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN), preference_card_controller_1.PreferenceCardController.listAllCardsAdmin);
// Card details — view by ID
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(preference_card_validation_1.paramIdSchema), preference_card_controller_1.PreferenceCardController.getById);
// Update card — by ID
router.patch('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(preference_card_validation_1.updatePreferenceCardSchema), preference_card_controller_1.PreferenceCardController.updateCard);
// Delete card — by ID
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(preference_card_validation_1.paramIdSchema), preference_card_controller_1.PreferenceCardController.deleteCard);
// Publish/unpublish card — pass publish: true/false in body
router.post('/:id/publish', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(preference_card_validation_1.publishPreferenceCardSchema), preference_card_controller_1.PreferenceCardController.publishCard);
exports.PreferenceCardRoutes = router;
