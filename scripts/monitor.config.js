// Centralized monitor configuration
// Reads environment variables and provides sane defaults

const API_BASE = process.env.MONITOR_API_BASE_URL || 'http://127.0.0.1:5001/api/v1/observability';
const LOGS_URL = process.env.MONITOR_LOGS_URL || `${API_BASE}/logs?limit=200`;
const METRICS_URL = process.env.MONITOR_METRICS_URL || (process.env.MONITOR_API_BASE_URL ? `${process.env.MONITOR_API_BASE_URL}/api/metrics` : '');
// Poll interval: set to 0 to disable polling by default
const POLL_MS = Number(process.env.MONITOR_POLL_MS ?? 0);

module.exports = {
  API_BASE,
  LOGS_URL,
  METRICS_URL,
  POLL_MS,
};