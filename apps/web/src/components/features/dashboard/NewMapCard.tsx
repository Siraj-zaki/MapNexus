/**
 * NewMapCard with translations
 */

import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface NewMapCardProps {
  onClick: () => void;
  className?: string;
}

export function NewMapCard({ onClick, className }: NewMapCardProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full rounded-xl cursor-pointer border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center h-40 p-4">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
          <Plus className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
        <span className="mt-3 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {t('dashboard.newMap')}
        </span>
      </div>
    </button>
  );
}

NewMapCard.displayName = 'NewMapCard';
