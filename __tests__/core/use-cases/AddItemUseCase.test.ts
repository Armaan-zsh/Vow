import { AddItemUseCase, RateLimitError, ValidationError } from '../../../src/core/use-cases/AddItemUseCase';
import { IItemRepository } from '../../../src/core/repositories/IItemRepository';
import { IMetadataService } from '../../../src/core/repositories/IMetadataService';
import { IEventEmitter } from '../../../src/core/repositories/IEventEmitter';
import { Item, ItemType, createItemId } from '../../../src/core/entities/Item';
import { createUserId } from '../../../src/core/entities/User';

describe('AddItemUseCase', () => {
  let useCase: AddItemUseCase;
  let mockItemRepository: jest.Mocked<IItemRepository>;
  let mockMetadataService: jest.Mocked<IMetadataService>;
  let mockEventEmitter: jest.Mocked<IEventEmitter>;

  beforeEach(() => {
    mockItemRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      search: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByUserInTimeWindow: jest.fn()
    } as jest.Mocked<IItemRepository>;
    
    mockMetadataService = {
      fetchBookByISBN: jest.fn()
    };
    
    mockEventEmitter = {
      emit: jest.fn()
    };

    useCase = new AddItemUseCase(mockItemRepository, mockMetadataService, mockEventEmitter);
  });

  describe('successful item creation', () => {
    it('should create item and emit event', async () => {
      const request = {
        userId: createUserId('user1'),
        title: 'Test Book',
        type: ItemType.BOOK,
        metadata: {}
      };

      const createdItem = new Item({
        id: createItemId('item1'),
        userId: createUserId('user1'),
        title: 'Test Book',
        type: ItemType.BOOK,
        metadata: {},
        addedAt: new Date()
      });

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(5);
      mockItemRepository.create.mockResolvedValue(createdItem);
      mockEventEmitter.emit.mockResolvedValue();

      const result = await useCase.execute(request);

      expect(result).toEqual(createdItem);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('item.added', {
        itemId: createItemId('item1'),
        userId: createUserId('user1'),
        type: ItemType.BOOK
      });
    });

    it('should auto-fetch metadata for books with ISBN', async () => {
      const request = {
        userId: createUserId('user1'),
        title: 'Test Book',
        type: ItemType.BOOK,
        metadata: { isbn: '9780123456789' }
      };

      const bookMetadata = {
        isbn: '9780123456789',
        title: 'Enhanced Title',
        author: 'Test Author',
        publishedYear: 2023
      };

      const createdItem = new Item({
        id: createItemId('item1'),
        userId: createUserId('user1'),
        title: 'Test Book',
        type: ItemType.BOOK,
        metadata: bookMetadata,
        addedAt: new Date()
      });

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockMetadataService.fetchBookByISBN.mockResolvedValue(bookMetadata);
      mockItemRepository.create.mockResolvedValue(createdItem);

      await useCase.execute(request);

      expect(mockMetadataService.fetchBookByISBN).toHaveBeenCalledWith('9780123456789');
      expect(mockItemRepository.create).toHaveBeenCalledWith(expect.objectContaining({ 
        userId: createUserId("user1"), 
        title: "Test Book", 
        type: ItemType.BOOK 
      }));
    });
  });

  describe('rate limiting', () => {
    it('should throw RateLimitError when limit exceeded', async () => {
      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(10);

      const request = {
        userId: createUserId('user1'),
        title: 'Test Book',
        type: ItemType.BOOK
      };

      await expect(useCase.execute(request)).rejects.toThrow(RateLimitError);
      expect(mockItemRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    beforeEach(() => {
      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
    });

    it('should throw ValidationError for empty title', async () => {
      const request = {
        userId: createUserId('user1'),
        title: '',
        type: ItemType.BOOK
      };

      await expect(useCase.execute(request)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid ISBN', async () => {
      const request = {
        userId: createUserId('user1'),
        title: 'Test Book',
        type: ItemType.BOOK,
        metadata: { isbn: 'invalid-isbn' }
      };

      await expect(useCase.execute(request)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid DOI', async () => {
      const request = {
        userId: createUserId('user1'),
        title: 'Test Paper',
        type: ItemType.PAPER,
        metadata: { doi: 'invalid-doi' }
      };

      await expect(useCase.execute(request)).rejects.toThrow(ValidationError);
    });

    it('should accept valid ISBN formats', async () => {
      const validISBNs = ['9780123456789', '978-0-123-45678-9', '0123456789'];
      
      for (const isbn of validISBNs) {
        const request = {
          userId: createUserId('user1'),
          title: 'Test Book',
          type: ItemType.BOOK,
          metadata: { isbn }
        };

        const createdItem = new Item({
          id: createItemId('item1'),
          userId: createUserId('user1'),
          title: 'Test Book',
          type: ItemType.BOOK,
          metadata: { isbn },
          addedAt: new Date()
        });

        mockItemRepository.create.mockResolvedValue(createdItem);
        await expect(useCase.execute(request)).resolves.toBeDefined();
      }
    });

    it('should accept valid DOI format', async () => {
      const request = {
        userId: createUserId('user1'),
        title: 'Test Paper',
        type: ItemType.PAPER,
        metadata: { doi: '10.1000/182' }
      };

      const createdItem = new Item({
        id: createItemId('item1'),
        userId: createUserId('user1'),
        title: 'Test Paper',
        type: ItemType.PAPER,
        metadata: { doi: '10.1000/182' },
        addedAt: new Date()
      });

      mockItemRepository.create.mockResolvedValue(createdItem);
      await expect(useCase.execute(request)).resolves.toBeDefined();
    });
  });
});