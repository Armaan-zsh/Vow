import { memo } from 'react';
import { cva } from 'class-variance-authority';

interface TypeBadgeProps {
  type: 'BOOK' | 'PAPER' | 'ARTICLE';
  variant: 'grid' | 'list';
}

const badgeVariants = cva(
  'absolute font-black text-black border-2 border-black font-mono',
  {
    variants: {
      type: {
        BOOK: 'bg-[#FF6B35]',
        PAPER: 'bg-[#F7931E]', 
        ARTICLE: 'bg-[#FFD23F]',
      },
      variant: {
        grid: 'top-2 right-2 px-2 py-1 text-xs',
        list: 'top-1 right-1 px-1 py-0.5 text-[10px]',
      },
    },
  }
);

export const TypeBadge = memo(function TypeBadge({ type, variant }: TypeBadgeProps) {
  return (
    <div className={badgeVariants({ type, variant })}>
      {type}
    </div>
  );
});