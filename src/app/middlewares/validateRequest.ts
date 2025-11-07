import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';
import { trace } from '@opentelemetry/api';

const validateRequest =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const tracer = trace.getTracer('app');
    await tracer.startActiveSpan('Validation', async span => {
      try {
        span.setAttribute('layer', 'Middleware > Validation');
        span.setAttribute('validation.type', 'zod');
        // Capture callsite to help timeline printer show Source when exception stack lacks paths
        try {
          const cs = new Error().stack || '';
          span.setAttribute('validation.source', cs);
        } catch {}
        span.setAttribute('http.method', req.method);
        span.setAttribute('http.route', (req.route && (req.route as any).path) || req.originalUrl || 'n/a');
        span.addEvent('VALIDATE_START');

        await schema.parseAsync({
          body: req.body,
          params: req.params,
          query: req.query,
          cookies: req.cookies,
        });

        span.addEvent('VALIDATE_SUCCESS');
        next();
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: 2, message: error?.message || 'Validation failed' });
        span.addEvent('ERROR');
        next(error);
      } finally {
        span.end();
      }
    });
  };

export default validateRequest;
