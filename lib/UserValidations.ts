import Joi from 'joi';

const schema = Joi.object().keys({
    userName: Joi.string().min(3).max(30).required(),
    password: Joi.string().min(6).max(50).required(),
    email: Joi.string().email().required(),
    address: Joi.string().min(3).max(100),
});

export default function userValidation(request: { body: Record<string, unknown> }) {
    const { error, value } = schema.validate(request.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        console.log('Validation errors:', error.details.map(detail => detail.message));
        return { isValid: false, errors: error.details };
    }

    return { isValid: true, data: value };
}