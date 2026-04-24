const mongoose = require('mongoose');

const cvSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        originalFileName: {
            type: String,
            required: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        publicId: {
            type: String,
            required: true,
        },
        resourceType: {
            type: String,
            default: 'raw',
        },
        fileType: {
            type: String,
            required: true,
        },
        extractedText: {
            type: String,
            required: true,
        },
        parsedData: {
            skills: [String],
            education: [String],
            experience: [String],
            certifications: [String],
            tools: [String],
        },
        aiAnalysis: {
            summary: {
                type: String,
                default: '',
            },
            strengths: [String],
            weaknesses: [String],
            suggestions: [String],
            recommendedRoles: [String],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('CV', cvSchema);