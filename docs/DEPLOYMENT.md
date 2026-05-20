# BizSaathi Deployment Guide

This guide details the steps to deploy the BizSaathi production infrastructure. We cover three paths: Docker Compose (Internal/On-Premise), Railway (Fast Cloud Rollout), and AWS ECS Fargate (Enterprise Scale).

---

## 🏗️ Deployment Path 1: Docker Compose

Use this path for quick deployments on single-node VPS (DigitalOcean, Hetzner, Linode) or on-premise staging environments.

### Prerequisites
* Docker engine (v20.10+) and Docker Compose (v2.0+) installed.
* Ports `80`, `443`, `3001`, `6379`, and `5432` open on your firewall.

### Steps
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Copy the production environment example:
   ```bash
   cp .env.example .env
   ```
3. Edit the `.env` file to provide secure, cryptographically random keys for `JWT_SECRET`, `DB_PASSWORD`, and `REDIS_PASSWORD`.
4. Pull the production containers and deploy:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
5. Confirm the system state:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

---

## ☁️ Deployment Path 2: Railway.app (Recommended)

Railway is our recommended choice for zero-downtime, serverless deployments of both the Core API and the Worker.

### Setup Steps
1. Create a Railway project in your dashboard.
2. Click **New** -> **Database** -> **Add PostgreSQL**.
3. Click **New** -> **Database** -> **Add Redis**.
4. Deploy the services from your GitHub repository branches:
   * **Core API**: Point build path to `/backend`.
   * **Worker Service**: Point build path to `/worker-service`.
5. Railway will automatically inject `DATABASE_URL` and `REDIS_URL` using cross-service variables. Ensure your other credentials (`JWT_SECRET`, `SENTRY_DSN`) are configured under the **Variables** tab for both services.

---

## ⚡ Deployment Path 3: AWS ECS Fargate (Enterprise Scale)

For enterprise scaling, we leverage AWS ECS Fargate to ensure high availability across multiple availability zones without managing EC2 instances.

### Infrastructure Components
* **ECS Cluster**: Hosts our service tasks.
* **AWS RDS PostgreSQL**: Highly available database instance.
* **Amazon ElastiCache Redis**: Scalable queue storage and broker.
* **Application Load Balancer (ALB)**: Routes public traffic with TLS termination.
* **AWS Systems Manager (SSM) Parameter Store**: Securely stores secrets.

### Step-by-Step Deploy
1. **Register the Task Definition**:
   Ensure your Task Role and Task Execution Role exist. Register the `backend.json` task definition:
   ```bash
   aws ecs register-task-definition --cli-input-json file://deploy/aws/ecs/task-definitions/backend.json
   ```
2. **Create the ECS Service**:
   Create a highly available service with a minimum capacity of 2 running tasks behind your ALB:
   ```bash
   aws ecs create-service \
     --cluster bizsaathi-prod-cluster \
     --service-name bizsaathi-backend-service \
     --task-definition bizsaathi-backend-prod:1 \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-12345678,subnet-87654321],securityGroups=[sg-abcdef01],assignPublicIp=ENABLED}"
   ```
3. **Verify Deployment**:
   Check the AWS ECS service console or CLI to confirm both tasks have entered the `RUNNING` status and pass ALB health checks.
