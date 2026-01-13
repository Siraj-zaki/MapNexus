/**
 * File Conversion Service
 * Converts various floor plan formats to raster images
 *
 * Supported formats:
 * - Images (jpg, png, webp): Direct processing with sharp
 * - PDF: Conversion with pdf2pic
 * - DXF: Parsing and rendering with dxf-parser + canvas
 * - DWG: Coming Soon
 */

import { createCanvas } from 'canvas';
import * as DxfParser from 'dxf-parser';
import fs from 'fs/promises';
import path from 'path';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import { logger } from '../utils/logger.js';

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  previewPath?: string;
  width?: number;
  height?: number;
  error?: string;
  comingSoon?: boolean;
}

export interface ConversionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'png' | 'webp' | 'jpeg';
}

const DEFAULT_OPTIONS: ConversionOptions = {
  maxWidth: 4000,
  maxHeight: 4000,
  quality: 90,
  format: 'png',
};

/**
 * Convert image files (jpg, png, webp)
 */
export async function convertImage(
  inputPath: string,
  outputDir: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const filename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${filename}.${opts.format}`);
  const previewPath = path.join(outputDir, `${filename}_preview.${opts.format}`);

  try {
    // Get image metadata
    const metadata = await sharp(inputPath).metadata();

    // Convert and resize main image
    await sharp(inputPath)
      .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside', withoutEnlargement: true })
      .toFormat(opts.format!, { quality: opts.quality })
      .toFile(outputPath);

    // Create preview (smaller)
    await sharp(inputPath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .toFormat(opts.format!, { quality: 80 })
      .toFile(previewPath);

    return {
      success: true,
      outputPath,
      previewPath,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    logger.error('Image conversion error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Convert PDF files
 */
export async function convertPDF(
  inputPath: string,
  outputDir: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const filename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${filename}.${opts.format}`);
  const previewPath = path.join(outputDir, `${filename}_preview.${opts.format}`);

  try {
    const pdf2picOptions = {
      density: 150,
      saveFilename: filename,
      savePath: outputDir,
      format: 'png' as const,
      width: opts.maxWidth,
      height: opts.maxHeight,
    };

    const convert = fromPath(inputPath, pdf2picOptions);
    const result = await convert(1, { responseType: 'image' }); // First page only

    if (result.path) {
      // Rename to our expected output path
      await fs.rename(result.path, outputPath);

      // Get dimensions from converted image
      const metadata = await sharp(outputPath).metadata();

      // Create preview
      await sharp(outputPath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .toFormat(opts.format!, { quality: 80 })
        .toFile(previewPath);

      return {
        success: true,
        outputPath,
        previewPath,
        width: metadata.width,
        height: metadata.height,
      };
    }

    return { success: false, error: 'PDF conversion failed' };
  } catch (error) {
    logger.error('PDF conversion error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Convert DXF files to raster image
 */
export async function convertDXF(
  inputPath: string,
  outputDir: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const filename = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${filename}.${opts.format}`);
  const previewPath = path.join(outputDir, `${filename}_preview.${opts.format}`);

  try {
    // Read DXF file
    const dxfContent = await fs.readFile(inputPath, 'utf-8');
    const parser = new DxfParser.default();
    const dxf = parser.parseSync(dxfContent);

    if (!dxf) {
      return { success: false, error: 'Failed to parse DXF file' };
    }

    // Calculate bounds from all entity types
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const processVertex = (x: number, y: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    if (dxf.entities) {
      for (const entity of dxf.entities) {
        const e = entity as any;

        switch (entity.type) {
          case 'LINE':
            if (e.vertices) {
              e.vertices.forEach((v: any) => processVertex(v.x, v.y));
            }
            break;
          case 'POLYLINE':
          case 'LWPOLYLINE':
            if (e.vertices) {
              e.vertices.forEach((v: any) => processVertex(v.x, v.y));
            }
            break;
          case 'CIRCLE':
          case 'ARC':
            if (e.center && e.radius) {
              processVertex(e.center.x - e.radius, e.center.y - e.radius);
              processVertex(e.center.x + e.radius, e.center.y + e.radius);
            }
            break;
          case 'ELLIPSE':
            if (e.center && e.majorAxisEndPoint) {
              const rx = Math.abs(e.majorAxisEndPoint.x);
              const ry = Math.abs(e.majorAxisEndPoint.y);
              processVertex(e.center.x - rx, e.center.y - ry);
              processVertex(e.center.x + rx, e.center.y + ry);
            }
            break;
          case 'POINT':
            if (e.position) {
              processVertex(e.position.x, e.position.y);
            }
            break;
          case 'INSERT':
            if (e.position) {
              processVertex(e.position.x, e.position.y);
            }
            break;
          case 'SPLINE':
            if (e.controlPoints) {
              e.controlPoints.forEach((p: any) => processVertex(p.x, p.y));
            }
            break;
          case 'TEXT':
          case 'MTEXT':
            if (e.position) {
              processVertex(e.position.x, e.position.y);
            }
            break;
        }
      }
    }

    // Handle case where no valid entities found
    if (!isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = 1000;
      maxY = 1000;
    }

    // Calculate dimensions with padding
    const padding = 50;
    const dxfWidth = maxX - minX || 1000;
    const dxfHeight = maxY - minY || 1000;
    const scale = Math.min(
      (opts.maxWidth! - padding * 2) / dxfWidth,
      (opts.maxHeight! - padding * 2) / dxfHeight
    );
    const canvasWidth = Math.ceil(dxfWidth * scale + padding * 2);
    const canvasHeight = Math.ceil(dxfHeight * scale + padding * 2);

    // Create canvas and render
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Transform function
    const tx = (x: number) => (x - minX) * scale + padding;
    const ty = (y: number) => canvasHeight - ((y - minY) * scale + padding);

    // Draw entities
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    if (dxf.entities) {
      for (const entity of dxf.entities) {
        const e = entity as any;

        // Set color if available
        if (e.color) {
          ctx.strokeStyle = getAcadColor(e.color);
        } else {
          ctx.strokeStyle = '#000000';
        }

        ctx.beginPath();

        switch (entity.type) {
          case 'LINE':
            if (e.vertices && e.vertices.length >= 2) {
              ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
              ctx.lineTo(tx(e.vertices[1].x), ty(e.vertices[1].y));
            }
            break;

          case 'POLYLINE':
          case 'LWPOLYLINE':
            if (e.vertices && e.vertices.length > 0) {
              ctx.moveTo(tx(e.vertices[0].x), ty(e.vertices[0].y));
              for (let i = 1; i < e.vertices.length; i++) {
                ctx.lineTo(tx(e.vertices[i].x), ty(e.vertices[i].y));
              }
              if (e.shape) ctx.closePath();
            }
            break;

          case 'CIRCLE':
            if (e.center && e.radius) {
              ctx.arc(tx(e.center.x), ty(e.center.y), e.radius * scale, 0, Math.PI * 2);
            }
            break;

          case 'ARC':
            if (e.center && e.radius) {
              const startAngle = ((e.startAngle || 0) * Math.PI) / 180;
              const endAngle = ((e.endAngle || 360) * Math.PI) / 180;
              ctx.arc(tx(e.center.x), ty(e.center.y), e.radius * scale, -endAngle, -startAngle);
            }
            break;

          case 'ELLIPSE':
            if (e.center && e.majorAxisEndPoint && e.axisRatio) {
              const rx = Math.sqrt(e.majorAxisEndPoint.x ** 2 + e.majorAxisEndPoint.y ** 2) * scale;
              const ry = rx * e.axisRatio;
              const rotation = Math.atan2(e.majorAxisEndPoint.y, e.majorAxisEndPoint.x);
              ctx.ellipse(tx(e.center.x), ty(e.center.y), rx, ry, rotation, 0, Math.PI * 2);
            }
            break;

          case 'SPLINE':
            if (e.controlPoints && e.controlPoints.length > 1) {
              ctx.moveTo(tx(e.controlPoints[0].x), ty(e.controlPoints[0].y));
              for (let i = 1; i < e.controlPoints.length; i++) {
                ctx.lineTo(tx(e.controlPoints[i].x), ty(e.controlPoints[i].y));
              }
            }
            break;

          case 'POINT':
            if (e.position) {
              ctx.arc(tx(e.position.x), ty(e.position.y), 2, 0, Math.PI * 2);
              ctx.fillStyle = ctx.strokeStyle;
              ctx.fill();
            }
            break;

          case 'TEXT':
          case 'MTEXT':
            if (e.position && e.text) {
              ctx.font = `${(e.height || 12) * scale}px Arial`;
              ctx.fillStyle = ctx.strokeStyle;
              ctx.fillText(e.text, tx(e.position.x), ty(e.position.y));
            }
            break;
        }

        ctx.stroke();
      }
    }

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);

    // Create preview
    await sharp(outputPath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .toFile(previewPath);

    return {
      success: true,
      outputPath,
      previewPath,
      width: canvasWidth,
      height: canvasHeight,
    };
  } catch (error) {
    logger.error('DXF conversion error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get AutoCAD color from color index
 */
function getAcadColor(colorIndex: number): string {
  const colors: Record<number, string> = {
    0: '#000000', // ByBlock
    1: '#FF0000', // Red
    2: '#FFFF00', // Yellow
    3: '#00FF00', // Green
    4: '#00FFFF', // Cyan
    5: '#0000FF', // Blue
    6: '#FF00FF', // Magenta
    7: '#000000', // White/Black
    8: '#808080', // Gray
    9: '#C0C0C0', // Light Gray
  };
  return colors[colorIndex] || '#000000';
}

/**
 * Main conversion function - routes to appropriate converter
 */
export async function convertFloorPlan(
  inputPath: string,
  outputDir: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const ext = path.extname(inputPath).toLowerCase();

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  switch (ext) {
    case '.jpg':
    case '.jpeg':
    case '.png':
    case '.webp':
      return convertImage(inputPath, outputDir, options);

    case '.pdf':
      return convertPDF(inputPath, outputDir, options);

    case '.dxf':
      return convertDXF(inputPath, outputDir, options);

    case '.dwg':
      // DWG is coming soon - return special response
      return {
        success: false,
        error: 'DWG format coming soon',
        comingSoon: true,
      };

    default:
      return { success: false, error: `Unsupported file format: ${ext}` };
  }
}
