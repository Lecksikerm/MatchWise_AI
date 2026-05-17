require('dotenv').config();
require('./config/validateEnv');

const cluster = require('cluster');
const os = require('os');
const http = require('http');
const mongoose = require('mongoose');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { Server } = require('socket.io');
const app = require('./app');

const PORT = Number(process.env.PORT) || 5000;
const REDIS_URL = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === 'production';


const WORKERS =
    Number(process.env.WORKERS) ||
    (isProduction ? 1 : os.cpus().length);

const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

async function connectRedisAdapter(io) {
    if (!REDIS_URL) {
        if (WORKERS > 1) {
            console.warn(
                'Multiple workers enabled without REDIS_URL. Socket.IO events may not sync across workers.'
            );
        }
        return;
    }

    try {
        const pubClient = createClient({ url: REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([
            pubClient.connect(),
            subClient.connect(),
        ]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter connected.');
    } catch (error) {
        console.error('Redis adapter connection failed:', error.message);
    }
}

async function connectMongo() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing in environment variables');
    }

    mongoose.set('strictQuery', true);

    await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
    });

    console.log('MongoDB connected successfully');
}

async function startWorker() {
    await connectMongo();

    const server = http.createServer(app);

    server.setTimeout(
        Number(process.env.SERVER_TIMEOUT_MS) || 120000
    );
    server.keepAliveTimeout =
        Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65000;

    const io = new Server(server, {
        cors: {
            origin(origin, callback) {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(
                    new Error(
                        `CORS policy: origin ${origin} is not allowed.`
                    )
                );
            },
            credentials: true,
        },
    });

    await connectRedisAdapter(io);

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    app.set('io', io);

    server.listen(PORT, '0.0.0.0', () => {
        console.log(
            `Worker ${process.pid} listening on port ${PORT}`
        );
    });

    server.on('error', (error) => {
        console.error('Server error:', error);

        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} already in use.`);
        }

        process.exit(1);
    });
}


if (cluster.isPrimary && WORKERS > 1) {
    console.log(`Primary process ${process.pid} is running`);
    console.log(`Forking ${WORKERS} workers...`);

    for (let i = 0; i < WORKERS; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.error(
            `Worker ${worker.process.pid} died (code: ${code}, signal: ${signal})`
        );

        // restart only in production
        if (isProduction) {
            console.log('Restarting worker...');
            cluster.fork();
        }
    });
} else {
    startWorker().catch((error) => {
        console.error('Startup error:', error);
        process.exit(1);
    });
}

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});