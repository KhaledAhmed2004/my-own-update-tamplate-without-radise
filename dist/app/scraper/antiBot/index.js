"use strict";
/**
 * Anti-Bot System - Central Export
 * সব anti-bot utilities এক জায়গা থেকে export
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captchaHelper = exports.delayHelper = exports.userAgentHelper = void 0;
__exportStar(require("./userAgent"), exports);
__exportStar(require("./delay"), exports);
__exportStar(require("./captcha"), exports);
// NEW: Fingerprint spoofing (optional enhancement)
__exportStar(require("./fingerprint"), exports);
// NEW: Site-specific strategies (optional enhancement)
__exportStar(require("./siteStrategies"), exports);
// Re-export helpers for convenience
var userAgent_1 = require("./userAgent");
Object.defineProperty(exports, "userAgentHelper", { enumerable: true, get: function () { return userAgent_1.userAgentHelper; } });
var delay_1 = require("./delay");
Object.defineProperty(exports, "delayHelper", { enumerable: true, get: function () { return delay_1.delayHelper; } });
var captcha_1 = require("./captcha");
Object.defineProperty(exports, "captchaHelper", { enumerable: true, get: function () { return captcha_1.captchaHelper; } });
