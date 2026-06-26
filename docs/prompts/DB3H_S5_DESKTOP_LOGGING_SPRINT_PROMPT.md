# Промпт: DB3H-S5 — политика логов настольных приложений (Studio + Device)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Размер:** M · Реестр: `db3h-s5-desktop-logging`  
> **Parent:** `device-board-three-hosts-2026-06-26`  
> **Блокирует:** `db3h-s4-microphone-detectors`

**Консилиум LGTM:** [`seanses/desktop-logging-policy-2026-06-26.md`](../seanses/desktop-logging-policy-2026-06-26.md) · **Канон v1.0:** [`DESKTOP_APP_LOGGING_POLICY.md`](../DESKTOP_APP_LOGGING_POLICY.md)

---

## Контекст

DB3H-S3 закрыт. Packaged Studio: T1 trace — manual Download; M1 shell — backlog DL-1. Support путал `app-*.log`, journal, DevTools.

**Цель:** канон T1+M1, **матрица документации**, toolkit, затем DL-IMPL.

---

## Артефакты

| # | Phase | Deliverable | Путь |
|---|-------|-------------|------|
| DL-0 | Консилиум + policy v1.0 | LGTM | `docs/seanses/…`, `DESKTOP_APP_LOGGING_POLICY.md` |
| **DL-DOC** | **Синхронизация всех контуров docs** | Матрица §10 политики | см. таблицу ниже |
| DL-tools | Support collect | `yarn desktop:support-collect` | `scripts/desktop-support-collect.mjs` |
| DL-1 | Shell log M1 | `electron-log` в main | `apps/membrana-studio` |
| DL-2 | Auto-flush T1 | IPC + flush on stop | main + client |
| DL-3 | In-app UX | Папка логов, diagnostics | optional |

### DL-DOC — обязательные файлы (все ссылаются на канон)

| Файл |
|------|
| `docs/DESKTOP_APP_LOGGING_POLICY.md` |
| `apps/membrana-studio/README.md` — §Логи |
| `apps/membrana-device/README.md` — §Логи |
| `apps/client/README.md` — dev vs desktop |
| `docs/STUDIO_HOST_BRIDGE_CONTRACT.md` — §7.5 |
| `docs/support/DESKTOP_SUPPORT_RUNBOOK.md` |
| `docs/device-board-scripts/CLIENT_LOGS_PARSING.md` |
| `docs/device-board-scripts/STUDIO_HOST_LESSONS.md` (ST8) |
| `logs/README.md`, `logs/apps/studio/README.md` |
| `.cursor/skills/membrana-client-logs-parsing/SKILL.md` + Claude mirror |
| `AGENTS.md` |
| `docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md` |

---

## Промпт целиком

### Кто ты

Teamlead + Ozhegov (paths/IPC) + Rodchenko (operator UX).

### Что сделать

1. **DL-0** — policy v1.0: T1, M1, пути, уровни A–D, privacy.
2. **DL-DOC** — обновить **все** строки матрицы §10; политика **в README приложений**.
3. **DL-tools** — `desktop:support-collect` (T1; + M1 после DL-1).
4. **DL-1..3** — по очереди после docs LGTM.

### Запрещено

- Business-logic в main ради логов (кроме logging IPC).
- Требовать `yarn` у end-user (уровень A).
- Закрывать спринт без DL-DOC checklist.

### Definition of Done

- [x] Консилиум LGTM
- [x] `DESKTOP_APP_LOGGING_POLICY.md` v1.0
- [x] DL-DOC: все файлы матрицы синхронизированы
- [ ] `yarn desktop:support-collect` на Windows
- [ ] DL-1 spike или OPEN backlog с issue
- [ ] OPEN/CLOSURE; registry

---

**OPEN:** [`docs/day-sprint/db3h-s5-desktop-logging-2026-06-26/OPEN.md`](../day-sprint/db3h-s5-desktop-logging-2026-06-26/OPEN.md)
