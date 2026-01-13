/**
 * UploadFloorPlans Page
 * Multi-file upload with drag & drop for floor plans
 * Uses real backend API for file conversion
 */

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  FileImage,
  FileText,
  GripVertical,
  HelpCircle,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Base URL without /api for serving images (since previewUrl includes full path)
const BASE_URL = API_URL.replace(/\/api$/, '');

// Accepted file extensions (.dwg coming soon)
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.dxf'];

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'uploading' | 'converting' | 'ready' | 'error';
  progress: number;
  floorName: string;
  level: number;
  jobId?: string;
  previewUrl?: string;
  imageUrl?: string;
  error?: string;
}

export default function UploadFloorPlans() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  // Process uploaded files
  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return ACCEPTED_EXTENSIONS.includes(ext);
    });

    const uploadedFiles: UploadedFile[] = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      name: file.name,
      type: file.type || getFileType(file.name),
      size: file.size,
      status: 'pending',
      progress: 0,
      floorName: generateFloorName(files.length + index),
      level: files.length + index + 1,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Upload and convert each file
    uploadedFiles.forEach((uf) => {
      uploadAndConvert(uf);
    });
  };

  // Get file type from extension
  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      pdf: 'application/pdf',
      dxf: 'application/dxf',
      dwg: 'application/dwg',
    };
    return typeMap[ext || ''] || 'application/octet-stream';
  };

  // Generate floor name
  const generateFloorName = (index: number): string => {
    if (index === 0) return 'Ground Floor';
    return `Floor ${index}`;
  };

  // Upload file and convert via API
  const uploadAndConvert = async (uploadedFile: UploadedFile) => {
    const fileId = uploadedFile.id;

    // Update status to uploading
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: 'uploading' as const, progress: 10 } : f))
    );

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      // Upload file
      const response = await fetch(`${API_URL}/upload/file`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      const jobId = result.data.jobId;

      // Update with job ID and start polling
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'converting' as const, progress: 30, jobId } : f
        )
      );

      // Poll for conversion status
      pollConversionStatus(fileId, jobId);
    } catch (error) {
      console.error('Upload error:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'error' as const, error: (error as Error).message } : f
        )
      );
    }
  };

  // Poll conversion status
  const pollConversionStatus = async (fileId: string, jobId: string) => {
    const maxAttempts = 60; // 60 seconds timeout
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/upload/status/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Status check failed');
        }

        const result = await response.json();
        const job = result.data;

        if (job.status === 'ready') {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: 'ready' as const,
                    progress: 100,
                    previewUrl: job.result?.previewUrl,
                    imageUrl: job.result?.outputUrl,
                  }
                : f
            )
          );
        } else if (job.status === 'error') {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: 'error' as const, error: job.error } : f
            )
          );
        } else {
          // Still processing
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, progress: job.progress || 50 } : f))
          );

          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? { ...f, status: 'error' as const, error: 'Conversion timeout' }
                  : f
              )
            );
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: 'error' as const, error: (error as Error).message }
              : f
          )
        );
      }
    };

    poll();
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Update floor name
  const updateFloorName = (fileId: string, name: string) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, floorName: name } : f)));
  };

  // Update level
  const updateLevel = (fileId: string, level: number) => {
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, level } : f)));
  };

  // Open preview - fetch image with auth token
  const openPreview = async (file: UploadedFile) => {
    setPreviewFile(file);
    setPreviewBlobUrl(null);
    setPreviewLoading(true);

    try {
      const response = await fetch(`${BASE_URL}${file.previewUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(blobUrl);
      } else {
        console.error('Failed to fetch preview:', response.status);
      }
    } catch (error) {
      console.error('Preview fetch error:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Clean up blob URL when dialog closes
  const closePreview = () => {
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewFile(null);
    setPreviewBlobUrl(null);
  };

  // Check if all files are ready
  const allReady = files.length > 0 && files.every((f) => f.status === 'ready');

  // Handle next step - navigate to address search
  const handleNext = () => {
    // Store floor data for later use in editor
    const floorData = files.map((f) => ({
      name: f.floorName,
      level: f.level,
      imageUrl: f.imageUrl,
    }));
    sessionStorage.setItem('uploadedFloors', JSON.stringify(floorData));

    // Navigate to address search to set location
    navigate('/address-search?source=upload');
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.includes('pdf') || type.includes('dxf') || type.includes('dwg')) {
      return <FileText className="h-5 w-5 text-blue-400" />;
    }
    return <FileImage className="h-5 w-5 text-green-400" />;
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <span className="text-xl font-semibold text-white">{t('common.appName')}</span>
        </div>
        <h1 className="text-lg font-medium text-white">{t('upload.title')}</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 me-2" />
            {t('upload.back')}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!allReady}
            className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
          >
            {t('upload.nextStep')}
            <ArrowRight className="h-4 w-4 ms-2" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Main Content */}
        <main className="flex-1 p-6">
          {files.length === 0 ? (
            /* Drop Zone */
            <div
              className={cn(
                'h-full flex items-center justify-center rounded-xl border-2 border-dashed transition-colors',
                isDragOver
                  ? 'border-cyan-400 bg-cyan-400/10'
                  : 'border-neutral-700 hover:border-neutral-600'
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <label className="flex flex-col items-center cursor-pointer p-12">
                <div className="relative mb-6">
                  <div className="w-24 h-28 bg-blue-100 rounded-lg rotate-[-8deg] absolute top-0 left-0" />
                  <div className="w-24 h-28 bg-white rounded-lg shadow-lg relative flex items-center justify-center">
                    <Upload className="h-10 w-10 text-cyan-500" />
                  </div>
                </div>
                <p className="text-lg font-medium text-cyan-400 mb-2">{t('upload.clickOrDrag')}</p>
                <p className="text-sm text-neutral-500 mb-1">
                  .jpg, .png, .pdf, .dxf, and .webp files
                </p>
                <p className="text-xs text-neutral-600">(.dwg coming soon)</p>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            /* File List */
            <div className="space-y-4">
              {/* Add More Zone */}
              <label
                className={cn(
                  'flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                  isDragOver
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-neutral-700 hover:border-neutral-600'
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-cyan-500" />
                </div>
                <span className="text-cyan-400 font-medium">
                  {t('upload.addMore')} <span className="text-neutral-500">(click or drag)</span>
                </span>
                <input
                  type="file"
                  multiple
                  accept={ACCEPTED_EXTENSIONS.join(',')}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm text-neutral-500">
                <div className="col-span-4">{t('upload.floorPlan')}</div>
                <div className="col-span-3">{t('upload.floorName')}</div>
                <div className="col-span-2">{t('upload.level')}</div>
                <div className="col-span-3">{t('upload.height')}</div>
              </div>

              {/* File Rows */}
              {files.map((file) => (
                <div
                  key={file.id}
                  className="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-700"
                >
                  {/* Drag Handle & File Info */}
                  <div className="col-span-4 flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-neutral-600 cursor-grab" />

                    {/* Status Indicator */}
                    {file.status === 'uploading' || file.status === 'converting' ? (
                      <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                    ) : file.status === 'ready' ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : file.status === 'error' ? (
                      <X className="h-4 w-4 text-red-400" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}

                    {getFileIcon(file.type)}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      {(file.status === 'uploading' || file.status === 'converting') && (
                        <div className="mt-1 h-1 bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 transition-all"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}
                      {file.status === 'error' && (
                        <p className="text-xs text-red-400 mt-1">{file.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Floor Name */}
                  <div className="col-span-3">
                    <Input
                      value={file.floorName}
                      onChange={(e) => updateFloorName(file.id, e.target.value)}
                      className="bg-neutral-700 border-neutral-600 text-white h-9"
                    />
                  </div>

                  {/* Level */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={file.level}
                      onChange={(e) => updateLevel(file.id, parseInt(e.target.value) || 0)}
                      className="bg-neutral-700 border-neutral-600 text-white h-9"
                    />
                  </div>

                  {/* Height & Actions */}
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      defaultValue="9.5"
                      className="bg-neutral-700 border-neutral-600 text-white h-9 w-20"
                    />
                    <span className="text-neutral-500 text-sm">ft</span>

                    {/* Preview Button */}
                    {file.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPreview(file)}
                        className="h-8 w-8 text-cyan-400 hover:text-cyan-300"
                        title={t('upload.preview')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      className="h-8 w-8 text-neutral-500 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 border-s border-neutral-800 p-6 space-y-6">
          {/* Tutorial */}
          <div className="flex items-start gap-3">
            <Play className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-white font-medium">{t('upload.watchTutorial')}</p>
            </div>
          </div>

          {/* Tips Section */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-white font-medium mb-2">{t('upload.forBestMapping')}</p>
                <ul className="space-y-1 text-sm text-neutral-400">
                  <li>• {t('upload.tip1')}</li>
                  <li>• {t('upload.tip2')}</li>
                  <li>• {t('upload.tip3')}</li>
                  <li>• {t('upload.tip4')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Multi-building */}
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-2">{t('upload.multiBuilding')}</p>
              <ul className="space-y-1 text-sm text-neutral-400">
                <li>• {t('upload.multi1')}</li>
                <li>• {t('upload.multi2')}</li>
                <li>• {t('upload.multi3')}</li>
              </ul>
            </div>
          </div>

          {/* No floor plans */}
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-2">{t('upload.noFloorPlans')}</p>
              <ul className="space-y-1 text-sm text-neutral-400">
                <li>• {t('upload.noFloor1')}</li>
                <li>• {t('upload.noFloor2')}</li>
                <li>• {t('upload.noFloor3')}</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-neutral-800 text-center">
        <p className="text-xs text-neutral-500">
          {t('upload.termsText')}{' '}
          <a href="#" className="text-cyan-400 hover:underline">
            {t('upload.termsLink')}
          </a>
        </p>
      </footer>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={closePreview}>
        <DialogContent className="max-w-4xl bg-neutral-900 border-neutral-700">
          <div className="text-center">
            <h3 className="text-lg font-medium text-white mb-4">
              {previewFile?.floorName} - {t('upload.preview')}
            </h3>
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
              </div>
            ) : previewBlobUrl ? (
              <img
                src={previewBlobUrl}
                alt={previewFile?.floorName}
                className="max-w-full max-h-[60vh] mx-auto rounded-lg border border-neutral-700"
              />
            ) : (
              <p className="text-neutral-400 py-8">Failed to load preview</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
