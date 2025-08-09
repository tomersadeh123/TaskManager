import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import { logger } from './logger';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

let io: SocketIOServer;

export const getIo = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

export const initSocket = (server: NetServer): SocketIOServer => {
  if (!io) {
    logger.info('🔌 Initializing Socket.IO server...');

    io = new SocketIOServer(server, {
      path: '/api/socket.io',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? [process.env.APP_URL || 'https://your-app.onrender.com']
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    io.on('connection', (socket) => {
      logger.info(`✅ Client connected: ${socket.id}`);

      // Handle user joining their personal notification room
      socket.on('join-user-room', (userId: string) => {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        logger.info(`👤 User ${socket.id} joined room: ${roomName}`);
        socket.emit('joined-room', roomName);
      });

      // Handle user leaving their room
      socket.on('leave-user-room', (userId: string) => {
        const roomName = `user_${userId}`;
        socket.leave(roomName);
        logger.info(`👋 User ${socket.id} left room: ${roomName}`);
      });

      // Handle legacy join/leave events for compatibility
      socket.on('join', (room: string) => {
        socket.join(room);
        logger.info(`User ${socket.id} joined room: ${room}`);
      });

      socket.on('leave', (room: string) => {
        socket.leave(room);
        logger.info(`User ${socket.id} left room: ${room}`);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Client disconnected: ${socket.id}, Reason: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error('🚨 Socket error:', error);
      });
    });

    logger.info('✅ Socket.IO server initialized successfully');
  }

  return io;
};

// Helper function to emit notifications to specific users
export const emitToUser = (userId: string, event: string, data: unknown) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data);
    logger.info(`📤 Emitted '${event}' to user_${userId}`);
  } else {
    logger.warn('⚠️  Socket.IO not initialized, cannot emit to user');
  }
};

// Helper function to broadcast to all connected clients
export const broadcastToAll = (event: string, data: unknown) => {
  if (io) {
    io.emit(event, data);
    logger.info(`📢 Broadcasted '${event}' to all clients`);
  } else {
    logger.warn('⚠️  Socket.IO not initialized, cannot broadcast');
  }
};

// Check if Socket.IO is initialized
export const isSocketInitialized = (): boolean => {
  return io !== null;
};