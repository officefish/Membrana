<!--
  archive-role: archive-snapshot
  archive-day: 2026-10-05
  archived-at: 2026-10-05T22:16:54.715Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-10-05T12:44:52.009Z (yarn main-day-issue@dc77f87b) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"37a00f4a4596d0ad93593c1c616bf11fe4b5f5d8","digest":"2f8bc0e50890cde050c5eebe54c4b7b4a76bd00e29dad628f8e7f9084d4ddbec","versionAt":"2026-10-05T15:40:07+03:00"},"DAILY_STANDUP":{"version":"dc77f87b1c77a4c273ad9ba88f483561eb6c1958","digest":"b19695715e2abdf8bd1f307afbd740f00b5e40db19d1240a007e4f95b4a94654","versionAt":"2026-10-05T15:43:04+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: trace-freeze-e-adr-gate-pr, trace-freeze-d-probe-truth-tooth, trace-freeze-c-library-render, trace-freeze-b-live-sendsync, trace-freeze-a-cut, cowork-library-open-api, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, frame-holders-reassign-twenty, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-10-05

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-downgrade-freeze` |
| `primaryTitle` | Понижение тарифа со старшего на младший с заморозкой избыточных данных |
| `githubIssue` | #2587, #2588 |
| `size` | L |
| `promptPath` | — |
| `сгенерировано` | 2026-10-05 |

---

## Магистраль

**Магистраль взята с гейта (`morning-gates-state.json`, `day: 2026-10-05`), который несёт выбор владельца ПОЗЖЕ, чем `sources[0]` в `main-day-assertions.json`. Оба источника владельческие — спор решается свежестью. Расхождение не замалчивается: `magistral` в гейте (`tariff-downgrade-freeze`) совпадает по смыслу с `sources[0].claim` от 05.10, но `main-day-assertions.json` не перечеканен под это имя — перечеканка предписана каноном и не сделана. Это находка, а не блок.**

Владелец 05.10 назначил магистраль вручную вне топ-3: **понижение тарифа со старшего на младший с заморозкой избыточных данных** (`tariff-downgrade-freeze`). Два продуктовых блока: #2587 — формат заморозки (избыток буфера → холодный архив, «живое» отбирается одним из трёх режимов журнальной витрины, настройка в кабинете + подтверждение при понижении, разморозка рукой пользователя) и #2588 — срок хранения архива (умолчание 14 дней, тест 1 день, per-user в office выпадающим списком). Консилиум 05.10 зафиксировал шесть вердиктов (исключение из M5 Retain, отдельные таблицы архива в media, дверь office→кабинет минимальная, срок — снимок при заморозке, порядок freeze→tariff, отбор «в пределах байт»), все приняты владельцем.

Шаг дня — **ADR-0031**, перерезка планов #2587/#2588 под вердикты 1–6 → ратификация владельцем → код b1. Порядок исполнения строгий: сначала Тарасов фиксирует границу «что замораживаем / что неприкосновенно для активных задач», затем Дынин исполняет и верифицирует буфет; Ожегов проверяет связность сервисов.

**Критерий успеха к вечеру:** ADR-0031 в стволе; планы #2587 и #2588 перерезаны под вердикты 1–6 и ратифицированы владельцем; первый кодовый блок #2587 (b1 — отбор «в пределах байт») в работе или в PR. Живое понижение тарифа и приёмка — не сегодня: это конец спринта, после b1–b5.

---

## Подкрепление

- **P0 C9 — проверка #2582 на plain-text секреты** (`git show de3b29a1 -- "*.env*" "*.yml" "*.json" | grep -iE "password|mongodb\+srv|uri"`): выполняется первым действием до любой работы с данными; без чистого результата магистраль `secret-parser-built` не может опереться на историю credentials-генератора, и работа с буфером небезопасна. Исполнитель: Дынин + Тарасов.
- **Triage четырёх CVE** (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — письменный вердикт runtime vs dev; при runtime — P1 до следующего merge. Разблокирует merge-очередь и даёт чистое основание для операции с буфером. Исполнитель: Дынин.

---

## Перспективные

- После закрытия P0 по #2582 разблокируется прохождение вехи `secret-parser-built`: парсер получит проверенный кейс реального засвеченного ключа и сможет встать в CI-гейт; амнистия на правку архива снимается этим гейтом.
- ADR-0031 ратифицированный → код b1 (#2587/#2588) даёт продуктовый каркас тарифной лестницы и открывает следующий виток: UI-компонент подтверждения заморозки (Родченко) и probe манифеста в ночном трейле.
- Подтверждение порядка `sprint:gate` → `"status":"pass"` в трейле за 04.10 (запрос Веснина из code-review) закроет P1-инверсию и позволит открыть разбор #2562 (`header-badge-narrow`, 406 строк) — первый из 20 неразобранных PR.

---

## Экспериментальные

- **Проба dry-run резака:** запустить `night-triage-secret-scan.mjs --dry-run` до любой записи в буфер — убедиться, что агрессивный рез не сносит безопасный контент рядом с секретом; результат сверить с тем, что найдёт `grep` по #2582.
- **Проба манифеста на мок-файле:** подать парсеру синтетический файл с одним засвеченным ключом, проверить, что манифест несёт дату, id ключа и признак заморозки — достаточен ли формат для прохождения гейта `secret-parser-built` без правки критериев.
- **Проба отбора «в пределах байт»:** на локальном срезе буфера (≤100 записей) прогнать три режима журнальной витрины и замерить расхождение в итоговом объёме — убедиться, что вердикт 6 консилиума («в пределах байт») вычислим детерминированно, прежде чем код b1 пойдёт в ревью.

---

## Санитарные

- Triage четырёх CVE (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`): runtime vs dev письменно; при продуктовом runtime — P1 до любого merge.
- #2590 — подпись выборки chart-list не следует за сохранённым критерием (P2, заведено ведущей 05.10; Родченко при свободном слоте).

> **Снято сверкой ведущей 05.10** (генератор перенёс пункты из ревью 04.10):
> - «P0: секреты в #2582» — команда прогнана 04.10 вечером: в диффе de3b29a1 только шаблоны `${…:?…}`/`$$…`, 48-hex строк 0; чисто.
> - «порядок sprint:gate → status pass» — проверен: `review_pass` 16:27:00Z, close `pass` 16:39:00Z (19:39+03:00); порядок верный, инверсии нет.
> - «верифицировать #2503» — это влитый PR (MERGED), не задача.

---

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль = `tariff-downgrade-freeze` | гейт (`morning-gates-state.json`, `magistral`, `magistralChosenAt: 2026-10-05`, `magistralAuthor: human`) | слово владельца в гейте утра | 2026-10-05 |
| Та же магистраль по содержанию: «понижение тарифа + заморозка избыточных данных» | `main-day-assertions.json`, `sources[0].claim`, `origin: owner-choice@chat/magistral-05-10-manual` | слово владельца в чате | 2026-10-05 |
| **Расхождение:** гейт несёт `tariff-downgrade-freeze`, assertions не перечеканены под это имя — магистраль взята с гейта как более позднего владельческого источника; assertions не перечеканены — это находка, перечеканка предписана каноном | сравнение двух файлов | оба владельческих источника | 2026-10-05 |
| Буфер давит на квоту: 1727 проб / 797 МБ — операционный риск, который счётчик приоритетов не поднял | стендап `DAILY_STANDUP.md` (цитирует реестр задач и мониторинг буфера) | реестр задач + мониторинг | 2026-10-05 |
| Консилиум 05.10 — вердикты 1–6 приняты владельцем; порядок freeze→tariff, отдельные таблицы архива в media | `sources[0].claim` | слово владельца, чат 05.10 | 2026-10-05 |
| `angelina-hostess-impl`, `assets-container`, `chart-list-plugin` — топ-3 плана дня (`DAY_PLAN.md`) | план дня `DAY_PLAN.md` | генератор плана (детерминированный ранг реестра) | 2026-10-05 |
| Владелец выбрал магистраль **вне топ-3** (`magistralManual.inSnapshot: false`) — суверенный выбор; синтезировать свою магистраль из топ-3 **запрещено** правилом промпта | `morning-gates-state.json`, поле `magistralManual.inSnapshot` | гейт утра | 2026-10-05 |

> Счёт независимых первоисточников: 2 владельческих (гейт + assertions, один день, взаимоподтверждают) + 1 мониторинг буфера + 1 генератор плана. Топ-3 плана — 1 источник (генератор), 3 отражения; их вес = вес одного.

---

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Код заморозки b1 (#2587/#2588) ещё не написан — ADR-0031 не существует | `file:docs/adr/ADR-0031.md` — файл отсутствует; issues #2587/#2588 в статусе open | holds |
| Манифест замороженных данных не зафиксирован письменно | `file:docs/freeze-manifest-*.md` или аналог — не упоминается в стендапе и code-review | holds |
| P0 C9 (#2582) не закрыт — plain-text секреты в диффе не проверены | `git show de3b29a1 -- "*.env*" "*.yml" "*.json"` — дифф не раскрыт по code-review, ручная проверка не выполнена | holds (требует проверки утром) |

Развилок нет; все посылки держатся.

---

## Сегодня делаем

1. **P0 первым:** `git show de3b29a1 -- "*.env*" "*.yml" "*.json" | grep -iE "password|mongodb\+srv|uri"` — зафиксировать результат письменно; при нахождении — стоп и ротация до продолжения.
2. **Тарасов фиксирует границу заморозки** — письменный вердикт: какие данные замораживаем, какие неприкосновенны для `assets-container` и `mfcc-compare-sprint`; без этого вердикта Дынин и Ожегов не трогают данные.
3. **ADR-0031 — написать и ратифицировать** под вердикты консилиума 05.10 (1–6): исключение из M5 Retain, отдельные таблицы архива в media, дверь office→кабинет минимальная, срок — снимок при заморозке, порядок freeze→tariff, отбор «в пределах байт».
4. **Дынин — техническое исполнение заморозки:** понизить тариф, переместить избыток буфера в холодный архив, верифицировать, что буфер укладывается в новый лимит.
5. **Ожегов — проверка связности:** убедиться, что хуки/сторы не тянут данные напрямую из зоны заморозки; сервисы, читающие замороженный контейнер, не сломаны.
6. **Triage CVE** (`@fastify/busboy` ×2, `braces`, `http-cache-semantics`) — письменный вердикт runtime vs dev.
7. **Тарасов — LGTM** после п. 4–5: манифест зафиксирован, тариф понижен, активные задачи подтвердили чистоту своих датасетов.

---

## Definition of Done (фокус)

- [ ] P0 C9: `git show de3b29a1` проверен, результат зафиксирован письменно (нет plain-text секретов / ротация выполнена)
- [ ] Тарасов зафиксировал письменную границу «что замораживаем / что неприкосновенно»
- [ ] ADR-0031 написан, покрывает вердикты 1–6 консилиума 05.10, ратифицирован владельцем
- [ ] Тариф понижен (старший → младший), буфер укладывается в новый лимит — верифицировано Дыниным
- [ ] Манифест замороженных данных зафиксирован письменно (дата, список, режим отбора)
- [ ] Ожегов подтвердил: хуки/сторы не тянут данные из зоны заморозки, связность не нарушена
- [ ] Тарасов поставил LGTM — день по магистрали считается закрытым

---

## Сознательно не делаем сегодня

- **`angelina-hostess-impl`** — стол не чист (P0 C9 открыт, граница заморозки не зафиксирована); брать параллельную магистраль запрещено.
- **`assets-container`** как магистраль — входит в топ-3 плана, но владелец выбрал `tariff-downgrade-freeze` вне топ-3; синтезировать свою магистраль из топ-3 запрещено.
- **ADR по контракту шины `chart-list-plugin`** — Родченко остаётся в блоке; ADR переходит в перспективный слот, Тарасов даёт LGTM только после закрытия магистрали.
- **DSP-бенчмарк** (harmonic / cepstral / flux) — потолок эшелона 0 зафиксирован; без смены датасета или fusion повтор не добавляет ничего.
- **Разбор #2562** (`header-badge-narrow`, 406 строк) — открывается только после закрытых P0/P1.
- **`mfcc-compare-sprint`** — работа не останавливается, но не становится магистралью; датасет проверяется на исключение из зоны заморозки (п. 2 «Сегодня делаем»).

---

## Вторично (если останется время)

- Подтвердить порядок `sprint:gate` → `"status":"pass"` в трейле за 04.10 (`cat docs/procedure-runs/trail/2026-10-04.jsonl | grep chart-list | jq '.at, .status'`); при инверсии завести билет.
- Верифицировать #2503 (`yarn ask vesnin --no-context "тест"`) — закрыть статус `unknown`.

---

## Зависимости и риски

- **Блокер 1 (P0):** до проверки #2582 на plain-text секреты любая работа с данными буфера небезопасна — C9 стоит первым.
- **Блокер 2:** граница заморозки (вердикт Тарасова) должна быть зафиксирована до того, как Дынин или Ожегов трогают данные; без неё исполнители работают вслепую.
- **Риск:** заморозка может задеть датасеты `assets-container` или `mfcc-compare-sprint` — проверить явно при фиксации границы (п. 2).
- **Риск:** `main-day-assertions.json` не перечеканен под имя `tariff-downgrade-freeze` — расхождение с гейтом остаётся открытой находкой; перечеканка предписана каноном, не сделана сегодня = долг на следующий ритуал.

---

## Ссылки

- [DAILY_STANDUP.md](docs/DAILY_STANDUP.md) — стендап дня
- [DAY_PLAN.md](docs/DAY_PLAN.md) — план дня (топ-3 кандидатов)
- [morning-gates-state.json](docs/tasks/morning-gates-state.json) — гейт утра, источник магистрали
- [main-day-assertions.json](docs/tasks/main-day-assertions.json) — assertions владельца (не перечеканены под `tariff-downgrade-freeze`)
- [DAILY_CODE_REVIEW.md](docs/DAILY_CODE_REVIEW.md) — вчерашнее code-review (P0 C9, P1 инверсия)
- GitHub Issues: [#2587](../../issues/2587), [#2588](../../issues/2588), [#2582](../../issues/2582)