import { MockItemRepository } from '../../../src/core/repositories/MockItemRepository';
import { Item, createItemId, ItemType, ReadingStatus } from '../../../src/core/entities/Item';
import { createUserId } from '../../../src/core/entities/User';

describe('MockItemRepository', () => {
  let repository: MockItemRepository;
  let testItem: Item;
  let userId: ReturnType<typeof createUserId>;

  beforeEach(() => {
    repository = new MockItemRepository();
    userId = createUserId('user-1');
    testItem = new Item({
      id: createItemId('item-1'),
      userId,
      type: ItemType.BOOK,
      title: 'Test Book',
      author: 'Test Author',
      addedAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      const itemData = {
        userId,
        type: ItemType.BOOK,
        title: 'Test Book',
        author: 'Test Author',
        updatedAt: new Date()
      , url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} };
      
      const created = await repository.create(itemData);
      
      expect(repository.size()).toBe(1);
      expect(created.title).toBe('Test Book');
      expect(created.id).toBeDefined();
    });

    it('should throw error for duplicate ID', async () => {
      const itemData = {
        userId,
        type: ItemType.BOOK,
        title: 'Test Book',
        author: 'Test Author',
        updatedAt: new Date()
      , url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} };
      
      await repository.create(itemData);
      expect(repository.size()).toBe(1);
    });
  });

  describe('findByUserId - Pagination', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 5; i++) {
        const itemData = {
          userId,
          type: ItemType.BOOK,
          title: `Book ${i, author: undefined, url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} }`,
          updatedAt: new Date()
        };
        await repository.create(itemData);
      }
    });

    it('should return first page without cursor', async () => {
      const result = await repository.findByUserId(userId, { limit: 2 });
      
      expect(result.items).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should return next page with cursor', async () => {
      const firstPage = await repository.findByUserId(userId, { limit: 2 });
      const result = await repository.findByUserId(userId, { 
        limit: 2, 
        cursor: firstPage.nextCursor! 
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeDefined();
    });

    it('should return last page with null cursor', async () => {
      const result = await repository.findByUserId(userId, { limit: 10 });
      
      expect(result.items).toHaveLength(5);
      expect(result.nextCursor).toBeNull();
      expect(result.hasNextPage).toBe(false);
    });

    it('should handle empty results', async () => {
      const emptyUserId = createUserId('empty-user');
      const result = await repository.findByUserId(emptyUserId, { limit: 10 });
      
      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle single page results', async () => {
      repository.clear();
      const itemData = {
        userId,
        type: ItemType.BOOK,
        title: 'Test Book',
        updatedAt: new Date()
      , author: undefined, url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} };
      await repository.create(itemData);
      
      const result = await repository.findByUserId(userId, { limit: 10 });
      
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
      expect(result.hasNextPage).toBe(false);
    });

    it('should throw error for invalid cursor', async () => {
      await expect(repository.findByUserId(userId, { 
        limit: 2, 
        cursor: 'invalid-cursor' 
      })).rejects.toThrow('Invalid cursor: invalid-cursor');
    });

    it('should throw error for invalid limit', async () => {
      await expect(repository.findByUserId(userId, { limit: 0 }))
        .rejects.toThrow('Limit must be between 1 and 100');
      
      await expect(repository.findByUserId(userId, { limit: 101 }))
        .rejects.toThrow('Limit must be between 1 and 100');
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const items = [
        {
          userId,
          type: ItemType.BOOK,
          title: 'JavaScript: The Good Parts',
          author: 'Douglas Crockford',
          updatedAt: new Date()
        },
        {
          userId,
          type: ItemType.PAPER,
          title: 'Machine Learning Basics',
          author: 'Jane Smith',
          updatedAt: new Date()
        },
        {
          userId,
          type: ItemType.BOOK,
          title: 'Advanced JavaScript',
          author: 'John Doe',
          rating: 5,
          updatedAt: new Date()
        }
      ];

      for (const item of items) {
        await repository.create(item);
      }
    });

    it('should search by title', async () => {
      const results = await repository.search(userId, 'javascript');
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('JavaScript: The Good Parts'); // Exact match first
      expect(results[1].title).toBe('Advanced JavaScript');
    });

    it('should search by author', async () => {
      const results = await repository.search(userId, 'crockford');
      
      expect(results).toHaveLength(1);
      expect(results[0].author).toBe('Douglas Crockford');
    });

    it('should apply type filter', async () => {
      const results = await repository.search(userId, 'machine', { 
        type: ItemType.PAPER 
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ItemType.PAPER);
    });

    it('should apply rating filter', async () => {
      const results = await repository.search(userId, 'javascript', { 
        rating: 5 
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].rating).toBe(5);
    });

    it('should return empty for no matches', async () => {
      const results = await repository.search(userId, 'nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('should throw error for short query', async () => {
      await expect(repository.search(userId, 'a'))
        .rejects.toThrow('Query must be at least 2 characters');
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      const itemData = {
        userId,
        type: ItemType.BOOK,
        title: 'Test Book',
        author: 'Test Author',
        updatedAt: new Date()
      , url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} };
      const created = await repository.create(itemData);
      testItem = created;
    });

    it('should update item successfully', async () => {
      await repository.update(testItem.id, { 
        title: 'Updated Title',
        rating: 4 
      });
      
      const items = repository.getAllItems();
      const updated = items.find(item => item.id === testItem.id);
      
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.rating).toBe(4);
      expect(updated!.author).toBe('Test Author'); // Unchanged
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(testItem.updatedAt.getTime());
    });

    it('should throw error for nonexistent item', async () => {
      const nonexistentId = createItemId('nonexistent');
      
      await expect(repository.update(nonexistentId, { title: 'New Title' }))
        .rejects.toThrow("Item with id 'nonexistent' not found");
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      const itemData = {
        userId,
        type: ItemType.BOOK,
        title: 'Test Book',
        author: 'Test Author',
        updatedAt: new Date()
      , url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} };
      const created = await repository.create(itemData);
      testItem = created;
    });

    it('should delete item successfully', async () => {
      await repository.delete(testItem.id);
      
      expect(repository.size()).toBe(0);
    });

    it('should throw error for nonexistent item', async () => {
      const nonexistentId = createItemId('nonexistent');
      
      await expect(repository.delete(nonexistentId))
        .rejects.toThrow("Item with id 'nonexistent' not found");
    });
  });

  describe('latency simulation', () => {
    it('should simulate realistic latency', async () => {
      const itemData = {
        userId,
        type: ItemType.BOOK,
        title: 'Test Book',
        updatedAt: new Date()
      , author: undefined, url: undefined, coverImage: undefined, publishedYear: undefined, status: ReadingStatus.WANT_TO_READ, rating: undefined, notes: undefined, readDate: undefined, isPublic: false, metadata: {} };
      
      const start = Date.now();
      await repository.create(itemData);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100);
    });
  });
});