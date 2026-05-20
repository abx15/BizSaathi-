# BizSaathi - Business Management Platform

<div align="center">

**A comprehensive business management platform for Indian SMBs**

[![License](https://img.shields.io/badge/license-Private-blue)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-1.22-cyan)](https://golang.org/)
[![Python](https://img.shields.io/badge/Python-3.11-green)](https://www.python.org/)

</div>

## 📋 Overview

BizSaathi is a modern, full-stack business management platform designed specifically for small and medium-sized businesses in India. It provides a unified ecosystem for invoicing, expense tracking, staff management, CRM/leads, AI-powered insights, and WhatsApp integration.

## ✨ Key Features

### Core Business Operations
- **Invoicing & Billing** - Create, manage, and track invoices with GST support
- **Expense Management** - Track and categorize business expenses
- **Staff Management** - Employee records, attendance, leave management, and payroll
- **CRM & Leads** - Contact management, lead pipeline, activity tracking, and follow-ups
- **Product/Service Catalog** - Manage inventory and service offerings

### Advanced Features
- **AI-Powered Insights** - Business analytics, recommendations, and predictive insights
- **WhatsApp Integration** - Automated notifications, customer engagement, and bot service
- **Real-time Updates** - Live dashboard updates via WebSocket
- **Background Jobs** - Email/SMS notifications, report generation, data processing
- **Multi-tenant Architecture** - Secure tenant isolation for SaaS deployment

### Security & Compliance
- **JWT Authentication** - Secure token-based authentication
- **OTP Verification** - Phone-based authentication with rate limiting
- **Role-Based Access** - Granular permissions for different user roles
- **Audit Logging** - Track all system activities
- **Data Encryption** - Secure data storage and transmission

## 🏗️ Architecture

BizSaathi follows a microservices architecture with the following components:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Kong API Gateway                          │
│                    (Port 8000 - Routing & Security)              │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Frontend    │    │  NestJS Core  │    │  Go CRM      │
│   Next.js 15  │    │   API (3001)  │    │  Service     │
│   (Port 3000) │    │               │    │  (Port 3005)  │
└───────────────┘    └───────────────┘    └───────────────┘
                            │                     │
                            ▼                     ▼
                   ┌───────────────┐    ┌───────────────┐
                   │   PostgreSQL  │    │   Redis       │
                   │   (Port 5432) │    │   (Port 6379) │
                   └───────────────┘    └───────────────┘
                            │                     │
        ┌───────────────────┼───────────────────┼───────────────────┐
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  AI Service   │  │  Realtime     │  │  WhatsApp     │  │  Worker       │
│  Python/FastAPI│  │  Service     │  │  Bot Service  │  │  Service      │
│  (Port 8000)  │  │  Go/WebSocket│  │  (Port 3007)  │  │  BullMQ Jobs  │
└───────────────┘  │  (Port 3006)  │  └───────────────┘  └───────────────┘
                   └───────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn/UI (Radix UI)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: Vercel

### Backend Core (NestJS)
- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis (ioredis)
- **Queue**: BullMQ
- **Authentication**: JWT + Passport
- **Validation**: class-validator
- **API Documentation**: Swagger
- **File Storage**: AWS S3 / Cloudflare R2
- **PDF Generation**: pdf-lib
- **Image Processing**: Sharp
- **Monitoring**: Sentry + Prometheus
- **Logging**: Winston

### Microservices

#### CRM Service (Go)
- **Language**: Go 1.22
- **Router**: Chi
- **Database**: pgx (PostgreSQL driver)
- **Cache**: go-redis
- **JWT**: golang-jwt
- **Logging**: zerolog

#### AI Service (Python)
- **Framework**: FastAPI
- **Language**: Python 3.11
- **LLM**: Groq (Llama models)
- **Vector DB**: Qdrant
- **Embeddings**: Sentence Transformers

#### Realtime Service (Go)
- **Language**: Go 1.22
- **WebSocket**: gorilla/websocket
- **Pub/Sub**: Redis

#### WhatsApp Bot Service (Node.js)
- **Framework**: Express.js
- **WhatsApp API**: Meta Graph API
- **Webhook**: Express routes

#### Worker Service (Node.js)
- **Framework**: NestJS
- **Queue**: BullMQ
- **Email**: Resend
- **SMS**: WhatsApp Business API

### Infrastructure
- **API Gateway**: Kong 3.4
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (in production)
- **Monitoring**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **CI/CD**: GitHub Actions
- **Deployment**: Railway / AWS ECS Fargate

## 📁 Project Structure

```
bizsaathi/
├── backend/                    # Backend services
│   ├── src/                    # NestJS core API
│   │   ├── auth/              # Authentication module
│   │   ├── invoice/           # Invoice management
│   │   ├── expense/           # Expense tracking
│   │   ├── staff/             # Staff & payroll
│   │   ├── customer/          # Customer management
│   │   ├── product/           # Product catalog
│   │   ├── attendance/        # Attendance tracking
│   │   ├── leave/             # Leave management
│   │   ├── payroll/           # Payroll processing
│   │   ├── whatsapp/          # WhatsApp integration
│   │   ├── upload/            # File uploads
│   │   ├── storage/           # S3/R2 storage
│   │   ├── queue/             # BullMQ setup
│   │   ├── redis/             # Redis client
│   │   ├── database/          # Database connection
│   │   ├── common/            # Shared utilities
│   │   ├── logger/            # Logging setup
│   │   ├── metrics/           # Prometheus metrics
│   │   └── health/            # Health checks
│   ├── crm-service/           # Go CRM microservice
│   │   ├── main.go
│   │   ├── config/
│   │   ├── db/
│   │   ├── redis/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── handlers/
│   │   ├── services/
│   │   ├── repository/
│   │   └── utils/
│   ├── ai-service/            # Python AI microservice
│   ├── realtime-service/      # Go WebSocket service
│   ├── whatsapp-bot-service/  # WhatsApp bot
│   ├── worker-service/        # Background jobs
│   ├── prisma/                # Database schema
│   ├── docker-compose.yml     # Development setup
│   ├── docker-compose.prod.yml # Production setup
│   ├── kong.yml               # Kong configuration
│   ├── Dockerfile             # Core API Dockerfile
│   └── package.json
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   └── store/             # State management
│   ├── public/                # Static assets
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
├── docs/                       # Documentation
│   ├── README.md              # Documentation hub
│   ├── DEPLOYMENT.md          # Deployment guides
│   └── RUNBOOK.md             # Operations runbook
├── deploy/                     # Deployment configs
│   ├── railway/               # Railway deployment
│   └── aws/                   # AWS deployment
├── monitoring/                 # Monitoring setup
│   ├── prometheus/            # Prometheus config
│   └── grafana/               # Grafana dashboards
├── .github/                    # GitHub workflows
├── .gitignore
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Go 1.22+ (for local development of Go services)
- Python 3.11+ (for local development of AI service)
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Using Docker Compose (Recommended)

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/bizsaathi.git
cd bizsaathi/backend
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Kong API Gateway (port 8000)
- NestJS Core API (port 3001)
- Go CRM Service (port 3005)
- Python AI Service (port 8000)
- Go Realtime Service (port 3006)
- WhatsApp Bot Service (port 3007)
- Worker Service (background jobs)

4. **Run database migrations**
```bash
docker-compose exec backend npx prisma migrate dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- API Docs (Swagger): http://localhost:8001/docs
- Kong Admin: http://localhost:8001

### Local Development

#### Backend (NestJS)
```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

#### Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

#### CRM Service (Go)
```bash
cd backend/crm-service
go mod download
go run main.go
```

#### AI Service (Python)
```bash
cd backend/ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📚 API Documentation

### Core API Endpoints

#### Authentication
- `POST /v1/auth/send-otp` - Send OTP to phone
- `POST /v1/auth/verify-otp` - Verify OTP and get tokens
- `POST /v1/auth/refresh` - Refresh access token
- `GET /v1/auth/me` - Get current user profile

#### Invoices
- `GET /v1/invoices` - List invoices (paginated)
- `POST /v1/invoices` - Create invoice
- `GET /v1/invoices/:id` - Get invoice details
- `PUT /v1/invoices/:id` - Update invoice
- `DELETE /v1/invoices/:id` - Delete invoice
- `POST /v1/invoices/:id/send` - Send invoice via email/WhatsApp
- `GET /v1/invoices/:id/pdf` - Download invoice PDF

#### Expenses
- `GET /v1/expenses` - List expenses
- `POST /v1/expenses` - Create expense
- `GET /v1/expenses/:id` - Get expense details
- `PUT /v1/expenses/:id` - Update expense
- `DELETE /v1/expenses/:id` - Delete expense

#### Staff
- `GET /v1/staff` - List staff members
- `POST /v1/staff` - Add staff member
- `GET /v1/staff/:id` - Get staff details
- `PUT /v1/staff/:id` - Update staff
- `DELETE /v1/staff/:id` - Delete staff

#### CRM (Go Service)
- `GET /v1/contacts` - List contacts
- `POST /v1/contacts` - Create contact
- `GET /v1/leads` - List leads
- `POST /v1/leads` - Create lead
- `GET /v1/leads/kanban` - Get kanban board data
- `PUT /v1/leads/:id/stage` - Move lead to new stage
- `GET /v1/crm/analytics` - Get CRM analytics

Full API documentation available at: `http://localhost:8001/docs`

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=3001
NODE_ENV=development
API_PREFIX=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bizsaathi

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your_secret_key_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OTP
OTP_EXPIRY_SECONDS=600
OTP_MAX_ATTEMPTS=5

# CORS
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=60

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_ba_id
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token

# AI Service
GROQ_API_KEY=your_groq_key

# Storage (AWS S3 or Cloudflare R2)
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
R2_ACCOUNT_ID=your_account
R2_PUBLIC_URL=https://your-bucket.r2.dev

# Email (Resend)
RESEND_API_KEY=your_resend_key
RESEND_FROM=noreply@yourdomain.com

# Internal
INTERNAL_API_KEY=your_internal_secret
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3006
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests
npm run test:cov          # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test              # Run tests
```

## 📦 Deployment

### Docker Compose (Production)
```bash
cd backend
docker-compose -f docker-compose.prod.yml up -d
```

### Railway
See `deploy/railway/README.md` for detailed Railway deployment instructions.

### AWS ECS
See `deploy/aws/README.md` for AWS ECS Fargate deployment guide.

### Vercel (Frontend)
```bash
cd frontend
vercel
```

## 📖 Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Detailed deployment instructions
- **[Operations Runbook](docs/RUNBOOK.md)** - Incident response and troubleshooting
- **[API Documentation](http://localhost:8001/docs)** - Interactive API docs (Swagger)

## 🔐 Security

- All API endpoints are protected by JWT authentication
- OTP-based phone verification
- Rate limiting on all endpoints
- SQL injection prevention via Prisma ORM
- XSS protection via Content Security Policy
- CORS configuration for cross-origin requests
- Encrypted secrets in environment variables
- Audit logging for sensitive operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support, email support@bizsaathi.in or join our Discord community.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Database hosted on [Neon](https://neon.tech/)
- Deployment on [Railway](https://railway.app/)

---

**Built with ❤️ for Indian businesses**


