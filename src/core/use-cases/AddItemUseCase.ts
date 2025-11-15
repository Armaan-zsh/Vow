import { z } from 'zod';
import { Item, ItemType, ReadingStatus, ItemId } from '../entities/Item';
import { UserId } from '../entities/User';
import { IItemRepository } from '../repositories/IItemRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { RateLimitError, ValidationError } from '../../shared/types/errors';
import { transformZodError } from '../../shared/types/errors';

const AddItemDTOSchema = z.object({
  userId: z.string(),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  type: z.nativeEnum(ItemType),
  author: z.string().max(200).optional(),
  url: z.string().url().optional(),
  isbn: z.string().regex(/^(97[89])?\d{9}[\dX]$/, 'Invalid ISBN format').optional(),
  doi: z.string().regex(/^10\.\d{4,}\/[^\s]+$/, 'Invalid DOI format').optional(),
  metadata: z.record(z.any()).optional()
});

export type AddItemDTO = z.infer<typeof AddItemDTOSchema> & { userId: UserId };

export interface ItemDTO {
  id: ItemId;
  userId: UserId;
  title: string;
  type: ItemType;
  author?: string;
  url?: string;
  status: ReadingStatus;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemAddedEvent {
  itemId: ItemId;
  userId: UserId;
  type: ItemType;
  timestamp: Date;
}

interface EventEmitter {
  emit(event: 'item.added', data: ItemAddedEvent): Promise<void>;
}

interface JobScheduler {
  schedule(job: 'fetch-metadata', data: { itemId: ItemId; type: 'isbn' | 'doi' | 'url'; value: string }): Promise<void>;
}

interface AuditLogger {
  log(action: string, userId: UserId, details: Record<string, any>): Promise<void>;
}

export class AddItemUseCase {
  private static readonly RATE_LIMIT = 10;
  private static readonly RATE_WINDOW_MS = 60 * 1000;

  constructor(
    private itemRepository: IItemRepository,
    private userRepository: IUserRepository,
    private eventEmitter: EventEmitter,
    private jobScheduler: JobScheduler,
    private auditLogger: AuditLogger
  ) {}

  async execute(input: AddItemDTO): Promise<ItemDTO> {
    // Validate input with Zod
    const validatedInput = this.validateInput(input);

    // Check rate limit
    const recentCount = await this.itemRepository.countByUserInTimeWindow(
      validatedInput.userId as UserId,
      AddItemUseCase.RATE_WINDOW_MS
    );
    
    if (recentCount >= AddItemUseCase.RATE_LIMIT) {
      throw new RateLimitError('Rate limit exceeded: Maximum 10 items per minute');
    }

    // Transaction for item + stats update
    const result = await this.itemRepository.transaction(async () => {
      // Create item
      const item = await this.itemRepository.create({
        userId: validatedInput.userId as UserId,
        title: validatedInput.title,
        type: validatedInput.type,
        author: validatedInput.author,
        url: validatedInput.url,
        coverImage: undefined,
        publishedYear: undefined,
        status: ReadingStatus.WANT_TO_READ,
        rating: undefined,
        notes: undefined,
        readDate: undefined,
        isPublic: false,
        metadata: validatedInput.metadata || {},
        updatedAt: new Date()
      });

      // Update user stats (idempotent)
      await this.userRepository.incrementStats(validatedInput.userId as UserId, {
        totalItems: 1,
        [`${validatedInput.type.toLowerCase()}Count`]: 1
      });

      return item;
    });

    // Schedule metadata fetch job if needed
    await this.scheduleMetadataFetch(result, validatedInput);

    // Audit log entry
    await this.auditLogger.log('item.created', validatedInput.userId as UserId, {
      itemId: result.id,
      title: result.title,
      type: result.type
    });

    // Emit domain event AFTER successful save
    await this.eventEmitter.emit('item.added', {
      itemId: result.id,
      userId: result.userId,
      type: result.type,
      timestamp: new Date()
    });

    return this.toDTO(result);
  }

  private validateInput(input: AddItemDTO): AddItemDTO {
    try {
      const parsed = AddItemDTOSchema.parse(input);
      return { ...parsed, userId: input.userId };
    } catch (error: any) {
      throw transformZodError(error);
    }
  }

  private async scheduleMetadataFetch(item: Item, input: AddItemDTO): Promise<void> {
    if (input.isbn) {
      await this.jobScheduler.schedule('fetch-metadata', {
        itemId: item.id,
        type: 'isbn',
        value: input.isbn
      });
    } else if (input.doi) {
      await this.jobScheduler.schedule('fetch-metadata', {
        itemId: item.id,
        type: 'doi',
        value: input.doi
      });
    } else if (input.url) {
      await this.jobScheduler.schedule('fetch-metadata', {
        itemId: item.id,
        type: 'url',
        value: input.url
      });
    }
  }

  private toDTO(item: Item): ItemDTO {
    return {
      id: item.id,
      userId: item.userId,
      title: item.title,
      type: item.type,
      author: item.author,
      url: item.url,
      status: item.status,
      isPublic: item.isPublic,
      createdAt: item.addedAt,
      updatedAt: item.updatedAt
    };
  }
}