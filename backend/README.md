# BizSaathi Backend (Phase 1)

This is the production-ready NestJS backend for BizSaathi, implementing Auth + Foundation services.

## Tech Stack
- NestJS 10 (TypeScript Strict)
- Prisma (PostgreSQL)
- Redis (ioredis)
- JWT + OTP Auth
- Docker + Kong API Gateway

## Prerequisites
- Node.js 20 LTS
- Docker & Docker Compose

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and fill in necessary secrets (JWT secrets, MSG91 configs, etc).
   ```bash
   cp .env.example .env
   ```

3. **Start local infrastructure (Postgres, Redis, Kong):**
   ```bash
   docker-compose up -d postgres redis kong
   ```

4. **Run database migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start backend development server:**
   ```bash
   npm run start:dev
   ```
   *(Alternatively, run everything via `docker-compose up -d` for full containerization)*

## API Endpoints Overview
All API routes are prefixed with `/api/v1` (e.g., `/api/v1/auth/otp/send`).

See full Swagger documentation by running the app and visiting:
`http://localhost:3001/api/docs`

## Available Scripts
- `npm run start:dev` - Run hot-reloading dev server
- `npm run build` - Compile for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run Jest tests
