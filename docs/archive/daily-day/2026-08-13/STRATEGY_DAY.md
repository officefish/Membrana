<!--
  archive-role: archive-snapshot
  archive-day: 2026-08-13
  archived-at: 2026-08-13T18:22:18.483Z
  source: docs/STRATEGY_DAY.md
  canonical: docs/STRATEGY_DAY.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-08-13T10:15:01.311Z (node scripts/strategy-day.mjs) -->
<!-- Детерминированный горизонт дня #592; без сети/LLM. Источник вехи: docs/strategy/day-horizon.json -->
<!-- angelina {"author":"human","guard":"angelina","readAt":{}} -->

## Горизонт дня

- **Веха (gate):** `secret-parser-built`
- **Фаза:** approaching
- **Критерии прохождения вехи:**
  - night-triage-secret-scan.mjs имеет резак, а не только детектор паттернов
  - выполнен один датированный проход с манифестом ротации засвеченных ключей
  - амнистия на правку архива снимается прохождением этого гейта (предикат, не дата)

## Посылки горизонта (граф правды)

_Кристаллов активно: 127 (owner: 81, derived: 46). Стратегия читает граф правды (S7)._

- 🪨 `research-night-sensemaking-morning` — Внешние исследования проводятся ночью и осмысливаются утром; дневная стратегия делается утром. Вечер — подведение итогов…
- 🪨 `weekly-strategy-frozen` — Недельная стратегия пока замораживается — уровень планирования слишком серьёзный, пока не разобрана дневная рутина.
- 🪨 `truth-artifacts-called-crystals` — В документах артефакты правды называются только КРИСТАЛЛАМИ.
- 🪨 `secret-parser-cuts-aggressively` — Парсер секретов режет агрессивно: бэкап сессии — только архив и подтверждение истины, его не читают ни код, ни промпт.
- 🪨 `session-backup-requires-secret-redaction` — Секреты вырезаются парсером ДО бэкапа сессий — сырые транскрипты на сервер не уходят.
- 🪨 `credential-rotation-biweekly` — Ключи доступа перевыпускаются раз в две недели везде, где это возможно.
- 🪨 `alex-sparring-answered` — Ответ Алексу на спарринг про «паспорт детектора» отправлен.
- 🪨 `graph-first-step-572-dropped` — Первое в контуре доверия — пять вопросов, уронённых консилиумом 16.07 (#572): C1 гейты приходят позже факта, C2 должен л…
- …ещё 73 owner-кристаллов

## Акценты (highlights)

**Своевременные** (веха близко И область молчит):
- ~~**Акустический пеленг в одиночку не наведё… × Эффекторный контур (наведение + воздейст…**~~ — `research:acoustic-alone-cannot-cue-effector__effector-layer-belongs-to-partners` _(stale · 2026-07-20)_
- ~~**Сегодняшний ritual:day продемонстрирует… × Граф правды второй день вытесняет рутину…**~~ — `research:todays-ritual-will-demo-c1__truth-graph-displaces-its-own-purpose` _(stale · 2026-07-17)_

**Фоновые** (не своевременны сейчас):
- ~~**Наземная пеленгация цели: угловой трек без дальности + временная фильтрация детекций**~~ — `insight:insight-bearing-tracking` _(stale · 2026-07-28)_
- ~~**Оркестрация хендофф: разрез дня на изолированные брифы с асимметрией знания**~~ — `insight:insight-handoff-orchestration` _(stale · 2026-07-27)_
- ~~**Ночной интерн документации: слепой проход → глубокий → дельта-патчи докам**~~ — `insight:insight-night-doc-intern` _(stale · 2026-07-28)_
- ~~**Комбинированный детектор: гармоника с FFT-ядра, тембр с MFCC**~~ — `insight:insight-mfcc-combined-two-cores` _(stale · 2026-07-30)_
- ~~**Контракт носителя: объявленный участник процедуры обязан быть вызываемым**~~ — `insight:insight-cast-carrier-contract` _(stale · 2026-07-25)_
- ~~**AI-агент построения UserCase по описанию пользователя**~~ — `insight:insight-agent-scenario-builder` _(stale · 2026-06-25)_
- ~~**Loop engineering: соревновательное тестирование с точками останова**~~ — `insight:insight-loop-engineering-competition-test` _(stale · 2026-06-25)_
- ~~**Недельный аудит антипаттернов — бестиарий, детекторы, охотник-который-сам-не-молчун**~~ — `insight:insight-weekly-antipattern-audit-bestiary` _(stale · 2026-07-17)_
- ~~**Явные palette-узлы перехода лупов main↔alarm (vs рантайм-контракт)**~~ — `insight:insight-explicit-loop-switch-nodes` _(stale · 2026-07-12)_
- ~~**Сопряжение с внешним эффектором C-UAS (ВИЗОР-МПВС, запрос Дениса)**~~ — `insight:insight-effector-cue-integration` _(stale · 2026-07-17)_
- ~~**Серверные генераторы: конверты → чистые функции office, git-роутер с очередями**~~ — `insight:insight-server-generators-office` _(stale · 2026-07-21)_
- **Портфель шотов всплывает в момент решения: акт Тарасова, выбор кандидатов, форкаст↔факт после мерджа** — `insight:insight-one-shot-portfolio-surfacing`
- **Депо: комната недельного охвата — глубокие аудиты и санитарные работы отдельным контуром** — `insight:insight-depot-weekly-room`
- ~~**Issue closure must account for every active registry child**~~ — `insight:insight-ghost-task-closure-invariant` _(stale · 2026-06-29)_
- ~~**Версионируемые тулинг-киты: наборы умений агента под задачу**~~ — `insight:insight-tooling-kits` _(stale · 2026-07-19)_
- ~~**Server forwarding — серверные функции сценария**~~ — `insight:insight-server-forwarding` _(stale · 2026-06-25)_
- ~~**Ночные сны → процедура во фреймах с настраиваемым через панель провайдером**~~ — `insight:insight-dreams-procedure-frames` _(stale · 2026-07-25)_
- **Память процедур: показывается, а не запрашивается; вовлечённость числом, а не подтверждением** — `insight:insight-procedure-memory-shown-not-asked`
- ~~**Оркестрация процедур через n8n: кожух и производный рендер поверх git как единственного источника правды**~~ — `insight:insight-procedures-orchestration-n8n` _(stale · 2026-07-26)_
- ~~**Токены правды: владельческие факты как источник истины для ритуала**~~ — `insight:insight-truth-tokens-owner-facts` _(stale · 2026-07-16)_
- ~~**Контейнер прецедентов + мастерская к нему**~~ — `insight:insight-precedent-container` _(stale · 2026-07-22)_
- ~~**Второй тариф: MFCC-спектр + нейроанализ спектрограмм машинным зрением, разделение продукта по тарифам**~~ — `insight:insight-spectrum-tiers` _(stale · 2026-07-28)_
- **Повестка заседания — выписка, а не проза председателя: машинные факты с id и зуб на посылки** — `insight:insight-meeting-agenda-as-extract`
- ~~**Dual-density UI: operator vs engineer mode**~~ — `insight:insight-rodchenko-operator-density-mode` _(stale · 2026-06-25)_
- ~~**Tier2: 5 канонических рабочих деревьев (main/tooling/product/codex/cursor), спринт всегда уходит в свою ветку**~~ — `insight:insight-tier2-worktree-topology` _(stale · 2026-07-20)_
- ~~**Начитанная виртуальная команда: досье персон + фоновый stack-watch за новинками стека**~~ — `insight:insight-team-stack-watch` _(stale · 2026-07-09)_
- ~~**QA-раздел в панели офиса: накапливать вопросы союзников и ответы команды**~~ — `insight:insight-office-panel-qa-section` _(stale · 2026-07-14)_
- ~~**Вечерний ритуал производит три опорных документа — топливо для агентов, симметрично дневному**~~ — `insight:insight-evening-ritual-three-fuel-documents` _(stale · 2026-07-17)_
- ~~**Нет субъекта действия: команда заявлена, но не исполняет**~~ — `insight:insight-acting-subject-missing` _(stale · 2026-07-18)_
- ~~**Канонический FSM сессии recorder (anti-L18)**~~ — `insight:insight-kuryokhin-recorder-session-fsm` _(stale · 2026-06-25)_
- ~~**Роутинг изменений: сессии без push, заявки-патчи, office-очередь, именные гейты**~~ — `insight:insight-change-routing-office` _(stale · 2026-07-22)_
- ~~**Акустические характеристики 7 классов звука free-v1: discriminative FFT features**~~ — `insight:insight-free-v1-acoustic-classes` _(stale · 2026-06-30)_
- **Счёт вмешательств владельца: суверенные против компенсирующих** — `insight:insight-owner-intervention-ledger`
- ~~**Линза Ожегова — кроссагентский скилл верификации ЧИСТОТЫ РЕЧИ (не грамотности)**~~ — `insight:insight-ozhegov-lens-speech-purity-skill` _(stale · 2026-07-17)_
- ~~**Интеграция внешнего датасета DADS (Антон) в контур детекторов**~~ — `insight:insight-dads-detector-integration` _(stale · 2026-07-17)_
- ~~**Объект Slide и fullscreen-режим презентации сценария**~~ — `insight:insight-slide-fullscreen-presentation` _(stale · 2026-06-25)_
- ~~**Тембровый детектор на MFCC: ловить портрет, а не гармонику**~~ — `insight:insight-mfcc-timbre-detector` _(stale · 2026-07-30)_
- ~~**Sunrise flashes — утренний тематический flash (RAG + news)**~~ — `insight:insight-sunrise-flash` _(stale · 2026-06-25)_
- ~~**Полная чистка реестра: 189 фаз носят githubIssue своего эпика**~~ — `insight:insight-registry-epic-issue-full-cleanup` _(stale · 2026-07-15)_
- ~~**Research-tree как sprite-landscape (техника Bear 71, MIT)**~~ — `insight:insight-research-tree-sprite-landscape` _(stale · 2026-07-17)_
- ~~**SearXNG — приватный keyless веб-поиск для агентов**~~ — `insight:insight-mcp-searxng-private-search` _(stale · 2026-06-27)_
- ~~**Борд состояния сети в харнес-панели (здоровье N серверов)**~~ — `insight:insight-network-status-board` _(stale · 2026-07-24)_
- ~~**Паттерн «Воспоминание» — как персона копит опыт**~~ — `insight:insight-persona-recollection-pattern` _(stale · 2026-07-30)_
- ~~**Лендинг через челлендж — проба стратегических исходников в бою (Replit как кисть, Ожегов как судья)**~~ — `insight:insight-landing-challenge-sources-in-battle` _(stale · 2026-07-17)_
- ~~**Формат разработки one shot: подобранная S-проблема за один проход, процедура во фреймах**~~ — `insight:insight-one-shot-format` _(stale · 2026-07-23)_
- ~~**Собственный полевой корпус: спецификация трека и ежедневная рутина сбора**~~ — `insight:insight-own-field-corpus-single-spec` _(stale · 2026-07-18)_
- ~~**Мост adopted insight → week epic (LGTM gate)**~~ — `insight:insight-vesnin-adopted-epic-bridge` _(stale · 2026-06-25)_
- ~~**Архивация сессий AI-агентов**~~ — `insight:insight-sessions-archive` _(stale · 2026-06-28)_
- ~~**Публикация документации туллинга на docs.mmbrn.tech (Mintlify custom domain)**~~ — `insight:insight-docs-custom-domain` _(stale · 2026-07-22)_
- ~~**Hindsight — обучающаяся память агента между сессиями**~~ — `insight:insight-mcp-hindsight-agent-memory` _(stale · 2026-06-27)_
- ~~**ServerFunctionRegistry в @membrana/core**~~ — `insight:insight-ozhegov-server-function-registry` _(stale · 2026-06-25)_
- ~~**Контракт намерения: граф правды ↔ мостик, треугольник + мана + твёрдость**~~ — `insight:insight-intent-contract-graph-bridge` _(stale · 2026-07-26)_
- ~~**Живой нейро-combined детектор (эшелон-2-live): yamnet в combinedScore**~~ — `insight:insight-live-neural-combined-detector` _(stale · 2026-07-12)_
- **Server-only прогон двух ритуалов через панель как показательный опыт автономии** — `insight:insight-server-only-ritual-run`
- ~~**Хранилище архива закрытых задач: append-only log vs Postgres**~~ — `insight:insight-task-archive-storage` _(stale · 2026-06-28)_
- ~~**Chain-log golden oracle для operator smoke**~~ — `insight:insight-dynin-chain-log-golden-oracle` _(stale · 2026-06-25)_

## Provenance каналов

- ✅ `insight` — жив, элементов: 56
- ✅ `research` — жив, элементов: 2

> Стратегия описывает акцент (`highlight`), но не назначает исполнителей и не пишет DoD:
> `assign(task, persona)` — операция реестра, не стратегии (Q1).
