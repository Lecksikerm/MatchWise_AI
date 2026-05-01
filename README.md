# MatchWise AI Backend

This backend powers the MatchWise AI application. It provides authentication, CV upload and parsing, and job matching via a REST API.

## Features

- Register, login, and authenticated endpoints
- Upload CV files in PDF or DOCX format
- Extract skills and text from resumes
- Analyze job descriptions against uploaded CVs
- Rate limiting, security headers, and centralized error handling

## Environment variables

Create a `.env` file in `backend/` with the following variables:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret used for signing JWT tokens
- `FRONTEND_URL` - Allowed frontend origin(s) for CORS. Use a comma-separated list if needed, for example `http://localhost:5173,http://127.0.0.1:5173`
- `GEMINI_API_KEY` - AI provider API key
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Run locally

Install dependencies:

```bash
cd backend
npm install
```

Start the server in development mode:

```bash
npm run dev
```

Production start:

```bash
npm start
```

## API endpoints

- `GET /api/auth` - auth routes
- `POST /api/auth/register` - create a new user
- `POST /api/auth/login` - login and receive JWT
- `GET /api/auth/me` - get authenticated user info
- `POST /api/cv/upload` - upload CV file and extract data
- `POST /api/match/analyze` - match uploaded CV to job description

## Notes

- The backend validates required environment variables before starting.
- File uploads are handled with `multer`, and parsed via internal services.
