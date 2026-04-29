# Build stage
FROM node:22.14-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

RUN npm ci

COPY libs ./libs
COPY apps/product ./apps/product

RUN npm run build:product

# Production stage
FROM node:22.14-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD [ "node", "dist/apps/product/apps/product/src/main.js" ]