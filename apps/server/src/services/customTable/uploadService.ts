/**
 * Upload Service
 * Handles uploading files to local storage (or cloud in future)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface UploadResult {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * Save uploaded file buffer to disk
 */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<UploadResult> {
  const ext = path.extname(originalName);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const filename = `${hash}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Write file
  await fs.promises.writeFile(filePath, buffer);

  // Return URL (assuming static file serving is set up for /uploads)
  // We'll map /api/uploads or just use relative path if frontend handles base URL
  const url = `/uploads/${filename}`;

  return {
    filename,
    originalName,
    mimeType,
    size: buffer.length,
    url,
  };
}
