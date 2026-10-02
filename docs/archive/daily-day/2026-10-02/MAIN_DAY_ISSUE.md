<!--
  archive-role: archive-snapshot
  archive-day: 2026-10-02
  archived-at: 2026-10-02T16:55:15.343Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-10-02T06:04:37.862Z (yarn main-day-issue@cc58d6f6) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"0eb88efaeda016876b628e72086e547c33ca8cb3","digest":"ec492c4e1ad7fe7ddf009656ea9126d9ed0d5d170d07f788ad5040bdc028b51d","versionAt":"2026-10-02T08:59:59+03:00"},"DAILY_STANDUP":{"version":"cc58d6f60369516d89d8ed5a7302373394c2e664","digest":"4556153d1a5d2d31fc0cb10b9ce82fc6a05966fb5bb8faae97953f2ff3ce59e1","versionAt":"2026-10-02T09:02:52+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-02

<!-- Сгенерировано: 2026-10-02 (yarn main-day-issue) -->
<!-- Магистраль: evening-reads-done-work · источник: owner-choice@chat/magistral-02-10 · author=human -->

## Метаданные

| Поле | Значение |
|---|---|
| `primaryFocusId` | `evening-reads-done-work` |
| `primaryTitle` | Вечер и ревью читают сделанное: CLOSURE спринтов и влитые PR не превращаются в несделанное |
| `githubIssue` | — |
| `size` | L |
| `promptPath` | — (фокус вне реестра задач; магистраль ручной чеканки владельца) |
| `сгенерировано` | 2026-10-02 |

---

## Магистраль

**`evening-reads-done-work`** — прямое волеизъявление владельца от 02.10 (ручная чеканка вне снимка топ-3, author=human, origin=`owner-choice@chat/magistral-02-10`).

Три вечера подряд (29.09, 30.09, 01.10) вечернее ревью объявляло сделанное несделанным: 01.10 влитые PR #2543 и #2544 не были прочитаны вечерним генератором, и он записал «магистраль не продвинута, #2503 шестой день». PR #2547 получил два BLOCK на опровергнутых посылках («r2 открыт» при закрытии в стволе, «красный тест кабинета» без свидетельства). Корень — генераторы вечернего ревью и MAIN_DAY_ISSUE не читают CLOSURE-файлы завершённых спринтов и не разворачивают oversized-диффы перед формулировкой посылок.

Задача сегодня: зафиксировать диагноз, назвать конкретные места в скриптах и документах, где посылки берутся без чтения CLOSURE/влитых PR, и либо починить механику (если S/M), либо сформировать карточку реестра с точным DoD (если L). Вторым шагом — закрыть четыре P1-хвоста вечернего ревью (ritual r2, protocol опыта, cabinet-тест, PR #2529), чтобы сегодняшний вечер не воспроизвёл ту же ошибку.

**Критерий успеха к вечеру:** вечернее ревью 02.10 НЕ выдаёт BLOCK на посылках, опровергнутых влитыми PR; `ritual-day-2026-10-02` закрыт без `runPhase: open`; все четыре P1 из code-review либо закрыты, либо имеют именованный корень и карточку задачи.

---

## Подкрепление

- **Закрыть `ritual-day-2026-10-01-r2`** (первый коммит дня): `yarn turbo run typecheck test lint --filter=@membrana/tooling`; записать закрывающую строку в `2026-10-01.jsonl`; без этого вечернее ревью снова объявит день незавершённым — прямой воспроизвод бага, который составляет суть магистрали.
- **Закрыть `#2503`** (`PERSONAS → scripts/lib/personas.mjs`, Ozhegov, XS): шестой день простоя; роутинг скелета Ангелины опирается на этот файл, и именно его отсутствие давало ложный сигнал «магистраль не продвинута» в трёх вечерних ревью — закрытие убирает один из источников ложных BLOCK-посылок.

---

## Перспективные

- После диагноза `evening-reads-done-work` — сформировать карточку реестра с точным DoD: «генератор вечернего ревью читает CLOSURE спринтов дня и git-log oversized-PR перед формулировкой посылок» — это сделает починку атомарной и верифицируемой.
- Прохождение гейта `secret-parser-built` (резак + датированный проход с манифестом ротации) снимает амнистию на правку архива и открывает нормальную работу с историей сессий — следующий претендент на магистраль после закрытия P1-долга.
- Ревью PR #2529 (`fuseDetectorConfidences`, 7627 строк, Vesnin, T2) разморозит benchmark-путь в `@membrana/core` — сигнал для планирования следующего детекционного спринта.

---

## Экспериментальные

- **Проба A:** `grep -r "runPhase" docs/archive/daily-day/ | tail -20` — узнаем, сколько раз за последние две недели r2-прогон оставался `open` к вечеру; если паттерн системный — диагноз подтверждён цифрой, не ощущением.
- **Проба B:** `head -5 docs/DAILY_CODE_REVIEW.md` и `head -5 docs/archive/daily-day/2026-10-01*/MAIN_DAY_ISSUE.md` — проверить, несёт ли вчерашний MAIN_DAY_ISSUE ссылку на CLOSURE #2543/#2544; если нет — место инъекции найдено.
- **Проба C:** `ls docs/procedures/duty/2026-09-27.md` — проверить существование протокола опыта трёх дорог; если файла нет — P1 подтверждён немедленно, не требует разворачивания диффа.

---

## Санитарные

- **`ritual-day-2026-10-01-r2`** — `runPhase: open`, закрывающей записи нет; P1; закрыть первым коммитом (`yarn turbo run typecheck test lint --filter=@membrana/tooling`).
- **PR #2529** (`fuseDetectorConfidences`, 7627 строк) — пятый перенос T2-ревью; P1; `yarn code-review:pr 2529`; до завершения — никаких правок benchmark-пути в `@membrana/core`.
- **`@membrana/background-cabinet` красный тест** — корень не назван; P1; `yarn turbo run test --filter=@membrana/background-cabinet` до любого merge в пакет.
- **`docs/procedures/duty/2026-09-27.md`** — в диффе вчерашнего ревью не появился; P1; подтвердить коммитом с фактами по трём дорогам (если файла нет — создать до вечера).
- **`#2503` (`PERSONAS → scripts/lib/personas.mjs`)** — Ozhegov, XS, шестой день; P2; `yarn ask vesnin --no-context "тест"` после правки.
- **a11y пагинации (#2476)** — три чекбокса (`aria-current`, focus trap, Tab/Enter) не верифицированы вторую неделю; P2; Rodchenko.
- **Зубы адаптера (`buildBoardOverflowHoldView`)** — лежат в `OverflowWindowHost.test.tsx`; рекомендация Vesnin: вынести в отдельный файл до следующей правки зоны; P2.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|---|---|---|---|
| Магистраль — `evening-reads-done-work` (ручная чеканка владельца) | owner-choice | `docs/tasks/main-day-assertions.json` → `sources[0]`, author=human | 2026-10-02 |
| Гейт `morning-gates-state.json` несёт `magistral: "evening-reads-done-work"`, `day: "2026-10-02"`, `magistralAuthor: "human"` | owner-choice (гейт) | `docs/tasks/morning-gates-state.json` | 2026-10-02 |
| **Расхождение (У1):** assertions `sources[0]` и гейт совпадают по выбору (`evening-reads-done-work`) и по дате (2026-10-02) — расхождения нет, но `magistralManual.inSnapshot: false` фиксирует, что выбор сделан вне снимка топ-3 (`angelina-hostess-impl`/`assets-container`/`chart-list-plugin`); **магистраль взята с гейта, assertions не перечеканены** | оба источника владельческие, спор не нужен — они согласны | `morning-gates-state.json` + `main-day-assertions.json` | 2026-10-02 |
| Три вечера подряд вечернее ревью BLOCK на опровергнутых посылках (влитые PR не прочитаны) | сессия / code-review | `docs/DAILY_CODE_REVIEW.md` (2026-10-01) | 2026-10-01 |
| `ritual-day-2026-10-01-r2` в `runPhase: open` — закрывающей записи нет | код / JSONL | `docs/archive/daily-day/*/2026-10-01.jsonl` | 2026-10-01 |
| Стендап подтверждает магистраль `evening-reads-done-work` и называет те же P1-хвосты | план | `docs/DAILY_STANDUP.md` (2026-10-02) — **отражение тех же источников владельца** | 2026-10-02 |

> 1 независимый первоисточник (слово владельца, 02.10) + 1 независимый первоисточник (вчерашнее code-review, 01.10). Стендап — отражение первых двух, не третий голос.

---

## Посылки

| Посылка | Маркер | Вердикт |
|---|---|---|
| Генератор вечернего ревью не читает CLOSURE влитых PR при формулировке посылок | `file:scripts/_daily-code-review.mjs` — отсутствие вызова чтения CLOSURE-файлов спринтов | `unknown` — требует probe; диагноз назван владельцем, механика требует верификации |
| `ritual-day-2026-10-01-r2` висит `runPhase: open` | `file:docs/archive/daily-day/*/2026-10-01.jsonl` — закрывающей строки нет | `holds` (подтверждено code-review 01.10) |
| `docs/procedures/duty/2026-09-27.md` отсутствует или не закоммичен с фактами | `file:docs/procedures/duty/2026-09-27.md` | `unknown` — `ls` первым действием |
| `@membrana/background-cabinet` красный тест, корень не назван | `symbol:` — нет; диагностика: `yarn turbo run test --filter=@membrana/background-cabinet` | `holds` (подтверждено code-review 01.10) |

---

## Сегодня делаем

1. `ls docs/procedures/duty/2026-09-27.md` — подтвердить существование; если нет — создать и закоммитить с фактами по трём дорогам (P1).
2. `yarn turbo run typecheck test lint --filter=@membrana/tooling` — закрыть `ritual-day-2026-10-01-r2`, записать закрывающую строку в `2026-10-01.jsonl`.
3. `yarn turbo run test --filter=@membrana/background-cabinet` — диагностировать красный тест, назвать корень (файл + строка), открыть карточку задачи или закрыть тест.
4. Закрыть `#2503` (`PERSONAS → scripts/lib/personas.mjs`, Ozhegov, XS): правка + коммит + проверка `yarn ask vesnin --no-context "тест"`.
5. Диагностика `evening-reads-done-work`: прочитать `scripts/_daily-code-review.mjs` и `scripts/_main-day-issue.mjs`, найти точки, где посылки берутся без чтения CLOSURE/влитых PR; зафиксировать находку в `docs/discussions/evening-reads-done-work-diagnosis.md`.
6. По итогам диагностики: если правка S/M — внести и закоммитить; если L — оформить карточку реестра с точным DoD и маркером проверки.
7. `yarn code-review:pr 2529` — начать T2-ревью PR #2529 (Vesnin); если не завершить за день — зафиксировать частичный прогресс и корень блокера.

---

## Definition of Done (фокус)

- [ ] `docs/procedures/duty/2026-09-27.md` существует и содержит факты по трём дорогам (коммит с датой).
- [ ] `ritual-day-2026-10-01-r2` имеет закрывающую запись в `2026-10-01.jsonl` (`runPhase` не `open`).
- [ ] `@membrana/background-cabinet` тест: корень назван (файл + строка) и зафиксирован в задаче реестра или закрыт.
- [ ] `#2503` закрыт: `PERSONAS` живёт в `scripts/lib/personas.mjs`, `yarn ask vesnin --no-context "тест"` отвечает без ошибки роутинга.
- [ ] `docs/discussions/evening-reads-done-work-diagnosis.md` содержит точки инъекции ложных посылок с маркерами (`file:` или `symbol:`).
- [ ] Вечернее ревью 02.10 не выдаёт BLOCK на посылках, опровергнутых влитыми PR дня.
- [ ] PR #2529: либо `yarn code-review:pr 2529` завершён и результат зафиксирован, либо частичный прогресс + именованный блокер в `docs/discussions/`.

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** (L, контракт `docs/procedures/angelina-hostess-contract.md`) — план дня назначил её магистралью, но владелец 02.10 явно перевыбрал `evening-reads-done-work`; L-задача требует чистого стола, стол сейчас занят P1-долгом.
- **`assets-container`** и **`chart-list-plugin`** (оба L) — не привязаны к сегодняшнему гейту и не входят в owner-выбор; откладываются до следующего owner-choice после закрытия P1.
- **Повторный DSP-бенчмарк (harmonic/cepstral/flux на free-v1)** — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); без нового датасета или fusion-гипотезы информации не даёт.
- **Правки в `@membrana/core` (benchmark-путь)** — заморожены до завершения `yarn code-review:pr 2529`.
- **Гейт `secret-parser-built`** (резак + манифест ротации) — следующий претендент, не сегодня: сначала закрыть P1-хвосты.

---

## Вторично (если останется время)

- a11y пагинации (#2476): Rodchenko верифицирует три чекбокса (`aria-current`, focus trap, Tab/Enter) и закрывает issue.
- Вынести зубы адаптера (`buildBoardOverflowHoldView`) из `OverflowWindowHost.test.tsx` в отдельный тест-файл (рекомендация Vesnin из вчерашнего ревью).

---

## Зависимости и риски

- **Блокер 1:** `ritual-day-2026-10-01-r2` не закрыт → вечернее ревью снова объявит день незавершённым; закрыть первым коммитом.
- **Блокер 2:** `yarn code-review:pr 2529` не выполнено → benchmark-путь в `@membrana/core` заморожен; любые коммиты в эту зону создают необнаруживаемую регрессию.
- **Риск 1:** диагностика `evening-reads-done-work` может вскрыть L-правку (перепись логики чтения CLOSURE в нескольких скриптах) — тогда сегодня только карточка задачи, не правка; вечер это выдержит, если r2 и P1-хвосты закрыты.
- **Риск 2:** `docs/procedures/duty/2026-09-27.md` отсутствует → опыт трёх дорог не задокументирован → fusion-задача не имеет фактической основы; проверить первым `ls`-действием.

---

## Ссылки

- [DAILY_STANDUP.md](../docs/DAILY_STANDUP.md) — стендап 2026-10-02
- [DAILY_CODE_REVIEW.md](../docs/DAILY_CODE_REVIEW.md) — вчерашнее ревью (P1-хвосты)
- [morning-gates-state.json](../docs/tasks/morning-gates-state.json) — гейт магистрали
- [main-day-assertions.json](../docs/tasks/main-day-assertions.json) — sources[0] владельца
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](../docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — потолок эшелона 0 (не трогать)