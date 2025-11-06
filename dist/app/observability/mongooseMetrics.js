"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMongooseMetricsPlugin = registerMongooseMetricsPlugin;
const mongoose_1 = __importDefault(require("mongoose"));
const requestContext_1 = require("../middlewares/requestContext");
function preStart(next) {
    this.__metricsStart = Date.now();
    next();
}
function postEnd(_res, next) {
    const start = this.__metricsStart || Date.now();
    const dur = Date.now() - start;
    (0, requestContext_1.recordDbQuery)(dur);
    next();
}
function registerMongooseMetricsPlugin() {
    const plugin = (schema) => {
        // Query operations
        schema.pre('find', preStart);
        schema.post('find', postEnd);
        schema.pre('findOne', preStart);
        schema.post('findOne', postEnd);
        schema.pre('countDocuments', preStart);
        schema.post('countDocuments', postEnd);
        schema.pre('estimatedDocumentCount', preStart);
        schema.post('estimatedDocumentCount', postEnd);
        schema.pre('findOneAndUpdate', preStart);
        schema.post('findOneAndUpdate', postEnd);
        schema.pre('updateOne', preStart);
        schema.post('updateOne', postEnd);
        schema.pre('updateMany', preStart);
        schema.post('updateMany', postEnd);
        schema.pre('deleteOne', preStart);
        schema.post('deleteOne', postEnd);
        schema.pre('deleteMany', preStart);
        schema.post('deleteMany', postEnd);
        // Aggregation
        schema.pre('aggregate', function (next) {
            this.__metricsStart = Date.now();
            next();
        });
        schema.post('aggregate', function (_res, next) {
            const start = this.__metricsStart || Date.now();
            const dur = Date.now() - start;
            (0, requestContext_1.recordDbQuery)(dur);
            next();
        });
        // Document operations (covers create/save)
        schema.pre('save', function (next) {
            this.__metricsStart = Date.now();
            next();
        });
        schema.post('save', function (_doc, next) {
            const start = this.__metricsStart || Date.now();
            const dur = Date.now() - start;
            (0, requestContext_1.recordDbQuery)(dur);
            next();
        });
    };
    mongoose_1.default.plugin(plugin);
}
// Auto-register on import
registerMongooseMetricsPlugin();
