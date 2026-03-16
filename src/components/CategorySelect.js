import React, { useState, useRef, useEffect } from 'react';
import { storage } from '../utils/storage';
import { getIconComponent } from '../utils/icons';
import { ChevronDown } from 'lucide-react';

export default function CategorySelect({ value, onChange, includeAll = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayCategory, setDisplayCategory] = useState(null);
  const dropdownRef = useRef(null);

  const categories = storage.categories.getAll();
  const allCategories = includeAll 
    ? [{ id: 'all', name: 'Todas categorias', color: '#9CA3AF', icon: 'MoreHorizontal' }, ...categories]
    : categories;

  const selectedCategory = allCategories.find(c => c.name === value || c.id === value);

  useEffect(() => {
    setDisplayCategory(selectedCategory);
  }, [value, selectedCategory]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (categoryName, categoryId) => {
    const selectValue = includeAll && categoryId === 'all' ? 'all' : categoryName;
    onChange({ target: { value: selectValue } });
    setIsOpen(false);
  };

  const IconComponent = displayCategory 
    ? getIconComponent(displayCategory.icon || 'MoreHorizontal')
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {displayCategory && (
            <>
              <IconComponent
                size={20}
                color={displayCategory.color}
                strokeWidth={1.5}
              />
              <span className="text-gray-900">{displayCategory.name}</span>
            </>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10">
          {allCategories.map(cat => {
            const CatIcon = getIconComponent(cat.icon || 'MoreHorizontal');
            const catValue = includeAll && cat.id === 'all' ? 'all' : cat.name;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.name, cat.id)}
                className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-blue-50 text-left transition-colors ${
                  value === catValue ? 'bg-blue-100' : ''
                }`}
              >
                <CatIcon
                  size={20}
                  color={cat.color}
                  strokeWidth={1.5}
                />
                <span className={value === catValue ? 'font-medium text-blue-900' : 'text-gray-900'}>
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
