/**
 * Users View Component
 * Admin user management interface
 */

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function UsersView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('dashboard.users')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, roles, and resource assignments
          </p>
        </div>
        <Button className="bg-white/10 hover:bg-white/20 text-foreground">
          <Plus className="h-4 w-4 me-2" />
          Add User
        </Button>
      </div>

      {/* Coming Soon Placeholder */}
      <div className="flex flex-col items-center justify-center h-64 border border-white/10 rounded-lg bg-white/5">
        <p className="text-muted-foreground text-lg">User management coming soon</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create users, assign permissions, and manage resource access
        </p>
      </div>
    </div>
  );
}

UsersView.displayName = 'UsersView';
