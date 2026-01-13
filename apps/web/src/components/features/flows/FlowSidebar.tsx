import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function FlowSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="w-64 border-r rounded-none h-full p-4 space-y-4 overflow-y-auto bg-card/50 backdrop-blur-sm">
      <div>
        <div
          className="bg-muted p-2 rounded cursor-grab border hover:border-primary transition-colors text-sm"
          onDragStart={(event) => onDragStart(event, 'condition')}
          draggable
        >
          Condition Group
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold mb-2">Actions</h3>
        <div
          className="bg-muted p-2 rounded cursor-grab border hover:border-primary transition-colors text-sm"
          onDragStart={(event) => onDragStart(event, 'action')}
          draggable
        >
          Database Action
        </div>
      </div>
    </Card>
  );
}
