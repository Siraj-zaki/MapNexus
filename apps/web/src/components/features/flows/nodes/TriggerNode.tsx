import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { memo } from 'react';
import { Handle, Position } from 'reactflow';

export const TriggerNode = memo(({ data, isConnectable }: any) => {
  return (
    <Card className="w-[300px] border-purple-500/50 shadow-lg bg-card/95">
      <CardHeader className="bg-purple-500/10 p-3 rounded-t-lg border-b border-purple-500/20">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-500">
          <Zap className="h-4 w-4" />
          Trigger
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>Event:</strong> {data.triggerType || 'Record Created'}
          </p>
          <p>
            <strong>Table:</strong> {data.tableName || 'Any Table'}
          </p>
        </div>
      </CardContent>

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={!!isConnectable}
        className="!bg-purple-500 !w-3 !h-3 !z-50"
      />
    </Card>
  );
});

TriggerNode.displayName = 'TriggerNode';
