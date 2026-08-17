# Night Hunt: monorepo-dependency-graph

| Поле | Значение |
|------|----------|
| Week | 2026-28 |
| Generated (UTC) | 2026-07-12T12:54:20.673Z |
| Channel | OpenRouter proxy |

---

# Weekly-отчёт: `monorepo-dependency-graph` (2026-W28)

## Находки

- **Граф пакетов (§1) без изменений в ядре:** `@membrana/core` остаётся листом без внутренних зависимостей; `@membrana/agenda` и `@membrana/device-board` по-прежнему изолированы друг от друга и зависят только от `core`. Нарушений уровня ядра за неделю не зафиксировано.
- **Точка риска — семейство `detectors/*` (§1e):** активная работа по `template-match`/`DRONE_TIGHT` (эпик fft-last-chance #84) увеличивает соблазн cross-detector импортов и обхода `detector-base`. Каждый `*-detector-service` должен импортировать **только** `@membrana/core` + `@membrana/detector-base`.
- **Дублирование источника истины `DRONE_TIGHT`:** канон — `packages/services/detectors/template-match/src/data/curated-drone-templates.json`; benchmark-копия в `data/detectors-benchmark/v0.2/` требует ручной синхронизации. Расхождение JSON-ов = скрытый функциональный «дрейф», не ловится type-check'ом.
- **Client-facade `droneTightCalibration.ts`:** по контракту — thin facade без дублирования чисел. Есть риск постепенного «наползания» констант из пакета в client.
- **Замороженные сетевые пакеты (`tdoa`/`localizer`/`tracker`/`transport`):** frozen @stage 2 — любой их импорт в client до прохождения hard-gate = нарушение стратегии Single-Node Detection First.

## Риски

- **Циклы через `detector-base`:** если `detector-base` начнёт зависеть от конкретного детектора (обратный импорт для «удобных» типов) — образуется цикл `detector-base → X-detector → detector-base`.
- **Client → services в обход публичного API:** импорт из `packages/services/*/src/internal` или прямо из `service.ts`/`hooks.ts` вместо `src/index.ts` — обход контракта §1a.
- **Обход engine-монополии (§1b):** новый детектор/плагин, обращающийся к Web Audio напрямую (`new AudioContext()`, `getUserMedia`, `createAnalyser`) вместо `@membrana/audio-engine-service` — архитектурное нарушение, не всегда видимое в графе импортов.
- **`background-*` протечка на клиент:** прямой импорт `@membrana/background-media` / `background-office` из `apps/client` (кроме санкционированного remote-канала user-шаблонов) размывает границу front/back.
- **Обход `MembranaRegistry` (§1c):** прямой `useMembranaStore.getState().registerModule(...)` привязывает client к внутреннему API store в обход фасада.

## Рекомендации

- **Добавить lint-правило на граф зависимостей** (dependency-cruiser или eslint boundaries): запретить cross-detector импорты, `services → services`, `services → agenda/device-board/apps/client`, любой импорт frozen-сетевых пакетов из client.
- **CI-проверка sync JSON:** хэш-diff `template-match/.../curated-drone-templates.json` ↔ `data/detectors-benchmark/v0.2/curated-drone-templates.json`; красный build при расхождении.
- **Grep-gate на Web Audio вне engine:** запрет паттернов `new AudioContext`, `getUserMedia`, `createAnalyser` вне `packages/services/audio-engine/` — как отдельный CI-шаг.
- **Запрет глубоких импортов:** правило «только `@membrana/*` через `src/index.ts`», блокирующее пути вида `@membrana/*/src/...`.

---

## Чек-лист weekly review (граф пакетов)

**Типичные нарушения графа §1:**

| # | Нарушение | Где ловить |
|---|-----------|-----------|
| 1 | Цикл `agenda ↔ device-board` (взаимный импорт) | граф-lint |
| 2 | `@membrana/core` получил зависимость от другого пакета | граф-lint |
| 3 | `service → service` (напр. `fft-analyzer` импортирует детектор) | граф-lint / §1a, §1e |
| 4 | Cross-detector импорт (`harmonic ↔ yamnet` и т.п.) | граф-lint / §1e |
| 5 | Детектор зависит не от `core`+`detector-base`, а ещё от чего-то | граф-lint |
| 6 | `detector-base` импортирует конкретный детектор → цикл | граф-lint |
| 7 | `apps/client` импортирует `background-office`/`background-media` напрямую | граф-lint |
| 8 | Импорт frozen-сетевых пакетов (`tdoa`/`localizer`/`tracker`/`transport`) | граф-lint |
| 9 | Глубокий импорт минуя `src/index.ts` | import-path lint |
| 10 | Web Audio API вне `audio-engine-service` | grep-gate |
| 11 | Прямой `useMembranaStore...registerModule` в обход `MembranaRegistry` | grep-gate |
| 12 | Дублирование чисел `DRONE_TIGHT` в client-facade | ревью diff `droneTightCalibration.ts` |
| 13 | Рассинхрон `curated-drone-templates.json` (пакет ↔ benchmark) | CI hash-diff |

**Ручные проверки на ревью:**

- [ ] `git diff` по `package.json` всех пакетов — не появились ли новые внутренние deps?
- [ ] Новые сервисы соответствуют шаблону `@membrana/<имя>-service` + деп только на `core`?
- [ ] Новые детекторы зарегистрированы как lazy через `MembranaRegistry`?
- [ ] `AudioWindow` строится из `AudioSampleFrame` engine'а, без прямого Web Audio?
- [ ] Публичный API каждого нового пакета выведен только через `src/index.ts`?
- [ ] Изменения `DRONE_TIGHT` затронули оба JSON синхронно?
