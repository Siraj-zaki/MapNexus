/**
 * NewMapModal with navigation to Editor
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Grid, MapPin, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface NewMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  featured?: boolean;
}

function OptionCard({ icon, title, description, onClick, featured }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border transition-all text-start',
        featured
          ? 'p-6 bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
          : 'p-4 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      )}
    >
      <div
        className={cn('flex items-start gap-4', featured && 'flex-col items-center text-center')}
      >
        <div
          className={cn(
            'rounded-xl bg-white/10 flex items-center justify-center',
            featured ? 'w-14 h-14' : 'w-10 h-10'
          )}
        >
          {icon}
        </div>
        <div className={cn(featured && 'mt-2')}>
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function NewMapModal({ isOpen, onClose }: NewMapModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleUploadFloorPlans = () => {
    onClose();
    navigate('/upload');
  };

  const handleMapFromAddress = () => {
    onClose();
    navigate('/address-search');
  };

  const handleDemoMap = () => {
    onClose();
    navigate('/editor/new?type=demo');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-card/80 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('dashboard.newMap')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Primary Option - Upload Floor Plans */}
          <OptionCard
            icon={<Upload className="h-6 w-6 text-foreground" />}
            title={t('newMap.uploadFloorPlans')}
            description={t('newMap.uploadDesc')}
            onClick={handleUploadFloorPlans}
            featured
          />

          {/* Secondary Options */}
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              icon={<MapPin className="h-5 w-5 text-foreground" />}
              title={t('newMap.mapFromAddress')}
              description={t('newMap.addressDesc')}
              onClick={handleMapFromAddress}
            />
            <OptionCard
              icon={<Grid className="h-5 w-5 text-foreground" />}
              title={t('newMap.useDemoMap')}
              description={t('newMap.demoDesc')}
              onClick={handleDemoMap}
            />
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center mt-4 pt-4 border-t border-white/10">
          <a
            href="#"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('newMap.noFloorPlans')}{' '}
            <span className="text-foreground hover:underline">{t('newMap.learnHow')} →</span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}

NewMapModal.displayName = 'NewMapModal';
