const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = path.join(__dirname, '../../tmp');

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        // Document files
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/html',
        'application/xml',
        'text/xml',

        // Image files (for OCR)
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'image/tiff',
    ];

    const allowedExtensions = [
        '.pdf',
        '.doc',
        '.docx',
        '.txt',
        '.html',
        '.htm',
        '.xml',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.webp',
        '.tiff',
        '.tif',
    ];

    const fileExtension = require('path').extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype || fileExtension}. Allowed: PDF, Word docs, TXT, HTML, Images (JPG, PNG, GIF, BMP, WEBP, TIFF), XML`));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

module.exports = upload;