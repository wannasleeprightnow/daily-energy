# Daily Energy

Адаптивный сайт для ведения дневника питания и активности, отслеживания прогресса и получения рекомендаций AI-помощника. Интерфейс рассчитан на мобильные устройства и обычные браузеры.

## Стек

- `frontend/` — React, TypeScript, Vite, Tailwind CSS.
- `backend/` — Go, Gin, PostgreSQL, GORM.
- Docker Compose — локальный HTTP-стек и production HTTPS-стек.

## Локальный запуск без сертификата

Нужен Docker с Compose. Локальный режим не запускает Nginx или Certbot, не использует `.env` и не требует домена/TLS-сертификата.

```sh
make configure-local  # создаёт .env.local из локального шаблона, не перезаписывает существующий
make up-local         # собирает и запускает сайт, API и PostgreSQL
```

Откройте сайт: http://localhost:5173. API доступен на http://localhost:8080/api, Swagger — http://localhost:8080/api/docs. PostgreSQL опубликован только на localhost:5433. Можно поменять порты в `.env.local`.

Остановка без удаления данных: `make down-local`. База сохраняется в отдельном volume `daily-energy-local-postgres-data`. Локальный режим отключает флаг `Secure` у refresh-cookie только для HTTP на localhost; production настройки остаются включёнными.

## Production запуск

1. Создайте `.env` из `.env.example` командой `make configure-prod` и задайте параметры PostgreSQL, `APP_URL`, AI API, домен и email для сертификата.
2. Запустите production-стек командой `make up`.

Production-сайт публикуется через Nginx по HTTPS с сертификатом Let's Encrypt.

## Аккаунты и сессии

Создайте аккаунт на сайте по юзернейму и паролю. Юзернейм: 3–32 символа (латинские буквы, цифры, `.`, `_`, `-`); пароль: 10–72 байта. Пароли хранятся только в виде bcrypt-хеша.

Access-токен действует 10 минут и хранится в памяти вкладки. Refresh-токен действует до 30 дней, ротируется при обновлении и хранится в `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Каждый вход на устройстве создаёт независимую сессию; выход завершает текущую.

## Обновление схемы данных

Предыдущая схема данных несовместима с аккаунтами сайта. Сделайте резервную копию, остановите старую версию и очистите **только базу Daily Energy** перед первым запуском новой версии. Схема создаётся при старте backend; приложение не удаляет данные автоматически. Не удаляйте Docker volumes целиком, если они содержат другие данные.

## Проверки

```sh
cd backend && go test ./... && go build ./...
cd frontend && npm run lint && npm run build
```

## Переменные окружения

`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `APP_URL`, `ALLOW_ORIGINS`, `COOKIE_SECURE`, `API_PATH`, `API_KEY`, `SERVER_NAME`, `CERTBOT_EMAIL`, `TAG`, `VITE_API_URL`.
