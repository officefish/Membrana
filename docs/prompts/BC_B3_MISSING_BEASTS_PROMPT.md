# Промпт: B3 — недостающие звери

> **M** · `bc-b3-missing-beasts` · [#882](https://github.com/officefish/Membrana/issues/882) · lead **dynin** · parent `bestiary-container`

## Промпт целиком

Эхо-камера (origin-hash) и/или смещение цели — детектор + specimen **или** явный defer
в CLOSURE / OPEN с карточкой follow-up.

## Решение B3 (2026-07-22)

| Зверь | Вердикт | Деталь |
|-------|---------|--------|
| **Эхо-камера** (`echo`) | ✅ реализовано | `detectEchoChamber` → `dedupeByOrigin`/`originHash` из `truth-graph.mjs`; specimen `specimens/echo/triple-reflection.mjs` |
| **Смещение цели** (`goal-displacement`) | ⏸ **defer** | Нужен корпусный сигнал (доля self-referential записей / Goodhart), не file-lens. Follow-up: `bc-followup-goal-displacement` (после B5 или отдельная M-карточка) |

Defer rationale: детектор эха опирается на уже готовый origin-hash; смещение цели — метрика над реестром/корпусом, иначе получится украшение-эвристика без forcing function.

## Acceptance criteria

- [x] Детектор+specimen **или** defer зафиксирован (echo ✅ · goal-displacement defer)
- [x] LGTM dynin (owner ok 2026-07-22)

## Out of scope

Weekly wiring (B4); реализация goal-displacement (follow-up card).
