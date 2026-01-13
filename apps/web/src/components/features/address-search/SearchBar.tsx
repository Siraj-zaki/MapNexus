/**
 * SearchBar Component
 * Address search with autocomplete using Mapbox Geocoding API
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

interface GeocodingResult {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
}

interface SearchBarProps {
  onLocationSelect: (location: { name: string; center: [number, number] }) => void;
  className?: string;
}

export function SearchBar({ onLocationSelect, className }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Geocoding API call
  const searchAddress = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=${MAPBOX_TOKEN}&types=address,place,poi,locality&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        setResults(data.features);
        setIsOpen(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchAddress]);

  // Handle selection
  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.place_name);
    setIsOpen(false);
    onLocationSelect({
      name: result.place_name,
      center: result.center,
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full max-w-xl', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={t('addressSearch.searchPlaceholder')}
          className="w-full h-14 ps-12 pe-12 text-lg text-white placeholder:text-neutral-500 bg-neutral-800 rounded-xl border border-neutral-700 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading ? (
          <Loader2 className="absolute end-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 animate-spin" />
        ) : query ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={clearSearch}
            className="absolute end-2 top-1/2 -translate-y-1/2 h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-700"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-neutral-800 rounded-xl border border-neutral-700 shadow-2xl overflow-hidden z-50">
          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className={cn(
                'w-full flex items-start gap-3 p-4 text-start hover:bg-neutral-700 transition-colors',
                index === selectedIndex && 'bg-blue-900/20',
                index !== results.length - 1 && 'border-b border-neutral-700'
              )}
            >
              <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-200 truncate">{result.place_name}</p>
                <p className="text-sm text-neutral-400 capitalize">
                  {result.place_type[0]?.replace('_', ' ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && results.length === 0 && query.length >= 3 && !isLoading && (
        <div className="absolute top-full mt-2 w-full bg-neutral-800 rounded-xl border border-neutral-700 shadow-xl p-4 text-center text-neutral-400">
          {t('addressSearch.noResults')}
        </div>
      )}
    </div>
  );
}
