"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMongooseMetricsPlugin = registerMongooseMetricsPlugin;
const mongoose_1 = __importDefault(require("mongoose"));
const requestContext_1 = require("../middlewares/requestContext");
function getModelName(self) {
    var _a, _b, _c;
    return (((_a = self === null || self === void 0 ? void 0 : self.model) === null || _a === void 0 ? void 0 : _a.modelName) ||
        ((_b = self === null || self === void 0 ? void 0 : self.constructor) === null || _b === void 0 ? void 0 : _b.modelName) ||
        ((_c = self === null || self === void 0 ? void 0 : self._model) === null || _c === void 0 ? void 0 : _c.modelName) ||
        (self === null || self === void 0 ? void 0 : self.modelName) ||
        undefined);
}
const preStart = (op) => function (next) {
    this.__metricsStart = Date.now();
    this.__metricsOp = op;
    next();
};
const postEnd = (op) => function (_res, next) {
    const start = this.__metricsStart || Date.now();
    const dur = Date.now() - start;
    const model = getModelName(this);
    (0, requestContext_1.recordDbQuery)(dur, { model, operation: op, cacheHit: false });
    next();
};
function registerMongooseMetricsPlugin() {
    const plugin = (schema) => {
        // Query operations
        schema.pre('find', preStart('find'));
        schema.post('find', postEnd('find'));
        schema.pre('findOne', preStart('findOne'));
        schema.post('findOne', postEnd('findOne'));
        schema.pre('countDocuments', preStart('countDocuments'));
        schema.post('countDocuments', postEnd('countDocuments'));
        schema.pre('estimatedDocumentCount', preStart('estimatedDocumentCount'));
        schema.post('estimatedDocumentCount', postEnd('estimatedDocumentCount'));
        schema.pre('findOneAndUpdate', preStart('findOneAndUpdate'));
        schema.post('findOneAndUpdate', postEnd('findOneAndUpdate'));
        schema.pre('updateOne', preStart('updateOne'));
        schema.post('updateOne', postEnd('updateOne'));
        schema.pre('updateMany', preStart('updateMany'));
        schema.post('updateMany', postEnd('updateMany'));
        schema.pre('deleteOne', preStart('deleteOne'));
        schema.post('deleteOne', postEnd('deleteOne'));
        schema.pre('deleteMany', preStart('deleteMany'));
        schema.post('deleteMany', postEnd('deleteMany'));
        // Error handlers for query ops (record even if failed)
        schema.post('updateOne', function (err, _res, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'updateOne', cacheHit: false });
            }
            next(err);
        });
        schema.post('updateMany', function (err, _res, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'updateMany', cacheHit: false });
            }
            next(err);
        });
        schema.post('findOneAndUpdate', function (err, _res, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'findOneAndUpdate', cacheHit: false });
            }
            next(err);
        });
        schema.post('deleteOne', function (err, _res, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'deleteOne', cacheHit: false });
            }
            next(err);
        });
        schema.post('deleteMany', function (err, _res, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'deleteMany', cacheHit: false });
            }
            next(err);
        });
        // Aggregation
        schema.pre('aggregate', preStart('aggregate'));
        schema.post('aggregate', postEnd('aggregate'));
        schema.post('aggregate', function (err, _res, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'aggregate', cacheHit: false });
            }
            next(err);
        });
        // Document operations (covers create/save)
        schema.pre('save', preStart('save'));
        schema.post('save', function (_doc, next) {
            const start = this.__metricsStart || Date.now();
            const dur = Date.now() - start;
            const model = getModelName(this);
            (0, requestContext_1.recordDbQuery)(dur, { model, operation: 'save', cacheHit: false });
            next();
        });
        schema.post('save', function (err, _doc, next) {
            if (err) {
                const start = this.__metricsStart || Date.now();
                (0, requestContext_1.recordDbQuery)(Date.now() - start, { model: getModelName(this), operation: 'save', cacheHit: false });
            }
            next(err);
        });
    };
    mongoose_1.default.plugin(plugin);
}
// Auto-register on import
registerMongooseMetricsPlugin();
