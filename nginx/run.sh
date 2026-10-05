#!/bin/sh
set -eu

render_config() {
  if [ -s "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" ] && [ -s "/etc/letsencrypt/live/${SERVER_NAME}/privkey.pem" ]; then
    envsubst '${SERVER_NAME}' < /etc/nginx/prod.conf.template > /etc/nginx/nginx.conf
  else
    envsubst '${SERVER_NAME}' < /etc/nginx/bootstrap.conf.template > /etc/nginx/nginx.conf
  fi
}

render_config
nginx -g 'daemon off;' &
nginx_pid=$!
trap 'nginx -s quit 2>/dev/null || true; wait "$nginx_pid"; exit 0' TERM INT
cert_mtime="$(stat -c %Y "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" 2>/dev/null || true)"

# Pick up the first issued certificate, then reload periodically to serve renewals.
while kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 300
  next_cert_mtime="$(stat -c %Y "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" 2>/dev/null || true)"
  if [ "$next_cert_mtime" != "$cert_mtime" ]; then
    render_config
    nginx -s reload || true
    cert_mtime="$next_cert_mtime"
  fi
done
