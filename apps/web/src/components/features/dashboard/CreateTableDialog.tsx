/**
 * Create Table Dialog - Clean Shadcn Design
 * Matching professional form layout patterns
 */

import { createCustomTable } from '@/api/customTables';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { CustomFieldDefinition } from '@/types/customTable';
import { ArrowLeft, ArrowRight, Check, MapPin, Plus, Trash2, Wifi } from 'lucide-react';
import { useState } from 'react';

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

interface CreateTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTableDialog({ isOpen, onClose, onSuccess }: CreateTableDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tableName, setTableName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<CustomFieldDefinition[]>([
    { name: 'name', displayName: 'Name', dataType: 'TEXT', isRequired: true, order: 0 },
  ]);

  const handleClose = () => {
    setStep(1);
    setTableName('');
    setDisplayName('');
    setDescription('');
    setFields([
      { name: 'name', displayName: 'Name', dataType: 'TEXT', isRequired: true, order: 0 },
    ]);
    onClose();
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!tableName || tableName === displayName.toLowerCase().replace(/\s+/g, '_')) {
      setTableName(
        value
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
      );
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      { name: '', displayName: '', dataType: 'TEXT', isRequired: false, order: fields.length },
    ]);
  };

  const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));

  const updateField = (index: number, updates: Partial<CustomFieldDefinition>) => {
    setFields(fields.map((field, i) => (i === index ? { ...field, ...updates } : field)));
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      await createCustomTable({
        name: tableName,
        displayName,
        description,
        fields: fields.map((field, index) => ({ ...field, order: index })),
      });
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to create table:', error);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = tableName && displayName && /^[a-z][a-z0-9_]*$/.test(tableName);
  const canProceedStep2 = fields.every(
    (f) => f.name && f.displayName && /^[a-z][a-z0-9_]*$/.test(f.name)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create Custom Table</DialogTitle>
          <DialogDescription>
            Step {step} of 3 —{' '}
            {step === 1 ? 'Basic information' : step === 2 ? 'Define fields' : 'Review'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-3 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s === step
                    ? 'bg-primary text-primary-foreground'
                    : s < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-px mx-3 ${s < step ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Table information</CardTitle>
                <CardDescription>Configure the basic details of your custom table.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display name</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter display name"
                      value={displayName}
                      onChange={(e) => handleDisplayNameChange(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      The name shown in the interface.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tableName">Table name</Label>
                    <Input
                      id="tableName"
                      placeholder="table_name"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-sm text-muted-foreground">
                      Database identifier (lowercase).
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the purpose of this table..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    Optional description for documentation.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Define Fields */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Field definitions</h3>
                  <p className="text-sm text-muted-foreground">
                    Add and configure the fields for your table.
                  </p>
                </div>
                <Button onClick={addField} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add field
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={index}>
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
                              {index > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeField(index)}
                                  className="ml-auto text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
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
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review configuration</CardTitle>
                <CardDescription>Verify your table settings before creating.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Display name</p>
                    <p className="text-sm text-muted-foreground">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Table name</p>
                    <p className="text-sm text-muted-foreground font-mono">{tableName}</p>
                  </div>
                </div>
                {description && (
                  <div>
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Fields ({fields.length})</p>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{field.displayName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{field.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {field.isRequired && (
                            <span className="text-xs px-2 py-0.5 rounded bg-destructive/10 text-destructive">
                              Required
                            </span>
                          )}
                          {field.isUnique && (
                            <span className="text-xs px-2 py-0.5 rounded bg-warning/10 text-warning">
                              Unique
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">
                            {field.dataType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Table'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
