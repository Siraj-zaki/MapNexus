/**
 * useLanguage Hook
 * Manages language switching and RTL/LTR direction
 */

import { getLanguageDir, languages, type LanguageCode } from '@/i18n';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language as LanguageCode;
  const direction = getLanguageDir(currentLanguage);
  const isRTL = direction === 'rtl';

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, direction]);

  const changeLanguage = useCallback(
    async (code: LanguageCode) => {
      await i18n.changeLanguage(code);
      localStorage.setItem('i18nextLng', code);
    },
    [i18n]
  );

  return {
    currentLanguage,
    direction,
    isRTL,
    changeLanguage,
    languages,
  };
}
