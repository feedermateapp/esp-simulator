/**
 * ESP32 Simulator Structured Logger Subsystem
 * Provides categorized, multi-level, high-precision timestamped logging.
 */

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  id: string;
  timestamp: number;
  microTime: number; // microseconds relative to app start
  level: LogLevel;
  tag: string;       // e.g. 'GPIO', 'I2C', 'ROTARY', 'BMP280', 'OLED', 'ENGINE', 'VM', 'PROJECT'
  message: string;
  data?: any;
}

export type LogListener = (entry: LogEntry) => void;

class Logger {
  private startTime: number = performance.now();
  private maxHistory: number = 2000;
  private logBuffer: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private minLevel: LogLevel = 'DEBUG';

  private levelWeights: Record<LogLevel, number> = {
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4
  };

  public setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getHistory(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clear() {
    this.logBuffer = [];
  }

  private log(level: LogLevel, tag: string, message: string, data?: any) {
    if (this.levelWeights[level] < this.levelWeights[this.minLevel]) {
      return;
    }

    const now = performance.now();
    const entry: LogEntry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      microTime: Math.round((now - this.startTime) * 1000),
      level,
      tag: tag.toUpperCase(),
      message,
      data
    };

    // Keep ring buffer size bounded
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxHistory) {
      this.logBuffer.shift();
    }

    // Console output styling
    const timeStr = `+${(entry.microTime / 1000).toFixed(2)}ms`;
    const tagStr = `[${entry.tag}]`;

    if (level === 'ERROR') {
      console.error(`%c${timeStr} %c${tagStr} %c${message}`, 'color: #94a3b8', 'color: #f43f5e; font-weight: bold', 'color: #fda4af', data || '');
    } else if (level === 'WARN') {
      console.warn(`%c${timeStr} %c${tagStr} %c${message}`, 'color: #94a3b8', 'color: #fbbf24; font-weight: bold', 'color: #fef08a', data || '');
    } else if (level === 'INFO') {
      console.info(`%c${timeStr} %c${tagStr} %c${message}`, 'color: #94a3b8', 'color: #38bdf8; font-weight: bold', 'color: #e2e8f0', data || '');
    } else {
      console.debug(`%c${timeStr} %c${tagStr} %c${message}`, 'color: #64748b', 'color: #10b981; font-weight: bold', 'color: #cbd5e1', data || '');
    }

    // Notify UI / Stream listeners
    this.listeners.forEach(listener => listener(entry));
  }

  public trace(tag: string, message: string, data?: any) {
    this.log('TRACE', tag, message, data);
  }

  public debug(tag: string, message: string, data?: any) {
    this.log('DEBUG', tag, message, data);
  }

  public info(tag: string, message: string, data?: any) {
    this.log('INFO', tag, message, data);
  }

  public warn(tag: string, message: string, data?: any) {
    this.log('WARN', tag, message, data);
  }

  public error(tag: string, message: string, data?: any) {
    this.log('ERROR', tag, message, data);
  }

  public exportAsJson(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

export const logger = new Logger();
