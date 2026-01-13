/**
 * Custom Data Routes
 * API endpoints for managing data in custom tables
 */

import { Router } from 'express';
import {
  deleteData,
  getDataById,
  getRecordHistory,
  getTableStats,
  insertData,
  queryData,
  queryDataAsGeoJSON,
  spatialQuery,
  updateData,
} from '../services/customTable/index.js';

const router = Router();

/**
 * GET /api/custom-data/:tableName/stats
 * Get statistics for a custom table
 */
router.get('/:tableName/stats', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const stats = await getTableStats(tableName);

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-data/:tableName
 * Query data from custom table with filters and pagination
 */
router.get('/:tableName', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const { orderBy, orderDir, limit, offset, ...filters } = req.query;

    const result = await queryData(tableName, {
      filters: filters as Record<string, any>,
      orderBy: orderBy as string,
      orderDir: orderDir as 'asc' | 'desc',
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-data/:tableName/:id
 * Get single record by ID
 */
router.get('/:tableName/:id', async (req, res, next) => {
  try {
    const { tableName, id } = req.params;
    const record = await getDataById(tableName, id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-data/:tableName/:id/history
 * Get history for a specific record
 */
router.get('/:tableName/:id/history', async (req, res, next) => {
  try {
    const { tableName, id } = req.params;
    const history = await getRecordHistory(tableName, id);

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/custom-data/:tableName
 * Insert new record
 */
router.post('/:tableName', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    const userId = (req as any).user?.id || 'SYSTEM';

    const record = await insertData(tableName, data, userId);

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/custom-data/:tableName/:id
 * Update record
 */
router.put('/:tableName/:id', async (req, res, next) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    const userId = (req as any).user?.id || 'SYSTEM';

    const record = await updateData(tableName, id, data, userId);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/custom-data/:tableName/:id
 * Soft delete record
 */
router.delete('/:tableName/:id', async (req, res, next) => {
  try {
    const { tableName, id } = req.params;
    const userId = (req as any).user?.id || 'SYSTEM';

    await deleteData(tableName, id, userId);

    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-data/:tableName/geojson
 * Get data as GeoJSON FeatureCollection
 */
router.get('/:tableName/geojson', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const { geometryField, properties, ...filters } = req.query;

    if (!geometryField) {
      return res.status(400).json({
        success: false,
        error: 'geometryField query parameter is required',
      });
    }

    const featureCollection = await queryDataAsGeoJSON(tableName, geometryField as string, {
      filters: filters as Record<string, any>,
      properties: properties ? (properties as string).split(',') : undefined,
    });

    res.json(featureCollection);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/custom-data/:tableName/spatial-query
 * Perform spatial query
 */
router.post('/:tableName/spatial-query', async (req, res, next) => {
  try {
    const { tableName } = req.params;
    const { geometryColumn, queryType, geometry, distance, point } = req.body;

    if (!geometryColumn || !queryType) {
      return res.status(400).json({
        success: false,
        error: 'geometryColumn and queryType are required',
      });
    }

    const results = await spatialQuery(tableName, geometryColumn, queryType, {
      geometry,
      distance,
      point,
    });

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
});

export default router;
