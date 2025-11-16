import { memo } from 'react';

interface RatingStarsProps {
  rating?: number;
  variant: 'grid' | 'list';
}

export const RatingStars = memo(function RatingStars({ rating, variant }: RatingStarsProps) {
  if (!rating) return null;

  const starSize = variant === 'grid' ? 'text-xs' : 'text-sm';

  return (
    <div 
      className="flex font-mono"
      aria-label={`Rating: ${rating} out of 5 stars`}
      role="img"
    >
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={`${starSize} ${i < rating ? 'text-[#FFD23F]' : 'text-gray-400'}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
});