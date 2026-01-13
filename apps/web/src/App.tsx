import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { FlowEditor } from '@/components/features/flows/FlowEditor';
import MainLayout from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/toaster';
import { useLanguage } from '@/hooks/useLanguage';
import AddressSearch from '@/pages/AddressSearch';
import Dashboard from '@/pages/Dashboard';
import DefineArea from '@/pages/DefineArea';
import Editor from '@/pages/Editor';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ReportBuilder from '@/pages/ReportBuilder';
import ReportViewer from '@/pages/ReportViewer';
import Settings from '@/pages/Settings';
import TableDataPage from '@/pages/TableDataPage';
import UploadFloorPlans from '@/pages/UploadFloorPlans';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

// Import i18n configuration
import '@/i18n';

function App() {
  const { fetchUser, isLoading, isInitialized, token } = useAuthStore();
  const { direction } = useLanguage();

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Check auth on app load
  useEffect(() => {
    if (token && !isInitialized) {
      fetchUser();
    }
  }, []);

  // Show loading while checking auth
  if (!isInitialized && isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div dir={direction}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes with MainLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dashboard/data/:tableName" element={<TableDataPage />} />
        </Route>

        {/* Editor - Full screen, no layout */}
        <Route
          path="/editor/:mapId?"
          element={
            <ProtectedRoute>
              <Editor />
            </ProtectedRoute>
          }
        />

        {/* Report Builder - Full screen */}
        <Route
          path="/reports/new"
          element={
            <ProtectedRoute>
              <ReportBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:id"
          element={
            <ProtectedRoute>
              <ReportBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:id/edit"
          element={
            <ProtectedRoute>
              <ReportBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/:id/view"
          element={
            <ProtectedRoute>
              <ReportViewer />
            </ProtectedRoute>
          }
        />

        {/* Upload Floor Plans - Full screen */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadFloorPlans />
            </ProtectedRoute>
          }
        />

        {/* Address Search - Full screen */}
        <Route
          path="/address-search"
          element={
            <ProtectedRoute>
              <AddressSearch />
            </ProtectedRoute>
          }
        />

        {/* Define Area - Full screen */}
        <Route
          path="/define-area"
          element={
            <ProtectedRoute>
              <DefineArea />
            </ProtectedRoute>
          }
        />

        {/* Flow Editor - Full screen */}
        <Route
          path="/flows/:id"
          element={
            <ProtectedRoute>
              <FlowEditor />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </div>
  );
}

export default App;
