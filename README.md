# Daily Energy — Telegram Mini App

Приложение помогает вести историю питания и активности, смотреть планы и общаться с AI-помощником Рафиком. Данные приложения хранятся в PostgreSQL. Расчёты калорий, планы и ответы чата запрашиваются у настроенного AI API.

## Возможности

- Профиль пользователя и первичная настройка.
- Ежедневная история питания и активности.
- AI-оценка калорий для добавленной еды.
- Персональный план питания и тренировок на 7 дней.
- История и просмотр плана по датам.
- Чат с AI-помощником.

В приложении нет локальных ответов-заглушек для AI и подмены ответов backend. Локальная разработка использует настоящие API-обработчики и локальную PostgreSQL. Для запуска AI-функций нужен действующий `API_KEY`.

## Требования

- Docker Engine и Docker Compose v2.
- Для локального запуска frontend вне Docker: Node.js и npm.
- Для AI-функций: ключ API провайдера, совместимого с OpenAI Chat Completions API.

## Быстрый запуск: frontend и backend

Из корня проекта:

```bash
make configure-full
make up
```

Откройте frontend: [http://localhost:5173](http://localhost:5173). Backend API и Swagger UI доступны по адресам [http://localhost:8080/api/ping](http://localhost:8080/api/ping) и [http://localhost:8080/api/docs](http://localhost:8080/api/docs).

Конфигуратор создаёт `.env` из `.env.example`, если файла ещё нет, и записывает выбранные настройки запуска. Для AI-функций укажите `API_KEY` в `.env` до запуска. Локальная база использует отдельный volume `postgres-dev-data` и значения подключения, заданные в Docker Compose.

Авторизация API всегда проверяет криптографическую подпись настоящего `initData` Telegram. В обычном браузере API-запросы, требующие пользователя, будут возвращать `401`.

### Только backend

Чтобы запустить локальную PostgreSQL и API без frontend:

```bash
make configure-dev
make up
```

Swagger UI: [http://localhost:8080/api/docs](http://localhost:8080/api/docs). Защищённые API требуют настоящего `initData` из Mini App, запущенного в Telegram.

### Запуск frontend отдельно

После `make configure-dev` откройте второй терминал:

```bash
cd frontend
npm install
npm run dev
```

Vite доступен на [http://localhost:5174](http://localhost:5174) и использует корневой `.env`, созданный конфигуратором. Изменения frontend применяются автоматически. Авторизованные запросы проверяйте из Mini App, открытого через Telegram.

## Настройки окружения

Основные настройки находятся в корневом `.env`; шаблон — [`.env.example`](.env.example). Скопируйте его в `.env` и заполните значения. Конфигураторы `make configure-*` создают `.env` из `.env.example`, если файла ещё нет; существующие секреты и настройки базы они не перезаписывают.

| Переменная | Назначение |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Подключение backend к PostgreSQL; в локальных режимах значения базы задаёт Docker Compose. |
| `TELEGRAM_BOT_TOKEN` | Токен бота; используется для проверки `initData` и работы бота. |
| `MINI_APP_URL` | HTTPS URL Mini App, например `https://app.example.com/`. Используется кнопкой бота и кнопкой меню. |
| `CERTBOT_EMAIL` | Email для регистрации сертификата Let's Encrypt. |
| `API_PATH` | URL endpoint AI API. В шаблоне указан OpenRouter Chat Completions endpoint. |
| `API_KEY` | Ключ AI API; нужен для расчёта калорий, генерации планов и чата. |
| `ALLOW_ORIGINS` | Разрешённые origin для HTTP API. |
| `SERVER_NAME` | Домен production-конфигурации Nginx. |
| `VITE_API_URL` | Базовый URL backend для frontend. В локальных режимах конфигуратор указывает `http://localhost:8080`; пустое значение использует тот же HTTPS origin, через который открыт Mini App. |

Сейчас используется модель `nvidia/nemotron-3-ultra-550b-a55b:free`; её имя задано в `backend/internal/interfaces/http/ai/generate_message.go`. Поменять endpoint можно через `API_PATH`, а ключ храните только в `.env` и не добавляйте в репозиторий.

## Production

Production-профиль собирает backend и frontend локально на сервере из Dockerfile проекта, затем запускает PostgreSQL, Nginx и Certbot. Nginx принимает HTTP-01 challenge; Certbot получает сертификат и проверяет его обновление каждые 12 часов. Nginx перечитывает файлы после выпуска и продления сертификата.

На сервере заранее направьте A/AAAA записи `SERVER_NAME` на его публичный IP, разрешите входящие TCP 80 и 443 и установите Docker Compose v2. В checkout проекта укажите в `.env` `DB_*`, `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL` (например `https://app.example.com/`), `CERTBOT_EMAIL`, `API_KEY`, `TAG` и `SERVER_NAME`. `MINI_APP_URL` должен совпадать с доменом, на который выпущен сертификат. Затем запустите:

```bash
make configure-prod
make up
```

`make up` собирает backend и frontend на сервере, поэтому checkout должен содержать исходный код и Dockerfile. Go-компиляция ограничена одним параллельным пакетом, а BuildKit сохраняет кеш Go-модулей и объектных файлов между сборками, чтобы снизить пиковую память и ускорить повторный запуск. Первый запуск может занять несколько минут: пока Let's Encrypt проверяет домен, Nginx отдаёт HTTP challenge и страницу ожидания. Когда сертификат будет создан, Nginx автоматически переключится на HTTPS. Снаружи frontend, API и WebSocket доступны только через Nginx на портах 80/443; API использует относительный путь `/api`.

### Привязка Mini App к боту

1. Создайте бота через [@BotFather](https://t.me/BotFather) командой `/newbot`, затем добавьте выданный токен в `TELEGRAM_BOT_TOKEN`.
2. Откройте `/mybots` → ваш бот → **Bot Settings** → **Configure Mini App** и задайте Main Mini App URL `https://app.example.com/`. Main Mini App добавит кнопку запуска в профиль бота и позволит открывать приложение прямой ссылкой `https://t.me/<имя_бота>?startapp`.
3. Укажите тот же полный URL в `MINI_APP_URL`. Backend сам установит кнопку меню бота через `setChatMenuButton` и будет отвечать на сообщения кнопкой **Открыть Daily Energy**. После запуска production-стека проверьте обе кнопки в Telegram.

Дополнительно BotFather позволяет настроить меню командой `/setmenubutton`; для этого проекта она не нужна, потому что backend устанавливает URL кнопки меню из `MINI_APP_URL`. Telegram передаёт приложению подписанный `initData`, который backend проверяет по токену бота. Подробнее о способах запуска — в [официальной документации Telegram Mini Apps](https://core.telegram.org/bots/webapps).

Перед переключением между профилями остановите предыдущий стек:

```bash
make stop
```

`make stop` останавливает сервисы и сохраняет данные. `make down` удаляет контейнеры и volumes выбранного профиля, включая сохранённые данные базы.

## Windows / PowerShell

С Docker Desktop можно настроить и сразу запустить профиль:

```powershell
.\scripts\configure.ps1 full -Up
```

Также доступны режимы `dev` и `prod`. Чтобы только записать настройки, уберите `-Up`, затем запустите `docker compose --profile <профиль> up --build`, как подскажет скрипт. В WSL доступны команды `make configure-full` и `make up`.

## Полезные команды

| Команда | Действие |
| --- | --- |
| `make help` | Показать команды и активный профиль. |
| `make configure` | Выбрать режим интерактивно. |
| `make configure-dev` | Настроить backend и PostgreSQL для локальной разработки. |
| `make configure-full` | Настроить frontend, backend и PostgreSQL. |
| `make configure-prod` | Настроить production-профиль. |
| `make up` | Собрать и запустить сервисы выбранного профиля. |
| `make logs` | Смотреть логи. |
| `make ps` | Показать состояние сервисов. |
| `make restart` | Перезапустить сервисы активного профиля. |
| `make stop` | Остановить сервисы, сохранив volumes. |
| `make down` | Остановить сервисы и удалить volumes активного профиля. |

## Технологии

- Go, Gin, GORM и PostgreSQL.
- React, TypeScript, Vite, React Query и Tailwind CSS.
- Docker Compose и Nginx.
- OpenRouter Chat Completions API с моделью `nvidia/nemotron-3-ultra-550b-a55b:free`.
