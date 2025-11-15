import { createSearchItemsDTO, createAddItemDTO, createTestUser } from '@/shared/testing/factories';
import { SortBy } from '@/core/use-cases/SearchItemsUseCase';
import { ItemType } from '@/core/entities/Item';

describe('Test Factories', () => {
  it('should create valid SearchItemsDTO with all required fields', () => {
    const dto = createSearchItemsDTO();

    expect(dto.userId).toBeDefined();
    expect(dto.query).toBe('test query');
    expect(dto.sortBy).toBe(SortBy.RELEVANCE);
    expect(dto.limit).toBe(20);
  });

  it('should create valid AddItemDTO with all required fields', () => {
    const dto = createAddItemDTO();

    expect(dto.userId).toBeDefined();
    expect(dto.title).toBe('Test Book');
    expect(dto.type).toBe(ItemType.BOOK);
    expect(dto.author).toBe('Test Author');
  });

  it('should create valid test user', () => {
    const user = createTestUser();

    expect(user.id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.stats).toBeDefined();
  });

  it('should allow overrides', () => {
    const dto = createSearchItemsDTO({ query: 'custom query', limit: 10 });

    expect(dto.query).toBe('custom query');
    expect(dto.limit).toBe(10);
    expect(dto.sortBy).toBe(SortBy.RELEVANCE); // Default preserved
  });
});
