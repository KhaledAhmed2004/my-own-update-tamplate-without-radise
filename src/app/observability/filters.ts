export interface LogEntry {
  time?: number;
  level?: 'info' | 'error' | string;
  status?: number;
  method?: string;
  url?: string;
  ip?: string;
  ms?: number;
  isWebhook?: boolean;
  message?: string;
}

export const shouldHideObservability = (entry: Partial<LogEntry>): boolean => {
  const url = String(entry?.url || '');
  return url.includes('/observability');
};

export const filterLogsForApi = (logs: LogEntry[]): LogEntry[] => {
  return (logs || []).filter(l => !shouldHideObservability(l));
};