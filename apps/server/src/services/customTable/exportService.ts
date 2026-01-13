/**
 * Export Service
 * Handles exporting data to various formats (Excel, CSV, JSON)
 */

import * as XLSX from 'xlsx';
import { queryData } from './customDataService.js';
import { getCustomTableById } from './customTableService.js';

/**
 * Export table data to buffer
 */
export async function exportTableData(
  tableId: string,
  format: 'xlsx' | 'csv' | 'json',
  userId?: string
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  // 1. Get Table Definition
  const table = await getCustomTableById(tableId);
  if (!table) {
    throw new Error('Table not found');
  }

  // 2. Fetch ALL data (no pagination)
  // We use a large limit for now, or we could stream.
  // queryData supports limit/offset, we might strictly need a dedicated "getAll" or just set a high limit.
  // For now, let's assume < 100k records and fetch all.
  const { data } = await queryData(table.name, { limit: 100000 });

  // 3. Prepare data for export
  // Flatten objects if needed, handle dates, etc.
  const exportData = data.map((row) => {
    const newRow: Record<string, any> = {};
    table.fields.forEach((field) => {
      // Use display name for headers if possible? Or maybe stick to field names for machine readability?
      // Usually users prefer Display Names for reports.
      const key = field.displayName || field.name;
      let value = row[field.name];

      // Format values
      if (value instanceof Date) {
        value = value.toISOString();
      } else if (typeof value === 'object' && value !== null) {
        // Stringify JSON/Geometry
        value = JSON.stringify(value);
      }

      newRow[key] = value;
    });
    return newRow;
  });

  // 4. Generate Output
  let buffer: Buffer;
  let filename = `${table.name}_export_${new Date().toISOString().split('T')[0]}`;
  let mimeType = '';

  if (format === 'json') {
    const jsonStr = JSON.stringify(exportData, null, 2);
    buffer = Buffer.from(jsonStr, 'utf-8');
    filename += '.json';
    mimeType = 'application/json';
  } else {
    // XLSX / CSV using SheetJS
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    if (format === 'csv') {
      buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'csv' });
      filename += '.csv';
      mimeType = 'text/csv';
    } else {
      buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      filename += '.xlsx';
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
  }

  return { buffer, filename, mimeType };
}
