require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { Server } = require('socket.io');
require('./config/validateEnv');

const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS policy: origin ${origin} is not allowed.`));
            }
        },
        credentials: true,
    },
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.set('io', io);

mongoose.set('strictQuery', true);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected successfully');

        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use.`);
            } else {
                console.error('Server error:', error);
            }
            process.exit(1);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    });

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});