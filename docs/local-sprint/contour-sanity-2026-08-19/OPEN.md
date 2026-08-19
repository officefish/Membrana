# Membrana Local Sprint OPEN: contour-sanity-2026-08-19

| Поле | Значение |
|------|----------|
| Sprint | `contour-sanity-2026-08-19` |
| Issue | [#1972](https://github.com/officefish/Membrana/issues/1972) (хвосты) · эпик [#1961](https://github.com/officefish/Membrana/issues/1961) · точка входа `docs/prompts/SESSION_G_CONTOUR_SANITY_SPRINT_2026-08-19.md` |
| Plan | [`docs/sprint/cut/contour-sanity-2026-08-19.json`](../../sprint/cut/contour-sanity-2026-08-19.json) (ратифицирован владельцем 19.08 09:08Z, «ратифицирую») |
| Cutter | ozhegov ([конспект](../../discussions/cut-contour-sanity-ozhegov.md)) |
| Blocks | rag-red-diagnosis (dynin) → rag-red-resolution (dynin) · review-1951-vesnin · review-1953-kuryokhin · wav-decode-lib (ozhegov) → executor-tails (ozhegov) · host-import-singleton (ozhegov) |
| Status | gate pass 7/7 honest_pair (0 находок) · прогноз↔исход **hit** (7/7, overflow 0) · журнал: close pass |

## Предмет

Четыре дефекта контура прогонов, накопленные фидбеком 16–18.08 и никем не взятые. Слово
владельца 19.08: только через `membrana-local-sprint`, у каждого дефекта — своя персона.

| # | Дефект | Держатель | Блоки |
|---|---|---|---|
| 1 | `@membrana/rag-service#test` красный третий день без диагноза | Дынин | 1 диагноз → 2 решение |
| 2 | Ревью-долг #1951 (mfcc в измерителе) и #1953 (`field:capture`) — питают калибровочный корпус | Веснин / Курёхин | 3, 4 — протоколы персон |
| 3 | Хвосты #1972: третья копия WAV-декодера; `nodeId: null`; зуб границ импортов regex'ом | Ожегов | 5, 6 |
| 4 | Модульный синглтон `pluginContractsPromise` в хосте (и тот же узор в `plugin-results.service.ts` офиса) | Ожегов | 7 |

**Не дефект (сверено 18.08):** «красный `background-media#test`» — локальный прогон без связи
на новый пакет в песочнице; CI на стволе зелёный. Не чинить.

## Наблюдение до диагноза (материал резчика, не вывод)

Изолированный прогон rag 19.08 11:20: 4 падения из ~45, все — про **время** (таймаут 30 с;
три `P@5` с `expected 8803/14466/8102 to be less than 8000`), ни одно — про качество поиска.

## Итог блоков

- **1 — диагноз (Дынин)** — [`rag-service-red-diagnosis-dynin.md`](../../discussions/rag-service-red-diagnosis-dynin.md): падают только ЧАСЫ. `keywordSearch` по живому репозиторию = `git log --since=30 days` (6,9 с: 868 коммитов, 4 061 путь) + 2 543 документа — 7–8 с на вызов; вечерний `code-review` гоняет `turbo run test --concurrency=3` (`context-collector.mjs:149`) → под нагрузкой 30 с пробиты → `exited (1)` (воспроизведено той же командой). В изоляции 45/45 зелёный; CI — другая машина. Трижды лечили подъёмом порога — корпус растёт быстрее.
- **2 — решение (Дынин)** — вариант 1: `keywordSearch` на корпусе-фикстуре (функция, не диск) — 45/45 за 12 с и под turbo; acceptance печатает время, валит только при `RAG_ACCEPTANCE_TIMING_MS`. Код `rag-service` не тронут. PR #1983.
- **3 — ревью #1951 (Веснин)** — LGTM, долг закрыт: измеритель судит пакетом, ворота из одного источника, самозамер назван; `evaluatePipe([])` — именованный отказ. [протокол](../../discussions/review-pr-1951-mfcc-benchmark-vesnin.md).
- **4 — ревью #1953 (Курёхин)** — LGTM с рекомендацией: тракт сырой/PCM16/вход 1 честен, но умолчание `--rate 44100` против ворот mfcc 48 000 делает часть корпуса несудимой (живое следствие — `refused` 18.08); сочинённая посылка инструмента снята. [протокол](../../discussions/review-pr-1953-field-capture-kuryokhin.md). PR #1984.
- **5 — `@membrana/wav-decode` (Ожегов)** — один декодер (CJS нарочно: media на Node 20) вместо трёх копий; plugin-handlers / media / `wav-read.mjs` переведены; grep-зуб «своего RIFF-разбора не осталось».
- **6 — хвосты executor (Ожегов)** — `nodeId` несёт `sampleId`; граница импортов — `no-restricted-imports` (Prisma/Nest/fs/сеть/mongodb/background-*), зуб гоняет ESLint API.
- **7 — синглтон (Ожегов)** — обещание импорта контрактов стало полем экземпляра в хосте collections **и** в `PluginResultsService` офиса; ошибка импорта больше не залипает; шов `loadContracts`. Глубже — не тронуто.

## Что НЕ сделано

`media#test` — не трогался (не дефект). Умолчание `--rate` в `field:capture` — вне зон, рекомендация Курёхина уходит отдельной карточкой. `evaluatePipe` на записи короче кадра — P3 Веснина, не делалось. Прежние раскиданные по трём домам WAV-парсеры сведены, но `measureWav` в `field-capture.mjs` (измеритель уровня) читает заголовок сам — четвёртый разбор, названо, не трогалось (другой предмет: уровень, не декодирование).
