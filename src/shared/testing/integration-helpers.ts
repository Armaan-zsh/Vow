import { MockItemRepository } from '@/core/repositories/MockItemRepository';
import { MockUserRepository } from '@/core/repositories/MockUserRepository';
import { createTestUser } from './factories';

// =====================================================================
// FIX: Global test state that auto-cleans between EVERY test
// =====================================================================
export let testItemRepo: MockItemRepository;
export let testUserRepo: MockUserRepository;

beforeEach(() => {
  testItemRepo = new MockItemRepository();
  testUserRepo = new MockUserRepository();
  
  // FIX: Clear ALL data before each test
  testItemRepo.clear();
  testUserRepo.clear();
  
  // FIX: Create default user (most tests need this)
  testUserRepo.create(createTestUser());
});

afterEach(() => {
  // FIX: Clear data after each test (don't verify size as tests may leave data)
  testItemRepo.clear();
  testUserRepo.clear();
});
