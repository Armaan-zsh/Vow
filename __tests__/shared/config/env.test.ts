import { _envSchemaForTests } from '../../../src/shared/config/env';

describe('Environment Validation', () => {
  describe('Secret Masking', () => {
    it('should mask sensitive values in error messages', () => {
      const input = {
        DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
        NEXTAUTH_SECRET: 'short-secret',
        NODE_ENV: 'test'
      };
      
      const result = _envSchemaForTests.safeParse(input);
      
      if (!result.success) {
        const message = result.error.errors
          .map(err => `${err.path[0]}: ${err.message}`)
          .join('\n');
        
        expect(message).toContain('NEXTAUTH_SECRET');
        expect(message).not.toContain('short-secret');
      }
    });

    it('should validate required fields', () => {
      const input = { NODE_ENV: 'test' };
      
      const result = _envSchemaForTests.safeParse(input);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        const missingKeys = result.error.errors.map(err => err.path[0]);
        expect(missingKeys).toContain('DATABASE_URL');
        expect(missingKeys).toContain('NEXTAUTH_SECRET');
      }
    });
  });
});