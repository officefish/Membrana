# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) и реестру.

## Канон дня (2026-06-26)

**Epic:** [`device-board-three-hosts-2026-06-26`](./tasks/registry.json)  
**Текущий спринт:** `db3h-s1-tech-debt`  
**Консилиум:** [`neural-detectors-strategy-2026-06-26`](./seanses/neural-detectors-strategy-2026-06-26.md)

### Фокус недели

UserCase device-board (async-v2) стабилен на **кабинете**, **Membrana Studio**, **Device Board**.

### Очередь спринтов

1. `db3h-s1-tech-debt` — RAG, lint, async L18–L20 ← **сейчас**
2. `db3h-s2-cabinet-host` — device_board в кабинете
3. `db3h-s3-studio-host` — device_board в Studio Electron
4. `db3h-s4-microphone-detectors` — микрофон + audit детекторов
5. `neural-tier-1b-contract` — **deferred**
6. `neural-free-tier-dataset-report` — датасет→детектор→отчёт, **неделя 2+**

### Первые команды (спринт открыт 2026-06-26)

```bash
yarn turbo run lint typecheck test build --continue
yarn test:scripts
yarn turbo run lint --filter=@membrana/device-board --force
```

**OPEN:** [`docs/day-sprint/db3h-s1-tech-debt-2026-06-26/OPEN.md`](./day-sprint/db3h-s1-tech-debt-2026-06-26/OPEN.md)  
**Out of scope:** `yarn rag:index --full` (нет OPENAI_API_KEY)
