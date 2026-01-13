import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import routes from './routes/index.js';
import { initializeMQTT } from './services/mqtt/index.js';
import { initializeRedis } from './services/redis/index.js';
import { initializeWebSocket } from './services/websocket/index.js';
import { logger } from './utils/logger.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// API Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services and start server
async function bootstrap() {
  try {
    // Initialize Redis
    await initializeRedis();
    logger.info('✅ Redis connected');

    // Initialize MQTT
    await initializeMQTT();
    logger.info('✅ MQTT connected');

    // Initialize WebSocket
    initializeWebSocket(io);
    logger.info('✅ WebSocket initialized');

    // Start server
    httpServer.listen(config.port, config.host, () => {
      logger.info(`🚀 Server running at http://${config.host}:${config.port}`);
      logger.info(`📡 WebSocket ready`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

bootstrap();

export { app, io };
