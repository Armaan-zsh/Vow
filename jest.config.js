const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/src/shared/testing/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  bail: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/__mocks__/', '/.next/', '/node_modules/'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
});
