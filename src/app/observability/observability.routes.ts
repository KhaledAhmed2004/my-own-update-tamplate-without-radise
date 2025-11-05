import express from 'express';
import LogBuffer from './logBuffer';
import { filterLogsForApi } from './filters';

export const ObservabilityRoutes = express.Router();

ObservabilityRoutes.get('/logs', (req, res) => {
  const limit = Math.max(1, Math.min(1000, Number(req.query.limit) || 100));
  const levelParam = String(req.query.level || 'all');
  const level = levelParam === 'info' || levelParam === 'error' ? levelParam : 'all';

  // Read recent logs and exclude observability/self traffic to avoid feedback loops
  const logs = filterLogsForApi(
    LogBuffer.getInstance().getRecent(limit, level as any)
  );

  const totals = logs.reduce(
    (acc, l) => {
      acc.total += 1;
      acc[l.level] += 1;
      if (typeof l.status === 'number') {
        const s = l.status;
        if (s >= 500) acc.statusClasses['5xx'] += 1;
        else if (s >= 400) acc.statusClasses['4xx'] += 1;
        else if (s >= 300) acc.statusClasses['3xx'] += 1;
        else acc.statusClasses['2xx'] += 1;
      }
      return acc;
    },
    { total: 0, info: 0, error: 0, statusClasses: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 } }
  );

  res.json({ success: true, data: { logs, totals, latestAt: logs.length ? logs[logs.length - 1].time : null } });
});