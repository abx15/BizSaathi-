FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency files first
COPY go.mod ./
# (If go.sum exists, we copy it, otherwise just download with go.mod)
# Let's see if we have go.sum. Actually, let's copy both or just run download.
COPY go.mod go.sum* ./
RUN go mod download

# Copy the rest of the application
COPY . .

# Build statically-linked optimized Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o realtime-service ./main.go

FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/realtime-service .

EXPOSE 3006

CMD ["./realtime-service"]
