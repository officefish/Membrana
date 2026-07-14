# Промпт: борд detector-compare — таблица trends DRONE_TIGHT vs yamnet в панели

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1–2 PR** — экспортёр+артефакт, затем UI-раздел панели.
> Реестр: `id` = `panel-detector-compare-board` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Магистраль дня 2026-07-14 (владелец): операторская таблица сравнения двух
детекторов — trends **DRONE_TIGHT** (эшелон A, curated-шаблон) и **yamnet**
(эшелон B) — на корпусе бенчмарка. Живёт в `apps/panel`, раздел
`detector-compare` (заглушка уже в shell, OP3). Потребитель №2 эпика #438
(каркас панели OP1–OP5 закрыт 2026-07-14).

**Консилиум-гейт пройден ДО кода:**
[`detector-compare-board-2026-07-14.md`](../seanses/detector-compare-board-2026-07-14.md)
— все 6 развилок решены (сгенерирован координатором по подписке: API-ключ
Anthropic исчерпан; формат канона соблюдён). Спор НЕ переоткрывать.

**Видение владельца (дословно зафиксировано):** таблица всех звуков; трек
слушается с waveform (как в библиотеке сэмплов); метаданные; два вердикта
дрон/не-дрон; в ячейке вердикта значок «подробнее» → попап с метриками и
пояснением, на основании чего детектор решил; фильтр все/дрон/не-дрон;
сортировка «увереннее выше/ниже».

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| Протокол консилиума (выше) | Спецификация всех решений |
| `scripts/benchmark-detectors.mjs` + `scripts/lib/benchmark-*` | Инфраструктура прогона (переиспользовать, не копировать) |
| `docs/DETECTOR_BENCHMARK.md` | Текущие метрики обоих детекторов |
| `apps/panel/src/lib/sections.ts` | Раздел `detector-compare` (operator) |
| [`PANEL_DEPLOY.md`](../deploy/PANEL_DEPLOY.md) | +1 строка деплоя аудио-бандла |
| [`DESIGN.md`](../DESIGN.md) | tabular-nums, вердикт не только цветом, a11y |

**GitHub Issue:** #452.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план. Вердикты консилиума detector-compare-board НЕ переоткрывать.

---

### Что построить (порядок: экспортёр → артефакт → UI)

1. **Экспортёр `scripts/detector-compare-export.mjs`** (`yarn detector:compare:export`):
   прогон trends(DRONE_TIGHT) + yamnet по бенчмарк-манифесту (переиспользовать
   раннер `benchmark:detectors`, не копировать) → **`docs/reports/detector-compare/latest.json`**
   (в git). Схема: `{schemaVersion, generatedAt, corpus:{name,manifestSha},
   thresholds:{trends,yamnet}, summary:{trends:{P,R,F1,FPR}, yamnet:{…}},
   samples:[{id,file,className,isDroneTruth,durationSec,meta,detectors:{trends:Verdict,yamnet:Verdict}}]}`;
   `Verdict={isDrone,score,confidence,details,explanation}`. `explanation` —
   детерминированный шаблон (trends: шаблон/окна/пики; yamnet: топ-5 классов →
   агрегат ≥ порога), БЕЗ LLM. Чистые функции сборки записи/пояснений +
   снапшот-тесты на фикстурных вердиктах.
2. **Аудио-бандл** (вне git): экспортёр умеет `--audio-out <dir>` — копирует wav
   корпуса под `/compare-audio/<id>.wav`; строка деплоя в PANEL_DEPLOY.md.
3. **UI-раздел `detector-compare`** в `apps/panel`: таблица (строка: play +
   mini-waveform, имя/класс/длительность/метаданные, две ячейки вердикта
   «слово+скор+значок подробнее»), попап `<dialog>` (метрики + explanation),
   фильтры **все | дрон | не дрон | расхождения**, сортировка по уверенности
   выбранного детектора ↑/↓, сводка P/R/F1/FPR в шапке. Данные —
   `fetch('/compare-data/latest.json')`; в dev — vite static/proxy.
4. **Mini-waveform локально** (~50 строк): `decodeAudioData` + canvas, downsample
   по max-амплитуде на бакет (пики честные), ОДИН AudioContext на страницу,
   старт нового трека останавливает предыдущий.

### Запрещено (вердикты консилиума)

- Live-вычисление детекций (в браузере или office); изменения office и
  `packages/services/detectors/*`.
- Новые зависимости панели (в т.ч. `@membrana/sample-playback-service` — паритет
  вида, не кода); импорт детекторных пакетов в панель (контракт = JSON).
- LLM в пояснениях; аудио-бандл в git; перекодирование wav.
- Скрытие данных как «защита»: данные публичны (уже в открытом репо), operator-гейт
  раздела — UX, задокументировать.

### Тесты

| Область | Минимум |
|---------|---------|
| Экспортёр | чистые функции записи/explanation — снапшот на фикстурах; идемпотентность (повторный прогон не меняет JSON) |
| Панель | парс/валидация схемы артефакта; фильтры и сортировка — чистые функции + тесты; downsample waveform — тест на пики |
| A11y | вердикт словом, aria-label play/подробнее, tabular-nums, состояния loading/error/empty |

### Definition of Done

- [ ] `yarn detector:compare:export` детерминирован; `latest.json` в git.
- [ ] Раздел живёт в панели за operator-уровнем; всё видение владельца покрыто (таблица/waveform/попап/фильтры/сортировка/сводка).
- [ ] `yarn turbo run lint typecheck test build --filter=@membrana/panel --continue` + `test:scripts` зелёные.
- [ ] PANEL_DEPLOY.md дополнен строкой аудио-бандла.
- [ ] LGTM Teamlead (closure review; при пустом API — fallback `--review-file`).

### Out of scope

- Live-детекция в панели; расширение корпуса; office-ручки; журнал прослушиваний; экспорт CSV.

### Порядок работы ролей

1. **Teamlead (Vesnin)** — граница «панель = витрина артефакта», LGTM.
2. **Математик (Dynin)** — экспортёр: переиспользование бенчмарк-раннера, детерминизм, explanation-шаблоны, сводка.
3. **Верстальщик (Rodchenko)** — таблица/попап/фильтры по DESIGN.md, a11y.
4. **Музыкант (Kuryokhin)** — mini-waveform (честные пики), один AudioContext, wav без перекодирования.
5. **Структурщик (Ozhegov)** — контракт-JSON, локальные типы панели, ноль новых зависимостей.

---

## Заметки для человека-постановщика

1. Регистрация в реестре — сделана (`panel-detector-compare-board`, active, магистраль 2026-07-14).
2. Прогон экспортёра требует `yarn detectors:build` (yamnet в Node — прецедент ND3).
3. Аудио-бандл на VDS — после живого деплоя панели (хвост OP4: DNS владельца).
4. После merge: `yarn task:archive panel-detector-compare-board --notes "…"`.

### Проверка после PR

```bash
yarn detector:compare:export && git diff --exit-code docs/reports/detector-compare/latest.json
yarn workspace @membrana/panel dev   # раздел detector-compare с данными
```

---

## Связь с дорожной картой

- Потребитель №2 каркаса эпика #438 (OP1–OP5 закрыты); №1 — drift-борд (#396).
- Продолжение линии DRONE_TIGHT (#84 → curated-каталог) и ND3 yamnet (F1 0.803).
