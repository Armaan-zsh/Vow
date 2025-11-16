import { memo } from 'react';
import { ItemType } from '../../../core/entities/Item';

interface TypeSelectorProps {
  selectedType: ItemType;
  onTypeChange: (type: ItemType) => void;
}

const typeConfig = {
  [ItemType.BOOK]: { icon: '📚', label: 'Book', color: 'bg-[#FF6B35]' },
  [ItemType.PAPER]: { icon: '📄', label: 'Paper', color: 'bg-[#F7931E]' },
  [ItemType.ARTICLE]: { icon: '📰', label: 'Article', color: 'bg-[#FFD23F]' },
};

export const TypeSelector = memo(function TypeSelector({ selectedType, onTypeChange }: TypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Object.entries(typeConfig).map(([type, config]) => (
        <button
          key={type}
          type="button"
          onClick={() => onTypeChange(type as ItemType)}
          className={`
            p-4 border-2 border-black font-mono font-black text-center
            ${selectedType === type ? config.color : 'bg-white hover:bg-gray-100'}
            ${selectedType === type ? 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}
            transition-all duration-200
          `}
          aria-pressed={selectedType === type}
        >
          <div className="text-2xl mb-2">{config.icon}</div>
          <div className="text-sm">{config.label}</div>
        </button>
      ))}
    </div>
  );
});