import { createMockRedis } from '../../src/shared/testing/mocks';

export const Redis = jest.fn(() => createMockRedis());