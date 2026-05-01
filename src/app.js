const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const cvRoutes = require('./routes/cvRoutes');
const matchRoutes = require('./routes/matchRoutes');

const app = express();

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
});

const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(helmet());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use(apiLimiter);

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MatchWise AI API is running',
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/match', matchRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(val => val.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors,
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        });
    }

    // Multer file upload errors
    if (err.name === 'MulterError') {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired',
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong!'
            : err.message,
    });
});

module.exports = app;