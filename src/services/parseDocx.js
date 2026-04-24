const mammoth = require('mammoth');

const parseDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
};

module.exports = parseDocx;