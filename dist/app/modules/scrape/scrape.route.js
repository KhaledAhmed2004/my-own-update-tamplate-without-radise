"use strict";
/**
 * Scrape Routes — স্ক্র্যাপিং সম্পর্কিত API গুলো
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapeRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_1 = require("../../../enums/user");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const scrape_controller_1 = require("./scrape.controller");
const scrape_validation_1 = require("./scrape.validation");
const router = express_1.default.Router();
// সাধারণ স্ক্র্যাপ চালায়
router.post('/', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.createScrapeRequestSchema), scrape_controller_1.ScrapeController.executeScrape);
// প্রোডাক্ট পেজ স্ক্র্যাপ (Amazon-optimized)
router.post('/product', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.createProductScrapeSchema), scrape_controller_1.ScrapeController.scrapeProduct);
// ইউজারের স্ক্র্যাপ হিস্টোরি
router.get('/history', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.getScrapeHistorySchema), scrape_controller_1.ScrapeController.getScrapeHistory);
// স্ক্র্যাপিং স্ট্যাটস
router.get('/stats', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), scrape_controller_1.ScrapeController.getScrapeStats);
// নির্দিষ্ট স্ক্র্যাপ রেজাল্ট
router.get('/:id', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.getScrapeByIdSchema), scrape_controller_1.ScrapeController.getScrapeById);
// স্ক্র্যাপ রেকর্ড ডিলিট
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.POSTER, user_1.USER_ROLES.TASKER, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(scrape_validation_1.ScrapeValidation.deleteScrapeSchema), scrape_controller_1.ScrapeController.deleteScrape);
exports.ScrapeRoutes = router;
