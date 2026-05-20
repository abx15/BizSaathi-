FROM node:20-slim
WORKDIR /usr/src/app

# Install OpenSSL (required by Prisma) and other build essentials
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy prisma schema and generate client (needs native binaries for Linux)
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of source code
COPY . .

# Run migrations then start in dev watch mode
CMD sh -c "npx prisma migrate deploy && npm run start:dev"
