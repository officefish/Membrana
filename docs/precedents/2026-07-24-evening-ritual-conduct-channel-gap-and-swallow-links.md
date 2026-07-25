<!-- precedent-meta
{
  "id": "2026-07-24-evening-ritual-conduct-channel-gap-and-swallow-links",
  "date": "2026-07-24",
  "class": "tooling-gap",
  "symptom": "Вечерний ритуал шёл долго и спотыкался: code-review и team-evening-feedback падали, ласточка ушла с некликабельными номерами PR",
  "rootCause": "Вечерний ритуал объявлен, но его тулинг путь не покрывает: LLM-каналы разведены только на утреннюю группу, вечерние процедуры на мёртвой цепочке (Anthropic до 01.08), а live-links-гейт в telegram-swallow не встроен — контур велся руками и оступился (ретрай в стену + голые ссылки)",
  "fix": "Диагностирован источник цепочки (office-overlay > defaults); code-review прогнан через Grok разовым escape-hatch; ласточка переотправлена после yarn live-links; находка и урок в память",
  "canonicalCause": "Объявленный шаг ритуала (вечер) не покрыт тулингом на своём пути: каналы только на утро, гейт live-links в swallow отсутствует — ручное ведение недоподключённого контура даёт ретрай в мёртвый провайдер и отправку без проверки кликабельности",
  "prevention": "Первый фейл LLM-шага → диагноз цепочки (defaults+overlay+probe) ПЕРЕД ретраем, не молотить в стену; перед telegram:swallow — yarn live-links --check как гейт; gh view проверяет state, live-links делает ссылку живой — два разных шага",
  "actionItems": [
    {"text": "Подключить вечерние процедуры к каналам: Grok/DeepSeek-звено в overlay code-review (панель) + отвязать team-evening-feedback от _anthropic-env, пустить через llm-procedure-chain", "owner": "owner", "status": "open"},
    {"text": "Вынести правки проводки (xai-каталог + Grok-дефолт + escape-hatch CODE_REVIEW_LOCAL_CHAIN) из ADR-ветки в feat/wire-evening-llm-channels", "owner": "owner", "status": "open"},
    {"text": "Гейт live-links --check встроить в telegram-swallow перед отправкой (NB6-follow-up)", "owner": "owner", "status": "open"}
  ],
  "related": ["2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail", "2026-07-23-night-merged-not-deployed"]
}
-->

# Прецедент 2026-07-24: как вёлся вечерний ритуал — дыра в каналах и голые ссылки

<!-- Автор: Claude Code (Opus 4.8), сессия по запросу владельца 24.07 (worktree основной, ветка fix/adr-0013-accepted, tip 73409904). -->
<!-- Повод: владелец попросил сохранить прецедент того, КАК агент проводил ритуал — включая промахи. -->

## Что случилось

Владелец: «идём в вечерний ритуал, только собери инфу о всех сессиях» (день шёл в 4 сессии — 2 Claude cloud, 2 Cursor). Агент собрал сводку дня и пошёл по манифесту вечера. Ритуал спотыкался трижды:

1. **`code-review` упал**, потом **`team-evening-feedback` упал** — оба на LLM-цепочке `anthropic → openrouter`, оба звена мертвы (Anthropic — usage-limit до 01.08, OpenRouter — auth). Владелец заметил: «долго как-то» — это агент **дважды прогнал шаг в мёртвую стену**, прежде чем полез в источник цепочки.
2. Диагноз нашёлся: вечерние процедуры **не подключены к рабочим каналам**. Три канала (Anthropic→Grok→DeepSeek) настроены только на группу `Ritual` (утро). `code-review` тянет overlay из office-панели (sonnet, без Grok), `team-evening-feedback` вообще прибит к `_anthropic-env` напрямую. Первичная оценка агента «фикс ~10 строк JSON» оказалась верной наполовину: code-review — конфиг, feedback — рефактор.
3. **Ласточка ушла с голыми `#1119…`** — агент сверил *состояние* ссылок через `gh`, но не отрендерил *кликабельность* через `yarn live-links`. Партнёры получили некликабельные номера; переотправлено после разворота, первое сообщение владелец удалил.

## Разбор (вещдоки)

| Артефакт | Состояние |
|----------|-----------|
| `scripts/lib/llm-procedure-defaults.json` | у `code-review` цепочка `anthropic haiku → openrouter haiku`; Grok нет |
| Office-overlay `code-review` | `anthropic sonnet-4.6 → openrouter sonnet-4.6`; перебивает defaults |
| `scripts/team-evening-feedback.mjs` | импортит `anthropicPost`/`getAnthropicKey` из `_anthropic-env.mjs` — **цепочки нет** |
| Anthropic | HTTP 400 usage-limit, regain 2026-08-01 00:00 UTC (`req_011CdMHNnVexJbhonojmNtsv`) |
| Рабочие каналы (корневой .env) | `X_AI_API_KEY` (xai, `api.x.ai`), `DEEPSEEK_API_KEY` |
| Провайдер `xai` | был в main (#1118), в каталоге ветки fix/adr-0013-accepted **отсутствовал** — дерево позади |
| Ласточка v1 | `sent=true`, «детали» = голый текст `#1119, #1136…` |
| Ласточка v2 | `sent=true`, «детали» = markdown-ссылки на `pull/N`; `live-links --check` зелёный |

## Корень

**Два класса в одном вечере:**

1. **Ретрай в мёртвый провайдер до диагноза.** LLM-шаг упал — агент перезапустил (сменив только дефолт, который даже не читался из-за office-overlay), вместо того чтобы сразу вскрыть источник цепочки. Отсюда «долго». Тот же класс, что «не молотить падающую команду в цикле — искать корень».
2. **Отправка наружу без гейта на живость ссылок.** `gh pr view N` доказывает `state` (MERGED/OPEN), но НЕ делает ссылку кликабельной. Кликабельность — отдельный шаг `yarn live-links`. Агент выполнил первое, пропустил второе — и это ушло партнёрам.

Подспудный корень обоих: **вечер как ритуал ещё не достроен** — каналы разведены только на утро, гейт live-links в swallow не встроен. Агент вёл недоподключённый контур руками и на ручном ведении оступился.

## Фикс (что сделано в сессии)

- Диагностирован путь цепочки: `invokeProcedureLlm` → `fetchOfficeOverlay` (перебивает defaults) → `resolveEffective` → `runProcedureChain`.
- Разовый обход: `xai` добавлен в локальный каталог, escape-hatch `CODE_REVIEW_LOCAL_CHAIN=1` (`skipOfficeOverlay:true`), code-review прогнан через `xai/grok-4.5` — живой артефакт `docs/DAILY_CODE_REVIEW.md`.
- `team-evening-feedback` оставлен на `:dry` (Anthropic-hardwired) — контекст в `docs/seanses/team-evening-feedback-2026-07-24.md`.
- Ласточка: `yarn live-links --file` → `--check` (гейт) → переотправка. Тело чисто по линзе Ожегова, «детали» одной строкой.
- Правки проводки оставлены **uncommitted** — не мешать в ADR-ветку (ревью само предупредило, B7).
- Память: `project_evening_llm_channels_gap`, урок дописан в `feedback_swallow_live_links_check`.

## Что вёл хорошо (не потерять)

- Собрал сводку 4 сессий ДО ритуала, честно пометив, что привязка cloud/Cursor не детерминирована.
- Ручной гейт ласточки удержан: линза Ожегова, показ основы владельцу, отправка только после «ок».
- Мёртвые LLM-шаги не стал молотить дальше в стену — остановился и доложил, а не имитировал прогон.

## Профилактика

- **Первый фейл LLM-шага → диагноз цепочки (defaults + office-overlay + `yarn llm:probe`) ПЕРЕД повторным прогоном.** Не менять «дефолт», не убедившись, что он вообще читается (overlay может перебивать).
- **Перед `yarn telegram:swallow` — гейт `yarn live-links --check --file <draft>`** (exit 1 при голых). `gh view` = state, `live-links` = кликабельность; нужны оба.
- Достроить вечер как ритуал: каналы на вечерние процедуры + встроенный live-links-гейт (см. actionItems).

## Ссылки

- Память: `project_evening_llm_channels_gap`, `feedback_swallow_live_links_check`, `feedback_ally_swallow_editorial_gate`.
- Артефакты вечера: `docs/DAILY_CODE_REVIEW.md`, `docs/seanses/team-evening-feedback-2026-07-24.md`, `docs/comms/drafts/ally-swallow-evening-2026-07-24.md`.
- Дневные PR (сводка сессий): #1119, #1136, #1141, #1139, #1140, #1149, #1118.
- Родственные: `2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail`, `2026-07-23-night-merged-not-deployed`.
