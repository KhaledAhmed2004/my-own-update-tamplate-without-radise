import { setServiceLabel, setControllerLabel } from './requestContext';
import { AuthService } from '../modules/auth/auth.service';
import { UserService } from '../modules/user/user.service';
import { NotificationService } from '../modules/notification/notification.service';
import { AuthController } from '../modules/auth/auth.controller';
import { UserController } from '../modules/user/user.controller';
import { NotificationController } from '../modules/notification/notification.controller';

const wrapService = (serviceName: string, obj: Record<string, any>) => {
  Object.keys(obj).forEach(key => {
    const original = obj[key];
    if (typeof original === 'function') {
      obj[key] = (...args: any[]) => {
        try {
          setServiceLabel(`${serviceName}.${key}`);
        } catch {}
        return original(...args);
      };
    }
  });
};

wrapService('AuthService', AuthService);
wrapService('UserService', UserService);
wrapService('NotificationService', NotificationService);

// Add more services here to auto-label without touching their files
// e.g., import { PaymentService } from '../modules/payment/payment.service';
// wrapService('PaymentService', PaymentService);

const wrapController = (controllerName: string, obj: Record<string, any>) => {
  Object.keys(obj).forEach(key => {
    const original = obj[key];
    if (typeof original === 'function') {
      obj[key] = (...args: any[]) => {
        try {
          setControllerLabel(`${controllerName}.${key}`);
        } catch {}
        return original(...args);
      };
    }
  });
};

wrapController('AuthController', AuthController);
wrapController('UserController', UserController);
wrapController('NotificationController', NotificationController);