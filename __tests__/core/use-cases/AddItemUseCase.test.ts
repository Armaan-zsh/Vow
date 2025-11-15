import { AddItemUseCase, AddItemDTO, ItemDTO } from '../../../src/core/use-cases/AddItemUseCase';
import { ItemType, ReadingStatus } from '../../../src/core/entities/Item';
import { RateLimitError, ValidationError } from '../../../src/shared/types/errors';

// Mock dependencies
const mockItemRepository = {
  countByUserInTimeWindow: jest.fn(),
  create: jest.fn(),
  transaction: jest.fn(),
};

const mockUserRepository = {
  incrementStats: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

const mockJobScheduler = {
  schedule: jest.fn(),
};

const mockAuditLogger = {
  log: jest.fn(),
};

describe('AddItemUseCase', () => {
  let useCase: AddItemUseCase;
  const mockUserId = 'user-123' as any;
  const mockItemId = 'item-456' as any;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AddItemUseCase(
      mockItemRepository as any,
      mockUserRepository as any,
      mockEventEmitter as any,
      mockJobScheduler as any,
      mockAuditLogger as any
    );

    mockItemRepository.transaction.mockImplementation(async (fn) => fn());
  });

  describe('Input Validation', () => {
    it('should reject empty title', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: '',
        type: ItemType.BOOK,
      };

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid ISBN', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        isbn: 'invalid-isbn',
      };

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid DOI', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Paper',
        type: ItemType.PAPER,
        doi: 'invalid-doi',
      };

      await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
    });

    it('should accept valid input', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Valid Book',
        type: ItemType.BOOK,
        isbn: '9780123456789',
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Valid Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await useCase.execute(input);
      expect(result.title).toBe('Valid Book');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(10);

      await expect(useCase.execute(input)).rejects.toThrow(RateLimitError);
      expect(mockItemRepository.countByUserInTimeWindow).toHaveBeenCalledWith(mockUserId, 60000);
    });

    it('should allow items within rate limit', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(5);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);
      expect(mockItemRepository.create).toHaveBeenCalled();
    });
  });

  describe('Transaction Handling', () => {
    it('should use transaction for item creation and stats update', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);

      expect(mockItemRepository.transaction).toHaveBeenCalled();
      expect(mockUserRepository.incrementStats).toHaveBeenCalledWith(mockUserId, {
        totalItems: 1,
        bookCount: 1,
      });
    });
  });

  describe('Metadata Scheduling', () => {
    it('should schedule ISBN metadata fetch', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        isbn: '9780123456789',
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);

      expect(mockJobScheduler.schedule).toHaveBeenCalledWith('fetch-metadata', {
        itemId: mockItemId,
        type: 'isbn',
        value: '9780123456789',
      });
    });

    it('should schedule DOI metadata fetch', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Paper',
        type: ItemType.PAPER,
        doi: '10.1000/test',
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Paper',
        type: ItemType.PAPER,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);

      expect(mockJobScheduler.schedule).toHaveBeenCalledWith('fetch-metadata', {
        itemId: mockItemId,
        type: 'doi',
        value: '10.1000/test',
      });
    });

    it('should schedule URL metadata fetch', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Article',
        type: ItemType.ARTICLE,
        url: 'https://example.com/article',
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Article',
        type: ItemType.ARTICLE,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);

      expect(mockJobScheduler.schedule).toHaveBeenCalledWith('fetch-metadata', {
        itemId: mockItemId,
        type: 'url',
        value: 'https://example.com/article',
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit ItemAddedEvent after successful save', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('item.added', {
        itemId: mockItemId,
        userId: mockUserId,
        type: ItemType.BOOK,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log item creation', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
      };

      mockItemRepository.countByUserInTimeWindow.mockResolvedValue(0);
      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await useCase.execute(input);

      expect(mockAuditLogger.log).toHaveBeenCalledWith('item.created', mockUserId, {
        itemId: mockItemId,
        title: 'Test Book',
        type: ItemType.BOOK,
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent item adds with race condition', async () => {
      const input: AddItemDTO = {
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
      };

      // Simulate race condition - count changes between check and create
      let callCount = 0;
      mockItemRepository.countByUserInTimeWindow.mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? 9 : 10);
      });

      mockItemRepository.create.mockResolvedValue({
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Book',
        type: ItemType.BOOK,
        status: ReadingStatus.WANT_TO_READ,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // First call should succeed
      const result1 = useCase.execute(input);

      // Second concurrent call should fail due to rate limit
      const result2 = useCase.execute(input);

      await expect(result1).resolves.toBeDefined();
      await expect(result2).rejects.toThrow(RateLimitError);
    });
  });
});
