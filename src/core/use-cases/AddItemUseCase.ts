import { Item, ItemType } from '../entities/Item';
import { UserId } from '../entities/User';
import { IItemRepository } from '../repositories/IItemRepository';
import { IMetadataService } from '../repositories/IMetadataService';
import { IEventEmitter } from '../repositories/IEventEmitter';

export interface AddItemRequest {
  userId: UserId;
  title: string;
  type: ItemType;
  metadata?: Record<string, any>;
}

export class RateLimitError extends Error {
  constructor() {
    super('Rate limit exceeded: Maximum 10 items per minute');
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(`Validation error: ${message}`);
  }
}

export class AddItemUseCase {
  private static readonly RATE_LIMIT = 10;
  private static readonly RATE_WINDOW_MS = 60 * 1000; // 1 minute

  constructor(
    private itemRepository: IItemRepository,
    private metadataService: IMetadataService,
    private eventEmitter: IEventEmitter
  ) {}

  async execute(request: AddItemRequest): Promise<Item> {
    // Rate limiting
    const recentCount = await this.itemRepository.countByUserInTimeWindow(
      request.userId,
      AddItemUseCase.RATE_WINDOW_MS
    );
    
    if (recentCount >= AddItemUseCase.RATE_LIMIT) {
      throw new RateLimitError();
    }

    // Validation
    this.validateRequest(request);

    // Auto-fetch metadata for books with ISBN
    let enrichedMetadata = request.metadata || {};
    if (request.type === ItemType.BOOK && this.hasISBN(enrichedMetadata)) {
      const bookData = await this.metadataService.fetchBookByISBN(enrichedMetadata.isbn);
      if (bookData) {
        enrichedMetadata = { ...enrichedMetadata, ...bookData };
      }
    }

    // Create item
    const item = await this.itemRepository.create({
      userId: request.userId,
      title: request.title,
      type: request.type,
      author: undefined,
      url: undefined,
      coverImage: undefined,
      publishedYear: undefined,
      status: 'want-to-read' as const,
      rating: undefined,
      notes: undefined,
      readDate: undefined,
      isPublic: false,
      metadata: enrichedMetadata,
      updatedAt: new Date()
    });

    // Emit event
    await this.eventEmitter.emit('item.added', {
      itemId: item.id,
      userId: item.userId,
      type: item.type
    });

    return item;
  }

  private validateRequest(request: AddItemRequest): void {
    if (!request.title?.trim()) {
      throw new ValidationError('Title is required');
    }

    if (request.metadata?.isbn && !this.isValidISBN(request.metadata.isbn)) {
      throw new ValidationError('Invalid ISBN format');
    }

    if (request.metadata?.doi && !this.isValidDOI(request.metadata.doi)) {
      throw new ValidationError('Invalid DOI format');
    }
  }

  private hasISBN(metadata: Record<string, any>): boolean {
    return typeof metadata.isbn === 'string' && metadata.isbn.trim().length > 0;
  }

  private isValidISBN(isbn: string): boolean {
    const cleaned = isbn.replace(/[-\s]/g, '');
    return /^(97[89])?\d{9}[\dX]$/.test(cleaned);
  }

  private isValidDOI(doi: string): boolean {
    return /^10\.\d{4,}\/[^\s]+$/.test(doi);
  }
}