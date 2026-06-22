# Обсуждение: db-doc-v04-teamlead-lgtm

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-06-22 15:07 UTC · vesnin

**Контекст:** docs/discussions/db-doc-v04-teamlead-lgtm-ticket.md
**Вопрос:** Дай LGTM или BLOCK для merge PR #140. Проверь DoD эпика db-doc-v04-mvp и границы пакетов. Формат: [Teamlead]: + явно LGTM или BLOCK.

**Ответ:**

[Teamlead]:

**BLOCK** — три критических пункта перед merge:

1. **Граница пакетов нарушена в Phase 3.**
   - `docs/canvas/` содержит `.tsx` файлы с импортами из `apps/client` (via `DEVICE_BOARD_CANVAS_INDEX.md`).
   - Docs-пакет не должен зависеть от runtime-слоя. Canvas-фрагменты либо идут в отдельный `packages/canvas-fragments` (с дизайн-токенами из `@membrana/agenda`), либо остаются как **текстовые примеры** в `.md`, без живого импорта.
   - **Что делать:** развести: `docs/canvas/` остаётся markdown-only; live примеры переезжают в `apps/client/src/canvas-examples/` и индексируются из docs через внешнюю ссылку.

2. **DoD эпика неполный по слою fusion.**
   - Каталог `device-board.md` и V04 palette покрывают UI-ноды. Но Phase 3 обещает **PRD alignment report** — в `PRD_ALIGNMENT_DB_DOC_V04.md` видны 2 partial: *Atlan tenant* и *RAG index*.
   - RAG недопустимо отложить без явного решения Teamlead. Это не техдолг, это блокер: если индексация отложена, то поиск по Device Board docs **не работает**, и эпик не закрыт.
   - **Что делать:** либо `yarn rag:index` обязана пройти перед merge (добавить в CI check), либо явно пометить эпик как *partial* и открыть follow-up task `db-doc-v05-rag-index`.

3. **Canvas workflow в `DOCUMENTATION_WORKFLOW.md` не интегрирован с PR-process.**
   - Где live-preview для Canvas? Если это Cursor IDE workspace, то он не в git. Если в branch — где тогда `docs/canvas/*.tsx` собираются и деплоятся?
   - **Что делать:** уточнить в `DOCUMENTATION_WORKFLOW.md` (§ Canvas Development):
     - Canvas `.tsx` живут **где** (IDE, отдельный репо, вообще не в git)?
     - Как вин reviewer проверяет canvas перед LGTM (Cursor preview, скриншот, deployed link)?
     - Какая CI проверка обязательна (lint, type-check)?

**После разрешения этих трёх пунктов:**
- Переверь `yarn docs:lint` (44 страницы OK ✓ — видно).
- `yarn catalog:verify-client` — OK ✓.
- Архив: `db-doc-v04-mvp/` → `docs/closures/db-doc-v04-mvp-2026-06-22-LGTM.md` (сквозной индекс 3 фаз, metrics DoD, дата LGTM).

---

**Вопросы к тебе перед рефоркой:**

- Есть ли у вас уже `@membrana/rag-service` в ветке, или это действительно отложенная фаза?
- Canvas — это живой редактор типа Framer / Plasmic, или просто файлы `.tsx` в docs для copy-paste?

---
