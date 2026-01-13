import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import authRoutes from './auth.js';
import customDataRoutes from './customData.js';
import customTablesRoutes from './customTables.js';
import reportsRoutes from './reports.js';
import uploadRoutes from './upload.js';

const router = Router();

// Public routes
router.get('/', (_req, res) => {
  res.json({
    name: 'Indoor Map Platform API',
    version: '0.1.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me (protected)',
        changePassword: 'POST /api/auth/change-password (protected)',
      },
      upload: {
        uploadFile: 'POST /api/upload/file (protected)',
        uploadFiles: 'POST /api/upload/files (protected)',
        status: 'GET /api/upload/status/:jobId (protected)',
        preview: 'GET /api/upload/preview/:jobId (protected)',
        image: 'GET /api/upload/image/:jobId (protected)',
      },
      customTables: {
        listTables: 'GET /api/custom-tables (protected)',
        getTable: 'GET /api/custom-tables/:id (protected)',
        createTable: 'POST /api/custom-tables (protected)',
        deleteTable: 'DELETE /api/custom-tables/:id (protected)',
        addField: 'POST /api/custom-tables/:id/fields (protected)',
      },
      customData: {
        queryData: 'GET /api/custom-data/:tableName (protected)',
        getData: 'GET /api/custom-data/:tableName/:id (protected)',
        getHistory: 'GET /api/custom-data/:tableName/:id/history (protected)',
        getStats: 'GET /api/custom-data/:tableName/stats (protected)',
        insertData: 'POST /api/custom-data/:tableName (protected)',
        updateData: 'PUT /api/custom-data/:tableName/:id (protected)',
        deleteData: 'DELETE /api/custom-data/:tableName/:id (protected)',
      },
      reports: {
        listTemplates: 'GET /api/reports (protected)',
        createTemplate: 'POST /api/reports (protected)',
        getTemplate: 'GET /api/reports/:id (protected)',
        updateTemplate: 'PUT /api/reports/:id (protected)',
        deleteTemplate: 'DELETE /api/reports/:id (protected)',
        addWidget: 'POST /api/reports/:id/widgets (protected)',
        previewWidget: 'POST /api/reports/:id/widgets/:widgetId/preview (protected)',
        generateReport: 'POST /api/reports/:id/generate (protected)',
        listGenerated: 'GET /api/reports/:id/generated (protected)',
        createSchedule: 'POST /api/reports/:id/schedules (protected)',
      },
      protected: {
        venues: 'GET /api/venues (protected)',
        floors: 'GET /api/floors (protected)',
        sensors: 'GET /api/sensors (protected)',
        zones: 'GET /api/zones (protected)',
        alerts: 'GET /api/alerts (protected)',
      },
    },
  });
});

// Auth routes (public)
router.use('/auth', authRoutes);

// Protected routes - all routes below require authentication
router.use(authMiddleware);

// Upload routes (protected)
router.use('/upload', uploadRoutes);

// Custom table routes (protected)
router.use('/custom-tables', customTablesRoutes);
router.use('/custom-data', customDataRoutes);

// Report builder routes (protected)
router.use('/reports', reportsRoutes);

// Placeholder protected routes
router.get('/venues', (_req, res) => {
  res.json({ success: true, data: { venues: [], message: 'Venues API coming soon' } });
});

router.get('/floors', (_req, res) => {
  res.json({ success: true, data: { floors: [], message: 'Floors API coming soon' } });
});

router.get('/sensors', (_req, res) => {
  res.json({ success: true, data: { sensors: [], message: 'Sensors API coming soon' } });
});

router.get('/zones', (_req, res) => {
  res.json({ success: true, data: { zones: [], message: 'Zones API coming soon' } });
});

router.get('/alerts', (_req, res) => {
  res.json({ success: true, data: { alerts: [], message: 'Alerts API coming soon' } });
});

export default router;
