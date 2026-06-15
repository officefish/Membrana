# Промпт (эпик): background-media v1 — web data-plane

> **Task-промпт для координатора и постановщика** (не для одного PR).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер эпика: **L** (3 последовательных PR).
> Реестр: `id` = `background-media-v1` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Консилиум: [`seanses/background-media-v1-consilium-2026-06-11.md`](../seanses/background-media-v1-consilium-2026-06-11.md).

---

## Контекст

Веб-клиент Membrana сейчас хранит сэмплы в IndexedDB (cap ~100 MB) и шаблоны trends в localStorage. Для сценария «датасет на сервере → шаблоны → live-детекция» нужен **отдельный data-сервер** `@membrana/background-media` (не `background-office`).

Каждый полевой **узел** (микрофон, антенна, отдельный браузер) — уникальный потребитель с собственными коллекциями и шаблонами (`deviceId`).

**Подзадачи (строгий порядок):**

| Фаза | Реестр `id` | Промпт | PR |
|------|-------------|--------|-----|
| A5a Сервер | `background-media-a5a-server` | [`BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md`](./BACKGROUND_MEDIA_A5A_SERVER_PROMPT.md) — NestJS+Fastify, Prisma+PG, мультиформат audio | 1 |
| A5b Docker | `background-media-a5b-docker` | [`BACKGROUND_MEDIA_A5B_DOCKER_PROMPT.md`](./BACKGROUND_MEDIA_A5B_DOCKER_PROMPT.md) | 2 |
| A5c Deploy | `background-media-a5c-deploy` | [`BACKGROUND_MEDIA_A5C_DEPLOY_PROMPT.md`](./BACKGROUND_MEDIA_A5C_DEPLOY_PROMPT.md) | 3 |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) §4.2 | Целевой API и storage backends |
| [`BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | Канон: office vs media, границы, deviceId |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1d | Семейство `background-*` в архитектуре |
| [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md) | Эталон NestJS-пакета |
| [`packages/background-office/README.md`](../../packages/background-office/README.md) | Auth: `X-Membrana-Token` |

**GitHub Issue:** [#58](https://github.com/officefish/Membrana/issues/58).

---

## Definition of Done (эпик целиком)

- [ ] Все три подзадачи в реестре `archived` с отчётами в Issue.
- [ ] Web-клиент в режиме `remote-server` читает/пишет сэмплы и шаблоны на сервере.
- [ ] ≥2 независимых `deviceId` изолированы (ручная проверка).
- [ ] `https://<media-domain>/health` → 200 извне.
- [ ] `background-office` не содержит media/templates модулей.

---

## Out of scope (эпик)

- Синхронизация offline IndexedDB ↔ server (v2).
- Org-level multi-tenant admin UI.
- S3 вместо local volume (опционально после A5c).
- Benchmark batch jobs на сервере.

---

## Заметки для постановщика

1. Закрывать подзадачи по одной: `yarn task:archive background-media-a5a-server` и т.д.
2. Эпик `background-media-v1` архивировать после A5c.
3. Клиентская интеграция `ServerStorageBackend` — в scope **A5a** (не откладывать на A5c).
