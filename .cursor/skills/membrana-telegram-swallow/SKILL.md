---
name: membrana-telegram-swallow
description: >-
  Sends a one-off owner-triggered message («ласточка») to the private ally telegram group
  via yarn telegram:swallow (office push-ingest, md→Telegram-HTML). Use ONLY when the owner
  explicitly commands: «ласточка», «отправь союзникам/партнёрам», «сообщение в группу»,
  «опубликуй в телеграм». Do NOT use for ritual digests (they run automatically via
  ritual:day/evening) or for alarm/product notifications (product feature, out of scope).
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
3. **Тон и содержание:** аудитория нетехническая; без секретов, токенов, внутренних
   URL/IP; SHA и номера PR допустимы одной строкой «деталей». Правило
   «по-простому: что это значит для продукта».
4. Лимит 4096 символов md; длиннее — сократить или разбить на две ласточки.

## Команды

```bash
yarn telegram:swallow "Текст с **md**: жирный, *курсив*, [ссылка](url), `код`"
yarn telegram:swallow --file docs/comms/drafts/note.md
yarn telegram:swallow "..." --dry-run    # показать payload, не отправлять
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
