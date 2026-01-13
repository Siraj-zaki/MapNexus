/**
 * Custom Tables Routes
 * API endpoints for managing custom table definitions
 */

import { Router } from 'express';
import multer from 'multer';
import {
  addFieldToTable,
  bulkInsertData,
  createCustomTable,
  CustomFieldDefinition,
  CustomTableDefinition,
  deleteCustomTable,
  exportTableData,
  generateTemplate,
  getCustomTableById,
  getCustomTableByName,
  getCustomTables,
  processImport,
} from '../services/customTable/index.js';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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

/**
 * POST /api/custom-tables/:id/import
 * Import data from CSV or Excel file
 */
router.post('/:id/import', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || 'system';

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { buffer, mimetype } = req.file;
    const result = await processImport(id, buffer, mimetype, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: result,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-tables/:id/template
 * Download CSV/Excel template
 */
router.get('/:id/template', async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as 'csv' | 'xlsx') || 'xlsx';

    const { buffer, filename } = await generateTemplate(id, format);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/custom-tables/:id/export
 * Export table data
 */
router.get('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as 'xlsx' | 'csv' | 'json') || 'xlsx';
    const userId = (req as any).user?.id || 'system';

    const { buffer, filename, mimeType } = await exportTableData(id, format, userId);

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mimeType);

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/custom-tables/:id/records/bulk
 * Bulk create records
 */
router.post('/:id/records/bulk', async (req, res, next) => {
  try {
    const { id } = req.params;
    const records = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!Array.isArray(records)) {
      return res
        .status(400)
        .json({ success: false, error: 'Request body must be an array of records' });
    }

    // Resolve table
    let table = await getCustomTableById(id);
    if (!table) {
      table = await getCustomTableByName(id);
    }

    if (!table) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const inserted = await bulkInsertData(table.name, records, userId);
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error) {
    next(error);
  }
});

export default router;
