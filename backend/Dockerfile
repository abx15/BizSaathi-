FROM node:20-alpine
WORKDIR /usr/src/app

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
