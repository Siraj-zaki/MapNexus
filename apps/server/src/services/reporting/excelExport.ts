/**
 * Excel Export Service
 * Exports report data to Excel format using xlsx library
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getReportData } from './queryBuilder';

const prisma = new PrismaClient();

// Ensure output directory exists
const OUTPUT_DIR = path.join(process.cwd(), 'generated-reports');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface ExcelGenerateOptions {
  templateId: string;
  includeCharts?: boolean;
}

/**
 * Generate Excel workbook from report template
 */
export async function generateExcel(
  options: ExcelGenerateOptions
): Promise<{ filePath: string; fileName: string }> {
  const { templateId } = options;

  // Get template with widgets
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId },
    include: { widgets: true },
  });

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Get widget data
  const dataMap = await getReportData(templateId);

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add summary sheet
  const summaryData = [
    ['Report Name', template.name],
    ['Description', template.description || ''],
    ['Generated', new Date().toISOString()],
    ['Total Widgets', template.widgets.length.toString()],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Process each widget
  for (const widget of template.widgets) {
    const widgetData = dataMap.get(widget.id);

    if (!widgetData?.success || !widgetData.data) continue;

    const sheetName = sanitizeSheetName(widget.title || widget.type);

    switch (widget.type) {
      case 'TABLE':
        addTableSheet(workbook, sheetName, widgetData.data);
        break;
      case 'CHART':
        addChartDataSheet(workbook, sheetName, widgetData.data);
        break;
      case 'KPI_CARD':
        addKpiSheet(workbook, sheetName, widget, widgetData.data);
        break;
      case 'MAP':
        addMapDataSheet(workbook, sheetName, widgetData.data);
        break;
    }
  }

  // Write to file
  const fileName = `report_${templateId}_${Date.now()}.xlsx`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  XLSX.writeFile(workbook, filePath);

  return { filePath, fileName };
}

/**
 * Sanitize sheet name for Excel (max 31 chars, no special chars)
 */
function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/*?[\]:]/g, '').substring(0, 31);
}

/**
 * Add table data as Excel sheet
 */
function addTableSheet(
  workbook: XLSX.WorkBook,
  name: string,
  data: { data: any[]; total: number }
): void {
  if (!data.data || data.data.length === 0) return;

  const rows = data.data;
  const columns = Object.keys(rows[0]).filter((k) => !k.startsWith('_') && k !== 'deleted_at');

  // Create header row
  const sheetData = [columns];

  // Add data rows
  for (const row of rows) {
    sheetData.push(columns.map((col) => formatCellValue(row[col])));
  }

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  sheet['!cols'] = columns.map(() => ({ wch: 15 }));

  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

/**
 * Add chart data as Excel sheet
 */
function addChartDataSheet(workbook: XLSX.WorkBook, name: string, data: { data: any[] }): void {
  if (!data.data || data.data.length === 0) return;

  const rows = data.data;
  const columns = Object.keys(rows[0]);

  // Create header row
  const sheetData = [columns];

  // Add data rows
  for (const row of rows) {
    sheetData.push(columns.map((col) => formatCellValue(row[col])));
  }

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

/**
 * Add KPI data as Excel sheet
 */
function addKpiSheet(
  workbook: XLSX.WorkBook,
  name: string,
  widget: any,
  data: { value: number; comparison?: any }
): void {
  const config = widget.kpiConfig || {};
  const sheetData = [
    ['Metric', 'Value'],
    [widget.title || 'KPI', data.value],
  ];

  if (data.comparison) {
    sheetData.push(['Target', data.comparison.value]);
    sheetData.push(['Change', data.comparison.change]);
    sheetData.push(['Change %', `${data.comparison.changePercent?.toFixed(1)}%`]);
  }

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

/**
 * Add map GeoJSON data as Excel sheet
 */
function addMapDataSheet(workbook: XLSX.WorkBook, name: string, data: { features: any[] }): void {
  if (!data.features || data.features.length === 0) return;

  // Extract properties from features
  const rows = data.features.map((f) => ({
    id: f.id || f.properties?.id || '',
    type: f.geometry?.type || '',
    coordinates: JSON.stringify(f.geometry?.coordinates || []),
    ...f.properties,
  }));

  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const sheetData = [columns];

  for (const row of rows) {
    sheetData.push(columns.map((col) => formatCellValue(row[col])));
  }

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

/**
 * Format cell value for Excel
 */
function formatCellValue(value: any): XLSX.CellObject['v'] {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export default {
  generateExcel,
};
