'use client';

import { motion } from 'framer-motion';
import { ItemDTO } from '../../shared/types/ItemDTO';

interface ItemCardProps {
  item: ItemDTO;
  variant: 'grid' | 'list';
  onEdit: () => void;
}

const typeColors = {
  BOOK: '#FF6B35',
  PAPER: '#F7931E', 
  ARTICLE: '#FFD23F'
};

const typeIcons = {
  BOOK: '📚',
  PAPER: '📄',
  ARTICLE: '📰'
};

export function ItemCard({ item, variant, onEdit }: ItemCardProps) {
  const isGrid = variant === 'grid';
  
  return (
    <motion.article
      className={`
        relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
        ${isGrid ? 'w-[200px] h-[300px]' : 'w-full h-[120px] flex'}
        cursor-pointer overflow-hidden
      `}
      whileHover={{ 
        scale: isGrid ? 1.05 : 1.02,
        rotate: isGrid ? 2 : 0,
        boxShadow: '12px 12px 0px 0px rgba(0,0,0,1)'
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}
      aria-label={`Edit ${item.title} by ${item.author || 'Unknown author'}`}
    >
      {/* Cover Image */}
      <div className={`
        relative overflow-hidden
        ${isGrid ? 'w-full h-[200px]' : 'w-[80px] h-full flex-shrink-0'}
      `}>
        {item.coverImage ? (
          <img
            src={item.coverImage}
            alt={`Cover of ${item.title}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center text-4xl font-black"
            style={{ backgroundColor: typeColors[item.type] }}
            data-testid="fallback-icon"
          >
            {typeIcons[item.type]}
          </div>
        )}
        
        {/* Type Badge */}
        <div 
          className="absolute top-2 right-2 px-2 py-1 text-xs font-black text-black border-2 border-black"
          style={{ backgroundColor: typeColors[item.type] }}
        >
          {item.type}
        </div>
      </div>

      {/* Content */}
      <div className={`
        p-3 flex flex-col justify-between
        ${isGrid ? 'h-[100px]' : 'flex-1 h-full'}
      `}>
        <div>
          <h3 className={`
            font-black text-black leading-tight mb-1
            ${isGrid ? 'text-sm' : 'text-base'}
          `}>
            {item.title}
          </h3>
          
          {item.author && (
            <p className={`
              font-bold text-gray-700
              ${isGrid ? 'text-xs' : 'text-sm'}
            `}>
              {item.author}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          {item.publishedYear && (
            <span className="text-xs font-bold text-gray-600">
              {item.publishedYear}
            </span>
          )}
          
          {item.rating && (
            <div className="flex" aria-label={`Rating: ${item.rating} out of 5 stars`}>
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${i < item.rating! ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover Overlay */}
      <motion.div
        className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <button
          className="px-4 py-2 bg-white text-black font-black border-2 border-black transform hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label={`Edit ${item.title}`}
        >
          EDIT
        </button>
      </motion.div>
    </motion.article>
  );
}