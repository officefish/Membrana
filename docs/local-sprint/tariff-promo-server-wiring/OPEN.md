# Membrana Local Sprint OPEN: tariff-promo-server-wiring

| Поле | Значение |
|------|----------|
| Sprint | `tariff-promo-server-wiring` |
| Procedure | `membrana-local-sprint` |
| Registry card | `tariff-promo-server-wiring` (#1761, магистраль 12.08 — owner-choice из перезамороженного топ-3 с продуктовой строкой) |
| Plan | [`docs/sprint/cut/tariff-promo-server-wiring.json`](../../sprint/cut/tariff-promo-server-wiring.json) (v1 ратифицирован 17:11Z) |
| Cutter | vesnin ([прогон контекста](../../discussions/cut-tariff-promo-20260812-vesnin-run.md)) |
| Blocks | b1 эндпойнт погашения (ozhegov) · b2 UI промокода в кабинете (rodchenko) |
| Forecast | `vesnin-tariff-promo-server-wiring-cut-1` ДО исполнения; исход `cut-2`: **hit**, точность 2/2 (b1 190/прогноз 170 · b2 218/прогноз 190, порог 400) |
| Status | **gate pass** (2/2 honest_pair, 0 находок) |

## Зачем

Магистраль 12.08: `decideTransition` готов и покрыт 16 зубами, но не вызывался никем.
Провод домена до пользователя: эндпойнт + UI. Четыре развилки #1761 разрешены обзором
до нарезки (1, 2, 4 — фактом ствола; 3 — полная причина по DoD).

## Итоги блоков

- **b1** — `POST v1/membranes/me/tariff/promo-redemptions`: SessionGuard, мембрана из
  сессии (телом не подменяется), DTO ровно `{code}` с транспортной валидацией, исход
  `TransitionOutcome` дословно 200-кой (публичный HTTP-контракт, менять через ADR),
  `TariffModule` зарегистрирован в AppModule. Зубы: 25 (12 причин различимо
  параметризованно, unknown ≠ already_redeemed, мусор 400 до сервиса).
- **b2** — форма в карточке «Тариф» (не модалка), успех только после ответа сервера +
  рефетч без reload, все отказы одним alert-error, словарь `promoDenyText` follower
  1:1 с зубом полноты и fallback «Неизвестная причина: <код>» (рассинхрон не молчит).

## Долг, названный вслух (вне спринта)

Rate-limit / anti-brute на эндпойнт погашения (прогон Веснина 12.08).
