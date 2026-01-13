/**
 * DashboardHeader with i18n
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Clock,
  Database,
  FileText,
  LayoutDashboard,
  Map,
  Plus,
  Search,
  Server,
  Users,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DashboardHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onNewMap: () => void;
}

export function DashboardHeader({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onNewMap,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  const SORT_OPTIONS = [
    { label: t('dashboard.lastEdited'), value: 'updatedAt' },
    { label: t('dashboard.name'), value: 'name' },
    { label: t('dashboard.dateCreated'), value: 'createdAt' },
  ];

  const tabs = [
    { key: 'maps', label: t('dashboard.maps'), icon: Map },
    { key: 'sensors', label: t('dashboard.sensors'), icon: Database },
    { key: 'data', label: t('dashboard.data'), icon: Server },
    { key: 'users', label: t('dashboard.users'), icon: Users },
    { key: 'reports', label: t('dashboard.reports'), icon: FileText },
    { key: 'flows', label: 'Automation', icon: Workflow },
    { key: 'dashboards', label: t('dashboard.dashboards'), icon: LayoutDashboard },
    { key: 'apis', label: 'APIs', icon: Server },
  ];

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || t('common.search');

  return (
    <header className="sticky top-0 z-20 bg-card/60 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-6 h-14">
        {/* Left: Tab Navigation */}
        <nav className="flex items-center gap-1" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/10 text-foreground'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-white/10">
                <Clock className="h-4 w-4 me-2" />
                {currentSortLabel}
                <ChevronDown className="h-4 w-4 ms-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-card/80 backdrop-blur-xl border-white/10"
            >
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => onSortChange(option.value)}
                  className="hover:bg-white/10"
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dashboard.searchMaps')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 ps-10 bg-white/5 border-white/10 focus:border-white/20"
            />
          </div>

          {/* New Map Button */}
          <Button onClick={onNewMap} className="bg-white/10 hover:bg-white/20 text-foreground">
            <Plus className="h-4 w-4 me-2" />
            {t('dashboard.newMap')}
          </Button>
        </div>
      </div>
    </header>
  );
}

DashboardHeader.displayName = 'DashboardHeader';
