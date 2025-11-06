import cors from 'cors';
import YAML from 'yamljs';
// Ensure DB metrics plugin loads BEFORE any models compile
import './app/observability/mongooseMetrics';
import './app/middlewares/autoLabelBootstrap';
import router from './routes';
import { Morgan } from './shared/morgen';
import swaggerUi from 'swagger-ui-express';
import { StatusCodes } from 'http-status-codes';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import { requestContextInit } from './app/middlewares/requestContext';
import { clientInfo } from './app/middlewares/clientInfo';
// import './config/passport';
import { requestLogger } from './app/middlewares/requestLogger';
import path from 'path';
import passport from 'passport';
import { logger, errorLogger } from './shared/logger';
// autoLabelBootstrap moved above router import to ensure controllers are wrapped before route binding

const app = express();

// Morgan logging
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// Client Hints: request OS/device info from browsers without frontend changes
app.use((req, res, next) => {
  // Ask for high-entropy client hints (Chrome/Edge)
  res.setHeader(
    'Accept-CH',
    [
      'Sec-CH-UA',
      'Sec-CH-UA-Platform',
      'Sec-CH-UA-Platform-Version',
      'Sec-CH-UA-Mobile',
      'Sec-CH-UA-Model',
      'Sec-CH-UA-Arch',
      'Sec-CH-UA-Bitness',
    ].join(', ')
  );

  // Vary to keep caches/proxies from mixing responses across devices
  const varyHeaders = [
    'User-Agent',
    'Sec-CH-UA',
    'Sec-CH-UA-Platform',
    'Sec-CH-UA-Platform-Version',
    'Sec-CH-UA-Mobile',
    'Sec-CH-UA-Model',
    'Sec-CH-UA-Arch',
    'Sec-CH-UA-Bitness',
  ].join(', ');
  const existingVary = res.getHeader('Vary');
  res.setHeader('Vary', existingVary ? String(existingVary) + ', ' + varyHeaders : varyHeaders);

  // Encourage first-request delivery (Chrome only)
  res.setHeader(
    'Critical-CH',
    [
      'Sec-CH-UA-Platform',
      'Sec-CH-UA-Platform-Version',
      'Sec-CH-UA-Mobile',
      'Sec-CH-UA-Model',
    ].join(', ')
  );

  next();
});

// CORS setup
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5174',
  'https://task-titans-admin-orcin.vercel.app',
  'http://localhost:5173',
  'http://localhost:5175',
  'https://task-titans-six.vercel.app',
  'https://task-titans-admin.vercel.app',
  'https://tier-elected-proc-cumulative.trycloudflare.com',
  'https://directory-supplements-adapter-designs.trycloudflare.com',
  // Add common development origins
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://localhost:3002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  // Local backend preview ports for static test pages
  'http://localhost:5000',
  'http://localhost:5001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5001',
  'http://10.10.7.33:5001',
  // Dev server alternate ports
  'http://localhost:5003',
  'http://127.0.0.1:5003',
  'http://localhost:5005',
  'http://127.0.0.1:5005',
];

// CORS debug logging (rate-limited) — enable with env CORS_DEBUG=true
const CORS_DEBUG = String(process.env.CORS_DEBUG || '').toLowerCase() === 'true' || process.env.CORS_DEBUG === '1';
const corsLogMap = new Map<string, number>();
const CORS_LOG_WINDOW_MS = 60_000; // log at most once per origin per minute
const maybeLogCors = (origin: string | undefined, allowed: boolean) => {
  if (!CORS_DEBUG) return;
  const key = origin || 'no-origin';
  const now = Date.now();
  const last = corsLogMap.get(key) || 0;
  if (now - last < CORS_LOG_WINDOW_MS) return;
  corsLogMap.set(key, now);
  if (!origin) {
    logger.info('CORS allow: request without Origin header (Postman/mobile/native)');
    return;
  }
  if (allowed) logger.info(`CORS allow: ${origin}`);
  else errorLogger.warn(`CORS block: ${origin}`);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman)
      if (!origin) {
        maybeLogCors(origin, true);
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        maybeLogCors(origin, true);
        callback(null, true);
      } else {
        maybeLogCors(origin, false);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true, // allow cookies/auth headers
  })
);

// Explicitly handle preflight OPTIONS requests
app.options(
  '*',
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
);

// Body parser
// Special handling for webhook routes - they need raw body for signature verification
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// For all other routes, use JSON parsing
app.use((req, res, next) => {
  if (req.path.includes('/webhook')) {
    return next(); // Skip JSON parsing for webhook routes
  }
  express.json()(req, res, next);
});

app.use(express.urlencoded({ extended: true }));

// Cookie parser (for reading refresh tokens from cookies)
app.use(cookieParser());

// Passport
app.use(passport.initialize());

// Request/Response logging
// Initialize request-scoped context BEFORE logging
app.use(requestContextInit);
// Detect device/OS/browser from headers (Client Hints + UA fallback)
app.use(clientInfo);
app.use(requestLogger);

// Static files
app.use(express.static('uploads'));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Swagger
const swaggerDocument = YAML.load(
  path.join(__dirname, '../public/swagger.yaml')
);
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API routes
app.use('/api/v1', router);

// Live response
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Matrix Live Server</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: black;
          font-family: monospace;
        }
        canvas {
          display: block;
        }
        .center-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #00ff00;
        }
        .server-message {
          font-size: 3rem;
          font-weight: bold;
          text-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00, 0 0 40px #00ff00;
          animation: glow 1.5s infinite alternate;
        }
        .date-time {
          margin-top: 15px;
          font-size: 1.2rem;
          text-shadow: 0 0 5px #00ff00, 0 0 15px #00ff00;
          animation: flicker 1.5s infinite;
        }
        @keyframes glow {
          from { text-shadow: 0 0 5px #00ff00, 0 0 10px #00ff00; }
          to { text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00, 0 0 60px #00ff00; }
        }
        @keyframes flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
          20%, 22%, 24%, 55% { opacity: 0.3; }
        }
      </style>
    </head>
    <body>
      <canvas id="matrixCanvas"></canvas>
      <div class="center-container">
        <div class="server-message">✅ Server is Live 🚀</div>
        <div class="date-time" id="dateTime"></div>
      </div>

      <script>
        const canvas = document.getElementById("matrixCanvas");
        const ctx = canvas.getContext("2d");

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
        const fontSize = 18;
        const columns = Math.floor(canvas.width / fontSize);
        const drops = Array(columns).fill(1);

        function draw() {
          ctx.fillStyle = "rgba(0,0,0,0.05)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = "#0F0";
          ctx.font = fontSize + "px monospace";

          for (let i = 0; i < drops.length; i++) {
            const text = letters[Math.floor(Math.random() * letters.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            drops[i]++;
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
              drops[i] = 0;
            }
          }
        }

        setInterval(draw, 33);

        // Live date & time
        function updateDateTime() {
          const now = new Date();
          document.getElementById("dateTime").textContent = now.toLocaleString();
        }
        setInterval(updateDateTime, 1000);
        updateDateTime();

        window.addEventListener("resize", () => {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        });
      </script>
    </body>
    </html>
  `);
});

// Global error handler
app.use(globalErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'Not found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;
