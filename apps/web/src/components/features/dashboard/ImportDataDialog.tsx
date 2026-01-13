/**
 * Import Data Dialog
 * Handles file selection and uploading for data import
 */

import { ImportResult, importTableData } from '@/api/customTables';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomTable } from '@/types/customTable';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImportDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  table: CustomTable;
}

export function ImportDataDialog({ isOpen, onClose, onSuccess, table }: ImportDataDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const res = await importTableData(table.id, file);
      setResult(res);

      if (res.success) {
        // Wait a bit to show success before closing/refreshing
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      // Handle HTTP error (e.g. backend crash or specific error response that axios threw)
      // Check if it is a structured error from our backend
      const responseData = err.response?.data;
      if (
        responseData &&
        responseData.data &&
        typeof responseData.data === 'object' &&
        'errors' in responseData.data
      ) {
        // This allows us to display validation errors even if the status code was 400
        setResult(responseData.data);
      } else {
        setError(err.message || 'Import failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data: {table.displayName}</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file to import data.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!result?.success ? (
            <>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragActive
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  {file ? (
                    <div className="mt-2">
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="font-medium text-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        CSV, Excel (XLSX), or JSON files only
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Validation Errors */}
              {result?.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Validation Errors</p>
                  <ScrollArea className="h-[200px] border rounded-md p-2 bg-muted/30">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {result.errors.map((err, i) => (
                        <div key={i} className="pb-2 border-b last:border-0 border-white/5">
                          <p className="font-mono text-xs font-semibold text-foreground">
                            Row {err.row}
                          </p>
                          <ul className="list-disc list-inside pl-1 mt-1 space-y-0.5">
                            {Object.entries(err.errors).map(([field, msg]) => (
                              <li key={field}>
                                <span className="font-medium text-destructive">{field}</span>: {msg}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground text-center">
                    Total {result.totalRows} rows found. 0 imported.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-lg">Import Successful</h3>
                <p className="text-muted-foreground">
                  {result.importedCount} records imported successfully.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {!result?.success && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {result?.success ? (
            <Button
              onClick={() => {
                onSuccess();
                handleClose();
              }}
            >
              Close
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? 'Importing...' : 'Import Data'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
