<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-11
  archived-at: 2026-07-11T18:10:53.678Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-11T03:55:59.561Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (18), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 Ежедневный стендап виртуальной команды Membrana — 2026-07-11

**Координатор:** Vesnin (Teamlead)
**Источники:** STRATEGIC_PLAN_DAY (11.07), DAILY_CODE_REVIEW (10.07 вечер), MAIN_DAY_ISSUE (10.07), CURRENT_TASK (буфер), FFT_METRICS §6 (#84), открытые GitHub Issues (gh CLI), packages/temp (0), RAG operative

---

## Входные артефакты — актуальность

| Источник | Свежесть | Что берём |
|----------|----------|-----------|
| STRATEGIC_PLAN_DAY.md | ✅ свежий (11.07) | Магистраль = **живой S2** (Задачи 1/2), долг L24 (Задача 3), side C/D (Задачи 4/5) |
| DAILY_CODE_REVIEW.md | ✅ вечер 10.07 | T1, CI зелёный (test 55/55, lint 34/34 + 1 warn); смоук journal-singleton (#347) + latent-visibility (#346); nit useMemo |
| MAIN_DAY_ISSUE.md | ⚠️ вчерашний (10.07) | Контекст живого S2; **перевыпустить на 11.07** |
| CURRENT_TASK.md | 🔸 буфер | `hermes-brief` — только отдельная сессия, не трогать магистраль |
| FFT_METRICS §6 (#84) | ✅ канон | Эшелон 0 исчерпан → **не** запускать «Этап 1.A / benchmark 3 DSP» |
| GitHub Issues (открыты) | ✅ актуально | #344 (night-triage — заморожен), #236/#187/#95/#92/#59/#58/#57/#49/#34/#33, интерн #195–197 |
| packages/temp | — (0) | Набросков нет |
| RAG operative | ✅ | Подтверждает магистраль S2 |

---

## Что закрыто за сутки (из STRATEGIC_PLAN_DAY)

- **device-board рантайм/семантика:** закрыт Competition Sprint (winner Beta 213.5); 3 detection→alarm сценария на basn-палитре в пикере (#336/#337/#339); ключевые фиксы ND3 — fusion единственный писатель `lastDetection`, вход в alarm по `combinedScore >= 0.5` (#340/#341).
- **live-wiring:** проброс fusion/ensemble/proximity stores во все точки исполнения (#338/#346, L29–L33); host `startAsyncJob` → `report-build`; стабильный singleton `LiveJournalService` + рестарт записи из хвостов gamma (#347, L34/L35).
- **telemetry-journal:** `replaceBackend` + гард `storageMode !== remote-server` (−1.7 с латентности).
- **инфра:** `pr:ship --no-commit` (#335); дефолт тега prod → `main` (#334); хук допускает `comp(...)`.
- **процесс:** night-triage заморожен по стоп-условию (нет канала ошибок у облачного рана); скилл `membrana-usercase-lessons` (#343).

---

## ⚡ Магистраль дня — ЖИВОЙ SMOKE S2 (не подтверждён вживую)

> **Главный незакрытый риск** (из плана §3): unit-тесты зелёные (708/710 device-board, 287 client), но **живого подтверждения S2 на борде НЕТ**. Вчерашний MAIN_DAY_ISSUE ставил живой `combinedScore>0` — остаток DoD переносится и агрегируется в живой прогон сценариев.

---

```text
[Teamlead]: Магистраль — закрыть S2 по существу: живой прогон Beta (winner) + Alpha на
            борде с непустым журналом и alarm-loop по combinedScore>=0.5, плюс перепрогон
            Gamma на новой топологии после L34/L35. Это НЕ новый код — подтверждение.
            Приёмка live по A/B, LGTM. Эшелон 0 (FFT §6) магистралью НЕ становится.
[Структурщик]: Веду runtime Gamma (Задача 2) и аудит точек executeScenarioBlock (Задача 3,
            закрытие долга L24) — grep всех сайтов exec-subgraph/event-dispatch/function-call,
            регресс-тест проброса stores во всех ветках. Границы пакетов не трогаю: правки
            в device-board core / core+engine, горизонтальных импортов между сервисами нет.
[Математик]: Side-слот — Задача 4: таблица trends DRONE_TIGHT vs yamnet на held-out val
            (P/R/FPR/F1) в DETECTOR_BENCHMARK.md, БЕЗ нового DSP-прогона. Основной путь —
            yamnet (F1 0.803), бэкап — DRONE_TIGHT (95%/30%). Ссылка из FFT_METRICS §6.
[Музыкант]: Проверяю alarm-loop реакцию на fusion-combinedScore (не на громкость) в живом
            прогоне Beta/Alpha. Ядро fuseDetectorConfidences не переизобретаю (ND3: сырой
            confidence, не бинарный OR).
[Верстальщик]: Веду живой smoke S2 (Задача 1): Beta+Alpha на борде, live-проверка Gamma;
            каждая находка Run → L-запись. Попутно закрыть nit useMemo
            SampleLibraryModule.tsx:94 (P2 из ревью).

Итоговый артефакт: живой S2-лог/скриншот (combinedScore>=0.5 + alarm-loop) + перепрогон Gamma
                   + аудит-документ executeScenarioBlock + таблица DRONE_TIGHT vs yamnet
Definition of Done: Beta+Alpha live журнал непустой, alarm по score; Gamma тест зелёный на
                    новой топологии; L24 регресс-тест проброса stores; таблица в BENCHMARK.md;
                    все находки Run → L-записи; client+device-board lint/typecheck/test зелёные
```

---

## 🕐 План на 11.07

### ФАЗА 0 (08:00–09:00) · блокирующая гигиена + смоук вчерашних фиксов
**Ответственные:** Ozhegov + Rodchenko

```bash
# смоук вчерашних фиксов (из DAILY_CODE_REVIEW DoD)
# 1. journal-singleton (#347): не дублируется при переключении веток; рестарт записи из хвостов L34/L35 не теряет события
# 2. latent-visibility (#346): ошибки latent-ветки видны в UI, не молчат (L31/L33)
yarn turbo run lint typecheck test --filter=@membrana/client --filter=@membrana/device-board
yarn docs:lint && yarn catalog:verify-client
git status --porcelain | grep -E '\.txt$' && echo "⚠ убрать" || echo "✓ clean"
```
**DoD:** дерево чистое (нет `.txt` в корне), client+device-board зелёные, все 5 ролей прочитали стендап; смоук #347/#346 без регресса (при регрессе — P1, стоп магистрали).

### ФАЗА 1 · МАГИСТРАЛЬ — Задача 1: живой smoke S2 (09:00–13:00) · M
**Vert (ведёт) + Kuryokhin (alarm) · LGTM Vesnin**
- Beta live: ensemble → fusion → branch → combined → publish-done, журнал непустой, alarm по `combinedScore>=0.5`.
- Alpha live: тот же чек-лист.
- **Разведка (критично):** статус model-provider в сборке client — если не подключён, combined = **DSP-only**, честно записать в UserCase (не выдавать за нейро-fusion).
- Каждая находка Run → L-запись (симптом+runId → корень → Fix#PR → профилактика).

### ФАЗА 2 · МАГИСТРАЛЬ — Задача 2: перепрогон Gamma (13:00–15:00) · M · зависит от L34/L35
**Ozhegov (runtime) + Rodchenko (live)**
- Gamma live: цепочка полная, запись рестартует из хвостов обеих веток решения.
- Тест `default-usercase-detection-alarm-gamma` зелёный на новой топологии.

### ФАЗА 3 · Задача 3: аудит `executeScenarioBlock` (закрытие L24) · S
**Ozhegov**
- Grep/инвентарь всех точек вызова (initial/main/alarm/handlers/functions/event/latent) → документ аудита.
- Регресс-тест проброса fusion/ensemble/proximity stores в каждой ветке; непокрытый сайт → фикс+тест.

### Side-слот (P2, при остатке ёмкости)
- **Задача 4** — таблица `DRONE_TIGHT` vs yamnet на val в `DETECTOR_BENCHMARK.md` (Dynin, S) — без нового прогона.
- **Задача 5** — S3-инвентарь UserCases под упаковку (Ozhegov+Vesnin, M) — при закрытии магистрали.
- **Nit** — useMemo `SampleLibraryModule.tsx:94` (Rodchenko, S, P2 из ревью).

---

## 🚫 НЕ делаем сегодня (из плана §5)

- **Не** запускаем unified benchmark harmonic/cepstral/spectral-flux — эшелон 0 исчерпан (FFT §0/§6).
- **Не** ставим магистралью «довести Этап 1.A» / stage-gate 85/90 через одиночные DSP (FPR 88–100%).
- **Не** начинаем `tdoa/localizer/tracker/transport-service` — Этапы 2–4 заморожены (VDR-железо ~17.07).
- **Не** переизобретаем yamnet — уже в prod (F1 0.803).
- **Не** реанимируем night-triage (#344) — заморожен по стоп-условию.
- **Не** тянем `hermes-brief` в магистраль — только отдельная сессия.

---

## 📋 GitHub Issues — приоритизация на сегодня

| # | Тема | Отношение к дню |
|---|------|-----------------|
| #34 | FFT edge cases / windowing docs | Попутно к Задаче 4 (Dynin касается fft-analyzer) — nice-to-have |
| #57 | Редактор trends-fft шаблонов | Связан с S3/DRONE_TIGHT калибровкой — **не сегодня**, после магистрали |
| #33 | telemetry-journal a11y | Журнал в фокусе (Задача 1/2), но a11y — отдельно, не блокер |
| #236 | Studio emergency stop (tray) | Risk-задача, вне горизонта |
| #92 #59 #58 | Realtime gateway / background-media | Транспорт/деплой — вне single-node фокуса |
| #195–197 | Intern T1–T3 | Онбординг, отдельный трек куратора |
| #187 | headroom proxy-perf замер | Tooling, вне магистрали |
| #95 | Device-Board Refactor v0.4 | Крупный эпик, не сегодня |
| #344 | Night-triage routine | ❄️ заморожен (стоп-условие) |

**В скоупе попутно:** #34 (если Dynin делает Задачу 4). Остальное — вне магистрали.

---

## ✅ Проверки в конце дня

- [ ] **Живой S2 подтверждён:** Beta+Alpha на борде, журнал непустой, alarm по `combinedScore>=0.5` — снят долг «живого smoke S2».
- [ ] **Gamma стабильна:** перепрогон без пустого журнала / одноразовой детекции; тест gamma зелёный.
- [ ] **Долг L24 закрыт:** аудит-документ + регресс-тест проброса stores; новых непокрытых сайтов нет.
- [ ] **Разведка model-provider:** статус зафиксирован (DSP-only vs нейро-fusion) — честно в UserCase.
- [ ] **Side (при ёмкости):** таблица DRONE_TIGHT vs yamnet; nit useMemo закрыт.
- [ ] **Гигиена:** находки Run → L-записи (append-only, #343); client+device-board зелёные; границы пакетов не нарушены; нет `.txt` в корне.

---

**Одна фраза дня:** вчера **замкнули S2 в коде и стабилизировали live-журнал** (#347/#346, L34/L35), сегодня **подтверждаем вживую** — Beta+Alpha+Gamma на борде с непустым журналом и alarm-loop по `combinedScore>=0.5`, закрываем долг проброса stores (L24) и готовим почву под S3; никакого нового DSP-тюнинга, `hermes-brief`/night-triage — вне магистрали.