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
      author: 'Test Author'
    });
  });

  describe('create', () => {
    it('should create item successfully', async () => {
      await repository.create(testItem);
      
      expect(repository.size()).toBe(1);
      expect(repository.getAllItems()).toContain(testItem);
    });

    it('should throw error for duplicate ID', async () => {
      await repository.create(testItem);
      
      await expect(repository.create(testItem))
        .rejects.toThrow("Item with id 'item-1' already exists");
    });
  });

  describe('findByUserId - Pagination', () => {
    beforeEach(async () => {
      // Create multiple items with different timestamps
      for (let i = 1; i <= 5; i++) {
        const item = new Item({
          id: createItemId(`item-${i}`),
          userId,
          type: ItemType.BOOK,
          title: `Book ${i}`,
          addedAt: new Date(Date.now() - (5 - i) * 1000) // Newer items have higher numbers
        });
        await repository.create(item);
      }
    });

    it('should return first page without cursor', async () => {
      const result = await repository.findByUserId(userId, { limit: 2 });
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('Book 5'); // Most recent first
      expect(result.items[1].title).toBe('Book 4');
      expect(result.nextCursor).toBe('item-4');
    });

    it('should return next page with cursor', async () => {
      const result = await repository.findByUserId(userId, { 
        limit: 2, 
        cursor: 'item-4' 
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('Book 3');
      expect(result.items[1].title).toBe('Book 2');
      expect(result.nextCursor).toBe('item-2');
    });

    it('should return last page with null cursor', async () => {
      const result = await repository.findByUserId(userId, { 
        limit: 2, 
        cursor: 'item-2' 
      });
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Book 1');
      expect(result.nextCursor).toBeNull();
    });

    it('should handle empty results', async () => {
      const emptyUserId = createUserId('empty-user');
      const result = await repository.findByUserId(emptyUserId, { limit: 10 });
      
      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should handle single page results', async () => {
      repository.clear();
      await repository.create(testItem);
      
      const result = await repository.findByUserId(userId, { limit: 10 });
      
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
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
        new Item({
          id: createItemId('item-1'),
          userId,
          type: ItemType.BOOK,
          title: 'JavaScript: The Good Parts',
          author: 'Douglas Crockford'
        }),
        new Item({
          id: createItemId('item-2'),
          userId,
          type: ItemType.PAPER,
          title: 'Machine Learning Basics',
          author: 'Jane Smith'
        }),
        new Item({
          id: createItemId('item-3'),
          userId,
          type: ItemType.BOOK,
          title: 'Advanced JavaScript',
          author: 'John Doe',
          rating: 5
        })
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
      await repository.create(testItem);
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
      await repository.create(testItem);
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
      const start = Date.now();
      await repository.create(testItem);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100); // Should be well under 100ms
    });
  });
});