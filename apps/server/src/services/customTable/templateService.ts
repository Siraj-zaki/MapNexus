/**
 * Template Service
 * Generates templates for data import
 */

import * as XLSX from 'xlsx';
import { getCustomTableById } from './customTableService.js';

/**
 * Generate template file buffer
 */
export async function generateTemplate(
  tableId: string,
  format: 'csv' | 'xlsx'
): Promise<{ buffer: Buffer; filename: string }> {
  const table = await getCustomTableById(tableId);
  if (!table) {
    throw new Error('Table not found');
  }

  // Define headers based on fields
  // We prioritize Display Name for user friendliness, but could also support system names
  const headers = table.fields
    .filter(
      (f) =>
        !['id', 'created_at', 'updated_at', 'deleted_at', 'created_by', 'updated_by'].includes(
          f.name
        )
    )
    .map((f) => f.displayName);

  // Create example row (optional, maybe leave empty)
  // Let's create an empty row object with keys to ensure columns are created
  const emptyRow = {};
  headers.forEach((h) => ((emptyRow as any)[h] = ''));

  const worksheet = XLSX.utils.json_to_sheet([emptyRow], { header: headers });

  // Remove the empty data row, keep only header
  // range decode -> adjust end row -> encode
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  range.e.r = 0; // Only row 0 (header)
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // Set column widths
  const wscols = headers.map(() => ({ wch: 20 }));
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

  const fileType = format === 'csv' ? 'csv' : 'xlsx';
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: fileType });
  const filename = `${table.name}_template.${fileType}`;

  return { buffer, filename };
}
