import { MockItemRepository } from '@/core/repositories/MockItemRepository';
import { MockUserRepository } from '@/core/repositories/MockUserRepository';
import { createTestUser } from './factories';

// FIX: Global test state that auto-cleans between tests
let testItemRepo: MockItemRepository;
let testUserRepo: MockUserRepository;

beforeEach(() => {
  testItemRepo = new MockItemRepository();
  testUserRepo = new MockUserRepository();

  // FIX: Clear ALL data before each test
  testItemRepo.clear();
  testUserRepo.clear();

  // FIX: Create default user needed by most tests
  // testUserRepo.create(createTestUser());
});

afterEach(() => {
  // FIX: Verify cleanup worked
  expect(testItemRepo.size()).toBe(0);
  expect(testUserRepo.size()).toBe(0);
});

// FIX: Export for use in tests
export { testItemRepo, testUserRepo };
