/**
 * InstructionsPanel Component
 * Shows instructions for bounding box manipulation
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Maximize2, Move, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InstructionsPanelProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function InstructionsPanel({ onComplete, onBack, isLoading }: InstructionsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute top-4 start-4 z-30 w-80">
      <div className="bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{t('addressSearch.defineArea')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('addressSearch.instructions')}</p>
        </div>

        {/* Instructions */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Move className="h-4 w-4 text-blue-600" />
            </div>
            <span>{t('addressSearch.instructionPan')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Maximize2 className="h-4 w-4 text-blue-600" />
            </div>
            <span>{t('addressSearch.instructionResize')}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <RotateCw className="h-4 w-4 text-blue-600" />
            </div>
            <span>{t('addressSearch.instructionRotate')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 me-2" />
            {t('addressSearch.back')}
          </Button>
          <Button
            onClick={onComplete}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('addressSearch.fetching')}
              </span>
            ) : (
              <>
                <Check className="h-4 w-4 me-2" />
                {t('addressSearch.complete')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
