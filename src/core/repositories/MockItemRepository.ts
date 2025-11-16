import {
  IItemRepository,
  SearchFilters,
  PaginationOptions,
  PaginatedResult,
} from './IItemRepository';
import { Item, ItemId, ItemType, ReadingStatus } from '../entities/Item';
import { UserId } from '../entities/User';

/**
 * Mock implementation of IItemRepository for unit testing
 * Provides in-memory storage with realistic latency simulation
 */
export class MockItemRepository implements IItemRepository {
  public data = new Map<string, Item>();
  private get items() {
    return this.data;
  }

  async findById(id: ItemId): Promise<Item | null> {
    await this.simulateLatency();
    return this.items.get(id) || null;
  }

  async create(item: Omit<Item, 'id' | 'addedAt'>): Promise<Item> {
    await this.simulateLatency();

    const newItem = new Item({
      ...item,
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as ItemId,
      addedAt: new Date(),
      updatedAt: new Date(),
    });

    this.items.set(newItem.id, newItem);
    return newItem;
  }

  async findByUserId(userId: UserId, options: PaginationOptions): Promise<PaginatedResult<Item>> {
    await this.simulateLatency();

    if (options.limit <= 0 || options.limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Get all items for user, sorted by addedAt DESC, then id ASC
    const userItems = Array.from(this.items.values())
      .filter((item) => item.userId === userId)
      .sort((a, b) => {
        const dateCompare = b.addedAt.getTime() - a.addedAt.getTime();
        return dateCompare !== 0 ? dateCompare : a.id.localeCompare(b.id);
      });

    let startIndex = 0;

    // Find cursor position if provided
    if (options.cursor) {
      const cursorIndex = userItems.findIndex((item) => item.id === options.cursor);
      if (cursorIndex === -1) {
        throw new Error(`Invalid cursor: ${options.cursor}`);
      }
      startIndex = cursorIndex + 1;
    }

    // Get page of items
    const pageItems = userItems.slice(startIndex, startIndex + options.limit);

    // Determine next cursor
    const nextCursor =
      pageItems.length === options.limit && startIndex + options.limit < userItems.length
        ? pageItems[pageItems.length - 1].id
        : null;

    return {
      items: pageItems,
      nextCursor,
      hasNextPage: nextCursor !== null,
    };
  }

  async search(userId: UserId, query: string, filters?: SearchFilters): Promise<Item[]> {
    await this.simulateLatency();

    if (!query || query.trim().length < 2) {
      throw new Error('Query must be at least 2 characters');
    }

    const normalizedQuery = query.toLowerCase().trim();

    let results = Array.from(this.items.values()).filter((item) => item.userId === userId);

    // Apply text search (trigram-like matching)
    results = results.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
      const authorMatch = item.author?.toLowerCase().includes(normalizedQuery) || false;
      return titleMatch || authorMatch;
    });

    // Apply filters
    if (filters) {
      if (filters.type) {
        results = results.filter((item) => item.type === filters.type);
      }
      if (filters.status) {
        results = results.filter((item) => item.status === filters.status);
      }
      if (filters.rating) {
        results = results.filter((item) => item.rating === filters.rating);
      }
      if (filters.publishedYear) {
        results = results.filter((item) => item.publishedYear === filters.publishedYear);
      }
      if (filters.hasNotes !== undefined) {
        results = results.filter((item) => (filters.hasNotes ? !!item.notes : !item.notes));
      }
    }

    // Sort by relevance (exact title matches first, then author matches)
    results.sort((a, b) => {
      const aExactTitle = a.title.toLowerCase() === normalizedQuery;
      const bExactTitle = b.title.toLowerCase() === normalizedQuery;

      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;

      const aTitleStart = a.title.toLowerCase().startsWith(normalizedQuery);
      const bTitleStart = b.title.toLowerCase().startsWith(normalizedQuery);

      if (aTitleStart && !bTitleStart) return -1;
      if (!aTitleStart && bTitleStart) return 1;

      return b.addedAt.getTime() - a.addedAt.getTime();
    });

    return results.slice(0, 100); // Reasonable limit for search results
  }

  async update(id: ItemId, data: Partial<Omit<Item, 'id' | 'userId' | 'addedAt'>>): Promise<void> {
    await this.simulateLatency();

    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item with id '${id}' not found`);
    }

    // Create updated item (immutable pattern)
    const updatedItem = new Item({
      id: item.id,
      userId: item.userId,
      type: data.type ?? item.type,
      title: data.title ?? item.title,
      author: data.author ?? item.author,
      url: data.url ?? item.url,
      coverImage: data.coverImage ?? item.coverImage,
      publishedYear: data.publishedYear ?? item.publishedYear,
      status: data.status ?? item.status,
      rating: data.rating ?? item.rating,
      notes: data.notes ?? item.notes,
      readDate: data.readDate ?? item.readDate,
      isPublic: data.isPublic ?? item.isPublic,
      metadata: data.metadata ?? item.metadata,
      addedAt: item.addedAt,
      updatedAt: new Date(),
    });

    this.items.set(id, updatedItem);
  }

  async delete(id: ItemId): Promise<void> {
    await this.simulateLatency();

    if (!this.items.has(id)) {
      throw new Error(`Item with id '${id}' not found`);
    }

    this.items.delete(id);
  }

  // Test helper methods
  clear(): void {
    this.items.clear();
  }

  size(): number {
    return this.items.size;
  }

  getAllItems(): Item[] {
    return Array.from(this.items.values());
  }

  async countByUserInTimeWindow(userId: UserId, windowMs: number): Promise<number> {
    await this.simulateLatency();

    const cutoff = new Date(Date.now() - windowMs);
    return Array.from(this.items.values()).filter(
      (item) => item.userId === userId && item.addedAt >= cutoff
    ).length;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    return await fn();
  }

  async searchWithRawQuery(
    userId: UserId,
    query: string,
    cursor?: string,
    limit = 20
  ): Promise<any[]> {
    await this.simulateLatency();

    // Mock implementation - in real app this would use Prisma raw query
    const normalizedQuery = query.toLowerCase();
    let results = Array.from(this.items.values())
      .filter((item) => item.userId === userId)
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(normalizedQuery);
        const authorMatch = item.author?.toLowerCase().includes(normalizedQuery) || false;
        const notesMatch = item.notes?.toLowerCase().includes(normalizedQuery) || false;
        return titleMatch || authorMatch || notesMatch;
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        type: item.type,
        added_at: item.addedAt,
        read_date: item.readDate,
        notes: item.notes,
        metadata: item.metadata,
        title_similarity: this.calculateSimilarity(item.title, normalizedQuery),
        author_similarity: this.calculateSimilarity(item.author || '', normalizedQuery),
      }));

    // Apply cursor pagination
    if (cursor) {
      const cursorIndex = results.findIndex((item) => item.id === cursor);
      if (cursorIndex >= 0) {
        results = results.slice(cursorIndex + 1);
      }
    }

    return results.slice(0, limit);
  }

  async executeRawQuery(query: string, params: any[]): Promise<any[]> {
    await this.simulateLatency();

    // Mock count query result
    if (query.includes('COUNT(*)')) {
      const userId = params[0];
      const searchQuery = params[1]?.toLowerCase() || '';
      const count = Array.from(this.items.values())
        .filter((item) => item.userId === userId)
        .filter((item) => {
          const titleMatch = item.title.toLowerCase().includes(searchQuery);
          const authorMatch = item.author?.toLowerCase().includes(searchQuery) || false;
          return titleMatch || authorMatch;
        }).length;

      return [{ count: count.toString() }];
    }

    return [];
  }

  private calculateSimilarity(text: string, query: string): number {
    if (!text || !query) return 0;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Simple similarity calculation
    if (textLower === queryLower) return 1;
    if (textLower.includes(queryLower)) return 0.8;
    if (textLower.startsWith(queryLower)) return 0.6;

    // Basic trigram-like matching
    const textTrigrams = this.getTrigrams(textLower);
    const queryTrigrams = this.getTrigrams(queryLower);
    const intersection = textTrigrams.filter((t) => queryTrigrams.includes(t));

    return intersection.length / Math.max(textTrigrams.length, queryTrigrams.length);
  }

  private getTrigrams(text: string): string[] {
    const trigrams = [];
    const padded = `  ${text}  `;
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.push(padded.slice(i, i + 3));
    }
    return trigrams;
  }

  private async simulateLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * 40) + 10; // 10-50ms
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
