/**
 * useQueryParams Hook
 * Manages URL search parameters for state persistence
 * Similar to how Jira handles modal state via URL
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get a single param value
  const get = useCallback(
    (key: string): string | null => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  // Get all params as object
  const getAll = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }, [searchParams]);

  // Set a single param (preserves other params)
  const set = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          if (value === null || value === '') {
            prev.delete(key);
          } else {
            prev.set(key, value);
          }
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Set multiple params at once
  const setMultiple = useCallback(
    (params: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === '') {
              prev.delete(key);
            } else {
              prev.set(key, value);
            }
          });
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Remove a param
  const remove = useCallback(
    (key: string) => {
      setSearchParams(
        (prev) => {
          prev.delete(key);
          return prev;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Clear all params
  const clear = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Check if a param exists
  const has = useCallback(
    (key: string): boolean => {
      return searchParams.has(key);
    },
    [searchParams]
  );

  return {
    get,
    getAll,
    set,
    setMultiple,
    remove,
    clear,
    has,
    searchParams,
  };
}

/**
 * Convenience hook for modal state via URL
 * Usage: const { isOpen, open, close } = useModalParam('new-map')
 * URL: ?modal=new-map
 */
export function useModalParam(modalId: string) {
  const { get, set } = useQueryParams();

  const isOpen = get('modal') === modalId;

  const open = useCallback(() => {
    set('modal', modalId);
  }, [set, modalId]);

  const close = useCallback(() => {
    set('modal', null);
  }, [set]);

  return { isOpen, open, close };
}

/**
 * Convenience hook for tab state via URL
 * Usage: const { activeTab, setTab } = useTabParam('tab', 'maps')
 * URL: ?tab=maps
 */
export function useTabParam(paramName: string, defaultTab: string) {
  const { get, set } = useQueryParams();

  const activeTab = get(paramName) || defaultTab;

  const setTab = useCallback(
    (tab: string) => {
      set(paramName, tab === defaultTab ? null : tab);
    },
    [set, paramName, defaultTab]
  );

  return { activeTab, setTab };
}
