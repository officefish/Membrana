<!--
  archive-role: archive-snapshot
  archive-day: 2026-11-20
  archived-at: 2026-11-20T14:30:20.380Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-11-20T07:09:57.354Z (yarn main-day-issue@f6da38ff) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"f6da38ffd8b63552f07d5fe1add2791e960836e2","digest":"073489de78dcfddc15dd1ebfacb8a6c8f84dce2b19d6aae69e764bc80ea61ef5","versionAt":"2026-11-20T09:55:53+03:00"},"DAILY_STANDUP":{"version":"ed29cf92e1e28737ca8571bb7738ec64547190a3","digest":"60bacc7ab8e3789c6c4ec13adee04121d5c2400d3c51f2966aeb53f737df3408","versionAt":"2026-11-18T14:10:53+03:00"}}} -->
<!-- Звено канала: provider=xai model=grok-4.5 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: archive-gc-journal-2588, node-duty-ready-predicate, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, plugin-results-payload-pocket, firebat-node-device, frame-holders-reassign-twenty, workflow-examples-marathon, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, assets-container, office-stability-emergency, swallow-format-frame-fix, morning-report-completion, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, dads-benchmark-bridge, morning-ritual-regulation, truth-graph-contour, mf8-sprint-kind, mf4-teeth-sm2, mf3-commands-vs-flag, membrana-device-build-profile, rt-7-priorities-from-registry, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, graphify-research-tree-panel-sections, detector-metrics-characterization, root-domain-scenarios-docs, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, pcb-d2-multinode, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-11-20

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `archive-gc-journal-2588` |
| `primaryTitle` | Уборщик холодного архива: g5b, панель g6a–g6d, подготовка приёмки g7 |
| `githubIssue` | #2632 |
| `size` | L (спринт, 18 блоков) |
| `promptPath` | `docs/sprint/cut/archive-gc-journal-2588.json` |
| `сгенерировано` | 2026-11-20 (правка ведущей) |

---

## Магистраль

Магистраль дня — **`archive-gc-journal-2588`**, слово владельца 20.11 «двигаемся вдоль магистрали» (`morning:gate … --author human`; снимок топ-3 её не содержал).

> **Правка ведущей 20.11.** Генератор взял магистраль из `main-day-assertions.json` от 07.10 («понижение тарифа, b5–b7»). Это ложно: понижение выкачено и принято 07–08.10. Ниже — по стволу `cec5096a` и стратегии `docs/strategy/RETURN_STRATEGY_2026-11.md`.

**Состояние (сверено 20.11):** в стволе 12 из 18 блоков (g0, g8a–c, g1a, g1b, g2, g3a, g3b, g4a, g4b, g5a); выкачено в media и office 18.11, уборка выключена. ADR-0032 (граница media ↔ office) принят владельцем 20.11 (#2689).

**Критерий успеха к вечеру:** g5b в стволе (пульс и режим; стык «кто запустил» отдельным PR), g6a в стволе, g6b открыт.

---

## Сегодня делаем

| Сессия | Дерево | Работа |
|---|---|---|
| S1 | `Membrana-sanitation-b` | g5b — пульс и режим по флагам (два PR: план + стык trigger/снимок флагов) |
| S2 | `Membrana-installstate` | g6a — клиент панели; затем g6b — виджеты журнала и пульса |
| S3 | `Membrana-codex-cve` | ADR-0032 — сделано и принято |
| Ведущая | `Membrana-tooling` | модерация, ревью, вливание |

---

## Решения владельца 20.11

- ADR-0032 принят.
- Пробный прогон из панели пишется в журнал всегда, с пометкой `trigger=panel` и снимком флагов; «выключено = тишина» — про расписание (комментарий в #2632).
- Пульс считать только по прогонам по расписанию — #2690.

---

## Сознательно не делаем сегодня

- Боевое включение уборки — только после приёмки g7 и слова владельца.
- Фаза 2 (FREE / качество обнаружения) — после уборщика.

---

## Ссылки

- Стратегия: `docs/strategy/RETURN_STRATEGY_2026-11.md`
- План спринта: `docs/sprint/cut/archive-gc-journal-2588.json`
- ADR-0032: `docs/adr/ADR-0032-archive-gc-journal-boundary.md`
