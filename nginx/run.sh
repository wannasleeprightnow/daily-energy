#!/bin/sh
set -eu

render_tls_candidate() {
  if [ ! -s "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" ] || [ ! -s "/etc/letsencrypt/live/${SERVER_NAME}/privkey.pem" ]; then
    return 1
  fi

  envsubst '${SERVER_NAME}' < /etc/nginx/prod.conf.template > /etc/nginx/nginx.conf.candidate
  nginx -t -c /etc/nginx/nginx.conf.candidate
}

if render_tls_candidate; then
  mv /etc/nginx/nginx.conf.candidate /etc/nginx/nginx.conf
  tls_active=1
else
  envsubst '${SERVER_NAME}' < /etc/nginx/bootstrap.conf.template > /etc/nginx/nginx.conf
  tls_active=0
fi

nginx -g 'daemon off;' &
nginx_pid=$!
trap 'nginx -s quit 2>/dev/null || true; wait "$nginx_pid"; exit 0' TERM INT
cert_mtime="$(stat -c %Y "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" 2>/dev/null || true)"

# Pick up the first issued certificate, wait for app upstreams, and reload renewed certificates.
while kill -0 "$nginx_pid" 2>/dev/null; do
  sleep 300
  next_cert_mtime="$(stat -c %Y "/etc/letsencrypt/live/${SERVER_NAME}/fullchain.pem" 2>/dev/null || true)"
  if [ "$tls_active" -eq 0 ] || [ "$next_cert_mtime" != "$cert_mtime" ]; then
    if render_tls_candidate; then
      mv /etc/nginx/nginx.conf.candidate /etc/nginx/nginx.conf
      if nginx -s reload; then
        tls_active=1
        cert_mtime="$next_cert_mtime"
      fi
    else
      rm -f /etc/nginx/nginx.conf.candidate
    fi
  fi
done
