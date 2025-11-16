import { AddItemUseCase } from '@/core/use-cases/AddItemUseCase';
import { createAddItemDTO } from '@/shared/testing/factories';
import { testItemRepo, testUserRepo } from '@/shared/testing/integration-helpers';
import { createMockEventBus } from '@/shared/testing/mocks';

describe('AddItemUseCase Integration', () => {
  let useCase: AddItemUseCase;
  let mockEventBus: any;
  let mockJobScheduler: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockJobScheduler = {
      schedule: jest.fn().mockResolvedValue(undefined),
    };
    mockAuditLogger = {
      log: jest.fn(),
    };
    useCase = new AddItemUseCase(
      testItemRepo,
      testUserRepo,
      mockEventBus,
      mockJobScheduler,
      mockAuditLogger
    );
    
    // FIX: User is created in beforeEach by integration-helpers
  });

  it('should create item', async () => {
    const dto = createAddItemDTO();
    
    const item = await useCase.execute(dto);
    
    expect(item.id).toBeDefined();
    expect(testItemRepo.data.size).toBe(1);
    expect(mockEventBus.emit).toHaveBeenCalled();
  });
});
