# Cowork Sprint Brief: три фрагментарных UserCase FREE-тарифа

| Поле | Значение |
|------|----------|
| sprintId | `cowork-free-fragment-usercases` |
| GitHub Issue | [#487](https://github.com/officefish/Membrana/issues/487) |
| baseBranch | `main` |
| blocks | `spectrum-live`, `neuro-detection`, `sample-recording` |
| integration deadline | 2026-07-16 (fallback-гейт; основной гейт — событийный) |
| LGTM Product | владелец (резка блоков подтверждена 2026-07-15) |
| Координатор | Vesnin (Teamlead) |
| Формат | Cowork Sprint v1.0 — [регламент](../../COWORK_SPRINT_REGULATION.md) |

> **Первый Cowork Sprint в проекте.** Формат создан 2026-07-14 (#464, консилиум
> `cowork-sprint-format-2026-07-14`, 20 реплик единогласно). Резка, гейты и
> честность строки «адаптировали vs переписали» в RETROSPECTIVE — это ещё и
> калибровка самого формата.

---

## Problem (общая разработка)

**Продуктовая часть FREE закрыта.** Распознавание, fusion спектр+нейро и alarm-loop
в prod; combined UC отработал живьём на микрофоне (#416: p50 150 / p95 213 мс).
Остаток FREE — **упаковка и дистрибуция, не разработка**.

FREE-лайнап каталога — **3+1 UserCase**. Каркас уже стоит в коде
([`free-tier-user-case-entries.ts`](../../../packages/device-board/src/catalog/free-tier-user-case-entries.ts)):
четвёртый, `usercase-free-combined-alarm`, — **живой** (граф = проверенная Beta-пара
`getFreeCombinedAlarmDocument`), а три первых — **заготовки**: их `loadDocument`
отдаёт пустой валидный документ. UC монтируется, но графа нет.

**Общая разработка спринта:** налить содержимое в три каркаса — три одиночные
модальности, полученные **декомпозицией работающего combined-графа**.

Естественный шов резки: **каждый UC — самостоятельный документ-деривация** от
`DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT`, в своём файле, со своим тестом. Блоки
не обмениваются данными в рантайме — связь между ними только **концептуальная**
(общий инструментарий деривации, общая форма карточки каталога, общий язык
модальностей). Ровно поэтому ранняя договорённость об интерфейсах навредила бы:
каждый блок должен сначала честно ответить «как выглядит МОЙ сценарий изнутри»,
а сведение инструментария — задача Interface Consilium.

---

## Резка на блоки

| Блок | Суть | Файловая зона (не пересекается) | Собственный DoD (без соседей, на стабах) |
|------|------|--------------------------------|------------------------------------------|
| **`spectrum-live`** | FREE · Спектр: живое наблюдение. Одиночная **спектральная** модальность — из combined берётся ветвь `trends` (MakeFftTrendsPolicy → MakeFftTrendsAnalysis), без ensemble, без fusion, без alarm-loop. Наблюдение + отчёт. | `packages/device-board/src/graph/usercase-free-spectrum-live.ts`<br>`packages/device-board/src/graph/usercase-free-spectrum-live.test.ts`<br>`docs/cowork-sprint/cowork-free-fragment-usercases/team-spectrum-live/**` | `getFreeSpectrumLiveDocument()` возвращает документ, проходящий `parseDeviceScenarioDocument`; тест фиксирует состав ветвей и то, что узлы только из `SCENARIO_NODE_KINDS`; `yarn turbo run lint typecheck test --filter=@membrana/device-board` зелёный |
| **`neuro-detection`** | FREE · Нейро-детекция (yamnet). Одиночная **нейро**-модальность — из combined берётся ветвь `MakeEnsembleAnalysis` (нейро-канал), без trends, без fusion, без alarm-loop. Честный fallback-текст при недоступной модели. | `packages/device-board/src/graph/usercase-free-neuro-detection.ts`<br>`packages/device-board/src/graph/usercase-free-neuro-detection.test.ts`<br>`docs/cowork-sprint/cowork-free-fragment-usercases/team-neuro-detection/**` | `getFreeNeuroDetectionDocument()` → документ проходит `parseDeviceScenarioDocument`; тест фиксирует состав ветвей и отсутствие новых node-kind; scoped CI зелёный |
| **`sample-recording`** | FREE · Библиотека сэмплов: записи. **Граф = только запись** (решение владельца 2026-07-15): GetRecorder → StartRecording → IsRecordingWindowFull → StopRecording → MakeTrack → async track-upload → PublishReport. Управление коллекцией и разметка — **существующий клиентский модуль «Библиотека сэмплов», вне графа**. | `packages/device-board/src/graph/usercase-free-sample-library.ts`<br>`packages/device-board/src/graph/usercase-free-sample-library.test.ts`<br>`docs/cowork-sprint/cowork-free-fragment-usercases/team-sample-recording/**` | `getFreeSampleLibraryDocument()` → документ проходит `parseDeviceScenarioDocument`; тест фиксирует запись-цепочку и отсутствие детекционных узлов; scoped CI зелёный |

### Общие корневые файлы — НЕ трогает никто

В изолированной фазе запрещены правки:

- `packages/device-board/src/catalog/free-tier-user-case-entries.ts` — **точка сборки лайнапа**; `loadDocument` трёх заготовок переключается на реальные билдеры **на интеграции**;
- `packages/device-board/src/catalog/bundled-user-case-entries.ts`;
- `docs/tasks/registry.json`, `package.json`, любые barrel/index-экспорты пакета;
- `usercase-free-combined-alarm.ts`, `usercase-detection-alarm-beta.ts`, `default-usercase-mvp-microphone*` — **источники только для чтения**.

Стаб карточки каталога каждый блок держит **в своей зоне** (в своём тесте), в
`free-tier-user-case-entries.ts` не пишет.

---

## Constraints

1. **🚫 Новых узлов палитры НЕ вводить** (слово владельца). Только пересборка
   зарегистрированных `SCENARIO_NODE_KINDS`. Нужен новый узел → это **BLOCKER**,
   пиши `team-<block>/BLOCKER.md`, не изобретай.
2. **Combined UC не трогать** — остаётся 4-м «основным», его граф и пороги
   неизменны. Он источник для чтения, донор топологии.
3. **Живой Run каждого UC = проверка СБОРКИ, а не детекции.** Борд держит старый
   снапшот → сценарий **пересоздавать из пикера** (журнал L-записей).
4. **Перед сборкой обязателен журнал недочётов** L1–L36:
   [`docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md`](../../actions/device-board/USERCASE_COMPETITION_LESSONS.md).
   Новые находки живого Run дописывать туда же (симптом→корень→фикс→профилактика).
5. **Изоляция** (регламент §Hard rules): чужие ветки и чужие `EXPECTATIONS.md` не
   читать; об интерфейсах не договариваться до Phase 3; merge/rebase между
   ветками блоков запрещены.
6. Каждая команда — **в своём worktree** (скилл `membrana-worktree`); коммитить
   строго свои файлы поимённо, никогда `git add -A`.

## Out of scope

- Прогон детекторов по импортированной коллекции (требует новых узлов — отдельный спринт).
- Разметка/импорт коллекции в графе (это клиентский модуль).
- Любой DSP-тюнинг, изменение порогов, Этап 2, многоузловое.
- **Живой дрон / drone-smoke / детекционный гейт.** Инвариант владельца: живой
  дрон — не гейт перед отгрузкой FREE, а её смысл; полевые испытания — следующий
  жизненный цикл продукта. Не искать.
- Кабинет+Studio к песочнице и лендинг — параллельные потоки дня, вне коворка.

---

## Ожидаемые швы (гипотеза координатора — уточняется контрактом Phase 3)

Блоки не связаны потоком данных, поэтому швы **концептуальные**:

1. **Инструментарий деривации.** Все три блока строят документ как деривацию MVP и
   неизбежно заведут свои локальные хелперы (`node()`/`exec()`/`data()`, якоря
   MVP-узлов, список заменяемых узлов) — сегодня они продублированы в
   `usercase-detection-alarm-{alpha,beta}.ts`. Контракт решит, что канонично.
2. **Форма карточки каталога** — какие поля отдаёт блок в `UserCaseCatalogEntry`
   (id/title/description/branchCount/functionCount/layoutProfile/tier) и кто их
   владелец.
3. **Глоссарий модальностей** — одинаковые слова для «спектр» / «нейро» / «запись»
   в title/description/метках UI (термин = граница).
4. **Владелец времени** — окна и каденс (windowSec, intervalMs) у каждого блока
   свои; контракт фиксирует, что они независимы и не «протекают» между UC.

## Интеграционный smoke (набросок)

Единый сценарий на интеграционной ветке:

1. `BUNDLED_USER_CASE_ENTRIES` отдаёт **4 FREE-записи**; ни одна `loadDocument` не
   возвращает пустой документ (`createEmptyDeviceScenarioDocument` в лайнапе не
   остался — стаб, доживший до прода, = дефект интеграции).
2. Каждый из 4 документов проходит `parseDeviceScenarioDocument`.
3. Все узлы всех документов ∈ `SCENARIO_NODE_KINDS` (гард «без новых узлов»).
4. `yarn catalog:verify-client` зелёный.
5. Собственные тесты всех трёх блоков зелёные в собранной ветке.
6. Живой Run: пикер → пересоздать сценарий → сборка проходит (по L-журналу).

---

## Фазовый гейт

```
ready(block) = собственный DoD зелёный (тест + scoped CI, на стабах)
integration_gate = ready(spectrum-live) ∧ ready(neuro-detection) ∧ ready(sample-recording)
                   ∨ deadline 2026-07-16
```

Объявляет координатор. Freeze-тег на каждую ветку:
`cowork-cowork-free-fragment-usercases-<block>-interface-freeze`.

## Процессная поправка дня

**Кредит Anthropic пуст** (HTTP 400). Interface Consilium (Phase 3) проводится
протоколом в IDE-чате → `yarn consilium --secretary-file <md>`; closure —
`yarn task:review:ship` + `--review-file`. Детерминированные чеки не затронуты.
