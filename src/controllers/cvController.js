const { promises: fsPromises } = require('fs');
const CV = require('../models/CV');
const { extractText } = require('../services/universalTextExtractor');
const extractCvData = require('../services/extractCvData');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { generateCvAnalysis, generateTextSummary } = require('../services/aiService');

exports.uploadCV = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No CV file uploaded',
            });
        }

        const io = req.app.get('io');
        const userRoom = req.user.id.toString();

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'uploading',
                message: 'Uploading file to cloud storage...',
            });
        }

        const cloudinaryResult = await uploadToCloudinary(req.file.path);

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'parsing',
                message: 'Extracting text content from file...',
            });
        }

        let extractedText = '';
        let extractionQuality = 'good';
        let isScannedPdf = false;

        try {
            // Use universal text extractor for any file type
            const extraction = await extractText(
                req.file.path,
                req.file.mimetype,
                req.file.originalname
            );
            extractedText = extraction.text;

            // Check if this is a scanned PDF
            if (extractedText.includes('[SCANNED_PDF')) {
                isScannedPdf = true;
                extractionQuality = 'limited';
                console.warn('⚠️  Scanned PDF detected - limited text extraction');
            }

            // Flag if extraction had issues
            if (extraction.error) {
                console.warn(`Extraction warning: ${extraction.error}`);
                extractionQuality = 'limited';
            }

            console.log(`✓ Successfully extracted text: ${extractedText.length} characters (quality: ${extractionQuality})`);
        } catch (error) {
            console.error('Error extracting text:', error);
            return res.status(400).json({
                success: false,
                message: `Failed to extract text: ${error.message}`,
            });
        }

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'analyzing',
                message: 'Analyzing content and generating summary...',
            });
        }

        // Extract skills and data from the text
        const parsedData = extractCvData(extractedText);

        // Generate AI analysis
        let aiAnalysis = {
            summary: '',
            strengths: [],
            weaknesses: [],
            suggestions: [],
            recommendedRoles: [],
        };

        try {
            // For CV files, use detailed CV analysis
            if (req.file.originalname.toLowerCase().includes('cv') ||
                req.file.originalname.toLowerCase().includes('resume')) {
                aiAnalysis = await generateCvAnalysis(extractedText, parsedData.skills);
            } else {
                // For other documents, generate general summary
                const summary = await generateTextSummary(extractedText, 'document', {
                    skills: parsedData.skills,
                });
                aiAnalysis = {
                    summary: summary.summary,
                    strengths: summary.highlights || [],
                    weaknesses: [],
                    suggestions: summary.recommendations || [],
                    recommendedRoles: summary.topics || [],
                };
            }
        } catch (error) {
            console.error('AI analysis error:', error.message);

            // Check if it's a quota error
            if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
                console.warn('⚠️  Gemini API quota exceeded. Using basic analysis.');
                aiAnalysis.summary = `File processed: ${req.file.originalname}. ${parsedData.skills?.length ? `Skills detected: ${parsedData.skills.join(', ')}` : 'Content analysis available.'}`;
            } else if (extractionQuality === 'limited' || extractedText.includes('[') || extractedText.includes('Error')) {
                aiAnalysis.summary = `File processed: ${req.file.originalname}. ${parsedData.skills?.length ? `Detected skills: ${parsedData.skills.join(', ')}` : 'Limited text content available.'}`;
            } else {
                aiAnalysis.summary = parsedData.skills?.length
                    ? `Content detected with skills: ${parsedData.skills.join(', ')}`
                    : extractedText.slice(0, 250);
            }
        }

        // Ensure summary exists
        if (!aiAnalysis.summary || !aiAnalysis.summary.trim()) {
            aiAnalysis.summary = extractedText.slice(0, 300) + (extractedText.length > 300 ? '...' : '');
        }

        const cv = await CV.create({
            user: req.user.id,
            originalFileName: req.file.originalname,
            fileUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            resourceType: cloudinaryResult.resource_type,
            fileType: req.file.mimetype,
            extractedText,
            parsedData,
            aiAnalysis,
        });

        try {
            await fsPromises.unlink(req.file.path);
        } catch (cleanupError) {
            if (cleanupError.code !== 'ENOENT') {
                console.warn('Failed to delete temporary file after upload:', cleanupError);
            }
        }

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'completed',
                message: 'File uploaded and analyzed successfully',
            });
        }

        // Prepare appropriate message based on extraction quality
        let message = 'File uploaded and analyzed successfully';
        if (isScannedPdf) {
            message = 'Scanned PDF uploaded. Text extraction is limited. Consider re-uploading as a searchable PDF or using OCR software first.';
        } else if (extractionQuality === 'limited') {
            message = 'File uploaded with limited text extraction quality. AI analysis may be basic.';
        }

        res.status(201).json({
            success: true,
            message,
            data: {
                ...cv.toObject(),
                extractionQuality,
                isScannedPdf,
                textLength: extractedText.length,
            },
        });
    } catch (error) {
        if (req.file?.path) {
            try {
                await fsPromises.unlink(req.file.path);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.warn('Failed to delete temporary file after error:', cleanupError);
                }
            }
        }

        next(error);
    }
};

exports.getMyCVs = async (req, res, next) => {
    try {
        const cvs = await CV.find({ user: req.user.id })
            .select('-extractedText')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            results: cvs.length,
            data: cvs,
        });
    } catch (error) {
        next(error);
    }
};

exports.getCV = async (req, res, next) => {
    try {
        const cv = await CV.findOne({
            _id: req.params.id,
            user: req.user.id,
        });

        if (!cv) {
            return res.status(404).json({
                success: false,
                message: 'CV not found',
            });
        }

        res.status(200).json({
            success: true,
            data: cv,
        });
    } catch (error) {
        next(error);
    }
};