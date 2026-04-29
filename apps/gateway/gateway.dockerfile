# Build stage
FROM node:22.14-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY libs ./libs
COPY apps/gateway ./apps/gateway

RUN npm run build gateway

# Production stage
FROM node:22.14-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD [ "node", "dist/apps/gateway/apps/gateway/src/main.js" ]

