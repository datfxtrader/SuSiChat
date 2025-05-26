
// types/validation.types.ts
export interface ValidationError {
  field: string;
  value: any;
  message: string;
  code: string;
  location?: 'body' | 'query' | 'params' | 'headers';
}

export interface ValidationResponse {
  success: false;
  error: string;
  code: string;
  details: ValidationError[];
  timestamp: string;
}

export interface ValidationRule {
  field: string;
  rules: any[];
  optional?: boolean;
  sanitizers?: any[];
}

export interface CustomValidator {
  name: string;
  validator: (value: any, { req }: { req: Request }) => boolean | Promise<boolean>;
  message: string | ((value: any) => string);
}
