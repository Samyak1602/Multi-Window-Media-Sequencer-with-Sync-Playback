# Multi-stage Dockerfile for Go Backend
# Stage 1: Build
FROM golang:1.24-alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto

# Install ca-certificates and git
RUN apk add --no-cache ca-certificates git

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary without CGO
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# Stage 2: Final Minimal Image
FROM alpine:3.20

WORKDIR /app

# Install ca-certificates and tzdata
RUN apk add --no-cache ca-certificates tzdata

# Create directory for persistent SQLite database
RUN mkdir -p /data

# Copy binary from builder
COPY --from=builder /app/server /app/server

# Environment variables
ENV PORT=8080
ENV DB_PATH=/data/sequencer.db
ENV FRONTEND_ORIGIN=*
ENV DEFAULT_SYNC_DURATION_SECONDS=10

EXPOSE 8080

CMD ["/app/server"]
