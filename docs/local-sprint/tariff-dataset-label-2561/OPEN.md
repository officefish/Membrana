# Membrana Local Sprint OPEN: tariff-dataset-label-2561

| Поле | Значение |
|------|----------|
| Sprint | `tariff-dataset-label-2561` |
| Procedure | `membrana-local-sprint` |
| Issue | [#2561](https://github.com/officefish/Membrana/issues/2561) — подпись системного набора на приборе зашита строкой «Базовый набор (free-v1)» и не следует за каталогом тарифа |
| Отделено | [#2563](https://github.com/officefish/Membrana/issues/2563) — бейдж назначенного каталога в библиотеке узла (снимок квоты выбрасывает `dataset`) — перерезкой 03.10 |
| Cut | [`tariff-dataset-label-2561.json`](../../sprint/cut/tariff-dataset-label-2561.json) — ратифицирован владельцем 03.10 (развилка 1: «Назначенный каталог»), переподписан после перерезки |
| Cutter | dynin → [`cut-tariff-dataset-label-2561-dynin.md`](../../discussions/cut-tariff-dataset-label-2561-dynin.md) · лента актов [`trail/tariff-dataset-label-2561.jsonl`](../../sprint/cut/trail/tariff-dataset-label-2561.jsonl) |
| Lead | dynin |
| Support | angelina (модератор, гейт, приёмка b3) |
| Branch / tree | `fix/tariff-catalog-switch` от `origin/main` `7c895b5e` · `Membrana-installstate` |
| Status | OPEN · b1 сдан (`c8d46535`), b2 снят перерезкой, b3 — живая приёмка владельцем |

## Вердикт фазы 1 (разбор 03.10, подробно — в теле #2561)

- **По замыслу:** «Наблюдательный пункт» на наборе блокпоста (`checkpoint-v1-catalog`) — заглушка по слову владельца 08.09 (гранула `tariff-datasets/resource.json:31-40`, сетка `tariff-grid.json:238-240,278`, `M5_AGENDA.md:17,24`). Переключение каталога при смене тарифа работает (прод 03.10: `dataset.catalogId checkpoint-v1-catalog`, 120 проб). Наполнение набора блокпоста не сформировано — записано (`M5_AGENDA.md:26`), ждёт созыва M5.
- **Дефект:** имя системной коллекции `__tariff_dataset__` зашито строкой с идентификатором тарифа (`collections.service.ts:68`, `media-library-fs.ts:141`, `memory-storage-backend.ts:108`) и при переходе не меняется — прибор показывает «Базовый набор (free-v1)» при каталоге `checkpoint-v1-catalog`.

## Блоки после перерезки

| Блок | Исполнитель | Предмет | Состояние |
|---|---|---|---|
| b1 `reserved-set-name-without-tariff-id` | dynin | имя «Базовый набор» без идентификатора тарифа на сервере записей, в Studio FS и памяти; заводская строка «(free-v1)» переименовывается при `ensureReserved` одним UPDATE, идемпотентно; имя, данное человеком, не трогается | **сдан** `c8d46535` |
| ~~b2 `library-header-shows-assigned-catalog`~~ | ~~vesnin~~ | ~~бейдж `catalogId · N проб` из снимка квоты~~ | **снят** перерезкой 03.10 → #2563 |
| b3 `live-check-closure` | angelina | живая приёмка владельцем на приборе `9e86ec85`: в заголовке библиотеки узла «Базовый набор», слова «free-v1» нет; `/quota` до и после одинаковы | ждёт выкатки media (решение владельца) |

## Порча и проверки b1 (03.10)

| Проверка | Ствол `7c895b5e` | Ветка `c8d46535` |
|---|---|---|
| P1 `collections.service.test.ts` — новая системная коллекция без идентификатора тарифа | красный: `expected 'Базовый набор (free-v1)' to be 'Базовый набор'` | зелёный |
| P1 — заводская строка переименована одним UPDATE | красный: `expected "spy" to be called 1 times, but got 0 times` | зелёный |
| идемпотентность; чужое имя не трогается | зелёный (тривиально) | зелёный |
| `media-library-fs.test.ts` — имя без идентификатора; старый манифест переименован один раз, третий магазин диск не меняет | — | зелёный 2/2 |
| `@membrana/background-media` vitest | — | 50 файлов / 444 зелёные |
| `@membrana/media-library-service` vitest | — | 14 / 181 зелёные |
| `@membrana/membrana-studio` vitest | — | 7 / 28 зелёные |
| typecheck трёх пакетов | — | exit 0 / 0 / 0 |
| lint | — | media 0, media-library 0; Studio `yarn workspace … lint` exit 127 (нет бинаря `eslint` в workspace, `yarn install` запрещён); корневым `node_modules/.bin/eslint src --ext .ts` — exit 0 |
| `yarn verify:dist-fresh` | — | 34 пакета fresh, stale 0 |
| P2 (помощник бейджа, временный тест, удалён) | красный: `systemDatasetBadgeText is not a function` | не исполнялся — предмет ушёл в #2563 |

Отступления от DoD b1, записанные честно: константа `TARIFF_DATASET_COLLECTION_NAME` живёт в `@membrana/media-library-service`; сервер записей и Studio держат **копии** (сервер записей констант библиотеки не читает; Studio-shell не импортирует сервис в main, его `constants.ts` вне зоны). Объём ≈190 строк против оценки 120 (новый тестовый файл ~105 строк).

## Перерезка (03.10)

**Слово владельца:** «Сдать блок 1, бейдж — отдельно» (передано модератором Ангелиной).

**Повод.** План и DoD b2 опирались на `snapshot.quota.dataset.catalogId`. В снимке библиотеки этого поля нет: `packages/services/media-library/src/types.ts:49-63` — `StorageQuota` несёт байты, `backend`, `serverReachable`, `bufferUsedBytes/LimitBytes`, `readAt`; `src/backends/server-storage-backend.ts:368-390` — `getQuota()` читает ответ `/quota` (DTO с `dataset`, строка 76) и выбрасывает `dataset` при маппинге. В фазе 1 DTO ответа был принят за снимок — ошибка замера. Чтобы нарисовать бейдж без нового запроса (BLOCK b2(а)), нужны три файла пакета библиотеки — вне зон b1 и b2. По норме «выход за границы — СТОП и доклад» работа остановлена до слова владельца.

**Решение.** b2 снят из спринта целиком; предмет — одно необязательное поле `dataset` в `StorageQuota`, его проброс в `getQuota`, помощник `systemDatasetBadgeText` в `SampleLibraryModule`, зубы — Issue #2563 (туда же порча P2 и факт, что кабинет уже рисует `catalogId`: `SampleLibraryMainPanel.tsx:127-130`, `SampleLibrarySidebar.tsx:71-74`). Остаются b1 и b3; приёмка b3 сужена до «в заголовке библиотеки узла нет free-v1». Окно плана сдвинуто с 12:00Z на 10:00Z 03.10: коммит b1 лёг в 10:38Z — до прежнего начала окна.

**Что не меняется.** Границы b1 (сдан), вердикт фазы 1, out-of-scope (наполнение набора блокпоста — M5; гранула SSOT не трогается — развилка 4 по слову владельца; старые строки на проде — переименование при `ensureReserved`, развилка 2).

**Инструмент.** Прежняя ратификация (2026-10-03T10:27:22Z, digest `e47b39c5…`) снята; `recut_act` в ленте с новым дайджестом; `yarn sprint:cut --plan … --ratify --at <момент слова>` → `contract`.

## Выкатка media для приёмки

Переименование заводской строки на проде произойдёт только при `ensureReserved` на **новом** сервере записей (листинг коллекций прибора, дверь `collections/ensure-reserved` при сопряжении). Без выкатки media прибор продолжит показывать имя из базы «Базовый набор (free-v1)». Studio из ветки в режиме `server` имени не меняет (имя приходит с сервера); локальное переименование касается автономного режима `electron-fs`. Выкатка — решение владельца; прод спринтом не трогался.
