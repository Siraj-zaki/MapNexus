/**
 * Edit Table Dialog
 * Allows adding new fields to an existing custom table
 */

import { addTableField, CustomTable } from '@/api/customTables';
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomFieldDefinition } from '@/types/customTable';
import { MapPin, Plus, Save, Trash2, Wifi } from 'lucide-react';
import { useState } from 'react';

const DATA_TYPES = [
  { value: 'TEXT', label: 'Text', group: 'Text' },
  { value: 'VARCHAR', label: 'Varchar', group: 'Text', requiresLength: true },
  { value: 'INTEGER', label: 'Integer', group: 'Number' },
  { value: 'BIGINT', label: 'Big Integer', group: 'Number' },
  { value: 'DECIMAL', label: 'Decimal', group: 'Number', requiresPrecision: true },
  { value: 'FLOAT', label: 'Float', group: 'Number' },
  { value: 'BOOLEAN', label: 'Boolean', group: 'Boolean' },
  { value: 'DATE', label: 'Date', group: 'Date' },
  { value: 'TIMESTAMP', label: 'Timestamp', group: 'Date' },
  { value: 'TIMESTAMPTZ', label: 'Timestamp (TZ)', group: 'Date' },
  { value: 'GEOMETRY_POINT', label: 'Point', group: 'Spatial', requiresGeometry: true },
  { value: 'GEOMETRY_POLYGON', label: 'Polygon', group: 'Spatial', requiresGeometry: true },
  { value: 'GEOMETRY_LINESTRING', label: 'LineString', group: 'Spatial', requiresGeometry: true },
  { value: 'IOT_SENSOR', label: 'IoT Sensor', group: 'IoT', requiresIoT: true },
  { value: 'IMAGE', label: 'Image', group: 'Media' },
  { value: 'COLOR', label: 'Color', group: 'UI' },
  { value: 'SELECT', label: 'Select (Enum)', group: 'UI', requiresOptions: true },
  { value: 'RELATION', label: 'Relation', group: 'Data', requiresRelation: true },
  { value: 'JSONB', label: 'JSONB', group: 'Other' },
  { value: 'UUID', label: 'UUID', group: 'Other' },
];

const getDefaultGeometryType = (dataType: string): string => {
  const map: Record<string, string> = {
    GEOMETRY_POINT: 'POINT',
    GEOMETRY_POLYGON: 'POLYGON',
    GEOMETRY_LINESTRING: 'LINESTRING',
    GEOMETRY_MULTIPOINT: 'MULTIPOINT',
    GEOMETRY_MULTIPOLYGON: 'MULTIPOLYGON',
  };
  return map[dataType] || 'POINT';
};

interface EditTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  table: CustomTable;
}

export function EditTableDialog({ isOpen, onClose, onSuccess, table }: EditTableDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newFields, setNewFields] = useState<CustomFieldDefinition[]>([]);

  const handleClose = () => {
    setNewFields([]);
    onClose();
  };

  const addField = () => {
    // Calculate max order from existing + new fields
    const maxOrder = Math.max(
      ...table.fields.map((f) => f.order || 0),
      ...newFields.map((f) => f.order || 0),
      0
    );

    setNewFields([
      ...newFields,
      {
        name: '',
        displayName: '',
        dataType: 'TEXT',
        isRequired: false,
        order: maxOrder + 1,
      },
    ]);
  };

  const removeField = (index: number) => {
    setNewFields(newFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<CustomFieldDefinition>) => {
    setNewFields(newFields.map((field, i) => (i === index ? { ...field, ...updates } : field)));
  };

  const handleSave = async () => {
    // Validate fields
    for (const field of newFields) {
      if (!field.name || !field.displayName) {
        alert('All fields must have a name and display name');
        return;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(field.name)) {
        alert(
          `Field "${field.displayName}" has invalid name. Use lowercase, numbers, and underscores only.`
        );
        return;
      }
      if (table.fields.some((f) => f.name === field.name)) {
        alert(`Field name "${field.name}" already exists in table`);
        return;
      }
    }

    try {
      setLoading(true);

      // Add fields sequentially
      for (const field of newFields) {
        await addTableField(table.id, field);
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to update table:', error);
      alert(error.message || 'Failed to update table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Table Structure: {table.displayName}</DialogTitle>
          <DialogDescription>
            Add new fields to the table. Existing fields cannot be modified securely.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Existing Fields (Read-Only) */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Existing Fields</h3>
            <div className="border rounded-md divide-y">
              {table.fields.map((field) => (
                <div
                  key={field.id}
                  className="p-3 flex items-center justify-between text-sm bg-muted/30"
                >
                  <div>
                    <span className="font-medium">{field.displayName}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      ({field.name})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">{field.dataType}</span>
                    {field.isRequired && <span className="text-xs text-destructive">Required</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Fields */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">New Fields</h3>
              <Button onClick={addField} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {newFields.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No new fields added yet.</p>
                <Button variant="link" onClick={addField}>
                  Click to add a field
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {newFields.map((field, index) => (
                  <Card key={index} className="border-primary/20">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Row 1: Names */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Field name</Label>
                            <Input
                              placeholder="field_name"
                              value={field.name}
                              onChange={(e) => {
                                const value = e.target.value
                                  .toLowerCase()
                                  .replace(/\s+/g, '_')
                                  .replace(/[^a-z0-9_]/g, '');
                                updateField(index, { name: value });
                              }}
                              className="font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Display name</Label>
                            <Input
                              placeholder="Display Name"
                              value={field.displayName}
                              onChange={(e) => updateField(index, { displayName: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Row 2: Type and Options */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Data type</Label>
                            <Select
                              value={field.dataType}
                              onValueChange={(value) =>
                                updateField(index, { dataType: value as any })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  'Text',
                                  'Number',
                                  'Boolean',
                                  'Date',
                                  'Spatial',
                                  'IoT',
                                  'Media',
                                  'UI',
                                  'Data',
                                  'Other',
                                ].map((group) => (
                                  <SelectGroup key={group}>
                                    <SelectLabel>{group}</SelectLabel>
                                    {DATA_TYPES.filter((t) => t.group === group).map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Options</Label>
                            <div className="flex items-center gap-4 h-10">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.isRequired || false}
                                  onChange={(e) =>
                                    updateField(index, { isRequired: e.target.checked })
                                  }
                                  className="rounded"
                                />
                                Required
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={field.isUnique || false}
                                  onChange={(e) =>
                                    updateField(index, { isUnique: e.target.checked })
                                  }
                                  className="rounded"
                                />
                                Unique
                              </label>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeField(index)}
                                className="ml-auto text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Conditional: VARCHAR length */}
                        {field.dataType === 'VARCHAR' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Max length</Label>
                              <Input
                                type="number"
                                placeholder="255"
                                value={field.maxLength || ''}
                                onChange={(e) =>
                                  updateField(index, {
                                    maxLength: parseInt(e.target.value) || undefined,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Conditional: DECIMAL precision */}
                        {field.dataType === 'DECIMAL' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Precision</Label>
                              <Input
                                type="number"
                                placeholder="10"
                                value={field.precision || ''}
                                onChange={(e) =>
                                  updateField(index, {
                                    precision: parseInt(e.target.value) || undefined,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Scale</Label>
                              <Input
                                type="number"
                                placeholder="2"
                                value={field.scale || ''}
                                onChange={(e) =>
                                  updateField(index, {
                                    scale: parseInt(e.target.value) || undefined,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Conditional: Geometry */}
                        {field.dataType?.startsWith('GEOMETRY_') && (
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" />
                                SRID
                              </Label>
                              <Input
                                type="number"
                                placeholder="4326"
                                value={field.srid || 4326}
                                onChange={(e) =>
                                  updateField(index, { srid: parseInt(e.target.value) || 4326 })
                                }
                              />
                              <p className="text-xs text-muted-foreground">4326 = WGS 84 (GPS)</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Geometry type</Label>
                              <Select
                                value={field.geometryType || getDefaultGeometryType(field.dataType)}
                                onValueChange={(value) =>
                                  updateField(index, { geometryType: value as any })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[
                                    'POINT',
                                    'POLYGON',
                                    'LINESTRING',
                                    'MULTIPOINT',
                                    'MULTIPOLYGON',
                                  ].map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Conditional: IoT */}
                        {field.dataType === 'IOT_SENSOR' && (
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Wifi className="h-3.5 w-3.5" />
                                Sensor type
                              </Label>
                              <Input
                                placeholder="temperature"
                                value={(field.iotConfig as any)?.sensorType || ''}
                                onChange={(e) =>
                                  updateField(index, {
                                    iotConfig: {
                                      ...(field.iotConfig || {}),
                                      sensorType: e.target.value,
                                    },
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Unit</Label>
                              <Input
                                placeholder="°C"
                                value={(field.iotConfig as any)?.unit || ''}
                                onChange={(e) =>
                                  updateField(index, {
                                    iotConfig: { ...(field.iotConfig || {}), unit: e.target.value },
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Conditional: SELECT Options */}
                        {field.dataType === 'SELECT' && (
                          <div className="pt-2 border-t space-y-2">
                            <Label>Options (comma separated)</Label>
                            <Input
                              placeholder="Option 1, Option 2, Option 3"
                              value={field.validation?.options?.join(', ') || ''}
                              onChange={(e) => {
                                const options = e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                updateField(index, {
                                  validation: { ...field.validation, options },
                                });
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Values to display in the dropdown
                            </p>
                          </div>
                        )}

                        {/* Conditional: RELATION Table */}
                        {field.dataType === 'RELATION' && (
                          <div className="pt-2 border-t space-y-2">
                            <Label>Target Table</Label>
                            <Input
                              placeholder="Target table name (e.g. users, assets)"
                              value={field.relationTable || ''}
                              onChange={(e) =>
                                updateField(index, { relationTable: e.target.value })
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Name of the table to link to
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || newFields.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
