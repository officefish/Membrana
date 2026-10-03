# Аудит `chart-list-plugin` на `origin/main`

Дата сверки: 2026-10-03. Ствол: `2e59a5c33b56df29e11d72db790029625e5ce32d`.
Задание: `docs/prompts/SESSION_B_CHART_LIST_TASK.md`.

Вердикт `done` означает, что предмет есть именно в кабинете и подтверждён кодом и зубом;
`partial` — выполнена только часть обещания; `missing` — требуемого вещдока нет.

## Пункты задания

| № | Требование | Вердикт | Свидетельство в стволе |
|---|---|---|---|
| 1 | Отбор поверх журнала, четыре объёма и три критерия | done | `packages/plugin-handlers/src/chart-list/selection.ts:31-45,294-300`; `apps/cabinet/src/plugins/chart-list/chartList.ts:19-28`; зубы `selection.test.ts:74-84` |
| 2 | Плагин журнала: настройки справа, кнопка ниже, журнал сворачивается | done | `apps/cabinet/src/pages/JournalPage.tsx:68-88,164-184`; `PagePluginsSidebar.tsx:42-99`; `PagePluginArea.tsx:78-99`; основной коммит `3c25eb06` (PR #2074), вёрстка `a04e0526` (PR #2093) |
| 3 | Та же строка, playback/waveform; delta/structure/peak без дублей полей журнала; пагинация | done | `ChartListWidget.tsx:29-30,85-95,166-177,197-205`; используется `CabinetLiveJournalItemRow`; `chartList.test.ts:112-169` |
| 4 | Выборка хранится у аккаунта в БД кабинета и открывается по адресу | done | `prisma/schema.prisma:350-392`; `selection.service.ts:71-96,105-119`; `selection.controller.ts:89-96`; зубы `selection.service.test.ts:100-172` |
| 5 | Внутренний след `RunRecord` в office | partial | Адрес и отпечаток есть: `journal-run-address.ts:58-75,89-96`, оркестратор передаёт их `chart-list.orchestrator.ts:103-125`. Но `JournalPluginHostService.requestWithTask` лишь вызывает executor и возвращает result (`journal-plugin-host.service.ts:152-183`); в `packages/background-cabinet/src` нет отправителя в `/plugin-results/runs`. Такой мост есть только у media (`packages/background-media/src/modules/plugin-results-bridge/plugin-results-bridge.service.ts:40-91`), поэтому он пишет паспорт измерителя, не журнального showcase. |
| 6 | Манифест, регистрация в доме журнала, отказ чужому дому | done | `manifest.ts:26-34`; `chart-list.registrar.ts:25-36`; красный чужому дому `integration-smoke.test.ts:69-73` |
| 7 | Без расширения plugin-contracts и схемы telemetry-journal | done | Чарт-лист экспортируется из `packages/plugin-handlers/src/index.ts:96-137`; собственные таблицы кабинета `schema.prisma:350-392`; коммит `3c25eb06` не меняет `packages/plugin-contracts` и таблицы журнала |
| 8 | Живая приёмка на часовом сеансе 21.08 | missing | `docs/field/chart-list-acceptance-2026-08-22.md:5-18` по-прежнему говорит **НЕ ПРОВЕДЕНА** и фиксирует 670 треков; лабораторная репетиция прямо не считается приёмкой (`:20-27`). Владелец в текущем задании называет корпус 671 трек. |

Итого по пунктам задания: **6 done / 1 partial / 1 missing**.

## Два пробела почвы

| Пробел | Вердикт | Свидетельство |
|---|---|---|
| Чем адресовать журнальный прогон | done | `collectionId = 'journal'`, роль и цена решения документированы в `journal-run-address.ts:7-24,52-58`; зуб `journal-run-address.test.ts:15-31` |
| Что считать `inputHash` | done | SHA-256 от уникального отсортированного состава `entryIds`: `journal-run-address.ts:26-46,63-75`; зубы и сквозная сверка `chain-rehearsal.test.ts:178-193` |

Итого по пробелам: **2 done / 0 partial / 0 missing**.

## Definition of Done

| № | DoD | Вердикт | Свидетельство |
|---|---|---|---|
| 1 | Регистрация, manifest validation, отказ чужому home | done | `manifest.ts:26-34`; `chart-list.registrar.ts:25-36`; `integration-smoke.test.ts:63-96` |
| 2 | Две настройки в правом сайдбаре | done | `ChartListSettings.tsx:28-65`; `PagePluginsSidebar.tsx:42-99`; закрытые множества `chartList.ts:19-28` |
| 3 | Кнопка ниже основного блока, журнал сворачивается | done | `JournalPage.tsx:78-88,164-184`; `ChartListWidget.tsx:125-133`; `PagePluginArea.tsx:78-99` |
| 4 | Та же строка журнала с playback/waveform | done | `ChartListWidget.tsx:7-8,29,92-96,174-178` |
| 5 | delta/structure/peak; без узла и дублей | done | `ChartListWidget.tsx:85-95,166-177`; контракт строки `selection.test.ts:224-246` |
| 6 | Пагинация | done | `chartList.ts:129,181-193`; `ChartListWidget.tsx:197-205`; зубы `chartList.test.ts:112-136` |
| 7 | Живучесть у аккаунта, открытие по адресу | done | `selection.service.ts:105-119`; `selection.controller.ts:89-96`; зубы `selection.service.test.ts:100-172` |
| 8 | `RunRecord` и ответы по адресации документированы | partial | Ответы документированы и исполняются (`journal-run-address.ts:7-46,69-96`), но журнальный `RunRecord` в office не отправляется; наличие media-моста не закрывает паспорт showcase. |
| 9 | Зубы: три критерия, негодное задание, сохранение | done | `selection.test.ts:74-84`; `journal-plugin-host.service.test.ts:133-196`; `selection.service.test.ts:100-172` |

Итого по DoD: **8 done / 1 partial / 0 missing**.

Общий счёт по 19 проверенным формулировкам: **16 done / 2 partial / 1 missing**.

## Кабинет и Studio

- **Кабинет, журнал:** самостоятельный `membrana.showcase.chart-list` смонтирован в
  `background-cabinet/journal`; UI находится в `apps/cabinet/src/plugins/chart-list/` и подключён
  на `JournalPage`. Это искомый кабинетный близнец, а не ссылка на Studio.
- **Studio, библиотека:** отдельная витрина `sample-library-chart-list` живёт в
  `apps/client/src/plugins/sample-library-chart-list/` и вызывает
  `membrana.showcase.library-chart-list` (`packages/plugin-handlers/src/chart-list-library/manifest.ts:26-36`).
  Она отбирает коллекцию media и не заменяет журнальный плагин.
- **Кабинет, библиотека:** есть ещё кабинетная панель коллекционного варианта
  `CabinetSampleChartListPanel.tsx:8-19,180-203`; это также другой дом и другой вход.

## Команды

```text
git rev-parse HEAD
2e59a5c33b56df29e11d72db790029625e5ce32d

yarn workspace @membrana/plugin-handlers test src/chart-list/selection.test.ts src/chart-list/executor.test.ts
2 files passed; 51 tests passed

yarn workspace @membrana/cabinet test src/plugins/chart-list/chartList.test.ts
1 file passed; 23 tests passed

yarn workspace @membrana/background-cabinet test \
  src/modules/journal/plugin-host/integration-smoke.test.ts \
  src/modules/journal/plugin-host/journal-run-address.test.ts \
  src/modules/journal/selection/selection.service.test.ts
3 files passed; 27 tests passed

yarn workspace @membrana/background-cabinet test src/modules/journal/selection/chain-rehearsal.test.ts
1 file passed; 9 tests passed

git grep -n "plugin-results/runs" -- packages/background-cabinet/src
exit 1; совпадений нет

porcha b1: потребовать office RunRecord POST от journal host
exit 1; PORCHA b1 RED: journal host has no office RunRecord POST

porcha b2: запретить статус НЕ ПРОВЕДЕНА в живом протоколе
exit 1; PORCHA b2 RED: live owner acceptance is not completed
```

Перед сквозным тестом новый worktree потребовал собрать локальный граф зависимостей:
`yarn turbo run build --filter=@membrana/plugin-handlers...` — 7/7 задач успешно.

## Вывод

Архивация пока неверна. Остаток состоит из двух частей: исполняемый след журнального `RunRecord`
в office и живая приёмка владельцем в кабинете. Новая нарезка
`docs/sprint/cut/chart-list-plugin-20261003.json` содержит только их.
