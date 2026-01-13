import { createWorkflow, deleteWorkflow, getWorkflows, Workflow } from '@/api/workflow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '@/data/workflowTemplates';
import { GitBranch, Plus, Trash2, Workflow as WorkflowIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function FlowsView() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const navigate = useNavigate();

  // Create form state
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    triggerType: 'MANUAL' as const,
  });

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (template?: WorkflowTemplate) => {
    try {
      const payload = template
        ? {
            name: template.name,
            description: template.description,
            triggerType: template.triggerType,
            isActive: false,
            nodes: template.nodes,
            edges: template.edges,
          }
        : {
            ...newItem,
            isActive: false,
            nodes: [],
            edges: [],
          };

      const created = await createWorkflow(payload);
      setIsCreateOpen(false);
      navigate(`/flows/${created.id}`);
    } catch (error) {
      console.error('Failed to create workflow', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await deleteWorkflow(id);
      loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow', error);
    }
  };

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Loading workflows...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automation Flows</h2>
          <p className="text-muted-foreground">
            Create automated workflows to manage your data logic.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50 gap-2">
              <Plus className="h-4 w-4" />
              New Flow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Flow</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Tabs defaultValue="scratch" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="scratch">Start from Scratch</TabsTrigger>
                  <TabsTrigger value="template">Use a Template</TabsTrigger>
                </TabsList>

                <TabsContent value="scratch" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Workflow Name</Label>
                    <Input
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="e.g. Order Processing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trigger Type</Label>
                    <Select
                      value={newItem.triggerType}
                      onValueChange={(val: any) => setNewItem({ ...newItem, triggerType: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANUAL">Manual Trigger</SelectItem>
                        <SelectItem value="RECORD_CREATED">Record Created</SelectItem>
                        <SelectItem value="RECORD_UPDATED">Record Updated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => handleCreate()} className="w-full mt-4">
                    Create Empty Flow
                  </Button>
                </TabsContent>

                <TabsContent value="template">
                  <div className="grid grid-cols-2 gap-4 h-[400px] overflow-y-auto pr-2">
                    {WORKFLOW_TEMPLATES.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="border rounded-md p-4 hover:border-primary cursor-pointer transition-all bg-muted/10 hover:bg-muted/30 flex flex-col justify-between"
                        onClick={() => handleCreate(tpl)}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">{tpl.name}</h4>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {tpl.triggerType}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3">
                            {tpl.description}
                          </p>
                        </div>
                        <Button variant="secondary" size="sm" className="w-full mt-3">
                          Select
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((flow) => (
          <Card
            key={flow.id}
            className="hover:border-primary/50 transition-colors cursor-pointer group bg-card/40 backdrop-blur-sm"
            onClick={() => navigate(`/flows/${flow.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <WorkflowIcon className="h-4 w-4 text-primary" />
                    {flow.name}
                  </CardTitle>
                  <CardDescription>{flow.description || 'No description'}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={flow.isActive ? 'default' : 'secondary'}>
                    {flow.isActive ? 'Active' : 'Draft'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDelete(flow.id, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Badge variant="outline" className="font-mono text-xs flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {flow.triggerType}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        ))}

        {workflows.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-white/10 rounded-lg bg-black/20">
            <WorkflowIcon className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">No workflows yet</h3>
            <p className="max-w-sm text-center mt-2">
              Create your first automated workflow to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
