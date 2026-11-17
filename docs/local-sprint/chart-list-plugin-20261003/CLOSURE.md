# Membrana Local Sprint CLOSURE: chart-list-plugin-20261003

| Поле | Значение |
|---|---|
| Sprint | `chart-list-plugin-20261003` · [`OPEN.md`](./OPEN.md) |
| Plan | [`chart-list-plugin-20261003.json`](../../sprint/cut/chart-list-plugin-20261003.json), recut B2 ратифицирован владельцем 04.10 |
| Delivery | PR [#2567](https://github.com/officefish/Membrana/pull/2567), merge `ee405f489b05fb1f48c1d597ac8857fd7c8c9ac6` |
| Production | cabinet `ee405f48`, `deploy-media-vps cabinet` pass, smoke ok |
| Acceptance | [`chart-list-acceptance-2026-08-22.md`](../../field/chart-list-acceptance-2026-08-22.md) — **PASS** |
| Gate | **pass 2/2 `honest_pair`**, 0 остановок, 0 находок |
| Experience | **hit 2/2**, точность 100%, overflow 0/2 |
| Office | RunRecord доставлен: `outcome:"sent"`, HTTP 201; `ca3d1313` найден в `membrana_archivarius.plugin-results` |

## Итог блоков

- **b1 — журнальный RunRecord.** `JournalResultsBridgeService` отправляет результат успешного
  журнального прогона в существующий `/plugin-results/runs`; отсутствие конфигурации, сеть и
  отказ office именованы и не стирают состоявшийся пользовательский отбор. Отказ задания и
  бросок executor ничего не отправляют. Контракты и endpoint не расширялись. На голове PR:
  56 файлов тестов, 550 passed, 1 skipped; typecheck и pre-push зелёные. Код влит #2567.
  После починки базы office живые прогоны `ca3d1313` (19:19:19), `c1a7942e` (19:21:54) и
  `0eb96d9f` (19:23:32) получили `outcome:"sent"`, HTTP 201; `ca3d1313` прочитан в
  `membrana_archivarius.plugin-results`.
- **b2 — живая приёмка.** Владелец 04.10 принял три критерия ×20, разнообразие ×200,
  playback/waveform и прослушивание вытесненных пар на устройстве `9e86ec85`.
  Дополнительная пара на одном `inputHash`, 3970 заданных / 1838 измеренных / объём 20 дала
  7/20 совпадений по позиции и 18/20 пересечения; первое различие — позиция 8, суммарно 567
  вытеснений. Значит разнообразие не является копией сортировки по громкости.

## Прогноз и исход

| Блок | Прогноз | Исход | Род |
|---|---|---|---|
| b1 | успешный executor пишет RunRecord; недоступный office не ломает выборку | три живых отправки получили `outcome:"sent"`, HTTP 201; `ca3d1313` записан и прочитан в office | hit, включая prod office |
| b2 | списки различатся, если дедуп вытеснит кандидата из громкостного top-20; 20/20 породит отдельную задачу | 7/20 по позиции, 18/20 пересечение, первое различие 8; отдельная задача не нужна | hit |

`sprint:experience` измерил b1 как 331 строку при оценке 230 и b2 как 299 строк при оценке
220; оба блока остались ниже порога 400. `sprint:gate` прочитал четыре следа и закрыл обе
пары без остановок.

## Уточнение наблюдения

Сохранённая строка 18:43:53 имеет criterion `loudness-over-floor`, хотя в исходном наблюдении была
названа разнообразием. Она исключена из доказательства. Повторная пара 19:21:54 / 19:23:32 имеет
одинаковые `inputHash`, `asked`, `measured` и потому является несущим сравнением.

## Живой RunRecord

Прогоны 18:43–18:47 МСК были честно отклонены office с HTTP 500 до починки базы. После починки
около 19:16 МСК кабинет доставил RunRecord прогонов `ca3d1313`, `c1a7942e` и `0eb96d9f` с
`outcome:"sent"`, HTTP 201. Запись `ca3d1313` найдена в `membrana_archivarius.plugin-results`:
b1 подтверждён живой записью в office. [#2580](https://github.com/officefish/Membrana/issues/2580)
теперь укрепляет выкатку office и не является блоком этого спринта.

## Архивация

Карточка `chart-list-plugin` остаётся `active` до отдельного решения владельца. После зелёного
`sprint:experience` и `sprint:gate` предлагается `yarn task:archive chart-list-plugin` со
свидетельствами: #2567 / `ee405f48`, этот CLOSURE, живой протокол 04.10 и prod-запись `ca3d1313`.
