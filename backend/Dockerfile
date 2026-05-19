FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
# Using nest start --watch directly
CMD ["npm", "run", "start:dev"]
