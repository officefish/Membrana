# Code Review PR #175 — Night Hunt (NH1+NH3)

**Tier:** T1  
**PR size:** OK (~30 files, ядро — `background-office` night-hunt + 2 ritual scripts)  
**Регламент:** [`CODE_REVIEW_REGULATION.md`](../prompts/CODE_REVIEW_REGULATION.md)  
**Дата:** 2026-06-25

---

## [Teamlead — Vesnin]

**Контекст:** Day-sprint `night-hunt-sprint-2026-06-25`, Closes #174. Optional контур: cron → OpenRouter → PR → утренний review. Prod-ритуалы не трогаем.

**Проверка acceptance:**
- ✅ Модуль `night-hunt` в `background-office` (OpenRouter отдельно от Anthropic rituals)
- ✅ Optional semantics: `runJob` catch → `{ skipped: true }`, exit 0 на уровне API
- ✅ Путь `docs/seanses/night-hunt/*-YYYY-WW.md`
- ✅ `ritual:day` / `ritual:evening` hooks
- ✅ Тесты office: 19 passed
- ⏳ NH2 deploy — **после merge**, оператор

**Замечания (не блокеры):**
- **P2:** дедуп PR по title substring — грубо, достаточно для пилота
- **P2:** label `automated` может отсутствовать в repo — warn в логе, ок
- **P2:** retry/backoff — follow-up после первой недели

**Авто-ревью скрипта:** пункты про «NestJS DI / HttpModule» и «секреты в fly.toml» — **ложные** (DI через `OpenRouterService` уже есть; в `fly.office.toml` только публичные env).

**Вердикт: LGTM** — merge после зелёного CI.

---

## [Структурщик — Ozhegov]

Границы `background-office` соблюдены: нет импортов client/agenda/services. `GithubModule` + `OpenRouterModule` — правильное разделение. `ScheduleModule` только вне `NODE_ENV=test`.

**P2:** `packages/services/.api-contract.json` — отложено в промпт (follow-up).

**Согласен с LGTM.**

---

## [Математик — Dynin]

`nightHuntWeekKey` — чистая утилита + unit-тест. DSP не затронут.

**Согласен с LGTM.**

---

## [Музыкант]

Audio/Web Audio не в scope. —

---

## [Верстальщик — Rodchenko]

`design-token-drift` job — после deploy проверим качество первого отчёта; код UI не менялся.

**Согласен с LGTM.**

---

## Итог

| Поле | Значение |
|------|----------|
| **Вердикт** | **LGTM** |
| **Merge** | После green CI на `main` |
| **Следующий шаг** | NH2: Fly secrets (оператор) |
