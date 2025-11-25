import clsx from 'clsx';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onChange: (category: string) => void;
}

const CategoryFilter = ({
  categories,
  selectedCategory,
  onChange
}: CategoryFilterProps) => {
  if (!categories.length) {
    return null;
  }

  const handleSelect = (category: string) => () => {
    onChange(category);
  };

  return (
    <div className="category-filter">
      <button
        type="button"
        className={clsx('category-pill', { active: selectedCategory === '' })}
        onClick={handleSelect('')}
      >
        All
      </button>
      {categories.map(category => (
        <button
          key={category}
          type="button"
          className={clsx('category-pill', { active: selectedCategory === category })}
          onClick={handleSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;

