import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// Log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

class Logger {
  private logsDir: string;
  private appLogFile: string;
  private errorLogFile: string;
  private accessLogFile: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.appLogFile = path.join(this.logsDir, 'app.log');
    this.errorLogFile = path.join(this.logsDir, 'error.log');
    this.accessLogFile = path.join(this.logsDir, 'access.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private writeToFile(filePath: string, entry: LogEntry) {
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      fs.appendFileSync(filePath, logLine);
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
      console.log(logLine);
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Partial<LogEntry>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };
  }

  public log(level: LogLevel, message: string, metadata?: Partial<LogEntry>) {
    const entry = this.createLogEntry(level, message, metadata);
    
    // Always write to main app log
    this.writeToFile(this.appLogFile, entry);
    
    // Write errors to separate error log
    if (level === LogLevel.ERROR) {
      this.writeToFile(this.errorLogFile, entry);
    }
    
    // Also output to console in development
    if (process.env.NODE_ENV === 'development') {
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
  }

  public error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    const errorMetadata = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : {};

    this.log(LogLevel.ERROR, message, {
      ...errorMetadata,
      metadata
    });
  }

  public warn(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, { metadata });
  }

  public info(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, { metadata });
  }

  public debug(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, { metadata });
  }

  public logRequest(
    request: NextRequest,
    requestId: string,
    body?: Record<string, unknown>
  ) {
    const entry = this.createLogEntry(LogLevel.INFO, 'HTTP Request', {
      requestId,
      method: request.method,
      url: request.nextUrl.pathname,
      metadata: {
        headers: Object.fromEntries(request.headers.entries()),
        query: Object.fromEntries(request.nextUrl.searchParams.entries()),
        body: body || null,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      }
    });

    this.writeToFile(this.accessLogFile, entry);
    this.writeToFile(this.appLogFile, entry);
  }

  public logResponse(
    requestId: string,
    statusCode: number,
    duration: number,
    userId?: string,
    metadata?: Record<string, unknown>
  ) {
    const entry = this.createLogEntry(LogLevel.INFO, 'HTTP Response', {
      requestId,
      statusCode,
      duration,
      userId,
      metadata
    });

    this.writeToFile(this.accessLogFile, entry);
    this.writeToFile(this.appLogFile, entry);
  }

  public logAuth(
    event: string,
    userId?: string,
    success: boolean = true,
    metadata?: Record<string, unknown>
  ) {
    this.log(
      success ? LogLevel.INFO : LogLevel.WARN,
      `Authentication: ${event}`,
      {
        userId,
        metadata: {
          success,
          ...metadata
        }
      }
    );
  }

  public logDatabase(
    operation: string,
    collection: string,
    duration?: number,
    error?: Error,
    metadata?: Record<string, unknown>
  ) {
    const message = `Database ${operation} on ${collection}`;
    
    if (error) {
      this.error(message, error, { collection, operation, duration, ...metadata });
    } else {
      this.info(message, { collection, operation, duration, ...metadata });
    }
  }

  public logBusinessEvent(
    event: string,
    userId: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) {
    this.info(`Business Event: ${event}`, {
      userId,
      metadata: {
        entityType,
        entityId,
        ...metadata
      }
    });
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Legacy compatibility - simple request logging
export async function logRequest(request: NextRequest, body?: Record<string, unknown>) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logger.logRequest(request, requestId, body);
  return requestId;
}

// Enhanced wrapper for API route handlers with comprehensive logging
export function withLogging(
  handler: (
    request: NextRequest, 
    context?: { params: Record<string, string> | Promise<Record<string, string>> }
  ) => Promise<Response>
) {
  return async (request: NextRequest, context?: { params: Record<string, string> | Promise<Record<string, string>> }) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    let body;
    let userId;
    
    // Parse body for POST/PUT requests
    if (request.method === 'POST' || request.method === 'PUT') {
      try {
        body = await request.clone().json();
      } catch {
        // Body might not be JSON or empty
      }
    }

    // Extract user ID from auth header
    try {
      const token = request.headers.get('authorization')?.split(' ')[1];
      if (token) {
        const { verifyToken } = await import('../utils/jwt');
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.id;
        }
      }
    } catch {
      // Token verification failed or not present
    }

    // Log incoming request
    logger.logRequest(request, requestId, body);

    try {
      // Execute the handler
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      
      // Log successful response
      logger.logResponse(
        requestId,
        response.status,
        duration,
        userId,
        {
          params: context?.params
        }
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error response
      logger.error(
        `API Error in ${request.method} ${request.nextUrl.pathname}`,
        error as Error,
        {
          requestId,
          userId,
          duration,
          params: context?.params
        }
      );

      // Re-throw the error to maintain API behavior
      throw error;
    }
  };
}