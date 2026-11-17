# Membrana Local Sprint OPEN: archive-gc-journal-2588

| Поле | Значение |
|------|----------|
| Sprint | `archive-gc-journal-2588` |
| Procedure | `membrana-local-sprint` |
| Issue | [#2632](https://github.com/officefish/Membrana/issues/2632) — уборщик холодного архива с журналом заданий: доказать удаление по сроку (продолжение [#2588](https://github.com/officefish/Membrana/issues/2588), ADR-0031 п.4) |
| Cut | [`archive-gc-journal-2588.json`](../../sprint/cut/archive-gc-journal-2588.json) — v2, **ратифицирован владельцем 2026-10-08T12:49:21Z** (digest `0f4f5696…`) |
| Консилиум | [`archive-gc-journal-2026-10-08.md`](../../seanses/archive-gc-journal-2026-10-08.md) — 8 вердиктов |
| Шторм | [`REPORT.md`](../../storm/storm-archive-gc-questions-2026-10-08/REPORT.md) — Т1–Т6 закрыты словом владельца |
| Cutter | vesnin → [`cut-archive-gc-journal-2588-vesnin.md`](../../discussions/cut-archive-gc-journal-2588-vesnin.md) · лента актов [`trail/archive-gc-journal-2588.jsonl`](../../sprint/cut/trail/archive-gc-journal-2588.jsonl) |
| Lead | vesnin |
| Support | angelina (модератор: раздача блоков, гейт, приёмка) |
| Окно | 2026-10-08T12:00Z — 2026-10-24T20:00Z |
| Status | OPEN · ратифицирован; исполнение начато с g0 и g1a |

## Зачем

Слово владельца 08.10: убедиться, что удаление по истечении срока действительно происходит;
для этого — уборщик, работающий по своему журналу заданий. Нынешняя уборка (#2588 b5/b6)
удаляет, но не доказывает: итог — строка лога.

## Блоки (17, ни один не больше 400 строк)

Состав и границы — строго по плану; правка состава — только перерезкой и словом владельца.

| Ветка | Блок | Исполнитель | Оценка | Состояние |
|---|---|---|---|---|
| — | g0 `g0-office-env-sweep-flags` | ozhegov | 40 | в работе |
| media | g1a `g1a-media-journal-schema` | vesnin | 180 | в работе |
| media | g1b `g1b-media-journal-store` | dynin | 270 | ждёт g1a |
| media | g2 `g2-media-blob-removal-proof` | kuryokhin | 220 | может идти параллельно g1b |
| media | g3a `g3a-media-retry-policy` | dynin | 210 | может идти параллельно g1b |
| media | g3b `g3b-media-gc-runner` | tarasov | 340 | ждёт g1b, g2, g3a |
| media | g4 `g4-media-journal-schedule-verify-door` | ozhegov | 330 | ждёт g3b |
| office | g5a `g5a-office-journal-proxy` | tarasov | 260 | ждёт g4 |
| office | g5b `g5b-office-pulse-mode` | dynin | 240 | ждёт g5a |
| панель | g6a `g6a-panel-cold-archive-api` | rodchenko | 140 | ждёт g5b |
| панель | g6b `g6b-panel-journal-pulse-widgets` | rodchenko | 240 | ждёт g6a |
| панель | g6c `g6c-panel-schedule-tab` | rodchenko | 220 | ждёт g6b |
| панель | g6d `g6d-panel-users-archive-mark` | rodchenko | 120 | ждёт g6c |
| кабинет | g8a `g8a-cabinet-media-frozen-archive-port` | kuryokhin | 140 | независима, после ратификации |
| кабинет | g8b `g8b-cabinet-delete-node-guard` | dynin | 130 | ждёт g8a |
| кабинет | g8c `g8c-cabinet-delete-refusal-ui` | rodchenko | 170 | ждёт g8b |
| приёмка | g7 `g7-live-acceptance-september` | vesnin | 160 | последним, после выкатки всех веток |

Итого ≈3410 строк в 17 PR.

## Порядок (из `//order` плана)

g0 — сразу. Ветка media: g1a → g1b → g2 → g3a → g3b → g4. Ветка office и панели — после g4:
g5a → g5b → g6a → g6b → g6c → g6d. Ветка кабинета (Т3) независима: g8a → g8b → g8c.
g7 (живая приёмка Т4 на аккаунте september) — последней.

## Вне спринта

Боевое включение уборки (`DRY_RUN=false` на проде) — отдельное слово владельца после g7.
Выкатка и прод — не исполнителем блока. Замер объёма тома — P2. Отдельный cron у media,
переключатель live в интерфейсе, пересчёт сроков уже замороженных партий — отвергнуты.

## Открыто вне плана (из REPORT шторма)

- Судьба партии `160dba7f` (срок 08.10 20:28 МСК) до появления уборщика — слово владельца в чате.
- Включение нынешней уборки на проде для сценария Т4 (до уборщика или после) — слово владельца.

## След исполнения

Прогон процедуры открыт записью `docs/procedure-runs/trail/2026-10-08.jsonl` (runId
`archive-gc-journal-2588`, `forecastRequired: true`). След блоков — `docs/sprint/trail/archive-gc-journal-2588.jsonl`
(`context_run` + `review_pass` исполнителя блока), разборы — `docs/discussions/<блок>-2588-<исполнитель>.md`.
