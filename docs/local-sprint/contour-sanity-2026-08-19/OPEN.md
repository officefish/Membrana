# Membrana Local Sprint OPEN: contour-sanity-2026-08-19

| Поле | Значение |
|------|----------|
| Sprint | `contour-sanity-2026-08-19` |
| Issue | [#1972](https://github.com/officefish/Membrana/issues/1972) (хвосты) · эпик [#1961](https://github.com/officefish/Membrana/issues/1961) · точка входа `docs/prompts/SESSION_G_CONTOUR_SANITY_SPRINT_2026-08-19.md` |
| Plan | [`docs/sprint/cut/contour-sanity-2026-08-19.json`](../../sprint/cut/contour-sanity-2026-08-19.json) — **ждёт ратификации владельца** |
| Cutter | ozhegov ([конспект](../../discussions/cut-contour-sanity-ozhegov.md)) |
| Blocks | rag-red-diagnosis (dynin) → rag-red-resolution (dynin) · review-1951-vesnin · review-1953-kuryokhin · wav-decode-lib (ozhegov) → executor-tails (ozhegov) · host-import-singleton (ozhegov) |
| Status | OPEN · нарезка предъявлена владельцу 19.08; код до ратификации не пишется |

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

_(заполняется по исполнению)_
