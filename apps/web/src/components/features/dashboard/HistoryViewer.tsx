/**
 * HistoryViewer Component
 * Timeline view of record changes with diff viewer and restore functionality
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  User,
} from 'lucide-react';
import { useState } from 'react';

export interface HistoryEntry {
  id: string;
  recordId: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  previousData: Record<string, any> | null;
  changedFields?: string[];
  performedBy?: string;
  performedAt: string;
}

interface HistoryViewerProps {
  entries: HistoryEntry[];
  currentData?: Record<string, any>;
  onRestore?: (entry: HistoryEntry) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

export function HistoryViewer({
  entries,
  currentData,
  onRestore,
  isLoading = false,
  className,
}: HistoryViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoreEntry, setRestoreEntry] = useState<HistoryEntry | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Plus className="w-4 h-4" />;
      case 'UPDATE':
        return <Pencil className="w-4 h-4" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'UPDATE':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'DELETE':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString();
  };

  const handleRestore = async () => {
    if (!restoreEntry || !onRestore) return;

    setIsRestoring(true);
    try {
      await onRestore(restoreEntry);
      setRestoreEntry(null);
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const renderDiff = (entry: HistoryEntry) => {
    if (!entry.previousData) return null;

    const changedFields = entry.changedFields || Object.keys(entry.previousData);

    return (
      <div className="mt-3 space-y-2">
        <div className="text-xs font-medium text-neutral-400 mb-2">Changes</div>
        {changedFields.map((field) => {
          const oldValue = entry.previousData?.[field];
          const newValue = currentData?.[field];

          return (
            <div key={field} className="flex items-start gap-2 text-xs">
              <span className="font-medium text-neutral-300 min-w-[100px]">{field}:</span>
              <div className="flex items-center gap-2 flex-1">
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono">
                  {formatValue(oldValue)}
                </span>
                <ArrowRight className="w-3 h-3 text-neutral-500" />
                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">
                  {formatValue(newValue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value).substring(0, 50) + '...';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value).substring(0, 50);
  };

  if (isLoading) {
    return (
      <Card className={cn('bg-neutral-900 border-neutral-700 p-8', className)}>
        <div className="flex items-center justify-center gap-2 text-neutral-400">
          <History className="w-5 h-5 animate-spin" />
          <span>Loading history...</span>
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className={cn('bg-neutral-900 border-neutral-700 p-8', className)}>
        <div className="text-center text-neutral-500">
          <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No history available</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('bg-neutral-900 border-neutral-700', className)}>
        <div className="p-4 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Change History</h3>
            <Badge variant="outline" className="ml-auto">
              {entries.length} changes
            </Badge>
          </div>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="p-4">
            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-neutral-700" />

              {entries.map((entry, index) => {
                const isExpanded = expandedId === entry.id;

                return (
                  <div key={entry.id} className="relative pl-10 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-2 w-5 h-5 rounded-full flex items-center justify-center',
                        entry.operation === 'INSERT' && 'bg-green-500',
                        entry.operation === 'UPDATE' && 'bg-blue-500',
                        entry.operation === 'DELETE' && 'bg-red-500'
                      )}
                    >
                      {getOperationIcon(entry.operation)}
                    </div>

                    {/* Entry card */}
                    <Card className="bg-neutral-800/50 border-neutral-700">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getOperationColor(entry.operation)}>
                              {entry.operation}
                            </Badge>
                            <span className="text-sm text-neutral-300">
                              Record {entry.recordId.substring(0, 8)}...
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-neutral-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-500" />
                          )}
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.performedAt)}
                          </span>
                          {entry.performedBy && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.performedBy}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-neutral-700 mt-2 pt-3">
                          {entry.previousData && renderDiff(entry)}

                          {/* Restore button */}
                          {entry.operation !== 'INSERT' && entry.previousData && onRestore && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoreEntry(entry)}
                              className="mt-3"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Restore to this version
                            </Button>
                          )}

                          {/* Previous data preview */}
                          {entry.previousData && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-neutral-400 mb-2">
                                Previous State
                              </div>
                              <pre className="text-xs bg-neutral-900 p-2 rounded overflow-x-auto">
                                {JSON.stringify(entry.previousData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreEntry} onOpenChange={() => setRestoreEntry(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-700">
          <DialogHeader>
            <DialogTitle>Restore Record</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-300">
              Are you sure you want to restore this record to its previous state?
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              This will overwrite the current data with the values from{' '}
              {restoreEntry && formatDate(restoreEntry.performedAt)}.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreEntry(null)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? 'Restoring...' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default HistoryViewer;
