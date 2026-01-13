/**
 * Report Builder API Routes
 * CRUD operations for reports, widgets, schedules, and generation
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response, Router } from 'express';
import { getReportData, getWidgetData } from '../services/reporting/queryBuilder';

const router = Router();
const prisma = new PrismaClient();

// ============================================================================
// REPORT TEMPLATES
// ============================================================================

/**
 * GET /api/reports - List all report templates
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { widgets: true, schedules: true, generated: true } },
      },
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reports - Create a new report template
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, paperSize, orientation, type, config } = req.body;
    const userId = (req as any).user?.id || 'ANONYMOUS_USER'; // Fallback for dev

    // if (!userId) {
    //   return res.status(401).json({ error: 'Authentication required' });
    // }

    const template = await prisma.reportTemplate.create({
      data: {
        name,
        description,
        paperSize: paperSize || 'A4',
        orientation: orientation || 'portrait',
        layout: { lg: [], md: [], sm: [] },
        type: type || 'CUSTOM',
        config: config || {},
        createdBy: userId,
      },
    });

    res.status(201).json(template);
  } catch (error: any) {
    console.error('Create report error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/:id - Get report template with widgets
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.reportTemplate.findUnique({
      where: { id },
      include: {
        widgets: { orderBy: { createdAt: 'asc' } },
        schedules: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Report template not found' });
    }

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/reports/:id - Update report template
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, layout, paperSize, orientation, type, config } = req.body;

    const template = await prisma.reportTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(layout && { layout }),
        ...(paperSize && { paperSize }),
        ...(orientation && { orientation }),
        ...(type && { type }),
        ...(config && { config }),
      },
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/reports/:id - Delete report template
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.reportTemplate.delete({ where: { id } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// WIDGETS
// ============================================================================

/**
 * POST /api/reports/:id/widgets - Add widget to report
 */
router.post('/:id/widgets', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const widgetData = req.body;

    const widget = await prisma.reportWidget.create({
      data: {
        templateId: id,
        type: widgetData.type,
        title: widgetData.title,
        dataSource: widgetData.dataSource,
        queryConfig: widgetData.queryConfig || {},
        chartConfig: widgetData.chartConfig,
        mapConfig: widgetData.mapConfig,
        tableConfig: widgetData.tableConfig,
        kpiConfig: widgetData.kpiConfig,
        textContent: widgetData.textContent,
        imageUrl: widgetData.imageUrl,
        gridPosition: widgetData.gridPosition || { x: 0, y: 0, w: 4, h: 3 },
        style: widgetData.style,
      },
    });

    res.status(201).json(widget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/reports/:id/widgets/:widgetId - Update widget
 */
router.put('/:id/widgets/:widgetId', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const updates = req.body;

    const widget = await prisma.reportWidget.update({
      where: { id: widgetId },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.dataSource !== undefined && { dataSource: updates.dataSource }),
        ...(updates.queryConfig && { queryConfig: updates.queryConfig }),
        ...(updates.chartConfig && { chartConfig: updates.chartConfig }),
        ...(updates.mapConfig && { mapConfig: updates.mapConfig }),
        ...(updates.tableConfig && { tableConfig: updates.tableConfig }),
        ...(updates.kpiConfig && { kpiConfig: updates.kpiConfig }),
        ...(updates.textContent !== undefined && { textContent: updates.textContent }),
        ...(updates.imageUrl !== undefined && { imageUrl: updates.imageUrl }),
        ...(updates.gridPosition && { gridPosition: updates.gridPosition }),
        ...(updates.style && { style: updates.style }),
      },
    });

    res.json(widget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/reports/:id/widgets/:widgetId - Remove widget
 */
router.delete('/:id/widgets/:widgetId', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;

    await prisma.reportWidget.delete({ where: { id: widgetId } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reports/:id/widgets/:widgetId/preview - Get widget data preview
 */
router.post('/:id/widgets/:widgetId/preview', async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;

    const widget = await prisma.reportWidget.findUnique({
      where: { id: widgetId },
    });

    if (!widget) {
      return res.status(404).json({ error: 'Widget not found' });
    }

    const data = await getWidgetData({
      type: widget.type,
      dataSource: widget.dataSource,
      queryConfig: widget.queryConfig,
      chartConfig: widget.chartConfig as any,
      mapConfig: widget.mapConfig as any,
      tableConfig: widget.tableConfig as any,
      kpiConfig: widget.kpiConfig as any,
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * POST /api/reports/:id/preview - Preview all widgets data
 */
router.post('/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { config } = req.body; // Extract ephemeral config overrides (filters, pagination)

    const dataMap = await getReportData(id, config);
    const result: Record<string, any> = {};

    dataMap.forEach((value, key) => {
      result[key] = value;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reports/:id/generate - Generate PDF/Excel report
 */
router.post('/:id/generate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'PDF', parameters } = req.body;
    const userId = (req as any).user?.id || 'ANONYMOUS';

    // Create pending record
    const generated = await prisma.generatedReport.create({
      data: {
        templateId: id,
        fileName: `report_${id}_${Date.now()}.${format.toLowerCase()}`,
        fileUrl: '',
        format,
        status: 'PENDING',
        parameters: parameters || {},
        generatedBy: userId,
      },
    });

    // TODO: Queue actual generation with BullMQ
    // For now, return the pending record
    res.status(202).json({
      message: 'Report generation queued',
      report: generated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/:id/generated - List generated reports
 */
router.get('/:id/generated', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const reports = await prisma.generatedReport.findMany({
      where: { templateId: id },
      orderBy: { generatedAt: 'desc' },
      take: 50,
    });

    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reports/generated/:generatedId - Get generated report details
 */
router.get('/generated/:generatedId', async (req: Request, res: Response) => {
  try {
    const { generatedId } = req.params;

    const report = await prisma.generatedReport.findUnique({
      where: { id: generatedId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Generated report not found' });
    }

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SCHEDULES
// ============================================================================

/**
 * POST /api/reports/:id/schedules - Create schedule
 */
router.post('/:id/schedules', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cronExpression, timezone, recipients, format } = req.body;

    const schedule = await prisma.reportSchedule.create({
      data: {
        templateId: id,
        name,
        cronExpression,
        timezone: timezone || 'UTC',
        recipients: recipients || [],
        format: format || 'PDF',
        isActive: true,
      },
    });

    res.status(201).json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/reports/:id/schedules/:scheduleId - Update schedule
 */
router.put('/:id/schedules/:scheduleId', async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;

    const schedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.cronExpression && { cronExpression: updates.cronExpression }),
        ...(updates.timezone && { timezone: updates.timezone }),
        ...(updates.recipients && { recipients: updates.recipients }),
        ...(updates.format && { format: updates.format }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      },
    });

    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/reports/:id/schedules/:scheduleId - Delete schedule
 */
router.delete('/:id/schedules/:scheduleId', async (req: Request, res: Response) => {
  try {
    const { scheduleId } = req.params;

    await prisma.reportSchedule.delete({ where: { id: scheduleId } });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DATA OPERATIONS (For Editable Reports)
// ============================================================================

/**
 * POST /api/reports/data/:tableName/batch - Batch update custom table data
 */
router.post('/data/:tableName/batch', async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const { changes } = req.body; // Array of change objects
    const fullTableName = tableName.startsWith('custom_') ? tableName : `custom_${tableName}`;

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(fullTableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    if (!Array.isArray(changes)) {
      return res.status(400).json({ error: 'Changes must be an array' });
    }

    // Fetch table metadata to determine field types
    const tableMetadata = await prisma.customTable.findFirst({
      where: { name: tableName },
      include: { fields: true },
    });

    if (!tableMetadata) {
      return res.status(404).json({ error: 'Table metadata not found' });
    }

    const fieldTypeMap = new Map(tableMetadata.fields.map((f) => [f.name, f.dataType]));

    // Helper to cast value based on type
    const castValue = (field: string, value: any) => {
      const type = fieldTypeMap.get(field);
      if (value === '' || value === null) return null;
      if (['INTEGER', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE'].includes(type || '')) {
        const num = Number(value);
        return isNaN(num) ? null : num;
      }
      if (type === 'BOOLEAN') return value === 'true' || value === true;
      return value;
    };

    // Process changes in transaction
    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        if (change.type === 'add') {
          // INSERT
          const fields = Object.keys(change.data).filter((k) => k !== 'id');
          const values = fields.map((k) => castValue(k, change.data[k]));

          if (fields.length === 0) continue;

          // Construct parameterized query
          const fieldList = fields.map((f) => `"${f}"`).join(', ');
          const paramList = fields.map((_, i) => `$${i + 1}`).join(', ');

          await tx.$executeRawUnsafe(
            `INSERT INTO "${fullTableName}" (${fieldList}) VALUES (${paramList})`,
            ...values
          );
        } else if (change.type === 'delete') {
          // SOFT DELETE
          await tx.$executeRawUnsafe(
            `UPDATE "${fullTableName}" SET deleted_at = NOW() WHERE id = $1::uuid`,
            change.id
          );
        } else {
          // UPDATE (field level)
          // change = { id, field, value }
          const val = castValue(change.field, change.value);

          await tx.$executeRawUnsafe(
            `UPDATE "${fullTableName}" SET "${change.field}" = $2 WHERE id = $1::uuid`,
            change.id,
            val
          );
        }
      }
    });

    res.json({ success: true, count: changes.length });
  } catch (error: any) {
    console.error('Batch update error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
