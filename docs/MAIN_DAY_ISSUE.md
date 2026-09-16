<!-- Сгенерировано: 2026-09-16T09:52:11.777Z (yarn main-day-issue@c6b2ab0c) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"c6b2ab0c0e48133160b1b0a1f7651992a7d68c1f","digest":"fbf446a93686482bfadc90cfc23596c88414cc6cbfe6120548e1df593047bc52"},"DAILY_STANDUP":{"version":"38bea41f69dad5502bf356b783ece57428f9b1c8","digest":"bcaed3bb841962953679762f8971883a7a5f3fc9c726b89a5d33191363e435c5"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: tariff-matrix-2333, tariff-matrix-2331, cabinet-deploy-smoke-tooth-2288, cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-16

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `worktree-sanitation` |
| `primaryTitle` | Санитарный разбор рабочих деревьев и веток репозитория |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-09-16 |

---

## Магистраль

**Worktree-sanitation** — санитарный разбор рабочих деревьев и локальных веток репозитория. Магистраль задана прямым словом владельца 16.09: «проведём пару санитарных дней, чтобы убрать лишний мусор, нерабочие деревья в репозитории, сделаем список задач более релевантным и позже вернёмся к магистрали»; «сделаем разбор деревьев центральной задачей дня»; подтверждение: «Разбор деревьев». Замер утра 16.09: рабочих деревьев 62, из них canon 5 (не трогать), sprint-open 16, unregistered 41 (нет карточки WORKTREE.md), locked 1 (Membrana-ritual-night — снимать вручную); локальных веток 286, к удалению 36 (PR MERGED). Норма сноса: только `yarn repo:clean --execute --worktrees`, по одному, пост-чек живых деревьев после каждого; raw `git worktree remove` запрещён (прецедент 06.08 — 2152 файла сквозь junction).

**Критерий успеха к вечеру:** число unregistered деревьев снижено до нуля или каждое явно задокументировано (WORKTREE.md создан), 36 merged-веток удалены, результат зафиксирован коммитом итогового `repo:clean --dry-run` с нулём анонимных деревьев.

---

## Подкрепление

- **Реестр задач — разметка релевантности.** Параллельно с разбором деревьев пройтись по карточкам реестра, привязанным к удалённым или мертвым деревьям: выставить статус `archived` / обновить `worktree` поле, чтобы реестр перестал ссылаться на несуществующие пути. Без этого следующий `yarn repo:clean --dry-run` продолжит показывать расхождения.
- **Аудит PR-очереди (6 старых PR).** Сверить PR `#1939`, `#1831`, `#1846`, `#1876`, `#1728`, `#1793` по `membrana-pr-audit`: для каждого — либо worktree жив и PR активен, либо ветка merged и подлежит удалению сегодняшним прогоном. Статус неизвестен ни стендапу, ни реестру — это прямой санитарный долг дня, сопряжённый с разбором веток.

---

## Перспективные

- **Возврат к продуктовой магистрали** (tariff-canon-transitions-2329 или следующий кандидат снимка) — открывается послезавтра, как только два санитарных дня закрыты и реестр актуален; владелец явно назвал санитарию временным контуром с возвратом.
- **Разбор locked-дерева `Membrana-ritual-night`** — снять вручную отдельным шагом после подтверждения, что ночной ритуал не запущен; освободит зависший слот и устранит ложный `locked`-статус в будущих прогонах `repo:clean`.
- **Канон WORKTREE.md для sprint-open деревьев** — 16 sprint-open деревьев присутствуют, но без единого шаблона карточки; шаблон снизит unregistered до нуля в следующем замере без ручного аудита.

---

## Экспериментальные

- **Автоматический предикат свежести деревьев** — добавить в `scripts/lib/` лёгкий предикат, считающий дату последнего коммита в каждом worktree; деревья без коммитов старше N дней помечать `stale` в dry-run отчёте. Узнаем: есть ли sprint-open деревья, де-факто брошенные без мержа.
- **Сверка `union` на `docs/network/history.jsonl`** — конфликт зафиксирован 24.08, issue #2096 не закрыт; запустить `union` в dry-run и посмотреть, воспроизводится ли конфликт на текущем стволе (36d44dda). Узнаем: блокирует ли это вечернюю архивацию или уже самоустранилось.
- **`docker system df` на media-VPS** — без `builder prune`, только замер; сравнить с 76 % из хендофа. Узнаем: класс мусора совпадает с офисным профилем (там уборка дала ×2,7 диска) или требует отдельной стратегии чистки.

---

## Санитарные

- Удалить 36 merged-веток через `yarn repo:clean --execute --worktrees` (по одной, пост-чек после каждой).
- Перевыпустить токен бота `@MembranaWatchdog_bot` — дважды попадал в переписку (#2148); пока токен засвечен, кристалл `credential-rotation-biweekly` нарушен.
- Проверить `/health/deep` на проде кабинета после деплоя: `genus: busy` в простое должен уйти (#2117, кусок D).
- Сверить PR старше недели по `membrana-pr-audit`: `#1939`, `#1831`, `#1846`, `#1876`, `#1728`, `#1793` — статус неизвестен.
- Проверить `union` на `docs/network/history.jsonl` — конфликт был 24.08, #2096 ещё не закрыт.
- Убедиться, что `night-triage-secret-scan.mjs` вызывает `scripts/lib/secret-redact.mjs` (резак существует с 26.07, PR #1252); гейт `secret-parser-built` по критерию амнистии остаётся на hold до слова владельца, но детектор без вызова резака нарушает `session-backup-requires-secret-redaction`.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|--------------|--------------|---------|
| Владелец назвал worktree-sanitation магистралью явным словом («сделаем разбор деревьев центральной задачей дня», подтверждение «Разбор деревьев») | `docs/tasks/main-day-assertions.json` → `sources[0].claim` | Реплика владельца в чате, `owner-choice@chat/magistral-16-09` | 2026-09-16 |
| Замер утра 16.09: 41 unregistered worktree, 36 merged-веток к удалению | `docs/tasks/main-day-assertions.json` → `sources[0].claim` (снимок `repo:clean --dry-run` описан там же) | `yarn repo:clean --dry-run` на стволе 36d44dda | 2026-09-16 |
| Стендап подтверждает фокус дня и перечисляет те же цифры | `docs/DAILY_STANDUP.md` | `docs/tasks/main-day-assertions.json` sources[0] (1 источник, 1 отражение в стендапе) | 2026-09-16 |
| DAY_PLAN перечисляет три кандидата магистрали без owner-choice и явно оставляет выбор владельцу | `docs/DAY_PLAN.md` | Генератор `#592`, план от 2026-09-16 | 2026-09-16 |
| **Магистраль взята с `sources[0]` в `main-day-assertions.json`; `morning-gates-state.json` в доступных входах отсутствует — расхождение по норме У1 (31.07) не применяется; `sources[0]` является единственным и достаточным владельческим источником** | `docs/tasks/main-day-assertions.json` | owner-choice@chat/magistral-16-09 | 2026-09-16 |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| В репозитории присутствуют unregistered worktree (нет WORKTREE.md) | `file:.git/worktrees` + dry-run `yarn repo:clean` возвращает unregistered > 0 | holds (замер утра: 41 unregistered) |
| Локальные ветки с merged PR не удалены (36 штук) | `yarn repo:clean --dry-run` → список к удалению > 0 | holds |
| `scripts/lib/secret-redact.mjs` существует (резак написан 26.07, PR #1252) | `file:scripts/lib/secret-redact.mjs` | holds (файл существует — посылка «резака нет» была бы нарушена; это НАХОДКА вещдока `//retired-redact-wrong-address-03-08`) |

---

## Сегодня делаем

1. Запустить `yarn repo:clean --dry-run` и зафиксировать точные цифры: canon / sprint-open / unregistered / locked — снимок в `docs/archive/daily-day/worktree-audit-2026-09-16.md`.
2. Для каждого из 41 unregistered деревьев: создать минимальный WORKTREE.md (имя, цель, статус) **или** удалить через `yarn repo:clean --execute --worktrees` (по одному, пост-чек после каждого).
3. Удалить 36 merged-веток: `yarn repo:clean --execute` (только merged, без force); после каждого удаления убедиться, что живые деревья не пострадали.
4. Сверить 6 старых PR (`#1939`, `#1831`, `#1846`, `#1876`, `#1728`, `#1793`) — вынести статус: `active` / `ready-to-merge` / `stale-to-close`; результат добавить в снимок п. 1.
5. Обновить карточки реестра (`registry.json`), чьё поле `worktree` указывает на удалённые пути — выставить `archived` или скорректировать путь.
6. Перевыпустить токен `@MembranaWatchdog_bot`, прогнать тестовый алерт, убедиться, что новый токен доходит в личный чат владельца.
7. Закрыть день итоговым `yarn repo:clean --dry-run`: unregistered = 0 или каждое задокументировано; зафиксировать коммитом снимка.

---

## Definition of Done (фокус)

- [ ] `yarn repo:clean --dry-run` возвращает `unregistered: 0` (или каждое unregistered дерево имеет WORKTREE.md).
- [ ] 36 merged-веток удалены; `yarn repo:clean --dry-run` не выдаёт их в списке к удалению.
- [ ] Снимок аудита `docs/archive/daily-day/worktree-audit-2026-09-16.md` создан и закоммичен.
- [ ] Карточки реестра с несуществующими `worktree`-путями обновлены (status `archived` или корректный путь).
- [ ] Токен `@MembranaWatchdog_bot` перевыпущен; тестовый алерт доставлен владельцу.
- [ ] Статус 6 старых PR зафиксирован в снимке аудита.
- [ ] Locked-дерево `Membrana-ritual-night` задокументировано (причина lock, план снятия) или снято вручную.

---

## Сознательно не делаем сегодня

- **Не трогаем `tariff-canon-transitions-2329`** — продуктовая магистраль 08.09, без подтверждённого переноса на 16.09; остаётся в снимке топ-3, но не в мандате дня.
- **Не открываем детекционный контур** (DSP benchmark / harmonic+cepstral+flux / повтор free-v1) — потолок эшелона 0 зафиксирован, следующий шаг только при смене датасета или fusion с yamnet.
- **Не поднимаем `angelina-hostess-impl`, `assets-container`, `batch-collection-run-contour`** в магистраль — owner-choice явно указал worktree-sanitation.
- **Не коммитим незакоммиченные артефакты** (`DAY_PLAN.md`, `STRATEGY_DAY.md`, `deps-watch-snapshot.json`) без предварительной проверки на secrets через `night-triage-secret-scan.mjs`.
- **Не снимаем амнистию на архив** (гейт `secret-parser-built`, критерий амнистии) — отложен словом владельца, резак существует, но предикат `amnestyLifted` не закрыт.
- **Не разворачиваем недельную стратегию** — заморожена кристаллом `weekly-strategy-frozen` до разбора дневной рутины.

---

## Вторично (если останется время)

- Проверить `/health/deep` на проде кабинета: `genus: busy` в простое (#2117, кусок D) — быстрый HTTP-запрос, не требует кода.
- Запустить `docker system df` на media-VPS (только замер, без `builder prune`) и сравнить с 76 % из хендофа.

---

## Зависимости и риски

- **Блокер: raw `git worktree remove` запрещён** — прецедент 06.08 (2152 файла сквозь junction); все удаления только через `yarn repo:clean --execute --worktrees`, по одному с пост-чеком. Нарушение нормы блокирует приёмку дня.
- **Риск: locked-дерево `Membrana-ritual-night`** — снимать только вручную, убедившись, что ночной ритуал не запущен в момент удаления; иначе lock не снимается корректно.
- **Риск: реестр протух** — карточки с несуществующими worktree-путями дадут ложные dry-run результаты назавтра; без обновления реестра (п. 5 «Сегодня делаем») цикл повторится.
- **Риск мета-drift** — 11.09, 12.09 инфраструктурные, 16.09 санитарный: третий подряд день без продукта; владелец назвал санитарию осознанной на два дня с возвратом к магистрали — фиксируем явно, чтобы не сдвинуть на третий.

---

## Ссылки

- [`docs/DAILY_STANDUP.md`](../DAILY_STANDUP.md) — стендап 2026-09-16, фокус и роутинг персон
- [`docs/STRATEGY_DAY.md`](../STRATEGY_DAY.md) — горизонт дня, веха `secret-parser-built` (approaching)
- [`docs/DAY_PLAN.md`](../DAY_PLAN.md) — план дня, снимок топ-3 кандидатов магистрали
- [`docs/tasks/main-day-assertions.json`](../tasks/main-day-assertions.json) — sources[0]: owner-choice worktree-sanitation 16.09