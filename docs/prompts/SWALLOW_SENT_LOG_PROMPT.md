# Промпт: журнал отправок ласточки / дайджеста (`sent-log`)

> **Task-промпт.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **XS**. Артефакт: **1 PR** — append-only след в `docs/comms/sent-log.jsonl`.
> Реестр: `id` = `swallow-sent-log`. **GitHub Issue:** [#585](https://github.com/officefish/Membrana/issues/585).

---

## Контекст

#585: вопрос «ушла ли ласточка» невыводим — `telegram-swallow` только `console.log`,
наличие файла в `drafts/` ничего не доказывает. Факт должен быть предикатом
(grep по журналу), не владельческим токеном (#576).

Уже есть (не путать): `.membrana/swallow-deliveries.jsonl` (#664) — gitignore,
идемпотентность таймаута. #585 — **видимый в репо** след для графа правды.

### Что построить

1. `scripts/lib/comms-sent-log.mjs`:
   - путь по умолчанию `docs/comms/sent-log.jsonl`;
   - запись: `{ ts, kind: 'swallow'|'digest', file, sha256, sent, office_response }`;
   - тело текста **не** писать — только sha256 (+ относительный `file`, если был `--file`);
   - `office_response` — урезанный `{ sent, message_id }` без сырого payload.
2. `telegram-swallow.mjs`: после `sent=true` (outcome `delivered`) — append.
3. `telegram-ritual-digest.mjs`: после успешного accept office с `sent=true` — append
   (`kind: digest`, file = путь артефакта, sha256 от стабильного fingerprint).
4. Тесты: запись после delivered; dry-run не пишет; хелпер «есть ли sha в логе».
5. Строка в `docs/comms/README.md`.

### Out of scope

Редактура ласточки (#569), server-side message_id в office (NB6 follow-up),
смена ledger #664, автоотправка из ритуала.

### DoD

- [ ] После `sent=true` есть строка в `docs/comms/sent-log.jsonl`.
- [ ] Вопрос «ушла ли» = предикат по sha256/file, не вопрос владельцу.
- [ ] Тесты в `test:scripts`. LGTM Teamlead. `Closes #585`.

---

## Закрытие

`yarn task:archive swallow-sent-log --notes "PR #…"`.
