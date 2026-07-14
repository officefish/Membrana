# Промпт: qc-panel-boards — борды контроля качества в панели (drift-якоря + detector-compare)

> **Task-промпт для агента-разработчика.** Размер: **M**. Один PR.
> Реестр: `id` = `qc-panel-boards`. Issue: [#454](https://github.com/officefish/Membrana/issues/454).
> Консилиум-гейт пройден: [`quality-control-contour-2026-07-14.md`](../seanses/quality-control-contour-2026-07-14.md)
> (+ каркас: [`office-panel-contour-2026-07-14.md`](../seanses/office-panel-contour-2026-07-14.md), эпик #438 OP1–OP5 закрыт).

## Контекст

Панель `apps/panel` — дом командного контура контроля качества (вердикт консилиума).
Секции `drift-anchors` и `detector-compare` (обе `operator+`) стоят заглушками OP3.
Первая очередь: drift-борд + benchmark-таблица; **каждое число несёт происхождение**
(версия корпуса, дата прогона, версия детектора).

## Что построить

### QC1 — drift-борд (`apps/panel`)

- Источник: `GET /v1/drift-anchor/digest` (public, существует) → `{ records }` —
  0..3 записи (`code:ci`, `code:schedule`, `data:schedule`), вердикты уже вынесены
  чистой `computeDrift` продюсерами; ядро в панель НЕ импортировать.
- Рендер: по записи — якорь словом, вердикт `ok/drift/broken` словом + бейджем,
  `delta`, метрики записи, происхождение (`detectorVersion`, `takenAt` + возраст).
- Строка prod↔main: сравнение `detectorVersion` между `code:ci` и `code:schedule`
  (совпадает / разошлись / данных мало) — простое строковое сравнение.
- Честные состояния: loading / error / empty («журнал in-memory, сбрасывается
  рестартом office — ждём продюсеров»).

### QC2 — detector-compare (office → script → panel)

- **Office-модуль `modules/benchmark`** (канон push-ingest ADR 0004, образец —
  `modules/drift-anchor` и `modules/telegram`):
  - локальный zod-DTO (без импорта core): `{ generatedAt, datasetVersion,
    sampleCount, detectors: [{ name, family, status, metrics{tp,fp,fn,tn,
    precision,recall,f1,latencyP50Ms?,latencyP95Ms?} }] }` — **без perSample**
    (data-минимизация Q3: агрегаты, не сырьё);
  - `POST /v1/benchmark/report` за `ApiTokenGuard` — in-memory последний отчёт;
  - `GET /v1/benchmark/summary` за `@MinRole('operator')` (PanelAuthGuard —
    no-store/rate-limit/аудит приходят из OP5 бесплатно); нет данных → 404.
- **Скрипт `scripts/benchmark-push.mjs`** (`yarn benchmark:push`): читает
  `data/detectors-benchmark/v0.2/reports/latest.json`, строит summary
  (perSample отбрасывается), POST в office; `--dry-run`; ошибки → exit 1
  (команда интерактивная, не ритуальный хвост).
- **Панель**: секция `detector-compare` — таблица по детекторам: TP/FP/FN/TN,
  P/R/FPR/F1 (FPR = fp/(fp+tn), считать в чистой функции с тестом); провенанс
  в шапке борда: «прогон {generatedAt} · корпус {datasetVersion} ·
  {sampleCount} сэмплов». 401/403 → «нужен уровень operator»; 404 → «office
  ждёт push канонического прогона» + команда.

### Обвязка панели

- Простейшая навигация shell: карточка доступного раздела с контентом
  открывает борд (state, не router), кнопка «назад»; `ally-digest` остаётся
  заглушкой. A11y: focus-visible, aria-label, статусы словом не только цветом.

## Запреты / коллизия-гард

- **НЕ трогать** `docs/DETECTOR_BENCHMARK.md`, `data/detectors-benchmark/**`,
  `scripts/benchmark-detectors.mjs` — зона Задачи A (соседний worktree).
- Office stateless: только in-memory, никакой БД/файлов.
- Панель: без импорта internals кабинета/office; данные только через `/v1/*`.
- Без нового DSP-прогона; борд рендерит существующий канонический прогон.

## Тесты

| Область | Минимум |
|---------|---------|
| office benchmark | DTO-валидация (мусор → 400); GET без роли → 401/403; happy-path POST→GET; 404 без данных |
| скрипт | дистилляция фикстуры latest.json → summary без perSample; dry-run |
| panel lib | FPR/форматтеры/возраст записи — чистые функции; сравнение prod↔main (3 исхода) |

## DoD

- [ ] Обе секции живые за operator+, каждое число с происхождением.
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/background-office --filter=@membrana/panel` + `yarn test:scripts` зелёные.
- [ ] Живой smoke: `yarn benchmark:push` → summary виден на панели (после редеплоя office + панели).
- [ ] Отчёт в Issue #454, closure review LGTM.
