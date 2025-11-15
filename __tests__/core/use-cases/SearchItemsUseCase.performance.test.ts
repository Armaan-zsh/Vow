import { SearchItemsUseCase, SortBy } from '../../../src/core/use-cases/SearchItemsUseCase';
import { MockItemRepository } from '../../../src/core/repositories/MockItemRepository';
import { ItemType, ReadingStatus } from '../../../src/core/entities/Item';
import { createUserId } from '../../../src/core/entities/User';
import { createSearchItemsDTO } from '../../../src/shared/testing/factories';

describe('SearchItemsUseCase Performance', () => {
  let useCase: SearchItemsUseCase;
  let itemRepository: MockItemRepository;
  let mockCache: any;
  let mockLogger: any;

  const mockUserId = createUserId('perf-user-123');

  beforeEach(() => {
    itemRepository = new MockItemRepository();
    mockCache = { get: jest.fn(), set: jest.fn() };
    mockLogger = { warn: jest.fn() };

    useCase = new SearchItemsUseCase(
      itemRepository,
      mockCache,
      mockLogger
    );

    // Disable caching for performance tests
    mockCache.get.mockResolvedValue(null);
  });

  describe('Large Dataset Performance', () => {
    beforeEach(async () => {
      // Create 10,000 test items
      const items = [];
      for (let i = 0; i < 10000; i++) {
        const item = await itemRepository.create({
          userId: mockUserId,
          title: `Test Book ${i} - ${getRandomTitle()}`,
          type: getRandomItemType(),
          author: `Author ${i % 100}`,
          url: undefined,
          coverImage: undefined,
          publishedYear: 2000 + (i % 24),
          status: ReadingStatus.WANT_TO_READ,
          rating: undefined,
          notes: i % 10 === 0 ? `Notes for item ${i}` : undefined,
          readDate: i % 5 === 0 ? new Date(2023, i % 12, (i % 28) + 1) : undefined,
          isPublic: false,
          metadata: {
            tags: i % 3 === 0 ? ['fiction'] : i % 3 === 1 ? ['non-fiction'] : ['reference']
          },
          updatedAt: new Date()
        });
        items.push(item);
      }

      console.log(`Created ${items.length} test items`);
    });

    it('should search 10k items in under 200ms', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'Test Book',
        limit: 20
      });

      const startTime = Date.now();
      const result = await useCase.execute(input);
      const searchTime = Date.now() - startTime;

      console.log(`Search completed in ${searchTime}ms`);
      console.log(`Found ${result.items.length} items out of ${result.totalCount} total`);

      expect(searchTime).toBeLessThan(200);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.length).toBeLessThanOrEqual(20);
    });

    it('should handle fuzzy search efficiently', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'Shakespear', // typo
        limit: 20
      });

      const startTime = Date.now();
      const result = await useCase.execute(input);
      const searchTime = Date.now() - startTime;

      console.log(`Fuzzy search completed in ${searchTime}ms`);

      expect(searchTime).toBeLessThan(300);
      expect(result.searchTime).toBeLessThan(300);
    });

    it('should handle complex filtering efficiently', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'Book',
        type: ItemType.BOOK,
        readDateFrom: new Date('2023-01-01'),
        readDateTo: new Date('2023-12-31'),
        tags: ['fiction'],
        sortBy: SortBy.READ_DATE,
        limit: 20
      });

      const startTime = Date.now();
      const result = await useCase.execute(input);
      const searchTime = Date.now() - startTime;

      console.log(`Complex filtered search completed in ${searchTime}ms`);

      expect(searchTime).toBeLessThan(250);
      expect(result.items.length).toBeLessThanOrEqual(20);
    });

    it('should handle pagination efficiently', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'Test',
        limit: 10
      });

      // First page
      const startTime1 = Date.now();
      const page1 = await useCase.execute(input);
      const searchTime1 = Date.now() - startTime1;

      expect(searchTime1).toBeLessThan(200);
      expect(page1.hasNextPage).toBe(true);

      // Second page with cursor
      const input2 = createSearchItemsDTO({
        ...input,
        cursor: page1.nextCursor
      });

      const startTime2 = Date.now();
      const page2 = await useCase.execute(input2);
      const searchTime2 = Date.now() - startTime2;

      console.log(`Paginated search: Page 1: ${searchTime1}ms, Page 2: ${searchTime2}ms`);

      expect(searchTime2).toBeLessThan(200);
      expect(page2.items.length).toBeGreaterThan(0);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });

    it('should maintain performance with relevance sorting', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'Author 1',
        sortBy: SortBy.RELEVANCE,
        limit: 50
      });

      const startTime = Date.now();
      const result = await useCase.execute(input);
      const searchTime = Date.now() - startTime;

      console.log(`Relevance-sorted search completed in ${searchTime}ms`);

      expect(searchTime).toBeLessThan(300);
      expect(result.items.length).toBeGreaterThan(0);
      
      // Verify results are sorted by relevance
      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          result.items[i].relevanceScore
        );
      }
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated searches', async () => {
      const input = createSearchItemsDTO({
        userId: mockUserId,
        query: 'memory test',
        limit: 20
      });

      // Create some test data
      for (let i = 0; i < 1000; i++) {
        await itemRepository.create({
          userId: mockUserId,
          title: `Memory Test Book ${i}`,
          type: ItemType.BOOK,
          author: `Author ${i}`,
          url: undefined,
          coverImage: undefined,
          publishedYear: 2023,
          status: ReadingStatus.WANT_TO_READ,
          rating: undefined,
          notes: undefined,
          readDate: undefined,
          isPublic: false,
          metadata: {},
          updatedAt: new Date()
        });
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 100 searches
      for (let i = 0; i < 100; i++) {
        await useCase.execute(createSearchItemsDTO({
          ...input,
          query: `memory test ${i % 10}`
        }));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase after 100 searches: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });
  });

  describe('Concurrent Search Performance', () => {
    it('should handle concurrent searches efficiently', async () => {
      // Create test data
      for (let i = 0; i < 1000; i++) {
        await itemRepository.create({
          userId: mockUserId,
          title: `Concurrent Test Book ${i}`,
          type: ItemType.BOOK,
          author: `Author ${i % 50}`,
          url: undefined,
          coverImage: undefined,
          publishedYear: 2023,
          status: ReadingStatus.WANT_TO_READ,
          rating: undefined,
          notes: undefined,
          readDate: undefined,
          isPublic: false,
          metadata: {},
          updatedAt: new Date()
        });
      }

      const searches = Array(10).fill(null).map((_, i) => createSearchItemsDTO({
        userId: mockUserId,
        query: `Concurrent Test ${i}`,
        limit: 20
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        searches.map(search => useCase.execute(search))
      );
      const totalTime = Date.now() - startTime;

      console.log(`10 concurrent searches completed in ${totalTime}ms`);
      console.log(`Average time per search: ${totalTime / 10}ms`);

      expect(totalTime).toBeLessThan(2000); // 2 seconds for 10 concurrent searches
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.items.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

// Helper functions
function getRandomTitle(): string {
  const titles = [
    'The Great Adventure',
    'Mystery of the Lost City',
    'Science and Technology',
    'History of Ancient Rome',
    'Modern Art Techniques',
    'Philosophy of Mind',
    'Cooking with Herbs',
    'Travel Guide to Europe',
    'Mathematics for Beginners',
    'Psychology Today'
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function getRandomItemType(): ItemType {
  const types = [ItemType.BOOK, ItemType.PAPER, ItemType.ARTICLE];
  return types[Math.floor(Math.random() * types.length)];
}
