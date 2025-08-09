import Joi from 'joi';

// Password complexity requirements
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (@$!%*?&)'
  })
  .required();

// Username validation with alphanumeric and underscore only
const userNameSchema = Joi.string()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9_]+$/)
  .messages({
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 30 characters',
    'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
  })
  .required();

// Email validation with additional checks
const emailSchema = Joi.string()
  .email({ 
    minDomainSegments: 2,
    tlds: { allow: false } // Allow all TLDs
  })
  .lowercase()
  .max(254) // RFC 5321 limit
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email address is too long'
  })
  .required();

// Address validation
const addressSchema = Joi.string()
  .min(5)
  .max(200)
  .trim()
  .messages({
    'string.min': 'Address must be at least 5 characters long',
    'string.max': 'Address must not exceed 200 characters'
  })
  .optional();

// Registration schema
const registrationSchema = Joi.object({
  userName: userNameSchema,
  password: passwordSchema,
  email: emailSchema,
  address: addressSchema,
}).options({
  abortEarly: false,
  stripUnknown: true,
  presence: 'required'
});

// Login schema
const loginSchema = Joi.object({
  userName: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'any.required': 'Username is required',
      'string.empty': 'Username cannot be empty'
    }),
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'any.required': 'Password is required',
      'string.empty': 'Password cannot be empty'
    })
}).options({
  abortEarly: false,
  stripUnknown: true
});

// Profile update schema
const profileUpdateSchema = Joi.object({
  email: emailSchema.optional(),
  address: addressSchema
}).options({
  abortEarly: false,
  stripUnknown: true
});

// Password change schema
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: passwordSchema
}).options({
  abortEarly: false,
  stripUnknown: true
});

// LinkedIn credentials schema
const linkedinCredentialsSchema = Joi.object({
  email: emailSchema,
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'any.required': 'LinkedIn password is required',
      'string.empty': 'LinkedIn password cannot be empty'
    })
}).options({
  abortEarly: false,
  stripUnknown: true
});

export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors?: Joi.ValidationErrorItem[];
  sanitizedData?: T;
}

// Generic validation function
function validateData<T>(schema: Joi.ObjectSchema<T>, data: unknown): ValidationResult<T> {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
    allowUnknown: false
  });

  if (error) {
    return { 
      isValid: false, 
      errors: error.details,
      sanitizedData: value as T
    };
  }

  return { 
    isValid: true, 
    data: value as T,
    sanitizedData: value as T
  };
}

// Export specific validation functions
export const validateRegistration = (data: unknown) => validateData(registrationSchema, data);
export const validateLogin = (data: unknown) => validateData(loginSchema, data);
export const validateProfileUpdate = (data: unknown) => validateData(profileUpdateSchema, data);
export const validatePasswordChange = (data: unknown) => validateData(passwordChangeSchema, data);
export const validateLinkedInCredentials = (data: unknown) => validateData(linkedinCredentialsSchema, data);

// Backward compatibility - default export
export default function userValidation(request: { body: Record<string, unknown> }): ValidationResult {
  return validateRegistration(request.body);
}

// Input sanitization helpers
export const sanitizers = {
  // Remove potentially dangerous HTML/script tags
  sanitizeString: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },
  
  // Normalize email
  normalizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },
  
  // Sanitize username
  sanitizeUsername: (username: string): string => {
    return username.replace(/[^a-zA-Z0-9_]/g, '').trim();
  }
};