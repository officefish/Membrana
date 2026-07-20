# Заседание: жизненный цикл инсайтов

> **ID:** `insight-archive-lifecycle`  
> **Председатель:** Codex / Vesnin coordination  
> **Аудитор:** отдельный read-only агент (S-M5)  
> **Основание:** Issue #609 · draft PR #612  
> **Фаза:** M1…M7 — порядок M0 ратифицирован владельцем 2026-07-18.

## Объединяющее задание

Спроектировать доказуемый и обратимый жизненный цикл Membrana Insight от идеи до
решения, delivery/outcome и исторического хранения так, чтобы Cursor, Claude и Codex
одинаково выполняли переходы, ложный task status не мог закрыть инсайт, а исторические
решения и отмены оставались проверяемыми.

## Неподвижные факты до M0

- В registry 35 инсайтов; 30 не имеют точного task backlink.
- `membrana-insight-to-sprint` имеет прямой шов insight → task, но обратного шва нет.
- Task archive допускает delivered, branch-only, wontfix, duplicate и defer; это не outcome.
- Три пилота G/H/I были ложно архивированы по research/review-фазам и возвращены в adopted.
- Hermes имеет сильное доказательство полного REVIEW-мандата.
- Comms поставлен, но parent evidence неточен и должен раскрываться в child task graph.
- Telegram поставил MVP, но имеет явную фазу 2.
- Persona поставил фазы 1/1.5, но оставляет фазы 2–3 и калибровку как ценностное ядро.
- `docs/INSIGHTS.md` содержит 18 из 35 записей и не является source of truth.
- Codex-зеркало insight-to-sprint отсутствует; Claude delegate сломан относительным путём.

## Внешняя фактура

- GitHub различает completed и not planned при одинаковом closed.
- Linear архивирует completed, canceled и auto-closed; archive — хранение, не outcome.
- MADR разделяет decision status и confirmation реализации.
- OSLC RM использует типы `trackedBy`, `implementedBy`, `validatedBy`, `satisfiedBy`.
- SLSA provenance связывает конкретный artifact digest с входами и run details.
- W3C PROV разделяет Entity / Activity / Agent и generation / derivation / invalidation.
- Append-only events дают аудит и derived views, но полноценный event sourcing дорог;
  Microsoft рекомендует применять его только там, где аудит оправдывает сложность.

Полные материалы:

- `docs/discussions/insight-lifecycle-investigation-2026-07-18.md`
- `docs/tasks/research/insight-archive-lifecycle.md`

## Ограничения заседания

- M0 решает только DAG вопросов.
- Текущий код draft PR #612 — прототип, не посылка и не решение.
- Нельзя выводить implementation из archive task status.
- Нельзя смешивать decision, delivery/outcome и archive/visibility без явного вердикта.
- Нельзя переписывать исторические INSIGHT/RESEARCH/REVIEW задним числом.
- До итоговой сборки новые инсайты не архивируются.
- Любой вердикт должен назвать использованные посылки и не приписывать лишние.

## Материя, которую заседание обязано закрыть

- объект закрытия: весь INSIGHT, REVIEW-мандат или outcome;
- независимые состояния decision, delivery/outcome и archive/visibility;
- evidence contract для single task, эпика, deploy-gate, partial и non-delivery;
- forensic migration legacy-связей и судьба Hermes/Comms/Telegram/Persona;
- источник истории и derived views;
- одинаковый workflow и зубы для Cursor/Claude/Codex;
- атомарность, live-work checks, rollback/reopen/revoke/supersede.

## Итог заседания

После M1…Mn активные вердикты собираются в новый implementation prompt. Только этот
prompt заменяет текущий solution-first раздел draft PR #612 и разрешает production-код.

## Ратификация M0

- **Владелец:** owner
- **Дата:** 2026-07-18
- **Решение:** DAG из `insight-archive-lifecycle-m0-order-2026-07-18.md` ратифицирован.
