/*
  Monkey-patch bcrypt.hash and bcrypt.compare to emit spans.
  Import this module early in app bootstrap.
*/
import { trace } from '@opentelemetry/api';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

const tracer = trace.getTracer('app');

try {
  if (!bcrypt.__otel_patched) {
    const originalHash = bcrypt.hash.bind(bcrypt);
    const originalCompare = bcrypt.compare.bind(bcrypt);

    bcrypt.hash = (...args: any[]) => {
      return tracer.startActiveSpan('bcrypt.hash', span => {
        const start = Date.now();
        try {
          const out = originalHash(...args);
          if (out && typeof out.then === 'function') {
            return (out as Promise<any>).finally(() => {
              try { span.setAttribute('bcrypt.ms', Date.now() - start); } catch {}
              try { span.end(); } catch {}
            });
          }
          return out;
        } catch (err) {
          try { span.recordException(err as any); } catch {}
          try { span.end(); } catch {}
          throw err;
        }
      });
    };

    bcrypt.compare = (...args: any[]) => {
      return tracer.startActiveSpan('bcrypt.compare', span => {
        const start = Date.now();
        try {
          const out = originalCompare(...args);
          if (out && typeof out.then === 'function') {
            return (out as Promise<any>).finally(() => {
              try { span.setAttribute('bcrypt.ms', Date.now() - start); } catch {}
              try { span.end(); } catch {}
            });
          }
          return out;
        } catch (err) {
          try { span.recordException(err as any); } catch {}
          try { span.end(); } catch {}
          throw err;
        }
      });
    };

    bcrypt.__otel_patched = true;
  }
} catch {}

export {};