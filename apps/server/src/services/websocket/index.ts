import { Socket, Server as SocketIOServer } from 'socket.io';
import { logger } from '../../utils/logger.js';

let io: SocketIOServer | null = null;

export function initializeWebSocket(socketIO: SocketIOServer) {
  io = socketIO;

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join venue room
    socket.on('join:venue', (venueId: string) => {
      socket.join(`venue:${venueId}`);
      logger.debug(`Socket ${socket.id} joined venue:${venueId}`);
    });

    // Join floor room
    socket.on('join:floor', (floorId: string) => {
      socket.join(`floor:${floorId}`);
      logger.debug(`Socket ${socket.id} joined floor:${floorId}`);
    });

    // Leave rooms
    socket.on('leave:venue', (venueId: string) => {
      socket.leave(`venue:${venueId}`);
    });

    socket.on('leave:floor', (floorId: string) => {
      socket.leave(`floor:${floorId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket server initialized');
}

// Emit to specific venue
export function emitToVenue(venueId: string, event: string, data: unknown) {
  if (io) {
    io.to(`venue:${venueId}`).emit(event, data);
  }
}

// Emit to specific floor
export function emitToFloor(floorId: string, event: string, data: unknown) {
  if (io) {
    io.to(`floor:${floorId}`).emit(event, data);
  }
}

// Broadcast to all clients
export function broadcast(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}

export function getIO(): SocketIOServer | null {
  return io;
}
