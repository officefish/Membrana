<!-- Сгенерировано: 2026-06-29T06:29:11.876Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

**Дата:** 2026-06-29 | **Период:** 2026-06-28 (последние ~24 часа) | **Статус ветки:** techies68

---

## 1. Что сделано за период (последние сутки)

### 1.1 Инфраструктура и workflows
- **Commit f502573, 697f289, dc42514:** Добавлена структура **team evening feedback** (обязательный skill для проактивного сбора ревью команды в `ritual:evening`). Обновлены `CLAUDE.md`, добавлена карточка скилла в `.claude/skills/`.
- **Commit bbca9d9:** Автоматизирована **дневная архивизация** (DAILY_STANDUP, MAIN_DAY_ISSUE, STRATEGIC_PLAN переносятся в `docs/archive/daily-day/` с манифестом).

### 1.2 Инсайты и исследовательский слой
- **Commit 2c5d00c:** **Полный lifecycle двух инсайтов:**
  - `insight-sessions-archive` (weight 6.8, quarter-горизонт) — архивация сессий Claude-Code с JSONL-адаптером и скрабом.
  - `insight-task-archive-storage` (weight 7.6, week-горизонт) — хранилище архива задач через append-only JSONL вместо Postgres.
  - Оба прошли RESEARCH → REVIEW → ADOPTED; регистрация в `docs/insights/registry.json`.
- **Commit 9973346:** Инсайты зафиксированы в `docs/INSIGHTS.md` с метаинформацией.

### 1.3 Workflows: автоматизация закрытия задач
- **Commit 75f0a3c:** Добавлена **автоматизированная система closure review** (TCR — Task Closure Review):
  - `TASK_CLOSURE_REVIEW_PROMPT.md` (полный prompt для Teamlead-проверки закрытия).
  - Обновлены скилы в `.agents/`, `.claude/`, `.cursor/` с regulation-схемой.
  - Scripts: `task-closure-review.mjs`, тесты, JSON-schema для отчётов.
  - Интегрирована в `package.json` (`task:review:prepare/run/status/finalize`).

### 1.4 CI/CD: видимость тестов
- **Commit f92b705 (closes #29):** Добавлены **JSON-репортёры тестов** в 4 пакета (`fft-analyzer`, `core`, `telemetry`, `background-office`). Артефакты загружаются в GitHub Actions (retention 7d). Документировано в `CONTRIBUTING.md`.
- **Commit 946d2aa (closes #12):** Добавлен обязательный шаг `yarn test:scripts` в CI (проверка инвариантов root-скриптов).

### 1.5 Архитектура: устранение boundary-нарушения
- **Commit 017f5cd (closes #185):** **Удалена граница сервис ↔ device-board** — `@membrana/usercase-catalog-service` больше не зависит от `device-board`, контракты миграли в `@membrana/core`. Обновлены импорты в `apps/client`, `packages/device-board/`, `packages/services/usercase-catalog/`. Добавлены промпт и консилиум обоснования (`ISSUE_185_BOUNDARY_REMEDIATION_SPRINT_PROMPT.md`, `seanses/issue-185-boundary-decision-2026-06-28.md`).

### 1.6 Исследовательский прототип: Research-Tree
- **Commit 30c130b:** Фиксирована начальная версия **Knowledge Graph для Research-Tree** (`membrana-knowledge-graph.json` v0.3, 60+ узлов). Подготовлены спецификации: `KNOWLEDGE_GRAPH_SPEC.md`, `DEMO_STACK.md`, `AGENT_TASK.md`, `README.md`. Стек: React+Vite+xyflow+DaisyUI (0 новых зависимостей).

### 1.7 Инструментарий разработчика
- **Commit f6cbe17:** Добавлены скрипты `proxy:claude` (Hiddify-specific launcher) и команды `task:review:*` в `package.json`.
- **Commit 9061433:** Добавлен `scripts/proxy-claude.mjs` для альтернативного запуска Claude Code через Hiddify Mixed (порт 12334).

**Итог:** Сутки сосредоточены на **инфраструктуре workflows** (closure review, evening feedback, архивизация), **инсайт-исследовании** (sessions/task-archive), **CI-видимости** (тесты в GitHub Actions) и **архитектурной чистке** (device-board boundary). **Основной код детекции и fusion не менялся.**

---

## 2. Привязка к стратегической цели

### Текущая позиция на дорожной карте
Система находится **на конце Этапа 0 — Фундамент** (WHITE_PAPER §8):
- ✅ `audio-engine` поставляет кадры.
- ✅ `fft-analyzer` даёт спектр в реальном времени.
- ✅ Клиент умеет показывать спектр.
- **На пороге Этапа 1.A (DSP-эшелон)**, но **не** в смысле «давайте бенчмарка harmonic/cepstral/flux», а в смысле **продакшн-готовности trends-детектора**.

### Что из сделанного приближает цель
1. **Хранилище инсайтов** (`insight-task-archive-storage`) — закладывает основу для **логирования и доказательной базы** целей, требуемой в WHITE_PAPER §2 (п. 5: «логи и доказательная база»).
2. **Closure review & evening feedback** — систематизируют анализ, нужны для скорости итераций на Этапе 1.A/1.B (где много дита в детекторы ложится).
3. **CI-видимость тестов** — обеспечивает confidence перед переходом на многоузловую архитектуру (Этапы 2–4), где синхронизация критична.
4. **Device-board boundary fix** — убирает архитектурный долг, освобождает руки для фокуса на core-функциональность.

### Что нейтрально
- Research-Tree (Knowledge Graph) — горизонтный проект визуализации, вспомогательный для обучения, не блокирует основной путь.

### Что отвлекает (минимум)
- Нет критических отвлечений; все сделанное — инфраструктурное улучшение, необходимое для масштабирования.

### Недостающие сервисы для Этапов 1.A—4

По WHITE_PAPER §6 и ARCHITECTURE.md §1a, нужны:

| Сервис | Статус | Целевой этап | Примечание |
|--------|--------|--------------|-----------|
| `@membrana/harmonic-detector-service` | реализован v0.1 | 1.A | DSP, только диагностика (не gate-критерий) |
| `@membrana/cepstral-detector-service` | scaffold | 1.A | DSP, только индикатор |
| `@membrana/spectral-flux-detector-service` | scaffold | 1.A | DSP, только индикатор |
| `@membrana/detection-ensemble-service` | план | после gate 1→2 | агрегация детекторов |
| `@membrana/tdoa-service` | **заморожен до gate** | 2 | извлечение TDOA |
| `@membrana/localizer-service` | **не начат** | 3 | мультилатерация |
| `@membrana/tracker-service` | **не начат** | 4 | ассоциация + Калман |
| `@membrana/transport-service` | **не начат** | 2+ | шина событий узел↔сервер |

**Стратегический вывод:** Ближайшие 2–3 дня должны сосредоточиться на **продакшн-готовности trends-detector** (DRONE_TIGHT + template-match catalog) и **validated dataset**, а НЕ на повторном бенчмарке трёх отдельных DSP-детекторов.

### Детекция: что говорит FFT_METRICS_POTENTIAL_AND_LIMITS.md
- **Эшелон 0 (DSP/FFT на free-v1) исчерпан:** лучший результат — trends `DRONE_TIGHT` (95% recall / 30% FPR).
- **Гармонический, кепстральный, spectral-flux по отдельности** — НЕ проходят даже мягкую планку (88–100% FPR).
- **Что дальше:** trends-куратор в template-match (catalog), validated датасет (VDR) или прыжок на эшелон 2 (CLAP/YAMNet zero-shot).
- **Не делать:** `yarn benchmark:detectors` на free-v1 без смены датасета, алгоритма или fusion-стратегии (см. §6 того документа).

---

## 3. Риски и долг

### Технические риски

1. **Синхронизация времени (WHITE_PAPER §9, риск 4):** Система на Этапе 1.A ещё одноузловая, поэтому синхронизация кажется не критичной. **Риск:** когда дойдём до Этапа 2 (TDOA на паре узлов), обнаружим, что NTP-разброс превышает допуск (микросекунды нужны для разрешения в метры). **Действие:** начать накапливать GPS-PPS данные и тестовые мотажи с dual-sync уже сейчас, параллельно trends-куратору.

2. **Многолучёвость (WHITE_PAPER §9, риск 3):** Акустические отражения в реальном помещении/на улице будут портить TDOA. На одном узле невидимо. **Риск:** на Этапе 2–3 обнаружим, что GCC-PHAT даёт систематическое смещение. **Действие:** заложить в `@membrana/core` типы для robust-оценок и median-фильтрации уже в фундамент (не откладывать на Этап 2).

3. **Дальность vs звук (WHITE_PAPER §9, риск 2):** Система рассчитана на нижнее небо (до ~1500 м), но за пределами слышимости (ветер, расстояние) гулит в шуме. На текущих данных это видимо (тихие дроны в ESC-50), но иммунитета нет. **Риск:** при расширении датасета на реальную тишину (сельская местность ночью) может потребоваться переучивание trends-шаблонов. **Действие:** зафиксировать текущий куратор как `DRONE_TIGHT_FREE_V1` (версия) и подготовить VDR-pipeline для сквозной переучивания.

### Накопленный архитектурный долг

1. ✅ **Device-board boundary** — устранен в commit 017f5cd. Долг погашен.
2. **Сокращение Cursor rules vs действительность:** `.cursorrules` может не синхронизироваться с новыми соглашениями (skills, closure review, evening feedback). **Действие:** добавить в `yarn test:scripts` проверку консистентности `.cursorrules` ↔ docs.
3. **Research-Tree & Knowledge Graph:** Достаточно автономна, но нужна интеграция с основным монорепо после render-фазы (синхронизация версий, веб-deployment). Пока risk low (изолирован в `apps/demos/`).

### Нарушения границ пакетов (по дифф-у)

- **Commit 017f5cd:** Исправлены нарушения — больше нет. `usercase-catalog-service` перестала зависеть от `device-board`.
- **Повторная проверка:** На ветке есть untracked файлы (`docs/intern/`, `docs/prompts/TASK_PROMPT_GHOST_CLOSURE_SPRINT.md`, `tools/`) — скорее всего draft-материалы. Нужно очистить перед merge.

---

## 4. План на следующий день

### Задача 1: Продакшн-готовность trends-детектора (DRONE_TIGHT куратор)

**Цель:** Фиксировать в `template-match` каталоге окончательный шаблон `DRONE_TIGHT` с документацией, готовым к использованию в `@membrana/trends-detector-service`.

**Пакет / слой:** `packages/services/trends-detector/` (analyzer) + `packages/core` (типы шаблонов).

**Связь с WHITE_PAPER:** §8 Этап 1.A — демонстрируемое качество на одном узле; §5 Контракт наблюдения — шаблоны — часть контракта фьюжена.

**Definition of Done:**
- [ ] `packages/core/src/detector/template.ts` расширена: версионирование шаблонов (DRONE_TIGHT_FREE_V1 vs будущие), metadata (датасет, метрики recall/FPR на валидационном сете).
- [ ] `packages/services/trends-detector/templates/` содержит окончательный `DRONE_TIGHT.json` с сигнатурой: спектр (centroid 2900–4300, flux 0.03–0.16, rms 0.07–0.28), temporal (stability high/veryHigh, volumeTrend stable, frequencyTrend stable), конкурирующие шаблоны-фоны.
- [ ] README.md в trends-detector обновлен: таблица шаблонов, когда какой использовать, результаты бенчмарка на val (95% recall / 30% FPR / F1 0.844).
- [ ] Unit-тесты в `trends-detector.service.test.ts` — scoring на mock-сэмплах с known-patterns (drone stabil, bird chirp, wind gust).

**Роль:** Математик (туняет параметры шаблона) + Музыкант (проверяет на реальных аудиосэмплах).

**Размер:** M (3–4 часа дизайна + 1–2 часа рефакторинга, если нужна версионизация в core).

---

### Задача 2: Validated Dataset Infrastructure (VDR) — спецификация и bootstrap

**Цель:** Создать облегченное хранилище для валидационного датасета с контролем версий и метаданными, готовое к заполнению на следующих неделях.

**Пакет / слой:** `docs/datasets/` (новый) + `scripts/` (утилиты для VDR).

**Связь с WHITE_PAPER:** §8 Этап 1.A: stage-gate требует надежного датасета, не free-v1 с его шумом.

**Definition of Done:**
- [ ] `docs/datasets/VDR_SCHEMA.md` — спецификация структуры (сэмплы, labels, metadata: source, datetime, drone-type, confidence).
- [ ] `docs/datasets/README.md` — кто может добавлять, как валидировать, где хранить (рекомендация: git-lfs или S3 для больших файлов).
- [ ] `scripts/vdr-tools.mjs` — утилиты: `vdr:list` (показать датасеты), `vdr:validate` (проверить целостность), `vdr:export-as-train-test` (сплит для бенчмарка).
- [ ] Bootstrap: один тестовый сэмпл в `docs/datasets/free-v1-curated/` как пример.
- [ ] Документирование в `CONTRIBUTING.md` — как добавить новый сэмпл в VDR.

**Роль:** Структурщик (дизайн schema) + Теслад (approval спецификации).

**Размер:** S (3–4 часа дизайна + bootstrap).

---

### Задача 3: Закрытие task-closure-review пилота (R5) и финализация workflow

**Цель:** Стабилизировать механизм closure review (piloted в R5), обновить документацию, готовый к использованию для всех будущих tasks.

**Пакет / слой:** Корневая инфра (`scripts/`, `package.json`, `docs/`).

**Связь с WHITE_PAPER:** Косвенно — повышает качество итераций и прозрачность Этапов 1–4.

**Definition of Done:**
- [ ] `docs/seanses/closure-review-process-consilium-2026-06-28.md` обновлена с выводами R5-пилота (что работало, что нужно улучшить).
- [ ] `TASK_CLOSURE_REVIEW_REGULATION.md` нормализована под финальное использование (убираем слово «pilot»).
- [ ] Скрипты `task:review:*` протестированы на 2–3 真實 closed tasks (не пилотных) → отчёты в `docs/reviews/`.
- [ ] Integration test в `scripts/task-closure-review.test.mjs` проходит со 100% покрытием новых путей.
- [ ] `CONTRIBUTING.md` расширена: раздел «Закрытие task'а» с примером.

**Роль:** Teamlead (regulation, approval) + Структурщик (scripts + тесты).

**Размер:** M (4–5 часов работы с пилотом + нормализация).

---

### Задача 4: Research-Tree render-фаза — bootstrap React компонентов

**Цель:** Подготовить базовый React+Vite прототип для визуализации Knowledge Graph (xyflow-based), готовый к наполнению на следующей фазе.

**Пакет / слой:** `apps/demos/Research-Tree/` (прототип).

**Связь с WHITE_PAPER:** Вспомогательный проект для обучения и визуализации архитектуры; не critical-path, но ускоряет onboarding команды.

**Definition of Done:**
- [ ] `apps/demos/Research-Tree/` содержит `vite.config.ts` с alias'ами на монорепо-типы; `src/components/` с KnowledgeGraphRenderer (xyflow-based).
- [ ] Mock-данные из `membrana-knowledge-graph.json` загружаются и визуализируются: узлы (concept, artifact, service) + edges (depends, implements, leverages).
- [ ] `yarn dev` в Research-Tree запускается без ошибок, показывает граф; интерактивность (pan/zoom/select) работает.
- [ ] README.md обновлен: как запустить, как добавить новый узел в граф (edit JSON + reload).
- [ ] Нет новых npm-зависимостей (xyflow уже есть в экосистеме или совместимо).

**Роль:** Верстальщик (React, xyflow, стили) + Математик (граф-логика).

**Размер:** M (4–5 часов, есть spec, нужно воплощение).

---

### Задача 5: Specification — TDOA и Localizer контракты (дизайн, не реализация)

**Цель:** Подготовить контракты `@membrana/core` для Этапа 2 (TDOA & локализация), чтобы когда stage-gate 1 пройдет, можно сразу начинать реализацию без переделки типов.

**Пакет / слой:** `packages/core/src/` (новые типы) + `docs/prompts/` (спецификация).

**Связь с WHITE_PAPER:** §4.4 Слияние данных — локализация через TDOA; §5.2 Мультилатерация — математика.

**Definition of Done:**
- [ ] `packages/core/src/tdoa/index.ts` — типы: `SyncedObservation`, `TimeSyncProvider` (PPS vs NTP contracts), `TdoaResult` (пара узлов → delay + confidence).
- [ ] `packages/core/src/localization/index.ts` — типы: `LocalizationHypothesis` (координаты + covariance), `MultilaterationInput` (набор TDOA), `LocalizerPort` (интерфейс сервиса).
- [ ] `docs/prompts/TDOA_AND_LOCALIZATION_SPEC_PROMPT.md` — full specification: algorithm (GCC-PHAT для TDOA, Gauss-Newton для мультилатерации), инварианты (обусловленность, robust-оценки), тестовые cases.
- [ ] Диаграмма в `docs/architecture/fusion-pipeline.md` — где живут эти контракты в слое fusion.
- [ ] `packages/core` компилируется без ошибок, новые типы экспортируются из `index.ts`.

**Роль:** Структурщик (дизайн типов) + Математик (спец контракта).

**Размер:** M (3–4 часа дизайна, 1–2 часа документации).

---

### Задача 6: CI — добавить test-coverage reporting (GitHub Actions artifact)

**Цель:** Расширить CI видимость тестов: добавить coverage-отчёты (Istanbul/c8) в 4 пакета, загрузить в GitHub Actions для trend-анализа.

**Пакет / слой:** Корневая инфра (`.github/workflows/`, `vitest.config.ts` в пакетах).

**Связь с WHITE_PAPER:** Косвенно — перед переходом на Этапы 2–4 (multi-node) нужна высокая confidence в core-функциях.

**Definition of Done:**
- [ ] `.github/workflows/unit-tests.yml` расширена: добавлен шаг "Generate coverage" (c8 или встроенный vitest --coverage).
- [ ] Coverage-JSON загружается как artifact (actions/upload-artifact@v4, name: coverage-reports, retention 30d).
- [ ] Comment-bot в PR показывает дельта-coverage (если упал — флаг warning). Опционально: интеграция с codecov или Coveralls.
- [ ] `vitest.config.ts` в 4 пакетах (`core`, `fft-analyzer`, `telemetry`, `background-office`) имеет `coverage: { provider: 'v8', reporter: ['json', 'html'] }`.
- [ ] `CONTRIBUTING.md` обновлен: требуемый уровень coverage (e.g., ≥85% на новый код).

**Роль:** Структурщик (CI) + DevOps-touch (GitHub Actions).

**Размер:** S (2–3 часа настройки + тестирование).

---

## 5. Что НЕ делаем на этом горизонте

1. **Не повторяем unified benchmark harmonic + cepstral + spectral-flux на free-v1.** Это исчерпано (see FFT_METRICS_POTENTIAL_AND_LIMITS.md §6). Ждём либо нового датасета (VDR-эпик), либо смены алгоритма (trends куратор), либо jump на эшелон 2 (CLAP/YAMNet zero-shot). Benchmark можно переснять, когда `DRONE_TIGHT` in catalog + VDR готов.

2. **Не начинаем Этап 2 (TDOA, локализация на паре узлов) до stage-gate 1 → 2.** Stage-gate требует precision ≥85% + recall ≥90% на одном узле, или обоснованное отклонение (e.g., trends=go, одиночные DSP=no, но в совокупности pass). Сейчас trends достаточно сильна; TDOA может подождать.

3. **Не трогаем детекторы (harmonic/cepstral/spectral-flux) как селекторы дронов.** Они only диагностические (объяснимость, обучение). DSP-энергия идёт на куратор trends-шаблонов и фоновых конкурентов (bird, insect, wind, etc.).

4. **Не интегрируем нейро-модели (YAMNet, CLAP, etc.) до эшелона 2, пока не будет стратегии в INTEGRATIONS_STRATEGY.md.** Research-Tree graph можно пополнять идеями, но code-integration — позже.

5. **Не масштабируем Knowledge Graph до render-фазы, пока не будет консенсуса по UI/UX.** Сейчас bootstrap достаточно; рендер идёт параллельно в задаче 4.

---

## 6. Проверки в конце периода

1. **Trends-куратор финализирован и задокументирован:** `DRONE_TIGHT.json` в каталоге, README с метриками (95% recall / 30% FPR / F1 0.844), unit-тесты pass, `yarn test:services:trends-detector` ≥95% покрытие.

2. **VDR инфраструктура подготовлена:** `docs/datasets/VDR_SCHEMA.md` и утилиты `vdr:list/validate/export` работают, один test-сэмпл в репо, CONTRIBUTING.md обновлен.

3. **Task-closure-review нормализирован:** скрипты `task:review:*` успешно закрывают ≥2 реальных task'а, отчёты в `docs/reviews/`, regulation.md финализирована.

4. **Research-Tree render-фаза: граф видится в браузере:** `yarn dev` в `apps/demos/Research-Tree/` показывает Knowledge Graph с xyflow-интерактивностью, no new npm deps, граф загружается из JSON.

5. **Core-типы Этапа 2 готовы к дизайну:** `packages/core` компилируется, `tdoa/` и `localization/` контракты экспортируются, spec-промпт готов для реализации на следующей итерации.

6. **CI: coverage-reporting настроен и работает:** GitHub Actions загружает coverage-artifacts, пример pull-request comment с дельта-coverage видимо (или dry-run в документации).

---

## Итого

**Магистраль:** Trends-куратор (задача 1) + VDR bootstrap (задача 2) → готовимся к stage-gate. Задачи 3–6 — инфра и подготовка Этапа 2. **Антимагистраль:** не трогаем повторный FFT-бенчмарк на free-v1, не начинаем Этап 2 без gate, не интегрируем нейро без стратегии.