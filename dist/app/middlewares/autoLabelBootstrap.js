"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requestContext_1 = require("./requestContext");
const auth_service_1 = require("../modules/auth/auth.service");
const user_service_1 = require("../modules/user/user.service");
const notification_service_1 = require("../modules/notification/notification.service");
const auth_controller_1 = require("../modules/auth/auth.controller");
const user_controller_1 = require("../modules/user/user.controller");
const notification_controller_1 = require("../modules/notification/notification.controller");
const wrapService = (serviceName, obj) => {
    Object.keys(obj).forEach(key => {
        const original = obj[key];
        if (typeof original === 'function') {
            obj[key] = (...args) => {
                try {
                    (0, requestContext_1.setServiceLabel)(`${serviceName}.${key}`);
                }
                catch (_a) { }
                return original(...args);
            };
        }
    });
};
wrapService('AuthService', auth_service_1.AuthService);
wrapService('UserService', user_service_1.UserService);
wrapService('NotificationService', notification_service_1.NotificationService);
// Add more services here to auto-label without touching their files
// e.g., import { PaymentService } from '../modules/payment/payment.service';
// wrapService('PaymentService', PaymentService);
const wrapController = (controllerName, obj) => {
    Object.keys(obj).forEach(key => {
        const original = obj[key];
        if (typeof original === 'function') {
            obj[key] = (...args) => {
                try {
                    (0, requestContext_1.setControllerLabel)(`${controllerName}.${key}`);
                }
                catch (_a) { }
                return original(...args);
            };
        }
    });
};
wrapController('AuthController', auth_controller_1.AuthController);
wrapController('UserController', user_controller_1.UserController);
wrapController('NotificationController', notification_controller_1.NotificationController);
