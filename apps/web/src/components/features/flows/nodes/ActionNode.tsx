import { CustomTable, getCustomTables } from '@/api/customTables';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, Play, Trash } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';

export const ActionNode = memo(({ data, isConnectable }: any) => {
  const [tables, setTables] = useState<CustomTable[]>([]);

  useEffect(() => {
    let mounted = true;
    getCustomTables()
      .then((res) => {
        if (mounted && Array.isArray(res)) {
          setTables(res);
        }
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (key: string, value: any) => {
    if (data.onChange) {
      data.onChange(key, value);
    }
  };

  const actionType = data.actionType || 'CREATE';

  return (
    <Card className="min-w-[320px] max-w-[350px] border-blue-500/50 shadow-lg bg-card/95">
      <CardHeader className="bg-blue-500/10 p-3 rounded-t-lg border-b border-blue-500/20">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-500">
          <Play className="h-4 w-4" />
          Database Action
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Action Type */}
        <div className="space-y-2">
          <Label className="text-xs">Action Type</Label>
          <Select value={actionType} onValueChange={(val) => handleChange('actionType', val)}>
            <SelectTrigger className="h-8 text-xs nodrag">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREATE">Create Record</SelectItem>
              <SelectItem value="UPDATE">Update Record</SelectItem>
              <SelectItem value="DELETE">Delete Record</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Table */}
        <div className="space-y-2">
          <Label className="text-xs">Target Table</Label>
          <div className="flex gap-2">
            <Database className="h-4 w-4 text-muted-foreground mt-2" />
            <Select
              value={data.tableName}
              onValueChange={(val: string) => handleChange('tableName', val)}
            >
              <SelectTrigger className="h-8 text-xs w-full nodrag">
                <SelectValue placeholder="Select Table" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.name}>
                    {table.displayName} ({table.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Query (For Update/Delete) */}
        {(actionType === 'UPDATE' || actionType === 'DELETE') && (
          <div className="space-y-2 bg-muted/30 p-2 rounded border border-dashed">
            <Label className="text-xs font-semibold">Match Condition (Where)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                className="h-6 text-[10px] nodrag cursor-text"
                placeholder="Field"
                value={data.queryField || ''}
                onChange={(e) => handleChange('queryField', e.target.value)}
              />
              <Select
                value={data.queryOperator || 'equals'}
                onValueChange={(val) => handleChange('queryOperator', val)}
              >
                <SelectTrigger className="h-6 text-[10px] nodrag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">=</SelectItem>
                  <SelectItem value="not_equals">!=</SelectItem>
                  <SelectItem value="gt">&gt;</SelectItem>
                  <SelectItem value="lt">&lt;</SelectItem>
                  <SelectItem value="contains">contains</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="h-6 text-[10px] nodrag cursor-text"
                placeholder="Value"
                value={data.queryValue || ''}
                onChange={(e) => handleChange('queryValue', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Payload (For Create/Update) */}
        {(actionType === 'CREATE' || actionType === 'UPDATE') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                {actionType === 'CREATE' ? 'Fields to Insert' : 'Fields to Update'}
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 nodrag"
                onClick={() => {
                  const newFields = [...(data.fields || []), { key: '', value: '' }];
                  handleChange('fields', newFields);
                }}
              >
                <span className="text-xs font-bold">+</span>
              </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {(data.fields || []).map((field: any, index: number) => (
                <div
                  key={index}
                  className="flex gap-1 items-center animate-in fade-in slide-in-from-left-2 duration-300"
                >
                  <Input
                    className="h-6 text-[10px] w-1/3 nodrag cursor-text"
                    placeholder="Field Name"
                    value={field.key}
                    onChange={(e) => {
                      const newFields = [...(data.fields || [])];
                      newFields[index].key = e.target.value;
                      handleChange('fields', newFields);
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">=</span>
                  <Input
                    className="h-6 text-[10px] flex-1 nodrag cursor-text"
                    placeholder="Value OR {{trigger.field}}"
                    value={field.value}
                    onChange={(e) => {
                      const newFields = [...(data.fields || [])];
                      newFields[index].value = e.target.value;
                      handleChange('fields', newFields);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive nodrag hover:bg-destructive/10"
                    onClick={() => {
                      const newFields = (data.fields || []).filter(
                        (_: any, i: number) => i !== index
                      );
                      handleChange('fields', newFields);
                    }}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {(data.fields || []).length === 0 && (
                <div className="text-[10px] text-muted-foreground text-center py-2 border border-dashed rounded bg-muted/20">
                  No fields mapped. Click + to add.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={!!isConnectable}
        className="!bg-blue-500 !w-3 !h-3 !z-50"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={!!isConnectable}
        className="!bg-blue-500 !w-3 !h-3 !z-50"
      />
    </Card>
  );
});

ActionNode.displayName = 'ActionNode';
