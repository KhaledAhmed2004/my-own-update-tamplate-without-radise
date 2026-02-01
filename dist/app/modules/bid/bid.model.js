"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BidModel = void 0;
const mongoose_1 = require("mongoose");
const BidSchema = new mongoose_1.Schema({
    taskId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    taskerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending', index: true },
    paymentIntentId: { type: String, default: null },
}, { timestamps: true });
BidSchema.index({ taskId: 1, taskerId: 1 });
exports.BidModel = (0, mongoose_1.model)('Bid', BidSchema);
