# syntax=docker/dockerfile:1.7
FROM golang:1.24 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /backend

COPY go.mod go.sum ./

RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    GOMAXPROCS=2 CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} \
    go build -p=1 -o main ./cmd/

FROM alpine:latest

WORKDIR /root/

COPY --from=builder /backend/main .

CMD ["./main"]
