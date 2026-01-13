/**
 * Data Tables View Component
 * Manages dynamic data tables
 */

import { CustomTable, deleteCustomTable, getCustomTables } from '@/api/customTables';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Database, MoreVertical, Plus, Table2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreateTableDialog } from './CreateTableDialog';
import { EditTableDialog } from './EditTableDialog';

export function DataTablesView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tables, setTables] = useState<CustomTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<CustomTable | null>(null);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await getCustomTables();
      setTables(data);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !confirm('Are you sure you want to delete this table? All data will be permanently lost.')
    ) {
      return;
    }

    try {
      await deleteCustomTable(id);
      await loadTables();
    } catch (error) {
      console.error('Failed to delete table:', error);
      alert('Failed to delete table');
    }
  };

  const handleTableCreated = () => {
    setIsCreateOpen(false);
    loadTables();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading tables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('dashboard.data')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage dynamic data tables with custom schemas
          </p>
        </div>
        <Button
          className="bg-white/10 hover:bg-white/20 text-foreground"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4 me-2" />
          Create Table
        </Button>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-white/10 rounded-lg bg-white/5">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg">No custom tables yet</p>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Create your first table to start managing custom data
          </p>
          <Button
            variant="outline"
            onClick={() => setIsCreateOpen(true)}
            className="border-white/20 hover:bg-white/10"
          >
            <Plus className="h-4 w-4 me-2" />
            Create Your First Table
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="relative p-6 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
              onClick={() => navigate(`/dashboard/data/${table.name}`)}
            >
              {/* Actions Menu */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-card/95 backdrop-blur-xl border-white/10"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/data/${table.name}`);
                      }}
                      className="hover:bg-white/10"
                    >
                      View Data
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTable(table);
                      }}
                      className="hover:bg-white/10"
                    >
                      Edit Structure
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(table.id);
                      }}
                      className="hover:bg-white/10 text-red-400"
                    >
                      Delete Table
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Table2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{table.displayName}</h3>
                  <p className="text-xs text-muted-foreground">{table.name}</p>
                </div>
              </div>

              {/* Description */}
              {table.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {table.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">{table.fields.length}</span> fields
                </div>
                <div>Created {new Date(table.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTableDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleTableCreated}
      />

      {editingTable && (
        <EditTableDialog
          isOpen={true}
          table={editingTable}
          onClose={() => setEditingTable(null)}
          onSuccess={() => {
            setEditingTable(null);
            loadTables();
          }}
        />
      )}
    </div>
  );
}

DataTablesView.displayName = 'DataTablesView';
