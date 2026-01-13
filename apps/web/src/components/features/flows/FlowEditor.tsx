import { getWorkflowById, updateWorkflow, Workflow } from '@/api/workflow';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  MiniMap,
  Node,
  Panel,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow, // Import this
} from 'reactflow';
import 'reactflow/dist/style.css'; // Ensure styles are imported
import { FlowSidebar } from './FlowSidebar';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { TriggerNode } from './nodes/TriggerNode';

// 1. Define Node Types outside component to prevent re-creation on render
const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

// 2. Create the inner component that contains the logic
function FlowEditorContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Access the ReactFlow instance from the provider
  const { screenToFlowPosition } = useReactFlow();

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 3. The Magic Function: Handles data updates from Custom Nodes
  const onNodeDataChange = useCallback(
    (nodeId: string, key: string, value: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                [key]: value,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  useEffect(() => {
    if (id) loadWorkflow(id);
  }, [id]);

  const loadWorkflow = async (workflowId: string) => {
    try {
      setLoading(true);
      const data = await getWorkflowById(workflowId);
      setWorkflow(data);

      if (data.nodes && Array.isArray(data.nodes)) {
        // Inject the onChange handler into loaded nodes
        const hydratedNodes = data.nodes.map((node: any) => ({
          ...node,
          data: {
            ...node.data,
            onChange: (key: string, val: any) => onNodeDataChange(node.id, key, val),
          },
        }));
        setNodes(hydratedNodes);
      }
      if (data.edges && Array.isArray(data.edges)) {
        setEdges(data.edges);
      }
    } catch (error) {
      console.error('Failed to load workflow', error);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      // Use the hook from useReactFlow() for accurate positioning
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNodeId = `${type}_${new Date().getTime()}`;

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          label: `${type} node`,
          // Inject the onChange handler immediately
          onChange: (key: string, val: any) => onNodeDataChange(newNodeId, key, val),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, onNodeDataChange]
  );

  const handleSave = async () => {
    if (!workflow || !id) return;
    try {
      setSaving(true);

      // Clean nodes before saving (remove the function)
      const nodesToSave = nodes.map((node) => {
        const { onChange, ...restData } = node.data;
        return { ...node, data: restData };
      });

      await updateWorkflow(id, {
        nodes: nodesToSave,
        edges: edges,
        isActive: workflow.isActive,
      });

      toast({ title: 'Success', description: 'Workflow saved successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/?tab=flows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{workflow?.name}</h1>
            <p className="text-xs text-muted-foreground">{workflow?.triggerType}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Flow
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <FlowSidebar />
        <div className="flex-1 h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
            <Panel position="top-right">
              <div className="bg-card/80 backdrop-blur p-2 rounded shadow border text-xs text-muted-foreground">
                Drag nodes from left panel
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// 4. Export the wrapped component
export function FlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditorContent />
    </ReactFlowProvider>
  );
}
