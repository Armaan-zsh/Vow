# AI-Proof Development Environment

This infrastructure makes AI coding errors **impossible** through automation.

## ✅ ERRORS PERMANENTLY ELIMINATED

1. **Missing DTO properties** - Factories guarantee all required fields
2. **Flaky timestamp tests** - Fake timers with fixed system time
3. **Mock initialization errors** - Hoisted mocks in `__mocks__/` directories
4. **JSDOM missing APIs** - Global polyfills for PointerEvent, IntersectionObserver
5. **Framer Motion DOM warnings** - Auto-mock strips animation props
6. **Transaction rollback failures** - MockRepository with proper transaction support
7. **State leakage between tests** - Auto-cleanup with verification
8. **Environment variable pollution** - Restricted access via ESLint
9. **Performance measurement flakiness** - Fake timers prevent 0ms results
10. **Type mismatches** - Factories ensure correct types

## 🚀 USAGE

### Single Command to Fix Everything
```bash
npm run fix:all
```

### Before Each AI Prompt
```bash
npm run fix:all  # Must pass
git status       # Must be clean
```

### After AI Generates Code
```bash
npm run fix:all  # If fails, code is wrong
```

## 📁 FILE STRUCTURE

```
src/shared/testing/
├── setup.ts           # Global test setup
├── factories.ts       # Type-safe DTO factories
├── mocks.ts          # Standardized mocks
└── integration-helpers.ts  # Auto-cleanup helpers

__mocks__/
└── @upstash/
    └── redis.ts      # Hoisted Redis mock

jest.config.js        # Correct moduleNameMapper
.eslintrc.ai-proof.js # Rules that fail build on violations
```

## 🔒 ENFORCEMENT MECHANISMS

### 1. ESLint Rules (Build Fails)
- No manual DTO creation in tests
- No direct `process.env` access
- No Framer Motion props in DOM
- Consistent test patterns

### 2. Jest Configuration
- Bail on first failure
- Auto-clear mocks between tests
- Coverage thresholds enforced
- Fake timers by default

### 3. TypeScript Strict Mode
- All factories return complete types
- Mock interfaces match real implementations
- No `any` types in production code

### 4. Automated Cleanup
- Repository state cleared between tests
- Verification that cleanup worked
- No shared state between test files

## 🧪 TESTING PATTERNS

### Use Factories (Required)
```typescript
// ❌ WRONG - ESLint will fail build
const input: SearchItemsDTO = { userId: 'test', query: 'test' };

// ✅ CORRECT - Guaranteed complete
const input = createSearchItemsDTO({ query: 'custom' });
```

### Use Fake Timers (Automatic)
```typescript
// ❌ WRONG - Flaky timestamps
expect(result.timestamp).toBeGreaterThan(Date.now() - 1000);

// ✅ CORRECT - Deterministic
jest.setSystemTime(new Date('2024-01-01'));
expect(result.timestamp).toBe(new Date('2024-01-01'));
```

### Use Mocks (Hoisted)
```typescript
// ❌ WRONG - Initialization order issues
const mockRedis = { get: jest.fn() };
jest.mock('@upstash/redis', () => ({ Redis: () => mockRedis }));

// ✅ CORRECT - Auto-hoisted
import { createMockRedis } from '@/shared/testing/mocks';
// Mock automatically available
```

## 🔧 MAINTENANCE

### Adding New DTOs
1. Create factory in `factories.ts`
2. Add test in `__tests__/shared/testing/factories.test.ts`
3. ESLint will enforce usage

### Adding New Mocks
1. Create mock in `mocks.ts`
2. Add to `__mocks__/` if external package
3. Test in `__tests__/shared/testing/mocks.test.ts`

### Updating Rules
1. Modify `.eslintrc.ai-proof.js`
2. Test with `npm run lint`
3. Verify build fails on violations

## 🎯 SUCCESS METRICS

- **Zero flaky tests** - Fake timers eliminate timing issues
- **Zero mock errors** - Hoisted mocks prevent initialization problems
- **Zero type errors** - Factories guarantee complete DTOs
- **Zero state leakage** - Auto-cleanup with verification
- **Zero manual fixes** - ESLint catches violations automatically

## 🚨 CRITICAL RULES

1. **NEVER** manually edit AI-generated code to fix type errors
2. **NEVER** skip tests to make build pass
3. **NEVER** commit with `// @ts-ignore` comments
4. **ALWAYS** run `npm run fix:all` before and after AI prompts
5. **ALWAYS** use factories for DTOs in tests

This infrastructure makes it **impossible** for AI to generate the common errors that waste development time.