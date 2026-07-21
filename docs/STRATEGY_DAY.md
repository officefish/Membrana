<!-- Сгенерировано: 2026-07-21T02:20:02.203Z (node scripts/strategy-day.mjs) -->
<!-- Детерминированный горизонт дня #592; без сети/LLM. Источник вехи: docs/strategy/day-horizon.json -->

## Горизонт дня

- **Веха (gate):** `secret-parser-built`
- **Фаза:** approaching
- **Критерии прохождения вехи:**
  - night-triage-secret-scan.mjs имеет резак, а не только детектор паттернов
  - выполнен один датированный проход с манифестом ротации засвеченных ключей
  - амнистия на правку архива снимается прохождением этого гейта (предикат, не дата)

## Посылки горизонта (граф правды)

_Кристаллов активно: 93 (owner: 58, derived: 35). Стратегия читает граф правды (S7)._

- 🪨 `research-night-sensemaking-morning` — Внешние исследования проводятся ночью и осмысливаются утром; дневная стратегия делается утром. Вечер — подведение итогов…
- 🪨 `weekly-strategy-frozen` — Недельная стратегия пока замораживается — уровень планирования слишком серьёзный, пока не разобрана дневная рутина.
- 🪨 `truth-artifacts-called-crystals` — В документах артефакты правды называются только КРИСТАЛЛАМИ.
- 🪨 `secret-parser-cuts-aggressively` — Парсер секретов режет агрессивно: бэкап сессии — только архив и подтверждение истины, его не читают ни код, ни промпт.
- 🪨 `session-backup-requires-secret-redaction` — Секреты вырезаются парсером ДО бэкапа сессий — сырые транскрипты на сервер не уходят.
- 🪨 `credential-rotation-biweekly` — Ключи доступа перевыпускаются раз в две недели везде, где это возможно.
- 🪨 `alex-sparring-answered` — Ответ Алексу на спарринг про «паспорт детектора» отправлен.
- 🪨 `graph-first-step-572-dropped` — Первое в контуре доверия — пять вопросов, уронённых консилиумом 16.07 (#572): C1 гейты приходят позже факта, C2 должен л…
- …ещё 50 owner-кристаллов

## Акценты (highlights)

**Своевременные** (веха близко И область молчит):
- **Сегодняшний ritual:day продемонстрирует… × Граф правды второй день вытесняет рутину…** — `research:todays-ritual-will-demo-c1__truth-graph-displaces-its-own-purpose`

**Фоновые** (не своевременны сейчас):
- ~~**AI-агент построения UserCase по описанию пользователя**~~ — `insight:insight-agent-scenario-builder` _(stale · 2026-06-25)_
- ~~**Loop engineering: соревновательное тестирование с точками останова**~~ — `insight:insight-loop-engineering-competition-test` _(stale · 2026-06-25)_
- **Недельный аудит антипаттернов — бестиарий, детекторы, охотник-который-сам-не-молчун** — `insight:insight-weekly-antipattern-audit-bestiary`
- **Явные palette-узлы перехода лупов main↔alarm (vs рантайм-контракт)** — `insight:insight-explicit-loop-switch-nodes`
- **Сопряжение с внешним эффектором C-UAS (ВИЗОР-МПВС, запрос Дениса)** — `insight:insight-effector-cue-integration`
- ~~**Issue closure must account for every active registry child**~~ — `insight:insight-ghost-task-closure-invariant` _(stale · 2026-06-29)_
- **Версионируемые тулинг-киты: наборы умений агента под задачу** — `insight:insight-tooling-kits`
- ~~**Server forwarding — серверные функции сценария**~~ — `insight:insight-server-forwarding` _(stale · 2026-06-25)_
- **Токены правды: владельческие факты как источник истины для ритуала** — `insight:insight-truth-tokens-owner-facts`
- ~~**Dual-density UI: operator vs engineer mode**~~ — `insight:insight-rodchenko-operator-density-mode` _(stale · 2026-06-25)_
- **Начитанная виртуальная команда: досье персон + фоновый stack-watch за новинками стека** — `insight:insight-team-stack-watch`
- **QA-раздел в панели офиса: накапливать вопросы союзников и ответы команды** — `insight:insight-office-panel-qa-section`
- **Вечерний ритуал производит три опорных документа — топливо для агентов, симметрично дневному** — `insight:insight-evening-ritual-three-fuel-documents`
- **Нет субъекта действия: команда заявлена, но не исполняет** — `insight:insight-acting-subject-missing`
- ~~**Канонический FSM сессии recorder (anti-L18)**~~ — `insight:insight-kuryokhin-recorder-session-fsm` _(stale · 2026-06-25)_
- ~~**Акустические характеристики 7 классов звука free-v1: discriminative FFT features**~~ — `insight:insight-free-v1-acoustic-classes` _(stale · 2026-06-30)_
- **Линза Ожегова — кроссагентский скилл верификации ЧИСТОТЫ РЕЧИ (не грамотности)** — `insight:insight-ozhegov-lens-speech-purity-skill`
- **Интеграция внешнего датасета DADS (Антон) в контур детекторов** — `insight:insight-dads-detector-integration`
- ~~**Объект Slide и fullscreen-режим презентации сценария**~~ — `insight:insight-slide-fullscreen-presentation` _(stale · 2026-06-25)_
- ~~**Sunrise flashes — утренний тематический flash (RAG + news)**~~ — `insight:insight-sunrise-flash` _(stale · 2026-06-25)_
- **Полная чистка реестра: 189 фаз носят githubIssue своего эпика** — `insight:insight-registry-epic-issue-full-cleanup`
- **Research-tree как sprite-landscape (техника Bear 71, MIT)** — `insight:insight-research-tree-sprite-landscape`
- ~~**SearXNG — приватный keyless веб-поиск для агентов**~~ — `insight:insight-mcp-searxng-private-search` _(stale · 2026-06-27)_
- **Лендинг через челлендж — проба стратегических исходников в бою (Replit как кисть, Ожегов как судья)** — `insight:insight-landing-challenge-sources-in-battle`
- **Собственный полевой корпус: спецификация трека и ежедневная рутина сбора** — `insight:insight-own-field-corpus-single-spec`
- ~~**Мост adopted insight → week epic (LGTM gate)**~~ — `insight:insight-vesnin-adopted-epic-bridge` _(stale · 2026-06-25)_
- ~~**Архивация сессий AI-агентов**~~ — `insight:insight-sessions-archive` _(stale · 2026-06-28)_
- ~~**Hindsight — обучающаяся память агента между сессиями**~~ — `insight:insight-mcp-hindsight-agent-memory` _(stale · 2026-06-27)_
- ~~**ServerFunctionRegistry в @membrana/core**~~ — `insight:insight-ozhegov-server-function-registry` _(stale · 2026-06-25)_
- **Живой нейро-combined детектор (эшелон-2-live): yamnet в combinedScore** — `insight:insight-live-neural-combined-detector`
- ~~**Хранилище архива закрытых задач: append-only log vs Postgres**~~ — `insight:insight-task-archive-storage` _(stale · 2026-06-28)_
- ~~**Chain-log golden oracle для operator smoke**~~ — `insight:insight-dynin-chain-log-golden-oracle` _(stale · 2026-06-25)_

## Provenance каналов

- ✅ `insight` — жив, элементов: 32
- ✅ `research` — жив, элементов: 1

> Стратегия описывает акцент (`highlight`), но не назначает исполнителей и не пишет DoD:
> `assign(task, persona)` — операция реестра, не стратегии (Q1).
