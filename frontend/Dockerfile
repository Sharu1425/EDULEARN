# ── EDULEARN Frontend Dockerfile ──────────────────────────────────────────────
# Development mode — for Docker Compose local use
# For HuggingFace Spaces / production: see Stage 2 below (multi-stage build)

# ── Stage 1: Development ──────────────────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]


# ── Stage 2: Production (HuggingFace Spaces / Vercel-equivalent) ─────────────
# Uncomment and use this stage for HF Spaces deployment:
#
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci
# COPY . .
# ARG VITE_API_BASE_URL
# ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# RUN npm run build
#
# FROM nginx:alpine AS production
# COPY --from=builder /app/dist /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/conf.d/default.conf
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
