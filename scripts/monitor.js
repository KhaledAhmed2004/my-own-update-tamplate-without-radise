/*
 * Professional Terminal Monitoring UI (Node.js)
 * - blessed-contrib for layout (charts, tables, log panel, gauges)
 * - chalk for colors, ora for loading spinners
 * - Polls Express API for logs and metrics; falls back to demo data when offline
 * - Keyboard shortcuts: q to quit, r to refresh
 */

const axios = require('axios');
const os = require('os');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;
const oraModule = require('ora');
const ora = oraModule.default || oraModule;

// Centralized configuration
const { API_BASE, LOGS_URL, METRICS_URL, POLL_MS } = require('./monitor.config');
const { shouldHideEntry } = require('./monitor.utils');

// Spinner before the UI comes up
const spinner = ora(chalk.cyan('Connecting to API...')).start();

// Create screen and grid
const screen = blessed.screen({ smartCSR: true, title: 'Real-time API Monitor' });
const grid = new contrib.grid({ rows: 12, cols: 12, screen });

// Layout widgets
const topBar = grid.set(0, 0, 2, 12, blessed.box, {
  tags: true,
  label: 'Status',
  style: { fg: 'white', border: { fg: 'cyan' } },
});

const cpuGauge = grid.set(2, 0, 4, 6, contrib.gauge, { label: 'CPU %', stroke: 'green' });
const memGauge = grid.set(6, 0, 3, 6, contrib.gauge, { label: 'Memory %', stroke: 'yellow' });
const uptimeBox = grid.set(9, 0, 3, 6, blessed.box, {
  label: 'Uptime',
  tags: true,
  style: { fg: 'white', border: { fg: 'cyan' } },
});

const logsPanel = grid.set(2, 6, 8, 6, contrib.log, {
  label: 'Log Stream',
  fg: 'white',
  selectedFg: 'white',
  scrollable: true,
});

const bottomStatus = grid.set(10, 6, 2, 6, blessed.box, {
  label: 'Refresh',
  tags: true,
  style: { fg: 'white', border: { fg: 'cyan' } },
});

const statusDonut = grid.set(2, 0, 4, 6, contrib.donut, {
  label: 'Status Classes', color: 'cyan', radius: 16, arcWidth: 4, remainColor: 'grey', hidden: true,
});

// Keyboard shortcuts
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
screen.key(['r'], () => {
  manualRefresh();
});

// Internal state
let lastLogTs = 0; // timestamp of last log shown
let connected = false;
let cpuSamplePrev = { cpu: process.cpuUsage(), time: process.hrtime.bigint() };
let headerPrinted = false; // ensure table header prints once

// Utility: format duration
function formatDuration(sec) {
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor((sec / 3600) % 24);
  const d = Math.floor(sec / 86400);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// Utility: compute CPU percent using cpuUsage delta
function computeCpuPercent() {
  const nowCpu = process.cpuUsage();
  const nowTime = process.hrtime.bigint();
  const deltaUser = nowCpu.user - cpuSamplePrev.cpu.user; // microseconds
  const deltaSys = nowCpu.system - cpuSamplePrev.cpu.system; // microseconds
  const deltaTimeUs = Number((nowTime - cpuSamplePrev.time) / 1000n); // microseconds
  cpuSamplePrev = { cpu: nowCpu, time: nowTime };
  const cores = os.cpus().length || 1;
  const totalCpuUs = deltaUser + deltaSys;
  const percent = Math.min(100, Math.max(0, (totalCpuUs / (deltaTimeUs * cores)) * 100));
  return percent || 0;
}

// Helper: update top bar status and title
function updateTopBar() {
  const statusColor = connected ? 'green' : 'red';
  const statusText = connected ? 'CONNECTED' : 'OFFLINE';
  topBar.setContent(`{bold}Real-time API Monitor{/bold}\nStatus: {${statusColor}-fg}${statusText}{/${statusColor}-fg}  |  Logs: ${LOGS_URL}  |  Metrics: ${METRICS_URL || 'local'}`);
}

// Helper: update metrics gauges and uptime
function updateMetricsUI(metrics) {
  const cpu = Math.round(metrics.cpuPercent || 0);
  const mem = Math.round(metrics.memPercent || 0);
  cpuGauge.setData([cpu]);
  memGauge.setData([mem]);
  uptimeBox.setContent(`Uptime: ${formatDuration(metrics.uptimeSec || 0)}\nMem Used: ${(metrics.memPercent || 0).toFixed(1)}%\nCPU: ${(metrics.cpuPercent || 0).toFixed(1)}%`);
}

// Helper: update status donut
function updateStatusDonut(totals) {
  if (!totals) return;
  const sum = (totals.statusClasses['2xx'] || 0) + (totals.statusClasses['3xx'] || 0) + (totals.statusClasses['4xx'] || 0) + (totals.statusClasses['5xx'] || 0);
  const pct = v => (sum ? Math.round((v / sum) * 100) : 0);
  const data = [
    { label: '2xx', percent: pct(totals.statusClasses['2xx'] || 0), color: 'green' },
    { label: '3xx', percent: pct(totals.statusClasses['3xx'] || 0), color: 'yellow' },
    { label: '4xx', percent: pct(totals.statusClasses['4xx'] || 0), color: 'red' },
    { label: '5xx', percent: pct(totals.statusClasses['5xx'] || 0), color: 'red' },
  ];
  statusDonut.setData(data);
}

// Helper: format log line summary
function padRight(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(0, width) : s + ' '.repeat(width - s.length);
}

function padLeft(str, width) {
  const s = String(str);
  return s.length >= width ? s.slice(-width) : ' '.repeat(width - s.length) + s;
}

function formatTimeHMS(ts) {
  const d = new Date(ts || Date.now());
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function colorMethod(method) {
  switch (method) {
    case 'GET':
      return chalk.green(method);
    case 'POST':
      return chalk.blue(method);
    case 'PUT':
      return chalk.yellow(method);
    case 'PATCH':
      return chalk.magenta(method);
    case 'DELETE':
      return chalk.red(method);
    default:
      return chalk.white(method || '-');
  }
}

function colorStatus(status) {
  if (status >= 500) return chalk.bgRed.white(` ${status} `);
  if (status >= 400) return chalk.red(status);
  if (status >= 300) return chalk.yellow(status);
  return chalk.green(status);
}

function colorDuration(ms) {
  if (ms >= 1000) return chalk.red(`${ms}ms`);
  if (ms >= 300) return chalk.yellow(`${ms}ms`);
  return chalk.gray(`${ms}ms`);
}

function formatLogRow(entry) {
  const timeCol = padRight(formatTimeHMS(entry.time), 10);
  const methodCol = padRight(colorMethod(entry.method || '-'), 8);
  const endpointCol = padRight(chalk.cyan(entry.url || '-'), 32);
  const statusColRaw = entry.status ?? '-';
  const statusCol = padRight(colorStatus(statusColRaw), 7);
  const durationCol = padLeft(colorDuration(entry.ms || 0), 8);
  const row = `${chalk.white(timeCol)} ${methodCol} ${endpointCol} ${statusCol} ${durationCol}`;
  return row;
}

// Helper: compute top endpoints (not shown in layout, but useful for extensions)
function computeTopEndpoints(logs) {
  const counts = {};
  for (const l of logs) {
    const key = `${l.method || ''} ${l.url || ''}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

// Fetch logs from API, or generate demo logs on error
async function fetchLogs() {
  try {
    const resp = await axios.get(LOGS_URL);
    const { logs, totals } = resp.data.data || { logs: [], totals: { statusClasses: { '2xx':0,'3xx':0,'4xx':0,'5xx':0 } } };
    connected = true;
    return { logs, totals };
  } catch (err) {
    connected = false;
    const totals = { total: 0, info: 0, error: 0, statusClasses: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } };
    return { logs: [], totals };
  }
}

// Fetch metrics from API, or compute local metrics on error
async function fetchMetrics() {
  // Local fallback metrics
  const fallback = () => ({
    cpuPercent: computeCpuPercent(),
    memPercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
    uptimeSec: process.uptime(),
  });

  if (!METRICS_URL) return fallback();
  try {
    const resp = await axios.get(METRICS_URL);
    const m = resp.data && resp.data.data ? resp.data.data : resp.data;
    if (m && typeof m.cpuPercent === 'number' && typeof m.memPercent === 'number') {
      connected = true;
      return m;
    }
    connected = true; // API reached, but not structured
    return fallback();
  } catch {
    connected = false;
    return fallback();
  }
}

// Render loop
async function renderLoop() {
  updateTopBar();
  bottomStatus.setContent('{cyan-fg}Fetching latest logs...{/cyan-fg}');
  const [metrics, { logs, totals }] = await Promise.all([fetchMetrics(), fetchLogs()]);

  updateMetricsUI(metrics);
  updateStatusDonut(totals);

  // Append only new logs
  const recent = logs
    .filter(l => (l.time || 0) > lastLogTs)
    .filter(l => !shouldHideEntry(l))
    .slice(-100);
  if (recent.length) lastLogTs = recent[recent.length - 1].time || Date.now();
  // Print table header once
  if (!headerPrinted) {
    const header = `${padRight('Time', 10)} ${padRight('Method', 8)} ${padRight('Endpoint', 32)} ${padRight('Status', 7)} ${padRight('Duration', 8)}`;
    logsPanel.log(chalk.bold(header));
    headerPrinted = true;
  }

  for (const l of recent) logsPanel.log(formatLogRow(l));

  updateTopBar();
  screen.render();
  spinner.stop();
}

async function manualRefresh() {
  bottomStatus.setContent('{yellow-fg}Manual refresh triggered...{/yellow-fg}');
  await renderLoop();
  bottomStatus.setContent('{green-fg}Last refresh complete{/green-fg}');
}

// Initial draw and schedule polling
renderLoop();
if (POLL_MS > 0) {
  setInterval(renderLoop, POLL_MS);
  bottomStatus.setContent(`{cyan-fg}Auto-refresh every ${POLL_MS}ms{/cyan-fg}`);
} else {
  bottomStatus.setContent('{yellow-fg}Auto-refresh disabled. Press r to refresh manually.{/yellow-fg}');
}

// Help note
logsPanel.log(chalk.gray('Press q to quit. Press r to refresh.'));
logsPanel.log(chalk.gray('Set MONITOR_API_BASE_URL or MONITOR_LOGS_URL / MONITOR_METRICS_URL.'));
screen.render();