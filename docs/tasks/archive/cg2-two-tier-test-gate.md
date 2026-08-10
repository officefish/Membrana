# Архив: CG2: двухуровневый test gate — smoke (hard) + full (опциональный) на vitest

| Поле | Значение |
|------|----------|
| **ID** | `cg2-two-tier-test-gate` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-02 |
| **Архивирована** | 2026-08-10 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/CI_GATE_STABILIZATION_SPRINT_PROMPT.md`](../../docs/prompts/CI_GATE_STABILIZATION_SPRINT_PROMPT.md) |

## Заметки при закрытии

Влито PR #1832 (35fbe763, 10.08). Мердж-гейт корпуса vitest выборочный: затронутые пакеты с зависимыми (--filter=...<name>) плюс ярус smoke; ярус вычисляется из графа воркспейса порогом транзитивного фан-ина >= 10 (core 27, audio-engine 16, detector-base 11), опись tests/vitest-smoke.catalog.json, CI сверяет --check. turbo не зовётся напрямую — фильтр .md/GLOBAL_CONFIGS общий с pre-push (lib/changed-files-scope.mjs), иначе повтор #1168. Отчёт «что не гонялось» считается от факта прогона (turbo --dry) и печатается в job summary. Ночь — vitest-nightly.yml 0 2 * * *, красный НЕ блокирует до защиты main (предусловие ADR-0018, ход владельца). Живой CI прогона #1832: mode=floor, прогнано 3 из 38, остаток назван поимённо.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
