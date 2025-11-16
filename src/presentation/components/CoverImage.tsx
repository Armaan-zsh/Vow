import Image from 'next/image';
import { memo } from 'react';

interface CoverImageProps {
  src?: string;
  alt: string;
  type: 'BOOK' | 'PAPER' | 'ARTICLE';
  variant: 'grid' | 'list';
}

const typeIcons = {
  BOOK: '📚',
  PAPER: '📄',
  ARTICLE: '📰',
};

const typeColors = {
  BOOK: '#FF6B35',
  PAPER: '#F7931E',
  ARTICLE: '#FFD23F',
};

export const CoverImage = memo(function CoverImage({ src, alt, type, variant }: CoverImageProps) {
  const isGrid = variant === 'grid';
  const dimensions = isGrid ? { width: 200, height: 200 } : { width: 80, height: 120 };

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full object-cover"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        priority={false}
      />
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center text-4xl font-black font-mono"
      style={{ backgroundColor: typeColors[type] }}
      data-testid="fallback-icon"
    >
      {typeIcons[type]}
    </div>
  );
});
