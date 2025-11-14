import { Item } from '../../shared/types';

export interface IItemRepository {
  create(item: Omit<Item, 'id' | 'addedAt'>): Promise<Item>;
  countByUserInTimeWindow(userId: string, windowMs: number): Promise<number>;
}