# DEBTS — реестр техдолгов попугая (мостик, append-only)

> Попугай «запомнил → не забудет»: долг не удаляется, settled лишь помечается.
> Правка — только через `yarn bridge debt add|settle --evidence`.

| id | долг | вещдок | статус | дата |
|----|------|--------|--------|------|
| dreams-tail-746 | Хвост снов 720 строк без построчного ревью — блокирует прод-синтез | PR #746; дайджест 0/6 22.07 | open | 2026-07-22 |
| office-unstable-933 | Office транзиентно таймаутит — server-first нарушен | Issue #933; sent=true без message_id | open | 2026-07-22 |
| plan-wire-592 | Провод генератора #592 не замкнут — канон 4-й день врёт о фокусе | Issue #592; вечерний фидбек 21.07 | open | 2026-07-22 |
| gitleaks-absent | gitleaks не установлен — локальный секрет-скан пропущен весь день | pre-commit №5 в каждом коммите | settled | 2026-07-22 |
| swallow-format-918 | Формат ласточки телеграфный вместо зеркала 5 блоков | Issue #918; эталон отчёт 20.07 | open | 2026-07-22 |
| ship-guard-924-925 | Мердж без ревью-вердикта и пуш из процедурной ветки — без стен | Issue #924, #925 | open | 2026-07-22 |
| research-jargon | insight research не гонит вопросы через жаргон-фильтр — Perplexity читал 44-ФЗ | RESEARCH.md Q2 v1 (госзакупки) | open | 2026-07-22 |
| anthropic-limit-aug1 | Anthropic API-лимит до 01.08 — LLM-ревью/генерация недоступны, переезд на deepseek | HTTP 400 usage limits req_011CdGzP; ревью мостика прошло через deepseek:task | open | 2026-07-22 |
| codereview-single-provider | code-review.mjs жёстко на Anthropic — нужен провайдер-свитч на deepseek/мультипровайдер | code-review.mjs:160 anthropicPost; deepseek:task работает автономно | open | 2026-07-22 |
| gitleaks-allowlist | gitleaks без allowlist кричит волками: 2 находки истории — ложные (SHA-пин кита + токен в third-party notices), не секреты. Нужен .gitleaks.toml (иначе сканер игнорируют) | разбор 22.07: generic-api-key=SHA-пин kits/angelina-morning/MANIFEST.json; sourcegraph-token=tools/bin/THIRD_PARTY_NOTICES.md | open | 2026-07-22 |
| ritual-llm-channel-bypass | Ритуал бьёт в Anthropic мимо канала панели — LLM-шаги не зарегистрированы как процедура | утро 24.07 ritual:day HTTP 400; реестр знает лишь code-review/consilium; invokeProcedureLlm→OpenRouter/Sonnet доказан живым; магистраль #1094 фрейм проводов | open | 2026-07-24 |
| align-wip-snapshots | 6 WIP-снимков выравнивания по деревьям — коммит-и-забыл, ждут разбора (мусор/ready/незавершёнка) | chore: wip snapshot before main-align в 6 деревьях 24.07; T11 шторма membrana-leveling | open | 2026-07-24 |
| bridge-open-two-days | Мостик открыт 2 дня — вечерний bridge-close не сработал | открыт 22.07, к 24.07 не закрыт; вечерняя цепочка стоит на LLM-лимите | open | 2026-07-24 |
| cowork-phase5-no-autoclose | Cowork Phase 5 (merge+retrospective+archive) не автозакрывается — ACTIVE-флаг застревает | cowork-execution-registry: PR #675 merged 19.07, а ACTIVE.md держал open/Phase-4 до ручного ретайра 24.07 | open | 2026-07-24 |
