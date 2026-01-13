/**
 * MapCard Component
 * Displays a venue/map card in the dashboard grid
 */

import { cn } from '@/lib/utils';
import { Map, MoreVertical } from 'lucide-react';

export interface Venue {
  id: string;
  name: string;
  updatedAt: string;
  isActive: boolean;
  floors?: { floorPlanUrl?: string }[];
}

export interface MapCardProps {
  venue: Venue;
  onClick?: () => void;
  onOptionsClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function MapCard({ venue, onClick, onOptionsClick, className }: MapCardProps) {
  const floorCount = venue.floors?.length || 0;
  const lastEdited = new Date(venue.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer overflow-hidden hover:shadow-lg transition-all',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
        {venue.floors?.[0]?.floorPlanUrl ? (
          <img
            src={venue.floors[0].floorPlanUrl}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Map className="h-8 w-8 text-muted-foreground" />
        )}

        {onOptionsClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOptionsClick(e);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-foreground truncate">{venue.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {floorCount} floor{floorCount !== 1 ? 's' : ''} • Edited {lastEdited}
        </p>
      </div>

      {!venue.isActive && (
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500">
            Inactive
          </span>
        </div>
      )}
    </div>
  );
}

MapCard.displayName = 'MapCard';
