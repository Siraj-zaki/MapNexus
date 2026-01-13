/**
 * Reports List Page
 * Displays a list of saved reports with options to view, edit, or delete.
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Code,
  Edit,
  Edit3,
  FileText,
  History,
  Map as MapIcon,
  Plus,
  Search,
  Table2,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SavedReport {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  description?: string;
}

interface ReportsListProps {
  isEmbedded?: boolean;
}

export default function ReportsList({ isEmbedded = false }: ReportsListProps) {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Get auth token
  const getToken = () => localStorage.getItem('token');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok) {
        const data = await res.json();
        // Backend returns array directly or { data: [] }
        const reportsList = Array.isArray(data) ? data : data.data || [];

        // Sort by newest first
        setReports(
          reportsList.sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        console.error('Failed to fetch reports');
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this report?')) {
      try {
        const res = await fetch(`/api/reports/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (res.ok) {
          const updated = reports.filter((r) => r.id !== id);
          setReports(updated);
        } else {
          alert('Failed to delete report');
        }
      } catch (err) {
        console.error('Error deleting report:', err);
        alert('Failed to delete report');
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUMMARY':
        return <BarChart3 className="w-5 h-5 text-blue-400" />;
      case 'DETAIL':
        return <Table2 className="w-5 h-5 text-purple-400" />;
      case 'EDITABLE':
        return <Edit3 className="w-5 h-5 text-green-400" />;
      case 'SCRIPT':
        return <Code className="w-5 h-5 text-orange-400" />;
      case 'HISTORICAL':
        return <History className="w-5 h-5 text-cyan-400" />;
      case 'MAP':
        return <MapIcon className="w-5 h-5 text-pink-400" />;
      default:
        return <FileText className="w-5 h-5 text-neutral-400" />;
    }
  };

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(isEmbedded ? '' : 'p-6 max-w-7xl mx-auto min-h-screen', 'text-white')}>
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Reports</h1>
            <p className="text-neutral-400">Manage and view your saved reports</p>
          </div>
          <Button
            onClick={() => navigate('/reports/new')}
            className="bg-white/10 hover:bg-white/20 text-foreground"
          >
            <Plus className="h-4 w-4 me-2" />
            Create New Report
          </Button>
        </div>
      )}

      {isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-neutral-400">Create and export data reports</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-neutral-900 border-neutral-700"
              />
            </div>
            <Button
              onClick={() => navigate('/reports/new')}
              className="bg-white/10 hover:bg-white/20 text-foreground"
            >
              <Plus className="h-4 w-4 me-2" />
              Create New Report
            </Button>
          </div>
        </div>
      )}

      {!isEmbedded && (
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-neutral-900 border-neutral-700"
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-neutral-900 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 bg-neutral-900/50 rounded-lg border border-neutral-800 border-dashed">
          <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-300">No reports found</h3>
          <p className="text-neutral-500 mb-6">Get started by creating your first report</p>
          <Button
            onClick={() => navigate('/reports/new')}
            className="bg-white/10 hover:bg-white/20 text-foreground"
          >
            <Plus className="h-4 w-4 me-2" />
            Create Report
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <Card
              key={report.id}
              className="group p-5 bg-neutral-900 border-neutral-700 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden"
              onClick={() => navigate(`/reports/${report.id}/view`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 group-hover:bg-neutral-800/80 transition-colors">
                    {getIcon(report.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-blue-400 transition-colors">
                      {report.name}
                    </h3>
                    <div className="text-xs text-neutral-500 font-mono mt-0.5">{report.type}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-neutral-500 mt-4 pt-4 border-t border-neutral-800">
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-neutral-800 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reports/${report.id}/edit`);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-900/20 hover:text-red-400"
                    onClick={(e) => handleDelete(report.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
