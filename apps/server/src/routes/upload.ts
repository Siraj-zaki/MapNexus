/**
 * Upload Routes
 * Handles floor plan file uploads and conversion
 */

import { Request, Response, Router } from 'express';
import fs from 'fs/promises';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { convertFloorPlan } from '../services/conversion.js';
import { saveFile } from '../services/customTable/uploadService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // .dwg coming soon
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.dxf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Store conversion jobs in memory (use Redis in production)
const conversionJobs: Map<
  string,
  {
    id: string;
    originalName: string;
    status: 'pending' | 'converting' | 'ready' | 'error';
    progress: number;
    result?: {
      outputUrl: string;
      previewUrl: string;
      width: number;
      height: number;
    };
    error?: string;
  }
> = new Map();

/**
 * Upload single file
 * POST /api/upload/file
 */
router.post('/file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const originalName = req.file.originalname;

    // Create job
    conversionJobs.set(jobId, {
      id: jobId,
      originalName,
      status: 'pending',
      progress: 0,
    });

    // Return job ID immediately
    res.json({
      success: true,
      data: {
        jobId,
        originalName,
        status: 'pending',
      },
    });

    // Start conversion in background
    processConversion(jobId, req.file.path, originalName);
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * Upload multiple files
 * POST /api/upload/files
 */
router.post('/files', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const jobs = [];

    for (const file of files) {
      const jobId = uuidv4();

      conversionJobs.set(jobId, {
        id: jobId,
        originalName: file.originalname,
        status: 'pending',
        progress: 0,
      });

      jobs.push({
        jobId,
        originalName: file.originalname,
        status: 'pending',
      });

      // Start conversion in background
      processConversion(jobId, file.path, file.originalname);
    }

    res.json({
      success: true,
      data: { jobs },
    });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * Get conversion job status
 * GET /api/upload/status/:jobId
 */
router.get('/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = conversionJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  res.json({
    success: true,
    data: job,
  });
});

/**
 * Get all jobs status
 * GET /api/upload/status
 */
router.get('/status', (req: Request, res: Response) => {
  const { ids } = req.query;

  if (ids && typeof ids === 'string') {
    const jobIds = ids.split(',');
    const jobs = jobIds.map((id) => conversionJobs.get(id)).filter(Boolean);
    return res.json({ success: true, data: { jobs } });
  }

  const allJobs = Array.from(conversionJobs.values());
  res.json({ success: true, data: { jobs: allJobs } });
});

/**
 * Get preview image
 * GET /api/upload/preview/:jobId
 */
router.get('/preview/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = conversionJobs.get(jobId);

  if (!job || job.status !== 'ready') {
    return res.status(404).json({ success: false, error: 'Preview not found' });
  }

  // Look for preview file in the job's output directory
  const jobDir = path.join(process.cwd(), 'uploads', 'converted', jobId);

  try {
    const files = await fs.readdir(jobDir);
    const previewFile = files.find((f) => f.includes('_preview'));

    if (!previewFile) {
      return res.status(404).json({ success: false, error: 'Preview file not found' });
    }

    const previewPath = path.join(jobDir, previewFile);
    res.sendFile(previewPath);
  } catch (error) {
    logger.error('Preview error:', error);
    res.status(404).json({ success: false, error: 'Preview file not found' });
  }
});

/**
 * Get full converted image
 * GET /api/upload/image/:jobId
 */
router.get('/image/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = conversionJobs.get(jobId);

  if (!job || job.status !== 'ready') {
    return res.status(404).json({ success: false, error: 'Image not found' });
  }

  // Look for output file in the job's output directory (exclude preview files)
  const jobDir = path.join(process.cwd(), 'uploads', 'converted', jobId);

  try {
    const files = await fs.readdir(jobDir);
    const imageFile = files.find((f) => f.endsWith('.png') && !f.includes('_preview'));

    if (!imageFile) {
      return res.status(404).json({ success: false, error: 'Image file not found' });
    }

    const imagePath = path.join(jobDir, imageFile);
    res.sendFile(imagePath);
  } catch (error) {
    logger.error('Image error:', error);
    res.status(404).json({ success: false, error: 'Image file not found' });
  }
});

/**
 * Upload generic file (for custom tables)
 * POST /api/upload/generic
 */
router.post('/generic', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = req.file;
    // We can use the memory buffer here since we configured multer to use disk storage but we can read it?
    // Wait, the existing multer configuration uses diskStorage. req.file.buffer will be undefined.
    // We should read the file from disk using fs.readFile if we want to use saveFile which expects buffer.
    // OR, we can just return the path since multer already saved it.

    // The existing multer saves to uploads/temp.
    // saveFile expects a buffer to save to uploads/.
    // Let's just move the file.

    const tempPath = req.file.path;
    const fileBuffer = await fs.readFile(tempPath);

    const result = await saveFile(fileBuffer, originalname, mimetype);

    // Delete temp file
    await fs.unlink(tempPath).catch(() => {});

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Generic upload error:', error);
    next(error);
  }
});

/**
 * Process conversion in background
 */
async function processConversion(jobId: string, filePath: string, originalName: string) {
  const job = conversionJobs.get(jobId);
  if (!job) return;

  try {
    // Update status
    job.status = 'converting';
    job.progress = 10;

    const outputDir = path.join(process.cwd(), 'uploads', 'converted', jobId);

    // Simulate progress updates
    job.progress = 30;

    // Convert file
    const result = await convertFloorPlan(filePath, outputDir);

    job.progress = 90;

    if (result.success && result.outputPath && result.previewPath) {
      job.status = 'ready';
      job.progress = 100;
      job.result = {
        outputUrl: `/api/upload/image/${jobId}`,
        previewUrl: `/api/upload/preview/${jobId}`,
        width: result.width || 0,
        height: result.height || 0,
      };

      // Clean up temp file
      await fs.unlink(filePath).catch(() => {});
    } else if (result.comingSoon) {
      // DWG format - coming soon
      job.status = 'error';
      job.error = 'DWG format coming soon! Please convert to DXF and try again.';
      // Clean up temp file
      await fs.unlink(filePath).catch(() => {});
    } else {
      job.status = 'error';
      job.error = result.error || 'Conversion failed';
    }
  } catch (error) {
    logger.error('Conversion error:', error);
    job.status = 'error';
    job.error = (error as Error).message;
  }
}

export default router;
