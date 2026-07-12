# Промпт: drift-anchor-contour — детерминированный якорь против агентного дрейфа

> Task-промпт (размер **M**). Реестр: `drift-anchor-contour`. GitHub Issue: [#396](https://github.com/officefish/Membrana/issues/396).
> Гейт пройден: консилиум [`nightly-agents-platform-2026-07-12.md`](../seanses/nightly-agents-platform-2026-07-12.md) (21 реплика, LGTM Teamlead).

## Суть

Ночные процессы (night-triage/night-hunt) → **детерминированный якорь-контур против агентного дрейфа** поверх `hermes:brief` + night-triage. Без нового агента, без правки прокси. Два якоря питают один утренний дайджест.

## Решения консилиума (обязательны)

- Вердикт `ok/drift/broken` выносит **чистая функция** `computeDrift` (пакет `@membrana/drift-anchor`); LLM только **аннотирует гипотезой** (бейдж «гипотеза»), вердикт не меняет.
- Baseline версионируется в репо (`docs/anchors/baseline.json`); автоперезапись ночью запрещена — только осознанный коммит + LGTM (как golden-файл).
- Единый контракт `MorningDriftDigest { anchors: AnchorResult[] }`, `AnchorResult { id, kind, baseline, current, delta, verdict, reasoning? }`.
- Пороги ε₁/ε₂ в конфиге. Baseline воспроизводим (тот же сэмпл, версия детектора, seed).
- Границы: drift-ядро — чистая утилита без React/Web Audio; ноль прямых импортов между drift-anchor / night-triage / детекторами (только публичные `index.ts`). Якорь-B зовёт детекторы через `index.ts`.
- UI-дайджест: одна карточка `--color-surface`, verdict иконка+текст (не только цвет), `aria-live="polite"`, `tabular-nums`, reasoning `line-clamp-2`.

## Фазы

| # | Артефакт |
|---|----------|
| **DA0** | Пакет `@membrana/drift-anchor`: контракты (`Snapshot`/`AnchorResult`/`MorningDriftDigest`/`DriftThresholds`) + чистая `computeDrift` + тесты (равные→ok, подмена→1 drift, ε₂→broken) |
| **DA1** | Якорь-A (структурный): сборщик `Snapshot` (хэши реестра, активные ID, граф импортов, чек-суммы промптов ролей) поверх hermes:brief + `docs/anchors/baseline.json` |
| **DA2** | Якорь-B (поведенческий): golden drone-сэмпл (label `drone`) → `detection-ensemble` → зафиксированный `combinedScore` baseline + drift |
| **DA3** | Ночной раннер на office (поверх hermes:brief) + Claude-аннотация через media-прокси; выход `MorningDriftDigest` |
| **DA4** | Утренний дрейф-дайджест-карточка в кабинете (DESIGN.md, a11y) |

## Definition of Done (консилиум)

- [ ] `computeDrift` чистая, без I/O; тесты (а) равные→ok (б) подмена→1 drift (в) ε₂→broken.
- [ ] Якорь-B: golden-сэмпл + combinedScore в репо; прогон детерминирован (seed, версия детектора).
- [ ] `baseline.json` версионируется; раннер НЕ перезаписывает автоматически.
- [ ] Раннер дёргает утилиту по расписанию; Claude добавляет reasoning-гипотезы, вердикт не меняет.
- [ ] Дайджест-карточка: verdict иконка+текст, aria-live, tabular-nums, reasoning line-clamp-2.
- [ ] Ноль прямых импортов между drift-anchor/night-triage/детекторами; ядро без React/Web Audio.
- [ ] LGTM Teamlead по границам + ARCHITECTURE.md (§1, §1a-1e).

Связано: [[night-triage-office]], [[night-hunt-office-real]] (тот же office/прокси-контур).
