require('dotenv').config();
const cluster = require('cluster');
const os = require('os');
const http = require('http');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const app = require('./app');
require('./config/validateEnv');

const PORT = process.env.PORT || 5000;
const WORKERS = Number(process.env.WORKERS) || os.cpus().length || 1;
const REDIS_URL = process.env.REDIS_URL;

const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const startWorker = async () => {
    const server = http.createServer(app);
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

    if (REDIS_URL) {
        try {
            const pubClient = createClient({ url: REDIS_URL });
            const subClient = pubClient.duplicate();

            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            console.log('Socket.IO Redis adapter connected.');
        } catch (error) {
            console.error('Failed to connect Redis adapter for Socket.IO:', error);
        }
    } else if (WORKERS > 1) {
        console.warn('Multiple worker processes are enabled, but REDIS_URL is not set. Socket.IO events may not work across workers.');
    }

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    app.set('io', io);

    mongoose.set('strictQuery', true);

    await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
    });

    console.log('MongoDB connected successfully');

    server.listen(PORT, () => {
        console.log(`Worker ${process.pid} listening on port ${PORT}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use.`);
        } else {
            console.error('Server error:', error);
        }
        process.exit(1);
    });
};

if (cluster.isPrimary && WORKERS > 1) {
    console.log(`Primary process ${process.pid} is running`);
    console.log(`Forking ${WORKERS} workers...`);

    for (let i = 0; i < WORKERS; i += 1) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.error(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}. Restarting...`);
        cluster.fork();
    });
} else {
    startWorker().catch((error) => {
        console.error('Startup error:', error);
        process.exit(1);
    });
}

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});