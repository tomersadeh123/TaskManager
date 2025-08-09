import Joi from 'joi';
import { NextRequest } from 'next/server';

export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  convert?: boolean;
}

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors?: string[];
  sanitizedData?: T;
}

// Base validation schemas
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

const pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'title').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

const search = Joi.object({
  query: Joi.string().trim().max(100).optional(),
  filters: Joi.object().optional()
});

const dateRange = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
});

const task = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(1000).optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  dueDate: Joi.date().iso().min('now').optional(),
  status: Joi.string().valid('todo', 'in_progress', 'completed', 'archived').default('todo'),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional()
});

const chore = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(500).optional(),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').required(),
  assignedTo: objectId.optional(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  estimatedTime: Joi.number().integer().min(1).max(480).optional(), // in minutes
  dueDate: Joi.date().iso().optional()
});

// Common validation schemas
export const commonSchemas = {
  objectId,
  pagination,
  search,
  dateRange,
  task,
  chore,
  
  bill: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    amount: Joi.number().precision(2).positive().required(),
    dueDate: Joi.date().iso().min('now').required(),
    category: Joi.string().valid('utilities', 'rent', 'groceries', 'insurance', 'other').required(),
    description: Joi.string().trim().max(500).optional(),
    recurring: Joi.boolean().default(false),
    recurringFrequency: Joi.when('recurring', {
      is: true,
      then: Joi.string().valid('monthly', 'quarterly', 'yearly').required(),
      otherwise: Joi.optional()
    })
  }),
  
  jobPreferences: Joi.object({
    keywords: Joi.array().items(
      Joi.string().trim().min(2).max(50)
    ).min(1).max(20).required(),
    locations: Joi.array().items(
      Joi.string().trim().min(2).max(100)
    ).max(10).optional(),
    salaryRange: Joi.object({
      min: Joi.number().integer().min(0).optional(),
      max: Joi.number().integer().min(Joi.ref('min')).optional()
    }).optional(),
    jobTypes: Joi.array().items(
      Joi.string().valid('full-time', 'part-time', 'contract', 'internship')
    ).max(4).optional(),
    experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').optional()
  })
};

// Validation helper class
export class RequestValidator {
  /**
   * Validate request body against a Joi schema
   */
  static async validateBody<T>(
    request: NextRequest, 
    schema: Joi.ObjectSchema<T>,
    options: ValidationOptions = {}
  ): Promise<ValidationResult<T>> {
    try {
      const body = await request.json();
      return this.validateData(schema, body, options);
    } catch {
      return {
        isValid: false,
        errors: ['Invalid JSON in request body']
      };
    }
  }
  
  /**
   * Validate query parameters against a Joi schema
   */
  static validateQuery<T>(
    request: NextRequest,
    schema: Joi.ObjectSchema<T>,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    const { searchParams } = request.nextUrl;
    const query: Record<string, string | string[]> = {};
    
    // Convert URLSearchParams to object
    searchParams.forEach((value, key) => {
      if (query[key]) {
        // Handle multiple values for same key
        if (Array.isArray(query[key])) {
          (query[key] as string[]).push(value);
        } else {
          query[key] = [query[key] as string, value];
        }
      } else {
        query[key] = value;
      }
    });
    
    return this.validateData(schema, query, options);
  }
  
  /**
   * Validate path parameters
   */
  static validateParams<T>(
    params: Record<string, string | string[]>,
    schema: Joi.ObjectSchema<T>,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    return this.validateData(schema, params, options);
  }
  
  /**
   * Generic data validation
   */
  static validateData<T>(
    schema: Joi.ObjectSchema<T>,
    data: unknown,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    const defaultOptions = {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
      convert: true,
      ...options
    };
    
    const { error, value } = schema.validate(data, defaultOptions);
    
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message),
        sanitizedData: value as T
      };
    }
    
    return {
      isValid: true,
      data: value as T,
      sanitizedData: value as T
    };
  }
  
  /**
   * Validate file upload constraints
   */
  static validateFile(
    file: File | null,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      required?: boolean;
    } = {}
  ): ValidationResult<File> {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = [], required = false } = options;
    
    if (!file) {
      if (required) {
        return { isValid: false, errors: ['File is required'] };
      }
      return { isValid: true };
    }
    
    const errors: string[] = [];
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
    }
    
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    return { isValid: true, data: file };
  }
}

// Content Security Policy validation
export const cspValidation = {
  // Validate that content doesn't contain potentially dangerous elements
  validateContent: (content: string): boolean => {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // onclick, onload, etc.
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(content));
  },
  
  // Sanitize HTML content
  sanitizeHtml: (html: string): string => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^>]*>/gi, '')
      .replace(/<object\b[^>]*>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '');
  }
};

// Export convenience functions
export const validate = RequestValidator.validateData;
export const validateObjectId = (id: string) => RequestValidator.validateData(
  Joi.object({ id: commonSchemas.objectId }), 
  { id }
);