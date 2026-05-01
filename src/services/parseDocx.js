const mammoth = require('mammoth');

const parseDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });

  return result.value
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = parseDocx;