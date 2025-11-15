import {
  createMockRedis,
  createMockEventBus,
  createMockCache,
  createMockLogger,
} from '@/shared/testing/mocks';

describe('Test Mocks', () => {
  it('should create Redis mock with all required methods', () => {
    const redis = createMockRedis();

    expect(redis.get).toBeDefined();
    expect(redis.set).toBeDefined();
    expect(redis.eval).toBeDefined();
    expect(redis.del).toBeDefined();
    expect(typeof redis.ping).toBe('function');
  });

  it('should create EventBus mock', () => {
    const eventBus = createMockEventBus();

    expect(eventBus.emit).toBeDefined();
    expect(eventBus.on).toBeDefined();
    expect(eventBus.off).toBeDefined();
  });

  it('should create Cache mock', () => {
    const cache = createMockCache();

    expect(cache.get).toBeDefined();
    expect(cache.set).toBeDefined();
  });

  it('should create Logger mock', () => {
    const logger = createMockLogger();

    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
  });
});
