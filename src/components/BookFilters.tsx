import React, { useState } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { BookFilters as BookFiltersType } from '../data/filterData';

interface BookFiltersProps {
  filters: BookFiltersType;
  onFiltersChange: (filters: Partial<BookFiltersType>) => void;
  onClearFilters: () => void;
  availableGenres: string[];
  availableReadingLevels: string[];
  className?: string;
}

export default function BookFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  availableGenres,
  availableReadingLevels,
  className = ''
}: BookFiltersProps) {
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  const hasActiveFilters = filters.genre !== 'All' || filters.readingLevel !== 'All' || filters.searchQuery !== '';

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Filter Books</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search books, authors, genres..."
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Genre Filter */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
          <button
            onClick={() => setShowGenreDropdown(!showGenreDropdown)}
            className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <span className={filters.genre === 'All' ? 'text-gray-500' : 'text-gray-900'}>
              {filters.genre}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showGenreDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {availableGenres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => {
                    onFiltersChange({ genre });
                    setShowGenreDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                    filters.genre === genre ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reading Level Filter */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Reading Level</label>
          <button
            onClick={() => setShowLevelDropdown(!showLevelDropdown)}
            className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <span className={filters.readingLevel === 'All' ? 'text-gray-500' : 'text-gray-900'}>
              {filters.readingLevel}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLevelDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {showLevelDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {availableReadingLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    onFiltersChange({ readingLevel: level });
                    setShowLevelDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors ${
                    filters.readingLevel === level ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {filters.genre !== 'All' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Genre: {filters.genre}
                  <button
                    onClick={() => onFiltersChange({ genre: 'All' })}
                    className="ml-2 hover:text-blue-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.readingLevel !== 'All' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Level: {filters.readingLevel}
                  <button
                    onClick={() => onFiltersChange({ readingLevel: 'All' })}
                    className="ml-2 hover:text-green-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.searchQuery && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Search: "{filters.searchQuery}"
                  <button
                    onClick={() => onFiltersChange({ searchQuery: '' })}
                    className="ml-2 hover:text-purple-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}