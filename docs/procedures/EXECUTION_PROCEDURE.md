# EXECUTION_PROCEDURE — интерфейс маршрута разработки

`EXECUTION_PROCEDURE` — надстройка над общей формой процедуры для рода
`разработка`. Он не описывает заседания, штормы, ADR и ритуалы: у них другой
продукт и другой будущий интерфейс.

## Правило вывода

Поле становится обязательным только если оно заполняется для всех прожитых
маршрутов разработки. Проверка велась опровержением: один маршрут, где поле не
заполняется без натяжки, переводит поле в частные.

Проверенный корпус:

| Маршрут | Материал |
|---|---|
| `one-shot` | `docs/procedures/one-shot/MANIFEST.json` |
| `membrana-local-sprint` | `docs/procedures/membrana-local-sprint/MANIFEST.json` |
| `hackathon` | `docs/procedures/hackathon/MANIFEST.json` |
| `containerization` | `docs/procedures/containerization/MANIFEST.json` |
| `day-sprint` | `docs/procedures/day-sprint/MANIFEST.json` |
| `cowork` | `docs/COWORK_SPRINT_REGULATION.md`, `docs/cowork-sprint/` |
| `competition` | `docs/COMPETITION_SPRINT_REGULATION.md`, `docs/competition-sprint/` |
| `night-sprint` | `docs/NIGHT_SPRINT_REGULATION.md`, `membrana-night-sprint` |

`marathon` намеренно не входит в корпус: прожитого тела нет.

## Обязательные поля

| Поле | Обоснование | Проверка корпусом |
|---|---|---|
| `id` | Маршрут должен иметь стабильное имя для выбора, реестра и ссылок. | Есть у пяти манифестов; у безманифестных выводится из канона: `cowork`, `competition`, `night-sprint`. |
| `leadPersona` | У маршрута должен быть держатель формы: кто отвечает за границы маршрута, не за каждую правку внутри. | Манифестные маршруты несут lead; cowork/competition/night называют координатора или Vesnin как держателя gates. |
| `trigger` | Должен быть вход в маршрут: слово капитана, команда или событие. | Есть как `captain-word`/команда у манифестов; cowork `cowork:open`, competition `comp:open`, night `night:open`. |
| `steps` | Маршрут без хода не исполним: нужны фазы или честное `none` с причиной. | У всех образцов есть жизненный цикл, пусть у parallel routes это фазы, а не линейная эстафета. |
| `gates` | Маршрут обязан сказать, где поток останавливается или почему человеческой паузы нет. | Owner-ratify, interface gate, jury/winner, checkpoint/handoff или честное `gates.none`. |
| `frames` | Development route должен назначать держателей значимых кадров, иначе ответственность растворяется в тексте. | У манифестных маршрутов есть кадры или выводимые фазы; у cowork/competition/night держатели фаз названы регламентом. |
| `mode` | Нужен режим исполнения: local/orchestrated/mirrored влияет на ожидания от следа и гейта. | Все маршруты исполняются как локальный или оркестрированный поток; без режима нельзя отличить one-shot от ночного субагента. |
| `home` | Должно быть ясно, есть ли собственный дом маршрута, или его честно нет. | У всех манифестных маршрутов можно записать `home.none`; у безманифестных есть run-дома, но не контейнер определения. |
| `portfolio` | Мастерская должна честно показать примеры или отсутствие портфолио. | У части маршрутов портфолио есть; у `one-shot`, `day-sprint`, `containerization` отсутствие записывается как `missing`, а не молчание. |
| `precedents` | Для прожитого route-interface нужен источник формы, иначе маршрут сочинён. | Все построенные development-процедуры несут прецеденты; безманифестные проверялись по регламентам и run-домам. |

## Частные поля

| Поле | Чьё | Почему не общее |
|---|---|---|
| H1-H4, `stage-completion-checklist`, handoff gate | `hackathon` | Cowork строит параллельно, competition выбирает победителя, night работает автономной ночью. |
| `blocks`, `EXPECTATIONS.md`, `INTERFACE_CONTRACT.md`, адаптеры интеграции | `cowork` | У one-shot и night нет трёх изолированных частей одного ответа. |
| `teams alpha/beta/gamma`, scorecard, jury, winner | `competition` | Cowork мёржит все блоки, hackathon не выбирает альтернативу. |
| NB-фазы, checkpoint cadence, `HANDOFF.md`, `always-yes` guard | `night-sprint` | Дневные маршруты не исполняются безнадзорно между вечерним и утренним ритуалом. |
| Порог one-shot и один review-атом | `one-shot` | Большие и командные маршруты легально имеют несколько review-границ. |
| `sprint:cut`, `sprint:gate`, procedure-run journal | `membrana-local-sprint` | Это локальный accountable sprint, не общий закон для competition/cowork/night. |
| Кит крафта и layer/container teeth | `containerization` | Это маршрут контейнерного крафта, а не обязательный контур разработки вообще. |

## Что интерфейс намеренно не описывает

- Не описывает интерфейс рода `решение`: для `meeting`, `storm`, `consilium` и
  `adr` нужен отдельный вывод из их образцов.
- Не строит `marathon`: без прожитого тела любое поле было бы догадкой.
- Не требует единой топологии. Линейная эстафета, параллельная изоляция,
  конкурс и автономная ночь остаются частными формами маршрутов.
- Не заводит манифесты `cowork`, `competition`, `night-sprint`: они были
  материалом проверки, а не зоной миграции этой работы.

