
// validators/custom.validators.ts
import { CustomValidator } from '../../types/validation.types';
import { VALIDATION_PATTERNS } from '../constants/validation.constants';

export const customValidators: Record<string, CustomValidator> = {
  isValidSymbol: {
    name: 'isValidSymbol',
    validator: (value: string) => {
      if (!value) return false;
      return VALIDATION_PATTERNS.SYMBOL.test(value.toUpperCase());
    },
    message: 'Invalid symbol format. Use uppercase letters, numbers, and hyphens only'
  },

  isValidCurrencyPair: {
    name: 'isValidCurrencyPair',
    validator: (value: string) => {
      if (!value) return false;
      return VALIDATION_PATTERNS.CURRENCY_PAIR.test(value.toUpperCase());
    },
    message: 'Invalid currency pair format. Use format like EUR/USD'
  },

  isValidDateRange: {
    name: 'isValidDateRange',
    validator: (value: { start: string; end: string }) => {
      if (!value?.start || !value?.end) return false;
      const start = new Date(value.start);
      const end = new Date(value.end);
      return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime());
    },
    message: 'Invalid date range. End date must be after start date'
  },

  isUniqueArray: {
    name: 'isUniqueArray',
    validator: (value: any[]) => {
      if (!Array.isArray(value)) return false;
      return new Set(value).size === value.length;
    },
    message: 'Array must contain unique values'
  },

  isValidTimeframe: {
    name: 'isValidTimeframe',
    validator: (value: string) => {
      const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'];
      return validTimeframes.includes(value);
    },
    message: (value) => `Invalid timeframe "${value}". Valid options: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M`
  }
};
