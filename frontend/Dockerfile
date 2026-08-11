# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Build Angular app
RUN npm run build -- --configuration production

# Serve stage
FROM nginx:alpine

# Copy cấu hình Nginx tùy chỉnh
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Xóa các file mặc định của Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy file tĩnh đã build từ bước builder (Angular 17+ thường lưu ở dist/tên-project/browser)
COPY --from=builder /app/dist/lingora/browser /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
