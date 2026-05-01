const requiredVariables = [
    'MONGO_URI',
    'JWT_SECRET',
    'FRONTEND_URL',
    'GEMINI_API_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
    console.error('Missing required environment variables:', missingVariables.join(', '));
    process.exit(1);
}

module.exports = {
    validateEnv: () => { },
};
