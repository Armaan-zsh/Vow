import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddItemModal } from '../AddItemModal';
import { AddItemUseCase } from '@/core/use-cases/AddItemUseCase';
import { ItemType } from '@/core/entities/Item';
import { createMockEventBus } from '@/shared/testing/mocks';

expect.extend(toHaveNoViolations);

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock API route
global.fetch = jest.fn();

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockAddItemUseCase = {
  execute: jest.fn().mockResolvedValue({
    id: 'item-123',
    userId: 'user-123',
    title: 'Test Book',
    type: ItemType.BOOK,
  }),
} as unknown as AddItemUseCase;

describe('AddItemModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
  });

  const renderModal = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddItemModal
          isOpen={true}
          onClose={jest.fn()}
          addItemUseCase={mockAddItemUseCase}
          userId="user-123"
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('renders modal when open', () => {
    renderModal();
    expect(screen.getByText('ADD NEW ITEM')).toBeInTheDocument();
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('ADD NEW ITEM')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on close button click', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders type selector', () => {
    renderModal();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Paper')).toBeInTheDocument();
    expect(screen.getByText('Article')).toBeInTheDocument();
  });

  it('changes type when type button clicked', () => {
    renderModal();
    const paperButton = screen.getByText('Paper');
    fireEvent.click(paperButton);
    
    expect(paperButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows search input', () => {
    renderModal();
    const searchInput = screen.getByLabelText('Search for items');
    expect(searchInput).toBeInTheDocument();
  });

  it('debounces search input', async () => {
    renderModal();
    const searchInput = screen.getByLabelText('Search for items');
    
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 500 });
  });

  it('shows manual form fields', () => {
    renderModal();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument();
  });

  it('validates required title field', async () => {
    renderModal();
    const submitButton = screen.getByText('ADD ITEM');
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    renderModal();
    
    const titleInput = screen.getByPlaceholderText('Enter title');
    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    
    const submitButton = screen.getByText('ADD ITEM');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockAddItemUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Book',
          type: ItemType.BOOK,
        })
      );
    });
  });

  it('disables submit button while submitting', async () => {
    mockAddItemUseCase.execute = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100))) as any;
    
    renderModal();
    
    const titleInput = screen.getByPlaceholderText('Enter title');
    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    
    const submitButton = screen.getByText('ADD ITEM');
    fireEvent.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('ADDING...');
  });

  it('prevents duplicate submissions', async () => {
    let resolvePromise: () => void;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    mockAddItemUseCase.execute = jest.fn(() => promise) as any;
    
    renderModal();
    
    const titleInput = screen.getByPlaceholderText('Enter title');
    fireEvent.change(titleInput, { target: { value: 'Test Book' } });
    
    const submitButton = screen.getByText('ADD ITEM');
    fireEvent.click(submitButton);
    fireEvent.click(submitButton); // Second click
    
    await waitFor(() => {
      expect(mockAddItemUseCase.execute).toHaveBeenCalledTimes(1);
    });
    
    resolvePromise!();
  });

  it('shows type-specific fields', () => {
    renderModal();
    
    // Book should show ISBN
    expect(screen.queryByPlaceholderText('978-0123456789')).toBeInTheDocument();
    
    // Switch to Paper
    fireEvent.click(screen.getByText('Paper'));
    expect(screen.queryByPlaceholderText('10.1000/182')).toBeInTheDocument();
    
    // Switch to Article
    fireEvent.click(screen.getByText('Article'));
    expect(screen.queryByPlaceholderText('https://example.com/article')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    renderModal();
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderModal();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('resets form when modal closes', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <AddItemModal
          isOpen={true}
          onClose={jest.fn()}
          addItemUseCase={mockAddItemUseCase}
          userId="user-123"
        />
      </QueryClientProvider>
    );
    
    const titleInput = screen.getByPlaceholderText('Enter title');
    fireEvent.change(titleInput, { target: { value: 'Test' } });
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <AddItemModal
          isOpen={false}
          onClose={jest.fn()}
          addItemUseCase={mockAddItemUseCase}
          userId="user-123"
        />
      </QueryClientProvider>
    );
    
    rerender(
      <QueryClientProvider client={queryClient}>
        <AddItemModal
          isOpen={true}
          onClose={jest.fn()}
          addItemUseCase={mockAddItemUseCase}
          userId="user-123"
        />
      </QueryClientProvider>
    );
    
    expect(screen.getByPlaceholderText('Enter title')).toHaveValue('');
  });
});

