FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

COPY . .
RUN npm run build

FROM dependencies AS migration

ENV NODE_ENV=production

COPY .sequelizerc ./
COPY src ./src

USER node

CMD ["npm", "run", "db:migrate"]

FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
