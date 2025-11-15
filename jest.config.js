const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const config = {
  // FIX: Correct property name (not moduleNameMapping)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@upstash/redis$': '<rootDir>/__mocks__/@upstash/redis.ts',
  },
  
  // FIX: Use global setup file
  setupFilesAfterEnv: ['<rootDir>/src/shared/testing/setup.ts'],
  

  
  // FIX: Bail on first failure to prevent cascading errors
  bail: 1,
  
  // FIX: Clear mocks between tests automatically
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  testEnvironment: 'jest-environment-jsdom',
  
  // FIX: Prevent testEnvironmentOptions issues
  testEnvironmentOptions: {
    customExportConditions: [''],
    resources: 'usable',
  },
  
  // FIX: Coverage thresholds to enforce quality
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
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/performance/', // Separate run
  ],
};

module.exports = createJestConfig(config);