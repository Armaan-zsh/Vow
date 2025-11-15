// FIX: Correctly hoisted Redis mock
export const createMockRedis = () => ({
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  incr: jest.fn(),
  ttl: jest.fn(),
  del: jest.fn(),
  eval: jest.fn(),
  ping: jest.fn().mockResolvedValue('PONG'),
});

// FIX: EventBus mock that tracks calls
export const createMockEventBus = () => ({
  emit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
});

// FIX: Cache mock
export const createMockCache = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
});

// FIX: Logger mock
export const createMockLogger = () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
});
