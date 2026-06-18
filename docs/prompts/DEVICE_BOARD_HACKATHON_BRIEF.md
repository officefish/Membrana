# Хакатон: device-board — бриф v0.5

> **Владелец продукта:** человек (Teamlead).  
> **Формат:** много-дневный хакатон (`sprintKind: hackathon`).  
> **Процесс:** [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md), регламент — [`HACKATHON_REGULATION.md`](../HACKATHON_REGULATION.md) (черновик).  
> **Бриф-интервью:** ≥20 вопросов → [`DEVICE_BOARD_HACKATHON_BRIEF_INTERVIEW.md`](./DEVICE_BOARD_HACKATHON_BRIEF_INTERVIEW.md).  
> **Консилиум формата:** сеанс 2026-06-17 (чат, до протокола в `docs/seanses/`).

---

## 1. Зачем device-board (продукт)

`device-board` — **редактор сценариев поведения устройства** для пользователя без уверенных навыков программирования.

Целевой путь:

1. Скачать **Membrana Studio** (настольная расширенная версия) или открыть web client; установить на полевое устройство.
2. Запустить, **связать устройство с аккаунтом** на сервере (pairing).
3. Войти в режим **device-board**.
4. Собрать сценарий **визуальным скриптингом** (блоки, связи, циклы, триггеры).
5. Запустить сценарий; наблюдать работу через **журнал устройства** и (позже) модуль статистики.

Ключевая ценность:

- no-code / low-code настройка поведения прибора;
- прозрачная логика (видно, что происходит и почему);
- переносимость сценариев через **экспорт/импорт JSON**;
- переиспользование через **блоки/функции** и готовые пресеты.

Primary user v1: специалист по безопасности (включая профиль оператора ПВО), модель доступа определяется тарифом.

---

## 2. Reference use case (эталонный сценарий)

Сценарий «микрофон + детекция дрона + тревога + журнал» — **канонический acceptance** для первого вертикального среза.

### 2.1 Initial script

После привязки устройства:

| # | Действие |
|---|----------|
| 1 | Выбрать конкретный микрофон из списка доступных устройств |
| 2 | Запустить потоковое прослушивание |
| 3 | Записать событие в журнал устройства |

### 2.2 Main loop script

На входе: активный аудиострим.

| # | Действие |
|---|----------|
| 1 | Записывать аудиотреки заданной длительности (параметр, max 30 сек), **строго подряд** |
| 2 | Анализировать поток **trend FFT-детектором** (шаблон из библиотеки устройства; системный минимум неудаляем) |
| 3 | Писать результат в журнал устройства (обязательно: detection yes/no, clip meta, raw level, detector/template id) |

### 2.3 Alarm loop script

При переходе из main loop по событию «дрон обнаружен»:

| # | Действие |
|---|----------|
| 1 | Оценивать **громкость** сигнала через плагин качества звука микрофона; в журнал — **raw level** (без шкалы дистанции) |
| 2 | При «достаточно тихом» сигнале — **возврат** в main loop |
| 3 | Вести подробный журнал действий тревожного цикла |

### 2.4 System triggers

Обязательная обработка вне циклов:

| Триггер | Ожидаемое поведение |
|---------|---------------------|
| Остановка работы скрипта | Кнопка в board UI **и** системное событие; teardown потоков, финальная запись в журнал; сценарий остаётся editable |
| Потеря соединения с устройством / сервером | Немедленный **stop** (единая ветка disconnect); запись в журнал; reconnect → **initial**; позже — restart по таймеру |

### 2.5 Scheduled job (позже в хакатоне)

По cron-like расписанию:

1. Запуск **анализатора журнала** по буферу звуков.
2. Сводный отчёт → модуль **статистики** (модуль **ещё не реализован**).

---

## 3. Требования к visual scripting

| # | Требование |
|---|------------|
| V1 | Редактор собирает сценарии из визуальных блоков на канвасе (`@xyflow/react`) |
| V2 | Поддержка **отдельных цепочек**: initial, main loop, alarm loop, trigger handlers, scheduled jobs |
| V2a | **Data-рёбра** между узлами при поддержке типов; I/O capability — на стороне узла |
| V2b | Длительность записи аудио — **параметр** блока (max 30 сек) |
| V2c | Main → alarm по **фронту** детекции |
| V2d | Subgraph: pins на границе; **глубина ≤ 1** |
| V2e | Export metadata: обязательны `version` + `hash`; import более новой version → **отказ**; **санитизация секретов** при export |
| V3 | Цепочки можно **заворачивать в блоки/функции** (переиспользуемые под-сценарии) |
| V4 | **Экорт** отдельных блоков/функций и целых сценариев в JSON |
| V5 | **Импорт**: drag-and-drop JSON → восстановление визуальной схемы на доске |
| V6 | Режим board **на клиенте** и **на сервере** (кабинет) — вход/выход; возможна **полная перерисовка UI** при смене режима |

---

## 4. Архитектурная рамка (согласование с репозиторием)

Текущий [`DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) v0.3 описывает **signal graph** и **scenario graph** (visual scripting).

Бриф владельца расширяет видение до **сценарного visual scripting** (циклы, триггеры, расписание) — ближе к паттернам Blueprints / n8n (уже упомянуты в концепте §4.3).

**Решение хакатона (рабочая гипотеза до интервью):**

| Слой | Назначение | Исполнение |
|------|------------|------------|
| **Signal graph** | Захват → анализ → observation | Существующие engine + хабы + `plugin.install` |
| **Scenario graph** | Initial / loops / triggers / schedule | Новый **scenario runtime** (чистое ядро в `device-board` или `core`), UI только декларирует и запускает |

Два слоя могут быть:

- **A)** одна доска с двумя типами рёбер (data + control), или  
- **B)** две вкладки/режима на одном канвасе (Signal / Scenario).

Решение интервью (B1): **B)** две вкладки/режима (`Signal` / `Scenario`) в v1. Если UX окажется неудачным, допускается откат к единому канвасу в отдельном эпике.

**Жёсткие ограничения из `ARCHITECTURE.md`:**

- Не второй AudioContext / Web Audio в обход `audio-engine-service`.
- Не параллельный реестр плагинов — только `MembranaRegistry`.
- Правки `@membrana/core` (типы сокетов, scenario schema) — ветка **`vesnin`**, LGTM Vesnin.

**Существующие опоры в монорепо:**

| Компонент | Пакет / модуль |
|-----------|----------------|
| Журнал | `@membrana/telemetry-journal-service`, client plugins |
| Live FFT / trends drone | client plugins, trends templates |
| Pairing / cabinet | Membrane Platform (`MEMBRANE_PLATFORM.md`) |
| Рендеры отчётов журнала | `@membrana/journal-report-views` |

---

## 5. In scope — хакатон 1 (`device-board-hackathon-1`)

Цель хакатона 1: **вертикальный срез** — пользователь собирает и запускает упрощённый эталонный сценарий (initial + main loop + журнал), board как отдельный режим UI, JSON export/import v1.

| ID | Содержание |
|----|------------|
| **DB-H0** | Обновление концепта: signal + scenario; JSON schema v1; бриф-интервью закрыт |
| **DB-H1a** | Контракты в `@membrana/core`: `SocketType` (минимум), `ScenarioGraph` v1, типы блоков (stub) |
| **DB-H1b** | Каркас `@membrana/device-board`: XYFlow, режим входа/выхода, shell UI |
| **DB-H1c** | `isValidConnection`, сериализация графа, export JSON, pre-run validation |
| **DB-H2a** | Импорт JSON (file drop), round-trip export → import |
| **DB-H2b** | Scenario runtime v1: initial + один loop, без alarm |
| **DB-H2c** | Интеграция: mic select → stream → 5s chunks → trends FFT → `LiveJournalService` |
| **DB-H2d** | Cabinet/server: вход в device-board режим, редактирование сценария v1, **двусторонняя sync** device ↔ cloud |
| **DB-H3a** | Trigger: stop script (teardown) |
| **DB-H3b** | Trigger: connection loss (минимальная стратегия по итогам интервью) |
| **DB-H3c** | Блоки/функции: вложенный subgraph v1 (один уровень) |
| **DB-H4** | Alarm loop + громкость → возврат; smoke; закрытие хакатона |

---

## 6. Out of scope — хакатон 1

| # | Исключено | Когда |
|---|-----------|--------|
| O1 | Модуль **статистики** (только контракт точки интеграции / stub) | Хакатон 2+ |
| O2 | UI модуля статистики и продвинутый scheduler management | Хакатон 2+ |
| O3 | D2–D4 концепта (mic-array, localizer, RF, thermal) | Отдельные хакатоны |
| O4 | Расширенный multi-user server-side редактор (совместная работа, ACL, аудит) | Хакатон 2 |
| O5 | Расширенный conflict-resolution и offline-first sync (сложные merge-конфликты) | v2 |
| O6 | Marketplace / шаринг сценариев между организациями | v2 |
| O7 | Генерация TypeScript/Python из графа | Никогда в v1 |
| O8 | Prod-deploy **Membrana Studio** installer | Эпик `membrana-studio-desktop` (MS4); **Membrana Device** — отдельный эпик |

---

## 7. Stop rules

| # | Правило |
|---|---------|
| S1 | Два падения scoped CI подряд на одном эпике — стоп, handoff, консилиум |
| S2 | Правка `@membrana/core` после merge DB-H1a — только через новый эпик + LGTM Vesnin |
| S3 | Агент **не** расширяет scope по Issue «по ходу» — только эпики реестра с `parentHackathonId: device-board-hackathon-1` |
| S4 | Если round-trip JSON ломается — не переходить к DB-H2b |
| S5 | Пока `HACKATHON_ACTIVE.md` открыт — **не** запускать `yarn ritual:day` / `yarn ritual:evening` |
| S6 | Нет ответа на блокирующие вопросы интервью (см. INTERVIEW § «Блокеры») — хакатон не открываем |

---

## 8. План по дням и эпикам

| День | Эпики | Lead | Definition of Done дня |
|------|-------|------|------------------------|
| **H0** | Brief v0.2, интервью, концепт v0.3, реестр эпиков | Vesnin | Интервью закрыто; A vs B решено; `registry.json` обновлён |
| **H1** | DB-H1a, DB-H1b, DB-H1c | Vesnin / Ozhegov | Канвас рендерится; JSON export; core-контракты в PR |
| **H2** | DB-H2a, DB-H2b, DB-H2c, DB-H2d | Ozhegov / Музыкант | Import работает; initial+loop запускается; журнал пишется; cabinet edit v1 доступен |
| **H3** | DB-H3a, DB-H3b, DB-H3c | Ozhegov | Stop + disconnect; subgraph v1; smoke зелёный |
| **H4** | DB-H4, `hackathon:close` | Vesnin / Музыкант | Alarm loop; эталонный сценарий end-to-end; CLOSURE.md |

Буфер: при срыве сроков — **round-trip JSON и sync** переносятся в хакатон 1.5; **alarm loop остаётся обязательным** (D1, D2).

---

## 9. Режим device-board (UX)

Гипотеза владельца: вход в device-board **полностью перерисовывает UI** под тип управления «редактор сценариев».

Черновик состояний:

```text
[Обычный режим клиента]  --enter board-->  [Board mode: палитра, канвас, inspector, run/stop]
                        <--exit board---
```

Для v1 предусмотреть одновременную видимость `Signal` и `Scenario` (split-view или синхронизированные вкладки). **Приоритет layout:** split (канвас + inspector); fullscreen — опционально.

- Клик по блоку → **сайдбар плагина** (не inline на ноде).
- Палитра: **drag** из палитры желателен; поиск и категории — не обязательны в v1.
- Цветовая дифференциация signal vs scenario нод — **в рамках DaisyUI** (`DESIGN.md`).

На сервере (кабинет): v1 включает **вход в режим board, редактирование сценария admin'ом и двустороннюю sync** с устройством (по `deviceId`). Продвинутый multi-user редактор и ACL остаются out of scope.

Ссылка: [`DESIGN.md`](../DESIGN.md), [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md).

---

## 10. JSON сценария (черновик v1)

```json
{
  "version": 1,
  "kind": "device-scenario",
  "deviceKind": "microphone",
  "meta": { "title": "Drone watch", "exportedAt": "ISO-8601", "hash": "sha256-…" },
  "signalGraph": { "nodes": [], "edges": [] },
  "scenario": {
    "initial": { "entry": "n-start", "nodes": [], "edges": [] },
    "loops": {
      "main": { "entry": "n-loop-main", "nodes": [], "edges": [] },
      "alarm": { "entry": "n-loop-alarm", "nodes": [], "edges": [] }
    },
    "triggers": {
      "onStop": { "entry": "n-on-stop", "nodes": [], "edges": [] },
      "onDisconnect": { "entry": "n-on-disc", "nodes": [], "edges": [] },
      "custom": []
    },
    "functions": []
  }
}
```

Версионирование и миграции — модуль `device-board/src/migrations` (как в концепте §9).

---

## 11. Definition of Done — хакатон 1 целиком

- [ ] Бриф-интервью проведено; протокол в `docs/seanses/hackathon-brief-interview-<date>.md`
- [ ] `DEVICE_BOARD_CONCEPT.md` обновлён до v0.3 (signal + scenario) — **H0 done**
- [ ] Desktop/client: вход/выход в board mode; канвас сценария
- [ ] Эталонный сценарий: initial → main loop → **alarm** → журнал; trends FFT в loop
- [ ] Triggers: stop + disconnect (поведение зафиксировано в интервью)
- [ ] Subgraph/функция v1 (один уровень вложенности)
- [ ] README + demo для оператора (D3)
- [ ] Round-trip JSON / bidirectional sync — **stretch** (можно хакатон 1.5)
- [ ] Все эпики DB-H* в реестре `archived`; `CLOSURE.md` в `docs/archive/hackathon/`
- [ ] CI: lint, typecheck, test для затронутых пакетов
- [ ] Ручной smoke: **физический микрофон** на целевом устройстве + журнал (headless CI — не блокер)

---

## 12. Минимальный успех vs stretch

| Уровень | Критерий |
|---------|----------|
| **Минимум (закрываем хакатон)** | H0–H4: initial + main loop + **alarm loop** + journal + stop/disconnect; smoke на устройстве |
| **Целевой** | + subgraph v1 + pre-run validation + cabinet edit + bidirectional sync |
| **Stretch** | Round-trip JSON import/export + scheduled job stub + statistics sink contract |

**Приоритет (D2):** alarm loop важнее round-trip JSON; JSON/sync допустимо отложить в хакатон 1.5.

---

## 13. Риски

| Риск | Митигация |
|------|-----------|
| Разрыв брифа и концепта v0.2 | DB-H0: концепт v0.3 до кода |
| Второй runtime исполнения | Scenario runtime вызывает существующие сервисы, не Web Audio напрямую |
| Scope creep (statistics, server editor) | Out of scope + stop rules |
| Desktop vs web client | Хакатон 1 — **web client** (`apps/client`); smoke на **реальном устройстве с микрофоном** |
| Порог «тихий звук» / дистанция | Плагин качества микрофона; в журнал — raw level; порог выхода из alarm — уточнить при DB-H4 |

---

## 14. Связанные документы

| Документ | Зачем |
|----------|--------|
| [`packages/device-board/DEVICE_BOARD_CONCEPT.md`](../../packages/device-board/DEVICE_BOARD_CONCEPT.md) | Текущий канон (обновить в H0) |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1f | Границы пакета |
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Pairing, deviceId, cabinet |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Registry, lifecycle |
| [`DEVICE_BOARD_HACKATHON_BRIEF_INTERVIEW.md`](./DEVICE_BOARD_HACKATHON_BRIEF_INTERVIEW.md) | Вопросы для интервью |
| [`HACKATHON_REGULATION.md`](../HACKATHON_REGULATION.md) | Ритуалы хакатона |

---

## 15. Следующий шаг

1. ~~Бриф-интервью (35/35)~~ — **закрыто** 2026-06-17.
2. Обновить `DEVICE_BOARD_CONCEPT.md` до v0.3 (signal + scenario).
3. Регистрация `device-board-hackathon-1` и DB-H* в `docs/tasks/registry.json`.
4. `hackathon:open` (или ручной чеклист до появления скрипта).

*Версия: 0.5 · 2026-06-17 · Бриф-интервью закрыто (35/35).*
