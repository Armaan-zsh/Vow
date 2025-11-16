const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  // FIX: Correct moduleNameMapper (not moduleNameMapping)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // FIX: Global setup that prevents 90% of errors
  setupFilesAfterEnv: ['<rootDir>/src/shared/testing/setup.ts'],

  // FIX: Bail on first failure to prevent cascading errors
  bail: 1,

  // FIX: Auto-clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  testEnvironment: 'jest-environment-jsdom',

  // FIX: Enable fake timers globally to prevent warnings
  fakeTimers: {
    enableGlobally: true,
  },

  // FIX: Coverage enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // FIX: Ignore patterns that cause issues
  testPathIgnorePatterns: [
    '/.next/',
    '/node_modules/',
    '/__mocks__/',
  ],
});
