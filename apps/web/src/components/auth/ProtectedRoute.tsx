/**
 * ProtectedRoute with proper initialization check
 */

import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, isInitialized, user } = useAuthStore();
  const location = useLocation();

  // Wait for auth state to be initialized (hydrated from storage)
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('errors.accessDenied')}</h1>
          <p className="text-muted-foreground">{t('errors.noPermission')}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
