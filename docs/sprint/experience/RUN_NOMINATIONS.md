# Номинации прогонов «предсказание ↔ исход» — производный снимок

Пересобран: 2026-07-30T19:00:00Z · `node scripts/sprint-experience.mjs --nominate rich` · окно `фикстурные прогоны «rich» (Phase 2, стабы соседей)`.
**Только номинация** — в канон и в пред-спринтовый фрейм запись делает человек по слову
владельца. **Руками не править:** файл производный, правки затрутся следующим прогоном.

Порога допуска по доле ложных остановок НЕТ (решение владельца 30.07): отбор номинирует
без отсечки, метрика напечатана рядом с каждой номинацией, порог назначается позже по
накопленным данным.

## Готовы (предсказание до работы ∧ исход по следам ∧ вещдоки живы)

- `run-stop-1` · stop · angelina · исход 2026-08-01T18:00:00Z
  - доля ложных остановок: 0.0% (0/7) · stopsCount=7 · unresolvedCount=0 · usefulCount=7
- `run-cut-1` · cut · vesnin · исход 2026-08-01T18:00:00Z
  - точность нарезки: 100.0% (6/6) · blocksCount=6 · overflowRate=0.0% (0/6) · withoutOutcome=0 · unattributed=0 · missOverflow=0 · missOverCut=0
- `run-cut-2` · cut · vesnin · исход 2026-08-02T18:00:00Z
  - точность нарезки: 100.0% (5/5) · blocksCount=5 · overflowRate=0.0% (0/5) · withoutOutcome=0 · unattributed=0 · missOverflow=0 · missOverCut=0
- `run-cut-3` · cut · vesnin · исход 2026-08-03T18:00:00Z
  - точность нарезки: 100.0% (4/4) · blocksCount=4 · overflowRate=0.0% (0/4) · withoutOutcome=0 · unattributed=0 · missOverflow=0 · missOverCut=0
- `run-cut-4` · cut · vesnin · исход 2026-08-04T18:00:00Z
  - точность нарезки: 100.0% (3/3) · blocksCount=3 · overflowRate=0.0% (0/3) · withoutOutcome=0 · unattributed=0 · missOverflow=0 · missOverCut=0
- `run-stop-2` · stop · angelina · исход 2026-08-02T18:00:00Z
  - доля ложных остановок: 25.0% (1/4) · stopsCount=4 · unresolvedCount=0 · usefulCount=3
- `run-stop-3` · stop · angelina · исход 2026-08-03T18:00:00Z
  - доля ложных остановок: 50.0% (2/4) · stopsCount=4 · unresolvedCount=0 · usefulCount=2

## Не готовы (причина названа — легальное «нет»)

- `run-stop-4` · stop · `beyond-read-budget` — годен, но выходит за окно чтения перед спринтом (восьмой выталкивает бриф)
