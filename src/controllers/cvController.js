const fs = require('fs');
const CV = require('../models/CV');
const parsePdf = require('../services/parsePdf');
const parseDocx = require('../services/parseDocx');
const extractCvData = require('../services/extractCvData');
const { uploadToCloudinary } = require('../services/cloudinaryService');

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
                message: 'Uploading CV to cloud storage...',
            });
        }

        const cloudinaryResult = await uploadToCloudinary(req.file.path);

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'parsing',
                message: 'Extracting CV content...',
            });
        }

        let extractedText = '';

        try {
            if (req.file.mimetype === 'application/pdf') {
                // Update status for PDF processing
                if (io) {
                    io.to(userRoom).emit('cv:status', {
                        step: 'parsing',
                        message: 'Extracting CV content (may take longer for complex PDFs)...',
                    });
                }
                extractedText = await parsePdf(req.file.path);
            } else {
                extractedText = await parseDocx(req.file.path);
            }
        } catch (error) {
            console.error('Error extracting text from CV:', error);
            return res.status(400).json({
                success: false,
                message: 'Failed to extract text from CV. The file may be corrupted, password-protected, or in an unsupported format.',
            });
        }

        // Check if we have meaningful text content
        // For scanned PDFs, we might get very little or no text
        const meaningfulText = extractedText.trim();
        console.log(`Raw extracted text length: ${extractedText.length}`);
        console.log(`Trimmed text length: ${meaningfulText.length}`);
        console.log(`First 200 chars: "${meaningfulText.substring(0, 200)}"`);

        // If we extracted some meaningful text, great!
        // If not, we'll still allow the upload but warn the user
        if (!meaningfulText || meaningfulText.length < 5) {
            console.log(`Warning: Extracted text too short (${meaningfulText.length} characters). This might be a scanned PDF.`);

            // For now, let's allow the upload anyway and store what we have
            // The user can decide how to handle scanned PDFs later
            if (meaningfulText.length === 0) {
                extractedText = "This appears to be a scanned PDF. Text extraction was not possible.";
            }
        }

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'analyzing',
                message: 'Analyzing CV skills and structure...',
            });
        }

        const parsedData = extractCvData(extractedText);

        const cv = await CV.create({
            user: req.user.id,
            originalFileName: req.file.originalname,
            fileUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            resourceType: cloudinaryResult.resource_type,
            fileType: req.file.mimetype,
            extractedText,
            parsedData,
        });

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (io) {
            io.to(userRoom).emit('cv:status', {
                step: 'completed',
                message: 'CV uploaded and analyzed successfully',
            });
        }

        // Check if this appears to be a scanned PDF
        const isScannedPdf = extractedText.includes("This appears to be a scanned PDF");

        res.status(201).json({
            success: true,
            message: isScannedPdf
                ? 'CV uploaded successfully. Note: This appears to be a scanned PDF. Text extraction was limited.'
                : 'CV uploaded and analyzed successfully',
            data: {
                ...cv.toObject(),
                isScannedPdf,
                textExtractionQuality: isScannedPdf ? 'limited' : 'good'
            },
        });
    } catch (error) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
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