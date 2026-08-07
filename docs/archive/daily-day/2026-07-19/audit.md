# Что происходило — 2026-07-19

> Механическая выжимка из трёх источников. Никаких оценок: только движение.
> База `e9e3a5cc` → `47a41086`.

**Коротко:** 57 коммитов, 38 PR влито · реестр 771 → 785 (0 карточек в архив) · граф правды 81 → 87 (+6 токенов)

## 1. Репозиторий

Коммитов: **57** · файлов: **368** · строк: **+30839 / −606**.

### Куда ушли строки

| Область | Строк (+/−) | Доля | Файлов | Что это |
|---|---:|---:|---:|---|
| **Бизнес-процессы** | +14959 / −161 | 48% ██████████ | 189 | регламенты, заседания, реестр, граф правды |
| **Тулинг** | +11787 / −286 | 38% ████████ | 127 | скрипты, хуки, скиллы, CI, шлюз интеграций |
| **Прочее** | +3880 / −123 | 13% ███ | 40 | вне классификации |
| **Основной продукт** | +143 / −14 | 0%  | 6 | ядро, детекторы, клиент, устройство, облик |
| **Витрина для менеджмента** | +70 / −22 | 0%  | 6 | панель, доки, демо, коммуникации |

_Добавленное и удалённое врозь: переписывание — не «ничего не делали»._

### О чём коммиты

**`docs` — 14 коммитов**

- add agent guide for insight D/L/O/V lifecycle (#681)
- add agent guide for insight D/L/O/V lifecycle (#680)
- code-review:pr skill syntax without -- (#587) (#671)
- день 19.07 — три шторма, два заседания, два эпика, хендофф на коворкинг (#662)
- кристаллизация 19.07 — 3+3 (mint), канон S-строки, свежесть предикатов, ретро-карточка спринта 5 (#659)
- третий шторм дня — бриф передачи между сессиями и кеш current_task
- второе заседание закрыто эпиком + хендофф на коворкинг
- insight-tooling-kits: research (Perplexity) + review 6.4/10 + adopted (#658)
- _…и ещё 6_

**`feat` — 14 коммитов**

- legitimize Replit demo git bridge (task/pull + tests) (#679)
- lifecycle canon C1–C7 → I1–I3 (follow-up #609/#612) (#677)
- security-posture: заседание M0–M3, дозор deps:watch, gitleaks-гейт, гигиена-патчей (96→84), регламенты (#676)
- sent-log.jsonl for swallow/digest (#585) (#674)
- карта кодов возврата + гард (#622) (#673)
- манифест вечера S+F — семантика отказа + гейт свежести (#613) (#672)
- Intern T3 research digest (#197) (#668)
- Intern T2 GET /ready (#196) (#667)
- _…и ещё 6_

**`fix` — 13 коммитов**

- GET /ready error-path try/catch (#669) (#670)
- RT-9 code-review freshness guard (#665)
- swallow delivery idempotency (timeout ≠ undelivered) (#664)
- OpenAI embeddings via HTTPS_PROXY (geo-403) (#663)
- режим заседания получил голос на входе, а не только зубы на выходе (#661)
- pr:ship — ci-wait перед merge, без --delete-branch, branch-cleanup отдельно (#654)
- .env из sibling-worktree — слоёная загрузка через git-common-dir, честный 401, грабли (#649)
- режим заседания получил голос на входе, а не только зубы на выходе
- _…и ещё 5_

**`chore` — 8 коммитов**

- archive insight-archive-lifecycle after PR #677 (#678)
- архив net-http-probe (спринт 6) (#656)
- архив truth-mint (спринт 4) (#652)
- архив env-sibling-worktree (спринт 3) (#650)
- архив truth-transcript-tooling (спринт 2) (#648)
- архив pr-wait-ci-gate (PR #645, спринт 1 по #643) (#646)
- тулинг-ретро 18.07 заведён двумя карточками (#642, #643)
- журналы персон пересобраны после слияния с main

**`cowork` — 7 коммитов**

- контур исполнения + фундамент переезда реестра — 3 блока + 6 адаптеров (#660) (#675)
- phase4 закрыта, phase5 — PR #675 открыт
- leadPersona пятёрке карточек — гейт отказа-I чист
- phase3 — Interface Consilium + контракт
- phase1 закрыта всеми блоками, phase2 открыта
- LGTM владельца на резку, Phase 1 открыта
- phase0 open — brief, ACTIVE, карточка #660

**`прочее` — 1 коммит**

- [codex] archive completed insights by evidence (#612)

**Влито PR: 38**

- #675 — cowork(cowork-execution-registry): контур исполнения + фундамент переезда реестра — 3 блока + 6 адаптеров (#660)
- #681 — docs(insights): add agent guide for insight D/L/O/V lifecycle
- #680 — docs(insights): add agent guide for insight D/L/O/V lifecycle
- #679 — feat(tooling): legitimize Replit demo git bridge (task/pull + tests)
- #678 — chore(tasks): archive insight-archive-lifecycle after PR #677
- #677 — feat(insights): lifecycle canon C1–C7 → I1–I3 (follow-up #609/#612)
- #676 — feat(security): security-posture: заседание M0–M3, дозор deps:watch, gitleaks-гейт, гигиена-патчей (96→84), регламенты
- #612 — [codex] archive completed insights by evidence
- #674 — feat(comms): sent-log.jsonl for swallow/digest (#585)
- #673 — feat(ritual): карта кодов возврата + гард (#622)
- #672 — feat(ritual): манифест вечера S+F — семантика отказа + гейт свежести (#613)
- #671 — docs: code-review:pr skill syntax without -- (#587)
- #670 — fix(office): GET /ready error-path try/catch (#669)
- #668 — feat(office): Intern T3 research digest (#197)
- #667 — feat(office): Intern T2 GET /ready (#196)
- #666 — feat(office): Intern T1 outbound self-check (#195)
- #665 — fix(ritual): RT-9 code-review freshness guard
- #664 — fix(scripts): swallow delivery idempotency (timeout ≠ undelivered)
- #663 — fix(rag): OpenAI embeddings via HTTPS_PROXY (geo-403)
- #662 — docs: день 19.07 — три шторма, два заседания, два эпика, хендофф на коворкинг
- #661 — fix(consilium): режим заседания получил голос на входе, а не только зубы на выходе
- #659 — docs(truth): кристаллизация 19.07 — 3+3 (mint), канон S-строки, свежесть предикатов, ретро-карточка спринта 5
- #658 — docs(insights): insight-tooling-kits: research (Perplexity) + review 6.4/10 + adopted
- #657 — docs(insights): insight-tooling-kits — версионируемые тулинг-киты: наборы умений агента под задачу
- #656 — chore(tasks): архив net-http-probe (спринт 6)
- #655 — feat(tooling): net:http — HTTP-проба произвольного URL через прокси с классификацией ответа
- #654 — fix(tooling): pr:ship — ci-wait перед merge, без --delete-branch, branch-cleanup отдельно
- #652 — chore(tasks): архив truth-mint (спринт 4)
- #651 — feat(tooling): truth mint — писатель токенов: валидация ядром, отказ на дубль, dry-run по умолчанию
- #650 — chore(tasks): архив env-sibling-worktree (спринт 3)
- #649 — fix(tooling): .env из sibling-worktree — слоёная загрузка через git-common-dir, честный 401, грабли
- #648 — chore(tasks): архив truth-transcript-tooling (спринт 2)
- #647 — feat(tooling): truth utterance/ask-check + lib/transcript — поиск указателей правды по всем трём местам
- #646 — chore(tasks): архив pr-wait-ci-gate (PR #645, спринт 1 по #643)
- #645 — feat(tooling): pr:wait — честное ожидание проверок PR (4 состояния) + грабли AGENTS.md
- #644 — fix(tooling): фазовые метки не ID вопроса (#639) + гвард свежести ветки от базы (#640)
- #637 — fix(ritual): вечерний аудит в цепочке, ласточка руками, кристаллизация 18.07
- #632 — docs(adr): ADR-0013 ACCEPTED — LGTM владельца с двумя правками Р4 (#627)

## 2. Реестр задач

Всего карточек: **785** (было 771), из них active: **226**.

**Заведено: 14**

- `cowork-execution-registry` (#660) — Cowork Sprint: контур исполнения команды + переезд реестра
- `agent-ci-gate-tooling` (#643) — Агентский тулинг: pr:wait + грабли (конфликт блокирует CI, tail в фоне, short-path)
- `truth-minting-tooling` (#642) — Тулинг графа правды: ask-check, mint, utterance
- `meeting-security-posture` — Заседание security-posture: аудит зависимостей + инцидент patchhog — DAG security-контура
- `sec-upgrade-backend-runtime` — Апгрейд №1 backend-runtime-major: Nest 11 + fastify 5 + @fastify/middie 9 + fast-uri 3 (атом, оба сервера синхронно)
- `sec-upgrade-dev-tooling` — Апгрейд №2 dev-tooling-major: vite 7 + vitest 3 (фазы: foundation → детекторы → client)
- `sec-upgrade-tar` — Апгрейд №3 tar 6→7: локальный форс + канареечная полная сборка desktop (без слепых resolutions)
- `sec-upgrade-electron` — Апгрейд №4 electron-major (рискованный, последним): UAF ×3 + cmdline injection
- `linear-agent-identity-facts` — Ресёрч: Linear — личность агента, состояние подзадач, блокирующие связи
- `meeting-registry-relocation` — Заседание: переезд реестра задач на внешний стек (Linear)
- `meeting-team-execution-contour` — Заседание: контур исполнения виртуальной команды (контур 2)
- `team-accountability-metrics` — Ресёрч: математическая оценка ответственности команды
- `generated-docs-quality-criteria` — Ресёрч: критерии качества генерируемых документов
- `angelina-orchestrator-prompt` — Ресёрч: промпт агента-оркестратора (процедура оркестрации)

## 3. Граф правды

Токенов: **87** (было 81) · active 82 · владельческих 52 · выведенных 35.

**Закристаллизовано: 6**

- `s-tooling-sprint-card-required-prompt-optional` (owner) — Для тулинг-спринта размера S карточка реестра обязательна (трекинг), полный task-промпт не нужен — issue с эпизодами дос…
- `kit-account-manager-deterministic-first` (owner) — Аккаунт-менеджер тулинг-китов в первой итерации — детерминированный маппинг (kind + ключевые слова → кит) в task:registe…
- `kit-sprint-next-slot-token-beats-review` (owner) — M-спринт первой итерации тулинг-китов берётся ближайшим рабочим слотом, впереди продуктовой магистрали: владельческий то…
- `kit-mapping-covers-all-tooling-sprints` (derived) — Точка рекомендации кита покрывает 100% тулинг-спринтов: карточка реестра обязательна у каждого тулинг-спринта, а маппинг…
- `next-kit-sprint-has-no-llm-recommender` (derived) — Ближайший kit-спринт не содержит LLM-рекомендателя: спринт ближайшего слота — это первая итерация, а первая итерация — д…
- `canon-s-row-updated-19-07` (derived) — Строка канона TASK_PROMPT_WORKFLOW о размере S противоречила слову владельца 19.07 («допускается только Issue» против «к…

