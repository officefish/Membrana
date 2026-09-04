<!-- Сгенерировано: 2026-09-04T11:44:35.615Z (yarn main-day-issue@8db528ff) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"8db528ff45f8893e2538e4446d1bc5a366f6be26","digest":"a5a42e34ba7a7e803c8198b867707371dea8638e3d31125f63966878895ea074"},"DAILY_STANDUP":{"version":"8db528ff45f8893e2538e4446d1bc5a366f6be26","digest":"4c99c628ee72f725f752d083232908162f4c6207d5d8780c5661c090e2c1fa11"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: cowork-library-open-api, playback-hang-timeout, node-duty-ready-predicate, studio-package-av-refusal, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, scenario-rate-first-capture, scenario-rate-sprint, media-per-device-token, capture-sidecar-protocol, plugin-results-payload-pocket, firebat-node-device, server-plugin-foundation, static-mmbrn-retirement, static-mmbrn-live-services, static-mmbrn-cutover, static-mmbrn-m6-alignment, static-mmbrn-rehydrate-parity, static-mmbrn-ingress-auth, static-mmbrn-target-provision, static-mmbrn-disposition-ledger, static-mmbrn-container, morning-journal-close-step, frame-holders-reassign-twenty, frame-holder-moderator-split, workflow-examples-marathon, procedure-run-journal-f1-local-trail, procedure-run-journal-2026-08-01, meeting-evening-review-predicate, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, frame-rails-2307, lpc-d-panel, lpc-c-office, lpc-b-wire, lpc-a-lib, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, tooling-atlas, assets-container, bridge-room, precedent-container, procedural-workshop, office-stability-emergency, swallow-format-frame-fix, code-review-lead-refactor, morning-report-completion, procedural-layer-impl, angelina-hostess-impl, linear-hygiene-dreams-providers-night, ritual-r-report, ritual-s-standup, ritual-k-karkas, ritual-a-angelina-coordinator, meeting-registry-relocation, meeting-team-execution-contour, team-accountability-metrics, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, swallow-delivery-idempotency, dads-benchmark-bridge, morning-ritual-regulation, night-build-format-v2, strategy-day-generator, truth-graph-contour, mf10-teeth-sm5, mf9-auditor-readonly, mf8-sprint-kind, mf7-active-guard, mf6-auditor-worktree, mf5-echo-rule, mf4-teeth-sm2, mf3-commands-vs-flag, mf2-branch-count, mf1-format-carrier, meeting-format, ally-swallow-editorial-gate, membrana-device-build-profile, rt-7-priorities-from-registry, rt-5-pr-land, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, grp1-route-bridge-sections, graphify-research-tree-panel-sections, main-day-probe-gate, detector-metrics-characterization, product-landing, root-domain-scenarios-docs, drift-anchor-contour, real-dataset-live-calibration, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, db3h-s4-microphone-detectors, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, sca-manual-smoke, pcb-d2-multinode, partner-tutorials, pt-0-tutorial-template, pt-1-read-facts-sheet, pt-2-first-output-v01-endtoend, pt-3-honest-tech-storytelling, detection-alarm-loop-refactor, batch-collection-run-contour -->

# MAIN_DAY_ISSUE — 2026-09-04

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `tariff-self-select` |
| `primaryTitle` | Self-select тарифа: третье основание + GET/POST + UI выбора на мембране (#2281) |
| `githubIssue` | #2281 |
| `size` | L |
| `promptPath` | — (карточка/issue #2281; домен уже в `tariff-transition.service.ts`) |
| `сгенерировано` | 2026-09-04 |

## Магистраль

**tariff-self-select (#2281)** — возможность перейти на старший тариф должна стать функцией, которую активируют простым выбором другого тарифа; ворота с оплатой/промокодом — позже, одним местом в коде, **не сегодня**.

Замер ствола `5a130b82`: домен перехода **уже есть** — `tariff-transition.service.ts`, журнал `TariffChangeLog`, защита от параллельной смены; оснований два (`TariffChangeProof`: `admin`, `promo`); ручка кабинета одна — `POST /v1/membranes/me/tariff/promo-redemptions`; **списка тарифов наружу и UI выбора нет**. Сегодня строить: (1) третье основание `self` + миграция; (2) `GET /v1/tariffs` и `POST /v1/membranes/me/tariff {toTariffId}` тем же сервисом, отказы переиспользовать; (3) выбор тарифа на странице мембраны. Дыра замера: `syncMembraneContext` зовётся только из `pair.service.ts:79` — смена тарифа до приборов на media не доезжает без перепривязки; переход `self` обязан дотолкнуть квоту до всех узлов мембраны и назвать счёт. Контекст дня: после живого дежурства до полного буфера на текущем тарифе (#2204 закрыт 28.08) — буфер на старшем тарифе через эту функцию.

**Критерий успеха к вечеру:** основание `self` в enum/миграции; `GET /v1/tariffs` отдаёт список; `POST …/me/tariff` меняет тариф тем же сервисом без обхода журнала; на странице мембраны можно выбрать другой тариф; смена доталкивает контекст/квоту до узлов (или явный счётчик/лог «N узлов обновлено»); ворота оплаты/промо **не** размазаны по UI — одно будущее место, сегодня не реализуется.

## Подкрепление

- **node-duty-ready** — Студия на узле руками владельца; ключ по записи 20.08 истекал 03.09 — живое не проверено; три «да» скрипта готовности узла, чтобы self-select квоты было куда применять на реальном дежурстве.
- **merge-queue-red-verdict** — одна запись вердикта «помеха vs pre-existing» по красным `#2266` (порог 5 с vs 5,4–5,6 с) и `#2256` (false red без `dist`), чтобы product-merge очередь не блокировала выкат self-select смежными шумами.

## Перспективные

- Прохождение гейта `secret-parser-built` (резак в пути бэкапа + один датированный манифест ротации) снимет амнистию на правку архива и закроет кристалл `session-backup-requires-secret-redaction` — горизонт #592 в phase approaching, **не** ствол сегодняшнего owner-choice.
- Review-pass / слово владельца на выкатку двери библиотеки: OPEN `#2271`, review-debt `#2267` (MERGED ~6k без разворота); шов обёртки open-API `items/total/page/limit` vs потребитель кабинета (нет скрытой зависимости от `hasMore`).
- Ворота оплаты/промокода к self-select — одним местом в коде после того, как выбор тарифа станет обычной функцией (слово владельца 04.09: «впоследствии»).

## Экспериментальные

- Прогнать `night-triage-secret-scan.mjs` на синтетическом фикстуре с тремя заведомо ложными ключами: детектор vs резак — вырезает ли спаны целиком (горизонт `secret-parser-built`, не блокер магистрали).
- Набросать однострочную запись манифеста ротации для одного fake-ключа без касания архива — машиночитаем ли формат до датированного прохода.
- Сверить один ответ open-API `items/total/page/limit` с реальным вызовом кабинета (без правки контракта) — есть ли скрытая зависимость потребителя от `hasMore`.

## Санитарные

- вердикт «помеха vs pre-existing» по `#2266` / `#2256` — разблокировать product-merge (совпадает с подкреплением merge-queue-red-verdict)
- review-debt: развернуть `#2267` (MERGED, ~6021 строка без прохода) и OPEN `#2271` (blob/no-store)
- шов «обёртка `items/total/page/limit` vs потребитель кабинета»
- `EXPECTED_PATHS` в `verify-swagger.mjs`: scenario edit-lease и node-ручки
- deps-watch 03.09: всплеск `fast-uri` high / `fastify`·`qs` moderate — security-гигиена, не регресс дня

## Почему это магистраль (таблица обоснования)

| Утверждение | Происхождение | Первоисточник | Свежесть |
|-------------|---------------|---------------|----------|
| Магистраль дня — `tariff-self-select` (#2281), выбор №1 из замороженного снимка (tariff-self-select · node-duty-ready · merge-queue-red-verdict) | сессия | owner-choice@chat/magistral-04-09 → `docs/tasks/main-day-assertions.json` `sources[0]` | 2026-09-04 |
| «Переход на старший тариф — функция выбором тарифа; ворота оплаты/промокода впоследствии» | сессия | то же utterance владельца 04.09 (sources[0].claim) | 2026-09-04 |
| Домен перехода есть: `tariff-transition.service.ts`, `TariffChangeLog`, `TariffChangeProof` {admin, promo}; UI/GET списка нет | код | замер ствола `5a130b82` (вписан в sources[0].claim) | 2026-09-04 |
| `syncMembraneContext` только `pair.service.ts:79` — квота до узлов после self не доезжает без доталкивания | код | тот же замер `5a130b82` | 2026-09-04 |
| Подкрепления дня: node-duty-ready + merge-queue-red-verdict (#2266/#2256) | сессия | sources[0].claim (пакет выбора владельца 04.09) | 2026-09-04 |
| Горизонт #592 / веха `secret-parser-built` (резак + манифест ротации) — phase approaching | план | `docs/STRATEGY_DAY.md` / `day-horizon.json` генератор #592 | 2026-09-04 |
| Стендап ставит фокусом гейт `secret-parser-built` | план | `docs/DAILY_STANDUP.md` (ритуал; **не** owner-choice магистрали) | 2026-09-04 |
| DAY_PLAN top-3: angelina-hostess-impl / assets-container / batch-collection-run-contour; «магистраль НЕ назначена планом» | план | `docs/DAY_PLAN.md` — кандидаты до слова владельца | 2026-09-04 |
| **Расхождение:** стендап/горизонт = secret-parser; план = иные L-кандидаты; **sources[0] = tariff-self-select.** Магистраль взята из assertions владельца 04.09; синтез из стендапа/DAY_PLAN запрещён | сессия | канон У1 + probe: owner-source задан → claim sources[0]; гейт `morning-gates-state` magistral на сегодня во входах ритуала не передан как более свежий override | 2026-09-04 |
| L-кандидаты angelina-hostess / assets-container / batch-collection — без нового слова владельца сегодня | план | DAY_PLAN + стендап «сознательно не делаем» | 2026-09-04 |
| Не DSP «Этап 1.A» / benchmark harmonic+cepstral+flux | код | `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6; `detection-planning-priorities.mjs` | 2026-06-14 / канон эпика #84 |
| Вчерашний owner-choice 03.09 был library-open-api-door — **не** сегодняшняя магистраль | сессия | sources[1] origin magistral-03-09 | 2026-09-03 |

**Голоса по различным первоисточникам:** (1) owner-choice 04.09 + замер `5a130b82` в той же чеканке — **1 источник** на назначение `tariff-self-select`; (2) горизонт #592 / standup / STRATEGY_DAY про `secret-parser-built` — **1 источник** (генератор вехи), отражён в стендапе и акцентах плана; (3) DAY_PLAN top-3 без назначения — отдельный снимок кандидатов, **не** выбор. Итог: независимый owner-голос 04.09 весит больше отражений горизонта/ритуала про secret-parser (прецедент 16.07: не согласный независимый факт > N отражений одного снимка). **1 источник владельца на магистраль, 0 синтеза.**

## Посылки

| Посылка | Маркер | Вердикт |
|---------|--------|---------|
| Основания смены тарифа — только admin/promo; `self` в proof/enum ещё нет как рабочего третьего пути | `symbol:TariffChangeProof` (ожидаемо без `self` либо self не проводён в сервис/ручку) | unknown — проверить по стволу до кодирования; при `self` уже в enum+POST — **ПОСЫЛКА НАРУШЕНА**, день = приёмка/UI/sync, не «изобретать домен» |
| Наружу нет `GET /v1/tariffs` списка тарифов для выбора | `symbol`/`route`: GET tariffs в cabinet/open API | unknown — замер claim: «списка тарифов наружу нет»; сверить grep маршрутов |
| Нет UI выбора тарифа на странице мембраны | UI-маршрут/компонент membrane tariff select | unknown — claim: «UI выбора нет» |
| `syncMembraneContext` не вызывается из пути смены тарифа (только pair) | `symbol:syncMembraneContext` | holds по замеру sources[0] (`pair.service.ts:79`) — работа «дотолкать квоту» **назначена** |

Развилка A/B «строить vs только принять»: если маркеры self+GET+POST уже violated цепочкой соседа — не дублировать домен, сузить DoD до UI+sync и закрытия #2281. Выдуманных «работы нет» без маркера нет; issue open ≠ работа не сделана.

## Сегодня делаем

1. Зафиксировать в коде третье основание `self` (`TariffChangeProof` + миграция/схема журнала) без включения оплаты.
2. `GET /v1/tariffs` — список тарифов, доступных мембране к выбору (контракт полей минимальный, без квотных M4-эпиков).
3. `POST /v1/membranes/me/tariff { toTariffId }` через существующий `tariff-transition.service.ts`: те же отказы/журнал/анти-parallel, proof=`self`.
4. UI на странице мембраны: выбор другого тарифа → вызов POST; без экрана оплаты/промо (заглушка/одно будущие ворота).
5. После успешного self-перехода — дотолкнуть `syncMembraneContext` (или эквивалент) до всех узлов мембраны; явный счёт/лог обновлённых узлов.
6. Подкрепление: прогнать скрипт/чеклист **node-duty-ready** (три «да») либо зафиксировать блокер ключа/Студии на узле одной записью.
7. Подкрепление: **одна** запись merge-queue-red-verdict по `#2266`/`#2256` (помеха vs pre-existing).

## Definition of Done (фокус)

- [ ] `TariffChangeProof` (или эквивалент) содержит `self`; миграция применена/описана
- [ ] `GET /v1/tariffs` отвечает списком на стволе/ветке задачи
- [ ] `POST /v1/membranes/me/tariff` меняет тариф с proof=`self`, пишет `TariffChangeLog`, не обходит защиту от параллельной смены
- [ ] Отказы пере использованы (те же классы, что admin/promo-пути), без новых «молчаливых» 500
- [ ] На странице мембраны пользователь выбирает тариф и видит результат перехода (успех/отказ)
- [ ] После self-перехода контекст/квота дотолканы до узлов мембраны **или** задокументирован явный пробел с issue-follow-up (не молчание)
- [ ] Ворота оплаты/промокода **не** размазаны: нет новых платёжных ручек «на сегодня»; точка расширения одна/намечена
- [ ] #2281: комментарий/статус отражает фактический DoD (Closes только если scope issue покрыт)

## Сознательно не делаем сегодня

- L-кандидаты `angelina-hostess-impl` / `assets-container` / `batch-collection-run-contour` — без нового слова владельца (DAY_PLAN)
- Полный спринт гейта `secret-parser-built` / амнистия архива как **primary** (горизонт #592 — перспективно/экспериментально; assertions владельца 04.09 важнее ритуального фокуса стендапа)
- Merge/выкатка `#2271` и разворот oversized `#2267`/`#2268`/`#2270` целиком
- DSP «Этап 1.A», benchmark harmonic+cepstral+flux, stage-gate free-v1, `detector-scoreboard` как канон дня
- `archive-quota-direction` как код-спринт; M4-квоты Open API
- Полный рефактор media-library в том же diff, что tariff-self-select
- Ворота оплаты и промокод-флоу (слово владельца: впоследствии)
- Вчерашняя магистраль `library-open-api-door` как primary (sources[1], 03.09)

## Вторично (если останется время)

1. Синтетический прогон secret-scan detector vs cutter (фикстура) — задел на `secret-parser-built`.
2. Точечный review-pass одного шва `#2271` (blob/no-store) без мерджа.

## Зависимости и риски

- **Риск расхождения ритуала:** стендап/горизонт тянут `secret-parser-built` — не подменять owner-magistral; иначе probe-класс 18.07 (фантом против слова владельца).
- **Блокер media:** без доталкивания `syncMembraneContext` self-select на кабинете «зелёный», а узлы живут старой квотой — ложный успех дежурства.
- **Ключ узла / node-duty-ready:** истечение ключа 03.09 — живое дежурство может не подтвердить старший тариф на железе даже при готовом API.
- **Красные CI `#2266`/`#2256`:** без вердикта merge-queue self-select PR может упереться в чужой red.

## Ссылки

- `docs/DAILY_STANDUP.md` — стендап 2026-09-04 (ритуальный фокус secret-parser ≠ owner magistral)
- `docs/tasks/main-day-assertions.json` — `sources[0].claim` tariff-self-select (#2281)
- `docs/STRATEGY_DAY.md` — веха `secret-parser-built` (горизонт #592)
- `docs/DAY_PLAN.md` — top-3 без назначения; подкрепления secret-cutter / rotation-manifest
- GitHub Issue #2281 — tariff-self-select
- Замер/домен: `tariff-transition.service.ts`, `TariffChangeLog`, `TariffChangeProof`
- Кристаллы: `session-backup-requires-secret-redaction`, `secret-parser-cuts-aggressively`, `credential-rotation-biweekly` (не primary)