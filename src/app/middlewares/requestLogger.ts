import type { NextFunction, Request, Response } from 'express';
import colors from 'colors';
import { randomUUID } from 'crypto';
import { logger, errorLogger } from '../../shared/logger';
import { getLabels, controllerNameFromBasePath, getMetrics } from './requestContext';
import config from '../../config';

// 🗓️ Format date
const formatDate = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  const datePart = now.toLocaleString('en-US', options);
  return `${datePart} , ${now.getFullYear()}`;
};

// 🧾 Status text
const statusText = (code: number): string => {
  switch (code) {
    case 200:
      return 'OK';
    case 201:
      return 'Created';
    case 204:
      return 'No Content';
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    default:
      return String(code);
  }
};

// 🌐 Client IP
const getClientIp = (req: Request): string => {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  const ip =
    req.ip ||
    req.socket?.remoteAddress ||
    (req as any).connection?.remoteAddress;
  return ip || 'unknown';
};

// 🔒 Mask sensitive
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'client_secret',
  'secret',
  'api_key',
  'apiKey',
]);
const maskSensitive = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '********' : maskSensitive(v);
    }
    return out;
  }
  return value;
};

// 🧰 Normalize body
const normalizeBody = (req: Request): any => {
  const body: any = (req as any).body;
  if (!body) return {};
  if (Buffer.isBuffer(body)) return { raw: true, length: body.length };
  if (typeof body !== 'object') return { value: String(body) };
  return body;
};

// 🔠 Indent helper
const indentBlock = (text: string, spaces = 5): string => {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => pad + line)
    .join('\n');
};

// 📏 File size converter
const humanFileSize = (size: number): string => {
  if (size < 1024) return size + ' B';
  const i = Math.floor(Math.log(size) / Math.log(1024));
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  return (size / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

// 📝 Extract files
const extractFilesInfo = (req: Request) => {
  const formatFile = (file: any) => ({
    originalname: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: humanFileSize(file.size),
  });

  if (req.file) return formatFile(req.file);
  if (req.files) {
    // Handle both array format (from .any()) and object format (from .fields())
    if (Array.isArray(req.files)) {
      // Group files by fieldname when using .any()
      const grouped: Record<string, any> = {};
      for (const file of (req.files as any[])) {
        const fieldName = (file as any).fieldname;
        if (!grouped[fieldName]) {
          grouped[fieldName] = [];
        }
        grouped[fieldName].push(formatFile(file));
      }
      
      // Convert single-item arrays to single objects for cleaner output
      const out: Record<string, any> = {};
      for (const [fieldName, files] of Object.entries(grouped)) {
        out[fieldName] = (files as any[]).length === 1 ? (files as any[])[0] : files;
      }
      return out;
    } else {
      // Handle object format (from .fields())
      const out: Record<string, any> = {};
      for (const [key, value] of Object.entries(req.files as Record<string, any>)) {
        if (Array.isArray(value)) out[key] = value.map(formatFile);
        else out[key] = formatFile(value);
      }
      return out;
    }
  }
  return undefined;
};

// 🧭 Detect Stripe webhook requests
const WEBHOOK_PATH = '/api/v1/payments/webhook';
const isStripeWebhook = (req: Request): boolean => {
  const pathMatch = req.originalUrl?.includes(WEBHOOK_PATH);
  const sigPresent = Boolean(req.headers['stripe-signature']);
  const ua = String(req.headers['user-agent'] || '');
  const uaStripe = ua.startsWith('Stripe/');
  return Boolean(pathMatch || sigPresent || uaStripe);
};

// 🧾 Build minimal webhook context for global logs (no secrets)
const getWebhookLogContext = (req: Request) => {
  const contentType = String(req.headers['content-type'] || '');
  const ua = String(req.headers['user-agent'] || '');
  const sigHeader = req.headers['stripe-signature'];
  const body: any = (req as any).body;
  const rawLength = Buffer.isBuffer(body)
    ? body.length
    : typeof body === 'string'
      ? Buffer.byteLength(body)
      : undefined;

  return {
    timestamp: new Date().toISOString(),
    headers: {
      'stripe-signature': sigHeader ? 'Present' : 'Missing',
      'content-type': contentType,
      'user-agent': ua,
    },
    bodySize: rawLength,
  };
};

// 🧪 Safely parse Stripe event from raw body without mutating req.body
const parseStripeEventSafe = (req: Request): any | undefined => {
  const body: any = (req as any).body;
  try {
    if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8'));
    if (typeof body === 'string') return JSON.parse(body);
    if (body && typeof body === 'object') return body;
  } catch {
    return undefined;
  }
  return undefined;
};

const getEventSummary = (evt: any) => ({
  type: evt?.type,
  id: evt?.id,
  created:
    typeof evt?.created === 'number'
      ? new Date(evt.created * 1000).toISOString()
      : evt?.created,
  livemode: Boolean(evt?.livemode),
});

const getPaymentIntentLogDetails = (evt: any) => {
  const obj = evt?.data?.object || {};
  const metadata = obj?.metadata && typeof obj.metadata === 'object' ? obj.metadata : undefined;
  return {
    paymentIntentId: obj?.id,
    amount: obj?.amount,
    amount_capturable: obj?.amount_capturable,
    currency: obj?.currency,
    status: obj?.status,
    metadata,
  };
};

// 🎛️ Try to derive an Express handler/controller label
const deriveHandlerLabel = (req: Request, res: Response): string | undefined => {
  const fromLocals = (res.locals as any)?.handlerName;
  if (fromLocals && typeof fromLocals === 'string') return fromLocals;

  // Attempt to infer from Express route stack
  const route: any = (req as any).route;
  if (route?.stack && Array.isArray(route.stack)) {
    const names = route.stack
      .map((layer: any) => (layer && layer.handle && layer.handle.name) || '')
      .filter((n: string) => Boolean(n));
    if (names.length) return names[names.length - 1];
  }

  // Fallback to route path if available
  if (route?.path) return `${req.method} ${route.path}`;
  return undefined;
};

// 🧾 Main Logger
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const requestId = (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) || randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (res.locals as any).requestId = requestId;

  res.on('finish', () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const statusMsg = statusText(status);
    // Silence console logs for observability endpoints to avoid terminal spam
    const isObservabilityRoute = Boolean(req.originalUrl?.includes('/api/v1/observability'));

    const details = {
      params: req.params || {},
      query: req.query || {},
      body: normalizeBody(req),
      files: extractFilesInfo(req),
    };
    const maskedDetails = maskSensitive(details);

    // 🎨 Method color
    const methodColor = (() => {
      switch (req.method) {
        case 'GET':
          return colors.bgGreen.black.bold(` ${req.method} `);
        case 'POST':
          return colors.bgBlue.white.bold(` ${req.method} `);
        case 'PUT':
          return colors.bgYellow.black.bold(` ${req.method} `);
        case 'PATCH':
          return colors.bgMagenta.white.bold(` ${req.method} `);
        case 'DELETE':
          return colors.bgRed.white.bold(` ${req.method} `);
        default:
          return colors.bgWhite.black.bold(` ${req.method} `);
      }
    })();

    const routeColor = colors.cyan.bold(req.originalUrl);
    const ipColor = colors.gray.bold(` ${getClientIp(req)} `);

    // 🎨 Status color
    const statusColor = (() => {
      if (status >= 500) return colors.bgRed.white.bold;
      if (status >= 400) return colors.bgRed.white.bold;
      if (status >= 300) return colors.bgYellow.black.bold;
      return colors.bgGreen.black.bold;
    })();

    // 🎨 Message text color only background
    const messageBg = (() => {
      if (status >= 500) return colors.bgRed.white;
      if (status >= 400) return colors.bgRed.white;
      if (status >= 300) return colors.bgYellow.black;
      return colors.bgGreen.black;
    })();

    const responsePayload = res.locals.responsePayload || {};
    const responseMessage = responsePayload.message || '';
    const responseErrors = responsePayload.errorMessages;

    // 🧑‍💻 Auth context (if available)
    const authCtx = (() => {
      const u: any = (req as any).user;
      if (!u) return undefined;
      return {
        id: u.userId || u.id || u._id,
        email: u.email,
        role: u.role,
      };
    })();

    // 🛰️ Client context
    const ua = String(req.headers['user-agent'] || '');
    const referer = String(req.headers['referer'] || req.headers['referrer'] || '');
    const contentType = String(req.headers['content-type'] || '');
    const handlerLabel = deriveHandlerLabel(req, res);
    // Read dynamic labels from AsyncLocalStorage (if any)
    const ctxLabels = getLabels();
    let controllerLabel: string | undefined = (res.locals as any)?.controllerLabel || ctxLabels.controllerLabel || (res.locals as any)?.handlerName;
    const serviceLabel: string | undefined = (res.locals as any)?.serviceLabel || ctxLabels.serviceLabel || (res.locals as any)?.serviceName;

    // If controller label is missing, derive from base path + handler
    if (!controllerLabel) {
      const baseCtrl = controllerNameFromBasePath(req.baseUrl);
      if (baseCtrl && handlerLabel) {
        controllerLabel = `${baseCtrl}.${handlerLabel}`;
      } else if (baseCtrl) {
        controllerLabel = baseCtrl;
      }
    }

    const lines: string[] = [];
    lines.push(colors.gray.bold(`[${formatDate()}]  🧩 Req-ID: ${requestId}`));
    lines.push(`📥 Request: ${methodColor} ${routeColor} from IP:${ipColor}`);
    lines.push(colors.gray(`     🛰️ Client: ua="${ua}" referer="${referer || 'n/a'}" ct="${contentType || 'n/a'}"`));
    if (controllerLabel || serviceLabel) {
      const parts: string[] = [];
      if (controllerLabel) parts.push(`controller: ${controllerLabel}`);
      if (serviceLabel) parts.push(`service: ${serviceLabel}`);
      lines.push(colors.gray(`     🎛️ Handler: ${parts.join(' ')}`));
    } else if (handlerLabel) {
      lines.push(colors.gray(`     🎛️ Handler: ${handlerLabel}`));
    }
    if (authCtx) {
      lines.push(colors.gray(`     👤 Auth: id="${authCtx.id || 'n/a'}" email="${authCtx.email || 'n/a'}" role="${authCtx.role || 'n/a'}"`));
    }

    // 🔔 Stripe webhook request context (global)
    if (isStripeWebhook(req)) {
      lines.push(colors.yellow('     🔔 Stripe webhook request context:'));
      lines.push(colors.gray(indentBlock(JSON.stringify(getWebhookLogContext(req), null, 2))));

      // ✅ Signature verification status from controller
      const sigVerified = (res.locals as any)?.webhookSignatureVerified;
      const sigError = (res.locals as any)?.webhookSignatureError;
      if (sigVerified === true) {
        lines.push(colors.green('     ✅ Webhook signature verified successfully'));
      } else if (sigVerified === false) {
        lines.push(colors.red(`     ❌ Webhook signature verification failed: ${sigError || 'unknown error'}`));
      }

      // 🔐 Masked webhook secret preview
      const secretPreview = (res.locals as any)?.webhookSecretPreview || (process.env.STRIPE_WEBHOOK_SECRET ? String(process.env.STRIPE_WEBHOOK_SECRET).substring(0, 10) + '...' : undefined);
      if (secretPreview) {
        lines.push(colors.blue(`     🔐 Webhook secret configured: ${secretPreview}`));
      }

      const evt = parseStripeEventSafe(req);
      if (evt && evt.object === 'event' && evt.type) {
        lines.push(colors.yellow('     📨 Received webhook event:'));
        lines.push(colors.gray(indentBlock(JSON.stringify(getEventSummary(evt), null, 2))));

        const type = evt.type as string;
        if (type === 'payment_intent.amount_capturable_updated') {
          lines.push(colors.yellow('     💳 Amount capturable updated:'));
          lines.push(colors.gray(indentBlock(JSON.stringify(getPaymentIntentLogDetails(evt), null, 2))));
        } else if (type === 'payment_intent.succeeded') {
          lines.push(colors.yellow('     💰 Processing payment succeeded:'));
          lines.push(colors.gray(indentBlock(JSON.stringify(getPaymentIntentLogDetails(evt), null, 2))));
        } else if (type === 'payment_intent.payment_failed') {
          lines.push(colors.yellow('     ❌ Payment failed details:'));
          lines.push(colors.gray(indentBlock(JSON.stringify(getPaymentIntentLogDetails(evt), null, 2))));
        }
      }
    }

    if (config.node_env === 'development') {
      lines.push(colors.yellow('     🔎 Request details:'));
      lines.push(
        colors.gray(indentBlock(JSON.stringify(maskedDetails, null, 2)))
      );
    }

    const respLabel = status >= 400 ? '❌ Response sent:' : '📤 Response sent:';
    const respSizeHeader = res.getHeader('Content-Length');
    const respSize = typeof respSizeHeader === 'string' ? respSizeHeader : Array.isArray(respSizeHeader) ? respSizeHeader[0] : (respSizeHeader as any);
    lines.push(`${respLabel} ${statusColor(` ${status} ${statusMsg} `)} ${colors.gray(respSize ? `(size: ${respSize} bytes)` : '')}`);

    // 💬 Message with bg only on message text
    if (responseMessage) {
      lines.push(`💬 Message: ${messageBg(` ${responseMessage} `)}`);
    }

    if (
      responseErrors &&
      Array.isArray(responseErrors) &&
      responseErrors.length
    ) {
      lines.push(colors.red('📌 Details:'));
      lines.push(
        colors.gray(indentBlock(JSON.stringify(responseErrors, null, 2)))
      );
    }

    // 📊 Metrics block (DB, Cache, External) with detailed DB categories
    try {
      const m = getMetrics();
      if (m) {
        const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);
        const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

        const dbHits = m.db.hits;
        const dbAvg = avg(m.db.durations);
        const dbSlow = max(m.db.durations);

        // Build detailed DB metrics output
        lines.push(' ----------------------------------------------------');
        lines.push(colors.bold(' 🧮 DB Metrics'));
        lines.push(colors.gray(`    • Hits            : ${dbHits}${dbHits > 0 ? ' ✅' : ''}`));
        lines.push(colors.gray(`    • Avg Query Time  : ${dbAvg}ms ⏱️`));
        lines.push(colors.gray(`    • Slowest Query   : ${dbSlow}ms ${dbSlow >= 1000 ? '🐌' : dbSlow >= 300 ? '⏱️' : '⚡'}`));

        const queries = (m.db as any).queries || [];
        const byCat = {
          fast: queries.filter((q: any) => q?.durationMs < 300),
          moderate: queries.filter((q: any) => q?.durationMs >= 300 && q?.durationMs < 1000),
          slow: queries.filter((q: any) => q?.durationMs >= 1000),
        };

        lines.push(colors.bold(' Fast Queries ⚡ (< 300ms):'));
        if (!byCat.fast.length) {
          lines.push(colors.gray(' - None'));
        } else {
          byCat.fast.forEach((q: any) => {
            lines.push(
              colors.gray(
                ` - Model: ${q.model || 'n/a'}, Operation: ${q.operation || 'n/a'}, Duration: ${q.durationMs}ms, Cache Hit: ${q.cacheHit ? '✅' : '❌'}`
              )
            );
          });
        }

        lines.push(colors.bold(' Moderate Queries ⏱️ (300–999ms):'));
        if (!byCat.moderate.length) {
          lines.push(colors.gray(' - None'));
        } else {
          byCat.moderate.forEach((q: any) => {
            lines.push(
              colors.gray(
                ` - Model: ${q.model || 'n/a'}, Operation: ${q.operation || 'n/a'}, Duration: ${q.durationMs}ms, Cache Hit: ${q.cacheHit ? '✅' : '❌'}`
              )
            );
          });
        }

        lines.push(colors.bold(' Slow Queries 🐌 (>= 1000ms):'));
        if (!byCat.slow.length) {
          lines.push(colors.gray(' - None'));
        } else {
          byCat.slow.forEach((q: any) => {
            lines.push(
              colors.gray(
                ` - Model: ${q.model || 'n/a'}, Operation: ${q.operation || 'n/a'}, Duration: ${q.durationMs}ms, Cache Hit: ${q.cacheHit ? '✅' : '❌'}`
              )
            );
          });
        }

        const cacheHits = m.cache.hits;
        const cacheMisses = m.cache.misses;
        const cacheTotal = cacheHits + cacheMisses;
        const cacheHitRatio = cacheTotal ? Math.round((cacheHits / cacheTotal) * 100) : 0;

        const extCount = m.external.count;
        const extAvg = avg(m.external.durations);
        const extSlow = max(m.external.durations);

        // Derive total request cost
        let cost: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (dbHits >= 8 || dbAvg >= 120 || dbSlow >= 350 || extAvg >= 400 || extSlow >= 500) cost = 'HIGH';
        else if (dbHits >= 4 || extCount >= 1) cost = 'MEDIUM';

        lines.push(colors.bold(' 🗄️ Cache Metrics'));
        lines.push(colors.gray(`    • Hits            : ${cacheHits}`));
        lines.push(colors.gray(`    • Misses          : ${cacheMisses}`));
        lines.push(colors.gray(`    • Hit Ratio       : ${cacheHitRatio}%`));

        lines.push(colors.bold(' 🌐 External API Calls'));
        lines.push(colors.gray(`    • Count           : ${extCount}`));
        lines.push(colors.gray(`    • Avg Response    : ${extAvg}ms`));
        lines.push(colors.gray(`    • Slowest Call    : ${extSlow}ms`));

        const costColor = cost === 'HIGH' ? colors.bgRed.white.bold : cost === 'MEDIUM' ? colors.bgYellow.black.bold : colors.bgGreen.black.bold;
        lines.push(' ----------------------------------------------------');
        lines.push(`${colors.bold(' 📊 Total Request Cost ')}: ${costColor(` ${cost} `)} ${cost === 'HIGH' ? '⚠️' : cost === 'MEDIUM' ? '⚠️' : '✅'}`);
      }
    } catch {}

    // ⏱️ Duration with thresholds and category label
    const durColor = ms >= 1000 ? colors.bgRed.white.bold : ms >= 300 ? colors.bgYellow.black.bold : colors.bgGreen.black.bold;
    const categoryLabel = ms >= 1000 ? 'Slow: >= 1000ms' : ms >= 300 ? 'Moderate: 300–999ms' : 'Fast: < 300ms';
    lines.push(`${durColor(` ⏱️ Processed in ${ms}ms `)} ${colors.gray(`[ ${categoryLabel} ]`)}`);

    const formatted = lines.join('\n');
    if (!isObservabilityRoute) {
      if (status >= 400) errorLogger.error(formatted);
      else logger.info(formatted);
    }

    // Observability log buffer removed
  });

  next();
};

// (removed) Misplaced Stripe signature log block — now handled inside formatted logger output
