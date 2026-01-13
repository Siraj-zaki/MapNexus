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
import { GitBranch, Plus, Trash } from 'lucide-react';
import { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const ConditionNode = memo(({ data, isConnectable }: any) => {
  // Ensure we have a list of conditions, defaulting to legacy single condition if needed
  const conditions = data.conditions || [
    { field: data.field || '', operator: data.operator || 'equals', value: data.value || '' },
  ];
  const logic = data.logic || 'AND';

  const handleChange = (key: string, value: any) => {
    if (data.onChange) {
      data.onChange(key, value);
    }
  };

  const updateCondition = (index: number, key: string, val: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [key]: val };
    handleChange('conditions', newConditions);
  };

  const addCondition = () => {
    const newConditions = [...conditions, { field: '', operator: 'equals', value: '' }];
    handleChange('conditions', newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_: any, i: number) => i !== index);
    handleChange('conditions', newConditions);
  };

  return (
    <Card className="w-[350px] border-yellow-500/50 shadow-lg bg-card/95">
      <CardHeader className="bg-yellow-500/10 p-3 rounded-t-lg border-b border-yellow-500/20 flex flex-row justify-between items-center">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-500">
          <GitBranch className="h-4 w-4" />
          Condition Logic
        </CardTitle>
        <Select value={logic} onValueChange={(val) => handleChange('logic', val)}>
          <SelectTrigger className="h-6 text-[10px] w-20 nodrag bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND (All)</SelectItem>
            <SelectItem value="OR">OR (Any)</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {conditions.map((cond: any, index: number) => (
            <div
              key={index}
              className="space-y-2 p-2 bg-muted/20 rounded border border-muted relative group"
            >
              {conditions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity nodrag text-muted-foreground hover:text-destructive"
                  onClick={() => removeCondition(index)}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              )}

              <div className="grid grid-cols-1 gap-1">
                <Label className="text-[10px] text-muted-foreground">Field</Label>
                <Input
                  className="h-7 text-xs nodrag cursor-text"
                  placeholder="e.g. status"
                  value={cond.field || ''}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Operator</Label>
                  <Select
                    value={cond.operator || 'equals'}
                    onValueChange={(val) => updateCondition(index, 'operator', val)}
                  >
                    <SelectTrigger className="h-7 text-xs nodrag">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals (=)</SelectItem>
                      <SelectItem value="not_equals">Not Equals (!=)</SelectItem>
                      <SelectItem value="gt">Greater (&gt;)</SelectItem>
                      <SelectItem value="lt">Less (&lt;)</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="geo_within">Inside Geofence (Polygon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Value</Label>
                  <Input
                    className="h-7 text-xs nodrag cursor-text"
                    placeholder="Val / Table"
                    value={cond.value || ''}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs nodrag border-dashed border-yellow-500/50 text-yellow-600 hover:bg-yellow-50"
          onClick={addCondition}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Condition
        </Button>
      </CardContent>

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={!!isConnectable}
        className="!bg-yellow-500 !w-3 !h-3 !z-50"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        isConnectable={!!isConnectable}
        className="!bg-green-500 !w-3 !h-3 -ml-4 !z-50"
        style={{ left: '30%' }}
      />
      <div className="absolute -bottom-5 left-[25%] text-[10px] text-green-500 font-bold pointer-events-none">
        TRUE
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        isConnectable={!!isConnectable}
        className="!bg-red-500 !w-3 !h-3 -mr-4 !z-50"
        style={{ left: '70%' }}
      />
      <div className="absolute -bottom-5 left-[65%] text-[10px] text-red-500 font-bold pointer-events-none">
        FALSE
      </div>
    </Card>
  );
});

ConditionNode.displayName = 'ConditionNode';
