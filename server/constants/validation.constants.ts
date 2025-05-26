
import { ValidationPattern, ValidationLimit, ValidationError } from '../../types/validation-constants.types';

/**
 * Comprehensive validation patterns with metadata
 */
export const VALIDATION_PATTERNS: Readonly<Record<string, ValidationPattern>> = Object.freeze({
  // Financial Symbols
  SYMBOL: {
    pattern: /^[A-Z0-9]{1,12}$/,
    message: 'Symbol must be 1-12 uppercase letters or numbers',
    examples: ['AAPL', 'GOOGL', 'BTC', 'ETH']
  },
  SYMBOL_WITH_EXCHANGE: {
    pattern: /^[A-Z0-9]{1,12}:[A-Z]{2,10}$/,
    message: 'Format: SYMBOL:EXCHANGE',
    examples: ['AAPL:NASDAQ', 'BP:LSE']
  },
  CRYPTO_SYMBOL: {
    pattern: /^[A-Z0-9]{2,10}(-USD|-USDT|-BTC|-ETH)?$/,
    message: 'Crypto symbol with optional pair',
    examples: ['BTC', 'ETH-USD', 'ADA-USDT']
  },
  
  // Currency
  CURRENCY_CODE: {
    pattern: /^[A-Z]{3}$/,
    message: 'Currency code must be 3 uppercase letters',
    examples: ['USD', 'EUR', 'GBP']
  },
  CURRENCY_PAIR: {
    pattern: /^[A-Z]{3}\/[A-Z]{3}$/,
    message: 'Format: XXX/YYY (e.g., EUR/USD)',
    examples: ['EUR/USD', 'GBP/JPY']
  },
  CURRENCY_PAIR_FLEXIBLE: {
    pattern: /^[A-Z]{3}[\s\-_\/]?[A-Z]{3}$/,
    message: 'Currency pair with flexible separator',
    examples: ['EURUSD', 'EUR-USD', 'EUR_USD', 'EUR/USD']
  },
  
  // Identifiers
  UUID: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    message: 'Must be a valid UUID v4',
    examples: ['550e8400-e29b-41d4-a716-446655440000']
  },
  ULID: {
    pattern: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    message: 'Must be a valid ULID',
    examples: ['01ARZ3NDEKTSV4RRFFQ69G5FAV']
  },
  SLUG: {
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: 'Lowercase letters, numbers, and hyphens only',
    examples: ['my-article', 'product-123']
  },
  
  // Contact Information
  EMAIL: {
    pattern: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    message: 'Must be a valid email address',
    examples: ['user@example.com', 'john.doe+tag@company.co.uk']
  },
  PHONE_INTERNATIONAL: {
    pattern: /^\+[1-9]\d{1,14}$/,
    message: 'International format: +[country code][number]',
    examples: ['+14155552671', '+442071838750']
  },
  PHONE_US: {
    pattern: /^(\+1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
    message: 'US phone number format',
    examples: ['(555) 123-4567', '+1-555-123-4567', '5551234567']
  },
  
  // Dates and Times
  DATE_ISO: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: 'Format: YYYY-MM-DD',
    examples: ['2024-03-15', '2023-12-31']
  },
  DATETIME_ISO: {
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/,
    message: 'ISO 8601 datetime format',
    examples: ['2024-03-15T10:30:00Z', '2024-03-15T10:30:00.123+02:00']
  },
  TIME_24H: {
    pattern: /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
    message: '24-hour format: HH:MM[:SS]',
    examples: ['14:30', '23:59:59', '00:00']
  },
  
  // URLs and Domains
  URL: {
    pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$/,
    message: 'Must be a valid URL',
    examples: ['https://example.com', 'http://sub.example.com/path?query=1']
  },
  DOMAIN: {
    pattern: /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    message: 'Must be a valid domain name',
    examples: ['example.com', 'sub.example.co.uk']
  },
  
  // Numbers and Financial
  DECIMAL: {
    pattern: /^-?\d+\.?\d*$/,
    message: 'Must be a decimal number',
    examples: ['123', '-456.78', '0.01']
  },
  POSITIVE_DECIMAL: {
    pattern: /^\d+\.?\d*$/,
    message: 'Must be a positive decimal number',
    examples: ['123', '456.78', '0.01']
  },
  PERCENTAGE: {
    pattern: /^(?:100(?:\.0{1,2})?|[0-9]{1,2}(?:\.[0-9]{1,2})?)%?$/,
    message: 'Percentage between 0-100',
    examples: ['50', '99.99', '100%', '0.01%']
  },
  MONEY: {
    pattern: /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/,
    message: 'Money format with optional $ and commas',
    examples: ['$1,234.56', '999.99', '$1,000,000.00']
  },
  
  // Security
  PASSWORD_STRONG: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    message: 'Min 8 chars, uppercase, lowercase, number, and special character',
    examples: ['P@ssw0rd123', 'Str0ng!Pass']
  },
  API_KEY: {
    pattern: /^[A-Za-z0-9_\-]{32,128}$/,
    message: 'API key format: 32-128 alphanumeric characters',
    examples: ['sk_test_4eC39HqLyjWDarjtT1zdp7dc']
  },
  JWT: {
    pattern: /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    message: 'JWT format: header.payload.signature',
    examples: ['eyJhbGc.eyJzdWI.SflKxwRJ']
  },
  
  // General
  ALPHANUMERIC: {
    pattern: /^[a-zA-Z0-9]+$/,
    message: 'Letters and numbers only',
    examples: ['ABC123', 'test2024']
  },
  ALPHA: {
    pattern: /^[a-zA-Z]+$/,
    message: 'Letters only',
    examples: ['Hello', 'World']
  },
  NUMERIC: {
    pattern: /^\d+$/,
    message: 'Numbers only',
    examples: ['123', '456789']
  },
  HEX_COLOR: {
    pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
    message: 'Hex color format',
    examples: ['#FF5733', '#F00']
  },
  IP_ADDRESS: {
    pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    message: 'Valid IPv4 address',
    examples: ['192.168.1.1', '10.0.0.1']
  }
});

/**
 * Validation limits with contextual information
 */
export const VALIDATION_LIMITS: Readonly<Record<string, ValidationLimit>> = Object.freeze({
  // Arrays
  SYMBOLS: {
    min: 1,
    max: 50,
    message: 'Between 1 and 50 symbols allowed'
  },
  BATCH_SIZE: {
    min: 1,
    max: 100,
    message: 'Batch size must be between 1 and 100'
  },
  TAGS: {
    min: 0,
    max: 20,
    message: 'Maximum 20 tags allowed'
  },
  
  // Strings
  USERNAME: {
    min: 3,
    max: 30,
    message: 'Username must be 3-30 characters'
  },
  PASSWORD: {
    min: 8,
    max: 128,
    message: 'Password must be 8-128 characters'
  },
  TITLE: {
    min: 1,
    max: 200,
    message: 'Title must be 1-200 characters'
  },
  DESCRIPTION: {
    min: 10,
    max: 5000,
    message: 'Description must be 10-5000 characters'
  },
  SHORT_TEXT: {
    min: 1,
    max: 255,
    message: 'Text must be 1-255 characters'
  },
  LONG_TEXT: {
    min: 1,
    max: 10000,
    message: 'Text must be 1-10000 characters'
  },
  QUERY: {
    min: 1,
    max: 500,
    message: 'Query must be 1-500 characters'
  },
  STRING_LENGTH: {
    min: 1,
    max: 1000,
    message: 'String must be 1-1000 characters'
  },
  
  // Pagination
  PAGE_SIZE: {
    min: 1,
    max: 100,
    message: 'Page size must be 1-100',
    strict: true
  },
  PAGE_NUMBER: {
    min: 1,
    max: 10000,
    message: 'Page number must be 1-10000'
  },
  OFFSET: {
    min: 0,
    max: 1000000,
    message: 'Offset must be 0-1000000'
  },
  
  // Numbers
  PERCENTAGE: {
    min: 0,
    max: 100,
    message: 'Percentage must be 0-100'
  },
  RATING: {
    min: 1,
    max: 5,
    message: 'Rating must be 1-5'
  },
  QUANTITY: {
    min: 1,
    max: 999999,
    message: 'Quantity must be 1-999999'
  },
  PRICE: {
    min: 0.01,
    max: 999999.99,
    message: 'Price must be 0.01-999999.99'
  },
  
  // Time
  DAYS: {
    min: 1,
    max: 365,
    message: 'Days must be 1-365'
  },
  HOURS: {
    min: 0,
    max: 23,
    message: 'Hours must be 0-23'
  },
  MINUTES: {
    min: 0,
    max: 59,
    message: 'Minutes must be 0-59'
  },
  
  // Files
  FILE_SIZE_BYTES: {
    min: 1,
    max: 104857600, // 100MB
    message: 'File size must be under 100MB'
  },
  IMAGE_SIZE_BYTES: {
    min: 1,
    max: 10485760, // 10MB
    message: 'Image size must be under 10MB'
  },
  FILE_NAME_LENGTH: {
    min: 1,
    max: 255,
    message: 'File name must be 1-255 characters'
  }
});

/**
 * Comprehensive error codes with metadata
 */
export const ERROR_CODES: Readonly<Record<string, ValidationError>> = Object.freeze({
  // Format Errors
  INVALID_FORMAT: {
    code: 'INVALID_FORMAT',
    message: 'Invalid format',
    httpStatus: 400,
    severity: 'error'
  },
  INVALID_EMAIL: {
    code: 'INVALID_EMAIL',
    message: 'Invalid email address',
    httpStatus: 400,
    severity: 'error'
  },
  INVALID_URL: {
    code: 'INVALID_URL',
    message: 'Invalid URL',
    httpStatus: 400,
    severity: 'error'
  },
  INVALID_DATE: {
    code: 'INVALID_DATE',
    message: 'Invalid date format',
    httpStatus: 400,
    severity: 'error'
  },
  
  // Range Errors
  OUT_OF_RANGE: {
    code: 'OUT_OF_RANGE',
    message: 'Value out of acceptable range',
    httpStatus: 400,
    severity: 'error'
  },
  TOO_SHORT: {
    code: 'TOO_SHORT',
    message: 'Value is too short',
    httpStatus: 400,
    severity: 'error'
  },
  TOO_LONG: {
    code: 'TOO_LONG',
    message: 'Value is too long',
    httpStatus: 400,
    severity: 'error'
  },
  TOO_SMALL: {
    code: 'TOO_SMALL',
    message: 'Value is too small',
    httpStatus: 400,
    severity: 'error'
  },
  TOO_LARGE: {
    code: 'TOO_LARGE',
    message: 'Value is too large',
    httpStatus: 400,
    severity: 'error'
  },
  
  // Type Errors
  INVALID_TYPE: {
    code: 'INVALID_TYPE',
    message: 'Invalid data type',
    httpStatus: 400,
    severity: 'error'
  },
  NOT_STRING: {
    code: 'NOT_STRING',
    message: 'Value must be a string',
    httpStatus: 400,
    severity: 'error'
  },
  NOT_NUMBER: {
    code: 'NOT_NUMBER',
    message: 'Value must be a number',
    httpStatus: 400,
    severity: 'error'
  },
  NOT_BOOLEAN: {
    code: 'NOT_BOOLEAN',
    message: 'Value must be a boolean',
    httpStatus: 400,
    severity: 'error'
  },
  NOT_ARRAY: {
    code: 'NOT_ARRAY',
    message: 'Value must be an array',
    httpStatus: 400,
    severity: 'error'
  },
  NOT_OBJECT: {
    code: 'NOT_OBJECT',
    message: 'Value must be an object',
    httpStatus: 400,
    severity: 'error'
  },
  
  // Existence Errors
  REQUIRED_FIELD: {
    code: 'REQUIRED_FIELD',
    message: 'This field is required',
    httpStatus: 400,
    severity: 'error'
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
    httpStatus: 404,
    severity: 'error'
  },
  ALREADY_EXISTS: {
    code: 'ALREADY_EXISTS',
    message: 'Resource already exists',
    httpStatus: 409,
    severity: 'error'
  },
  
  // Uniqueness Errors
  DUPLICATE_VALUE: {
    code: 'DUPLICATE_VALUE',
    message: 'Duplicate value not allowed',
    httpStatus: 409,
    severity: 'error'
  },
  NOT_UNIQUE: {
    code: 'NOT_UNIQUE',
    message: 'Value must be unique',
    httpStatus: 409,
    severity: 'error'
  },
  
  // Business Logic Errors
  BUSINESS_RULE: {
    code: 'BUSINESS_RULE',
    message: 'Business rule violation',
    httpStatus: 422,
    severity: 'error'
  },
  INVALID_STATE: {
    code: 'INVALID_STATE',
    message: 'Invalid state transition',
    httpStatus: 422,
    severity: 'error'
  },
  EXPIRED: {
    code: 'EXPIRED',
    message: 'Resource has expired',
    httpStatus: 410,
    severity: 'error'
  },
  
  // Permission Errors
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    httpStatus: 401,
    severity: 'error'
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access forbidden',
    httpStatus: 403,
    severity: 'error'
  },
  
  // Rate Limiting
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    httpStatus: 429,
    severity: 'warning'
  }
});

/**
 * Validation helper utilities
 */
export class ValidationHelpers {
  /**
   * Test a value against a pattern
   */
  static test(value: string, patternKey: keyof typeof VALIDATION_PATTERNS): boolean {
    const pattern = VALIDATION_PATTERNS[patternKey];
    return pattern.pattern.test(value);
  }

  /**
   * Validate with detailed result
   */
  static validate(value: string, patternKey: keyof typeof VALIDATION_PATTERNS): {
    valid: boolean;
    message?: string;
    pattern?: string;
  } {
    const pattern = VALIDATION_PATTERNS[patternKey];
    const valid = pattern.pattern.test(value);
    
    return {
      valid,
      message: valid ? undefined : pattern.message,
      pattern: pattern.pattern.source
    };
  }

  /**
   * Check if value is within limits
   */
  static checkLimit(value: number | string | any[], limitKey: keyof typeof VALIDATION_LIMITS): {
    valid: boolean;
    message?: string;
  } {
    const limit = VALIDATION_LIMITS[limitKey];
    const length = typeof value === 'number' ? value : value.length;
    const valid = length >= limit.min && length <= limit.max;
    
    return {
      valid,
      message: valid ? undefined : limit.message
    };
  }

  /**
   * Get error details
   */
  static getError(errorKey: keyof typeof ERROR_CODES, customMessage?: string): ValidationError {
    const error = ERROR_CODES[errorKey];
    return {
      ...error,
      message: customMessage || error.message
    };
  }

  /**
   * Sanitize string based on pattern
   */
  static sanitize(value: string, patternKey: keyof typeof VALIDATION_PATTERNS): string {
    switch (patternKey) {
      case 'EMAIL':
        return value.toLowerCase().trim();
      case 'SYMBOL':
      case 'CURRENCY_CODE':
      case 'CURRENCY_PAIR':
        return value.toUpperCase().trim();
      case 'SLUG':
        return value.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      default:
        return value.trim();
    }
  }

  /**
   * Generate example for pattern
   */
  static getExample(patternKey: keyof typeof VALIDATION_PATTERNS): string {
    const pattern = VALIDATION_PATTERNS[patternKey];
    return pattern.examples?.[0] || '';
  }

  /**
   * Get all examples for pattern
   */
  static getExamples(patternKey: keyof typeof VALIDATION_PATTERNS): string[] {
    const pattern = VALIDATION_PATTERNS[patternKey];
    return pattern.examples || [];
  }
}

// Export type guards
export const isValidPattern = (key: string): key is keyof typeof VALIDATION_PATTERNS => {
  return key in VALIDATION_PATTERNS;
};

export const isValidLimit = (key: string): key is keyof typeof VALIDATION_LIMITS => {
  return key in VALIDATION_LIMITS;
};

export const isValidErrorCode = (key: string): key is keyof typeof ERROR_CODES => {
  return key in ERROR_CODES;
};

// Export convenience validators
export const validators = {
  isEmail: (value: string) => ValidationHelpers.test(value, 'EMAIL'),
  isSymbol: (value: string) => ValidationHelpers.test(value, 'SYMBOL'),
  isCurrencyPair: (value: string) => ValidationHelpers.test(value, 'CURRENCY_PAIR'),
  isUUID: (value: string) => ValidationHelpers.test(value, 'UUID'),
  isURL: (value: string) => ValidationHelpers.test(value, 'URL'),
  isSlug: (value: string) => ValidationHelpers.test(value, 'SLUG'),
  isDate: (value: string) => ValidationHelpers.test(value, 'DATE_ISO'),
  isPhone: (value: string) => ValidationHelpers.test(value, 'PHONE_INTERNATIONAL')
};
