// Central OpenTelemetry instrumentation for jsonwebtoken
// Loads once at startup and wraps jwt.sign / jwt.verify globally.
// This keeps business helpers clean (no per-call spans in jwtHelper.ts).
import { trace } from '@opentelemetry/api';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

const originalSign = jwt.sign;
const originalVerify = jwt.verify;

// Wrap sign
jwt.sign = function patchedJwtSign(...args: any[]) {
  const tracer = trace.getTracer('app');
  return tracer.startActiveSpan('JWT.sign', span => {
    try {
      return originalSign.apply(jwt, args);
    } catch (err) {
      try { span.recordException(err as any); } catch {}
      throw err;
    } finally {
      try { span.end(); } catch {}
    }
  });
};

// Wrap verify
jwt.verify = function patchedJwtVerify(...args: any[]) {
  const tracer = trace.getTracer('app');
  return tracer.startActiveSpan('JWT.verify', span => {
    try {
      return originalVerify.apply(jwt, args);
    } catch (err) {
      try { span.recordException(err as any); } catch {}
      throw err;
    } finally {
      try { span.end(); } catch {}
    }
  });
};

export {}; // side-effect module