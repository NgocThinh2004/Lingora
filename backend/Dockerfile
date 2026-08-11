# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt openssl cho Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build ứng dụng NestJS
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Cài đặt openssl cho Prisma runtime
RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
