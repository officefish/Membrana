# Competition Sprint Brief: полный детекционный UserCase на basn-палитре

| Поле | Значение |
|------|----------|
| sprintId | comp-detection-alarm-2026-07-10 |
| GitHub Issue | #336 (эпик-основание: #323) |
| baseBranch | **main** (отступление от шаблона: techies68 мертва с 2026-07-07, рабочая ветка main) |
| teams | alpha, beta, gamma |
| LGTM Product | ✅ владелец, 2026-07-10 |
| LGTM Vesnin | ✅ 2026-07-10 (draft) |

## Problem

Палитра device-board с эпиком #323 (PR #324–#329) впервые позволяет собрать **полный
детекционный сценарий**, но combined+alarm UserCase — до сих пор пустой документ.
Продукту нужен лучший вариант полного юзеркейса как эталон упаковки S3 (FREE-тариф,
дедлайн ~17.07). Есть ≥2 правдоподобных трактовки (топология графа, policy-настройки,
наблюдаемость, использование вариадики fusion) — выбираем по работающим прототипам.

Три новых сценария команд **заменят** в пикере прошлые async-v2 сценарии
(`community-competition-user-case-entries.ts`) на Phase 5b.

## Задание (одно для всех)

Собрать **свой вариант** полного UserCase «combined-детекция + alarm-loop» из
существующей палитры (v0.4–v0.9 + basn):

аудиопоток → окно → анализ **двумя детекторами** (trends + ensemble) → fusion
(combinedScore) → branch по детекции → [detected: запись трека → **единый**
combined-отчёт → публикация; alarm-loop с proximity до потери дистанции (lost)] —
отчёты и трек **асинхронно**, main loop не блокируется.

## Constraints

- Ветка **только** `comp/comp-detection-alarm-2026-07-10/<team>`; изоляция hard (см. регламент §Участники).
- **Никаких новых узлов палитры и контрактов core** — только сборка графа из существующего
  (+ данные UserCase: entry, layout, документ, policy-значения на узлах).
- device-board зависит только от core (`check:boundaries`); Web Audio только через engine.
- Alarm-loop — **композиция**: `branch-on-detection` → `make-proximity-trend` → `is-valid`
  (false = lost = выход) → `loop-repeat`. Новых loop-примитивов нет.
- Async — существующие `start-async-job` (`report-build`/`track-upload`) / `on-async-resolved`;
  тяжёлая работа не блокирует итерацию main loop.
- Реестр/каталог: entry `tier: community`, id `usercase-detection-alarm-<team>`.

## Definition of Done (одинаков для всех команд)

- [ ] `loadDocument` UserCase возвращает **валидный непустой граф** полной цепочки задания.
- [ ] Сценарий монтируется и проходит **runtime-smoke** (vitest, по образцу
      `combined-report-executor.test.ts` §эпик-smoke): detected-путь + alarm до lost + выход.
- [ ] Карточка видна в пикере (`community`), title/description честные (DSP-ансамбль, не нейро).
- [ ] device-board baseline **650 tests не ломаем**; scoped CI зелёный
      (`turbo lint typecheck test --filter=@membrana/device-board --filter=@membrana/client`).
- [ ] `CONCEPT.md` с обоснованием топологии и policy-выборов.

## Out of scope

- Новые узлы/контракты core, изменения executors/host.
- Кабинет/сервер/wire-контракт; прод-деплой; нейро model-provider (yamnet).
- Merge между ветками команд (DQ).

## Demo script (единый для consilium)

1. `yarn workspace @membrana/client dev` → device-board → пикер → UserCase команды → Apply.
2. Пуск → живой микрофон; дрон-звук (телефон) ≥15 сек.
3. Наблюдаем: детекция (branch → detected), запись трека, combined-отчёт в журнале
   (per-detector + combinedScore), alarm-ветка живёт (proximity: ближе/дальше).
4. Тишина ≥15 сек → proximity `lost` → выход из alarm-loop → main loop продолжает.
5. `yarn logs:parse` — chain-log: async job report-build не блокировал итерации.

## Evaluation hints (для жюри)

- Читаемость графа на канвасе (layout, использование sequence/групп) — оператор должен
  понять сценарий без документации.
- Осмысленность policy-значений (окна, пороги, smoothing) и использование вариадики
  fusion (2 детектора обязательны; 3–4 DSP — по обоснованию, не ради количества).
- Идемпотентность отчётов при повторах alarm-loop (дубли = минус).
- Наблюдаемость: print/journal-узлы в ключевых точках vs шум.
- Честность demo: живой микрофон, не только vitest.

## Scorecard weights

Дефолтные (C1 1.5 · C2 2.0 · C3 1.5 · C4 1.5 · C5 1.5 · C6 1.0); Музыкант голосует
полным весом (brief про звук).

## Timeline (сжатый однодневный)

| Phase | Target |
|-------|--------|
| 1 (concept) | 2026-07-10 до ~12:00 |
| 2α (slice) | до ~14:00 |
| 2β (full DoD) | до ~17:00 |
| 3–4 (consilium+vote) | до ~19:00 |
| 5 (+5b catalog) | вечер / утро 11.07 |
