const Joi = require('joi');

const schema = Joi.object().keys({
    UserName: Joi.string().min(3).max(30).required(),
    Password: Joi.string().min(6).max(50),
    Email: Joi.string().email().required(),
    Address: Joi.string().min(3).max(100),
});

function userValidation(request) {
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

module.exports = userValidation;