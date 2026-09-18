import React from 'react';
import { useStore } from '../../context/StoreContext';

export const CategoryBar: React.FC = () => {
  const { categories, selectedCategoryId, setSelectedCategoryId, themeColors } = useStore();

  const activeCategories = categories.filter(c => c.isActive !== false);

  return (
    <div
      id="category-navigation-bar"
      className="border-b sticky top-16 z-30 transition-colors backdrop-blur-md bg-opacity-90"
      style={{
        borderColor: themeColors.border,
        backgroundColor: `${themeColors.surface}f0`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategoryId === null
                ? 'shadow-xs text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            style={{
              backgroundColor: selectedCategoryId === null ? themeColors.primary : 'transparent',
              color: selectedCategoryId === null ? '#ffffff' : themeColors.text,
              border: `1px solid ${selectedCategoryId === null ? themeColors.primary : themeColors.border}`,
            }}
          >
            All Products
          </button>

          {activeCategories.map(cat => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'shadow-xs text-white'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                style={{
                  backgroundColor: isSelected ? themeColors.primary : 'transparent',
                  color: isSelected ? '#ffffff' : themeColors.text,
                  border: `1px solid ${isSelected ? themeColors.primary : themeColors.border}`,
                }}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
