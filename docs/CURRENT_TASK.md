# CURRENT_TASK — точка входа для холодной сессии

**Задача:** `dads-benchmark-bridge` (M, активна с 2026-07-18, lead Ozhegov)
**Ветка:** `feat/product` · worktree `Membrana-product`

## Стартовая строка (copy-paste в новую сессию)

> Работаем по `docs/prompts/DADS_BENCHMARK_BRIDGE_PROMPT.md` — мост DADS в бенчмарк.
> Решение зафиксировано в `docs/adr/0006-benchmark-runs-calibrated-preset.md` (ACCEPTED),
> факты по коду — в `docs/tasks/research/dads-integration-code-dossier.md`.
> Начинай с волны 1 (прогон исполняет калиброванный пресет + закрыть тихий fallback).
> Запреты в промпте — проголосованы, не переоткрывать.

## Где что лежит

| Что | Где |
|---|---|
| Задание | `docs/prompts/DADS_BENCHMARK_BRIDGE_PROMPT.md` |
| Решение | `docs/adr/0006-benchmark-runs-calibrated-preset.md` (ACCEPTED) |
| Факты по коду | `docs/tasks/research/dads-integration-code-dossier.md` |
| Факты датасета | `docs/tasks/research/anton-dads-dataset.md` |
| Инсайт-предок | `docs/insights/insight-dads-detector-integration/` (adopted 7.4) |
| Заседание (закрыто) | `docs/meeting/dads-integration/MEETING_ACTIVE.md` |

## Базовая линия для сверки (живой прогон 18.07, v0.2)

harmonic 43.6/68.3 · cepstral 50.0/100.0 · spectral-flux 46.4/86.7 ·
template-match 67.5/90.0 · yamnet 71.4/91.7

## Что ждёт владельца

- Переформулировка гейта 85/90 в `(P_d, P_fa)` — отдельный ADR, решение владельца.
- Мёрж в main — только по слову владельца.
