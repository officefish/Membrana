# Membrana Local Sprint OPEN: archivarius-evening-step

| Поле | Значение |
|------|----------|
| Sprint | `archivarius-evening-step` |
| Procedure | `membrana-local-sprint` |
| Registry epic | `archivarius-sessions-container` (#1330, магистраль 13.08) |
| Prompt | [`ARCHIVARIUS_EVENING_STEP_PROMPT.md`](../../prompts/ARCHIVARIUS_EVENING_STEP_PROMPT.md) |
| Cut plan | [`archivarius-evening-step.json`](../../sprint/cut/archivarius-evening-step.json) · ратифицирован 2026-08-13T15:42 |
| Lead | dynin |
| Support | vesnin · ozhegov |
| Status | open · execute |

## Зачем

Первый срез контейнера сессий собран в стволе (дом, Mongo, span-акт, evidence-мост,
глаголы, маскировка; 13/13 зубов), тракт scan→extract→ingest→push готов кодом
(вещдок 04.08: 106884 спанов). Зазор: в вечерней цепочке шага архива нет — сессии
дня едут в Mongo руками. Спринт закрывает поток: вечер сам заливает сессии дня.

## Блоки

| Блок | Персона | Зона | Статус |
|------|---------|------|--------|
| e1 движок вечернего шага | dynin | `scripts/archivarius-evening-step.mjs` + тест | in work |
| e2 провод в манифест вечера (после e1) | vesnin | `evening-ritual-steps.json`, `package.json` | ждёт e1 |
| e3 форма и дом | ozhegov | `docs/archivarius/README.md`, `workshop.manifest.json` | ждёт e1 |

## Контракт трёх инвариантов (ревью Веснина, лента актов)

1. Отчёт одной строкой счётчиков `files/spans/maskedLines/accepted`; тела строк в stdout не попадают (снапшот-тест).
2. Skip-исход именованный: словарь `ok | office-unreachable | empty-day`; `findingExitCodes` в манифесте.
3. Маска — только правила `scripts/lib/secret-redact.mjs`; новые регэкспы не заводятся.
