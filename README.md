# Daily Energy — Telegram Mini App

Приложение помогает вести историю питания и активности, смотреть планы и общаться с AI-помощником Рафиком. Данные хранятся в PostgreSQL. Расчёты калорий, планы и ответы чата запрашиваются у настроенного AI API.

## Возможности

- Профиль пользователя и первичная настройка.
- Ежедневная история питания и активности.
- AI-оценка калорий для еды и активности.
- Персональный план питания и тренировок на 7 дней.
- История и просмотр плана по датам.
- Чат с AI-помощником.

В приложении нет подмены ответов backend или тестовых ответов AI. Для AI-функций нужен действующий `API_KEY`.

## Требования

- Docker Engine и Docker Compose v2.
- Домен с A/AAAA-записью на production-сервер.
- Открытые входящие TCP-порты 80 и 443.
- Токен Telegram-бота и ключ AI API для соответствующих функций.

## Production-развёртывание

Скопируйте шаблон окружения и заполните production-параметры:

```bash
make configure-prod
```

Конфигуратор создаёт `.env` из `.env.example`, только если `.env` ещё не существует; существующие секреты и настройки не перезаписываются. Укажите в `.env` `DB_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL`, `API_KEY`, `SERVER_NAME` и `CERTBOT_EMAIL`. `MINI_APP_URL` должен соответствовать production-домену, например `https://app.example.com/`, а `SERVER_NAME` задаётся только как hostname: `app.example.com`.

Запустите все production-сервисы:

```bash
make up
```

Compose собирает backend и frontend из Dockerfile проекта, запускает PostgreSQL, Nginx и Certbot. При первом старте Nginx обслуживает HTTP challenge; после выпуска сертификата автоматически переключается на HTTPS. В дальнейшем Certbot продлевает сертификат, а Nginx перечитывает обновлённые файлы.

При настроенном домене frontend доступен по `https://app.example.com/`, API — по `https://app.example.com/api`, документация — по `https://app.example.com/api/docs`.

Production Nginx сжимает текстовые ответы gzip и кэширует versioned frontend-ресурсы. Ограничения запросов применяются по IP: API — 10 запросов/с с burst 30, AI endpoints — 3 запроса/с с burst 6, WebSocket chat — 10 соединений/минуту с burst 5 и не более 20 одновременных соединений. Это защита уровня HTTP, а не от перегрузки канала; для публичного сервиса при необходимости добавьте CDN/WAF. Если перед Nginx установлен доверенный proxy/CDN, настройте `real_ip_header` и `set_real_ip_from` только для его адресов. Лимит Nginx для WebSocket относится к соединениям, а не к сообщениям внутри открытого соединения.

Остановить сервисы, сохранив данные базы:

```bash
make stop
```

Остановить Compose и удалить volumes, включая данные PostgreSQL:

```bash
make down
```

## Настройки окружения

Шаблон переменных находится в [`.env.example`](.env.example). Основные параметры:

| Переменная | Назначение |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Подключение backend к PostgreSQL. В production Compose host и port задаются сервисом базы. |
| `TELEGRAM_BOT_TOKEN` | Токен бота; используется для проверки Telegram `initData` и работы бота. |
| `MINI_APP_URL` | Полный HTTPS URL Mini App, включая завершающий `/`. |
| `API_PATH` | URL совместимого с OpenAI Chat Completions API; в шаблоне указан OpenRouter. |
| `API_KEY` | Ключ AI API. Храните его только в `.env`. |
| `ALLOW_ORIGINS` | Разрешённые production origins через запятую, без завершающего `/`. Если не задано, используется origin `MINI_APP_URL`. |
| `SERVER_NAME` | Production hostname без схемы и пути. |
| `CERTBOT_EMAIL` | Email для регистрации сертификата Let's Encrypt. |
| `TAG` | Тег production Docker-образов. |
| `VITE_API_URL` | Необязательное переопределение API URL frontend; пустое значение использует текущий HTTPS origin. |

Авторизация API проверяет криптографическую подпись настоящего `initData` Telegram. Запросы без подлинной Telegram-сессии получают `401`.

## Привязка Mini App к боту

1. Создайте бота через [@BotFather](https://t.me/BotFather) командой `/newbot` и добавьте токен в `TELEGRAM_BOT_TOKEN`.
2. В **Bot Settings → Configure Mini App** задайте Main Mini App URL, например `https://app.example.com/`.
3. Укажите тот же URL в `MINI_APP_URL`. Backend устанавливает кнопку меню и отвечает на сообщения кнопкой открытия приложения.
4. После запуска production-стека проверьте кнопки в Telegram.

Telegram передаёт Mini App подписанный `initData`, который backend проверяет по токену бота. Дополнительные способы запуска описаны в [документации Telegram Mini Apps](https://core.telegram.org/bots/webapps).

## Windows / PowerShell

С Docker Desktop можно подготовить окружение и запустить production-стек:

```powershell
.\scripts\configure.ps1 -Up
```

Также доступны `-Down`, `-Stop` и `-Logs`. В WSL можно использовать команды `make configure-prod` и `make up`.

## Команды

| Команда | Действие |
| --- | --- |
| `make help` | Показать production-команды. |
| `make configure-prod` | Создать `.env` из шаблона, если файла ещё нет. |
| `make up` | Собрать и запустить production-стек в фоне. |
| `make logs` | Следить за логами сервисов. |
| `make ps` | Показать состояние сервисов. |
| `make restart` | Перезапустить сервисы. |
| `make stop` | Остановить сервисы, сохранив volumes. |
| `make down` | Остановить сервисы и удалить volumes. |
| `make build` | Собрать production-образы без запуска. |
| `make format` | Применить Go/frontend автоформатирование. |

## Технологии

- Go, Gin, GORM и PostgreSQL.
- React, TypeScript, Vite, React Query и Tailwind CSS.
- Docker Compose и Nginx.
- OpenRouter Chat Completions API.
