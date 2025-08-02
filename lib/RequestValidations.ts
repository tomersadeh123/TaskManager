import Joi from 'joi';

const schema = Joi.object().keys({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(3).max(500),
    status: Joi.string().min(3).max(30),
});

function validation(request: { body: any }) {
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


export default validation;