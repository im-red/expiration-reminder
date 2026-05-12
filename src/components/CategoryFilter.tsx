import React from 'react';
import { IonChip } from '@ionic/react';
import './CategoryFilter.scss';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onChange: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onChange
}) => {
  if (!categories.length) {
    return null;
  }

  const handleSelect = (category: string) => () => {
    onChange(category);
  };

  return (
    <div className="category-filter">
      <IonChip
        color={selectedCategory === '' ? 'primary' : 'medium'}
        onClick={handleSelect('')}
        outline={selectedCategory !== ''}
      >
        All
      </IonChip>
      {categories.map(category => (
        <IonChip
          key={category}
          color={selectedCategory === category ? 'primary' : 'medium'}
          onClick={handleSelect(category)}
          outline={selectedCategory !== category}
        >
          {category}
        </IonChip>
      ))}
    </div>
  );
};

export default CategoryFilter;