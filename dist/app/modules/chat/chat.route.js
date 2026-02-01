"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../middlewares/auth"));
const chat_controller_1 = require("./chat.controller");
const user_1 = require("../../../enums/user");
const router = express_1.default.Router();
// নতুন চ্যাট তৈরি — অন্য ইউজারের সাথে ডাইরেক্ট চ্যাট ওপেন
router.post('/:otherUserId', (0, auth_1.default)(user_1.USER_ROLES.TASKER, user_1.USER_ROLES.POSTER), chat_controller_1.ChatController.createChat);
// নিজের চ্যাটগুলো লিস্ট/ডিটেইলস আনে
router.get('/', (0, auth_1.default)(user_1.USER_ROLES.TASKER, user_1.USER_ROLES.POSTER), chat_controller_1.ChatController.getChat);
exports.ChatRoutes = router;
