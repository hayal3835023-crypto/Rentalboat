import { Ship, Sailboat, Waves, Anchor } from 'lucide-react';

const iconMap = {
  ship: Ship,
  sailboat: Sailboat,
  boat: Ship,
  waves: Waves,
  anchor: Anchor
};

export const CategoryCard = ({ category, onClick, isSelected }) => {
  const Icon = iconMap[category.icon] || Ship;

  return (
    <button
      onClick={() => onClick(category.id)}
      className={`category-card flex flex-col items-center gap-2 p-4 rounded-xl border-2 min-w-[90px] ${
        isSelected 
          ? 'border-teal-600 bg-teal-50' 
          : 'border-slate-200 bg-white hover:border-teal-300'
      }`}
      data-testid={`category-${category.id}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
      }`}>
        <Icon size={24} />
      </div>
      <span className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-slate-700'}`}>
        {category.name}
      </span>
      {category.count > 0 && (
        <span className="text-xs text-slate-400">{category.count} bateaux</span>
      )}
    </button>
  );
};
