/**
 * Report Builder Page
 * Proper report creation with type selection and configuration
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ReportType, ReportTypeSelector } from '@/components/features/reports/ReportTypeSelector';
import { DetailReportConfigPanel } from '@/components/features/reports/configs/DetailReportConfig';
import { EditableReportConfigPanel } from '@/components/features/reports/configs/EditableReportConfig';
import { HistoricalReportConfigPanel } from '@/components/features/reports/configs/HistoricalReportConfig';
import { MapReportConfigPanel } from '@/components/features/reports/configs/MapReportConfig';
import { ScriptReportConfigPanel } from '@/components/features/reports/configs/ScriptReportConfig';
import { SummaryReportConfigPanel } from '@/components/features/reports/configs/SummaryReportConfig';

// API base URL
const API_BASE = '/api';

interface CustomTable {
  id: string;
  name: string;
  displayName: string;
  fields: Array<{ name: string; displayName?: string; dataType: string }>;
}

type Step = 'SELECT_TYPE' | 'CONFIGURE' | 'PREVIEW';

export default function ReportBuilder() {
  const navigate = useNavigate();
  const { id: templateId } = useParams();

  // State
  const [step, setStep] = useState<Step>('SELECT_TYPE');
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reportConfig, setReportConfig] = useState<any>(null);
  const [availableTables, setAvailableTables] = useState<CustomTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get auth token
  const getToken = () => localStorage.getItem('token');

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE}/custom-tables`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Handle both array response and object with data property
          const tables = Array.isArray(data) ? data : data?.data || data?.tables || [];
          setAvailableTables(tables);
        }
      } catch (err) {
        console.error('Failed to fetch tables:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTables();
  }, []);

  // Load existing report configuration
  useEffect(() => {
    if (templateId && templateId !== 'new') {
      const fetchReport = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE}/reports/${templateId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch report');
          }

          const data = await response.json();
          // Backend returns { type, config, ... } fields we added
          // If type is missing (legacy records), default to SUMMARY
          const reportType = (data.type as ReportType) || 'SUMMARY';

          setSelectedType(reportType);
          setReportConfig(data.config || {});
          setStep('CONFIGURE');
        } catch (error) {
          console.error('Error loading report:', error);
          // Only show error, do not fallback to mock
          alert('Failed to load report. Please try again.');
          navigate('/reports');
        }
      };

      fetchReport();
    }
  }, [templateId, navigate]);

  // Handle type selection
  const handleTypeSelect = (type: ReportType) => {
    setSelectedType(type);
    setStep('CONFIGURE');
  };

  // Handle config save
  const handleSaveConfig = async (config: any, typeOverride?: ReportType) => {
    // Ensure we have a type
    const finalType = typeOverride || selectedType;

    if (!finalType) {
      console.error('No report type selected');
      return;
    }

    setReportConfig(config);
    setIsSaving(true);

    try {
      const isEditing = templateId && templateId !== 'new';

      // Save report to backend
      const method = templateId && templateId !== 'new' ? 'PUT' : 'POST';
      const url =
        templateId && templateId !== 'new'
          ? `${API_BASE}/reports/${templateId}`
          : `${API_BASE}/reports`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: config.name,
          description: config.description || '',
          type: finalType,
          config: config,
          paperSize: config.paperSize || 'A4',
          orientation: config.orientation || 'portrait',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save report');
      }

      const savedReport = await response.json();
      // Redirect to list
      navigate('/?tab=reports');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report');
      navigate('/?tab=reports');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (step === 'CONFIGURE') {
      setStep('SELECT_TYPE');
      setSelectedType(null);
    } else {
      navigate(-1);
    }
  };

  // Test query for Script reports
  const handleTestQuery = async (query: string, params: Record<string, any>) => {
    const res = await fetch(`${API_BASE}/reports/query/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ query, params }),
    });
    return res.json();
  };

  // Render configuration panel based on type
  const renderConfigPanel = () => {
    if (!selectedType) return null;

    const tableData = availableTables.map((t) => ({
      name: t.name,
      displayName: t.displayName || t.name,
      fields: t.fields || [],
    }));

    switch (selectedType) {
      case 'SUMMARY':
        return (
          <SummaryReportConfigPanel
            tables={tableData}
            initialConfig={reportConfig}
            onSave={(config) => handleSaveConfig(config, 'SUMMARY')}
            onCancel={handleCancel}
          />
        );
      case 'DETAIL':
        return (
          <DetailReportConfigPanel
            tables={tableData}
            initialConfig={reportConfig}
            onSave={(config) => handleSaveConfig(config, 'DETAIL')}
            onCancel={handleCancel}
          />
        );
      case 'EDITABLE':
        return (
          <EditableReportConfigPanel
            tables={tableData}
            initialConfig={reportConfig}
            onSave={(config) => handleSaveConfig(config, 'EDITABLE')}
            onCancel={handleCancel}
          />
        );
      case 'SCRIPT':
        return (
          <ScriptReportConfigPanel
            initialConfig={reportConfig}
            onSave={(config) => handleSaveConfig(config, 'SCRIPT')}
            onCancel={handleCancel}
            onTestQuery={handleTestQuery}
          />
        );
      case 'HISTORICAL':
        return (
          <HistoricalReportConfigPanel
            tables={tableData}
            initialConfig={reportConfig}
            onSave={(config) => handleSaveConfig(config, 'HISTORICAL')}
            onCancel={handleCancel}
          />
        );
      case 'MAP':
        return (
          <MapReportConfigPanel
            tables={tableData}
            initialConfig={reportConfig}
            onSave={(config) => handleSaveConfig(config, 'MAP')}
            onCancel={handleCancel}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-neutral-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {step === 'CONFIGURE' ? 'Back' : 'Cancel'}
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {step === 'SELECT_TYPE' ? 'Create Report' : `Configure ${selectedType} Report`}
          </h1>
          <p className="text-sm text-neutral-400">
            {step === 'SELECT_TYPE'
              ? 'Select a report type to get started'
              : 'Configure your report settings'}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-5xl mx-auto py-8 px-4">
        {step === 'SELECT_TYPE' && <ReportTypeSelector onSelect={handleTypeSelect} />}

        {step === 'CONFIGURE' && (
          <Card className="bg-neutral-900 border-neutral-700 overflow-hidden">
            {renderConfigPanel()}
          </Card>
        )}
      </main>

      {/* Saving overlay */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-900 p-6 rounded-lg flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span>Saving report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
