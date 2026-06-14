# Консилиум: background-media v1 (web data-plane)

**Дата:** 2026-06-11  
**Повестка:** сервер для библиотеки сэмплов и trends-шаблонов в веб-версии; мульти-узел (`deviceId`).

## Решение

| Вопрос | Ответ |
|--------|--------|
| Расширять `background-office`? | **Нет** — только интеграции (Claude, Linear, GitHub) |
| Отдельный сервер? | **Да** — `packages/background-media` |
| Отдельный сервер только для шаблонов? | **Нет** — шаблоны и сэмплы в одном data-plane |
| БД | **PostgreSQL** (метаданные через **Prisma**) + volume (audio blobs) |
| HTTP | **NestJS + Fastify** (office остаётся на Express) |
| Аудио | Мультиформат (wav, mp3, flac, ogg); метаданные — `music-metadata`, WAV PCM — `wavefile` при необходимости |
| Мульти-клиент | `X-Membrana-Device-Id` — изоляция коллекций и шаблонов |

## Подзадачи (3 PR)

1. **A5a** — NestJS API + PG + FS, клиент `ServerStorageBackend` + trends templates API  
2. **A5b** — Docker Compose (app + postgres + volume)  
3. **A5c** — прод-деплой (reverse proxy, TLS, env)

**Эпик:** GitHub Issue + `docs/prompts/BACKGROUND_MEDIA_V1_EPIC_PROMPT.md`
