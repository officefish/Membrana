# Сессия Б · Мост media → office для результатов плагинов, ЧЕРЕЗ СПРИНТ

> **Это твоя точка входа.** Читай только этот файл — он самодостаточен. Остальные
> сессии идут своими полосами; в их файлы и деревья не заходи.
>
> **Правило дня — слово владельца 19.08:** вся работа идёт через `membrana-local-sprint`.
> Код до ратифицированной нарезки — нарушение.

## Где ты и что происходит

**Среда 19 августа.** Вчера принята первая волна серверных плагинов (эпик #1961):
хост `collections` в `background-media`, дом результатов `plugin-results` в Mongo
`background-office`, первый живой `membrana.handler.mfcc` с реальным `RunRecord`.

**Что осталось незакрытым — твой предмет:** результат плагина рождается в **media**
(хост), а дом результатов живёт в **office**. Провода между ними нет: вчера запись
сделал скрипт `yarn plugin:run:mfcc --host collections --tunnel office`, повторяя код
офиса. Внутри сервисов сид `onResult` в media пишет только сводку в лог. Эпик #1961
открыт **до моста**.

Держатель хвоста — Веснин («форма моста — сейчас только скрипт, провода нет»).

## Дерево

`C:\Users\user190825\practice\Membrana-weave` (38 связей).

```bash
cd C:/Users/user190825/practice/Membrana-weave
git fetch origin && git switch -c feat/results-bridge origin/main
echo "owner: сессия Б (мост результатов) · занято: 2026-08-19" > .worktree-owner
```

## Источник истины (имена — поимённо, не ссылкой)

- `docs/meeting/server-plugin-foundation/M1_VERDICT.md` — авторитет словаря:
  `RunRecord`, `RunAddress` (pluginId · version · collectionId · runId · mountTarget),
  `RunFingerprints` (inputHash · configHash), `resumeMode`.
- `M2_VERDICT.md`: дома `background-office/journal` · `background-media/collections`; хост
  результат **не возвращает** (сид `onResult` в `registerFirstWave`).
- Дом результатов: `packages/background-office/src/modules/plugin-results/`
  (`PluginResultsService.writeRun(run, state?)`, `MongoPluginResultsStore`,
  `PLUGIN_RESULTS_MONGO_URI ?? ARCHIVARIUS_MONGO_URI`).
- Хост: `packages/background-media/src/modules/collections/plugin-host.service.ts`,
  `FirstWavePluginsRegistrar` в `CollectionsModule` (сид `onResult` → лог).
- Норма #1950: измеренное не подменяется объявленным; плагины пишут **только** в
  `plugin-results`.
- Границы пакетов: media и office — разные процессы и, возможно, разные хосты;
  office достигается извне через `office.mmbrn.tech`, Mongo офиса наружу не опубликована.

## Порядок — спринт

1. Скилл `membrana-local-sprint`; карточку завести (`yarn task:register --id
   plugin-results-bridge --size M --lead vesnin --support ozhegov`) со
   `sprintKind: "membrana-local-sprint"`, `parentEpic: server-plugin-foundation`, Issue
   `--issue 1961` (упоминание, эпик не закрывать).
2. **Нарезка** (`yarn sprint:cut`). Предложение блоков:
   - **форма моста** — как результат из media попадает в office: HTTP-приём в office
     (`POST` в модуль plugin-results с ключом) · очередь · прямая Mongo из media
     (**против**: нарушает границу дома, M2/M3 отклонили). Обосновать против
     альтернатив. Персона — Веснин.
   - **приёмник в office** — эндпоинт/сервис, принимающий `RunRecord` и пишущий через
     существующий `PluginResultsService.writeRun`; валидация формы по контрактам;
     аутентификация — тем же классом ключей, что у media. Персона — Ожегов.
   - **отправитель в media** — сид `onResult` в `FirstWavePluginsRegistrar` вместо лога
     отправляет `RunRecord` в office; отказ office — именованный, не тихий; без
     повторов-до-бесконечности. Персона — Ожегов.
   - **приёмка** — живой прогон `request` на хосте `collections` → RunRecord появляется в
     `plugin-results` **без скрипта**; вещдок — документ прогона рядом с
     `docs/plugins/first-live-run-2026-08-18.md`.
3. **Ратификация нарезки владельцем** — до кода.
4. Исполнение блоками, `sprint:gate`, PR ≤ 400 строк каждый, `yarn pr:ship` после ревью.
5. `sprint:experience` в конце.

## Границы

- Контракты `@membrana/plugin-contracts` не переоткрывать; сомнение — в отчёт.
- Хост и дом результатов **уже выровнены** на пакет контрактов (18.08) — не откатывать.
- Не трогать `packages/agenda` и клиент.
- Скрипт `plugin:run:mfcc` оставить как лабораторный путь — не удалять.

## Доложить владельцу

Ратифицированная нарезка · форма моста и почему · id прогона, чей RunRecord лёг через
мост (без скрипта) · номера PR · что не вышло.
