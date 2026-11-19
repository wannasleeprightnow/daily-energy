FROM node:22-slim AS build

ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

FROM nginx:1.28.0-alpine

COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

RUN test -s /usr/share/nginx/html/index.html \
    && grep -q 'listen 5173;' /etc/nginx/conf.d/default.conf \
    && grep -q 'root /usr/share/nginx/html;' /etc/nginx/conf.d/default.conf \
    && nginx -t

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
