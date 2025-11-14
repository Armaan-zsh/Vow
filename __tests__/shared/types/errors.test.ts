import { ZodError, z } from 'zod';
import {
  ReadFlexError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
  ProviderAPIError,
  OTPExpiredError,
  ImageTooLargeError,
  createNotFound,
  createConflictError,
  transformZodError,
  serializeError,
  isReadFlexError
} from '../../../src/shared/types/errors';

describe('Error System', () => {
  describe('Error Hierarchy', () => {
    it('should extend ReadFlexError correctly', () => {
      const rateLimitError = new RateLimitError();
      const notFoundError = new NotFoundError('User not found');
      const validationError = new ValidationError('Invalid input');

      expect(rateLimitError).toBeInstanceOf(ReadFlexError);
      expect(notFoundError).toBeInstanceOf(ReadFlexError);
      expect(validationError).toBeInstanceOf(ReadFlexError);
      expect(rateLimitError).toBeInstanceOf(RateLimitError);
      expect(notFoundError).toBeInstanceOf(NotFoundError);
      expect(validationError).toBeInstanceOf(ValidationError);
    });

    it('should have correct error properties', () => {
      const errors = [
        { error: new RateLimitError(), code: 'RATE_LIMIT_EXCEEDED', status: 429, shouldReport: false },
        { error: new NotFoundError('test'), code: 'NOT_FOUND', status: 404, shouldReport: false },
        { error: new ValidationError('test'), code: 'VALIDATION_ERROR', status: 400, shouldReport: false },
        { error: new AuthorizationError(), code: 'AUTHORIZATION_ERROR', status: 403, shouldReport: false },
        { error: new ConflictError('test'), code: 'CONFLICT', status: 409, shouldReport: false },
        { error: new ProviderAPIError('test'), code: 'PROVIDER_API_ERROR', status: 502, shouldReport: true },
        { error: new OTPExpiredError(), code: 'OTP_EXPIRED', status: 400, shouldReport: false },
        { error: new ImageTooLargeError(), code: 'IMAGE_TOO_LARGE', status: 413, shouldReport: false }
      ];

      errors.forEach(({ error, code, status, shouldReport }) => {
        expect(error.code).toBe(code);
        expect(error.statusCode).toBe(status);
        expect(error.shouldReport).toBe(shouldReport);
      });
    });

    it('should categorize status codes correctly', () => {
      const clientErrors = [
        new RateLimitError(),
        new NotFoundError('test'),
        new ValidationError('test'),
        new AuthorizationError(),
        new ConflictError('test'),
        new OTPExpiredError(),
        new ImageTooLargeError()
      ];

      const serverErrors = [
        new ProviderAPIError('test')
      ];

      clientErrors.forEach(error => {
        expect(error.statusCode).toBeGreaterThanOrEqual(400);
        expect(error.statusCode).toBeLessThan(500);
      });

      serverErrors.forEach(error => {
        expect(error.statusCode).toBeGreaterThanOrEqual(500);
        expect(error.statusCode).toBeLessThan(600);
      });
    });
  });

  describe('Factory Functions', () => {
    it('should create NotFoundError with factory', () => {
      const error = createNotFound('User', 'user-123');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("User with id 'user-123' not found");
      expect(error.context).toEqual({ entity: 'User', id: 'user-123' });
    });

    it('should create ConflictError with factory', () => {
      const error = createConflictError('username', 'johndoe');

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe("username 'johndoe' already exists");
      expect(error.context).toEqual({ field: 'username', value: 'johndoe' });
    });
  });

  describe('Zod Error Transformation', () => {
    it('should transform single Zod error', () => {
      const schema = z.object({ email: z.string().email() });
      
      try {
        schema.parse({ email: 'invalid-email' });
      } catch (zodError) {
        const error = transformZodError(zodError as ZodError);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Invalid email');
        expect(error.context?.issues).toHaveLength(1);
        expect(error.context?.issues[0].path).toBe('email');
      }
    });

    it('should transform multiple Zod errors', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18)
      });
      
      try {
        schema.parse({ email: 'invalid', age: 15 });
      } catch (zodError) {
        const error = transformZodError(zodError as ZodError);

        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Validation failed');
        expect(error.context?.issues).toHaveLength(2);
      }
    });
  });

  describe('Error Serialization', () => {
    it('should serialize error correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const serialized = serializeError(error);

      expect(serialized).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          userMessage: 'Please check your input and try again.',
          statusCode: 400,
          context: { field: 'email' }
        }
      });
    });

    it('should serialize error without context', () => {
      const error = new RateLimitError();
      const serialized = serializeError(error);

      expect(serialized.error.context).toBeUndefined();
      expect(serialized.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('User Messages', () => {
    it('should provide user-friendly messages', () => {
      const messages = [
        { error: new RateLimitError(), expected: 'Too many requests. Please try again later.' },
        { error: new NotFoundError('test'), expected: 'The requested resource was not found.' },
        { error: new ValidationError('test'), expected: 'Please check your input and try again.' },
        { error: new AuthorizationError(), expected: 'You do not have permission to perform this action.' },
        { error: new ConflictError('test'), expected: 'This resource already exists. Please choose a different value.' },
        { error: new ProviderAPIError('test'), expected: 'External service is temporarily unavailable. Please try again later.' },
        { error: new OTPExpiredError(), expected: 'Your verification code has expired. Please request a new one.' },
        { error: new ImageTooLargeError(), expected: 'Please choose a smaller image file (max 5MB).' }
      ];

      messages.forEach(({ error, expected }) => {
        expect(error.getUserMessage()).toBe(expected);
      });
    });
  });

  describe('Error Detection', () => {
    it('should detect ReadFlexError instances', () => {
      const readFlexError = new ValidationError('test');
      const regularError = new Error('test');

      expect(isReadFlexError(readFlexError)).toBe(true);
      expect(isReadFlexError(regularError)).toBe(false);
      expect(isReadFlexError(null)).toBe(false);
      expect(isReadFlexError(undefined)).toBe(false);
      expect(isReadFlexError('string')).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const error = new NotFoundError('User not found', { userId: '123' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'NotFoundError',
        code: 'NOT_FOUND',
        message: 'User not found',
        statusCode: 404,
        context: { userId: '123' }
      });
    });
  });

  describe('Error Context', () => {
    it('should handle context correctly', () => {
      const context = { userId: '123', action: 'delete' };
      const error = new AuthorizationError('Cannot delete user', context);

      expect(error.context).toEqual(context);
      expect(error.toJSON().context).toEqual(context);
    });

    it('should handle missing context', () => {
      const error = new ValidationError('Invalid input');

      expect(error.context).toBeUndefined();
      expect(error.toJSON().context).toBeUndefined();
    });
  });
});