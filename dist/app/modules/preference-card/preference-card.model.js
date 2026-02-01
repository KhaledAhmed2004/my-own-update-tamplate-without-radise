"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferenceCardModel = void 0;
const mongoose_1 = require("mongoose");
// Surgeon subdocument schema
const SurgeonSchema = new mongoose_1.Schema({
    fullName: { type: String, required: true, trim: true },
    handPreference: { type: String, required: true },
    specialty: { type: String, required: true },
    contactNumber: { type: String, required: true },
    musicPreference: { type: String, required: true },
}, { _id: false });
// Main PreferenceCard schema
const PreferenceCardSchema = new mongoose_1.Schema({
    cardTitle: { type: String, required: true, trim: true },
    surgeon: { type: SurgeonSchema, required: true },
    medication: { type: String, required: true },
    supplies: { type: [String], required: true },
    sutures: { type: [String], required: true },
    instruments: { type: String, required: true },
    positioningEquipment: { type: String, required: true },
    prepping: { type: String, required: true },
    workflow: { type: String, required: true },
    keyNotes: { type: String, required: true },
    photoLibrary: { type: [String], required: true }, // fixed typo
    published: { type: Boolean, default: false },
}, { timestamps: true });
// Export model
exports.PreferenceCardModel = (0, mongoose_1.model)('PreferenceCard', PreferenceCardSchema);
