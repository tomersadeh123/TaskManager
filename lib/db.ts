import mongoose from 'mongoose';

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
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGO_URI environment variable');
  }

  // Check connection state
  console.log('MongoDB connection state:', mongoose.connection.readyState);
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  
  // For now, let's check if the connection is actually alive
  if (cached!.conn && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cached!.conn;
  }

  // Reset if connection is not alive
  if (mongoose.connection.readyState !== 1) {
    console.log('Connection not alive, creating new connection...');
    cached!.conn = null;
    cached!.promise = null;
  }

  if (!cached!.promise) {
    console.log('Creating new database connection...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('Database connected successfully');
      
      // Add connection event listeners
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        cached!.conn = null;
        cached!.promise = null;
      });
      
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    console.error('Database connection error:', e);
    cached!.promise = null;
    // Reset the cached connection so it can try again
    cached!.conn = null;
    throw e;
  }

  return cached!.conn;
}

export default connectDB;