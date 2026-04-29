# Build stage
FROM node:22.14-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY libs ./libs
COPY apps/account ./apps/account
RUN npm run build:account

# Production stage
FROM node:22.14-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD [ "node", "dist/apps/account/apps/account/src/main.js" ]