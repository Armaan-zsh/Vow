import { ZodError } from 'zod';

export abstract class ReadFlexError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly shouldReport: boolean;

  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context
    };
  }

  getUserMessage(): string {
    return this.message;
  }
}

export class RateLimitError extends ReadFlexError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly shouldReport = false;

  constructor(message = 'Too many requests. Please try again later.', context?: Record<string, any>) {
    super(message, context);
  }
}

export class NotFoundError extends ReadFlexError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly shouldReport = false;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'The requested resource was not found.';
  }
}

export class ValidationError extends ReadFlexError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly shouldReport = false;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'Please check your input and try again.';
  }
}

export class AuthorizationError extends ReadFlexError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
  readonly shouldReport = false;

  constructor(message = 'You are not authorized to perform this action.', context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'You do not have permission to perform this action.';
  }
}

export class ConflictError extends ReadFlexError {
  readonly code = 'CONFLICT';
  readonly statusCode = 409;
  readonly shouldReport = false;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'This resource already exists. Please choose a different value.';
  }
}

export class ProviderAPIError extends ReadFlexError {
  readonly code = 'PROVIDER_API_ERROR';
  readonly statusCode = 502;
  readonly shouldReport = true;

  constructor(message: string, context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'External service is temporarily unavailable. Please try again later.';
  }
}

export class OTPExpiredError extends ReadFlexError {
  readonly code = 'OTP_EXPIRED';
  readonly statusCode = 400;
  readonly shouldReport = false;

  constructor(message = 'Verification code has expired.', context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'Your verification code has expired. Please request a new one.';
  }
}

export class ImageTooLargeError extends ReadFlexError {
  readonly code = 'IMAGE_TOO_LARGE';
  readonly statusCode = 413;
  readonly shouldReport = false;

  constructor(message = 'Image file is too large.', context?: Record<string, any>) {
    super(message, context);
  }

  getUserMessage(): string {
    return 'Please choose a smaller image file (max 5MB).';
  }
}

// Factory functions
export function createNotFound(entity: string, id: string): NotFoundError {
  return new NotFoundError(`${entity} with id '${id}' not found`, { entity, id });
}

export function createConflictError(field: string, value: string): ConflictError {
  return new ConflictError(`${field} '${value}' already exists`, { field, value });
}

// Zod error transformation
export function transformZodError(error: ZodError): ValidationError {
  const issues = error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code
  }));

  const message = issues.length === 1 
    ? issues[0].message
    : `Validation failed: ${issues.map(i => i.message).join(', ')}`;

  return new ValidationError(message, { issues });
}

// Error serialization for API responses
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    userMessage: string;
    statusCode: number;
    context?: Record<string, any>;
  };
}

export function serializeError(error: ReadFlexError): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      userMessage: error.getUserMessage(),
      statusCode: error.statusCode,
      context: error.context
    }
  };
}

export function isReadFlexError(error: unknown): error is ReadFlexError {
  return error instanceof ReadFlexError;
}