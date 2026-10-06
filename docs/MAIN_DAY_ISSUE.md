<!-- Сгенерировано: 2026-10-06T09:46:43.746Z (yarn main-day-issue@95b0dba0) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"37a00f4a4596d0ad93593c1c616bf11fe4b5f5d8","digest":"ff894bffd6ebf5e30fb5646a41fc7188fc573dc689162babf5f991f91f806500","versionAt":"2026-10-05T15:40:07+03:00"},"DAILY_STANDUP":{"version":"a59b3cb726f9a9fe5a54fa13e2fefbb14808bcaf","digest":"da1bce33d921ca5efe6ef83c3c11999dee2405aa5e900ad71a9ae5e66c1ef825","versionAt":"2026-10-05T18:31:21+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-06

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-downgrade-freeze` |
| `primaryTitle` | Понижение тарифа со старшего на младший с заморозкой избыточных данных |
| `githubIssue` | #2587 / #2588 |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-10-06 |

---

## Магистраль

**`tariff-downgrade-freeze`** — понижение тарифа с заморозкой избыточных данных. Владелец выбрал эту магистраль 05.10 (ручной выбор вне топ-3 плана дня). Два блока: #2587 — формат заморозки (избыток буфера → холодный архив, «живое» отбирается одним из трёх режимов журнальной витрины с настройкой в кабинете и подтверждением при понижении, разморозка рукой пользователя); #2588 — срок хранения архива до удаления (умолчание 14 дней, тест 1 день, per-user в office выпадающим списком). Консилиум 05.10 (вердикты 1–6 приняты владельцем) зафиксировал: исключение из M5 Retain, отдельные таблицы архива в media, дверь office→кабинет минимальная, срок — снимок при заморозке, порядок freeze→tariff, отбор «в пределах байт».

**Шаг дня: ADR-0031 кладём файлом в ствол → перерезаем два плана под вердикты консилиума → ратифицируем → начинаем код b1.**

**Критерий успеха к вечеру:** файл `docs/adr/ADR-0031.md` влит в ствол, охватывает вердикты 1–6; `main-day-assertions.json` перечеканены под `tariff-downgrade-freeze`; b1 (`freeze-format`) имеет хотя бы скелет типов и контракт модуля.

---

## Подкрепление

- **Письменный триаж 4 CVE** (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — вердикт runtime vs dev по каждому; runtime-находка блокирует следующий merge и ставит под сомнение чистоту ствола до прохождения гейта `secret-parser-built`. Dynin, P1.
- **Раскрыть diff #2596 вручную** (`git show 6f87dc45 -- packages/background-office`) и верифицировать C1/C9: нет ли прямых импортов `background-office` → `background-media` или `packages/core`; адрес прокси зафиксировать в `LIVE_SERVICES.md` (B8-риск из code-review). Пока не закрыто — merge-очередь стоит. Vesnin + Ozhegov, P1.

---

## Перспективные

- После ратификации ADR-0031 открываются b3–b5 магистрали (`tariff-downgrade-freeze`): без письменной границы контрактов следующие шаги тарифной лестницы не имеют архитектурной санкции.
- Раскрытие диффа #2596 и фиксация прокси office→кабинет в `LIVE_SERVICES.md` разблокируют Rodchenko для UI-компонента заморозки (b4) без архитектурного B8-риска.
- Закрытие гейта `secret-parser-built` (резак поверх детектора + датированный манифест ротации) снимает амнистию на правку архива и открывает бэкап сессий без риска утечки секретов.

---

## Экспериментальные

- **Проба «резак vs детектор»:** запустить `night-triage-secret-scan.mjs` на синтетическом файле с заведомым паттерном секрета и проверить, вырезается ли строка или только логируется — выясним точно, что ещё нужно дописать до прохождения гейта.
- **Проба «манифест ротации как plain-md»:** составить черновик манифеста засвеченных ключей одним `.md`-файлом (список, дата, статус) без автоматизации — проверим, достаточно ли этого для критерия вехи `secret-parser-built` или нужна машинная форма.
- **Проба «oversized-diff и нестандартные паттерны»:** прогнать диффут одного из oversized-коммитов (579 или 668 строк) через парсер вручную — узнать, покрывает ли текущий детектор форматы, отличные от `${…:?…}`/`$$…`.

---

## Санитарные

- ADR-0031 не положен файлом в ствол — код опередил документ; инверсия зафиксирована Vesnin + Teamlead, долг не закрыт.
- `main-day-assertions.json` не перечеканены под `tariff-downgrade-freeze` — расхождение гейт/assertions задокументировано, но не устранено (перечеканка предписана каноном, не сделана — сама по себе находка).
- Письменный манифест замороженных данных отсутствует — DoD магистрали не закрыт, LGTM не поставлен.
- Триаж 4 CVE письменно не оформлен (runtime vs dev по каждому) — Dynin.
- Diff #2596 не раскрыт — C1/C9 и B8 не верифицированы; прокси office→кабинет может не быть в `LIVE_SERVICES.md`.
- Ritual-счётчик `6564fec3` не проверен на B6 («молчаливый зелёный»): exit-код при пустом результате.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль — `tariff-downgrade-freeze` (выбор владельца 05.10, ручной, вне топ-3) | `morning-gates-state.json` → поле `magistral` + `magistralManual` | Слово владельца в чате (`owner-choice@chat/magistral-05-10-manual`) | 2026-10-05 |
| **Расхождение: магистраль взята с гейта (`morning-gates-state.json`), `assertions` не перечеканены** — `sources[0]` в `main-day-assertions.json` несёт тот же выбор (05.10), но `assertions[]` пусты; перечеканка предписана каноном и не сделана; расхождение само есть находка, не замалчивается | `morning-gates-state.json` vs `main-day-assertions.json` | Оба — владельческие источники; спор решён свежестью гейта (гейт — более поздний артефакт того же дня); синтез запрещён | 2026-10-05 |
| `morning-gates-state.json` несёт `"day": "2026-10-05"` — не сегодняшний день (2026-10-06); свежесть `no_gate` по предикату `magistralFreshness` | `morning-gates-state.json` | Сам файл (машинный артефакт, подписан владельцем 05.10) | 2026-10-05 |
| Шаг дня — ADR-0031 + b1 — зафиксирован владельцем в `sources[0].claim` | `main-day-assertions.json` → `sources[0]` | Слово владельца (`owner-choice@chat/magistral-05-10-manual`) | 2026-10-05 |
| Консилиум 05.10, вердикты 1–6 приняты владельцем — архитектурная санкция для ADR-0031 | `main-day-assertions.json` → `sources[0].claim` | Протокол консилиума (слово владельца о принятии) | 2026-10-05 |
| Plan дня (`DAY_PLAN.md`) предлагает три кандидата (`angelina-hostess-impl`, `assets-container`, `chart-list-plugin`) — все три отброшены; владелец выбрал `tariff-downgrade-freeze` вне их (1 источник, 1 отражение в плане) | `план` | `DAY_PLAN.md` от 2026-10-06 | 2026-10-06 |
| Стендап подтверждает P1-блокеры (diff #2596, CVE-триаж) как предусловия — не как магистраль | `стендап` | `DAILY_STANDUP.md` от 2026-10-06 | 2026-10-06 |

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| ADR-0031 не положен файлом в ствол — документ отсутствует | `file:docs/adr/ADR-0031.md` | `holds` (файла нет — задача актуальна) |
| `main-day-assertions.json` не перечеканены под `tariff-downgrade-freeze` — `assertions[]` пусты | `file:docs/tasks/main-day-assertions.json` → поле `assertions` | `holds` (массив пуст, расхождение не закрыто) |
| Код b1 (`freeze-format`) ещё не существует как типизированный модуль | `symbol:FreezeFormat` или `file:packages/*/freeze-format*` | `unknown` — маркер не верифицирован в контексте; назначение b1 держится на слове владельца в `sources[0]`, не на отсутствии символа; при верификации провести `grep -r FreezeFormat packages/` до начала работы |

---

## Сегодня делаем

1. Положить `docs/adr/ADR-0031.md` в ствол, охватив вердикты 1–6 консилиума 05.10; PR открыт, ратифицирован Vesnin (LGTM).
2. Перечеканить `docs/tasks/main-day-assertions.json` под `tariff-downgrade-freeze` — закрыть зафиксированное расхождение гейт/assertions.
3. Раскрыть diff #2596 (`git show 6f87dc45 -- packages/background-office`), верифицировать C1/C9, зафиксировать адрес прокси в `LIVE_SERVICES.md` или открыть follow-up issue при нарушении.
4. Оформить письменный триаж 4 CVE с вердиктом runtime vs dev по каждому; при runtime-находке — заблокировать merge до устранения.
5. Написать скелет b1 (`freeze-format`): типы `FreezeEntry`, `FreezeMode`, контракт модуля — достаточно для LGTM Архитектора.
6. Проверить ritual-счётчик `6564fec3` на B6: `git show 6564fec3 -- scripts/`; убедиться, что exit-код ≠ 0 при пустом результате.

---

## Definition of Done (фокус)

- [ ] Файл `docs/adr/ADR-0031.md` влит в ствол; охватывает вердикты 1–6 консилиума 05.10; LGTM Vesnin поставлен.
- [ ] `docs/tasks/main-day-assertions.json` перечеканены под `tariff-downgrade-freeze`; поле `assertions` не пусто; расхождение закрыто.
- [ ] Diff #2596 раскрыт вручную; C1/C9 верифицированы; результат записан (либо `LIVE_SERVICES.md` обновлён, либо follow-up issue открыт с явным маркером B8).
- [ ] Триаж 4 CVE оформлен письменно (runtime vs dev); при runtime — заблокирован merge.
- [ ] Скелет b1 (`FreezeEntry`, `FreezeMode`, контракт модуля) проходит `typecheck`; Архитектор дал форму решения.
- [ ] Ritual-счётчик проверен: exit-код при пустом результате ≠ 0; B6-флаг закрыт или открыт follow-up.
- [ ] `yarn turbo run typecheck lint --filter=@membrana/background-office` — зелёный.

---

## Сознательно не делаем сегодня

- Не берём в магистраль `angelina-hostess-impl`, `assets-container`, `chart-list-plugin` — план дня предложил их как топ-3, но владелец 05.10 выбрал `tariff-downgrade-freeze` вне этого списка.
- Не повторяем DSP-бенчмарк (harmonic/cepstral/flux на free-v1) — потолок эшелона 0 зафиксирован (`FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6); без смены датасета, алгоритма или fusion повтор ничего не добавляет.
- Не берём вторую магистраль параллельно — стол не чист (P1 × 2 открыты), распыление запрещено.
- Не пишем ADR-0031 «по памяти» без протокола консилиума 05.10 — граница «что замораживаем / что неприкосновенно» должна точно воспроизводить вердикты 1–6.
- Не трогаем `mfcc-compare-sprint` как магистраль — датасет требует явной проверки на исключение из зоны заморозки.
- Не запускаем `yarn code-review` утром — вчерашний `DAILY_CODE_REVIEW.md` читаем, не перегенерируем.

---

## Вторично (если останется время)

- Проба `night-triage-secret-scan.mjs` на синтетическом файле с секретом — верифицировать «резак vs детектор» до гейта `secret-parser-built`.
- Черновик манифеста засвеченных ключей в одном `.md`-файле (список, дата, статус) — проверить, достаточно ли plain-md для критерия вехи.

---

## Зависимости и риски

- **Блокер (P1):** diff #2596 не раскрыт — C1/C9/B8 не верифицированы; merge-очередь стоит до закрытия.
- **Блокер (P1):** runtime-CVE в триаже заблокирует merge b1 в ствол; триаж должен быть первым после ADR-0031.
- **Риск (P2):** `main-day-assertions.json` не перечеканены — probe завтра зафиксирует расхождение снова; перечеканка должна быть закрыта сегодня в рамках шага дня.
- **Риск (P2):** B6 в ritual-счётчике — молчаливый зелёный при пустом результате маскирует сбои; проверка блокирует следующий ritual-deploy.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап 2026-10-06
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня (топ-3 кандидата; владелец выбрал вне списка)
- [morning-gates-state.json](docs/tasks/morning-gates-state.json) — источник магистрали (`magistral: tariff-downgrade-freeze`, `day: 2026-10-05`)
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — `sources[0]` (тот же выбор владельца 05.10; `assertions[]` пусты — перечеканка не закрыта)
- [DAILY_CODE_REVIEW.md](docs/DAILY_CODE_REVIEW.md) — вчерашнее ревью (P1: diff #2596 не раскрыт, B8-риск)
- [FFT_METRICS_POTENTIAL_AND_LIMITS.md](docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md) — §6, потолок эшелона 0