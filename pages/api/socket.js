import { Server } from 'socket.io'

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    })
    
    io.on('connection', socket => {
      console.log('✅ Client connected:', socket.id)
      
      socket.on('join-user-room', (userId) => {
        const roomName = `user_${userId}`
        socket.join(roomName)
        console.log(`👤 User ${socket.id} joined room: ${roomName}`)
        socket.emit('joined-room', roomName)
      })
      
      socket.on('disconnect', (reason) => {
        console.log('❌ Client disconnected:', socket.id, 'Reason:', reason)
      })
    })
    
    res.socket.server.io = io
    global.io = io
  }
  res.end()
}

export default SocketHandler