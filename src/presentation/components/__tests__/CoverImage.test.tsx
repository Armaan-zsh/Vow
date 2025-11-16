import { render, screen } from '@testing-library/react';
import { CoverImage } from '../CoverImage';

describe('CoverImage', () => {
  it('renders image when src provided', () => {
    render(
      <CoverImage
        src="https://example.com/cover.jpg"
        alt="Test cover"
        type="BOOK"
        variant="grid"
      />
    );
    
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', expect.stringContaining('cover.jpg'));
    expect(image).toHaveAttribute('alt', 'Test cover');
  });

  it('renders fallback icon when no src', () => {
    render(
      <CoverImage
        alt="Test cover"
        type="BOOK"
        variant="grid"
      />
    );
    
    expect(screen.getByTestId('fallback-icon')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
  });

  it('shows correct icon for each type', () => {
    const { rerender } = render(
      <CoverImage alt="Test" type="BOOK" variant="grid" />
    );
    expect(screen.getByText('📚')).toBeInTheDocument();

    rerender(<CoverImage alt="Test" type="PAPER" variant="grid" />);
    expect(screen.getByText('📄')).toBeInTheDocument();

    rerender(<CoverImage alt="Test" type="ARTICLE" variant="grid" />);
    expect(screen.getByText('📰')).toBeInTheDocument();
  });
});