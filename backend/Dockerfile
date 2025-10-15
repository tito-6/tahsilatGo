# Backend Dockerfile - Build from project root
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./frontend/
WORKDIR /app/frontend

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/tsconfig.json ./

# Build React app
RUN npm run build

# Go backend builder stage
FROM golang:1.23-alpine AS backend-builder

WORKDIR /app

# Copy go modules from backend directory
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source files
COPY backend/handlers/ ./handlers/
COPY backend/models/ ./models/
COPY backend/services/ ./services/
COPY backend/main.go ./

# Build the application
RUN go build -ldflags="-w -s" -o main .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

# Copy the binary from backend builder stage
COPY --from=backend-builder /app/main .

# Copy frontend build files from frontend builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build/

# Create directory for SQLite database
RUN mkdir -p /root/data

EXPOSE 8080
CMD ["./main"]