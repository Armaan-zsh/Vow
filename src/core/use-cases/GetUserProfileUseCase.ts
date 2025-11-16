import { User, UserId } from '../entities/User';
import { Item, ItemType } from '../entities/Item';
import { IUserRepository } from '../repositories/IUserRepository';
import { IItemRepository } from '../repositories/IItemRepository';

export interface UserProfileOptions {
  limit: number;
  cursor?: string;
  filter?: {
    type?: ItemType;
    tags?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
  };
}

export interface UserProfileResult {
  user: User;
  items: Item[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export class GetUserProfileUseCase {
  constructor(
    private userRepo: IUserRepository,
    private itemRepo: IItemRepository
  ) {}

  async execute(username: string, options: UserProfileOptions): Promise<UserProfileResult | null> {
    const user = await this.userRepo.findByUsername(username);
    if (!user) return null;

    // Build item query filters
    const whereClause: any = { userId: user.id };
    
    if (options.cursor) {
      whereClause.id = { lt: options.cursor };
    }
    
    if (options.filter?.type) {
      whereClause.type = options.filter.type;
    }
    
    if (options.filter?.tags && options.filter.tags.length > 0) {
      whereClause.tags = { hasSome: options.filter.tags };
    }
    
    if (options.filter?.dateRange) {
      whereClause.addedAt = {};
      if (options.filter.dateRange.start) {
        whereClause.addedAt.gte = options.filter.dateRange.start;
      }
      if (options.filter.dateRange.end) {
        whereClause.addedAt.lte = options.filter.dateRange.end;
      }
    }

    const items = await this.itemRepo.findMany({
      where: whereClause,
      orderBy: { addedAt: 'desc' },
      take: options.limit + 1, // Fetch one extra to detect next page
    });

    const hasNextPage = items.length > options.limit;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;

    return {
      user,
      items: items.slice(0, options.limit),
      nextCursor,
      hasNextPage,
    };
  }
}
