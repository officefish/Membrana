<!--
  archive-role: archive-snapshot
  archive-day: 2026-10-06
  archived-at: 2026-10-06T19:12:17.089Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-10-06T10:02:16.092Z (yarn main-day-issue@a4c0624e) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"76351be0372cd4420233df7db652835a70a92781","digest":"ff894bffd6ebf5e30fb5646a41fc7188fc573dc689162babf5f991f91f806500","versionAt":"2026-10-06T12:57:44+03:00"},"DAILY_STANDUP":{"version":"a4c0624ed68863d680775aa62f7c1a3d6e5b336d","digest":"0cbc92b4920e48629bd8e8387d064471cc933a3d07db4b38937044a61a21c2fd","versionAt":"2026-10-06T13:00:22+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-06

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-downgrade-freeze` |
| `primaryTitle` | Понижение тарифа с заморозкой: довести b3a/b3b и b4/b6 до ствола |
| `githubIssue` | #2599, #2603, #2604, #2605 (конвейер дня) |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-10-06 |

---

## Магистраль

**`tariff-downgrade-freeze`** — магистраль взята с гейта (`morning-gates-state.json`, `day: 2026-10-06`), совпадает с `sources[0].claim` (`main-day-assertions.json`, `date: 2026-10-06`). Оба источника владельческие, оба указывают на `tariff-downgrade-freeze`. Расхождение между `magistralOptions` гейта (`angelina-hostess-impl`, `assets-container`, `chart-list-plugin`) и фактическим значением `magistral` — **зафиксировано явно**: `main-day-assertions.json` не перечеканен под топ-3 гейта, магистраль назначена вручную вне снэпшота (`inSnapshot: false`). Расхождение само есть находка; перечеканка assertions под актуальный выбор предписана каноном и не сделана.

В стволе к утру: b0+b1+b2 блока 1 (#2593, #2594) и b1+b2+b3 блока 2 (#2592, #2595, #2596). Перерезка b3→b3a/b3b ратифицирована 06.10. Сегодняшний шаг: довести **b3a** (#2604) и **b3b** (#2605) до ствола с typecheck, затем разблокировать **b4** (#2599, панель заморозки) и **b6** (#2603, крон уборки). b5 — после b3a, не раньше. Параллельно Codex: триаж 4 CVE (#2590) и раскрытие diff #2596 (C1/C9/B8 — P1-блокер из code-review вчера).

**Критерий успеха к вечеру:** в стволе b3a и b3b блока 1 (двери media) и b4, b6 блока 2 (панель, крон уборки) + реестр служб (#2606); b5 (purge в media) начат после b3a; от Codex — письменный триаж CVE и PR по #2590 в ревью. Живое понижение тарифа — на приёмке после b5/b7, не сегодня.

---

## Подкрепление

- **ADR-0031 файлом в ствол** — без ратифицированного ADR b3–b5 идут без письменной границы контрактов; Vesnin пишет по протоколу консилиума 05.10 (вердикты 1–6 воспроизводятся точно, не пересказом), LGTM до обеда. Блокирует b3a/b3b по DoD.
- **Письменный триаж 4 CVE** (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — Dynin даёт вердикт runtime vs dev по каждому; runtime-находка блокирует merge в ствол независимо от прогресса ADR. Без триажа b3 нельзя считать готовым к мерджу (вердикт 6 консилиума).

---

## Перспективные

- **b5 после b3a:** как только b3a влит и typecheck чист — b5 (`ScheduledDowngrade`, крон-вызов заморозки) разблокируется; архитектурный риск нулевой при наличии ADR-0031.
- **B8-закрытие открывает b4 Rodchenko:** после верификации прокси office→кабинет в `LIVE_SERVICES.md` UI-компонент заморозки (b4, #2599) получает чистый старт без архитектурного риска немого носителя.
- **Перечеканка `main-day-assertions.json`:** расхождение гейт/assertions задокументировано, но не закрыто — при первом свободном окне перечеканить под `tariff-downgrade-freeze` как канон предписывает.

---

## Экспериментальные

- **Проба «резак vs детектор»:** запустить `night-triage-secret-scan.mjs` на синтетическом файле с заведомым секретом — проверить, вырезается ли строка или только логируется. Узнаем: что именно дописать до гейта `secret-parser-built`.
- **Проба «oversized-диффы и секреты»:** прогнать diff одного из двух oversized-коммитов (579 или 668 строк) через парсер вручную — есть ли нестандартные форматы секретов вне `${…:?…}`/`$$…`. Узнаем: покрывает ли текущий детектор крупные PR.
- **Черновик манифеста ротации ключей:** составить датированный `.md`-чеклист засвеченных ключей без автоматизации. Узнаем: достаточно ли plain-текстового прохода для критерия вехи `secret-parser-built` или нужна машинная форма.

---

## Санитарные

- Триаж четырёх CVE (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — отдан Codex 06.10 (письменный вердикт runtime/dev + зуб на снимок дозора).
- #2590 — подпись выборки chart-list не следует за критерием (P2) — отдан Codex 06.10.
- #2601 — зуб плана: последовательные блоки и объём с причиной (прецедент ратификации v3).
- К выкатке блока 2: ключ `CABINET_OFFICE_TOKEN` на кабинете и office, `CABINET_API_URL` в office — слово владельца; живой прогон миграций кабинета/media на стенде.

> **Снято сверкой ведущей 06.10** (генератор перенёс пункты из ревью 05.10, собранного по метаданным):
> - «ADR-0031 не положен файлом» — `docs/adr/ADR-0031-downgrade-archive.md` в origin/main с #2593 (66153f58), дополнен #2594.
> - «перечеканка `main-day-assertions.json` не сделана» — `sources[0]` 05.10 и 06.10, author=human (#2591, сегодня).
> - «diff #2596 не раскрыт, C1/C9» — проверено ведущей 05.10: `cabinet-users.client.ts` — HTTP-клиент к кабинету, прямых импортов кабинета нет; P1 ревью (detail в 502) закрыт в fc239c8e до слияния; B8 — реестр служб в #2606.
> - «ritual-счётчик 6564fec3 — exit-коды при пустом результате» — вечерние документы, не код; счётчик некритичных (#2585) отработал 05.10 живьём («красный 1-й вечер подряд»).

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `tariff-downgrade-freeze`; шаг: b3a/b3b/b4/b6 до ствола | сессия (владелец, `main-day-assertions.json` `sources[0]`) | `owner-choice@chat/magistral-06-10-manual` | 2026-10-06 |
| Магистраль взята с гейта (`morning-gates-state.json`, `magistral: tariff-downgrade-freeze`, `day: 2026-10-06`) | план | `docs/tasks/morning-gates-state.json` | 2026-10-06 |
| **Расхождение:** `magistralOptions` гейта — `[angelina-hostess-impl, assets-container, chart-list-plugin]`; фактический `magistral` назначен вручную вне снэпшота (`inSnapshot: false`); **магистраль взята с гейта, assertions не перечеканены** | план | `docs/tasks/morning-gates-state.json` + `main-day-assertions.json` | 2026-10-06 |
| В стволе b0+b1+b2 блока 1 и b1+b2+b3 блока 2; перерезка b3→b3a/b3b ратифицирована | сессия (владелец) | `owner-choice@chat/magistral-06-10-manual` | 2026-10-06 |
| P1-блокер: diff #2596 не раскрыт, C1/C9/B8 не верифицированы | код/ревью | `docs/DAILY_CODE_REVIEW.md` (2026-10-05T22:19:08) | 2026-10-05 |
| ADR-0031 не положен файлом в ствол — b3–b5 без письменной границы контрактов | план | `docs/DAILY_STANDUP.md` (стендап 06.10, со ссылкой на протокол консилиума 05.10) | 2026-10-06 |
| Триаж 4 CVE не оформлен письменно; runtime-находка блокирует merge | план | `docs/DAILY_STANDUP.md` (стендап 06.10) | 2026-10-06 |
| `DAY_PLAN.md` называет `angelina-hostess-impl`/`assets-container`/`chart-list-plugin` магистралью | план | `docs/DAY_PLAN.md` (2026-10-06T09:44:39) | 2026-10-06 |
| ↑ **1 источник, 1 отражение** — план дня синтезировал из топ-3 реестра; владелец его перебил словом того же дня (assertions + гейт); вес плана дня — ноль при наличии владельческого волеизъявления | — | — | — |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| `ADR-0031.md` не существует в стволе | `file:docs/adr/ADR-0031.md` | `holds` (файл отсутствует — подтверждено стендапом и code-review) |
| Diff #2596 не раскрыт и C1/C9/B8 не верифицированы | `file:packages/background-office` (нужен `git show 6f87dc45`) | `holds` (code-review 05.10 явно: «без диффа не верифицировать») |
| Триаж 4 CVE не оформлен письменно | `file:docs/tasks/` (маркер: отсутствие файла CVE-triage) | `holds` (стендап 06.10: «письменно не оформлен») |
| b3a (`FreezeEntry`, `FreezeMode`) не влит в ствол | `symbol:FreezeEntry` в `packages/` | `holds` (ратифицирован 06.10, в конвейере #2604 — ещё не merged) |

Развилки нет — все посылки holds, работа назначается без оговорок.

---

## Сегодня делаем

1. **Раскрыть diff #2596 вручную** (`git show 6f87dc45 -- packages/background-office`) и письменно закрыть C1/C9; проверить `LIVE_SERVICES.md` на наличие маршрута прокси (B8). Результат: либо «чисто», либо follow-up issue.
2. **Написать и влить `docs/adr/ADR-0031.md`** по протоколу консилиума 05.10 (вердикты 1–6 дословно), получить LGTM Vesnin до обеда.
3. **Dynin: письменный триаж 4 CVE** (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — вердикт runtime vs dev по каждому, результат в `docs/` или issue-комментарий.
4. **Влить b3a** (#2604, `FreezeEntry`, `FreezeMode`) с typecheck + lint: `yarn turbo run typecheck lint --filter=@membrana/tariff-freeze` (или соответствующий фильтр пакета).
5. **Влить b3b** (#2605, перерезка) после b3a — без ADR-0031 не стартовать.
6. **Разблокировать b4** (#2599, панель заморозки, Rodchenko) — только после B8-закрытия; до этого Rodchenko готовит контракт props.
7. **Codex: #2590** — параллельно, не блокирует b3a/b3b.

---

## Definition of Done (фокус)

- [ ] `docs/adr/ADR-0031.md` влит в ствол, LGTM Vesnin получен, PR closed.
- [ ] Diff #2596 раскрыт вручную, C1/C9 верифицированы письменно (комментарий или doc), B8 закрыт или заведён follow-up issue.
- [ ] Триаж 4 CVE оформлен письменно с вердиктом runtime/dev по каждому — ни одна runtime-CVE не висит без решения.
- [ ] b3a (`FreezeEntry`, `FreezeMode`, #2604) проходит `typecheck` и влит в ствол.
- [ ] b3b (#2605) влит в ствол после b3a (без ADR-0031 merge запрещён).
- [ ] b4 (#2599) получил чистый старт: B8 закрыт, Rodchenko имеет подписанный контракт props.
- [ ] b6 (#2603, крон уборки) влит или открыт как следующий шаг с явным статусом.
- [ ] CI на стволе зелёный после каждого merge.

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — топ-3 гейта, но владелец вручную назначил `tariff-downgrade-freeze`; стол не чист (P1 × 2 открыты).
- **`assets-container`** — аналогично; откладывается до закрытия P1-блокеров.
- **`chart-list-plugin`** — спринт закрыт (`CLOSED` в плане недели), магистралью не назначать повторно.
- **DSP-бенчмарк (harmonic/cepstral/flux на free-v1)** — потолок зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); повтор без смены датасета или fusion запрещён.
- **`mfcc-compare-sprint`** — не в конвейере дня, Teamlead не снимает блок.
- **Недельная стратегия** — заморожена (кристалл `weekly-strategy-frozen`, owner 2026-07-17).
- **Перечеканка `main-day-assertions.json`** — откладывается на первое свободное окно после b3a/ADR; сейчас блокирует время критического пути.

---

## Вторично (если останется время)

- Черновик манифеста ротации ключей (plain `.md`, датированный список засвеченных ключей) — проба на критерий вехи `secret-parser-built`.
- `night-triage-secret-scan.mjs` на синтетическом файле: резак или только детектор — узнать, что дописать до гейта.

---

## Зависимости и риски

- **Блокер 1 (P1):** diff #2596 не раскрыт — если C9 подтвердится (секреты/конфиг в коде), потребуется follow-up PR до merge b3a; Vesnin не даст LGTM ADR-0031 без закрытия C1.
- **Блокер 2 (P1):** runtime-CVE в триаже — если хотя бы одна из 4 окажется runtime, ствол блокируется до патча независимо от прогресса ADR и b3a.
- **Риск B8:** прокси office→кабинет (#2596) может отсутствовать в `LIVE_SERVICES.md` — немой носитель; если подтвердится, b4 не стартует до исправления.
- **Риск B6:** ritual-счётчик (`6564fec3`) — молчаливый зелёный при пустом результате; если подтвердится, заводим follow-up до вечернего ритуала.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-10-06, фокус и роутинг персон
- [DAILY_CODE_REVIEW.md](docs/DAILY_CODE_REVIEW.md) — ревью 2026-10-05, P1-блокеры C1/C9/B8
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня 2026-10-06 (топ-3 кандидатов; перебит владельцем)
- [morning-gates-state.json](docs/tasks/morning-gates-state.json) — гейт утра, `magistral: tariff-downgrade-freeze`
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — sources[0], owner-choice 06.10
- Issue #2599 — панель заморозки (b4)
- Issue #2603 — крон уборки (b6)
- Issue #2604 — b3a (`FreezeEntry`, `FreezeMode`)
- Issue #2605 — перерезка b3→b3a/b3b
- Issue #2590 — Codex: триаж CVE