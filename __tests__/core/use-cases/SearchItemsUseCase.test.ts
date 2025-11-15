import { SearchItemsUseCase, SortBy } from '../../../src/core/use-cases/SearchItemsUseCase';
import { ItemType } from '../../../src/core/entities/Item';
import { ValidationError } from '../../../src/shared/types/errors';
import { createSearchItemsDTO } from '../../../src/shared/testing/factories';

// Mock dependencies
const mockItemRepository = {
  searchWithRawQuery: jest.fn(),
  executeRawQuery: jest.fn()
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn()
};

const mockLogger = {
  warn: jest.fn()
};

describe('SearchItemsUseCase', () => {
  let useCase: SearchItemsUseCase;
  const mockUserId = 'user-123' as any;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SearchItemsUseCase(
      mockItemRepository as any,
      mockCache as any,
      mockLogger as any
    );
  });

  describe('Input Validation', () => {
    it('should reject queries shorter than 2 characters', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'a'
      });

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should reject queries longer than 100 characters', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'a'.repeat(101)
      });

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should accept valid search input', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test book',
        type: ItemType.BOOK,
        sortBy: SortBy.RELEVANCE,
        limit: 10
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      const result = await useCase.execute(input);
      expect(result.items).toEqual([]);
    });
  });

  describe('Exact Match Search', () => {
    it('should find exact title matches', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'The Great Gatsby'
      });

      const mockResults = [{
        id: 'item-1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        type: ItemType.BOOK,
        added_at: new Date('2023-01-01'),
        read_date: null,
        notes: null,
        metadata: {},
        title_similarity: 1.0,
        author_similarity: 0.0
      }];

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue(mockResults);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '1' }]);

      const result = await useCase.execute(input);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('The Great Gatsby');
      expect(result.items[0].highlights.title).toContain('<mark>');
      expect(result.items[0].relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('should filter by item type', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'research',
        type: ItemType.PAPER
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockItemRepository.searchWithRawQuery).toHaveBeenCalledWith(
        mockUserId,
        expect.stringContaining('type = $'),
        undefined,
        21
      );
    });

    it('should filter by read date range', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'book',
        readDateFrom: new Date('2023-01-01'),
        readDateTo: new Date('2023-12-31')
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockItemRepository.searchWithRawQuery).toHaveBeenCalledWith(
        mockUserId,
        expect.stringContaining('read_date >='),
        undefined,
        21
      );
    });

    it('should filter by tags', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'fiction',
        tags: ['classic', 'literature']
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockItemRepository.searchWithRawQuery).toHaveBeenCalledWith(
        mockUserId,
        expect.stringContaining("metadata->>'tags'"),
        undefined,
        21
      );
    });
  });

  describe('Sorting', () => {
    it('should sort by relevance by default', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test'
      });

      const mockResults = [
        {
          id: 'item-1',
          title: 'Test Book',
          author: 'Author',
          type: ItemType.BOOK,
          added_at: new Date('2023-01-01'),
          read_date: null,
          notes: null,
          metadata: {},
          title_similarity: 0.5,
          author_similarity: 0.0
        },
        {
          id: 'item-2',
          title: 'Testing Guide',
          author: 'Author',
          type: ItemType.BOOK,
          added_at: new Date('2023-01-02'),
          read_date: null,
          notes: null,
          metadata: {},
          title_similarity: 1.0,
          author_similarity: 0.0
        }
      ];

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue(mockResults);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '2' }]);

      const result = await useCase.execute(input);

      expect(result.items[0].title).toBe('Testing Guide'); // Higher similarity
      expect(result.items[1].title).toBe('Test Book');
    });

    it('should sort by date added when specified', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test',
        sortBy: SortBy.DATE_ADDED
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockItemRepository.searchWithRawQuery).toHaveBeenCalledWith(
        mockUserId,
        expect.stringContaining('ORDER BY added_at DESC'),
        undefined,
        21
      );
    });

    it('should sort by read date when specified', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test',
        sortBy: SortBy.READ_DATE
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockItemRepository.searchWithRawQuery).toHaveBeenCalledWith(
        mockUserId,
        expect.stringContaining('ORDER BY read_date DESC'),
        undefined,
        21
      );
    });
  });

  describe('Pagination', () => {
    it('should support cursor-based pagination', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test',
        cursor: 'item-5',
        limit: 10
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockItemRepository.searchWithRawQuery).toHaveBeenCalledWith(
        mockUserId,
        expect.any(String),
        'item-5',
        11 // limit + 1 to check for next page
      );
    });

    it('should indicate when there are more pages', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test',
        limit: 2
      });

      const mockResults = Array(3).fill(null).map((_, i) => ({
        id: `item-${i}`,
        title: `Test Book ${i}`,
        author: 'Author',
        type: ItemType.BOOK,
        added_at: new Date('2023-01-01'),
        read_date: null,
        notes: null,
        metadata: {},
        title_similarity: 0.8,
        author_similarity: 0.0
      }));

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue(mockResults);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '10' }]);

      const result = await useCase.execute(input);

      expect(result.items).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe('item-1');
    });
  });

  describe('Caching', () => {
    it('should return cached results when available', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test'
      });

      const cachedResponse = {
        items: [],
        hasNextPage: false,
        totalCount: 0,
        searchTime: 50
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedResponse));

      const result = await useCase.execute(input);

      expect(result).toEqual(cachedResponse);
      expect(mockItemRepository.searchWithRawQuery).not.toHaveBeenCalled();
    });

    it('should cache search results', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test'
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        300 // 5 minutes TTL
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should log slow queries', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test'
      });

      mockCache.get.mockResolvedValue(null);
      
      // Mock slow query
      mockItemRepository.searchWithRawQuery.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 600))
      );
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      await useCase.execute(input);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slow search query detected',
        expect.objectContaining({
          userId: mockUserId,
          query: 'test',
          searchTime: expect.any(Number)
        })
      );
    });

    it('should include search time in response', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'test'
      });

      mockCache.get.mockResolvedValue(null);
      mockItemRepository.searchWithRawQuery.mockResolvedValue([]);
      mockItemRepository.executeRawQuery.mockResolvedValue([{ count: '0' }]);

      const result = await useCase.execute(input);

      expect(result.searchTime).toBeGreaterThan(0);
    });
  });
});