# Backend Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy only backend source files (exclude debug files)
COPY handlers/ ./handlers/
COPY models/ ./models/
COPY services/ ./services/
COPY main.go ./

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