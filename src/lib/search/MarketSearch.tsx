/**
 * Market Search & Filters Component
 * 
 * Features:
 * - Full-text search
 * - Category filters
 * - Volume sorting
 * - End date filters
 * - Price range filters
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { Market } from '../../../types';

// Filter types
export interface MarketFilters {
  search: string;
  categories: string[];
  sortBy: 'volume' | 'price' | 'endDate' | 'traders' | 'liquidity';
  sortOrder: 'asc' | 'desc';
  priceRange: { min: number; max: number };
  endDateRange: { from: Date | null; to: Date | null };
  showResolved: boolean;
  onlyWatchlist: boolean;
}

export const defaultFilters: MarketFilters = {
  search: '',
  categories: [],
  sortBy: 'volume',
  sortOrder: 'desc',
  priceRange: { min: 0, max: 1 },
  endDateRange: { from: null, to: null },
  showResolved: false,
  onlyWatchlist: false,
};

// Available categories
export const MARKET_CATEGORIES = [
  'Crypto',
  'Politics',
  'Sports',
  'Technology',
  'Finance',
  'Entertainment',
  'Science',
  'Weather',
  'Gaming',
  'Other',
] as const;

// Filter functions
export function filterMarkets(markets: Market[], filters: MarketFilters, watchlistIds?: string[]): Market[] {
  let filtered = [...markets];
  
  // Text search
  if (filters.search.trim()) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(m => 
      m.question.toLowerCase().includes(searchLower) ||
      m.categories.some(c => c.toLowerCase().includes(searchLower))
    );
  }
  
  // Category filter
  if (filters.categories.length > 0) {
    filtered = filtered.filter(m => 
      m.categories.some(c => filters.categories.includes(c))
    );
  }
  
  // Price range
  filtered = filtered.filter(m => 
    m.currentPrice >= filters.priceRange.min &&
    m.currentPrice <= filters.priceRange.max
  );
  
  // End date range
  if (filters.endDateRange.from) {
    filtered = filtered.filter(m => m.ends >= filters.endDateRange.from!.getTime());
  }
  if (filters.endDateRange.to) {
    filtered = filtered.filter(m => m.ends <= filters.endDateRange.to!.getTime());
  }
  
  // Show resolved
  if (!filters.showResolved) {
    filtered = filtered.filter(m => m.ends > Date.now());
  }
  
  // Watchlist only
  if (filters.onlyWatchlist && watchlistIds) {
    filtered = filtered.filter(m => watchlistIds.includes(m.id));
  }
  
  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    switch (filters.sortBy) {
      case 'volume':
        comparison = a.volume - b.volume;
        break;
      case 'price':
        comparison = a.currentPrice - b.currentPrice;
        break;
      case 'endDate':
        comparison = a.ends - b.ends;
        break;
      case 'traders':
        comparison = a.traders - b.traders;
        break;
      case 'liquidity':
        comparison = a.liquidity - b.liquidity;
        break;
    }
    return filters.sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return filtered;
}

// Search & Filter UI Component
interface MarketSearchProps {
  filters: MarketFilters;
  onChange: (filters: MarketFilters) => void;
  resultCount: number;
  totalCount: number;
}

export const MarketSearch: React.FC<MarketSearchProps> = ({
  filters,
  onChange,
  resultCount,
  totalCount,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const updateFilter = useCallback(<K extends keyof MarketFilters>(
    key: K,
    value: MarketFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  }, [filters, onChange]);
  
  const toggleCategory = useCallback((category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilter('categories', newCategories);
  }, [filters.categories, updateFilter]);
  
  const resetFilters = useCallback(() => {
    onChange(defaultFilters);
  }, [onChange]);
  
  const hasActiveFilters = useMemo(() => {
    return filters.search !== '' ||
      filters.categories.length > 0 ||
      filters.priceRange.min > 0 ||
      filters.priceRange.max < 1 ||
      filters.endDateRange.from !== null ||
      filters.endDateRange.to !== null ||
      filters.showResolved ||
      filters.onlyWatchlist;
  }, [filters]);
  
  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg p-4 mb-6">
      {/* Search bar */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-secondary w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search markets..."
            className="w-full bg-brand-surface-2 pl-10 pr-4 py-2 rounded-lg border border-brand-border focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-brand-text placeholder-brand-secondary"
          />
        </div>
        
        {/* Sort dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value as MarketFilters['sortBy'])}
          className="bg-brand-surface-2 px-4 py-2 rounded-lg border border-brand-border text-brand-text focus:outline-none focus:border-brand-primary"
        >
          <option value="volume">Volume</option>
          <option value="price">Price</option>
          <option value="endDate">End Date</option>
          <option value="liquidity">Liquidity</option>
          <option value="traders">Traders</option>
        </select>
        
        {/* Sort order toggle */}
        <button
          onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          className="bg-brand-surface-2 px-3 py-2 rounded-lg border border-brand-border text-brand-secondary hover:text-brand-text transition-colors"
        >
          {filters.sortOrder === 'desc' ? '↓' : '↑'}
        </button>
        
        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            showAdvanced || hasActiveFilters
              ? 'bg-brand-primary text-white border-brand-primary'
              : 'bg-brand-surface-2 border-brand-border text-brand-secondary hover:text-brand-text'
          }`}
        >
          Filters {hasActiveFilters && `(${filters.categories.length + (filters.onlyWatchlist ? 1 : 0)})`}
        </button>
      </div>
      
      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {MARKET_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filters.categories.includes(category)
                ? 'bg-brand-primary text-white'
                : 'bg-brand-surface-2 text-brand-secondary hover:text-brand-text border border-brand-border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Advanced filters */}
      {showAdvanced && (
        <div className="border-t border-brand-border pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Price range */}
            <div>
              <label className="text-sm text-brand-secondary block mb-2">Price Range</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(filters.priceRange.min * 100)}
                  onChange={(e) => updateFilter('priceRange', {
                    ...filters.priceRange,
                    min: parseInt(e.target.value) / 100,
                  })}
                  className="w-20 bg-brand-surface-2 px-2 py-1 rounded border border-brand-border text-brand-text text-sm"
                />
                <span className="text-brand-secondary">¢ to</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(filters.priceRange.max * 100)}
                  onChange={(e) => updateFilter('priceRange', {
                    ...filters.priceRange,
                    max: parseInt(e.target.value) / 100,
                  })}
                  className="w-20 bg-brand-surface-2 px-2 py-1 rounded border border-brand-border text-brand-text text-sm"
                />
                <span className="text-brand-secondary">¢</span>
              </div>
            </div>
            
            {/* End date range */}
            <div>
              <label className="text-sm text-brand-secondary block mb-2">Ends Between</label>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={filters.endDateRange.from?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateFilter('endDateRange', {
                    ...filters.endDateRange,
                    from: e.target.value ? new Date(e.target.value) : null,
                  })}
                  className="bg-brand-surface-2 px-2 py-1 rounded border border-brand-border text-brand-text text-sm"
                />
                <span className="text-brand-secondary">-</span>
                <input
                  type="date"
                  value={filters.endDateRange.to?.toISOString().split('T')[0] || ''}
                  onChange={(e) => updateFilter('endDateRange', {
                    ...filters.endDateRange,
                    to: e.target.value ? new Date(e.target.value) : null,
                  })}
                  className="bg-brand-surface-2 px-2 py-1 rounded border border-brand-border text-brand-text text-sm"
                />
              </div>
            </div>
            
            {/* Toggles */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showResolved}
                  onChange={(e) => updateFilter('showResolved', e.target.checked)}
                  className="rounded border-brand-border bg-brand-surface-2 text-brand-primary focus:ring-brand-primary"
                />
                Show resolved markets
              </label>
              <label className="flex items-center gap-2 text-sm text-brand-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyWatchlist}
                  onChange={(e) => updateFilter('onlyWatchlist', e.target.checked)}
                  className="rounded border-brand-border bg-brand-surface-2 text-brand-primary focus:ring-brand-primary"
                />
                Watchlist only ⭐
              </label>
            </div>
          </div>
          
          {/* Reset button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 text-sm text-brand-secondary hover:text-brand-text transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}
      
      {/* Results count */}
      <div className="text-sm text-brand-secondary mt-2">
        Showing {resultCount} of {totalCount} markets
      </div>
    </div>
  );
};

export default MarketSearch;
