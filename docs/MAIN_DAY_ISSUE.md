<!-- Сгенерировано: 2026-09-05T09:02:54.776Z (yarn main-day-issue@45302b37) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"8db528ff45f8893e2538e4446d1bc5a366f6be26","digest":"91225bc9dcec7043419d740d030ce0dc009e74b4c28054cbdba3e6e9f6f10bdc"},"DAILY_STANDUP":{"version":"8db528ff45f8893e2538e4446d1bc5a366f6be26","digest":"788abc9a9620c7e8d7311e748fe73aafb1bc0e86bc628e64822c59b90abc3a74"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-05

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-self-select` |
| `primaryTitle` | Review-pass и приёмка влитой поставки tariff-self-select (self / GET·POST / journal / fanout-квота) |
| `githubIssue` | #2281 · поставка #2286 |
| `size` | L (приёмка влитого; не новый build) |
| `promptPath` | — (карточка/эпик #2281; поставка SHA `1f8df30c`, `aa7d8995`) |
| `сгенерировано` | 2026-09-05 |

## Магистраль

Владельческий фокус с 04.09 — **tariff-self-select (#2281)**: возможность перейти на старший тариф должна быть обычной функцией выбора, без оплаты/промо «на сегодня». Ствол уже несёт oversized-поставку (`1f8df30c` #2286 +1455, `aa7d8995` +625): `proof=self`, `GET /v1/tariffs`, `POST …/me/tariff`, журнал, fanout/sync квоты. Вчерашний вечерний вердикт — **BLOCK** до разворота этих двух merge: код в стволе, продуктовый носитель дня вне обзора; без прохода DoD #2281/#2286 остаётся ложно-закрытым.

**Сегодняшняя магистраль — не новый L-эпик и не «подключить генератор», а утренний review-pass + приёмка швов self-select.** Главный риск: «зелёный кабинет / старая квота на media», если `syncMembraneContext` (или эквивалент) не доталкивает узлы после `self`.

**Критерий успеха к вечеру:** письменный вердикт по швам (`ok` или явный follow-up-issue); зелёный `lint typecheck test` по cabinet/tariff; живое или залогированное подтверждение fanout/квоты на узлах. **Только после этого** — слово владельца на новую магистраль из top-3 DAY_PLAN.

## Подкрепление

- Фикстурный прогон `night-triage-secret-scan.mjs` / резак на срезе с заведомо засвеченными паттернами: cut, не только detect — подпора гейту `secret-parser-built`, **не** ствол дня.
- Черновик датированного манифеста ротации засвеченных ключей (под `credential-rotation-biweekly`): один проход → список ключей/мест/статус — усиливает второй критерий вехи без смены primary.

## Перспективные

- `secret-parser-built` (резак + датированный проход с манифестом) — снятие амнистии правки архива и безопасный session-backup с redaction до выгрузки.
- Живое подтверждение fanout/квоты self-select на узле после review-pass #2286 — полевая приёмка тарифа на дежурстве, не только по merge.
- Апгрейд офиса ≥10.09 — контур `sentry-container` (полный self-hosted, не раньше этой даты).

## Экспериментальные

- Прогон secret-scan на одной фикстуре с ложным ключом в «архивном» фрагменте: режет ли cut или всё ещё только детектит.
- Сухой черновик манифеста ротации на *одном* датированном фейковом токене (без live revoke): хватает ли формы как предикату «один проход с ротацией».
- Сверка пути session-backup «сначала redaction → потом archive» на синтетическом транскрипте: не уезжает ли сырой хвост на сервер до вырезания.

## Санитарные

- review-pass oversized `#2286` (`1f8df30c`, +1455) и `aa7d8995` (+625): швы `self` / GET·POST / log / fanout — merge без разворота обзора
- прогон `lint typecheck test` по cabinet/tariff после merge: тесты есть, полный прогон не зафиксирован
- fanout-квота: сервис есть; живое «N узлов обновлено» / отсутствие «зелёный кабинет + старая квота» — не подтверждено
- ритуальный хвост: `morning-care` fail → r2; claims-probe — 6 «не подтверждено» по вечернему фидбеку
- deps-гигиена: `fast-uri` (high), `fastify`·`qs` (moderate) — апдейт или accept-risk

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль владельца — tariff-self-select (#2281): self-выбор тарифа как функция; ворота оплаты/промо — позже | сессия | owner-choice@chat/magistral-04-09 → `sources[0]` в `main-day-assertions.json` | 2026-09-04 |
| Ствол уже содержит поставку self / GET·POST / journal / fanout (SHA `1f8df30c` #2286, `aa7d8995`) | код / issue | merge #2286 + коммиты поставки | 2026-09-04…05 |
| День = review-pass и приёмка влитого, не новый build L; BLOCK до разворота oversized | план / сессия | `docs/DAILY_STANDUP.md` (фокус дня) + вчерашний вечерний вердикт | 2026-09-05 |
| Риск «кабинет зелёный / media со старой квотой» без доталкивания узлов после self | код | замер `syncMembraneContext` (pair.service) в owner-claim 04.09 | 2026-09-04 |
| Top-3 DAY_PLAN (hostess / assets / batch) — кандидаты, **не** назначенная магистраль; старт только после owner-choice | план | `docs/DAY_PLAN.md` + норма Q1 | 2026-09-05 |
| Веха горизонта `secret-parser-built` — фон/подпора, не primary | план | `docs/STRATEGY_DAY.md` / gate #592 | 2026-09-05 |
| assertions не перечеканены под «день приёмки» (sources[0] всё ещё build-формулировка 04.09) | снимок-хардкод | `docs/tasks/main-day-assertions.json` | 2026-09-04 |

**Голоса:** 1 владельческий источник (04.09 tariff-self-select) + факт merge/поставки в коде + утренний стендап как операционализация того же фокуса на приёмку. DAY_PLAN top-3 и horizon `secret-parser-built` — **не** конкурирующие owner-magistral: план явно ждёт слова владельца; стендап запрещает делать secret-parser primary.

**Расхождение (норма У1):** `morning-gates-state.json` с `magistral` на **сегодня** во входах ритуала **не передан** → магистраль взята с `sources[0]` (04.09). Смысл дня сужен стендапом до **приёмки** уже влитого: `main-day-assertions.json` под «приёмка vs достройка» **не перечеканен** — находка, не повод синтезировать другую магистраль (hostess/assets/batch).

Синтез «новой» магистрали из top-3 **запрещён**, пока owner-source задан.

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Домен перехода и self-поставка уже в стволе (не «писать с нуля») | `symbol:TariffChangeProof` / сервисы tariff-transition + маршруты GET/POST tariff; SHA `1f8df30c`, `aa7d8995` | `violated` как «работы нет» — **ПОСЫЛКА НАРУШЕНА** для build-с-нуля; день = **приёмка**, не greenfield |
| Fanout/sync квоты на узлы после self может не доезжать | поведение `syncMembraneContext` / эквивалент post-self; отсутствие залога «N узлов обновлено» | `unknown` до review-pass — **главный проверочный риск дня** |
| Полный прогон lint/typecheck/test cabinet/tariff после merge не зафиксирован | CI/локальный прогон по затронутым пакетам | `unknown` → обязательный пункт DoD |

Развилка A/B «строить vs принять»: маркеры кода и merge **запрещают** назначать primary как «реализовать tariff-self-select с нуля». Назначение — **review-pass + DoD приёмки #2281/#2286**.

## Сегодня делаем

1. Review-pass diff/швов `#2286` (`1f8df30c`) и `aa7d8995`: `proof=self`, enum/миграция, `GET /v1/tariffs`, `POST /v1/membranes/me/tariff`, журнал `TariffChangeLog`, отказы.
2. Проверить UI/страницу мембраны: выбор тарифа активирует self-переход без оплаты/промо-ветки «на сегодня».
3. Проследить post-self путь квоты: вызывается ли fanout/sync до узлов; нет сценария «кабинет новый тариф / media старая квота».
4. Прогон `lint` + `typecheck` + `test` по cabinet/tariff (и связанным пакетам поставки); зафиксировать результат в вердикте.
5. Письменный вердикт приёмки: **ok** или **follow-up-issue** с конкретным швом (fanout / API / UI / тесты).
6. Только при ok — запросить у владельца слово на следующую магистраль из top-3 (hostess / assets / batch); без ok — не открывать новый L.

## Definition of Done (фокус)

- [ ] Швы `self` / GET tariffs / POST me/tariff / journal разобраны; замечания записаны или закрыты
- [ ] Fanout/sync квоты после self подтверждён (лог, тест или живой след «узлы обновлены») **либо** заведён явный follow-up-issue
- [ ] Нет принятого «ложно-зелёного»: кабинет не считается done при старой квоте на media
- [ ] `lint` / `typecheck` / `test` по затронутым cabinet/tariff — зелёные, результат зафиксирован
- [ ] Письменный вердикт дня по #2281/#2286: ok **или** follow-up
- [ ] Ворота оплаты/промо **не** размазаны по коду «заодно» (одно место — позже, не сегодня)
- [ ] Новый L из top-3 DAY_PLAN **не** стартовал без свежего owner-choice после вердикта

## Сознательно не делаем сегодня

- Не стартуем `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` без нового owner-choice
- Не делаем гейт `secret-parser-built` (#592) primary (максимум фикстура + черновик манифеста)
- Не открываем детекционную магистраль (scoreboard / «Этап 1.A» / benchmark harmonic+cepstral+flux / повтор free-v1)
- Не тащим `library-open-api-door` снова как primary
- Не смешиваем приёмку self-select с полевым `node-duty-ready` как заменой review швов
- Не размазываем ворота оплаты/промокода в сегодняшнем diff

## Вторично (если останется время)

1. Фикстура detector vs redact + набросок манифеста ротации (подпора `secret-parser-built`, не ствол).
2. deps: решение по `fast-uri` (high) — bump или accept-risk с записью.

## Зависимости и риски

- **Блокер продукта:** без подтверждённого fanout self-select опасен в поле (рассинхрон квот кабинет↔media/узлы).
- **Процесс:** merge already in trunk + отсутствующий review = ложно-закрытый DoD; вечерний BLOCK остаётся в силе до вердикта.
- **assertions stale:** `sources[0]` про build 04.09; день 05.09 — accept; перечеканка манифеста каноном предписана и не сделана — не синтезировать чужой primary.
- **Scope creep:** top-3 L и secret-gate рядом в горизонте — легко расползтись; держать один primary.

## Ссылки

- `docs/DAILY_STANDUP.md` — фокус: review-pass tariff-self-select
- `docs/DAY_PLAN.md` — top-3 кандидатов; санитарные = accept #2286
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built` (не primary)
- `docs/tasks/main-day-assertions.json` — `sources[0]`: owner 04.09 tariff-self-select (#2281)
- GitHub #2281 (эпик/фокус), #2286 (oversized поставка)
- `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` — детекция не магистраль дня