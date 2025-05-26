
// constants/validation.constants.ts
export const VALIDATION_PATTERNS = {
  SYMBOL: /^[A-Z0-9-]+$/,
  CURRENCY_PAIR: /^[A-Z]{3}\/[A-Z]{3}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9-]+$/
} as const;

export const VALIDATION_LIMITS = {
  SYMBOLS: { min: 1, max: 10 },
  BATCH_SIZE: { min: 1, max: 100 },
  STRING_LENGTH: { min: 1, max: 1000 },
  DESCRIPTION: { min: 10, max: 5000 },
  QUERY: { min: 1, max: 500 },
  PAGE_SIZE: { min: 1, max: 100 }
} as const;

export const ERROR_CODES = {
  INVALID_FORMAT: 'INVALID_FORMAT',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_TYPE: 'INVALID_TYPE',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
  BUSINESS_RULE: 'BUSINESS_RULE'
} as const;
