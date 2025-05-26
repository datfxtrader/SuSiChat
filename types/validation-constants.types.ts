
// types/validation-constants.types.ts
export interface ValidationPattern {
  pattern: RegExp;
  message: string;
  examples?: string[];
  flags?: string;
}

export interface ValidationLimit {
  min: number;
  max: number;
  message?: string;
  strict?: boolean;
}

export interface ValidationError {
  code: string;
  message: string;
  httpStatus?: number;
  severity?: 'error' | 'warning' | 'info';
}
