import { setServiceLabel, setControllerLabel } from './requestContext';
import { trace, SpanStatusCode } from '@opentelemetry/api';
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
        const label = `${serviceName}.${key}`;
        try { setServiceLabel(label); } catch {}
        const tracer = trace.getTracer('app');
        return tracer.startActiveSpan(`Service: ${label}`, async span => {
          try {
            const out = original(...args);
            if (out && typeof (out as any).then === 'function') {
              return await out;
            }
            return out;
          } catch (err) {
            span.recordException(err as any);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
            throw err;
          } finally {
            span.end();
          }
        });
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
        const label = `${controllerName}.${key}`;
        try { setControllerLabel(label); } catch {}
        const tracer = trace.getTracer('app');
        return tracer.startActiveSpan(`Controller: ${label}`, async span => {
          try {
            const out = original(...args);
            if (out && typeof (out as any).then === 'function') {
              return await out;
            }
            return out;
          } catch (err) {
            span.recordException(err as any);
            span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
            throw err;
          } finally {
            span.end();
          }
        });
      };
    }
  });
};

wrapController('AuthController', AuthController);
wrapController('UserController', UserController);
wrapController('NotificationController', NotificationController);