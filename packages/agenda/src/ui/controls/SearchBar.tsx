import React, { useState, useEffect } from 'react';
import { useMembranaStore } from '../../core/store';

interface SearchBarProps {
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Поиск модулей...',
  debounceMs = 300,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const setFilters = useMembranaStore((state) => state.setFilters);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchTerm || undefined });
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [searchTerm, setFilters, debounceMs]);
  
  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  );
};