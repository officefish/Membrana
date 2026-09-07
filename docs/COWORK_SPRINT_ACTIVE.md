# Cowork Sprint Active

| Поле | Значение |
|------|----------|
| **status** | `open` |
| sprintId | `cowork-buffer-full-stop` |
| brief | [`COWORK_SPRINT_BRIEF.md`](./cowork-sprint/cowork-buffer-full-stop/COWORK_SPRINT_BRIEF.md) |
| вход | заседание [`buffer-full-stop/EPIC.md`](./meeting/buffer-full-stop/EPIC.md) (#2306, влито `edcbbda9`); билеты #2307 / #2308 / #2309, поверх #2310 |
| BASE_SHA | `edcbbda9` (= origin/main на момент открытия) |
| openedAt | 2026-09-06 |
| owner cut ratification | формат и нарезка — слово владельца 06.09 («Б — коворк „полный буфер“, три изолированных блока»); билеты выписаны рукой владельца из эпика |
| current phase | **5 — Merge + archive** |
| integration deadline | 2026-09-09 fallback (гейт событийный: ready(A) ∧ ready(B) ∧ ready(C)) |
| координатор | сессия Б, дерево `Membrana-cw-buffer-full`, ветка `cowork/cowork-buffer-full-stop/coordination` |

## Blocks

| Блок | Билет | Ветка | Worktree | Фаза | Готовность |
|------|-------|-------|----------|------|------------|
| `refusal-contract` (A) | #2307 | `cowork/cowork-buffer-full-stop/refusal-contract` | `Membrana-cw-refusal` | freeze | `f05e4bdc`; 35 зубов samples + 33 plugin-contracts, 9 порч красные; сверено координатором (5 файлов/35 + 2/33 зелёные, вне зоны только `verify-swagger.mjs` — судья swagger, зона по смыслу) |
| `overflow-policy` (B) | #2308 | `cowork/cowork-buffer-full-stop/overflow-policy` | `Membrana-cw-policy` | freeze | `769fbbc8`; 42 файла, все в зоне; сверено координатором: media devices 4/50, cabinet pair+membrane 6/65, client buffer-policy 3/19, cabinet UI 1/10 зелёные, `verify:swagger` кабинета OK |
| `device-hold` (C) | #2309 | `cowork/cowork-buffer-full-stop/device-hold` | `Membrana-cw-hold` | freeze | `b420c930`; 35 файлов, все в зоне; сверено координатором: client 14/87, core 5/51, cabinet 2/15 зелёные, `verify:wire-sync` OK; 6 порч красные |

Все три ветки заведены от одного `BASE_SHA edcbbda9`.
Integration-ветка: `cowork/cowork-buffer-full-stop/integration` — заводится координатором в Phase 4.

## Что НЕ входит блоком

**#2310 — окно оператора (M5).** Строится только из ответа A и статуса C без второго запроса
квоты: горячий шов с двумя блоками сразу, на стабах это была бы ложная резка. Урок 02.09:
если блоки дают части, четвёртый — сборка, и он назван заранее. Делается после Phase 4 на
ветке `integration` или отдельным заданием по слову владельца.

## Известные швы — намеренно не согласованы

Шесть швов названы в брифе («Известные швы»): пакет словаря причин; чтение политики прибора
блоком A у B; чтение эффективной политики блоком C у B; форма разбора ответа A на клиенте;
носитель эпизода и `overflowAt` на сервере; значение состояния узла (C один на обоих концах).
Каждый блок объявляет ожидание односторонне в `EXPECTATIONS.md`. Сведение — Phase 3.

## Phase Ledger

| Фаза | Состояние | Дата | Артефакт |
|------|-----------|------|----------|
| 0 — Brief + open | ✅ закрыта | 2026-09-06 | brief по замеру ствола, ACTIVE, карточка реестра, 3 ветки от `edcbbda9`; предыдущий спринт закрыт `cowork:close` |
| 1 — Concept | ✅ закрыта | 2026-09-06 | три `CONCEPT.md` + первые `EXPECTATIONS.md` |
| 2 — Isolated build | ✅ закрыта | 2026-09-06 | все три DoD зелёные на стабах, сверено координатором прогоном; гейт сработал по предикату в день открытия, дедлайн 09.09 не понадобился |
| 3 — Interface Consilium | ✅ закрыта | 2026-09-06 | [протокол](./discussions/cowork-sprint-cowork-buffer-full-stop-interface-consilium.md) + [`INTERFACE_CONTRACT.md`](./cowork-sprint/cowork-buffer-full-stop/INTERFACE_CONTRACT.md); 10 адаптеров, эскалации нет |
| 4 — Integration | ✅ закрыта | 2026-09-07 | ветка `cowork/cowork-buffer-full-stop/integration` (`0585f0ba` + доки): 10 адаптеров, переписано 0, стабов и временной константы нет; сверено координатором: media 9/91, client 13/84, cabinet 3/25, wire-sync, оба swagger зелёные; протокол `INTEGRATION_CHECKS.md` |
| 5 — Merge + archive | в работе | 2026-09-07 | один PR integration → main; мердж — слово владельца; `RETROSPECTIVE.md` написана |

## Сверено в стволе до нарезки (06.09)

Полная таблица — в брифе. Ключевое: отказ по квоте сегодня — 413 с английским текстом
(`samples.service.ts:121-134`); поля политики у `Device` нет; локальная политика на клиенте
`auto-cleanup` по умолчанию; 413 на клиенте маппится в `QUOTA_EXCEEDED` без потребителя;
значения «остановлен: буфер полон» в `RuntimeStatePayload.phase` нет; `overflowId`,
`DeviceOverflowHold` — 0 совпадений. **`@membrana/background-media` не зависит от
`@membrana/core`** — выбор пакета словаря за блоком A, строка зависимости — на интеграции.
