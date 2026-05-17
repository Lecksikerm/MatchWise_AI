# MatchWise AI Backend

This backend powers the MatchWise AI application. It provides authentication, file upload and parsing, AI-powered resume summarization, and job matching via a REST API.

## Features

- Register, login, and authenticated endpoints
- Upload CV files in PDF, DOCX, TXT, and image formats
- Universal text extraction with AI summarization fallback
- Job description matching with scoring and advice
- Rate limiting, security headers, centralized error handling, and cluster-ready startup

## Environment variables

Create a `.env` file in `backend/` with the following variables:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret used for signing JWT tokens
- `FRONTEND_URL` - Allowed frontend origin(s) for CORS. Use a comma-separated list if needed, for example `http://localhost:5173,http://127.0.0.1:5173`
- `GEMINI_API_KEY` - AI provider API key
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `REDIS_URL` - Optional Redis connection string for Socket.IO adapter across cluster workers
- `WORKERS` - Optional number of Node worker processes (defaults to CPU count)
- `MONGO_POOL_SIZE` - Optional MongoDB connection pool size (default: 10)

## Run locally

Install dependencies:

```bash
cd backend
npm install
```

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Cluster-ready production mode:

```bash
npm run start:cluster
```

If using PM2, start with the ecosystem config:

```bash
cd backend
pm install pm2 -g
pm run start:cluster
```

## Scripts

- `npm run dev` - start the backend with `nodemon`
- `npm start` - start the backend in single-process mode
- `npm run start:cluster` - run backend with cluster-aware startup
- `npm run lint` - run ESLint checks
- `npm run format` - format code with Prettier

## CI/CD

This repository now includes GitHub Actions automation in `.github/workflows/ci.yml`.
The workflow installs dependencies and runs lint/build checks for both backend and frontend.

## API endpoints

- `POST /api/auth/register` - create a new user
- `POST /api/auth/login` - login and receive JWT
- `GET /api/auth/me` - get authenticated user info
- `POST /api/cv/upload` - upload a CV file and extract data
- `POST /api/match/analyze` - match uploaded CV to job description

## Notes

- The backend validates required environment variables before starting.
- File uploads are handled by `multer` and parsed by universal extraction services.
- Socket.IO can scale across workers when `REDIS_URL` is configured.
