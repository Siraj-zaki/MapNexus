/**
 * Import Service
 * Handles parsing and importing data from CSV/Excel files
 */

import * as XLSX from 'xlsx';
import { insertData } from './customDataService.js';
import { getCustomTableById } from './customTableService.js';
import { CustomFieldDefinition } from './types.js';

interface ValidationError {
  row: number;
  errors: Record<string, string>;
}

interface ImportResult {
  success: boolean;
  importedCount: number;
  totalRows: number;
  errors?: ValidationError[];
}

/**
 * Parse file buffer to array of objects
 */
export function parseFile(buffer: Buffer, mimeType: string): any[] {
  if (mimeType === 'application/json') {
    try {
      const json = JSON.parse(buffer.toString('utf-8'));
      return Array.isArray(json) ? json : [json];
    } catch (e) {
      throw new Error('Failed to parse JSON file.');
    }
  }

  let workbook: XLSX.WorkBook;

  try {
    // Read buffer
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (error) {
    throw new Error('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
  }

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  // defval: null ensures empty cells are null, not undefined or skipped
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  return data;
}

/**
 * Validate row data against table schema
 */
function validateRow(
  row: any,
  rowIndex: number,
  fields: CustomFieldDefinition[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  fields.forEach((field) => {
    // Skip if field is auto-generated or system field
    if (['id', 'created_at', 'updated_at', 'deleted_at'].includes(field.name)) return;

    let value = row[field.displayName] ?? row[field.name];

    // Check required
    if (field.isRequired && (value === null || value === undefined || value === '')) {
      errors[field.name] = 'Required field is missing';
      return;
    }

    if (value !== null && value !== undefined && value !== '') {
      // Type validation
      switch (field.dataType) {
        case 'INTEGER':
        case 'BIGINT':
          if (isNaN(Number(value)) || !Number.isInteger(Number(value))) {
            errors[field.name] = 'Must be an integer';
          }
          break;
        case 'DECIMAL':
        case 'FLOAT':
          if (isNaN(Number(value))) {
            errors[field.name] = 'Must be a number';
          }
          break;
        case 'BOOLEAN':
          // Accepted boolean values
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
              errors[field.name] = 'Must be a boolean (true/false, 1/0, yes/no)';
            }
          } else if (typeof value !== 'boolean' && value !== 0 && value !== 1) {
            errors[field.name] = 'Must be a boolean';
          }
          break;
        case 'DATE':
        case 'TIMESTAMP':
        case 'TIMESTAMPTZ':
          if (!(value instanceof Date) && isNaN(Date.parse(value))) {
            errors[field.name] = 'Invalid date format';
          }
          break;
        case 'JSONB':
        case 'IOT_SENSOR':
          if (typeof value === 'string') {
            try {
              JSON.parse(value);
            } catch {
              errors[field.name] = 'Invalid JSON format';
            }
          } else if (typeof value !== 'object') {
            errors[field.name] = 'Must be valid JSON';
          }
          break;
      }
    }
  });

  return errors;
}

/**
 * Process import for a table
 */
export async function processImport(
  tableId: string,
  buffer: Buffer,
  mimeType: string,
  userId: string
): Promise<ImportResult> {
  // 1. Get table definition
  const table = await getCustomTableById(tableId);
  if (!table) {
    throw new Error('Table not found');
  }

  // 2. Parse file
  const rawData = parseFile(buffer, mimeType);
  if (rawData.length === 0) {
    return { success: true, importedCount: 0, totalRows: 0 };
  }

  // 3. Validate all rows first
  const errors: ValidationError[] = [];

  rawData.forEach((row, index) => {
    // index + 2 because row 1 is header, and 0-indexed array
    const rowErrors = validateRow(row, index + 2, table.fields as any[]);
    if (Object.keys(rowErrors).length > 0) {
      errors.push({
        row: index + 2,
        errors: rowErrors,
      });
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      importedCount: 0,
      totalRows: rawData.length,
      errors,
    };
  }

  // 4. Import data if valid
  let importedCount = 0;

  // We process sequentially to ensure order and handle errors (though we validated already)
  // In a production env with huge files, might want to use batch insert or chunks.
  for (const row of rawData) {
    const record: Record<string, any> = {};

    // Map headers to field names and sanitize values
    table.fields.forEach((field) => {
      // Skip system fields
      if (['id', 'created_at', 'updated_at', 'deleted_at'].includes(field.name)) return;

      // Try to find by display name first, then name
      let value = row[field.displayName] ?? row[field.name];

      if (value !== undefined && value !== null && value !== '') {
        // Transform values if needed
        if (field.dataType === 'BOOLEAN') {
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            value = ['true', '1', 'yes'].includes(lower);
          } else {
            value = Boolean(value);
          }
        } else if (['INTEGER', 'BIGINT', 'DECIMAL', 'FLOAT'].includes(field.dataType)) {
          value = Number(value);
        } else if (['JSONB', 'IOT_SENSOR'].includes(field.dataType) && typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {} // Already validated
        }

        record[field.name] = value;
      }
    });

    try {
      await insertData(table.name, record, userId);
      importedCount++;
    } catch (err) {
      console.error(`Failed to insert row`, err);
      // Should we abort or continue?
      // For now, let's catch distinct DB errors if any leaked through validation
      throw new Error(`Failed to insert row: ${(err as Error).message}`);
    }
  }

  return {
    success: true,
    importedCount,
    totalRows: rawData.length,
  };
}
