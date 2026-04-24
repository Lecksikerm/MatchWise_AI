const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const cvRoutes = require('./routes/cvRoutes');
const matchRoutes = require('./routes/matchRoutes');


const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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

module.exports = app;