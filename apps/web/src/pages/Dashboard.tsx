/**
 * Dashboard Page with URL-based state management
 */

import { ApisView } from '@/components/features/dashboard/ApisView';
import { FlowsView } from '@/components/features/flows/FlowsView';
import { useModalParam, useQueryParams, useTabParam } from '@/hooks/useQueryParams';
import { Folder, Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardHeader } from '../components/features/dashboard/DashboardHeader';
import { DashboardsView } from '../components/features/dashboard/DashboardsView';
import { DataTablesView } from '../components/features/dashboard/DataView';
import { NewMapCard } from '../components/features/dashboard/NewMapCard';
import { NewMapModal } from '../components/features/dashboard/NewMapModal';
import { ReportsView } from '../components/features/dashboard/ReportsView';
import { SensorsView } from '../components/features/dashboard/SensorsView';
import { UsersView } from '../components/features/dashboard/UsersView';
export default function Dashboard() {
  const { t } = useTranslation();
  const { get, set } = useQueryParams();

  // URL-based state
  const { activeTab, setTab } = useTabParam('tab', 'maps');
  const {
    isOpen: isNewMapModalOpen,
    open: openNewMapModal,
    close: closeNewMapModal,
  } = useModalParam('new-map');

  // Search and sort from URL
  const searchQuery = get('search') || '';
  const sortBy = get('sort') || 'updatedAt';

  const setSearchQuery = (query: string) => set('search', query || null);
  const setSortBy = (sort: string) => set('sort', sort === 'updatedAt' ? null : sort);

  // TODO: Replace with API data
  const venues: any[] = [];

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'maps':
        return (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Folder className="h-4 w-4" />
              <span className="text-foreground font-medium">{t('dashboard.home')}</span>
            </div>

            {/* Your Maps Header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Grid className="h-4 w-4" />
              <span>
                {t('dashboard.yourMaps')} ({venues.length})
              </span>
            </div>

            {/* Maps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <NewMapCard onClick={openNewMapModal} />
            </div>
          </>
        );

      case 'sensors':
        return <SensorsView />;

      case 'data':
        return <DataTablesView />;

      case 'users':
        return <UsersView />;

      case 'reports':
        return <ReportsView />;

      case 'dashboards':
        return <DashboardsView />;

      case 'apis':
        return <ApisView />;

      case 'flows':
        return <FlowsView />;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t('common.comingSoon')}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Tabs */}
      <DashboardHeader
        activeTab={activeTab}
        onTabChange={setTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onNewMap={openNewMapModal}
      />

      {/* Main Content */}
      <main className="p-6">{renderTabContent()}</main>

      {/* New Map Modal */}
      <NewMapModal isOpen={isNewMapModalOpen} onClose={closeNewMapModal} />
    </div>
  );
}
