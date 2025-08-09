const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// When using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let io;

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  io = new Server(httpServer, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.APP_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    // Handle user joining their personal notification room
    socket.on('join-user-room', (userId) => {
      const roomName = `user_${userId}`;
      socket.join(roomName);
      console.log(`👤 User ${socket.id} joined room: ${roomName}`);
      socket.emit('joined-room', roomName);
    });

    // Handle user leaving their room
    socket.on('leave-user-room', (userId) => {
      const roomName = `user_${userId}`;
      socket.leave(roomName);
      console.log(`👋 User ${socket.id} left room: ${roomName}`);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  // Make io globally available
  global.io = io;

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log('✅ Socket.IO server initialized');
    });
});

// Export for use in API routes
module.exports = { io };