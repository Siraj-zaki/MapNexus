/**
 * Custom Tables Routes
 * API endpoints for managing custom table definitions
 */

import { Router } from 'express';
import {
  addFieldToTable,
  createCustomTable,
  CustomFieldDefinition,
  CustomTableDefinition,
  deleteCustomTable,
  getCustomTableById,
  getCustomTableByName,
  getCustomTables,
} from '../services/customTable/index.js';

const router = Router();

/**
 * GET /api/custom-tables
 * Get all custom tables
 */
router.get('/', async (req, res, next) => {
  try {
    const tables = await getCustomTables();
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-tables/:id
 * Get custom table by ID
 */
router.get('/:idOrName', async (req, res, next) => {
  try {
    const { idOrName } = req.params;

    // Try by ID first
    let table = await getCustomTableById(idOrName);

    // If not found, try by name
    if (!table) {
      table = await getCustomTableByName(idOrName);
    }

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/custom-tables
 * Create a new custom table
 */
router.post('/', async (req, res, next) => {
  try {
    const definition: CustomTableDefinition = req.body;
    const userId = (req as any).user?.id || 'system';

    const table = await createCustomTable(definition, userId);

    res.status(201).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/custom-tables/:id/fields
 * Add a new field to existing table
 */
router.post('/:id/fields', async (req, res, next) => {
  try {
    const { id } = req.params;
    const field: CustomFieldDefinition = req.body;

    await addFieldToTable(id, field);

    const updatedTable = await getCustomTableById(id);
    res.json({ success: true, data: updatedTable });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/custom-tables/:id
 * Delete a custom table
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await deleteCustomTable(id);

    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
