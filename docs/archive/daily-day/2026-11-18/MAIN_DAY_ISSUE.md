<!--
  archive-role: archive-snapshot
  archive-day: 2026-11-18
  archived-at: 2026-11-18T15:24:37.113Z
  source: docs/MAIN_DAY_ISSUE.md
  canonical: docs/MAIN_DAY_ISSUE.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-11-18T09:19:42.021Z (yarn main-day-issue@45a81a81) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) — обязательный фокус для человека и агентов -->
<!-- Входы: DAILY_STANDUP, STRATEGY_DAY, DAILY_CODE_REVIEW, registry, активные промпты -->
<!-- angelina {"author":"tarasov","guard":"angelina","readAt":{"STRATEGY_DAY":{"version":"45a81a81ddf823d6c7207e55b5f1de87067711bd","digest":"72e6c3e59a663ede4ad6d4376e08227e3e6653dde8b5685f6a4da39ce15a75b0","versionAt":"2026-11-18T12:12:57+03:00"},"DAILY_STANDUP":{"version":"d091738349ab6a31c95368f2023d9ee0916ae2a6","digest":"fddac1f24f491634a898e75ea4bdcb4ef7e5222c6fb6f49c6389d01ca172c46a","versionAt":"2026-10-08T14:15:18+03:00"}}} -->
<!-- Звено канала: provider=anthropic model=claude-sonnet-4-6 source=overlay generations=1 -->
<!-- CURRENT_TASK — только вспомогательный буфер, не канон -->
<!-- active в реестре: archive-gc-journal-2588, node-duty-ready-predicate, session-digest-library-face, dedup-pairs-show-and-wait, obs-sentry-container, logging-observability-contour, chart-list-plugin, plugin-results-payload-pocket, firebat-node-device, frame-holders-reassign-twenty, workflow-examples-marathon, evening-chain-review-predicate, mfcc-compare-sprint, insight-mandate-for-new, llm-procedure-channels, frames-alive-rodchenko, frames-alive-dynin, frames-alive-ozhegov, assets-container, office-stability-emergency, swallow-format-frame-fix, morning-report-completion, generated-docs-quality-criteria, angelina-orchestrator-prompt, research-query-hygiene, detector-scoreboard, scoreboard-dataset-ladder, scoreboard-neural-ladder, scoreboard-panel-publish, dads-benchmark-bridge, morning-ritual-regulation, truth-graph-contour, mf8-sprint-kind, mf4-teeth-sm2, mf3-commands-vs-flag, membrana-device-build-profile, rt-7-priorities-from-registry, rt-4-closure-chain, rt-3-closure-integrity, rt-2-session-extracts, rt-1-manifest-generator, ritual-trust-contour, grp4-graphify-gated, grp3-research-tree-gated, grp2-grants-owner-matrix, graphify-research-tree-panel-sections, detector-metrics-characterization, root-domain-scenarios-docs, membrane-node-runtime-remote, mp7b-rt7-prod-hardening, device-board-three-hosts-2026-06-26, neural-free-tier-dataset-report, vdr-hard-gate, vdr-hg3-trends-benchmark, vdr-hg4-hard-gate-report, studio-capture-adaptation, pcb-d2-multinode, detection-alarm-loop-refactor -->

# MAIN_DAY_ISSUE — 2026-11-18

## Метаданные

| Поле | Значение |
|------|----------|
| `primaryFocusId` | `archive-gc-journal-2588` |
| `primaryTitle` | Уборщик холодного архива с журналом заданий: g1a в ствол, g1b · g2 · g3a |
| `githubIssue` | #2632 (зонтики #2587 / #2588) |
| `size` | L (спринт, 17 блоков) |
| `promptPath` | `docs/sprint/cut/archive-gc-journal-2588.json` |
| `сгенерировано` | 2026-11-18 |

---

## Магистраль

Магистраль дня — **`archive-gc-journal-2588`** (фаза 1 стратегии возвращения). Выбрана владельцем 18.11 вручную: замороженный снимок топ-3 (`angelina-hostess-impl`, `assets-container`, `chart-list-plugin`) её не содержал (`yarn morning:gate magistral --choose archive-gc-journal-2588 --author human`).

> **Правка ведущей 18.11.** Генератор взял магистраль с гейта от 07.10 («выкатка b7, влить #2616»). Это ложно: #2616 влит 07.10, понижение тарифа выкачено и принято 07–08.10, b7 блока 2 закрыт приёмкой. Ниже — по стратегии `docs/strategy/RETURN_STRATEGY_2026-11.md` и стволу `90bb39e2`.

**Состояние спринта (сверено 18.11):** влиты g0 (#2642), g8a/g8b/g8c (#2639/#2641/#2643), регистрация (#2640). g1a — PR #2644 (конфликт со стволом, ревью ждёт сухого прогона миграций; Docker владельца поднят 18.11). Не начаты 11 блоков.

**Критерий успеха к вечеру:** #2644 влит со сухим прогоном миграций на пустой БД; открыты PR g1b, g2, g3a.

---

## Подкрепление

- **Хвосты фазы 0:** недельный план на `WEEKLY_PLAN_TOKEN` (токен заведён 18.11); карточки 15 вложенным деревьям Codex под снос `repo:clean`; разбор плавающих ошибок типов `device-board` (#2660).
- **Выкатка media с busboy 3.2.6** (#2661) — словом владельца, вечером одним заходом.

---

## Перспективные

- После g1a/g1b исполнитель уборки (g3b) и двери графика и аудита (g4) открывают видимый журнал в панели офиса.
- Чистый недельный план через PR снова даст горизонт выше дня.

---

## Экспериментальные

- Сухой прогон миграций media на пустой БД в Docker — первая проверка цепочки миграций после 08.10; узнаем, разворачивается ли media с нуля так же, как прод.

---

## Санитарные

- Утренний генератор снова строил день от гейта 07.10, а не от стратегии и вехи `return-hygiene` — класс #2615 (утверждения не сверяются).
- `.tmp-meshdeps` в главном дереве владельца — удалить вручную.
- 33 спорные карточки реестра — решение владельца позже.

---

## Почему это магистраль

| Утверждение | Первоисточник | Свежесть |
|---|---|---|
| Выбор владельца | `morning:gate … --author human` | 2026-11-18 |
| Фаза 1 стратегии — уборщик | `docs/strategy/RETURN_STRATEGY_2026-11.md` §2 | 2026-11-17 |
| Фаза 0 почти закрыта | веха `return-hygiene` (#2663), журнал стратегии §4 | 2026-11-18 |
| g1a ждёт только сухого прогона | ревью #2644, BLOCK P1 | 2026-10-08 |

---

## Сегодня делаем

| Сессия | Дерево | Работа |
|---|---|---|
| S1 | `Membrana-sanitation-b` | g1a #2644: ствол в ветку, сухой прогон миграций, ревью → влить; затем g1b |
| S2 | `Membrana-installstate` | g2 (удаление файла с проверкой) и g3a (политика повторов, dead_letter) |
| S3 | `Membrana-codex-cve` | недельный план на токене; карточки деревьев под снос; разбор #2660 |
| Ведущая | `Membrana-tooling` | модерация, ревью, вливание; вечером — выкатка media по слову |

---

## Definition of Done

- [ ] #2644 влит; сухой прогон миграций приложен.
- [ ] PR g1b, g2, g3a открыты, ревью пройдено или замечания названы.
- [ ] Недельный план переключён на токен (PR влит).
- [ ] 15 деревьев Codex видны `repo:clean` к сносу.
- [ ] Media выкачена с busboy 3.2.6 (если слово владельца).

---

## Сознательно не делаем сегодня

- Фазу 2 (выпуск FREE / качество обнаружения) — после уборщика.
- Боевое включение уборки — только после приёмки g7 и слова владельца.

---

## Ссылки

- Стратегия: `docs/strategy/RETURN_STRATEGY_2026-11.md`
- План спринта: `docs/sprint/cut/archive-gc-journal-2588.json`
- Шторм: `docs/storm/storm-archive-gc-questions-2026-10-08/REPORT.md`
- Issue #2632, PR #2644
