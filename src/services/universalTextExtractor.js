const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

/**
 * Extract text from plain text files
 */
const extractFromTxt = async (filePath) => {
    try {
        const text = fs.readFileSync(filePath, 'utf-8');
        return cleanText(text);
    } catch (error) {
        throw new Error(`Failed to extract text from TXT: ${error.message}`);
    }
};

/**
 * Extract text from PDF files
 * Note: Scanned PDFs will return minimal text. Convert to images first for OCR.
 */
const extractFromPdf = async (filePath) => {
    try {
        console.log(`Parsing PDF: ${filePath}`);
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        console.log(`PDF: ${data.numpages} pages, ${data.text.length} chars extracted`);

        const extractedText = cleanText(data.text);

        // If PDF extracted very little text, it's likely a scanned PDF
        if (extractedText.length < 10) {
            console.warn(`⚠️  Scanned PDF detected: Only ${extractedText.length} chars extracted`);
            console.warn('Scanned PDFs require image-to-text conversion. Returning metadata instead.');
            // Return a message indicating this is a scanned PDF
            return `[SCANNED_PDF - ${data.numpages} pages detected] This PDF appears to be image-based (scanned). Text extraction is limited. Please consider: 1) Re-uploading as a searchable PDF, 2) Using OCR software before uploading, or 3) Providing document details manually.`;
        }

        return extractedText;
    } catch (error) {
        console.error(`PDF extraction error: ${error.message}`);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

/**
 * Extract text from DOCX/DOC files
 */
const extractFromDocx = async (filePath) => {
    try {
        console.log(`Parsing DOCX: ${filePath}`);
        const result = await mammoth.extractRawText({ path: filePath });
        return cleanText(result.value);
    } catch (error) {
        throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
};

/**
 * Extract text from images using OCR (Tesseract.js)
 * Only works with actual image files (JPG, PNG, GIF, BMP, WEBP, TIFF)
 */
const extractFromImage = async (filePath) => {
    try {
        console.log(`Running OCR on image: ${filePath}`);

        // Validate that this is actually an image file
        const ext = path.extname(filePath).toLowerCase();
        const validImageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif'];
        if (!validImageExts.includes(ext)) {
            throw new Error(`File extension ${ext} is not a valid image format for OCR`);
        }

        const { data: { text } } = await Tesseract.recognize(
            filePath,
            'eng',
            {
                logger: (m) => {
                    if (m.progress && m.progress > 0 && m.progress < 1) {
                        console.log(`OCR Progress: ${(m.progress * 100).toFixed(2)}%`);
                    }
                },
            }
        );
        console.log(`✓ OCR extracted ${text.length} characters`);

        // For OCR, even minimal text is valuable
        const cleaned = cleanText(text);
        if (!cleaned || cleaned.length < 1) {
            console.warn('⚠️  OCR: No text found in image');
            return '[Image processed via OCR but contains no readable text]';
        }
        return cleaned;
    } catch (error) {
        console.warn(`⚠️  OCR error: ${error.message}`);
        // Fallback for OCR errors
        return `[Image uploaded but OCR failed: ${error.message}]`;
    }
};

/**
 * Extract text from HTML/XML files
 */
const extractFromHtml = async (filePath) => {
    try {
        console.log(`Extracting text from HTML: ${filePath}`);
        let html = fs.readFileSync(filePath, 'utf-8');

        // Remove script and style tags
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Remove HTML tags
        let text = html.replace(/<[^>]*>/g, ' ');

        // Decode HTML entities
        text = text
            .replace(/&nbsp;/g, ' ')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');

        return cleanText(text);
    } catch (error) {
        throw new Error(`Failed to extract text from HTML: ${error.message}`);
    }
};

/**
 * Clean and normalize extracted text
 */
const cleanText = (text) => {
    return String(text || '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Universal text extractor - works with any supported file type
 */
const extractText = async (filePath, mimeType, originalName) => {
    try {
        const ext = path.extname(originalName).toLowerCase();
        let extractedText = '';

        console.log(`\n=== Universal Text Extraction ===`);
        console.log(`File: ${originalName}`);
        console.log(`MIME Type: ${mimeType}`);
        console.log(`Extension: ${ext}`);

        // PDF
        if (mimeType === 'application/pdf' || ext === '.pdf') {
            extractedText = await extractFromPdf(filePath);
        }
        // Word documents
        else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword' ||
            ext === '.docx' ||
            ext === '.doc'
        ) {
            extractedText = await extractFromDocx(filePath);
        }
        // Plain text
        else if (mimeType === 'text/plain' || ext === '.txt') {
            extractedText = await extractFromTxt(filePath);
        }
        // HTML/XML
        else if (
            mimeType === 'text/html' ||
            mimeType === 'application/xml' ||
            mimeType === 'text/xml' ||
            ext === '.html' ||
            ext === '.htm' ||
            ext === '.xml'
        ) {
            extractedText = await extractFromHtml(filePath);
        }
        // Images (with OCR)
        else if (
            mimeType.startsWith('image/') ||
            ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'].includes(ext)
        ) {
            extractedText = await extractFromImage(filePath);
        }
        else {
            throw new Error(
                `Unsupported file type: ${mimeType || 'unknown'}. Supported formats: PDF, DOCX, DOC, TXT, HTML, XML, Images (JPG, PNG, GIF, BMP, WEBP, TIFF)`
            );
        }

        // Validate extraction - be more lenient to handle edge cases
        if (!extractedText) {
            console.warn('Warning: Extraction returned null or undefined');
            extractedText = '[File uploaded but no text could be extracted]';
        } else if (extractedText.trim().length === 0) {
            console.warn('Warning: Extraction returned empty string');
            extractedText = '[File uploaded but appears to be empty or contains only formatting]';
        }

        console.log(`✓ Extraction completed: ${extractedText.length} characters`);
        console.log(`Preview: "${extractedText.substring(0, 100)}${extractedText.length > 100 ? '...' : ''}"`);

        return {
            text: extractedText,
            length: extractedText.length,
            preview: extractedText.substring(0, 150),
        };
    } catch (error) {
        console.error('Text extraction error:', error.message);
        // Instead of throwing, return a fallback with the original file info
        return {
            text: `[Error extracting text: ${error.message}. File was uploaded but text extraction failed.]`,
            length: 50,
            preview: `[Error: ${error.message}]`,
            error: error.message,
        };
    }
};

module.exports = {
    extractText,
    cleanText,
    extractFromPdf,
    extractFromDocx,
    extractFromTxt,
    extractFromImage,
    extractFromHtml,
};
