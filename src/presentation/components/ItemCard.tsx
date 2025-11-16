'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import { cva } from 'class-variance-authority';
import { ItemDTO } from '../../shared/types/ItemDTO';
import { CoverImage } from './CoverImage';
import { TypeBadge } from './TypeBadge';
import { RatingStars } from './RatingStars';

interface ItemCardProps {
  item: ItemDTO;
  variant: 'grid' | 'list';
  onEdit?: () => void;
}

const cardVariants = cva(
  'relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer overflow-hidden',
  {
    variants: {
      variant: {
        grid: 'w-[200px] h-[300px]',
        list: 'w-full h-[120px] flex',
      },
    },
  }
);

const contentVariants = cva('p-3 flex flex-col justify-between', {
  variants: {
    variant: {
      grid: 'h-[100px]',
      list: 'flex-1 h-full',
    },
  },
});

export const ItemCard = memo(function ItemCard({ item, variant, onEdit }: ItemCardProps) {
  const isGrid = variant === 'grid';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onEdit) {
      e.preventDefault();
      onEdit();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <motion.article
      className={cardVariants({ variant })}
      whileHover={{
        scale: isGrid ? 1.05 : 1.02,
        rotate: isGrid ? 2 : 0,
        boxShadow: '12px 12px 0px 0px rgba(0,0,0,1)',
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onEdit}
      role={onEdit ? 'button' : 'article'}
      tabIndex={onEdit ? 0 : -1}
      onKeyDown={handleKeyDown}
      aria-label={`${item.title} by ${item.author || 'Unknown author'}${onEdit ? ' - Click to edit' : ''}`}
    >
      {/* Cover Image */}
      <div
        className={isGrid ? 'w-full h-[200px] relative' : 'w-[80px] h-full flex-shrink-0 relative'}
      >
        <CoverImage
          src={item.coverImage}
          alt={`Cover of ${item.title}`}
          type={item.type}
          variant={variant}
        />
        <TypeBadge type={item.type} variant={variant} />
      </div>

      {/* Content */}
      <div className={contentVariants({ variant })}>
        <div>
          <h3
            className={`font-black text-black leading-tight mb-1 font-mono ${isGrid ? 'text-sm' : 'text-base'}`}
          >
            {item.title}
          </h3>

          {item.author && (
            <p className={`font-bold text-gray-700 font-mono ${isGrid ? 'text-xs' : 'text-sm'}`}>
              {item.author}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col gap-1">
            {item.readDate && (
              <span className="text-xs font-bold text-gray-600 font-mono">
                Read: {formatDate(item.readDate)}
              </span>
            )}
            <RatingStars rating={item.rating} variant={variant} />
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, isGrid ? 2 : 4).map((tag) => (
              <span
                key={tag}
                className="px-1 py-0.5 text-[10px] font-bold bg-gray-200 border border-black font-mono"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit Overlay */}
      {onEdit && (
        <motion.div
          className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <button
            className="px-4 py-2 bg-[#FFD23F] text-black font-black border-2 border-black transform hover:scale-110 font-mono"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${item.title}`}
          >
            EDIT
          </button>
        </motion.div>
      )}
    </motion.article>
  );
});
