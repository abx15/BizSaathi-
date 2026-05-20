# Railway Deployment Guide for BizSaathi

This guide outlines how to deploy the BizSaathi NestJS API backend and standalone Worker Service to [Railway.app](https://railway.app).

## Architecture Setup

BizSaathi consists of two main services deployed on Railway:
1. **Core API (Backend)**: Processes incoming HTTP requests, WebSocket updates, and enqueues background jobs.
2. **Worker Service**: Standalone background Node process that dequeues jobs and processes them (PDF, WhatsApp, Email, Cleanup, etc.).

We use Railway's provisioned addons for databases:
* **PostgreSQL Addon**: Primary relational database.
* **Redis Addon**: BullMQ job state storage and pub/sub broker.

---

## 1. Environment Variables Configuration

Ensure the following variables are configured in the Railway dashboard for the **Core API (Backend)**:

| Environment Variable | Recommended Value / Details |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3001` (Or let Railway assign via `${{PORT}}`) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (Injected automatically by Railway Postgres addon) |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` (Injected automatically by Railway Redis addon) |
| `JWT_SECRET` | A cryptographically secure random string (e.g. `openssl rand -base64 32`) |
| `SENTRY_DSN` | Your Sentry project DSN for production logging |
| `API_PREFIX` | `v1` |

And for the **Worker Service**:

| Environment Variable | Recommended Value / Details |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `SENTRY_DSN` | Your Sentry project DSN |

---

## 2. Steps to Deploy

### Option A: Via Railway CLI (Recommended)
1. Install the Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```
2. Authenticate:
   ```bash
   railway login
   ```
3. Initialize or link your project:
   ```bash
   railway link
   ```
4. Deploy the services:
   ```bash
   railway up
   ```

### Option B: GitHub Integration
1. Connect your repository to Railway in the dashboard.
2. Create a service for the NestJS API pointing to the root or sub-directory `backend/`.
3. Create another service for the Worker pointing to `worker-service/`.
4. Railway will automatically trigger a build and release cycle on every push to your default branch.

---

## 3. Post-Deployment Checks

* **API Health Check**: Navigate to `https://<your-railway-domain>/api/health` to confirm liveness.
* **Readiness Check**: Inspect deep database and cache status at `https://<your-railway-domain>/api/health/deep`.
* **Prometheus Metrics**: Scrape internal metrics securely inside your Railway private network at `/api/v1/metrics`.
