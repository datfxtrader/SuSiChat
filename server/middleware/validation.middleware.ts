
// middleware/validation.middleware.ts
import { body, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateBatchRequest = [
  body('symbols')
    .isArray({ min: 1, max: 10 })
    .withMessage('Symbols must be an array with 1-10 items'),
  body('symbols.*')
    .isString()
    .trim()
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Invalid symbol format'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object')
];

export const validateSymbol = [
  query('symbol')
    .optional()
    .isString()
    .trim()
    .matches(/^[A-Z0-9-]+$/)
    .withMessage('Invalid symbol format')
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};
