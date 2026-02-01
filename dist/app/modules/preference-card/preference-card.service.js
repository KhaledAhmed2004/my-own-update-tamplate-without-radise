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
exports.PreferenceCardService = void 0;
const preference_card_model_1 = require("./preference-card.model");
const user_model_1 = require("../user/user.model");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const createPreferenceCardInDB = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const dataToSave = Object.assign(Object.assign({}, data), { user: userId });
    // Save to DB
    const card = yield preference_card_model_1.PreferenceCardModel.create(dataToSave);
    return card;
});
const listPreferenceCardsForUserFromDB = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const docs = yield preference_card_model_1.PreferenceCardModel.find({ createdBy: userId }).sort({
        updatedAt: -1,
    });
    return docs;
});
const getPreferenceCardByIdFromDB = (id, userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield preference_card_model_1.PreferenceCardModel.findById(id);
    if (!doc)
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Preference card not found');
    if (doc.createdBy !== userId && role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to access this card');
    }
    return doc;
});
const updatePreferenceCardInDB = (id, userId, role, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield preference_card_model_1.PreferenceCardModel.findById(id);
    if (!doc)
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Preference card not found');
    if (doc.createdBy !== userId && role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to update this card');
    }
    if (payload.cardTitle)
        doc.cardTitle = payload.cardTitle;
    if (payload.surgeon)
        doc.surgeon = Object.assign(Object.assign({}, doc.surgeon), payload.surgeon);
    if (payload.procedure)
        doc.procedure = payload.procedure;
    if (payload.supplies)
        doc.supplies = payload.supplies;
    if (payload.sutures)
        doc.sutures = payload.sutures;
    if (payload.instruments !== undefined)
        doc.instruments = payload.instruments;
    if (payload.positioningEquipment !== undefined)
        doc.positioningEquipment = payload.positioningEquipment;
    if (payload.prepping !== undefined)
        doc.prepping = payload.prepping;
    if (payload.workflow !== undefined)
        doc.workflow = payload.workflow;
    if (payload.keyNotes !== undefined)
        doc.keyNotes = payload.keyNotes;
    if (payload.medication !== undefined)
        doc.medication = payload.medication;
    if (payload.photos)
        doc.photos = payload.photos;
    if (payload.eventId !== undefined)
        doc.eventId = payload.eventId;
    if (payload.published !== undefined)
        doc.published = payload.published;
    yield doc.save();
    return doc;
});
const deletePreferenceCardFromDB = (id, userId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = yield preference_card_model_1.PreferenceCardModel.findById(id);
    if (!doc)
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Preference card not found');
    if (doc.createdBy !== userId && role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to delete this card');
    }
    yield preference_card_model_1.PreferenceCardModel.findByIdAndDelete(id);
    return { deleted: true };
});
const publishPreferenceCardInDB = (id_1, userId_1, role_1, ...args_1) => __awaiter(void 0, [id_1, userId_1, role_1, ...args_1], void 0, function* (id, userId, role, publish = true) {
    const doc = yield preference_card_model_1.PreferenceCardModel.findById(id);
    if (!doc)
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Preference card not found');
    if (doc.createdBy !== userId && role !== 'SUPER_ADMIN') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Not authorized to publish this card');
    }
    doc.published = publish;
    yield doc.save();
    return doc;
});
exports.PreferenceCardService = {
    createPreferenceCardInDB,
    listPreferenceCardsForUserFromDB,
    listAllPreferenceCardsForAdmin(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { search, specialty, status, verified, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', } = params;
            const match = {};
            if (search) {
                match.$or = [
                    { 'surgeon.fullName': { $regex: search, $options: 'i' } },
                    { procedure: { $regex: search, $options: 'i' } },
                    { cardTitle: { $regex: search, $options: 'i' } },
                ];
            }
            if (specialty) {
                match['surgeon.specialty'] = { $regex: specialty, $options: 'i' };
            }
            if (status) {
                match.published = status === 'published';
            }
            const basePipeline = [
                { $match: match },
                {
                    $lookup: {
                        from: user_model_1.User.collection.name,
                        let: { createdByStr: '$createdBy' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: [{ $toString: '$_id' }, '$$createdByStr'] },
                                },
                            },
                        ],
                        as: 'creator',
                    },
                },
                {
                    $addFields: {
                        doctorVerified: {
                            $ifNull: [{ $arrayElemAt: ['$creator.verified', 0] }, false],
                        },
                    },
                },
                ...(verified !== undefined
                    ? [{ $match: { doctorVerified: verified === 'true' } }]
                    : []),
                {
                    $project: {
                        _id: 1,
                        cardTitle: 1,
                        procedure: 1,
                        'surgeon.fullName': 1,
                        'surgeon.specialty': 1,
                        published: 1,
                        createdAt: 1,
                        createdBy: 1,
                        statusText: {
                            $cond: [{ $eq: ['$published', true] }, 'Published', 'Unpublished'],
                        },
                        verified: '$doctorVerified',
                    },
                },
            ];
            const sortStage = { $sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 } };
            const paginatedPipeline = [
                ...basePipeline,
                sortStage,
                { $skip: (page - 1) * limit },
                { $limit: limit },
            ];
            const countPipeline = [...basePipeline, { $count: 'total' }];
            const [data, countResult] = yield Promise.all([
                preference_card_model_1.PreferenceCardModel.aggregate(paginatedPipeline),
                preference_card_model_1.PreferenceCardModel.aggregate(countPipeline),
            ]);
            const total = ((_a = countResult[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
            return {
                data,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit || 1),
                },
            };
        });
    },
    getPreferenceCardByIdFromDB,
    updatePreferenceCardInDB,
    deletePreferenceCardFromDB,
    publishPreferenceCardInDB,
};
