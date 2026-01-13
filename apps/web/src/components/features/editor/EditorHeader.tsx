/**
 * EditorHeader Component with i18n
 * Full header with left controls and right action buttons
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useEditorStore } from '@/stores/editorStore';
import {
  Building2,
  ChevronDown,
  Download,
  ExternalLink,
  Home,
  Info,
  Link2,
  LogOut,
  MapPin,
  Menu,
  MoreVertical,
  Play,
  Plus,
  Search,
  Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface HeaderActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'purple';
}

function HeaderActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: HeaderActionButtonProps) {
  const variantClasses = {
    default: 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white',
    primary: 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white',
    success: 'bg-green-500 hover:bg-green-600 border-green-400 text-white',
    purple: 'bg-purple-600 hover:bg-purple-700 border-purple-500 text-white',
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            onClick={onClick}
            className={cn('h-9 w-9 border shadow-sm', variantClasses[variant])}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-neutral-800 border-neutral-700 text-white">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EditorHeader() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { map, currentFloorId, setCurrentFloor } = useEditorStore();
  const { user, logout } = useAuthStore();

  const currentFloor = map?.floors.find((f) => f.id === currentFloorId);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[1][0]}` : names[0][0];
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Left Side Controls */}
      <header className="absolute top-0 start-0 z-30 flex items-center gap-2 p-3">
        {/* Menu Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 bg-neutral-800 border-neutral-700">
            <DropdownMenuItem
              onClick={() => navigate('/')}
              className="text-white hover:bg-neutral-700"
            >
              <Home className="me-2 h-4 w-4" />
              {t('nav.dashboard')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              <Info className="me-2 h-4 w-4" />
              {t('editor.about')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-700" />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-neutral-700">
              <LogOut className="me-2 h-4 w-4" />
              {t('auth.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Map Name with Add Building Tooltip */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 cursor-pointer hover:bg-neutral-700 transition-colors">
                <span className="font-medium text-white">
                  {map?.name || t('editor.untitledMap')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-neutral-600 text-white"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-neutral-800 border-neutral-700 text-white p-3"
            >
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-blue-400" />
                <div>
                  <p className="font-medium">{t('editor.addBuilding')}</p>
                  <p className="text-xs text-neutral-400">{t('editor.addBuildingDesc')}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Floor Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
            >
              {currentFloor?.name || '1F'}
              <ChevronDown className="ms-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 bg-neutral-800 border-neutral-700">
            {(map?.floors || [{ id: '1', name: '1F', level: 1 }])
              .slice()
              .sort((a, b) => b.level - a.level)
              .map((floor) => (
                <DropdownMenuItem
                  key={floor.id}
                  onClick={() => setCurrentFloor(floor.id)}
                  className={cn(
                    'text-white hover:bg-neutral-700',
                    currentFloorId === floor.id && 'bg-blue-600 hover:bg-blue-600'
                  )}
                >
                  {floor.name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-neutral-800 border-neutral-700">
            {/* Mapping Section */}
            <DropdownMenuLabel className="text-neutral-400 text-xs font-normal">
              {t('editor.sections.mapping')}
            </DropdownMenuLabel>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.floor.copyGeometry')}
            </DropdownMenuItem>

            {/* Floor Plan Section */}
            <DropdownMenuLabel className="text-neutral-400 text-xs font-normal mt-2">
              {t('editor.sections.floorPlan')}
            </DropdownMenuLabel>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.floor.reposition')}
              <span className="ms-1 text-neutral-400 text-xs">(file)</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.floor.replace')}
              <span className="ms-1 text-neutral-400 text-xs">(file)</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.floor.rotate')}
              <span className="ms-1 text-neutral-400 text-xs">(map + outdoors)</span>
            </DropdownMenuItem>

            {/* Setup Section */}
            <DropdownMenuLabel className="text-neutral-400 text-xs font-normal mt-2">
              {t('editor.sections.setup')}
            </DropdownMenuLabel>
            <DropdownMenuItem className="text-white hover:bg-neutral-700 flex items-center justify-between">
              {t('editor.floor.editFloors')}
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700 flex items-center justify-between">
              {t('editor.floor.addressPosition')}
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700 flex items-center justify-between">
              {t('editor.floor.alignment')}
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Right Side Actions */}
      <div className="absolute top-0 end-0 z-30 flex items-center gap-2 p-3">
        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 w-10 p-0 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-neutral-800 border-neutral-700">
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className="text-white hover:bg-neutral-700"
            >
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-700" />
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-neutral-700">
              <LogOut className="me-2 h-4 w-4" />
              {t('auth.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search Button */}
        <HeaderActionButton icon={<Search className="h-4 w-4" />} label={t('common.search')} />

        {/* Location/Map Position Button */}
        <HeaderActionButton
          icon={<MapPin className="h-4 w-4" />}
          label={t('editor.header.location')}
        />

        {/* Download Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="h-9 w-9 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 shadow-sm text-white"
            >
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-neutral-800 border-neutral-700">
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.header.downloadSafetyPDF')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700 flex items-center justify-between">
              {t('editor.header.downloadGLTF')}
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.header.downloadSVG')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700 flex items-center justify-between">
              {t('editor.header.downloadMVF')}
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Integrations Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className="h-9 w-9 bg-purple-600 hover:bg-purple-700 border border-purple-500 shadow-sm text-white"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-neutral-800 border-neutral-700">
            <DropdownMenuItem className="text-white hover:bg-neutral-700 flex items-center justify-between">
              {t('editor.header.exportMicrosoftPlaces')}
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white hover:bg-neutral-700">
              {t('editor.header.viewIntegrations')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Preview 3D + VR Button */}
        <HeaderActionButton
          icon={
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          }
          label={t('editor.header.preview3DVR')}
          variant="purple"
        />

        {/* Publish Button */}
        <HeaderActionButton
          icon={<Play className="h-4 w-4" />}
          label={t('editor.actions.publish')}
          variant="success"
        />
      </div>
    </>
  );
}
