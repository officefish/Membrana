# Промпт: live-neural-combined-fusion — yamnet в живом combinedScore (спектр+нейро для FREE)

> **Task-промпт для агента-разработчика.** Размер задачи: **M**.
> Ожидаемый артефакт: **1–2 PR** — yamnet как живой детектор в combined-контуре + честная метка «спектр+нейро».
> Реестр: `id` = `live-neural-combined-fusion` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Инсайт: [`insight-live-neural-combined-detector`](../insights/insight-live-neural-combined-detector/INSIGHT.md).
> **Гейт пройден:** консилиум [`live-neural-combined-fusion-2026-07-13.md`](../seanses/live-neural-combined-fusion-2026-07-13.md) (20 реплик, LGTM Vesnin) — вердикты по 5 точкам обязательны.

---

## Контекст

**Мандат: прямое решение владельца 2026-07-13 — нейро-fusion ОБЯЗАТЕЛЕН для FREE-тарифа.**
S2 combined UC (#372) собран DSP-only по консилиуму [`s2-combined-uc-dsp`](../seanses/s2-combined-uc-dsp-2026-07-12.md)
(точка 3: yamnet deferred). Решение владельца **отменяет только точку (3)**; остальные
вердикты консилиума (топология, границы, единое окно, «не трогаем ядро #357 и
make-detection-fusion, не создаём узлы палитры») **остаются в силе**.

Разведка 2026-07-13 — весь нейро-путь уже существует, работа = соединение готовых частей:

- `createCombinedStreamDetectors()` (`apps/client/src/plugins/mic-combined-detection/`) —
  **единственная точка**: питает и клиентский плагин, и device-board мост
  (`scenarioMicJournalBridge.ts:1236` → `EnsembleProducer`), т.е. UC-граф S2 получает нейро
  автоматически. Докстринг уже предвидит добавление yamnet при подключённом model-provider.
- Браузерный провайдер существует: `loadYamnetBrowserModel()`
  (`apps/client/src/plugins/neural-drone-analyzer/yamnetBrowserModel.ts`) — бандленные
  веса (~16 МБ), fetch локально, **офлайн-гарантия free**. Прецедент cross-plugin импорта —
  `CALIBRATED_SAMPLE_OPTIONS` из sample-library.
- `createYamnetDetector({ modelProvider })` (`@membrana/yamnet-detector-service`) —
  `detect(AudioWindow)` сам ресемплит в 16 кГц; ленивая загрузка модели на первом detect.
- Латентность: p95 56 мс WASM (node); в браузере WebGL быстрее — вписывается в живой каденс.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`s2-combined-uc-dsp-2026-07-12.md`](../seanses/s2-combined-uc-dsp-2026-07-12.md) | Действующие границы S2 (кроме точки 3) |
| [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md) | ND3: yamnet F1 0.803, слабо коррелирован с DSP |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы пакетов |
| `apps/client/src/plugins/mic-combined-detection/` | Точка подключения |

**GitHub Issue:** #415 (создать при регистрации).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план (1–2 абзаца + список файлов).

### Что построить (по вердиктам консилиума 2026-07-13)

1. **yamnet в живом combined (точка 1):** нейро-детектор в `createCombinedStreamDetectors()`
   через инжектированный `loadYamnetBrowserModel` — одна точка питает клиент + device-board
   мост. Отдельный узел палитры — **отклонён консилиумом**.
2. **Вес (точка 2):** равный голос (weight 1). Повышение веса — только после замера F1
   **ансамбля** DSP+нейро на free-v1 (соло-F1 0.803 — методологически другая величина).
3. **Каденс (точка 3):** нейро-ветвь **реже DSP** — субдискретизация с TTL **внутри продюсера**:
   между опросами подаётся последнее значение `present:true`, при протухании TTL —
   `present:false`. TTL — внутренняя деталь, НЕ публичный API (наружу только `present`).
4. **Graceful-деградация (точка 4):** метка модальностей по **availability** источника (TTL),
   не по факту тика: «спектр+нейро» / «спектр»; badge по DESIGN.md, `aria-live="polite"` на
   смену **стабильного** статуса. Молчаливая деградация запрещена; скачок confidence при
   переходе гасится сглаживанием live-детекции (EMA/гистерезис).
5. **S2 UC (точка 5):** документ `usercase-free-combined-alarm` — добавить метку модальностей;
   топологию и пороги `branch-on-detection` **не менять** до замера. Live-smoke
   (combinedScore>0 с дроном) перепрогнать ПОСЛЕ подключения.
6. **Перф-подтверждение:** замер инференса p50/p95 **в браузере (WebGL)** на живом каденсе;
   при непопадании в бюджет — снижать частоту нейро-опроса, не DSP.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| client plugin | `apps/client/src/plugins/mic-combined-detection/` | список живых детекторов, graceful-обёртка нейро |
| client plugin | `apps/client/src/plugins/neural-drone-analyzer/yamnetBrowserModel.ts` | провайдер модели (готов, не менять) |
| service | `@membrana/yamnet-detector-service` | детектор (готов; менять только если нужен явный флаг ошибки) |
| service | `@membrana/detection-ensemble-service` | fusion (готов; проверить family-веса neural) |

**Запрещено (наследие консилиума s2-combined-uc-dsp, в силе):**

- Трогать ядро loop-transition-policy (#357) и `make-detection-fusion`.
- Создавать новые узлы палитры device-board (подключение — через список детекторов, не узел).
- Прямые импорты между детектор-сервисами (только detector-base / публичные index).
- Переобучение модели; TDOA/мультиузел; блокировать выпуск ожиданием VDR-железа.
- Сетевые загрузки модели в рантайме (офлайн-гарантия free — только бандл).

### Тесты

| Область | Минимум |
|---------|---------|
| fusion DSP+neural | fake-neural детектор меняет combinedScore; score/agreement ∈ [0,1] |
| graceful | провайдер бросает → ансамбль живёт DSP-only, статус помечен, ошибка не тихая |
| UC snapshot | S2 UC документ валиден, `catalog:verify-client` зелёный |
| перф | замер p50/p95 инференса на живом каденсе задокументирован |

### Definition of Done (консилиум 2026-07-13)

- [ ] combinedScore вживую сливает DSP+yamnet (одна точка: клиент + device-board мост); узла палитры нет.
- [ ] Вес нейро = 1; повышение отложено с условием (замер F1 ансамбля).
- [ ] Субдискретизация нейро с TTL внутри продюсера; наружу только `present`; ядро #357 / make-detection-fusion не тронуты.
- [ ] Graceful DSP-only деградация с видимой меткой по availability; тест.
- [ ] Метка «спектр+нейро» / «спектр» в панели combined и карточке S2 UC (badge, `aria-live="polite"` на стабильную смену).
- [ ] Пороги `branch-on-detection` S2 UC не изменены; в документе UC — метка модальностей.
- [ ] Перф-замер p50/p95 в браузере (WebGL) задокументирован.
- [ ] S2 live-smoke перепрогнан после подключения; combinedScore>0 с дроном зафиксирован.
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/client --filter=@membrana/detection-ensemble-service` зелёный; `catalog:verify-client` зелёный.
- [ ] LGTM Vesnin.

### Out of scope

- CLAP/другие модели; переобучение; fine-tune.
- Новые узлы палитры (отдельный Issue, если понадобится нейро-узел).
- Валидация качества на VDR-корпусе (~17.07, не блокер).
- S2 live-smoke с дроном — отдельный гейт (не этот спринт, но нейро-fusion должен его не сломать).

### Порядок работы ролей

1. **Teamlead (Vesnin)** — подтверждение формы (список, не узел), LGTM.
2. **Математик (Dynin)** — ВЕДЁТ: fusion-инварианты, family-веса neural, перф-замер, тесты.
3. **Музыкант (Kuryokhin)** — живой каденс, единое окно, graceful-поведение при «молчащем» нейро.
4. **Структурщик (Ozhegov)** — границы плагинов/сервисов, cross-plugin импорт по прецеденту.
5. **Верстальщик (Rodchenko)** — метка модальностей в панели/карточке (DESIGN.md, a11y).

---

## Заметки для человека-постановщика

1. GitHub Issue `wish` + ссылка на этот файл.
2. Запись в `docs/tasks/registry.json` (`status: active`, `insightId: insight-live-neural-combined-detector`).
3. После merge: отчёт в Issue → `yarn task:archive live-neural-combined-fusion --notes "…"`.

### Проверка после PR

```bash
yarn turbo run test --filter=@membrana/client --filter=@membrana/detection-ensemble-service
yarn catalog:verify-client
```

---

## Связь с дорожной картой

- WHITE_PAPER §8 stage-gate 1→2: combined = слияние слабо коррелированных модальностей.
- Форсайт 2026-07-06 / решение владельца 2026-07-13: FREE выпускается со «спектр+нейро», не DSP-only.
- Критпуть FREE: этот спринт → S2 live-smoke → S3 упаковка UC.
