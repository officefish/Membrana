# Промпт: W1 — канон report-plane

> **M** · `arp-w1-canon` · [#1099](https://github.com/officefish/Membrana/issues/1099) · parent `atlas-report-plane` · lead **ozhegov**  
> Эпик: [`ATLAS_REPORT_PLANE_PROMPT.md`](./ATLAS_REPORT_PLANE_PROMPT.md).

## Промпт целиком

Привести язык канона к модели владельца (без переезда путей):

| Файл | Правка |
|------|--------|
| [`GROUP_CONTAINERIZATION.md`](../patterns/GROUP_CONTAINERIZATION.md) | В «Известные реализации»: `docs/audit/tasks` = **отчёты** о карточках, не «группа = карточки». Кратко описать `docs/audit` как плоскость отчётов; `docs/tasks` — предметный дом (ссылка). |
| [`docs/audit/README.md`](../audit/README.md) | Явно: audit = контейнер отчётов (2D); слот `tasks/` — отчёты про реестр, истина — `docs/tasks`. |
| [`docs/audit/tasks/README.md`](../audit/tasks/README.md) | Первый абзац: не «второй tasks», а derivative-отчёты; primary назван. |
| [`docs/tooling-atlas/README.md`](../tooling-atlas/README.md) | Индекс различает domain / report-plane / meta; ссылки по `home`. |
| ADR (опционально) | Если формулировка «плоскость» спорна — короткий ADR в `docs/adr/` ниже консилиум-гейта; иначе хватит правки паттерна. |

Не менять `workshop.manifest.json` без нужды для W2 (нормализация display — в engine).

## DoD

- [x] Четыре README/паттерна согласованы с R1–R3
- [x] Нет формулировки «audit/tasks = карточки реестра» как группа предметов
- [ ] PR или коммит в ветке спринта; LGTM смысла у Vesnin (после ship)
