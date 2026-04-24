const CV = require('../models/CV');
const MatchResult = require('../models/MatchResult');
const { calculateMatchScore } = require('../services/scoreService');

exports.analyzeMatch = async (req, res, next) => {
    try {
        const { cvId, jobTitle, jobDescription } = req.body;

        if (!cvId || !jobTitle || !jobDescription) {
            return res.status(400).json({
                success: false,
                message: 'cvId, jobTitle, and jobDescription are required',
            });
        }

        const cv = await CV.findOne({
            _id: cvId,
            user: req.user.id,
        });

        if (!cv) {
            return res.status(404).json({
                success: false,
                message: 'CV not found',
            });
        }

        const result = calculateMatchScore({
            cvSkills: cv.parsedData.skills || [],
            jobDescription,
        });

        const matchResult = await MatchResult.create({
            user: req.user.id,
            cv: cv._id,
            jobTitle,
            jobDescription,
            score: result.score,
            matchedSkills: result.matchedSkills,
            missingSkills: result.missingSkills,
            recommendations: result.recommendations,
        });

        res.status(201).json({
            success: true,
            message: 'Job match analysis completed',
            data: {
                match: matchResult,
                requiredSkills: result.requiredSkills,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getMatchHistory = async (req, res, next) => {
    try {
        const history = await MatchResult.find({ user: req.user.id })
            .populate('cv', 'originalFileName fileUrl parsedData createdAt')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            results: history.length,
            data: history,
        });
    } catch (error) {
        next(error);
    }
};

exports.getMatchResult = async (req, res, next) => {
    try {
        const match = await MatchResult.findOne({
            _id: req.params.id,
            user: req.user.id,
        }).populate('cv', 'originalFileName fileUrl parsedData createdAt');

        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match result not found',
            });
        }

        res.status(200).json({
            success: true,
            data: match,
        });
    } catch (error) {
        next(error);
    }
};