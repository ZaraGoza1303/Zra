# Stage 1: Build
FROM node:22-alpine AS builder

ARG VITE_API_URL
ARG VITE_FRONTEND_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Forward API calls to backend service
RUN echo 'server {\
    listen 80;\
    location / {\
        root /usr/share/nginx/html;\
        index index.html;\
        try_files $uri $uri/ /index.html;\
    }\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
