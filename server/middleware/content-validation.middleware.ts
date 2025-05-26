
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

interface ContentValidationOptions {
  maxLength?: number;
  allowedTags?: string[];
  requireModeration?: boolean;
  enableProfanityFilter?: boolean;
}

class ContentValidator {
  private profanityWords = [
    // Add your profanity list here
    'spam', 'scam', 'phishing'
  ];

  private suspiciousPatterns = [
    /(?:http[s]?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g, // URLs
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email addresses
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card patterns
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g // SSN patterns
  ];

  sanitizeHtml(content: string, options: ContentValidationOptions = {}): string {
    const allowedTags = options.allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'blockquote'
    ];

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href', 'title', 'target'],
      FORBID_SCRIPT: true,
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe']
    });
  }

  sanitizeText(text: string): string {
    if (typeof text !== 'string') return '';
    
    // Remove potentially dangerous characters
    let sanitized = text.replace(/[<>\"'&]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  validateLength(content: string, maxLength: number = 10000): boolean {
    return content.length <= maxLength;
  }

  checkProfanity(content: string): { hasProfanity: boolean; words: string[] } {
    const foundWords: string[] = [];
    const lowerContent = content.toLowerCase();

    this.profanityWords.forEach(word => {
      if (lowerContent.includes(word.toLowerCase())) {
        foundWords.push(word);
      }
    });

    return {
      hasProfanity: foundWords.length > 0,
      words: foundWords
    };
  }

  detectSuspiciousContent(content: string): { suspicious: boolean; patterns: string[] } {
    const foundPatterns: string[] = [];

    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(content)) {
        foundPatterns.push(`Pattern ${index + 1}`);
      }
    });

    return {
      suspicious: foundPatterns.length > 0,
      patterns: foundPatterns
    };
  }

  validateResearchQuery(query: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!query || query.trim().length === 0) {
      errors.push('Query cannot be empty');
    }

    if (query.length < 3) {
      errors.push('Query must be at least 3 characters long');
    }

    if (query.length > 1000) {
      errors.push('Query must be less than 1000 characters');
    }

    // Check for malicious patterns
    const maliciousPatterns = [
      /\bUNION\b.*\bSELECT\b/i,
      /\bDROP\b.*\bTABLE\b/i,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i
    ];

    maliciousPatterns.forEach(pattern => {
      if (pattern.test(query)) {
        errors.push('Query contains potentially malicious content');
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  moderateContent(content: string, options: ContentValidationOptions = {}) {
    const results = {
      original: content,
      sanitized: '',
      valid: true,
      warnings: [] as string[],
      errors: [] as string[]
    };

    // Length validation
    if (options.maxLength && !this.validateLength(content, options.maxLength)) {
      results.errors.push(`Content exceeds maximum length of ${options.maxLength} characters`);
      results.valid = false;
    }

    // Sanitize content
    results.sanitized = this.sanitizeText(content);

    // Profanity check
    if (options.enableProfanityFilter) {
      const profanityCheck = this.checkProfanity(content);
      if (profanityCheck.hasProfanity) {
        results.warnings.push(`Potentially inappropriate language detected: ${profanityCheck.words.join(', ')}`);
      }
    }

    // Suspicious content detection
    const suspiciousCheck = this.detectSuspiciousContent(content);
    if (suspiciousCheck.suspicious) {
      results.warnings.push(`Suspicious patterns detected: ${suspiciousCheck.patterns.join(', ')}`);
    }

    return results;
  }
}

const contentValidator = new ContentValidator();

export const validateContent = (options: ContentValidationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { body } = req;

    // Validate different types of content
    if (body.content) {
      const validation = contentValidator.moderateContent(body.content, options);
      
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Content validation failed',
          details: validation.errors,
          warnings: validation.warnings
        });
      }

      // Replace original content with sanitized version
      body.content = validation.sanitized;
      
      // Add warnings to request for logging
      (req as any).contentWarnings = validation.warnings;
    }

    if (body.research_question || body.query) {
      const query = body.research_question || body.query;
      const queryValidation = contentValidator.validateResearchQuery(query);
      
      if (!queryValidation.valid) {
        return res.status(400).json({
          error: 'Research query validation failed',
          details: queryValidation.errors
        });
      }

      // Sanitize the query
      const sanitizedQuery = contentValidator.sanitizeText(query);
      if (body.research_question) {
        body.research_question = sanitizedQuery;
      }
      if (body.query) {
        body.query = sanitizedQuery;
      }
    }

    next();
  };
};

export const sanitizeUserInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return contentValidator.sanitizeText(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize body, query, and params
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

export { contentValidator };
