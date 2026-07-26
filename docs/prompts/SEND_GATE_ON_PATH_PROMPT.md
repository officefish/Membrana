# Промпт: Гейт отправки на путь отправки (#1233)

> **S** · `send-gate-on-path` · [#1233](https://github.com/officefish/Membrana/issues/1233) · lead **dynin**

## Контекст

Страж, который не стоит на пути, — не страж. Утром 26.07 `canSend: TRUE` держался на
`ownerAck` от 22.07 по другому черновику. Предикаты не знали о дате; `telegram:swallow`
гейт не спрашивал.

## Промпт целиком

### Кто ты

Дынин + Ожегов: чистое ядро предикатов и тонкий адаптер отправителя. Без прод-сервисов.

### Что сделать

1. Предикаты `magistralChosen` / `swallowApproved` / `canSend` требуют `today` и
   `state.day === today`. Состояние старше — причина `day: … протухло`.
2. `freeze` / `--draft` штампуют `state.day`. Digest черновика = sha256(trim(text)).
3. `telegram:swallow` перед транспортом зовёт `canSendAlly` (день ∧ ack ∧ digest).
   `--force` обходит только ledger, не гейт. `--dry-run` гейт не зовёт.
4. Вечер: тот же swallow-контур (`canSendAlly`); magistral остаётся утренним.
5. Ангелина в приветствии читает `canSend(state, todayIso())`.

### DoD

- [ ] Вчерашний ack → `canSend` / `canSendAlly` false с причиной `day:`
- [ ] Чужой файл (digest ≠ draft) → отправитель exit 3, fetch не вызван
- [ ] Юнит-тесты morning-gates + gate path в telegram-swallow зелёные
- [ ] Решение по вечеру зафиксировано в JSDoc ядра

### Out of scope

Гигиена деревьев #1232 · формат ласточки #918 · резак секретов.
