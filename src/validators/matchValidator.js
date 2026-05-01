const Joi = require('joi');

const analyzeMatchSchema = Joi.object({
    cvId: Joi.string().trim().length(24).hex().required(),
    jobTitle: Joi.string().trim().min(3).max(120).required(),
    jobDescription: Joi.string().trim().min(20).required(),
});

module.exports = {
    analyzeMatchSchema,
};
