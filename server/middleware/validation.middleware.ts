
// middleware/validation.middleware.ts
import { body, query, param, header, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { 
  ValidationError, 
  ValidationResponse, 
  ValidationRule 
} from '../../types/validation.types';
import { 
  VALIDATION_PATTERNS, 
  VALIDATION_LIMITS, 
  ERROR_CODES 
} from '../constants/validation.constants';
import { customValidators } from '../validators/custom.validators';

/**
 * Base validation builder class
 */
export class ValidationBuilder {
  private chains: ValidationChain[] = [];

  /**
   * Add validation for a field
   */
  field(location: 'body' | 'query' | 'param' | 'header', field: string) {
    const validator = {
      body: body(field),
      query: query(field),
      param: param(field),
      header: header(field)
    }[location];

    this.chains.push(validator);
    return new FieldValidator(validator, this);
  }

  /**
   * Build validation chains
   */
  build(): ValidationChain[] {
    return this.chains;
  }

  /**
   * Add a validation chain
   */
  addChain(chain: ValidationChain): ValidationBuilder {
    this.chains.push(chain);
    return this;
  }
}

/**
 * Field validator with chainable methods
 */
class FieldValidator {
  constructor(
    private chain: ValidationChain,
    private builder: ValidationBuilder
  ) {}

  required(message = 'This field is required'): this {
    this.chain.notEmpty().withMessage(message);
    return this;
  }

  optional(): this {
    this.chain.optional();
    return this;
  }

  string(message = 'Must be a string'): this {
    this.chain.isString().withMessage(message);
    return this;
  }

  number(message = 'Must be a number'): this {
    this.chain.isNumeric().withMessage(message);
    return this;
  }

  integer(message = 'Must be an integer'): this {
    this.chain.isInt().withMessage(message);
    return this;
  }

  array(options?: { min?: number; max?: number }, message?: string): this {
    this.chain.isArray(options).withMessage(message || `Must be an array${options ? ` with ${options.min || 0}-${options.max || '∞'} items` : ''}`);
    return this;
  }

  length(options: { min?: number; max?: number }, message?: string): this {
    this.chain.isLength(options).withMessage(message || `Length must be between ${options.min || 0} and ${options.max || '∞'}`);
    return this;
  }

  pattern(pattern: RegExp, message: string): this {
    this.chain.matches(pattern).withMessage(message);
    return this;
  }

  email(message = 'Must be a valid email'): this {
    this.chain.isEmail().withMessage(message);
    return this;
  }

  url(message = 'Must be a valid URL'): this {
    this.chain.isURL().withMessage(message);
    return this;
  }

  date(message = 'Must be a valid date'): this {
    this.chain.isISO8601().withMessage(message);
    return this;
  }

  custom(validator: (value: any, { req }: { req: Request }) => boolean | Promise<boolean>, message: string): this {
    this.chain.custom(validator).withMessage(message);
    return this;
  }

  trim(): this {
    this.chain.trim();
    return this;
  }

  escape(): this {
    this.chain.escape();
    return this;
  }

  toUpperCase(): this {
    this.chain.toUpperCase();
    return this;
  }

  toLowerCase(): this {
    this.chain.toLowerCase();
    return this;
  }

  next(): ValidationBuilder {
    return this.builder;
  }
}

/**
 * Pre-built validation schemas
 */
export const ValidationSchemas = {
  // Symbol validations
  symbol: () => new ValidationBuilder()
    .field('query', 'symbol')
    .optional()
    .string()
    .trim()
    .toUpperCase()
    .pattern(VALIDATION_PATTERNS.SYMBOL, 'Invalid symbol format')
    .next()
    .build(),

  symbolRequired: () => new ValidationBuilder()
    .field('query', 'symbol')
    .required()
    .string()
    .trim()
    .toUpperCase()
    .pattern(VALIDATION_PATTERNS.SYMBOL, 'Invalid symbol format')
    .next()
    .build(),

  // Batch validations
  batchSymbols: () => new ValidationBuilder()
    .field('body', 'symbols')
    .required('Symbols array is required')
    .array(VALIDATION_LIMITS.SYMBOLS, `Must provide ${VALIDATION_LIMITS.SYMBOLS.min}-${VALIDATION_LIMITS.SYMBOLS.max} symbols`)
    .custom(customValidators.isUniqueArray.validator, customValidators.isUniqueArray.message)
    .next()
    .field('body', 'symbols.*')
    .string()
    .trim()
    .toUpperCase()
    .pattern(VALIDATION_PATTERNS.SYMBOL, 'Invalid symbol format')
    .next()
    .field('body', 'options')
    .optional()
    .custom((value) => typeof value === 'object' && !Array.isArray(value), 'Options must be an object')
    .next()
    .build(),

  // Search validations
  searchQuery: () => new ValidationBuilder()
    .field('body', 'query')
    .required('Search query is required')
    .string()
    .trim()
    .length(VALIDATION_LIMITS.QUERY)
    .escape()
    .next()
    .field('body', 'maxResults')
    .optional()
    .integer()
    .custom((value) => value >= 1 && value <= 100, 'Max results must be between 1 and 100')
    .next()
    .build(),

  // Pagination validations
  pagination: () => new ValidationBuilder()
    .field('query', 'page')
    .optional()
    .integer('Page must be an integer')
    .custom((value) => value >= 1, 'Page must be >= 1')
    .next()
    .field('query', 'limit')
    .optional()
    .integer('Limit must be an integer')
    .custom((value) => value >= 1 && value <= VALIDATION_LIMITS.PAGE_SIZE.max, `Limit must be between 1 and ${VALIDATION_LIMITS.PAGE_SIZE.max}`)
    .next()
    .field('query', 'sort')
    .optional()
    .string()
    .pattern(/^[a-zA-Z_]+:(asc|desc)$/, 'Sort must be in format "field:asc" or "field:desc"')
    .next()
    .build(),

  // Date range validations
  dateRange: () => new ValidationBuilder()
    .field('query', 'startDate')
    .optional()
    .date('Start date must be in ISO format')
    .next()
    .field('query', 'endDate')
    .optional()
    .date('End date must be in ISO format')
    .custom((value, { req }) => {
      if (!req.query?.startDate || !value) return true;
      return new Date(value) >= new Date(req.query.startDate);
    }, 'End date must be after start date')
    .next()
    .build()
};

/**
 * Enhanced validation error handler
 */
export const handleValidationErrors = (
  options: {
    logErrors?: boolean;
    includeValue?: boolean;
    customMessage?: string;
  } = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const validationErrors: ValidationError[] = errors.array().map(err => ({
        field: err.type === 'field' ? err.path : err.type,
        value: options.includeValue ? err.value : undefined,
        message: err.msg,
        code: determineErrorCode(err),
        location: err.location as any
      }));

      if (options.logErrors) {
        console.error(`Validation failed for ${req.method} ${req.path}:`, validationErrors);
      }

      const response: ValidationResponse = {
        success: false,
        error: options.customMessage || 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validationErrors,
        timestamp: new Date().toISOString()
      };

      return res.status(400).json(response);
    }
    
    next();
  };
};

/**
 * Determine error code based on validation error
 */
function determineErrorCode(error: any): string {
  if (error.msg.includes('required')) return ERROR_CODES.REQUIRED_FIELD;
  if (error.msg.includes('format')) return ERROR_CODES.INVALID_FORMAT;
  if (error.msg.includes('range') || error.msg.includes('between')) return ERROR_CODES.OUT_OF_RANGE;
  if (error.msg.includes('type')) return ERROR_CODES.INVALID_TYPE;
  if (error.msg.includes('unique') || error.msg.includes('duplicate')) return ERROR_CODES.DUPLICATE_VALUE;
  return ERROR_CODES.BUSINESS_RULE;
}

/**
 * Compose multiple validation schemas
 */
export function composeValidations(...schemas: ValidationChain[][]): ValidationChain[] {
  return schemas.flat();
}

/**
 * Conditional validation
 */
export function conditionalValidation(
  condition: (req: Request) => boolean,
  validations: ValidationChain[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      Promise.all(validations.map(validation => validation.run(req)))
        .then(() => next())
        .catch(next);
    } else {
      next();
    }
  };
}

// Export convenience validators
export const validateSymbol = ValidationSchemas.symbol();
export const validateSymbolRequired = ValidationSchemas.symbolRequired();
export const validateBatchRequest = ValidationSchemas.batchSymbols();
export const validateSearchQuery = ValidationSchemas.searchQuery();
export const validatePagination = ValidationSchemas.pagination();
export const validateDateRange = ValidationSchemas.dateRange();

// Export validation utilities
export const validate = {
  symbol: validateSymbol,
  symbolRequired: validateSymbolRequired,
  batch: validateBatchRequest,
  search: validateSearchQuery,
  pagination: validatePagination,
  dateRange: validateDateRange,
  custom: (rules: ValidationRule[]) => {
    const builder = new ValidationBuilder();
    rules.forEach(rule => {
      const validator = builder.field('body', rule.field);
      if (rule.optional) validator.optional();
      rule.rules.forEach(r => r(validator));
    });
    return builder.build();
  }
};
