# DEBTS — реестр техдолгов попугая (мостик, append-only)

> Попугай «запомнил → не забудет»: долг не удаляется, settled лишь помечается.
> Правка — только через `yarn bridge debt add|settle --evidence`. Колонка `тема` (M1) —
> ось кластер-счёта (`yarn bridge debt invariants`).

| id | долг | вещдок | статус | дата | тема |
|----|------|--------|--------|------|------|
| dreams-tail-746 | Хвост снов 720 строк без построчного ревью — блокирует прод-синтез | PR #746; дайджест 0/6 22.07 | settled | 2026-07-22 | сны |
| office-unstable-933 | Office транзиентно таймаутит — server-first нарушен | Issue #933; sent=true без message_id | open | 2026-07-22 | инфра-office |
| plan-wire-592 | Провод генератора #592 не замкнут — канон 4-й день врёт о фокусе | Issue #592; вечерний фидбек 21.07 | open | 2026-07-22 | генератор-стратегии |
| gitleaks-absent | gitleaks не установлен — локальный секрет-скан пропущен весь день | pre-commit №5 в каждом коммите | settled | 2026-07-22 | секрет-скан |
| swallow-format-918 | Формат ласточки телеграфный вместо зеркала 5 блоков | Issue #918; эталон отчёт 20.07 | open | 2026-07-22 | формат-ласточки |
| ship-guard-924-925 | Мердж без ревью-вердикта и пуш из процедурной ветки — без стен | Issue #924, #925 | open | 2026-07-22 | ship-guard |
| research-jargon | insight research не гонит вопросы через жаргон-фильтр — Perplexity читал 44-ФЗ | RESEARCH.md Q2 v1 (госзакупки) | open | 2026-07-22 | research |
| anthropic-limit-aug1 | Anthropic API-лимит до 01.08 — LLM-ревью/генерация недоступны, переезд на deepseek | HTTP 400 usage limits req_011CdGzP; ревью мостика прошло через deepseek:task | settled | 2026-07-22 | каналы-LLM |
| codereview-single-provider | code-review.mjs жёстко на Anthropic — нужен провайдер-свитч на deepseek/мультипровайдер | code-review.mjs:160 anthropicPost; deepseek:task работает автономно | settled | 2026-07-22 | каналы-LLM |
| gitleaks-allowlist | gitleaks без allowlist кричит волками: 2 находки истории — ложные (SHA-пин кита + токен в third-party notices), не секреты. Нужен .gitleaks.toml (иначе сканер игнорируют) | разбор 22.07: generic-api-key=SHA-пин kits/angelina-morning/MANIFEST.json; sourcegraph-token=tools/bin/THIRD_PARTY_NOTICES.md | settled | 2026-07-22 | секрет-скан |
| ritual-llm-channel-bypass | Ритуал бьёт в Anthropic мимо канала панели — LLM-шаги не зарегистрированы как процедура | утро 24.07 ritual:day HTTP 400; реестр знает лишь code-review/consilium; invokeProcedureLlm→OpenRouter/Sonnet доказан живым; магистраль #1094 фрейм проводов | settled | 2026-07-24 | каналы-LLM |
| align-wip-snapshots | 6 WIP-снимков выравнивания по деревьям — коммит-и-забыл, ждут разбора (мусор/ready/незавершёнка) | chore: wip snapshot before main-align в 6 деревьях 24.07; T11 шторма membrana-leveling | open | 2026-07-24 | гигиена-ветки |
| bridge-open-two-days | Мостик открыт 2 дня — вечерний bridge-close не сработал | открыт 22.07, к 24.07 не закрыт; вечерняя цепочка стоит на LLM-лимите | settled | 2026-07-24 | bridge-цикл |
| cowork-phase5-no-autoclose | Cowork Phase 5 (merge+retrospective+archive) не автозакрывается — ACTIVE-флаг застревает | cowork-execution-registry: PR #675 merged 19.07, а ACTIVE.md держал open/Phase-4 до ручного ретайра 24.07 | settled | 2026-07-24 | реестр-cowork |
| converging-formats-fallback-dead | Converging-форматы (консилиум/заседание) и тяжёлые генераторы (main-day-issue) мертвы на фолбэк-моделях — Anthropic исчерпан до 01.08, а deepseek/grok не держат строгий протокол (посылки+вердикт, 5-блочный каркас) | M0 bridge-ledger-toolset grok-4.5 пустой протокол 25.07; main-day-issue уронил все слоты 3x утром 25.07; rejected/bridge-ledger-toolset-m0-order | settled | 2026-07-25 | каналы-LLM |
| ritual-llm-channel-bypass-r2 | Overlay вечерних процедур (code-review) и канал main-day-issue без рабочего звена; ритуальные стадии уже зарегистрированы процедурами с фолбэком | утро 25.07: code-review overlay мёртв (escape-hatch); main-day-issue уронил все слоты 3x; defaults несут deepseek/xai ⟵ supersedes ritual-llm-channel-bypass | open | 2026-07-25 | каналы-LLM |
| anthropic-limit-aug1-r2 | Anthropic API-лимит — LLM-heavy форматы (консилиум/main-day-issue) на слабом фолбэке | date:2026-08-01 порог снятия; фолбэк deepseek/grok не тянет строгий формат ⟵ supersedes anthropic-limit-aug1 | open | 2026-07-25 | каналы-LLM |
| gitleaks-allowlist-r2 | gitleaks без allowlist: 2 ложных срабатывания истории (SHA-пин кита, third-party токен) | absent:.gitleaks.toml нужен конфиг; kits/angelina-morning/MANIFEST.json + tools/bin/THIRD_PARTY_NOTICES.md ⟵ supersedes gitleaks-allowlist | open | 2026-07-25 | секрет-скан |
| bridge-open-two-days-r2 | Мостик открыт с 22.07 — вечерний close не устоял (откат при reset на origin/main); нужен чистый цикл close | state:bridge-closed гаснет при закрытии мостика; открыт 22.07 без close ⟵ supersedes bridge-open-two-days | open | 2026-07-25 | bridge-цикл |
| converging-formats-fallback-dead-r2 | Converging-форматы (консилиум/заседание) и тяжёлые генераторы мертвы на слабом фолбэке | date:2026-08-01 порог Anthropic; deepseek/grok не тянут строгий протокол с посылками ⟵ supersedes converging-formats-fallback-dead | open | 2026-07-25 | каналы-LLM |
| kits-pins-audit-unwired | Сверка описей китов (kits:audit) не стоит ни на одном пути — ни pre-push, ни CI, ни вечерняя цепочка; описи расходятся тихо | kits:audit 25.07: 30 blocking (angelina-morning 21, containerization-master 6, dream-master 3); grep kits:audit по .github/workflows + .githooks = только package.json | settled | 2026-07-25 |  |
| bridge-toolkit-precedent-mastering | В наборе Ангелины нет мастеринга прецедентов: фиксация находки комнаты идёт раскопками по образцу вместо вызова инструмента | мостик 25.07: на «сохрани прецедент» сессия грепала репо, читала чужую запись как шаблон и копала git log; docs/bridge/toolkit.catalog.json — 4 зоны (комната/попугай/ведущая/соседи) без precedent:register и без classes.json | open | 2026-07-25 |  |
