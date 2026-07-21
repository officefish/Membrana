# Night Build handoff — 2026-07-20

> Epic: `linear-hygiene-dreams-providers-night`
> Linear: [DRU-249](https://linear.app/techies68/issue/DRU-249/night-build-linear-gigiena-zhivye-provajdery-snov)
> Закрыто: `2026-07-20T17:44:46.719Z` (`yarn night:close`)
> Промпт: `docs/prompts/LINEAR_HYGIENE_DREAMS_PROVIDERS_NIGHT_BUILD_EPIC_PROMPT.md`
> PR: https://github.com/officefish/Membrana/pull/746 (**не** мёржить ночью)
> Ветка: `night/linear-hygiene-dreams-providers-night-2026-07-20`
> Worktree: `C:\Users\user190825\practice\Membrana-night-linear-dreams`

## Для утреннего standup

1. LGTM → merge PR #746 → `main` (или continue / rollback).
2. `yarn ritual:day` — учесть блокеры ниже в `MAIN_DAY_ISSUE`.
3. После merge — `yarn task:archive` только если epic закрываем днём (ночью `task:close-github` не трогали).

## Сделано

| Фаза | Статус | Суть |
|------|--------|------|
| NB0 | **done** | Gate: dreams/task-start tests + office typecheck; registry `linearId: DRU-249`; neighbors ok |
| NB1 | **done** | Anti-duplicate `task:start`/`task:register`; `--linear` → registry; canon «доска=движение, Issue=удостоверение»; unit tests без сети |
| NB2 | **done** | 4 провайдера: deepseek direct + perplexity/grok/gemini via OpenRouter; OpenRouter proxy-aware; mock vitest + node tests; `dreams-select` не трогали |

### Коммиты vs origin/main

- `81d95200` chore(night-build): NB0 gate
- `d8969cec` feat(tasks): NB1 Linear hygiene anti-duplicate start/register
- `99591fd6` feat(dreams): NB2 wire providers (plus follow-up Nest/OpenRouter reconcile in close commit)

## Отложено / утро

- **Live VDS smoke** провайдеров снов — не фабриковать. Нужны ключи (`OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`) + `HTTPS_PROXY` на office; пометка: live — утро.
- DeepSeek service всё ещё на голом `fetch` (OpenRouter уже ProxyAgent) — при smoke на VDS при необходимости выровнять proxy.
- CI PR #746 — дождаться зелёного; при 2 fail подряд → WIP (сейчас close уже сделан, блокеров CI на момент close нет).

## Блокеры

- Нет hard-blocker на код. Human-in-loop: VDS smoke + утренний LGTM перед merge.

## Рекомендация утру

1. Прочитать PR #746 → merge при LGTM.
2. Smoke office dreams tick (1 слот) с proxy.
3. Не archive registry / не `task:close-github` до явного слова владельца.

## Лог ночи (checkpoints этого эпика)

- NB0 pass — scoped tests + typecheck + linearId DRU-249
- NB1 pass — anti-duplicate + canon + unit tests
- NB2 pass — 4 providers + mock tests + typecheck

**LGTM Vesnin:** pending (утро)
