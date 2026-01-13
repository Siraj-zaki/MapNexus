/**
 * DynamicTableView Component
 * Displays data from a custom table with pagination, sorting, filtering, and CRUD actions
 */

import {
  CustomTable,
  deleteTableRecord,
  exportTableAsGeoJSON,
  getCustomTable,
  queryTableData,
} from '@/api/customTables';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DynamicDataForm } from './DynamicDataForm';

// Cell renderer for different data types
const CellRenderer = ({ value, dataType }: { value: any; dataType: string }) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  // Boolean
  if (dataType === 'BOOLEAN') {
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${
          value ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}
      >
        {value ? 'True' : 'False'}
      </span>
    );
  }

  // Date types
  if (dataType === 'DATE' || dataType === 'TIMESTAMP' || dataType === 'TIMESTAMPTZ') {
    try {
      return <span className="text-sm">{new Date(value).toLocaleString()}</span>;
    } catch {
      return <span className="text-sm">{String(value)}</span>;
    }
  }

  // Geometry types
  if (dataType?.startsWith('GEOMETRY')) {
    if (typeof value === 'object' && value !== null) {
      if (value.type === 'Point' && Array.isArray(value.coordinates)) {
        return (
          <div className="flex items-center gap-2" title={JSON.stringify(value.coordinates)}>
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {value.coordinates[0].toFixed(4)}, {value.coordinates[1].toFixed(4)}
            </span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">{value.type || 'Geometry'}</span>
        </div>
      );
    }
  }

  // JSON types or generic objects
  if (dataType === 'JSONB' || dataType === 'IOT_SENSOR' || typeof value === 'object') {
    if (value === null) return <span className="text-muted-foreground italic">—</span>;

    const str = JSON.stringify(value);
    return (
      <span
        className="text-xs font-mono bg-muted/50 px-2 py-1 rounded truncate max-w-[200px] inline-block"
        title={JSON.stringify(value, null, 2)}
      >
        {str.length > 30 ? str.slice(0, 30) + '...' : str}
      </span>
    );
  }

  // Number types
  if (['INTEGER', 'BIGINT', 'DECIMAL', 'FLOAT'].includes(dataType)) {
    return <span className="font-mono text-sm">{value}</span>;
  }

  // Default text display
  const strValue = String(value);
  if (strValue.length > 50) {
    return (
      <span className="text-sm" title={strValue}>
        {strValue.slice(0, 50)}...
      </span>
    );
  }
  return <span className="text-sm">{strValue}</span>;
};

interface DynamicTableViewProps {
  tableName?: string;
}

export function DynamicTableView({ tableName: propTableName }: DynamicTableViewProps) {
  const params = useParams<{ tableName: string }>();
  const navigate = useNavigate();
  const tableName = propTableName || params.tableName;

  const [table, setTable] = useState<CustomTable | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  // Sorting
  const [sortField, setSortField] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const totalPages = Math.ceil(total / pageSize);

  // Load table metadata
  useEffect(() => {
    if (!tableName) return;

    const loadTable = async () => {
      try {
        const tableData = await getCustomTable(tableName);
        setTable(tableData);
      } catch (err: any) {
        setError(err.message || 'Failed to load table');
      }
    };
    loadTable();
  }, [tableName]);

  // Load table data
  useEffect(() => {
    if (!tableName) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const result = await queryTableData(tableName, {
          orderBy: sortField,
          orderDir: sortOrder,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
        setData(result.data || []);
        setTotal(result.total || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [tableName, page, pageSize, sortField, sortOrder, searchQuery]);

  // Get visible columns (exclude system fields from display)
  const visibleFields = useMemo(() => {
    if (!table?.fields) return [];
    return table.fields.filter(
      (f) => !['created_at', 'updated_at', 'created_by', 'updated_by'].includes(f.name)
    );
  }, [table?.fields]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await deleteTableRecord(tableName!, id);
      setData(data.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    }
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
    // Refresh data
    setPage(1);
  };

  const handleExport = async (format: 'json' | 'csv' | 'geojson') => {
    if (!tableName) return;

    try {
      if (format === 'geojson') {
        const geoField = table?.fields.find((f) => f.dataType.startsWith('GEOMETRY_'));
        if (!geoField) {
          alert('No geometry field found in this table');
          return;
        }
        const geojson = await exportTableAsGeoJSON(tableName, geoField.name);
        downloadJson(geojson, `${tableName}.geojson`);
      } else if (format === 'json') {
        downloadJson(data, `${tableName}.json`);
      } else {
        // CSV export
        const headers = visibleFields.map((f) => f.displayName);
        const rows = data.map((record) =>
          visibleFields.map((f) => {
            const val = record[f.name];
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val ?? '');
          })
        );
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        downloadCsv(csv, `${tableName}.csv`);
      }
    } catch (err: any) {
      alert(err.message || 'Export failed');
    }
  };

  if (!tableName) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No table selected</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => navigate('/?tab=data')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tables
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/?tab=data')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{table?.displayName || tableName}</h2>
            <p className="text-sm text-muted-foreground">
              {total} record{total !== 1 ? 's' : ''} • {table?.fields.length || 0} fields
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('geojson')}>
                <MapPin className="h-4 w-4 mr-2" />
                Export as GeoJSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="shrink-0 bg-muted/40">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Area - Flex Grow with Scroll */}
      <div className="flex-1 border rounded-md overflow-hidden bg-background">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[60px] bg-muted/50">#</TableHead>
                {visibleFields.slice(0, 6).map((field) => (
                  <TableHead key={field.name} className="bg-muted/50">
                    <button
                      className="flex items-center gap-1 hover:text-foreground font-semibold"
                      onClick={() => handleSort(field.name)}
                    >
                      {field.displayName}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="w-[80px] bg-muted/50">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleFields.length + 2} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <span className="loading loading-spinner text-primary"></span>
                      <span className="text-muted-foreground">Loading data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={visibleFields.length + 2} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-lg font-medium text-foreground">No records found</p>
                      <p className="text-muted-foreground mb-4">
                        Get started by adding your first record to this table.
                      </p>
                      <Button variant="outline" onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Record
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((record, idx) => (
                  <TableRow key={record.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>
                    {visibleFields.slice(0, 6).map((field) => (
                      <TableCell key={field.name}>
                        <CellRenderer value={record[field.name]} dataType={field.dataType} />
                      </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(record)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(record.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination - Fixed at Bottom */}
      <div className="shrink-0 flex items-center justify-between border-t pt-2 bg-background">
        <div className="flex items-center gap-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-medium">{total}</span> records
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[5rem] text-center font-medium">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form Dialog */}
      {table && (
        <DynamicDataForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
          table={table}
          record={editingRecord}
        />
      )}
    </div>
  );
}

// Helper functions
function downloadJson(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
