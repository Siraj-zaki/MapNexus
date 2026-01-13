/**
 * Report Viewer Page
 * Renders reports based on their type and configuration
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeft, Download, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Import viewers
import {
  DetailReportViewer,
  EditableReportViewer,
  HistoricalReportViewer,
  MapReportViewer,
  ScriptReportViewer,
  SummaryReportViewer,
} from '@/components/features/reports/viewers';

const API_BASE = '/api';

interface ReportData {
  id: string;
  name: string;
  type: string;
  config: any;
  data?: any;
  createdAt: string;
}

export default function ReportViewer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportData | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('token');

  // Execute report query
  const executeReport = async (reportConfig?: ReportData, page: number = 1) => {
    const config = reportConfig || report;
    if (!config) return;

    setIsExecuting(true);
    setExecutionError(null);

    try {
      // Create request payload with pagination
      // Backend expects pagination in the config object
      const requestConfig = {
        ...config.config,
        page, // Explicitly pass page
        offset: (page - 1) * (config.config?.pageSize || 50),
      };

      // Call backend preview endpoint
      const res = await fetch(`${API_BASE}/reports/${id}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ config: requestConfig }), // Send the report config for preview
      });

      if (!res.ok) {
        throw new Error('Failed to generate report data');
      }

      const result = await res.json();

      // Backend returns a Map-like object. For Config-based reports, data is in 'main'
      // Structure: { main: { success: true, data: ... }, error: ... }
      if (result.main?.success) {
        let finalData = result.main.data;

        // Normalize data based on report type to match Viewer expectations
        if (['DETAIL', 'EDITABLE'].includes(config.type)) {
          // Backend returns { data: [], total: number }
          // Viewer expects { rows: [], columns: [], total: number, ... }
          const rows = Array.isArray(finalData.data) ? finalData.data : [];
          finalData = {
            rows,
            total: finalData.total || rows.length,
            columns:
              config.config?.columns?.length > 0
                ? config.config.columns
                : Object.keys(rows[0] || {}),
            pageSize: config.config?.pageSize || 50,
            page: page,
            // Pass primary key for editable reports
            primaryKey: 'id',
          };
        } else if (config.type === 'SUMMARY') {
          // Backend returns { data: [...] } rows
          // For client-side aggregation, we pass the raw rows as 'chartData'
          const rows = Array.isArray(finalData.data) ? finalData.data : [];
          finalData = { chartData: rows };
        } else if (config.type === 'HISTORICAL') {
          // Backend returns { data: [...history_rows], total: number }
          // Viewer expects similar structure to DETAIL: { rows: [], columns: [], total: ... }
          const rows = Array.isArray(finalData.data) ? finalData.data : [];
          finalData = {
            rows,
            total: finalData.total || rows.length,
            columns: ['performedAt', 'performedBy', 'operation', 'recordId', 'changedFields'],
            pageSize: config.config?.pageSize || 50,
            page: page,
          };
        }

        setData(finalData);
      } else if (result.error) {
        throw new Error(result.error.error || 'Unknown error');
      } else {
        // Fallback if structure is different
        setData(result);
      }
    } catch (err: any) {
      console.error('Failed to execute report:', err);
      setExecutionError(err.message);
      // Fallback to mock data if API unavailable or failed
      setData(generateMockData(config));
    } finally {
      setIsExecuting(false);
    }
  };

  // Load report definition
  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;

      try {
        const response = await fetch(`${API_BASE}/reports/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (!response.ok) {
          throw new Error('Failed to load report');
        }

        const data = await response.json();
        // Ensure type is present
        if (!data.type) data.type = 'SUMMARY';

        setReport(data);
        // Execute report immediately with fetched definition
        await executeReport(data);
      } catch (err: any) {
        console.error('Failed to load report:', err);
        setError('Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  // Generate mock data for demo
  const generateMockData = (config: ReportData) => {
    switch (config.type) {
      case 'SUMMARY':
        return {
          aggregations: [
            { label: 'Total Records', value: 1245 },
            { label: 'Average Value', value: 85.3 },
            { label: 'Maximum', value: 250 },
          ],
          chartData: [
            { name: 'Jan', value: 120 },
            { name: 'Feb', value: 150 },
            { name: 'Mar', value: 180 },
            { name: 'Apr', value: 140 },
          ],
        };
      case 'DETAIL':
      case 'EDITABLE':
        return {
          columns: ['id', 'name', 'status', 'value', 'created_at'],
          rows: Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            status: ['Active', 'Pending', 'Completed'][i % 3],
            value: Math.floor(Math.random() * 1000),
            created_at: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          })),
          total: 150,
          page: 1,
          pageSize: 25,
        };
      case 'SCRIPT':
        return {
          columns: ['column1', 'column2', 'column3'],
          rows: Array.from({ length: 10 }, (_, i) => ({
            column1: `Value ${i + 1}`,
            column2: Math.floor(Math.random() * 100),
            column3: Math.random() > 0.5 ? 'Yes' : 'No',
          })),
          executionTime: 45,
        };
      case 'HISTORICAL':
        return {
          metrics: [
            { label: 'Current Period', value: 1520, change: 12.5 },
            { label: 'Previous Period', value: 1350, change: -5.2 },
          ],
          chartData: Array.from({ length: 12 }, (_, i) => ({
            date: `2024-${String(i + 1).padStart(2, '0')}`,
            value: 100 + Math.floor(Math.random() * 100),
            previous: 90 + Math.floor(Math.random() * 80),
          })),
        };
      case 'MAP':
        return {
          features: Array.from({ length: 20 }, (_, i) => ({
            type: 'Feature',
            properties: { id: i + 1, name: `Location ${i + 1}` },
            geometry: {
              type: 'Point',
              coordinates: [-122.4 + Math.random() * 0.2, 37.7 + Math.random() * 0.2],
            },
          })),
          bounds: [
            [-122.5, 37.6],
            [-122.3, 37.9],
          ],
        };
      default:
        return { message: 'No data available' };
    }
  };

  // Export report
  const handleExport = async (format: 'PDF' | 'EXCEL') => {
    try {
      const res = await fetch(`${API_BASE}/reports/${id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ format }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report?.name || 'report'}.${format.toLowerCase()}`;
        a.click();
      } else {
        alert('Export feature coming soon');
      }
    } catch (err) {
      alert('Export feature coming soon');
    }
  };

  // Save data changes (for Editable Report)
  const handleSaveData = async (changes: any[]) => {
    if (!report || !report.config?.dataSource) return;

    try {
      setIsExecuting(true);
      const res = await fetch(`${API_BASE}/reports/data/${report.config.dataSource}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ changes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save changes');
      }

      // Refresh data to show updates
      await executeReport();
    } catch (err: any) {
      console.error('Save error:', err);
      setExecutionError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle page changes
  const handlePageChange = (page: number) => {
    executeReport(undefined, page);
  };

  // Render viewer based on type
  const renderViewer = () => {
    if (!report || !data) return null;

    const viewerProps = {
      config: report.config,
      data,
      onRefresh: () => executeReport(undefined, data.page),
      isLoading: isExecuting,
      onPageChange: handlePageChange,
    };

    switch (report.type) {
      case 'SUMMARY':
        return <SummaryReportViewer {...viewerProps} />;
      case 'DETAIL':
        return <DetailReportViewer {...viewerProps} />;
      case 'EDITABLE':
        return <EditableReportViewer {...viewerProps} onSave={handleSaveData} />;
      case 'SCRIPT':
        return <ScriptReportViewer {...viewerProps} />;
      case 'HISTORICAL':
        return <HistoricalReportViewer {...viewerProps} />;
      case 'MAP':
        return <MapReportViewer {...viewerProps} />;
      default:
        return (
          <div className="p-8 text-center text-neutral-400">Unknown report type: {report.type}</div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="mt-2 text-neutral-400">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <Card className="p-8 bg-neutral-900 border-neutral-700 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => navigate('/reports/new')}>Create New Report</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-neutral-950 text-white overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{report?.name || 'Report'}</h1>
            <p className="text-sm text-neutral-400">{report?.type} Report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => executeReport()}
            disabled={isExecuting}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isExecuting && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('PDF')}>
            <Download className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('EXCEL')}>
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Excel
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden p-6 bg-neutral-950">
        {executionError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            <strong>Error executing report:</strong> {executionError}
          </div>
        )}
        <div className="h-full flex flex-col">{renderViewer()}</div>
      </main>
    </div>
  );
}
