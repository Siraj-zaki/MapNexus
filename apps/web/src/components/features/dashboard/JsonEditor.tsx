/**
 * JsonEditor Component
 * JSON editing with syntax validation, formatting, and templates
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clipboard,
  Code,
  Copy,
  FileJson,
  Wand2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface JsonEditorProps {
  value: object | string | null;
  onChange: (value: object | null) => void;
  height?: number;
  placeholder?: string;
  templates?: JsonTemplate[];
  disabled?: boolean;
  className?: string;
}

interface JsonTemplate {
  name: string;
  description?: string;
  value: object;
}

// Default IoT sensor templates
const DEFAULT_IOT_TEMPLATES: JsonTemplate[] = [
  {
    name: 'Temperature Sensor',
    description: 'Basic temperature reading',
    value: {
      value: 22.5,
      unit: 'celsius',
      timestamp: new Date().toISOString(),
      status: 'normal',
    },
  },
  {
    name: 'Humidity Sensor',
    description: 'Humidity percentage reading',
    value: {
      value: 65,
      unit: 'percent',
      timestamp: new Date().toISOString(),
      status: 'normal',
    },
  },
  {
    name: 'Motion Sensor',
    description: 'Motion detection event',
    value: {
      detected: true,
      zone: 'A',
      sensitivity: 'high',
      timestamp: new Date().toISOString(),
    },
  },
  {
    name: 'Door Sensor',
    description: 'Door open/close status',
    value: {
      state: 'closed',
      locked: true,
      battery: 95,
      lastActivity: new Date().toISOString(),
    },
  },
  {
    name: 'Device Config',
    description: 'IoT device configuration',
    value: {
      interval: 60,
      threshold_min: 0,
      threshold_max: 100,
      alerts_enabled: true,
      notifications: ['email', 'push'],
    },
  },
];

export function JsonEditor({
  value,
  onChange,
  height = 200,
  placeholder = '{\n  \n}',
  templates = DEFAULT_IOT_TEMPLATES,
  disabled = false,
  className,
}: JsonEditorProps) {
  const [textValue, setTextValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);

  // Initialize text value from prop
  useEffect(() => {
    if (value === null || value === undefined) {
      setTextValue('');
    } else if (typeof value === 'string') {
      setTextValue(value);
    } else {
      setTextValue(JSON.stringify(value, null, 2));
    }
  }, [value]);

  // Validate JSON as user types
  const validateJson = useCallback((text: string) => {
    if (!text.trim()) {
      setError(null);
      setIsValid(true);
      return null;
    }

    try {
      const parsed = JSON.parse(text);
      setError(null);
      setIsValid(true);
      return parsed;
    } catch (e: any) {
      const errorMatch = e.message.match(/at position (\d+)/);
      const position = errorMatch ? parseInt(errorMatch[1]) : null;

      let errorMsg = 'Invalid JSON';
      if (e.message.includes('Unexpected token')) {
        const tokenMatch = e.message.match(/Unexpected token '?(.)'?/);
        if (tokenMatch) {
          errorMsg = `Unexpected character '${tokenMatch[1]}'`;
        }
      } else if (e.message.includes('Unexpected end')) {
        errorMsg = 'Incomplete JSON structure';
      }

      if (position) {
        const lines = text.substring(0, position).split('\n');
        errorMsg += ` at line ${lines.length}`;
      }

      setError(errorMsg);
      setIsValid(false);
      return null;
    }
  }, []);

  // Handle text change
  const handleChange = (text: string) => {
    setTextValue(text);
    const parsed = validateJson(text);
    if (parsed !== null) {
      onChange(parsed);
    }
  };

  // Format/prettify JSON
  const handleFormat = () => {
    if (!textValue.trim()) return;

    try {
      const parsed = JSON.parse(textValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setTextValue(formatted);
      setError(null);
      setIsValid(true);
    } catch (e) {
      // Keep invalid state
    }
  };

  // Minify JSON
  const handleMinify = () => {
    if (!textValue.trim()) return;

    try {
      const parsed = JSON.parse(textValue);
      const minified = JSON.stringify(parsed);
      setTextValue(minified);
    } catch (e) {
      // Keep invalid state
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    await navigator.clipboard.writeText(textValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleChange(text);
    } catch (e) {
      console.error('Paste failed:', e);
    }
  };

  // Apply template
  const applyTemplate = (template: JsonTemplate) => {
    const text = JSON.stringify(template.value, null, 2);
    setTextValue(text);
    setError(null);
    setIsValid(true);
    onChange(template.value);
  };

  // Clear editor
  const handleClear = () => {
    setTextValue('');
    setError(null);
    setIsValid(true);
    onChange(null);
  };

  return (
    <Card className={cn('bg-neutral-900 border-neutral-700 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 bg-neutral-800/50">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-neutral-300">JSON Editor</span>
          {isValid && textValue.trim() && <Check className="w-4 h-4 text-green-400" />}
          {!isValid && <X className="w-4 h-4 text-red-400" />}
        </div>

        <div className="flex items-center gap-1">
          {/* Templates dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2" disabled={disabled}>
                <Wand2 className="w-4 h-4 mr-1" />
                Templates
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-neutral-800 border-neutral-700">
              <DropdownMenuLabel>IoT Templates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templates.map((template, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() => applyTemplate(template)}
                  className="flex flex-col items-start"
                >
                  <span className="font-medium">{template.name}</span>
                  {template.description && (
                    <span className="text-xs text-neutral-500">{template.description}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Format button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={disabled || !textValue.trim()}
            className="h-7 px-2"
            title="Format JSON"
          >
            <Code className="w-4 h-4" />
          </Button>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!textValue}
            className="h-7 px-2"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>

          {/* Paste button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            disabled={disabled}
            className="h-7 px-2"
            title="Paste from clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </Button>

          {/* Clear button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled || !textValue}
            className="h-7 px-2 text-red-400 hover:text-red-300"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <Textarea
          value={textValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'font-mono text-sm bg-neutral-950 border-0 rounded-none resize-none focus-visible:ring-0',
            !isValid && 'text-red-400'
          )}
          style={{ height, minHeight: height }}
        />

        {/* Line numbers overlay (simplified) */}
        <div className="absolute left-0 top-0 pointer-events-none select-none">
          <div className="text-xs text-neutral-600 font-mono px-2 pt-2 leading-[21px]">
            {textValue.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 border-t border-red-500/30 bg-red-500/10 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t border-neutral-700 bg-neutral-800/50 flex items-center justify-between text-xs text-neutral-500">
        <span>
          {textValue.length} characters • {textValue.split('\n').length} lines
        </span>
        <span>{isValid ? 'Valid JSON' : 'Invalid JSON'}</span>
      </div>
    </Card>
  );
}

export default JsonEditor;
