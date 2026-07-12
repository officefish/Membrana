# HANDOFF → 2026-07-13

**Центральная задача дня (завтра): спринт `drift-anchor-contour` (#396) — фазы DA4/DA5.**

## Контекст (одной фразой)

Детерминированный якорь-контур против **агентного дрейфа**. Движок DA0-DA3 отгружен и работает (#398-401); осталось достроить по консилиуму-2 (реструктуризация якорей). Полное состояние — память `project_drift_anchor_contour.md`, промпт `docs/prompts/DRIFT_ANCHOR_CONTOUR_PROMPT.md`, протоколы `docs/seanses/nightly-agents-platform-2026-07-12.md` + `drift-anchor-triggers-2026-07-12.md`.

## Что готово (в main)

- **DA0** пакет `@membrana/drift-anchor` — чистая `computeDrift` (#398, 9 тестов).
- **DA1** структурный якорь — снимок (реестр/граф/промпты/архитектура) + `docs/anchors/baseline.json` (#399, 5 тестов). yarn `drift:snapshot`/`drift:baseline`.
- **DA2** golden drone → combinedScore 0.9136 (#400) — **реклассифицирован консилиумом-2 в code-anchor**.
- **DA3-код** раннер `scripts/drift-anchor-run.mjs` (snapshot → computeDrift → Claude reasoning-гипотеза) (#401). yarn `drift:run`.

## Что делать завтра (консилиум-2 разрешил frozen-image развилку)

«Поведенческий якорь» = ДВА явления, ловятся в разных местах:

1. **DA4 старт — контракт `DriftAnchorRecord` в `@membrana/core`** (`anchorKind:'data'|'code'`, `anchorSource:'ci'|'schedule'`, `detectorVersion`, `imageFrozenAt`, `delta`, `verdict`) + тесты. Это фундамент трёх producer'ов.
2. **code-anchor → CI-гейт** (GitHub Actions): PR в `packages/services/detectors/*` → прогон корпуса `free-v1` → регресс F1>ε **блокит merge**. Реклассификация DA2.
3. **data-anchor → серверный джоб** на `background-media` (NL): ночь, frozen-image, вход меняется, **warning**-порог, лог `detectorVersion`+`imageFrozenAt`.
4. **DA4 scheduled-code-anchor**: пересборка детекторов из `main` + прогон корпуса (раз в сутки/по деплою) → алерт «Прод≠main».
5. **DA5**: расхождение-алерт «Прод≠main» + UI-панель «Дрейф-якоря» в кабинете (3 строки code/CI · code/schedule · data/schedule, возраст baseline, danger-строка, `tabular-nums`, `aria-live`, DESIGN.md).

**Anti-fetish (принцип владельца):** серверное только по существу; CI нативно в GH Actions, не форсить на сервер. Baseline меняется только осознанно + LGTM.

## Инфра-состояние (готово, не трогать без нужды)

- office `176.124.218.4` (Timeweb МСК, новый IP — блок ТСПУ был IP-specific): night-triage (02:30 МСК) + night-hunt (weekly) боевые, LLM через **media-прокси** `72.56.27.58:8888` (tinyproxy, NL, обход гео-блока — OpenRouterService НЕ видит прокси, только ClaudeService).
- Открытые авто-PR на ревью: #388 (triage), #392/#393/#394 (hunt).
- Параллельная сессия закоммитила `persona-persistent-memory` в ветку `parallel-persona-insight` (не в origin) — запушить, когда та сессия готова.

## Хвосты дня (не забыть)

- Живой тест 3 сценариев (Alpha/Beta/Gamma) — не закрыт, ждёт перепрогона.
- Катать сценарии в device-board — из плана дня, отложено.
