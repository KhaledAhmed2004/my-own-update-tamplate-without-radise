"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const mongoose_1 = require("mongoose");
const event_interface_1 = require("./event.interface");
const eventSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    time: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: (v) => /^\d{2}:\d{2}$/.test(v),
            message: 'Time must be in HH:mm format',
        },
    },
    durationHours: { type: Number, required: true, min: 0.25 },
    eventType: { type: String, enum: Object.values(event_interface_1.EVENT_TYPE), required: true },
    location: { type: String },
    preferenceCard: { type: String },
    notes: { type: String },
}, { timestamps: true });
eventSchema.statics.findByUser = function (userId, query) {
    const filter = { userId };
    if ((query === null || query === void 0 ? void 0 : query.from) || (query === null || query === void 0 ? void 0 : query.to)) {
        filter.date = {};
        if (query.from)
            filter.date.$gte = query.from;
        if (query.to)
            filter.date.$lte = query.to;
    }
    return this.find(filter).sort({ date: 1, time: 1 }).exec();
};
exports.Event = (0, mongoose_1.model)('Event', eventSchema);
