// Client-safe logger that only uses console logging
// This avoids Node.js modules like 'fs' that aren't available in the browser

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

class ClientLogger {
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };
  }

  public log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    const entry = this.createLogEntry(level, message, metadata);
    const consoleMessage = `[${entry.timestamp}] ${level}: ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(consoleMessage, metadata);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, metadata);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage, metadata);
        break;
      case LogLevel.DEBUG:
        console.debug(consoleMessage, metadata);
        break;
    }
  }

  public error(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  public debug(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }
}

// Export singleton logger instance for client-side use
export const clientLogger = new ClientLogger();