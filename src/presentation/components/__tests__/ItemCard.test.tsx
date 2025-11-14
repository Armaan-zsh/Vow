import { render, screen, fireEvent } from '@testing-library/react';
import { ItemCard } from '../ItemCard';
import { ItemDTO } from '../../../shared/types/ItemDTO';

const mockItem: ItemDTO = {
  id: '1',
  title: 'Test Book',
  author: 'Test Author',
  type: 'BOOK',
  coverImage: 'https://example.com/cover.jpg',
  publishedYear: 2023,
  rating: 4,
  addedAt: '2024-01-15T10:00:00Z'
};

const mockOnEdit = jest.fn();

describe('ItemCard', () => {
  beforeEach(() => {
    mockOnEdit.mockClear();
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      expect(screen.getByLabelText('Edit Test Book by Test Author')).toBeInTheDocument();
      expect(screen.getByLabelText('Rating: 4 out of 5 stars')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      const card = screen.getByLabelText('Edit Test Book by Test Author');
      card.focus();
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should have proper alt text for cover image', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      expect(screen.getByAltText('Cover of Test Book')).toBeInTheDocument();
    });

    it('should handle missing author gracefully', () => {
      const itemWithoutAuthor = { ...mockItem, author: undefined };
      render(<ItemCard item={itemWithoutAuthor} variant="grid" onEdit={mockOnEdit} />);
      
      expect(screen.getByLabelText('Edit Test Book by Unknown author')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render grid variant correctly', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      const card = screen.getByLabelText('Edit Test Book by Test Author');
      expect(card).toHaveClass('w-[200px]', 'h-[300px]');
    });

    it('should render list variant correctly', () => {
      render(<ItemCard item={mockItem} variant="list" onEdit={mockOnEdit} />);
      
      const card = screen.getByLabelText('Edit Test Book by Test Author');
      expect(card).toHaveClass('w-full', 'h-[120px]', 'flex');
    });
  });

  describe('Content Display', () => {
    it('should display all item information', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      expect(screen.getByText('Test Book')).toBeInTheDocument();
      expect(screen.getByText('Test Author')).toBeInTheDocument();
      expect(screen.getByText('BOOK')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
    });

    it('should display rating stars correctly', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      const stars = screen.getAllByText('★');
      expect(stars).toHaveLength(5);
    });

    it('should show fallback icon when no cover image', () => {
      const itemWithoutCover = { ...mockItem, coverImage: undefined };
      render(<ItemCard item={itemWithoutCover} variant="grid" onEdit={mockOnEdit} />);
      
      expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument();
    });

    it('should display correct type colors and icons', () => {
      const paperItem = { ...mockItem, type: 'PAPER' as const, coverImage: undefined };
      render(<ItemCard item={paperItem} variant="grid" onEdit={mockOnEdit} />);
      
      expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
      expect(screen.getByText('📄')).toBeInTheDocument();
      expect(screen.getByText('PAPER')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onEdit when card is clicked', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      fireEvent.click(screen.getByLabelText('Edit Test Book by Test Author'));
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when edit button is clicked', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      const editButton = screen.getByLabelText('Edit Test Book');
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('should prevent event bubbling on edit button click', () => {
      render(<ItemCard item={mockItem} variant="grid" onEdit={mockOnEdit} />);
      
      const editButton = screen.getByLabelText('Edit Test Book');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      
      fireEvent(editButton, clickEvent);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });
  });
});