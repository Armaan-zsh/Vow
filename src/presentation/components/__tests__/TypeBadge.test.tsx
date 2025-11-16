import { render, screen } from '@testing-library/react';
import { TypeBadge } from '../TypeBadge';

describe('TypeBadge', () => {
  it('renders correct type text', () => {
    render(<TypeBadge type="BOOK" variant="grid" />);
    expect(screen.getByText('BOOK')).toBeInTheDocument();
  });

  it('applies correct styling for each type', () => {
    const { rerender } = render(<TypeBadge type="BOOK" variant="grid" />);
    let badge = screen.getByText('BOOK');
    expect(badge).toHaveClass('bg-[#FF6B35]');

    rerender(<TypeBadge type="PAPER" variant="grid" />);
    badge = screen.getByText('PAPER');
    expect(badge).toHaveClass('bg-[#F7931E]');

    rerender(<TypeBadge type="ARTICLE" variant="grid" />);
    badge = screen.getByText('ARTICLE');
    expect(badge).toHaveClass('bg-[#FFD23F]');
  });

  it('applies different sizes for variants', () => {
    const { rerender } = render(<TypeBadge type="BOOK" variant="grid" />);
    let badge = screen.getByText('BOOK');
    expect(badge).toHaveClass('text-xs');

    rerender(<TypeBadge type="BOOK" variant="list" />);
    badge = screen.getByText('BOOK');
    expect(badge).toHaveClass('text-[10px]');
  });
});