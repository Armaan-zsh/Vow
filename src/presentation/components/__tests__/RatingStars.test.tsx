import { render, screen } from '@testing-library/react';
import { RatingStars } from '../RatingStars';

describe('RatingStars', () => {
  it('renders correct number of filled stars', () => {
    render(<RatingStars rating={3} variant="grid" />);

    const ratingElement = screen.getByLabelText('Rating: 3 out of 5 stars');
    expect(ratingElement).toBeInTheDocument();

    const stars = screen.getAllByText('★');
    expect(stars).toHaveLength(5);
  });

  it('does not render when no rating', () => {
    const { container } = render(<RatingStars variant="grid" />);
    expect(container.firstChild).toBeNull();
  });

  it('has proper accessibility attributes', () => {
    render(<RatingStars rating={4} variant="list" />);

    const ratingElement = screen.getByRole('img');
    expect(ratingElement).toHaveAttribute('aria-label', 'Rating: 4 out of 5 stars');
  });
});
