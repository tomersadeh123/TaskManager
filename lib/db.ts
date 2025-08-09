import mongoose from 'mongoose';
import { logger } from './logger';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI && process.env.NODE_ENV !== 'production') {
  throw new Error('Please define the MONGO_URI environment variable');
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached = (global as typeof globalThis & { mongoose?: CachedConnection }).mongoose;

if (!cached) {
  cached = (global as typeof globalThis & { mongoose: CachedConnection }).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const startTime = Date.now();
  
  if (!MONGODB_URI) {
    const error = new Error('Please define the MONGO_URI environment variable');
    logger.error('MongoDB URI not configured', error);
    throw error;
  }

  const connectionState = mongoose.connection.readyState;
  
  // For now, let's check if the connection is actually alive
  if (cached!.conn && mongoose.connection.readyState === 1) {
    // Only log meaningful cached connection usage (when connection was previously lost)
    return cached!.conn;
  }

  // Reset if connection is not alive
  if (mongoose.connection.readyState !== 1) {
    const stateMapping: Record<number, string> = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    logger.info('MongoDB connection lost - creating new connection', { 
      connectionState,
      stateDescription: stateMapping[connectionState] || 'unknown'
    });
    cached!.conn = null;
    cached!.promise = null;
  }

  if (!cached!.promise) {
    
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      const duration = Date.now() - startTime;
      logger.info('MongoDB connection established', { 
        duration: `${duration}ms`,
        host: mongoose.connection.host,
        database: mongoose.connection.name,
        poolSize: opts.maxPoolSize
      });
      
      // Add connection event listeners (only once)
      if (!mongoose.connection.listeners('error').length) {
        mongoose.connection.on('error', (err) => {
          logger.error('MongoDB connection error', err);
        });
        
        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB connection lost - clearing cache', { 
            host: mongoose.connection.host,
            database: mongoose.connection.name
          });
          cached!.conn = null;
          cached!.promise = null;
        });
        
        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected successfully', {
            host: mongoose.connection.host,
            database: mongoose.connection.name
          });
        });
      }
      
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database connection failed', error as Error, { 
      duration,
      uri: MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
    });
    cached!.promise = null;
    cached!.conn = null;
    throw error;
  }

  return cached!.conn;
}

export default connectDB;