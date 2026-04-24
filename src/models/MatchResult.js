const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        cv: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CV',
            required: true,
        },
        jobTitle: {
            type: String,
            required: true,
        },
        jobDescription: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
        },
        matchedSkills: [String],
        missingSkills: [String],
        recommendations: [String],
        aiAdvice: {
            matchSummary: {
                type: String,
                default: '',
            },
            strengthsForRole: [String],
            missingSkillsAdvice: [String],
            cvImprovementTips: [String],
            applicationAdvice: {
                type: String,
                default: '',
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('MatchResult', matchResultSchema);