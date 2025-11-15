import { Item, ItemId, ItemType, ReadingStatus } from '../entities/Item';
import { UserId } from '../../shared/types/branded';

export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface SearchFilters {
  type?: ItemType;
  status?: ReadingStatus;
  rating?: number;
  publishedYear?: number;
  hasNotes?: boolean;
}

export interface IItemRepository {
  create(item: Omit<Item, 'id' | 'addedAt'>): Promise<Item>;
  findById(id: ItemId): Promise<Item | null>;
  findByUserId(userId: UserId, options: PaginationOptions): Promise<PaginatedResult<Item>>;
  search(userId: UserId, query: string, filters?: SearchFilters): Promise<Item[]>;
  update(id: ItemId, data: Partial<Omit<Item, 'id' | 'userId' | 'addedAt'>>): Promise<void>;
  delete(id: ItemId): Promise<void>;
  countByUserInTimeWindow(userId: UserId, windowMs: number): Promise<number>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}