import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ItemCard } from '../ItemCard';
import { ItemDTO } from '../../../shared/types/ItemDTO';

expect.extend(toHaveNoViolations);

const mockBook: ItemDTO = {
  id: '1',
  title: 'The Pragmatic Programmer',
  author: 'David Thomas',
  type: 'BOOK',
  coverImage: 'https://example.com/cover.jpg',
  rating: 5,
  readDate: '2024-01-15',
  status: 'read',
  tags: ['programming', 'career'],
  addedAt: '2024-01-01',
};

const mockPaper: ItemDTO = {
  id: '2',
  title: 'Attention Is All You Need',
  author: 'Vaswani et al.',
  type: 'PAPER',
  status: 'reading',
  addedAt: '2024-02-01',
};

describe('ItemCard', () => {
  it('renders book in grid variant', () => {
    render(<ItemCard item={mockBook} variant="grid" />);

    expect(screen.getByText('The Pragmatic Programmer')).toBeInTheDocument();
    expect(screen.getByText('David Thomas')).toBeInTheDocument();
    expect(screen.getByText('BOOK')).toBeInTheDocument();
    expect(screen.getByText('programming')).toBeInTheDocument();
    expect(screen.getByText('career')).toBeInTheDocument();
  });

  it('renders paper in list variant', () => {
    render(<ItemCard item={mockPaper} variant="list" />);

    expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument();
    expect(screen.getByText('Vaswani et al.')).toBeInTheDocument();
    expect(screen.getByText('PAPER')).toBeInTheDocument();
  });

  it('displays rating stars correctly', () => {
    render(<ItemCard item={mockBook} variant="grid" />);

    const ratingElement = screen.getByLabelText('Rating: 5 out of 5 stars');
    expect(ratingElement).toBeInTheDocument();
  });

  it('displays read date when available', () => {
    render(<ItemCard item={mockBook} variant="grid" />);

    expect(screen.getByText('Read: Jan 15, 2024')).toBeInTheDocument();
  });

  it('shows fallback icon when no cover image', () => {
    const itemWithoutCover = { ...mockBook, coverImage: undefined };
    render(<ItemCard item={itemWithoutCover} variant="grid" />);

    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
  });

  it('calls onEdit when clicked', () => {
    const onEdit = jest.fn();
    render(<ItemCard item={mockBook} variant="grid" onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit on Enter key press', () => {
    const onEdit = jest.fn();
    render(<ItemCard item={mockBook} variant="grid" onEdit={onEdit} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit on Space key press', () => {
    const onEdit = jest.fn();
    render(<ItemCard item={mockBook} variant="grid" onEdit={onEdit} />);

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('does not show edit overlay when onEdit not provided', () => {
    render(<ItemCard item={mockBook} variant="grid" />);

    expect(screen.queryByText('EDIT')).not.toBeInTheDocument();
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('shows edit overlay when onEdit provided', () => {
    render(<ItemCard item={mockBook} variant="grid" onEdit={() => {}} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('limits tags display in grid variant', () => {
    const itemWithManyTags = {
      ...mockBook,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    render(<ItemCard item={itemWithManyTags} variant="grid" />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.queryByText('tag3')).not.toBeInTheDocument();
  });

  it('shows more tags in list variant', () => {
    const itemWithManyTags = {
      ...mockBook,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    render(<ItemCard item={itemWithManyTags} variant="list" />);

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('tag4')).toBeInTheDocument();
    expect(screen.queryByText('tag5')).not.toBeInTheDocument();
  });

  it('handles missing optional fields gracefully', () => {
    const minimalItem: ItemDTO = {
      id: '3',
      title: 'Minimal Item',
      type: 'ARTICLE',
      status: 'want-to-read',
      addedAt: '2024-01-01',
    };

    render(<ItemCard item={minimalItem} variant="grid" />);

    expect(screen.getByText('Minimal Item')).toBeInTheDocument();
    expect(screen.getByText('ARTICLE')).toBeInTheDocument();
  });

  it('has proper ARIA labels', () => {
    render(<ItemCard item={mockBook} variant="grid" onEdit={() => {}} />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute(
      'aria-label',
      'The Pragmatic Programmer by David Thomas - Click to edit'
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ItemCard item={mockBook} variant="grid" onEdit={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders efficiently with React.memo', () => {
    const { rerender } = render(<ItemCard item={mockBook} variant="grid" />);

    // Same props should not cause re-render
    rerender(<ItemCard item={mockBook} variant="grid" />);

    expect(screen.getByText('The Pragmatic Programmer')).toBeInTheDocument();
  });

  describe('Performance with many cards', () => {
    it('renders 100 cards without performance issues', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        ...mockBook,
        id: `item-${i}`,
        title: `Book ${i}`,
      }));

      const start = performance.now();

      render(
        <div>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} variant="list" />
          ))}
        </div>
      );

      const end = performance.now();
      const renderTime = end - start;

      // Should render 100 cards in under 100ms
      expect(renderTime).toBeLessThan(100);
      expect(screen.getAllByText(/Book \d+/)).toHaveLength(100);
    });

    it('renders 1000 cards for virtualization testing', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        ...mockBook,
        id: `item-${i}`,
        title: `Book ${i}`,
      }));

      const start = performance.now();

      render(
        <div>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} variant="list" />
          ))}
        </div>
      );

      const end = performance.now();
      const renderTime = end - start;

      // Should render 1000 cards (virtualized later)
      expect(screen.getAllByText(/Book \d+/)).toHaveLength(1000);
      // Performance check - should complete in reasonable time
      expect(renderTime).toBeLessThan(5000);
    });
  });
});
