const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = async (filePath) => {
    const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'raw',
        folder: 'matchwise-ai/cvs',
    });

    return result;
};

const deleteFromCloudinary = async (publicId) => {
    return cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
    });
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
};