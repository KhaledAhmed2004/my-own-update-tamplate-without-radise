type LogLevel = 'info' | 'error';

export interface ILogEntry {
  time: number;
  level: LogLevel;
  status?: number;
  method?: string;
  url?: string;
  ip?: string;
  ms?: number;
  isWebhook?: boolean;
  message: string; // full formatted text (multi-line)
}

class LogBuffer {
  private static instance: LogBuffer;
  private buffer: ILogEntry[] = [];
  private capacity: number;

  private constructor(capacity = 500) {
    this.capacity = capacity;
  }

  public static getInstance(): LogBuffer {
    if (!LogBuffer.instance) {
      LogBuffer.instance = new LogBuffer();
    }
    return LogBuffer.instance;
  }

  public push(entry: ILogEntry) {
    this.buffer.push(entry);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
  }

  public clear() {
    this.buffer = [];
  }

  public getRecent(limit = 100, level: LogLevel | 'all' = 'all'): ILogEntry[] {
    const items = level === 'all' ? this.buffer : this.buffer.filter(b => b.level === level);
    const start = Math.max(0, items.length - limit);
    return items.slice(start);
  }
}

export default LogBuffer;