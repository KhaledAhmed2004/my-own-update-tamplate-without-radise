"use strict";
/**
 * Proxy Helpers Index
 * সব proxy methods export করে
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithCorsProxy = exports.fetchWithAllOrigins = void 0;
var allOrigins_1 = require("./allOrigins");
Object.defineProperty(exports, "fetchWithAllOrigins", { enumerable: true, get: function () { return allOrigins_1.fetchWithAllOrigins; } });
var corsProxy_1 = require("./corsProxy");
Object.defineProperty(exports, "fetchWithCorsProxy", { enumerable: true, get: function () { return corsProxy_1.fetchWithCorsProxy; } });
