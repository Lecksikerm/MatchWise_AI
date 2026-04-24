const fs = require('fs');
const pdfParse = require('pdf-parse');

const parsePdf = async (filePath) => {
    try {
        console.log(`Starting PDF parsing for file: ${filePath}`);

        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);

        console.log(`PDF info: ${data.numpages} pages, ${data.text.length} characters extracted`);
        console.log(`Raw extracted text: "${data.text}"`);

        // Clean up the extracted text
        const cleanedText = data.text
            .replace(/\n+/g, ' ')  
            .replace(/\s+/g, ' ')  
            .trim();

        console.log(`Cleaned text length: ${cleanedText.length}`);
        console.log(`First 200 characters: "${cleanedText.substring(0, 200)}"`);

        return cleanedText;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
};

module.exports = parsePdf;