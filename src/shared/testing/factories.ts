import { SearchItemsDTO, SortBy } from '@/core/use-cases/SearchItemsUseCase';
import { AddItemDTO } from '@/core/use-cases/AddItemUseCase';
import { createUserId } from '@/core/entities/User';
import { ItemType } from '@/core/entities/Item';

// Fix: Make sortBy and limit optional in factory since they have defaults
type SearchItemsDTOInput = Omit<SearchItemsDTO, 'sortBy' | 'limit'> & {
  sortBy?: SortBy;
  limit?: number;
};

// FIX: Factory ensures ALL required fields are present
export const createSearchItemsDTO = (
  overrides: Partial<SearchItemsDTOInput> = {}
): SearchItemsDTO => ({
  userId: createUserId('user_123'),
  query: 'test query',
  sortBy: SortBy.RELEVANCE,
  limit: 20,
  type: undefined,
  readDateFrom: undefined,
  readDateTo: undefined,
  tags: undefined,
  cursor: undefined,
  ...overrides,
});

export const createAddItemDTO = (overrides: Partial<AddItemDTO> = {}): AddItemDTO => ({
  userId: createUserId('user_123'),
  title: 'Test Book',
  type: ItemType.BOOK,
  author: 'Test Author',
  isbn: '9780123456789',
  metadata: {},
  ...overrides,
});

// FIX: User factory for consistent test data
export const createTestUser = (overrides: Partial<any> = {}) => ({
  id: createUserId('user_123'),
  username: 'testuser',
  email: 'test@example.com',
  stats: { totalItems: 0, booksCount: 0, papersCount: 0, articlesCount: 0 },
  ...overrides,
});
