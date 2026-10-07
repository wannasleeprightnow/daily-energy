# syntax=docker/dockerfile:1.7
FROM golang:1.24-alpine AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /backend

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./

RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    GOMAXPROCS=2 CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -trimpath -buildvcs=false -ldflags="-s -w" -p=1 -o main ./cmd/

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder --chown=nonroot:nonroot /backend/main ./main

EXPOSE 8080
ENTRYPOINT ["/app/main"]
