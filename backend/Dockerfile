# Backend Dockerfile - Build from project root
FROM golang:1.21-alpine AS builder

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

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Create directory for SQLite database
RUN mkdir -p /root/data

EXPOSE 8080
CMD ["./main"]