/**
 * PDF Generator Service
 * Uses Puppeteer to render HTML reports as PDF
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { getReportData } from './queryBuilder';

const prisma = new PrismaClient();

// Ensure output directory exists
const OUTPUT_DIR = path.join(process.cwd(), 'generated-reports');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

interface GenerateOptions {
  templateId: string;
  format: 'PDF' | 'HTML';
  paperSize?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate report HTML from template and data
 */
async function generateReportHTML(templateId: string): Promise<string> {
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId },
    include: { widgets: true },
  });

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Get widget data
  const dataMap = await getReportData(templateId);

  // Build HTML
  const widgetsHTML = template.widgets
    .map((widget) => {
      const widgetData = dataMap.get(widget.id);
      const position = (widget.gridPosition as any) || { x: 0, y: 0, w: 6, h: 4 };

      // Calculate pixel positions (assuming 100px per grid unit)
      const style = `
        position: absolute;
        left: ${position.x * 100}px;
        top: ${position.y * 80}px;
        width: ${position.w * 100 - 16}px;
        height: ${position.h * 80 - 16}px;
      `;

      return `
        <div class="widget" style="${style}">
          <div class="widget-header">${widget.title || widget.type}</div>
          <div class="widget-content">
            ${renderWidgetContent(widget, widgetData?.data)}
          </div>
        </div>
      `;
    })
    .join('\n');

  // Calculate canvas height
  const maxY = Math.max(
    ...template.widgets.map((w) => {
      const pos = (w.gridPosition as any) || { y: 0, h: 4 };
      return (pos.y + pos.h) * 80;
    }),
    600
  );

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #111;
      color: #fff;
      padding: 20px;
    }
    .report-header {
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }
    .report-header h1 {
      font-size: 24px;
      font-weight: 600;
    }
    .report-header p {
      color: #888;
      font-size: 12px;
      margin-top: 4px;
    }
    .report-canvas {
      position: relative;
      min-height: ${maxY}px;
    }
    .widget {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      overflow: hidden;
    }
    .widget-header {
      padding: 8px 12px;
      font-size: 14px;
      font-weight: 500;
      background: #222;
      border-bottom: 1px solid #333;
    }
    .widget-content {
      padding: 12px;
      height: calc(100% - 36px);
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 6px 8px;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    th {
      background: #222;
      font-weight: 500;
    }
    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      text-align: center;
      padding: 20px;
    }
    .chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-size: 14px;
    }
    .map-placeholder {
      background: #0a0a0a;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${template.name}</h1>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
  <div class="report-canvas">
    ${widgetsHTML}
  </div>
</body>
</html>
  `;
}

/**
 * Render widget content based on type
 */
function renderWidgetContent(widget: any, data: any): string {
  switch (widget.type) {
    case 'TABLE':
      return renderTableWidget(data);
    case 'KPI_CARD':
      return renderKpiWidget(widget.kpiConfig, data);
    case 'TEXT':
      return widget.textContent || '';
    case 'IMAGE':
      return widget.imageUrl
        ? `<img src="${widget.imageUrl}" style="max-width:100%;max-height:100%;" />`
        : '';
    case 'CHART':
      // Charts need JavaScript rendering, show data summary for PDF
      return renderChartPlaceholder(widget.chartConfig, data);
    case 'MAP':
      // Maps need JavaScript rendering, show data summary for PDF
      return renderMapPlaceholder(widget.mapConfig, data);
    default:
      return '<div class="chart-placeholder">Unknown widget type</div>';
  }
}

function renderTableWidget(data: any): string {
  if (!data?.data || data.data.length === 0) {
    return '<div class="chart-placeholder">No data</div>';
  }

  const rows = data.data.slice(0, 20);
  const columns = Object.keys(rows[0])
    .filter((k) => !k.startsWith('_') && k !== 'deleted_at')
    .slice(0, 6);

  return `
    <table>
      <thead>
        <tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row: any) =>
              `<tr>${columns.map((c) => `<td>${formatValue(row[c])}</td>`).join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>
    <div style="font-size:10px;color:#666;margin-top:8px;">
      Showing ${rows.length} of ${data.total || rows.length} records
    </div>
  `;
}

function renderKpiWidget(config: any, data: any): string {
  const value = data?.value ?? 0;
  const formatted = formatNumber(value, config?.format);

  return `
    <div class="kpi-value">
      ${config?.prefix || ''}${formatted}${config?.suffix || ''}
    </div>
  `;
}

function renderChartPlaceholder(config: any, data: any): string {
  const chartType = config?.chartType || 'Chart';
  const dataCount = data?.data?.length || 0;

  return `
    <div class="chart-placeholder">
      ${chartType} Chart<br/>
      <small>${dataCount} data points</small>
    </div>
  `;
}

function renderMapPlaceholder(config: any, data: any): string {
  const featureCount = data?.features?.length || 0;

  return `
    <div class="map-placeholder">
      Map View<br/>
      <small>${featureCount} locations</small>
    </div>
  `;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 30);
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value).substring(0, 50);
}

function formatNumber(value: number, format?: string): string {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'percent') {
    return `${value.toFixed(1)}%`;
  }
  if (format === 'compact') {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
      value
    );
  }
  return new Intl.NumberFormat().format(value);
}

/**
 * Generate PDF from template
 */
export async function generatePDF(
  options: GenerateOptions
): Promise<{ filePath: string; fileName: string }> {
  const { templateId, paperSize = 'A4', orientation = 'portrait' } = options;

  // Generate HTML
  const html = await generateReportHTML(templateId);

  // Save HTML if requested
  if (options.format === 'HTML') {
    const fileName = `report_${templateId}_${Date.now()}.html`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, html);
    return { filePath, fileName };
  }

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Generate PDF
    const fileName = `report_${templateId}_${Date.now()}.pdf`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    await page.pdf({
      path: filePath,
      format: paperSize,
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    return { filePath, fileName };
  } finally {
    await browser.close();
  }
}

/**
 * Update generated report record with file info
 */
export async function updateGeneratedReport(
  reportId: string,
  status: 'COMPLETED' | 'FAILED',
  fileUrl?: string,
  error?: string
): Promise<void> {
  await prisma.generatedReport.update({
    where: { id: reportId },
    data: {
      status,
      fileUrl: fileUrl || '',
      error,
      fileSize: fileUrl ? fs.statSync(fileUrl).size : undefined,
    },
  });
}

export default {
  generatePDF,
  generateReportHTML,
  updateGeneratedReport,
};
