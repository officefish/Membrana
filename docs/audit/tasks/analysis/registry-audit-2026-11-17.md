# Ревизия реестра задач — 2026-11-17

> Шаг 0.7 стратегии [`RETURN_STRATEGY_2026-11.md`](../../../strategy/RETURN_STRATEGY_2026-11.md) (хвост Х6).
> Скилл `membrana-tasks-audit`, канон [`REGISTRY_AUDIT_PROMPT.md`](../../../prompts/REGISTRY_AUDIT_PROMPT.md).
> Парный файл по Issue: [`issues-triage-2026-11-17.md`](../issues-triage-2026-11-17.md).

## Числа

| | До | После |
|---|---|---|
| active-карточек | 121 | **85** |
| архивировано (со свидетельством) | — | **36** |
| предложено закрыть владельцу (без свидетельства исполнения) | — | **27** |
| спорные / зонтики — решение владельца | — | **33** |
| живые (NOT_DONE с живым остатком) | — | **24** |
| не разбиралась (спринт уборщика, по поручению) | — | 1 (`archive-gc-journal-2588`) |

`yarn tasks:audit` до: active 121, механических кандидатов 0 (закрытых одиночных Issue среди карточек нет — каждая карточка разобрана по существу).
После: active 85, кандидатов 0 — счётчик упал ровно на число архиваций.

## Метод

- `yarn tasks:audit` (L1) дал ноль механических кандидатов, поэтому L3 по каждой из 120 карточек.
- Пять read-only аудиторов по 24 карточки: промпт карточки (приёмка), Issue (state/comments), `git log origin/main --grep`, наличие файлов, `gh pr list --state merged`.
- Перепроверка оркестратором до архивации: для всех DONE — каждый названный sha через `git merge-base --is-ancestor <sha> origin/main`, каждый названный путь через `git cat-file -e origin/main:<path>`; состояние MERGED у опорных PR через `gh pr view`. Расхождений нет (два ложных срабатывания проверки: `c4cfbf06` — id записи, не коммит; путь-шаблон `m0..m4`).
- `morning-report-completion` аудитор дал DONE с оговоркой — по правилу «сомнительное не архивировать» перенесена в спорные.
- Дети раньше эпиков: `procedure-run-journal-f1-local-trail` раньше `procedure-run-journal-2026-08-01`; у `procedural-layer-impl` и `frame-rails-2307` все дети уже были в архиве.

## Архивировано (36)

| Карточка | Свидетельство (archiveNotes) |
|---|---|
| `procedure-run-journal-f1-local-trail` | Исполнено: PR #1598 (sha 776e4d05) — локальная лента прогонов процедур: scripts/lib/procedure-run-journal.mjs, CLI yarn procedure-run:journal, тесты и docs/procedure-runs/README.md; F1_REPORT.md: code pass и честный review-sprint gate pass. |
| `trace-freeze-e-adr-gate-pr` | Исполнено: PR #2508 (sha 5b4ce120) — ADR-0030 различает исключение/кандидата/доказательство для sendSync и отрисовки библиотеки, sprint:gate 5/5 honest_pair, ревью LGTM и review/teamlead опубликован; файлы docs/local-sprint/trace-freeze-dual-candidate-sprint/CLOSURE.md, GATE_REPORT.md в main. |
| `cowork-library-open-api` | Исполнено: PR #2267 (sha 99ea5fdd) — три блока коворка (ось владения, форма контракта, срок ключа) и PR #2276 (sha 90cca905) — дверь /v1/open; код в packages/background-media/src/modules/library-ownership, track-keys и packages/services/media-library/src/open-api в main. |
| `procedure-run-journal-2026-08-01` | Исполнено: PR #1598 (sha 776e4d05) — журнал прогона процедур (append/check/report, pass без evidence запрещён, leaf hash через run-ledger), F1 прошёл review-sprint; scripts/lib/procedure-run-journal.mjs и docs/procedure-runs/ в main, лента живая. |
| `frame-rails-2307` | Исполнено: PR #1042 (sha cbaefcdc) и PR #1045 (sha e53a0db1) — три базовые процедуры на фрейм-рельсах, procedures:workshop рендерит цепочку; все 12 дочерних карточек архивированы; docs/procedures/*/MANIFEST.json в main. |
| `tooling-atlas` | Исполнено: PR #973 (sha bbb1c2af) — атлас контейнеров (агрегатор + мастерская tooling:atlas audit/decompose/inspect/render/check); docs/tooling-atlas/ и scripts/lib/tooling-atlas.mjs в main. |
| `angelina-hostess-impl` | Исполнено: PR #756/#765/#769 и спринт #2088–#2091, остатки аудита (25/33 → закрыты M1/M4/M5) влиты PR #2543 (sha f9e9ad64) с зелёным гейтом; docs/local-sprint/angelina-hostess-impl/AUDIT.md в main. |
| `ritual-a-angelina-coordinator` | Исполнено: PR #716 (sha eba5ebb1) — чистое ядро координатора каскада (orchestrateCascade + стражи свежести/провенанса) и адаптер; scripts/lib/angelina-cascade.mjs в main. |
| `strategy-day-generator` | Исполнено: PR #596 (sha afd463bb) — генератор стратегии дня S1–S7 (горизонт-веха, один читатель, ночной контур, граф правды) и S5 коммитом 2e479f2f; scripts/lib/strategy-horizon.mjs в main. Issue #592 ещё OPEN — закрыть вместе с архивом. |
| `grp1-route-bridge-sections` | Исполнено: PR #541 (sha abb2f9cc) — маршрут-мост гейтнутых разделов панели, реестр секций, контракт-тест подписи×гранта, ADR-0010 ACCEPTED; panel-bridge-sections.ts и docs/adr/ADR-0010-panel-route-bridge-gated-sections.md в main. |
| `trace-freeze-d-probe-truth-tooth` | Исполнено: PR #2508 (sha 5b4ce120) — зуб прибора трейса импортирует подлинный scenarioTraceBuffer (7/7 переносимый, 5/5 поведенческий) и подключён к CI, NaN в чтении потолка закрыт; файлы scripts/scenario-trace-buffer-parity.test.mjs и docs/local-sprint/trace-freeze-dual-candidate-sprint/CLOSURE.md… |
| `meeting-evening-review-predicate` | Исполнено: PR #1591 (sha 36a4d606) — заседание evening-review-predicate пройдено до стока, четыре действительных вердикта (M1, M2, M3, M6) сверстаны в эпик; файл docs/meeting/evening-review-predicate/EPIC.md в main. Исполнение вердиктов — карточка evening-chain-review-predicate. |
| `linear-hygiene-dreams-providers-night` | Исполнено: PR #746 (merge 44d703b3) — ночь NB1 (антидубль старта, linearId в реестре) и NB2 (четыре провайдера снов через прокси с classifyOutcome); коммиты 6176c89a и 1b7e2550 в main. |
| `meeting-registry-relocation` | Исполнено: PR #662 (sha da8bd215) — заседание registry-relocation закрыто 19.07, пять фаз M0–M4, вердикты сверстаны в эпик; файл docs/meeting/registry-relocation/EPIC.md в main. |
| `swallow-delivery-idempotency` | Исполнено: PR #664 (sha 85b0d491) — ласточка ведёт клиентский журнал доставок, таймаут даёт «статус неизвестен» (exit 3), повтор без --force блокируется; файл scripts/lib/swallow-delivery-ledger.mjs в main. |
| `rt-5-pr-land` | Исполнено: PR #1231 (sha db86ac64) — yarn task:pr-land сливает PR реестра через локальный git merge origin/main (union-драйвер) и встроен в pr:ship; файл scripts/task-pr-land.mjs в main. |
| `drift-anchor-contour` | Исполнено: DA0–DA5 PR #398–#401, #413, #414, #418, #419; остаток-витрина — PR #455 (sha a35615cc), борд дрейф-якорей в панели по вердикту консилиума 14.07; файл apps/panel/src/components/DriftAnchorsBoard.tsx в main. |
| `trace-freeze-c-library-render` | Исполнено: PR #2508 (sha 5b4ce120) — блок C разобран отдельным вердиктом: полный рендер списка снят #2505 (sha 794930f6, 23 265 → 891 DOM-узлов), последовательный listSamples оставлен долгом загрузки без редизайна; docs/local-sprint/trace-freeze-dual-candidate-sprint/CLOSURE.md в main. |
| `studio-package-av-refusal` | Исполнено: PR #2159 (sha 211480c9) — чистая функция классифицирует отказ electron-builder (leftover / app-running / external-holder), называет файл и даёт fallback на артефакт CI командой gh run download; scripts/lib/studio-package-failure.mjs и scripts/studio-package.test.mjs в main. Класс называе… |
| `server-plugin-foundation` | Исполнено: PR-план вердикта собрания влит — контракты #1965 (sha ee40ba3b), хост #1966, живой mfcc #1975 (приёмка Т3.11, docs/plugins/first-live-run-2026-08-18.md), манифесты остальных пяти #1969 (sha 864581c7); packages/plugin-contracts и packages/plugin-handlers в main. Issue #1961 ещё OPEN — зак… |
| `bridge-room` | Исполнено: PR #941 (sha 72f72997) — комната капитана: чистое ядро scripts/lib/bridge-room.mjs, append-only docs/bridge/DEBTS.md (попугай зачитывает долги при yarn bridge open), неявное закрытие шагом bridge-close вечернего ритуала, жилец docs/procedures/bridge/ в main. Issue #936 ещё OPEN — закрыть… |
| `code-review-lead-refactor` | Исполнено: PR #872 (sha 73f90d89) — каскад назначения ведущего ревью scripts/lib/review-lead.mjs с памятью ведущего, бестиарий docs/bestiary/ и жилец docs/procedures/code-review/ влиты в main одним PR. |
| `ritual-r-report` | Исполнено: PR #729 (sha 37cb7b75) — линза-rephraser с гейтом изоморфизма дерева, защитой фактов, классификацией ссылок alive/dead/unverifiable и предикатом canPublish; scripts/lib/report-lens.mjs и scripts/report-lens.test.mjs в main. |
| `main-day-probe-gate` | Исполнено: PR #532 (sha fdc05d05) — препроцессор-гейт посылок MAIN_DAY_ISSUE: чистое ядро probeAssertion, read-only обвязка с exit 2 при нарушенной посылке, демонстрация на кейсе 16.07, критический шаг ritual:day; scripts/lib/main-day-probe.mjs в main. Issue #533 ещё OPEN — закрыть вместе с архивом. |
| `trace-freeze-b-live-sendsync` | Исполнено: PR #2508 (sha 5b4ce120) — живой замер sendSync в Studio снят: без ответа IPC рендерер висел бесконечно, после явного пустого ответа полный сброс 10 000 строк блокирует 20.5–34.2 мс; файл apps/membrana-studio/src/logging/register-ipc.ts и docs/local-sprint/trace-freeze-dual-candidate-spri… |
| `media-per-device-token` | Исполнено: PR #2031 (sha 28369bf0) — ADR-0028 Р1+Р2: парринг выдаёт per-device media-ключ (NodeKey, audience='client'), отзыв связки отзывает ключ; приёмка на проде PR #2054 (sha 08c97e8a), docs/deploy/deploy-2026-08-21-acceptance.md в main. |
| `precedent-container` | Исполнено: PR #943 (sha 4924c58f) — контейнер прецедентов с таксономией, схемой, единственной точкой записи yarn precedent:register, детерминированным счётчиком рецидива и мастерской; файлы docs/precedents/README.md и scripts/lib/precedent-store.mjs в main. |
| `ritual-s-standup` | Исполнено: PR #727 (sha c4401740) — чистый детерминированный стендап Тимлида: standup/handoff/classifyAssignment с тремя состояниями пункта и сигналом emptyPlan; файлы scripts/lib/standup-plan.mjs и scripts/standup-plan.test.mjs в main. |
| `ally-swallow-editorial-gate` | Исполнено: PR #637 (sha d03b4724) — автоотправка ласточки из ритуала снята, отправка руками через линзу Ожегова с гейтом одобрения scripts/evening-gate.mjs partner-swallow; PR #1382 (sha 2cdefdda) — извлечение памяти персон едет только после sent=true в scripts/telegram-swallow.mjs. Все три требова… |
| `trace-freeze-a-cut` | Исполнено: PR #2508 (sha 5b4ce120) — нарезка спринта фризов с прогнозами до исполнения, три редакции ратифицированы владельцем; docs/local-sprint/trace-freeze-dual-candidate-sprint/OPEN.md и docs/sprint/cut/trace-freeze-dual-candidate-sprint.json в main. |
| `capture-sidecar-protocol` | Исполнено: PR #1993 (sha c6293d6d) и PR #1997 (sha d26e8e09) — спутник записи пишется в field:capture, глагол capture:sidecar --check с именованными отказами, порядок съёмки docs/capture/CAPTURE_PROTOCOL.md; живая приёмка docs/local-sprint/capture-sidecar-protocol/LIVE_ACCEPTANCE.md, gate 4/4. |
| `procedural-workshop` | Исполнено: PR #940 (sha 6676e922) — процедурная мастерская с тремя глаголами audit/decompose/inspect над docs/procedures, дыра T10 закрыта; scripts/procedural-workshop.mjs в main. |
| `procedural-layer-impl` | Исполнено: все фазы Р1–Р5 (#782–#786) архивированы, последние — коммит 5fdaf6e8 (#876); процедурный слой docs/procedures с validateProcedure и layer-rules.json в main. |
| `ritual-k-karkas` | Исполнено: PR #718 (sha e76fa979) — 5-блочный каркас плана дня: frame() и детерминированный buildTop3 со стенкой Slot→Text; scripts/lib/day-plan-frame.mjs и scripts/day-plan-frame.test.mjs в main. |
| `night-build-format-v2` | Исполнено: PR #683 (sha 84ff0042) — формат Night Build v2: два жанра ночи в регламенте и каскад yarn night:land-reports (scripts/night-land-reports.mjs) в main. |
| `product-landing` | Исполнено: PR #561 (sha e114d197) и PR #2398 (sha b5a6a147) — лендинг membrana.space с описанием, входом в кабинет и загрузкой установщика Studio; deploy/root-site/index.html в main, страница живая. |

## Предлагаю закрыть (27) — слово владельца

Свидетельства исполнения нет; карточки потеряли смысл (направление снято или перекрыто практикой) либо стоят 3–4 месяца без движения.
Архивировать — только как «ОТМЕНЕНО, не сделано: причина + условие переоткрытия». Группы:

- **partner-tutorials (эпик + PT0–PT3)** — не запускался с 06.07; партнёрская речь идёт через ласточку с линзой Ожегова.
- **meeting-format (эпик + mf1, mf2, mf5–mf7, mf9, mf10)** — заседание стоит на M0 с 17.07, формат применяется де-факто (десятки заседаний, `meeting:audit`/`meeting:status`). Частично решённые mf3/mf4/mf8 — в спорных.
- **static-mmbrn (эпик + 9 фаз)** — стоит с 14.08; переключение и прод-мутации запрещены ратификацией владельца 08.08; M4/M6 NO-GO.
- **Прочее** — см. таблицу.

| Карточка | Issue | Вердикт аудитора | Причина |
|---|---|---|---|
| `static-mmbrn-cutover` | — | NOT_DONE | Не начато: зависит от #1303-B, #1305-C и M6 alignment, которые тоже active. Работа стоит с 14.08 — владельцу стоит решить, жив ли переезд strategy→static. |
| `static-mmbrn-disposition-ledger` | — | NOT_DONE | Ledger (append API, reducer, закрытый словарь переходов) не построен. Стоит с 14.08 вместе со всем эпиком static-mmbrn. |
| `mf7-active-guard` | — | NOT_DONE | Вопрос не решён консилиумом. Практика решила его де-факто (в docs/meeting/ ~40 контейнеров заседаний), а фундамент mf1 тоже не решён — кандидат на снятие всего слоя meeting-format словом владельца. |
| `mf2-branch-count` | — | NOT_DONE | Как mf7: не решено, эпик стоит с 17.07, заседания проводятся без вердикта — кандидат на снятие владельцем вместе с эпиком meeting-format. |
| `pt-0-tutorial-template` | — | NOT_DONE | Шаблон не создан; весь спринт partner-tutorials (PT0–PT3) стоит с 06.07 — кандидат на снятие словом владельца, если направление больше не нужно. |
| `static-mmbrn-m6-alignment` | — | NOT_DONE | Живой остаток: отчёт сверки registry/FD-1/ledger; предпосылки (disposition-ledger, rehydrate-parity) active. Направление стоит с 14.08 — стоит спросить владельца, жив ли переезд Affine (OBSOLETE только его словом). |
| `static-mmbrn-container` | — | UMBRELLA | 4 из 12 детей в архиве; M4 NO-GO (office VDS не проходит по ёмкости), M5 NOT PERFORMED, M6 NO-GO, cutover NO-GO — по самому EPIC. Не DONE. С 14.08 движения нет — вопрос владельцу о судьбе направления. |
| `mf6-auditor-worktree` | — | NOT_DONE | Вопрос консилиумом не решён (DoD эпика требует вердикт на каждую фазу). Практика read-only аудиторов, читающих ref, де-факто есть, решения — нет. Стоит с 17.07 — владельцу: решить или снять вместе с эпиком meeting-format. |
| `mf1-format-carrier` | — | OBSOLETE | Вопрос «5-й регламент или секция в membrana-consilium» фактически решён в пользу 5-го регламента, но без вердикта консилиума, то есть свидетельства исполнения по DoD нет. Предложение владельцу: снять как перекрытое практикой (или провести ратификационный конс… |
| `db3h-s4-microphone-detectors` | — | OBSOLETE | Отложена бессрочно с 26.06; фокус ушёл в server-first, позже в плагинную основу (эксперименты — плагины модуля «Микрофон»). Свидетельства исполнения нет — архивировать только словом владельца как снятую. |
| `pt-1-read-facts-sheet` | — | NOT_DONE | Туториал PT1 не написан; зависит от PT0 (шаблон, тоже не сделан). Движения нет с 06.07 — вопрос владельцу: снять спринт partner-tutorials или назначить. |
| `static-mmbrn-rehydrate-parity` | — | NOT_DONE | Что осталось: раннеры Affine export/rehydrate и parity, пакет вещдоков M5 G1–G10, совпадение portable annotations. Работу держат предшественники по DAG: target provision и M4 storage readiness, обе карточки active. |
| `meeting-team-execution-contour` | — | OBSOLETE | Промпт так и не заполнен, заседания не было, свидетельств исполнения нет. Предмет («контур 2 — исполнение») закрыл коворк cowork-execution-registry (#675). Архивировать только по слову владельца. |
| `mf10-teeth-sm5` | — | NOT_DONE | Вопрос «возможна ли независимость аудитора-субагента» вердикта не получил. С 09.2026 заседания фактически идут с отдельным аудитором (AUDIT-M* по cabinet-registration-promo), но это практика, а не ответ на S-M5. Фаза эпика meeting-format стоит с 17.07; её сто… |
| `mf5-echo-rule` | — | NOT_DONE | Карточку держит внешнее решение: консилиум по графу правды не проводился, свидетельств исполнения нет. Стоит 4 месяца — кандидат в OBSOLETE на усмотрение владельца. |
| `meeting-format` | — | UMBRELLA | DoD эпика не выполнен: ни одна фаза mf1–mf10 не архивирована, фундаментальная mf1 не решена, регламент не переведён в канон консилиумом, поле ratification порядка не заполнено. Последняя правка docs/meeting/meeting-format — 30.07. При этом формат активно прим… |
| `real-dataset-live-calibration` | #47 | OBSOLETE | План «недели» от 14.06 стоит 5 месяцев: W2, W4 и W5 не исполнены, а направление ушло другими путями — бенчмарк и витрина детекторов (detector-scoreboard), паритет журнала client↔cabinet (TJ6, #79), калибраторы порогов (#1562). Закрытый #47 свидетельством не с… |
| `sca-manual-smoke` | — | NOT_DONE | Ручной smoke paired Studio (capture, TTL, LWW, fade на слух, VDR-плагин) не проводился, отсрочка просрочена на 4 месяца. Нужен оператор с оборудованием либо явное решение владельца снять задачу. |
| `pt-2-first-output-v01-endtoend` | — | NOT_DONE | Сквозной туториал первого выхода v0.1 не написан. По порядку PT2 зависит от PT0 и PT1, которые тоже не делались. Стоит с 06.07 — кандидат в OBSOLETE на усмотрение владельца. |
| `static-mmbrn-retirement` | — | NOT_DONE | Живой остаток: метрики и чек-лист retirement (90d redirect, 30d нулевой трафик, свежий restore/parity, хранение >=365d) не построены. Предусловие — стабильный cutover — не наступило: cutover NO-GO, соседние фазы target-provision/m6/rehydrate/cutover active; н… |
| `static-mmbrn-ingress-auth` | — | NOT_DONE | Живой остаток: proxy policies и route tests static ingress + Panel forward-auth (один action/object, fail-closed, WS/native bypass DENY) не построены; блокировано непредоставленным target (provision active, M4 NO-GO). |
| `team-accountability-metrics` | — | OBSOLETE | Задача так и не стала заданием (скелет с плагейсхолдерами, 4 месяца без движения). Измерение ответственности исполнителей де-факто ушло в механизм честного спринта: sprint:gate (honest_pair/plan_lied) и sprint:experience (точность прогноза нарезки), заседание… |
| `mf9-auditor-readonly` | — | OBSOLETE | Вопрос заседания meeting-format, которое остановилось на M0 четыре месяца назад; корневой вопрос mf1 не решён, формат Заседания тем временем используется де-факто (meeting:audit, meeting:status, десятки заседаний). Свидетельства исполнения нет. Предложение вл… |
| `pt-3-honest-tech-storytelling` | — | NOT_DONE | Спринт partner-tutorials не запускался; PT3 по регламенту выпускается только после LGTM PT1 и PT2. 4,5 месяца без движения — владельцу стоит решить, жив ли спринт (партнёрская речь сейчас идёт через ласточку с линзой Ожегова). |
| `static-mmbrn-live-services` | — | NOT_DONE | Сервис static.mmbrn.tech не поднят — документировать в LIVE_SERVICES нечего; фаза ждёт cutover, а cutover запрещён ратификацией владельца 08.08 («production mutation и cutover не разрешены»). Живой остаток при снятии запрета; иначе — предложение владельцу сня… |
| `static-mmbrn-target-provision` | — | NOT_DONE | Выделенный target не выделен, receipt отсутствует. Блок тот же, что у всего эпика static-mmbrn-container (запрет cutover/прод-мутаций). |
| `partner-tutorials` | — | NOT_DONE | Спринт не запускался с 06.07. Владельцу можно предложить снять как OBSOLETE, если направление больше не нужно. |

## Спорные и зонтики (33) — решение владельца

| Карточка | Issue | Вердикт аудитора | Что мешает вердикту |
|---|---|---|---|
| `office-stability-emergency` | #933 | UNCLEAR | Не найдено ни диагностики корня таймаутов, ни замера «0 таймаутов за сутки»/SLA, ни алерта владельцу по health; CLAUDE.md по-прежнему предписывает «повторить» при таймауте office. Частичные следы есть, приёмки нет. Владельцу: закрыть как перекрытое (монитор с… |
| `angelina-orchestrator-prompt` | — | UNCLEAR | Ресёрч сделан, но целевой артефакт (промпт агента-оркестратора) не написан; роль Ангелины с тех пор оформлена иначе (kits/angelina-morning, kits/angelina-bridge, хозяйка утра). Владельцу: принять ресёрч как исход (DONE по da8bd215) или снять как перекрытое ки… |
| `device-board-three-hosts-2026-06-26` | — | UMBRELLA | Не DONE: дочерняя db3h-s4-microphone-detectors (рефакторинг микрофона + аудит детекторов) active; её исполнение в этом шарде не проверялось. |
| `node-duty-ready-predicate` | #2049 | UNCLEAR | Кодовая часть DoD выполнена (три предиката, fail-closed, зуб на фикстурах). Приёмка «на Firebat три «да» до 28.08» — руки владельца; в стволе вещдока прогона на узле нет, коммиты сами называют: «Не сделано и названо: три «да» node-duty-ready — только на узле»… |
| `logging-observability-contour` | #2117 | UMBRELLA | 4 из 5 кусков в архиве; кусок E (контейнер Сентри на офисе) не поднят — DoD E (контейнер, запись INC в картотеке, группировка, замер мощностей) не засвидетельствован. Эпик по собственному правилу закрывается последним — не DONE. |
| `firebat-node-device` | #1998 | UNCLEAR | Почти все пункты DoD закрыты (GAIN дописан в спутник 21.08, хотя акт приёмки об этом не обновлён). Не засвидетельствован один пункт: «после перезагрузки узел сам поднимает канал без экрана и рук» — в акте «⏳ владелец» (автовход netplwiz + перезагрузка); это т… |
| `llm-procedure-channels` | #1007 | UMBRELLA | Дети по свидетельству DONE — эпик близок к DONE. Не засвидетельствован пункт 5 DoD эпика: живой сценарий «Anthropic недоступен → цепочка с openrouter → ревью завершается → событие на панели» — вещдока такого прогона в стволе не нашёл. Есть вещдок или слово вл… |
| `swallow-format-frame-fix` | #918 | UNCLEAR | DoD #918 (полноформатное зеркало, многострочные блоки, тесты на эталон 20.07, ревью ozhegov) не исполнен — промпт запрещал исполнение без слова владельца. Но после 22.07 владелец утвердил другой формат («Метка: 🎯 …» одной строкой, #1427), а вечерняя ласточка… |
| `research-query-hygiene` | — | UNCLEAR | Частично: корень (1) снят, остаток (2)/(3)/обязательное подтверждение не сделан. Либо доделать, либо владелец сужает карточку до (1) и архивирует с PR #518. |
| `ritual-trust-contour` | #539 | UMBRELLA | 5 фаз (rt-1, rt-2, rt-3, rt-4, rt-7) в этой ревизии без свидетельства — эпик не DONE. Часть могла быть перекрыта поздними работами (ritual-reads-decisions #2530, closing-keyword гейт), но проверять нужно по каждой фазе отдельно. |
| `graphify-research-tree-panel-sections` | — | UMBRELLA | По коду эпик, похоже, исполнен, но дети не архивированы и поштучно не сверены: численные гейты DoD (cold-load ≤ 3 с в GRP3/GRP4, ADR топологии в GRP1) в этой ревизии не проверены. Порядок: проверить и архивировать grp1–grp4 со свидетельством, потом эпик. |
| `studio-capture-adaptation` | — | UMBRELLA | Остался ручной smoke на железе. Studio NSIS впервые собран и поставлен на Firebat 19.08 (faa83063, #2007) — оборудование появилось, но вещдока ручного smoke по сценарию SC в стволе нет. Эпик не DONE, пока sca-manual-smoke не закрыт или не снят владельцем. |
| `chart-list-plugin` | — | UNCLEAR | Владелец принял продукт живьём 04.10 (три критерия, объёмы 20 и 200, playback и waveform). Пункт DoD «паспорт прогона пишется» на проде не проверен: след RunRecord в office не подтверждён из-за #2580 (OPEN). CLOSURE пишет прямо: «карточка остаётся active до о… |
| `frames-alive-rodchenko` | #981 | UNCLEAR | Сделано частично: рендер цепочки и честное пустое состояние есть. Чего нет в рендере: пункта DoD Ф5 «версия — бейдж по статусу (valid/void/invalid)», индикатора done и гранул с madeBy. Похоже, модель гранул спринта frames-alive заменил контракт полос, и тогда… |
| `detector-scoreboard` | — | UMBRELLA | Дети: 2 DONE (Ф1, Ф2), 4 активны (Ф3 — данные, Ф4 — лестница нейросети, Ф5 — публикация на панели, dads-benchmark-bridge). DoD эпика (нейросеть на четырёх наборах, публикация на панели) не выполнен. После 06.08 коммитов по Ф3–Ф5 нет. |
| `grp4-graphify-gated` | — | UNCLEAR | #529 закрыт, вендоринг сделан, грант-гейт существует. Но два из трёх условий фазы не подтверждены вещдоком: cold-load не больше 3 с и то, что сборка не тянет исходники graphify в граф apps/panel. Замера не нашёл. Соседние grp1–grp3 и сам эпик тоже active, хот… |
| `neural-free-tier-dataset-report` | — | UNCLEAR | Чёткого критерия приёмки нет. Сценарий «набор → детектор → отчёт» частично закрыт серверным прогоном детектора по коллекции (#2520). Нейродетектор и узел воспроизведения библиотечного трека в device-board не подтверждены (находка ревизии 09.08). Владельцу реш… |
| `session-digest-library-face` | #2039 | UNCLEAR | Лицо в обоих домах построено, но иным путём, чем в промпте: манифеста-витрины membrana.showcase.session-digest на доме collections в стволе нет (git grep пусто), панель зовёт отчёт напрямую; порча «чужой mountTarget → регистрация отвергнута» не встречена. При… |
| `mfcc-compare-sprint` | — | UNCLEAR | Три блока исполнены и цифры получены (MFCC AUC 0.94 [0.85;1.0], гармоника ~0.5), но сам RUN-документ говорит, что прогон считан подставкой (reference-melbank-dct), а не ядром блока 1 и не meyda; сравнение путей — undecided_corpus_bias. Позднейший документ 20.… |
| `frames-alive-dynin` | #980 | UNCLEAR | Спринт за 4 месяца не стартовал (его условие — DeepSeek вместо Anthropic до 01.08 — снято); Ф4/Ф7 частично перекрыты ранними PR #953/#955, Ф2 (предикаты P4–P7, done) и подпись процедуры (7.4) не построены; роли фрейма переопределены ADR-0025. Кандидат на OBSO… |
| `morning-report-completion` | #788 | DONE с оговоркой → спорная | Ф1–Ф3 влиты (PR #809, боевая приёмка #917), DAY_REPORT выпускался ежедневно до 04.10; формальной подписи владельца о боевой приёмке (последний комментарий #788) нет. |
| `morning-ritual-regulation` | #605 | UNCLEAR | Эпик (детей-карточек нет). Ядро исполнено; остаток по notes — Ф5 оркестратор ritual:day на барьере (слово владельца) и Ф6 витрина-UI в apps/ — не сделан в заявленной форме. ritual:day перестроен иначе (#2171, #2197), а утренние гейты держит скилл membrana-mor… |
| `mf4-teeth-sm2` | — | UNCLEAR | Частично отвечено кодом: наличие секции вердикта меряется, семантика — нет. Вердикта консилиума по вопросу (как требует DoD эпика) нет, регламент противоречит коду. Решить вместе с mf1: принять hasVerdictSection как ответ и архивировать или достроить. |
| `rt-3-closure-integrity` | — | UNCLEAR | Стаб эпика #539 («заполнить до кода»), промпт так и не доопределён. Частично перекрыт средствами pr:ship и task-гейтами, но заявленные ядро ложного закрытия и автосверка не построены, живой демонстрации на #415/#515 нет. Нужно решение: досверить остаток и пос… |
| `grp3-research-tree-gated` | — | UNCLEAR | Ядро фазы влито (мост, грант, офлайн-снапшот, сменный presentation-порт). Не подтверждены два пункта приёмки: в ResearchTreeBoard нет skeleton/aria-busy, замера cold-load <= 3 с в стволе не нашёл. Скорее всего архивируемо с оговоркой после проверки владельцем… |
| `membrane-node-runtime-remote` | — | UMBRELLA | Эпик не закрывается: ребёнок RT7 (обязательный prod-smoke по 9-пунктовому чек-листу) не прогнан — промпт прямо требует его до архива. Если направление WS-runtime кабинета снято переходом на узел-устройство (ADR-0027), это решение владельца, не аудита. |
| `vdr-hard-gate` | #47 | UMBRELLA | Численный гейт приёмки trends F1 >= 85% не измерен: разметки пилота нет (33 из 33 unlabeled), HG3/HG4 не исполнены. Привязанная Issue #47 — чужая (закрыта 11.06 «Single-Node Detection First», за 22 дня до заведения карточки) и свидетельством быть не может. |
| `dedup-pairs-show-and-wait` | #2109 | UNCLEAR | Кодовая часть DoD (ядро, витрина в обоих близнецах, удаление только по клику, порчи) влита тремя PR. Не найдено свидетельства пункта «приёмка владельца при разборе буфера»; Issue #2109 открыт. Склоняется к DONE — нужно слово владельца о приёмке. |
| `generated-docs-quality-criteria` | — | UNCLEAR | Ресёрч-выжимка в main есть, но критериев качества как решения/артефакта нет, а промпт не заполнен — проверять нечего. Предложение владельцу: либо принять выжимку как исполнение S-ресёрча, либо снять как OBSOLETE. |
| `mf8-sprint-kind` | — | UNCLEAR | Вопрос «нужен ли sprintKind: meeting» де-факто решён реализацией (#1596), но DoD эпика meeting-format требует вердикт консилиума на каждую фазу, а корневой mf1 не решён. Предложение: архив по слову владельца со ссылкой на #1596. |
| `mf3-commands-vs-flag` | — | UNCLEAR | Частично снято жизнью (audit/status — команды, open/next — нет), формального вердикта нет; Teamlead помечал кандидатом на слияние с mf1, который не решён. |
| `grp2-grants-owner-matrix` | — | UNCLEAR | Грантовая часть фактически есть, но отдельного PR GRP2 нет; не подтверждены owner-матрица с новыми разделами, чеканка промокодов с этими грантами и empty-state «грантов ноль». |
| `detection-alarm-loop-refactor` | — | UNCLEAR | A, B, D влиты; PR фазы C (pure-варианты GetMicrophone/GetAudioStream) не найден, и в узлах не подтверждён. Нужна проверка фазы C — если она поглощена/снята, карточку можно архивировать. |

## Живые (24)

| Карточка | Issue | Вердикт аудитора | Живой остаток |
|---|---|---|---|
| `obs-sentry-container` | #2122 | NOT_DONE | Контейнер Sentry не поднят: ждёт апгрейда офиса по CPU/памяти (2→4 vCPU, 3,8→16 GiB, «не раньше 10.09»); DoD (запись по INC, группировка, сбой пульса в картотеке) не выполнен. Диск закрыт уборкой. |
| `plugin-results-payload-pocket` | #1982 | NOT_DONE | Решение владельца словаря (карман payload vs расширение в корне) не принято; passthrough остаётся временной формой со ссылкой на #1982. |
| `scoreboard-panel-publish` | — | NOT_DONE | Ф5 не начата — ждёт слова владельца и деплоя; Ф3/Ф4 эпика (dataset/neural ladder) тоже active. |
| `rt-7-priorities-from-registry` | — | NOT_DONE | Генерации этапа магистрали из реестра/форсайта нет; живой остаток — заменить хардкод-снимок. Частично смягчено: магистраль теперь берётся из выбора владельца (main-day-assertions/гейт). |
| `rt-1-manifest-generator` | — | NOT_DONE | Генератор MAIN_DAY_ISSUE манифест посылок сам не выдаёт; контур main-day-probe замыкается только ручной чеканкой. |
| `root-domain-scenarios-docs` | — | NOT_DONE | Остаток заблокирован действием владельца: base path /scenarios/docs в дашборде Mintlify, затем включить proxy-блок и проверить вживую. githubIssue=0 — Issue не заведён. |
| `vdr-hg4-hard-gate-report` | #47 | NOT_DONE | Разметка пилота не сделана → отчёта hard-gate и решения по критерию F1≥85% нет. Issue #47 закрыт в июне по другому предмету (stage-gate 1→2) — привязка githubIssue неверна. |
| `assets-container` | #959 | NOT_DONE | По решению владельца 23.08 эпик ждёт готовности originals R7 (static.mmbrn), а R7/cutover в static EPIC остаётся NO-GO. Живой остаток — весь доменный слой, он заблокирован. Если владелец снимет static-направление — карточка станет OBSOLETE (только его словом). |
| `truth-graph-contour` | #576 | NOT_DONE | Четыре требования эпика (архитектура графа, реестр зависимых процессов, охлаждение сессии как обобщение main-day-probe, инструменты редактирования) спринтом не доведены; куски разошлись по соседним работам без сверки с эпиком. Движения нет с конца июля — канд… |
| `frame-holders-reassign-twenty` | #1787 | NOT_DONE | Блок снят (#2201 влит), но сама задача не сделана: у двадцати фреймов нет явного holder и moderator, нет обоснования назначений и ратификации владельца. |
| `evening-chain-review-predicate` | — | NOT_DONE | Что осталось: кусок 3 (новый предикат вечернего ревью по вердикту M1) и кусок 4 (класс ворот качества по вердикту M6) в код не внесены. В EPIC записан блокер: вердикт M6 (а)+(б) в код как есть не нести, нужен блокирующий механизм (consumesFrom или findingExit… |
| `dads-benchmark-bridge` | — | NOT_DONE | По собственным notes карточка подчинена эпику detector-scoreboard и «закроется вместе с Ф3/Ф4». Волну 2 (извлечение DADS, дедуп обеих сторон, манифест) поглотила Ф3, остаток волны 3 (вывод в витрину) — Ф1 и Ф4. Ф3 и Ф4 active. |
| `rt-4-closure-chain` | — | NOT_DONE | Развилка «задокументировать --ref у finalize или закрепить порядок в регламенте» не решена. --ref в коде работает, но нигде не задокументирован: знание живёт только в памяти агента («finalize после squash требует --ref»). Корень промаха promptPath в связке sh… |
| `workflow-examples-marathon` | — | NOT_DONE | Марафон на стадии 1: покрытие 1/13 мастерских и 1/26 процедур; DoD (run + boundary\|failure на каждый объект, Mintlify-срез из валидированного evidence, воспроизведение холодным агентом) не выполнен. |
| `scoreboard-dataset-ladder` | — | NOT_DONE | Живой остаток: скачивание подмножества внешнего массива (~900 МБ), дедуп обеих сторон, манифест с провенансом, четыре набора — не начато. Это вход, названный вердиктом паузы Ф2 (пул дронов >= 60). |
| `detector-metrics-characterization` | #565 | NOT_DONE | Живой остаток: пакет метрик на core, офлайн-отчёт detection-metrics-v1.json с провенансом, EER и bootstrap-CI, карточка паспорта в «Контроле качества» панели. Значительно пересекается с эпиком detector-scoreboard (Ф5 публикация панели) — владельцу стоит решит… |
| `pcb-d2-multinode` | — | NOT_DONE | Отложено как Фаза 3; getPairStatus/authenticateCabinet всё ещё берут один узел, UI списка нет. Требование владельца (несколько устройств) не снято. |
| `insight-mandate-for-new` | — | NOT_DONE | Дефект жив: decide для новых инсайтов упирается в UNKNOWN_SUBJECT; требуемый консилиум-гейт не проведён. |
| `frames-alive-ozhegov` | #979 | NOT_DONE | DoD Issue #979 «две подписи над contentHash» не выполнен (Ф1 contentHash, Ф8 подписи отсутствуют); Issue переоткрыт 26.07 как преждевременно закрытый. Возможно, модель пинов segmentHash перекрыла замысел подписей — это решение владельца, не основание для архи… |
| `scoreboard-neural-ladder` | — | NOT_DONE | Фаза Ф4 эпика detector-scoreboard не начиналась; зависит от незавершённой Ф3. |
| `membrana-device-build-profile` | — | NOT_DONE | Фазы MD1–MD3 не исполнены: нет профиля регистрации, оболочки и упаковки. |
| `rt-2-session-extracts` | #537 | NOT_DONE | Новый вход сессионных экстрактов в persona-memory-extract не построен. Возможное пересечение с архивариусом сессий (#1907) и case-mining — проверить, не перекрыт ли замысел, до решения об OBSOLETE. |
| `mp7b-rt7-prod-hardening` | — | NOT_DONE | Обязательный prod-smoke (кабинет → узел → реальный звук) и runbook не сданы. |
| `vdr-hg3-trends-benchmark` | #47 | NOT_DONE | Финальный benchmark на операторской разметке не проведён. Issue #47 закрыт 11.06 как зонтик дорожной карты — не свидетельство. |

## Попутные находки (чинить отдельно)

1. **Неверная привязка Issue #47**: `vdr-hard-gate`, `vdr-hg3-trends-benchmark`, `vdr-hg4-hard-gate-report`, `real-dataset-live-calibration` ссылаются на #47 «Single-Node Detection First», закрытый 11.06 — до заведения карточек. «Зонтик #47», который ловит `tasks:audit`, — ложная привязка, а не эпик.
2. **Воскресшая карточка**: `swallow-delivery-idempotency` имела архивную карточку от 19.07, но в реестре снова была `active` (перетёрта мерджем). Архивирована повторно; файл архивной карточки оставлен прежним (история 19.07 сохранена).
3. **`githubIssueClosedAt` пусто** у всех 34 active-карточек с Issue (системный дефект, `yarn tasks:sync-issues`).
4. **Архивированы карточки с ОТКРЫТЫМИ Issue** — закрыть через `yarn task:close-github` (решение ведущей): #396, #533, #569, #592, #781, #936, #1961. **#2485 НЕ закрывать**: фаза D исполнена, но сам Issue держит ADR-0030 в статусе DRAFT (ждёт LGTM владельца).
5. **Под-эпик graphify (grp2–grp4) и frames-alive** висят active при влитом коде — нужна поштучная приёмка численных гейтов (cold-load ≤ 3 с), замера в стволе нет.
6. **`CLOSURE.md` спринта trace-freeze-dual-candidate-sprint** требует «PR must remain unmerged», а #2508 влит — расхождение регламента спринта с фактом (фазы A–E архивированы по существу исполнения).

## Что не проверено

- Живьём ничего: прод, узел Firebat, Sentry, Mintlify, панельные гейты, cold-load.
- Тесты и сборки не запускались; вердикты — по коду, истории и документам в стволе `cd352fa5`/`ba1cd0d1`.
- Linear (DRU-*) не открывался; комментарии Issue — последние 2–3.
- Ранние прямые коммиты (precedent-container, ritual-s-standup) — наличие LGTM Тимлида не подтверждено.
