import { SearchItemsDTO } from '@/core/use-cases/SearchItemsUseCase';
import { AddItemDTO } from '@/core/use-cases/AddItemUseCase';
import { createUserId } from '@/shared/types/branded';
import { ItemType, SortBy } from '@/shared/types/enums';
import { User } from '@/core/entities/User';

// =====================================================================
// FIX: Type-safe factories that guarantee ALL required DTO fields
// =====================================================================
export const createSearchItemsDTO = (overrides: Partial<SearchItemsDTO> = {}): SearchItemsDTO => ({
  userId: createUserId('user_123'),
  query: 'test query',
  sortBy: SortBy.RELEVANCE, // ← FIX: Required field with default
  limit: 20, // ← FIX: Required field with default
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
  url: undefined,
  isbn: undefined,
  doi: undefined,
  metadata: undefined,
  ...overrides,
});

export const createTestUser = (overrides: any = {}): User => {
  return new User({
    id: createUserId('user_123'),
    username: 'testuser',
    email: 'test@example.com',
    stats: { totalItems: 0, booksCount: 0, papersCount: 0, articlesCount: 0 },
    ...overrides,
  });
};
