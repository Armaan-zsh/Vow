import { z } from 'zod';
import { Item, ItemType, ItemId } from '../entities/Item';
import { UserId } from '../entities/User';
import { IItemRepository } from '../repositories/IItemRepository';
import { ValidationError } from '../../shared/types/errors';
import { transformZodError } from '../../shared/types/errors';

export enum SortBy {
  RELEVANCE = 'relevance',
  DATE_ADDED = 'date_added',
  READ_DATE = 'read_date'
}

const SearchItemsDTOSchema = z.object({
  userId: z.string(),
  query: z.string().min(2, 'Query must be at least 2 characters').max(100),
  type: z.nativeEnum(ItemType).optional(),
  readDateFrom: z.date().optional(),
  readDateTo: z.date().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.nativeEnum(SortBy).default(SortBy.RELEVANCE),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(20)
});

export type SearchItemsDTO = z.infer<typeof SearchItemsDTOSchema> & { userId: UserId };

export interface SearchResult {
  id: ItemId;
  title: string;
  author?: string;
  type: ItemType;
  addedAt: Date;
  readDate?: Date;
  highlights: {
    title?: string;
    author?: string;
    notes?: string;
  };
  relevanceScore: number;
}

export interface SearchResponse {
  items: SearchResult[];
  nextCursor?: string;
  hasNextPage: boolean;
  totalCount: number;
  searchTime: number;
}

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}

interface Logger {
  warn(message: string, meta: Record<string, any>): void;
}

export class SearchItemsUseCase {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly SLOW_QUERY_THRESHOLD = 500; // 500ms

  constructor(
    private itemRepository: IItemRepository,
    private cache: CacheClient,
    private logger: Logger
  ) {}

  async execute(input: SearchItemsDTO): Promise<SearchResponse> {
    const validatedInput = this.validateInput(input);
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(validatedInput);
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Execute search
    const results = await this.performSearch(validatedInput);
    const searchTime = Date.now() - startTime;

    // Log slow queries
    if (searchTime > SearchItemsUseCase.SLOW_QUERY_THRESHOLD) {
      this.logger.warn('Slow search query detected', {
        userId: validatedInput.userId,
        query: validatedInput.query,
        searchTime,
        filters: {
          type: validatedInput.type,
          tags: validatedInput.tags,
          dateRange: validatedInput.readDateFrom || validatedInput.readDateTo ? true : false
        }
      });
    }

    const response: SearchResponse = {
      ...results,
      searchTime
    };

    // Cache results
    await this.cache.set(cacheKey, JSON.stringify(response), SearchItemsUseCase.CACHE_TTL);

    return response;
  }

  private validateInput(input: SearchItemsDTO): SearchItemsDTO {
    try {
      const parsed = SearchItemsDTOSchema.parse(input);
      return { ...parsed, userId: input.userId };
    } catch (error: any) {
      throw transformZodError(error);
    }
  }

  private async performSearch(input: SearchItemsDTO): Promise<Omit<SearchResponse, 'searchTime'>> {
    // Build search query with trigram matching
    const searchQuery = this.buildSearchQuery(input);
    
    // Execute raw SQL query for performance
    const items = await this.itemRepository.searchWithRawQuery(
      input.userId,
      searchQuery,
      input.cursor,
      input.limit + 1 // Get one extra to check for next page
    );

    // Process results
    const hasNextPage = items.length > input.limit;
    const resultItems = hasNextPage ? items.slice(0, -1) : items;
    
    const searchResults = resultItems.map(item => this.mapToSearchResult(item, input.query));
    
    // Sort by relevance if needed
    if (input.sortBy === SortBy.RELEVANCE) {
      searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return {
      items: searchResults,
      nextCursor: hasNextPage ? resultItems[resultItems.length - 1].id : undefined,
      hasNextPage,
      totalCount: await this.getTotalCount(input)
    };
  }

  private buildSearchQuery(input: SearchItemsDTO): string {
    const conditions = ['user_id = $1'];
    let paramIndex = 2;

    // Trigram search on title and author
    const searchCondition = `(
      similarity(title, $${paramIndex}) > 0.1 OR
      similarity(COALESCE(author, ''), $${paramIndex}) > 0.1 OR
      title ILIKE $${paramIndex + 1} OR
      COALESCE(author, '') ILIKE $${paramIndex + 1} OR
      COALESCE(notes, '') ILIKE $${paramIndex + 1}
    )`;
    conditions.push(searchCondition);
    paramIndex += 2;

    // Type filter
    if (input.type) {
      conditions.push(`type = $${paramIndex}`);
      paramIndex++;
    }

    // Date range filters
    if (input.readDateFrom) {
      conditions.push(`read_date >= $${paramIndex}`);
      paramIndex++;
    }
    if (input.readDateTo) {
      conditions.push(`read_date <= $${paramIndex}`);
      paramIndex++;
    }

    // Tags filter (assuming tags are stored as JSON array)
    if (input.tags && input.tags.length > 0) {
      const tagConditions = input.tags.map(() => `metadata->>'tags' ? $${paramIndex++}`);
      conditions.push(`(${tagConditions.join(' AND ')})`);
    }

    // Cursor pagination
    if (input.cursor) {
      if (input.sortBy === SortBy.DATE_ADDED) {
        conditions.push(`added_at < (SELECT added_at FROM items WHERE id = $${paramIndex})`);
      } else if (input.sortBy === SortBy.READ_DATE) {
        conditions.push(`read_date < (SELECT read_date FROM items WHERE id = $${paramIndex})`);
      }
      paramIndex++;
    }

    // Build ORDER BY clause
    let orderBy = '';
    switch (input.sortBy) {
      case SortBy.DATE_ADDED:
        orderBy = 'ORDER BY added_at DESC, id ASC';
        break;
      case SortBy.READ_DATE:
        orderBy = 'ORDER BY read_date DESC NULLS LAST, id ASC';
        break;
      case SortBy.RELEVANCE:
      default:
        orderBy = `ORDER BY (
          similarity(title, $2) * 2 +
          similarity(COALESCE(author, ''), $2) * 1.5 +
          CASE WHEN title ILIKE $3 THEN 1 ELSE 0 END +
          CASE WHEN COALESCE(author, '') ILIKE $3 THEN 0.5 ELSE 0 END
        ) DESC, added_at DESC`;
        break;
    }

    return `
      SELECT id, title, author, type, added_at, read_date, notes, metadata,
             similarity(title, $2) as title_similarity,
             similarity(COALESCE(author, ''), $2) as author_similarity
      FROM items 
      WHERE ${conditions.join(' AND ')}
      ${orderBy}
      LIMIT $${paramIndex}
    `;
  }

  private mapToSearchResult(item: any, query: string): SearchResult {
    const highlights = this.generateHighlights(item, query);
    const relevanceScore = this.calculateRelevanceScore(item, query);

    return {
      id: item.id,
      title: item.title,
      author: item.author,
      type: item.type,
      addedAt: item.added_at,
      readDate: item.read_date,
      highlights,
      relevanceScore
    };
  }

  private generateHighlights(item: any, query: string): SearchResult['highlights'] {
    const highlightText = (text: string, query: string): string => {
      if (!text) return '';
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    return {
      title: item.title ? highlightText(item.title, query) : undefined,
      author: item.author ? highlightText(item.author, query) : undefined,
      notes: item.notes ? highlightText(item.notes, query) : undefined
    };
  }

  private calculateRelevanceScore(item: any, query: string): number {
    let score = 0;
    
    // Title similarity (highest weight)
    score += (item.title_similarity || 0) * 2;
    
    // Author similarity
    score += (item.author_similarity || 0) * 1.5;
    
    // Exact matches get bonus points
    if (item.title?.toLowerCase().includes(query.toLowerCase())) {
      score += 1;
    }
    if (item.author?.toLowerCase().includes(query.toLowerCase())) {
      score += 0.5;
    }
    
    // Recent items get slight boost
    const daysSinceAdded = (Date.now() - new Date(item.added_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, (30 - daysSinceAdded) / 30) * 0.1;

    return Math.round(score * 100) / 100;
  }

  private async getTotalCount(input: SearchItemsDTO): Promise<number> {
    // Simplified count query without sorting/pagination
    const countQuery = this.buildCountQuery(input);
    const result = await this.itemRepository.executeRawQuery(countQuery, this.buildQueryParams(input));
    return parseInt(result[0]?.count || '0');
  }

  private buildCountQuery(input: SearchItemsDTO): string {
    const conditions = ['user_id = $1'];
    let paramIndex = 2;

    conditions.push(`(
      similarity(title, $${paramIndex}) > 0.1 OR
      similarity(COALESCE(author, ''), $${paramIndex}) > 0.1 OR
      title ILIKE $${paramIndex + 1} OR
      COALESCE(author, '') ILIKE $${paramIndex + 1} OR
      COALESCE(notes, '') ILIKE $${paramIndex + 1}
    )`);
    paramIndex += 2;

    if (input.type) {
      conditions.push(`type = $${paramIndex}`);
      paramIndex++;
    }

    if (input.readDateFrom) {
      conditions.push(`read_date >= $${paramIndex}`);
      paramIndex++;
    }
    if (input.readDateTo) {
      conditions.push(`read_date <= $${paramIndex}`);
      paramIndex++;
    }

    if (input.tags && input.tags.length > 0) {
      const tagConditions = input.tags.map(() => `metadata->>'tags' ? $${paramIndex++}`);
      conditions.push(`(${tagConditions.join(' AND ')})`);
    }

    return `SELECT COUNT(*) as count FROM items WHERE ${conditions.join(' AND ')}`;
  }

  private buildQueryParams(input: SearchItemsDTO): any[] {
    const params = [input.userId, input.query, `%${input.query}%`];
    
    if (input.type) params.push(input.type);
    if (input.readDateFrom) params.push(input.readDateFrom);
    if (input.readDateTo) params.push(input.readDateTo);
    if (input.tags) params.push(...input.tags);
    if (input.cursor) params.push(input.cursor);
    
    params.push(input.limit);
    return params;
  }

  private generateCacheKey(input: SearchItemsDTO): string {
    const key = {
      userId: input.userId,
      query: input.query,
      type: input.type,
      readDateFrom: input.readDateFrom?.toISOString(),
      readDateTo: input.readDateTo?.toISOString(),
      tags: input.tags?.sort(),
      sortBy: input.sortBy,
      cursor: input.cursor,
      limit: input.limit
    };
    
    return `search:${Buffer.from(JSON.stringify(key)).toString('base64')}`;
  }
}