/**
 * DynamicDataForm Component
 * Dynamic form for creating/editing records in custom tables
 */

import { CustomTable, insertTableRecord, updateTableRecord } from '@/api/customTables';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Save, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DynamicDataFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  table: CustomTable;
  record?: any; // For editing
}

export function DynamicDataForm({
  isOpen,
  onClose,
  onSuccess,
  table,
  record,
}: DynamicDataFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!record?.id;

  // Initialize form data
  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    } else {
      // Set defaults for new record
      const defaults: Record<string, any> = {};
      table.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        } else if (field.dataType === 'BOOLEAN') {
          defaults[field.name] = false;
        }
      });
      setFormData(defaults);
    }
    setErrors({});
  }, [record, table.fields, isOpen]);

  // Get editable fields (exclude system fields)
  const editableFields = table.fields.filter(
    (f) => !['id', 'created_at', 'updated_at', 'created_by', 'updated_by'].includes(f.name)
  );

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when field is modified
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    editableFields.forEach((field) => {
      const value = formData[field.name];

      // Required check
      if (field.isRequired && (value === undefined || value === null || value === '')) {
        newErrors[field.name] = `${field.displayName} is required`;
        return;
      }

      // Type-specific validation
      if (value !== undefined && value !== null && value !== '') {
        if (field.dataType === 'INTEGER' || field.dataType === 'BIGINT') {
          if (isNaN(parseInt(value))) {
            newErrors[field.name] = 'Must be a valid integer';
          }
        } else if (field.dataType === 'DECIMAL' || field.dataType === 'FLOAT') {
          if (isNaN(parseFloat(value))) {
            newErrors[field.name] = 'Must be a valid number';
          }
        } else if (field.dataType === 'JSONB') {
          try {
            JSON.parse(value);
          } catch {
            newErrors[field.name] = 'Must be valid JSON';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Prepare data for submission
      const submitData: Record<string, any> = {};
      editableFields.forEach((field) => {
        let value = formData[field.name];

        // Type conversions
        if (value !== undefined && value !== null && value !== '') {
          if (field.dataType === 'INTEGER' || field.dataType === 'BIGINT') {
            value = parseInt(value);
          } else if (field.dataType === 'DECIMAL' || field.dataType === 'FLOAT') {
            value = parseFloat(value);
          } else if (field.dataType === 'JSONB' && typeof value === 'string') {
            value = JSON.parse(value);
          }
        } else if (value === '') {
          value = null;
        }

        submitData[field.name] = value;
      });

      if (isEditing) {
        await updateTableRecord(table.name, record.id, submitData);
      } else {
        await insertTableRecord(table.name, submitData);
      }

      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Failed to save record');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: {
    name: string;
    displayName: string;
    dataType: string;
    maxLength?: number;
  }) => {
    const value = formData[field.name];
    const error = errors[field.name];
    const commonInputClass = error ? 'border-destructive' : '';

    switch (field.dataType) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
            />
            <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
          </div>
        );

      case 'TEXT':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            className={`min-h-[80px] resize-none ${commonInputClass}`}
          />
        );

      case 'INTEGER':
      case 'BIGINT':
        return (
          <Input
            type="number"
            step="1"
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder="0"
            className={commonInputClass}
          />
        );

      case 'DECIMAL':
      case 'FLOAT':
        return (
          <Input
            type="number"
            step="any"
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder="0.00"
            className={commonInputClass}
          />
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={value ? value.split('T')[0] : ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={commonInputClass}
          />
        );

      case 'TIMESTAMP':
      case 'TIMESTAMPTZ':
        return (
          <Input
            type="datetime-local"
            value={value ? value.slice(0, 16) : ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={commonInputClass}
          />
        );

      case 'JSONB':
        return (
          <Textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder='{"key": "value"}'
            className={`min-h-[100px] font-mono text-xs ${commonInputClass}`}
          />
        );

      case 'GEOMETRY_POINT':
      case 'GEOMETRY_POLYGON':
      case 'GEOMETRY_LINESTRING':
      case 'GEOMETRY_MULTIPOINT':
      case 'GEOMETRY_MULTIPOLYGON':
        return (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Geometry Input</p>
                  <p className="text-xs">Map-based input coming soon. Enter GeoJSON manually:</p>
                </div>
              </div>
              <Textarea
                value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
                onChange={(e) => {
                  try {
                    handleChange(field.name, JSON.parse(e.target.value));
                  } catch {
                    handleChange(field.name, e.target.value);
                  }
                }}
                placeholder='{"type": "Point", "coordinates": [0, 0]}'
                className={`mt-3 min-h-[80px] font-mono text-xs ${commonInputClass}`}
              />
            </CardContent>
          </Card>
        );

      case 'IOT_SENSOR':
        return (
          <Card className="border-dashed">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-muted-foreground mb-3">
                <Wifi className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">IoT Sensor Data</p>
                  <p className="text-xs">Enter sensor reading as JSON</p>
                </div>
              </div>
              <Textarea
                value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value || ''}
                onChange={(e) => {
                  try {
                    handleChange(field.name, JSON.parse(e.target.value));
                  } catch {
                    handleChange(field.name, e.target.value);
                  }
                }}
                placeholder='{"value": 22.5, "timestamp": "2024-01-01T12:00:00Z"}'
                className={`min-h-[80px] font-mono text-xs ${commonInputClass}`}
              />
            </CardContent>
          </Card>
        );

      case 'UUID':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className={`font-mono ${commonInputClass}`}
          />
        );

      default: // VARCHAR and others
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            maxLength={field.maxLength}
            className={commonInputClass}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Record' : 'Add New Record'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editing record in ${table.displayName}`
              : `Add a new record to ${table.displayName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {editableFields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label className="flex items-center gap-2">
                {field.displayName}
                {field.isRequired && <span className="text-destructive">*</span>}
              </Label>
              {renderField(field)}
              {errors[field.name] && (
                <p className="text-xs text-destructive">{errors[field.name]}</p>
              )}
              {field.dataType === 'VARCHAR' && field.maxLength && (
                <p className="text-xs text-muted-foreground">Max {field.maxLength} characters</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
