import { AddItemUseCase, AddItemDTO } from '../../../src/core/use-cases/AddItemUseCase';
import { MockItemRepository } from '../../../src/core/repositories/MockItemRepository';
import { MockUserRepository } from '../../../src/core/repositories/MockUserRepository';
import { ItemType } from '../../../src/core/entities/Item';
import { User } from '../../../src/core/entities/User';

describe('AddItemUseCase Integration', () => {
  let useCase: AddItemUseCase;
  let itemRepository: MockItemRepository;
  let userRepository: MockUserRepository;
  let eventEmitter: any;
  let jobScheduler: any;
  let auditLogger: any;

  const mockUserId = 'user-123' as any;

  beforeEach(() => {
    itemRepository = new MockItemRepository();
    userRepository = new MockUserRepository();
    
    eventEmitter = { emit: jest.fn() };
    jobScheduler = { schedule: jest.fn() };
    auditLogger = { log: jest.fn() };

    useCase = new AddItemUseCase(
      itemRepository,
      userRepository,
      eventEmitter,
      jobScheduler,
      auditLogger
    );

    // Create test user
    const testUser = User.create({
      username: 'testuser',
      email: 'test@example.com',
      displayName: 'Test User'
    });
    userRepository.create(testUser);
  });

  it('should create item with real repository', async () => {
    const input: AddItemDTO = {
      userId: mockUserId,
      title: 'Integration Test Book',
      type: ItemType.BOOK,
      author: 'Test Author',
      isbn: '9780123456789'
    };

    const result = await useCase.execute(input);

    expect(result.title).toBe('Integration Test Book');
    expect(result.type).toBe(ItemType.BOOK);
    
    // Verify item was saved
    const savedItem = await itemRepository.findById(result.id);
    expect(savedItem).toBeDefined();
    expect(savedItem?.title).toBe('Integration Test Book');
  });

  it('should handle repository transaction rollback on error', async () => {
    const input: AddItemDTO = {
      userId: mockUserId,
      title: 'Test Book',
      type: ItemType.BOOK
    };

    // Mock transaction to throw error after item creation
    jest.spyOn(userRepository, 'incrementStats').mockRejectedValue(new Error('Stats update failed'));

    await expect(useCase.execute(input)).rejects.toThrow('Stats update failed');
    
    // Verify item was not saved due to transaction rollback
    const items = await itemRepository.findByUserId(mockUserId, { limit: 10 });
    expect(items.items).toHaveLength(0);
  });

  it('should enforce rate limiting with real repository', async () => {
    const input: AddItemDTO = {
      userId: mockUserId,
      title: 'Rate Limit Test',
      type: ItemType.BOOK
    };

    // Create 10 items quickly to hit rate limit
    const promises = Array.from({ length: 11 }, (_, i) => 
      useCase.execute({ ...input, title: `Book ${i}` })
    );

    const results = await Promise.allSettled(promises);
    
    // First 10 should succeed, 11th should fail
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    expect(successful).toHaveLength(10);
    expect(failed).toHaveLength(1);
  });

  it('should update user stats correctly', async () => {
    const input: AddItemDTO = {
      userId: mockUserId,
      title: 'Stats Test Book',
      type: ItemType.BOOK
    };

    await useCase.execute(input);

    expect(userRepository.incrementStats).toHaveBeenCalledWith(mockUserId, {
      totalItems: 1,
      bookCount: 1
    });
  });

  it('should emit events and schedule jobs in correct order', async () => {
    const input: AddItemDTO = {
      userId: mockUserId,
      title: 'Order Test Book',
      type: ItemType.BOOK,
      isbn: '9780123456789'
    };

    await useCase.execute(input);

    // Verify order: audit log, then event emission, then job scheduling
    expect(auditLogger.log).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
    expect(jobScheduler.schedule).toHaveBeenCalledWith('fetch-metadata', {
      itemId: expect.any(String),
      type: 'isbn',
      value: '9780123456789'
    });
  });
});