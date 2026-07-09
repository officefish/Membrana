# Промпт: Combined-продюсер — `detection-ensemble-service`

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — новый analyzer-сервис `@membrana/detection-ensemble-service`, питающий `combinedScore` из fusion-ядра, + интеграция в плагин «Микрофона».
> Реестр: `id` = `detection-ensemble-service` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Вчера (08.07, PR #288) в `@membrana/core` закрыт keystone `fuseDetectorConfidences` —
чистое, тотальное слияние сырых confidence разнородных детекторов (trends/DSP + yamnet/neural)
во взвешенное среднее + `agreement`, **без** бинарного OR. Мост построен, но `combinedScore = 0`,
пока **нет продюсера**, который прогоняет детекторы на живом окне и питает ядро.

Эта задача ставит на мост «того, кто по нему идёт»: новый analyzer-сервис
`packages/services/detection-ensemble-service`, который принимает **инъецированные** детекторы
(контракт `DroneDetector` из `@membrana/detector-base`), гоняет их `detect()` на окне, маппит
результаты в `FusionSourceInput` и зовёт `fuseDetectorConfidences`. Плагин «Микрофона»
(`mic-proximity-alarm`) начинает питать alarm-loop `combinedScore`, а **не** сырой громкостью.

**Что не трогаем:** само ядро `fuseDetectorConfidences` (готово), yamnet-детектор/плагин
(в prod, #266/#268), пороги DSP на free-v1 (эшелон 0 исчерпан, FFT_METRICS §6).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | Магистраль дня 09.07 — этот сервис |
| [`STRATEGIC_PLAN_DAY.md`](../STRATEGIC_PLAN_DAY.md) | Задача 1, DoD, связь с WHITE_PAPER §3.3/§4.4 |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`SERVICES.md`](../SERVICES.md) | Слои foundation/analyzer, границы |
| `packages/core/src/contracts/detection-fusion.ts` | Контракт `fuseDetectorConfidences` |
| `packages/services/detectors/base/src/types.ts` | Контракт `DroneDetector` / `DetectionResult` |

**GitHub Issue:** null (gh недоступен в сессии; проставить номер после создания).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Ведёт **Математик (Dynin)**, границы — **Структурщик (Ozhegov)**, интеграция —
**Музыкант (Kuryokhin)**. Перед кодом — краткий план (1–2 абзаца + список файлов).

---

### Что построить (продуктовое описание)

1. Новый analyzer-сервис `@membrana/detection-ensemble-service` в `packages/services/detection-ensemble-service`.
2. Чистая функция `fuseDetectorResults(inputs)` — маппит снимки детекторов (`DetectionResult` +
   идентичность `name`/`family`) в `FusionSourceInput` и возвращает результат `fuseDetectorConfidences`
   ядра. Молчащий детектор (`result === null`) → `present: false`.
3. Класс/продюсер `EnsembleProducer` — принимает инъецированные `DroneDetector[]` + веса + конфиг
   сглаживания; `analyze(window)` гоняет `detect()` каждого (устойчиво к throw → present:false),
   зовёт `fuseDetectorResults`, применяет опциональное EMA-сглаживание `combinedScore` по времени.
4. Интеграция в плагин «Микрофона» `mic-proximity-alarm`: alarm-loop реагирует на `combinedScore`
   (fusion), а не на сырую громкость.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| core (готово) | `packages/core/.../detection-fusion.ts` | `fuseDetectorConfidences`, `FusionSourceInput` |
| foundation | `@membrana/detector-base` | контракт `DroneDetector`/`DetectionResult`/`AudioWindow` |
| **analyzer (новый)** | `packages/services/detection-ensemble-service` | продюсер `combinedScore` во времени |
| client (интеграция) | `apps/client/.../plugins/mic-proximity-alarm` | alarm-loop на `combinedScore` |

**Запрещено:**

- Импортировать другие analyzer/detector **сервисы** напрямую (`trends-detector-service`,
  yamnet-service, orchestrator). Детекторы приходят **только** через контракт `DroneDetector`.
- Зависеть от `@membrana/device-board` (правило `services-no-device-board-imports`).
- Переизобретать слияние: `combinedScore`/`agreement` считает **ядро**, продюсер лишь питает его.
- Бинарный OR по `isDrone`. Только сырой confidence во взвешенное среднее.
- React/DOM/Web Audio в `service.ts` (чистое ядро; тонкий `hooks.ts` — отдельно).

---

### Тесты

| Область | Минимум |
|---------|---------|
| Согласие | trends high + yamnet high → `combinedScore` high, `agreement` ≈ 1 |
| Расхождение | trends high + yamnet low → `combinedScore` середина, `agreement` низкий |
| Молчащий детектор | yamnet `null`/absent → не влияет на score; `presentCount` корректен |
| Веса | нейро больший вес сдвигает `combinedScore` к yamnet |
| Сглаживание | EMA монотонно приближает выход к серии постоянного входа |
| Устойчивость | детектор бросает исключение → present:false, не рушит `analyze` |

---

### Definition of Done

- [ ] Сервис зависит **только** от `@membrana/core` + `@membrana/detector-base` (foundation);
      не импортирует другие analyzer-сервисы.
- [ ] `combinedScore > 0` на живом входе (demo в «Микрофоне»); alarm-loop реагирует на fusion-score.
- [ ] Unit-тесты (согласие/расхождение/молчащий/веса/сглаживание/устойчивость) зелёные.
- [ ] `yarn check:boundaries` + `yarn verify:wire-sync` зелёные.
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/detection-ensemble-service` зелёный;
      регрессов в core/fft-analyzer/client нет.
- [ ] Строка в `packages/services/README.md`; alias в client (`vite.config.ts` + `tsconfig.app.json`).
- [ ] LGTM Teamlead.

---

### Out of scope

- Combined+alarm **UserCase** с реальным графом (Задача 2 плана дня — отдельный PR).
- Корень дублирования wire-контракта (Задача 3).
- Новые детекторы / тюнинг порогов DSP / повторный benchmark.
- Многоузловые сервисы (tdoa/localizer/tracker) — заморожены до hard-gate.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — держит scope в границах Задачи 1, LGTM.
2. **Структурщик (Ozhegov)** — границы пакета: только core + detector-base; запрещённые импорты.
3. **Математик (Dynin)** — `fuseDetectorResults` + сглаживание, типы входа/выхода, unit-тесты.
4. **Музыкант (Kuryokhin)** — интеграция в `mic-proximity-alarm`, ручная проверка микрофоном.
5. **Верстальщик (Rodchenko)** — при необходимости индикатор `combinedScore` (иначе no-op).

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: Задача 1 магистрали — combined-продюсер; scope строго сервис + интеграция.
[Структурщик]: слой analyzer; зависимости только core + detector-base; детекторы через DroneDetector.
[Математик]: fuseDetectorResults маппит DetectionResult→FusionSourceInput; ядро считает; EMA-сглаживание.
[Музыкант]: alarm-loop питается combinedScore, не громкостью; headless — «нет устройства» не блокер.
[Верстальщик]: индикатор score опционален в этом PR.

Итоговый артефакт: PR — @membrana/detection-ensemble-service + интеграция в mic-plugin.
Definition of Done: combinedScore>0 на живом входе, тесты + границы зелёные, LGTM.
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`wish`) + ссылка на этот файл (после доступности gh).
2. Запись в `docs/tasks/registry.json` (`status: active`, `size: M`, `leadPersona: dynin`).
3. После merge: отчёт в Issue → `yarn task:archive detection-ensemble-service --notes "PR #…"`.

### Проверка после PR

```bash
yarn workspace @membrana/detection-ensemble-service test
yarn turbo run lint typecheck --filter=@membrana/detection-ensemble-service
yarn check:boundaries
yarn verify:wire-sync
```

---

## Связь с дорожной картой

- WHITE_PAPER §3.3, §4.4 — fusion разнородных модальностей на сырой шине confidence.
- Форсайт FREE (2026-07-06): S2 combined UC — keystone; этот продюсер — критпуть S2.
- STRATEGIC_PLAN_DAY (09.07) §2 — `detection-ensemble-service` назван «следующим естественным
  сервисным шагом»: fusion-ядро есть, analyzer-слой, что его питает, был каркасом.
