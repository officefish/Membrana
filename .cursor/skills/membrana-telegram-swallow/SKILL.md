---
name: membrana-telegram-swallow
description: >-
  Sends a one-off owner-triggered ally Telegram message (swallow / lastochka) via
  yarn telegram:swallow (office push-ingest, md to Telegram-HTML). Tone via Ozhegov lens;
  clickable PR/Issue refs via yarn live-links (separate tool). Use ONLY when the owner
  explicitly commands: lastochka, send to allies/partners, message to the group,
  publish to telegram. Do NOT use for ritual digests (ritual:day/evening) or
  alarm/product notifications (product feature, out of scope).
---

# Membrana telegram swallow — «ласточка» союзникам

Разовое свободное сообщение в приватную telegram-группу союзников. Канал тот же,
что у дайджестов (#428/#434): локальный скрипт → `POST office /v1/telegram/ally-message`
→ office конвертирует md-подмножество в Telegram-HTML и шлёт. Office stateless.

## Жёсткие правила

1. **Только по явной команде владельца.** Никаких автозапусков, хвостов ритуалов,
   cron. Агент сам решил «стоит сообщить» → НЕ ласточка, а предложение владельцу.
2. **Черновик — владельцу до отправки**, если текст сочиняет агент: показать
   финальный текст в чате; слать после «ок» (или если владелец продиктовал дословно).
3. **Тон (линза Ожегова)** — отдельно от ссылок: аудитория нетехническая; без
   секретов, токенов, внутренних URL/IP, SHA, имён файлов/переменных, жаргона
   проверок. По-простому: что это значит для продукта. Избегать оценочных
   «врать/лгать» — лучше «честно отличать сделанное от закрытого».
4. **Живые ссылки** — отдельно от линзы: голые `PR #N` / `Issue #N` развернуть
   инструментом `yarn live-links` (см. ниже), не смешивать с переписыванием тона.
5. Лимит 4096 символов md; длиннее — сократить или разбить на две ласточки.

## Перед показом черновика владельцу

Если текст сочиняет агент и в нём есть номера PR/Issue:

```bash
yarn live-links --file docs/comms/drafts/<note>.md
yarn live-links --check --file docs/comms/drafts/<note>.md
```

Линза Ожегова правит смысл и тон; `live-links` только делает ссылки кликабельными.
Оба шага нужны вместе для партнёрской ласточки — но это **два** инструмента.

## Команды

```bash
yarn telegram:swallow "Текст с **md**: жирный, *курсив*, [ссылка](url), `код`"
yarn telegram:swallow --file docs/comms/drafts/note.md
yarn telegram:swallow "..." --dry-run    # показать payload, не отправлять
yarn live-links --file docs/comms/drafts/note.md
yarn live-links --check --file docs/comms/drafts/note.md
```

Поддерживаемое md-подмножество: `**bold**`, `*italic*`, `[текст](url)`, `` `код` ``
(конвертер `telegram-md.ts`, office-side). Остальное уйдёт как экранированный текст.

Env: `OFFICE_API_TOKEN` (или `API_INTERNAL_TOKEN`) в корневом `.env`;
`OFFICE_BASE_URL` опционален (default `https://office.mmbrn.tech`).
Скрипт НЕ graceful: ошибка/недоступный office → exit 1 с причиной.

## Диагностика

- `office ответил 401` — токен: на VDS свой `API_INTERNAL_TOKEN`, локально шлём
  `OFFICE_API_TOKEN` (см. ловушки в `TELEGRAM_ALLY_REPORTS_PROMPT.md`).
- `office недоступен` — проверить `https://office.mmbrn.tech/health`; редеплой —
  скилл `membrana-office-vds-deploy`.
- `sent=false` — office жив, но Telegram недоступен/не сконфигурирован
  (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_ALLY_CHAT_ID` на VDS).

## Related

- Дайджесты ритуалов: `scripts/telegram-ritual-digest.mjs` (автоматика, не трогать).
- Канон модуля: `packages/background-office/src/modules/telegram/`,
  `docs/prompts/TELEGRAM_ALLY_REPORTS_PROMPT.md`, `TELEGRAM_DIGESTS_V2_PROMPT.md`.
- Памятка союзника: `docs/comms/ALLY_PRIMER.md`.
