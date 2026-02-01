"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskStatus = exports.TaskModel = void 0;
const mongoose_1 = require("mongoose");
const task_interface_1 = require("./task.interface");
Object.defineProperty(exports, "TaskStatus", { enumerable: true, get: function () { return task_interface_1.TaskStatus; } });
const TaskSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String },
    description: { type: String },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
        type: String,
        enum: Object.values(task_interface_1.TaskStatus),
        default: task_interface_1.TaskStatus.OPEN,
        index: true,
    },
    paymentIntentId: { type: String, default: null },
}, { timestamps: true });
TaskSchema.index({ userId: 1, status: 1 });
exports.TaskModel = (0, mongoose_1.model)('Task', TaskSchema);
