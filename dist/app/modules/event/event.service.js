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
exports.EventService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const event_model_1 = require("./event.model");
const createEventInDB = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    // Validate inputs explicitly (zod covers this at route level)
    if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid date');
    }
    if (!payload.time || !/^\d{2}:\d{2}$/.test(payload.time)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid time');
    }
    const doc = yield event_model_1.Event.create({
        userId,
        title: payload.title,
        date: new Date(`${payload.date}T00:00:00.000Z`),
        time: payload.time,
        durationHours: payload.durationHours,
        eventType: payload.eventType,
        location: payload.location,
        preferenceCard: payload.preferenceCard,
        notes: payload.notes,
    });
    return doc;
});
const getEventByIdFromDB = (id, requester) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_model_1.Event.findById(id);
    if (!event)
        return null;
    if (event.userId !== requester.id && requester.role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not allowed to view this event');
    }
    return event;
});
const updateEventInDB = (id, requester, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_model_1.Event.findById(id);
    if (!event)
        return null;
    if (event.userId !== requester.id && requester.role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not allowed to edit this event');
    }
    const updateData = {};
    if (payload.title)
        updateData.title = payload.title;
    if (payload.location)
        updateData.location = payload.location;
    if (payload.preferenceCard)
        updateData.preferenceCard = payload.preferenceCard;
    if (payload.notes)
        updateData.notes = payload.notes;
    // Handle date/time updates
    if (payload.date)
        updateData.date = new Date(`${payload.date}T00:00:00.000Z`);
    if (payload.time)
        updateData.time = payload.time;
    if (typeof payload.durationHours === 'number')
        updateData.durationHours = payload.durationHours;
    if (payload.eventType)
        updateData.eventType = payload.eventType;
    const updated = yield event_model_1.Event.findByIdAndUpdate(id, updateData, { new: true });
    return updated;
});
const deleteEventFromDB = (id, requester) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_model_1.Event.findById(id);
    if (!event)
        return null;
    if (event.userId !== requester.id && requester.role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not allowed to delete this event');
    }
    const deleted = yield event_model_1.Event.findByIdAndDelete(id);
    return deleted;
});
const listEventsForUserFromDB = (userId, query) => __awaiter(void 0, void 0, void 0, function* () {
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
    const to = query.to ? new Date(`${query.to}T00:00:00.000Z`) : undefined;
    return event_model_1.Event.findByUser(userId, { from, to });
});
exports.EventService = {
    createEventInDB,
    getEventByIdFromDB,
    updateEventInDB,
    deleteEventFromDB,
    listEventsForUserFromDB,
};
