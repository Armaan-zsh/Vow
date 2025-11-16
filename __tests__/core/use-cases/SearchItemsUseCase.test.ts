import { SearchItemsUseCase } from '@/core/use-cases/SearchItemsUseCase';
import { createSearchItemsDTO } from '@/shared/testing/factories';
import { testItemRepo } from '@/shared/testing/integration-helpers';
import { createMockCache, createMockLogger } from '@/shared/testing/mocks';

describe('SearchItemsUseCase', () => {
  let useCase: SearchItemsUseCase;
  let mockCache: any;
  let mockLogger: any;

  beforeEach(() => {
    mockCache = createMockCache();
    mockLogger = createMockLogger();
    useCase = new SearchItemsUseCase(testItemRepo, mockCache, mockLogger);
    
    // Disable caching for tests
    mockCache.get.mockResolvedValue(null);
  });

  it('should search items', async () => {
    // FIX: Use factory, not manual DTO creation
    const dto = createSearchItemsDTO({ query: 'test' });
    const result = await useCase.execute(dto);
    
    expect(result.items).toBeDefined();
    expect(result.searchTime).toBeGreaterThanOrEqual(1); // FIX: >= 1ms guaranteed
  });
});
