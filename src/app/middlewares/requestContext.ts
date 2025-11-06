import type { NextFunction, Request, Response } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

type DbQueryRecord = {
  model?: string;
  operation?: string;
  durationMs: number;
  cacheHit: boolean;
};

type ContextStore = {
  labels: {
    controllerLabel?: string;
    serviceLabel?: string;
  };
  metrics: {
    db: { hits: number; durations: number[]; queries: DbQueryRecord[] };
    cache: { hits: number; misses: number; hitDurations: number[]; missDurations: number[] };
    external: { count: number; durations: number[] };
  };
};

const storage = new AsyncLocalStorage<ContextStore>();

// Initialize per-request context
export const requestContextInit = (req: Request, _res: Response, next: NextFunction) => {
  storage.run(
    {
      labels: {},
      metrics: {
        db: { hits: 0, durations: [], queries: [] },
        cache: { hits: 0, misses: 0, hitDurations: [], missDurations: [] },
        external: { count: 0, durations: [] },
      },
    },
    () => next()
  );
};

export const setControllerLabel = (label: string) => {
  const store = storage.getStore();
  if (!store) return;
  store.labels.controllerLabel = label;
};

export const setServiceLabel = (label: string) => {
  const store = storage.getStore();
  if (!store) return;
  store.labels.serviceLabel = label;
};

export const getLabels = () => storage.getStore()?.labels || {};

// ===== Metrics helpers =====
export const recordDbQuery = (
  durationMs: number,
  meta?: { model?: string; operation?: string; cacheHit?: boolean }
) => {
  const store = storage.getStore();
  if (!store) return;
  store.metrics.db.hits += 1;
  store.metrics.db.durations.push(durationMs);
  store.metrics.db.queries.push({
    model: meta?.model,
    operation: meta?.operation,
    durationMs,
    cacheHit: Boolean(meta?.cacheHit),
  });
};

export const recordCacheHit = (durationMs: number) => {
  const store = storage.getStore();
  if (!store) return;
  store.metrics.cache.hits += 1;
  store.metrics.cache.hitDurations.push(durationMs);
};

export const recordCacheMiss = (durationMs: number) => {
  const store = storage.getStore();
  if (!store) return;
  store.metrics.cache.misses += 1;
  store.metrics.cache.missDurations.push(durationMs);
};

export const recordExternalCall = (durationMs: number) => {
  const store = storage.getStore();
  if (!store) return;
  store.metrics.external.count += 1;
  store.metrics.external.durations.push(durationMs);
};

export const getMetrics = () => storage.getStore()?.metrics;

// Helper to convert a base path segment like "auth" -> "AuthController"
// Known base path -> Controller name mapping (handles plural/singular)
const BASE_TO_CONTROLLER: Record<string, string> = {
  auth: 'AuthController',
  user: 'UserController',
  users: 'UserController',
  notification: 'NotificationController',
  notifications: 'NotificationController',
  message: 'MessageController',
  messages: 'MessageController',
  bookmark: 'BookmarkController',
  bookmarks: 'BookmarkController',
  payment: 'PaymentController',
  payments: 'PaymentController',
  chat: 'ChatController',
  chats: 'ChatController',
};

export const controllerNameFromBasePath = (baseUrl: string | undefined) => {
  if (!baseUrl) return undefined;
  const parts = baseUrl.split('/').filter(Boolean);
  const last = (parts[parts.length - 1] || '').toLowerCase();
  if (!last) return undefined;
  const direct = BASE_TO_CONTROLLER[last];
  if (direct) return direct;
  // Fallback: PascalCase + Controller
  const pascal = last
    .split('-')
    .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join('');
  return `${pascal}Controller`;
};