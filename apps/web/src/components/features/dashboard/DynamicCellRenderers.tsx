/**
 * Dynamic Cell Renderers
 * Specialized cell components for different data types in dynamic tables
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Check,
  Copy,
  ExternalLink,
  File,
  FileText,
  FileVideo,
  Image as ImageIcon,
  MapPin,
  X,
} from 'lucide-react';

// ============================================================================
// TEXT CELL
// ============================================================================

interface TextCellProps {
  value: string | null;
  maxLength?: number;
  className?: string;
}

export function TextCell({ value, maxLength = 50, className }: TextCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const truncated = value.length > maxLength;
  const displayValue = truncated ? `${value.substring(0, maxLength)}...` : value;

  if (truncated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('cursor-help', className)}>{displayValue}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="break-words">{value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return <span className={className}>{displayValue}</span>;
}

// ============================================================================
// NUMBER CELL
// ============================================================================

interface NumberCellProps {
  value: number | null;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function NumberCell({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className,
}: NumberCellProps) {
  if (value === null || value === undefined) return <span className="text-neutral-500">—</span>;

  const formatted = typeof value === 'number' ? value.toFixed(decimals) : value;

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// ============================================================================
// CURRENCY CELL
// ============================================================================

interface CurrencyCellProps {
  value: number | null;
  currency?: string;
  className?: string;
}

export function CurrencyCell({ value, currency = '$', className }: CurrencyCellProps) {
  if (value === null || value === undefined) return <span className="text-neutral-500">—</span>;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

  return (
    <span className={cn('font-mono tabular-nums text-green-400', className)}>{formatted}</span>
  );
}

// ============================================================================
// BOOLEAN CELL
// ============================================================================

interface BooleanCellProps {
  value: boolean | null;
  trueLabel?: string;
  falseLabel?: string;
  className?: string;
}

export function BooleanCell({
  value,
  trueLabel = 'Yes',
  falseLabel = 'No',
  className,
}: BooleanCellProps) {
  if (value === null || value === undefined) return <span className="text-neutral-500">—</span>;

  return value ? (
    <Badge
      variant="outline"
      className={cn('bg-green-500/20 text-green-400 border-green-500/30', className)}
    >
      <Check className="w-3 h-3 mr-1" />
      {trueLabel}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className={cn('bg-red-500/20 text-red-400 border-red-500/30', className)}
    >
      <X className="w-3 h-3 mr-1" />
      {falseLabel}
    </Badge>
  );
}

// ============================================================================
// DATE CELL
// ============================================================================

interface DateCellProps {
  value: string | Date | null;
  format?: 'date' | 'datetime' | 'time' | 'relative';
  className?: string;
}

export function DateCell({ value, format = 'date', className }: DateCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const date = typeof value === 'string' ? new Date(value) : value;

  if (isNaN(date.getTime())) return <span className="text-neutral-500">Invalid date</span>;

  let formatted: string;

  switch (format) {
    case 'datetime':
      formatted = date.toLocaleString();
      break;
    case 'time':
      formatted = date.toLocaleTimeString();
      break;
    case 'relative':
      const diff = Date.now() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) formatted = 'Today';
      else if (days === 1) formatted = 'Yesterday';
      else if (days < 7) formatted = `${days} days ago`;
      else formatted = date.toLocaleDateString();
      break;
    default:
      formatted = date.toLocaleDateString();
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('text-neutral-300', className)}>{formatted}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{date.toISOString()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// GEOMETRY CELL
// ============================================================================

interface GeometryCellProps {
  value: { type: string; coordinates: number[] | number[][] | number[][][] } | null;
  onClick?: () => void;
  className?: string;
}

export function GeometryCell({ value, onClick, className }: GeometryCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const getLabel = () => {
    switch (value.type) {
      case 'Point':
        const [lng, lat] = value.coordinates as number[];
        return `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`;
      case 'Polygon':
        const rings = value.coordinates as number[][][];
        return `${rings[0]?.length || 0} vertices`;
      case 'LineString':
        const points = value.coordinates as number[][];
        return `${points?.length || 0} points`;
      default:
        return value.type;
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn('h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20', className)}
    >
      <MapPin className="w-3 h-3 mr-1" />
      {getLabel()}
    </Button>
  );
}

// ============================================================================
// JSON CELL
// ============================================================================

interface JsonCellProps {
  value: object | null;
  maxKeys?: number;
  onClick?: () => void;
  className?: string;
}

export function JsonCell({ value, maxKeys = 3, onClick, className }: JsonCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const keys = Object.keys(value);
  const preview = keys.slice(0, maxKeys).join(', ');
  const hasMore = keys.length > maxKeys;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className={cn(
              'h-7 px-2 font-mono text-xs text-purple-400 hover:text-purple-300',
              className
            )}
          >
            {'{'}
            {preview}
            {hasMore && '...'}
            {'}'}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-md">
          <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// TAGS CELL
// ============================================================================

interface TagsCellProps {
  value: string[] | null;
  maxTags?: number;
  colorMap?: Record<string, string>;
  className?: string;
}

export function TagsCell({ value, maxTags = 3, colorMap = {}, className }: TagsCellProps) {
  if (!value || value.length === 0) return <span className="text-neutral-500">—</span>;

  const displayTags = value.slice(0, maxTags);
  const remaining = value.length - maxTags;

  const getTagColor = (tag: string) => {
    if (colorMap[tag]) return colorMap[tag];
    // Generate consistent color from tag string
    const hash = tag.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    const colors = [
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-green-500/20 text-green-400 border-green-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayTags.map((tag, index) => (
        <Badge key={index} variant="outline" className={cn('text-xs', getTagColor(tag))}>
          {tag}
        </Badge>
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs bg-neutral-700/50 text-neutral-400">
                +{remaining}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{value.slice(maxTags).join(', ')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ============================================================================
// FILE CELL
// ============================================================================

interface FileCellProps {
  value: string | { url: string; name?: string; type?: string; size?: number } | null;
  showThumbnail?: boolean;
  className?: string;
}

export function FileCell({ value, showThumbnail = true, className }: FileCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const fileData = typeof value === 'string' ? { url: value, name: value.split('/').pop() } : value;
  const { url, name, type, size } = fileData;

  const isImage = type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
  const isVideo = type?.startsWith('video/') || /\.(mp4|webm|mov|avi)$/i.test(url);
  const isPdf = type === 'application/pdf' || /\.pdf$/i.test(url);

  const getIcon = () => {
    if (isImage) return <ImageIcon className="w-4 h-4" />;
    if (isVideo) return <FileVideo className="w-4 h-4" />;
    if (isPdf) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showThumbnail && isImage ? (
        <div className="w-8 h-8 rounded overflow-hidden bg-neutral-800 flex-shrink-0">
          <img src={url} alt={name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0">
          {getIcon()}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 truncate flex items-center gap-1"
        >
          {name || 'File'}
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
        {size && <span className="text-xs text-neutral-500">{formatSize(size)}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// STATUS CELL
// ============================================================================

interface StatusCellProps {
  value: string | null;
  statusConfig?: Record<string, { color: string; icon?: React.ReactNode }>;
  className?: string;
}

const defaultStatusConfig: Record<string, { color: string }> = {
  active: { color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  inactive: { color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' },
  pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  error: { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  warning: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  online: { color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  offline: { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  open: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  closed: { color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' },
  resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  info: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
};

export function StatusCell({ value, statusConfig = {}, className }: StatusCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const normalizedValue = value.toLowerCase();
  const config = statusConfig[normalizedValue] ||
    defaultStatusConfig[normalizedValue] || {
      color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
    };

  return (
    <Badge variant="outline" className={cn('capitalize', config.color, className)}>
      {value}
    </Badge>
  );
}

// ============================================================================
// UUID CELL
// ============================================================================

interface UuidCellProps {
  value: string | null;
  showCopy?: boolean;
  className?: string;
}

export function UuidCell({ value, showCopy = true, className }: UuidCellProps) {
  if (!value) return <span className="text-neutral-500">—</span>;

  const shortId = `${value.substring(0, 8)}...`;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('font-mono text-xs text-neutral-400 flex items-center gap-1', className)}
          >
            {shortId}
            {showCopy && (
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={handleCopy}>
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono">{value}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export const CellRenderers = {
  TextCell,
  NumberCell,
  CurrencyCell,
  BooleanCell,
  DateCell,
  GeometryCell,
  JsonCell,
  TagsCell,
  FileCell,
  StatusCell,
  UuidCell,
};

export default CellRenderers;
