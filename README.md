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

Конфигуратор создаёт `.env` из `example.env`, если файла ещё нет, и записывает выбранные настройки запуска. Для AI-функций укажите `API_KEY` в `.env` до запуска. Локальная база использует отдельный volume `postgres-dev-data` и значения подключения, заданные в Docker Compose.

В режиме `full` работает Telegram-мок: frontend подменяет Telegram WebApp в обычном браузере, а локальный backend принимает его тестового пользователя. Мок относится только к Telegram-окружению и проверке Telegram-подписи. Запросы пользователей, планы, история и AI-функции обрабатываются настоящими backend-обработчиками; данные сохраняются в локальной PostgreSQL.

### Только backend

Чтобы запустить локальную PostgreSQL и API без frontend:

```bash
make configure-dev
make up
```

Swagger UI: [http://localhost:8080/api/docs](http://localhost:8080/api/docs). Для вызовов защищённых API из Swagger включён локальный Telegram auth mock и назначается ID `777000`.

### Запуск frontend отдельно

После `make configure-dev` откройте второй терминал:

```bash
cd frontend
npm install
npm run dev
```

Vite доступен на [http://localhost:5174](http://localhost:5174) и использует корневой `.env`, созданный конфигуратором. Telegram-мок включён в режимах `dev` и `full`. Изменения frontend применяются автоматически.

## Настройки окружения

Основные настройки находятся в корневом `.env`; шаблон — [`example.env`](example.env). Конфигураторы `make configure-*` не перезаписывают API-ключи и настройки базы, а обновляют только параметры выбранного режима.

| Переменная | Назначение |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Подключение backend к PostgreSQL; в локальных режимах значения базы задаёт Docker Compose. |
| `TELEGRAM_BOT_TOKEN` | Проверка подписи Telegram `initData` в production и запуск Telegram-бота. В локальных режимах auth mock включён отдельно в Docker Compose. |
| `API_PATH` | URL endpoint AI API. В шаблоне указан OpenRouter Chat Completions endpoint. |
| `API_KEY` | Ключ AI API; нужен для расчёта калорий, генерации планов и чата. |
| `ALLOW_ORIGINS` | Разрешённые origin для HTTP API. |
| `SERVER_NAME` | Домен production-конфигурации Nginx. |
| `VITE_API_URL` | Базовый URL backend для frontend. В локальных режимах конфигуратор указывает `http://localhost:8080`; пустое значение использует production URL из `frontend/src/constants.ts`. |
| `VITE_MOCK_TELEGRAM` | Включает frontend-мок Telegram WebApp (`true` в локальных режимах, `false` в production). |

Сейчас используется модель `nvidia/nemotron-3-ultra-550b-a55b:free`; её имя задано в `backend/internal/interfaces/http/ai/generate_message.go`. Поменять endpoint можно через `API_PATH`, а ключ храните только в `.env` и не добавляйте в репозиторий.

## Production

Production-профиль использует опубликованные Docker-образы, PostgreSQL и Nginx с HTTPS. Укажите production-значения `DB_*`, `TELEGRAM_BOT_TOKEN`, `API_KEY`, `DOCKER_USERNAME`, `TAG`, `SERVER_NAME` и другие необходимые параметры в `.env`, затем выполните:

```bash
make configure-prod
make up
```

В production Telegram-мок отключён, а backend проверяет подпись `initData`. AI-запросы идут к реальному endpoint, заданному `API_PATH`.

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

## Telegram-мок

`frontend/src/dev/telegramMock.ts` подменяет объект `window.Telegram.WebApp` в обычном браузере, чтобы локально разрабатывать интерфейс Mini App. Мок предоставляет тестовый профиль с ID `777000` и используется только при `VITE_MOCK_TELEGRAM=true`.

В локальных профилях Compose отключает проверку Telegram-подписи и назначает запросам тестовый ID `777000`, чтобы Telegram-мок мог обращаться к локальному API. В production этот режим выключен: backend проверяет подпись настоящего `initData`. Ответы API, данные и AI-функции не подменяются.

## Технологии

- Go, Gin, GORM и PostgreSQL.
- React, TypeScript, Vite, React Query и Tailwind CSS.
- Docker Compose и Nginx.
- OpenRouter Chat Completions API с моделью `nvidia/nemotron-3-ultra-550b-a55b:free`.
