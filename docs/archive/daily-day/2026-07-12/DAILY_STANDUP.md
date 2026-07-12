<!--
  archive-role: archive-snapshot
  archive-day: 2026-07-12
  archived-at: 2026-07-12T15:09:54.369Z
  source: docs/DAILY_STANDUP.md
  canonical: docs/DAILY_STANDUP.md (перезаписывается yarn plan:day / standup / main-day-issue)
  Не использовать как основной документ дня — побочный снимок для ретроспективы и анализа.
-->

<!-- Сгенерировано: 2026-07-12T04:01:06.062Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (18), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 Ежедневный стендап виртуальной команды Membrana — 2026-07-12

**Координатор:** Vesnin (Teamlead)
**Источники:** STRATEGIC_PLAN_DAY (12.07), DAILY_CODE_REVIEW (11.07 вечер), MAIN_DAY_ISSUE (11.07), CURRENT_TASK (буфер), FFT_METRICS §6 (#84), открытые GitHub Issues (gh CLI), packages/temp (0), RAG operative

---

## Входные артефакты — актуальность

| Источник | Свежесть | Что берём |
|----------|----------|-----------|
| STRATEGIC_PLAN_DAY.md | ✅ свежий (12.07) | Магистраль = **собрать S2 combined UC** (Задача 1, L); закрыть фазы C/D loop-refactor (#359, Задача 2); таблица объяснимости (Задача 3); S3-каркас (Задача 4); VDS-смоук (Задача 5) |
| DAILY_CODE_REVIEW.md | ✅ вечер 11.07 | **T0**, CI зелёный (test 55/55, lint 34/34). Diff = docs-снимки дня. Завтрашний #359 (фаза C/D) — потенциальный P1→T2 по loop-transition-policy |
| MAIN_DAY_ISSUE.md | ⚠️ вчерашний (11.07) | Контекст живого S2 (Beta+Alpha+Gamma); **перевыпустить на 12.07** — фокус сместился с «живого smoke» на «сборку combined UC» |
| CURRENT_TASK.md | 🔸 буфер | `hermes-brief` — только отдельная сессия, магистраль не трогать |
| FFT_METRICS §6 (#84) | ✅ канон | Эшелон 0 исчерпан → **не** запускать «Этап 1.A / benchmark 3 DSP» |
| GitHub Issues (открыты) | ✅ актуально | #344 (заморожен), #236, #197/#196/#195 (intern), #187, #95/#92/#59/#58/#57/#49, #34/#33/#27/#10/#8/#7 |
| packages/temp | — (0) | Набросков нет — ничего не подмешиваем |
| RAG operative | ✅ | Подтверждает непрерывность S2-магистрали (11.07 → 12.07) |

---

## 🎯 Магистраль дня (одна фраза)

Вчера **замкнули и стабилизировали S2 в коде + live-журнал** (#347/#346), сегодня **собираем сам combined UserCase** поверх готового `loop-transition-policy` (#357/#358): вход в alarm по fusion `combinedScore` из **сырого** yamnet confidence + trends-score, петля «ближе/дальше» по громкости. Параллельно закрываем незакрытый спринт loop-refactor (фазы C/D, #359) и фиксируем таблицу объяснимости trends vs yamnet.

---

## ⚠️ Почему это магистраль (а не DSP / hermes / многоузловые этапы)

| Источник | Вердикт | Обоснование |
|----------|---------|-------------|
| STRATEGIC_PLAN_DAY (12.07) | ✅ **Магистраль** | Задача 1 (combined UC, L) — keystone FREE-тарифа к ~17.07 |
| FFT_METRICS §6 (#84) | ❌ НЕ трогать | Эшелон 0 исчерпан; рост качества — только fusion trends+yamnet |
| WHITE_PAPER §8 | ❄️ Заморожено | Stage 2 (tdoa/localizer/tracker/transport) — за hard-gate, не начинать |
| CURRENT_TASK (hermes) | ⏸ Отдельная сессия | Enabler-трек, не магистраль |
| #344 night-triage | ❄️ Заморожен | Стоп-условие пилота |

**Ключевой инвариант fusion (SERVICES.md):** объединение trends-FFT + yamnet живёт **на уровне сценария device-board**, а не внутри analyzer-сервиса — иначе появится зависимость analyzer↔analyzer. Отдельный `detection-ensemble-service` **не** выделяем (один потребитель — правило «foundation при ≥2 потребителях» не выполнено).

---

## 🎭 Роли на сегодня

```text
[Teamlead]: Vesnin. Координирует fusion-контракт combined UC (Задача 1): где и как складываются сырой yamnet confidence + trends-score в combinedScore, вход в alarm по >=0.5. Owner VDS-смоука (Задача 5). LGTM по всем задачам. Держит границу: fusion — в сценарии, не в сервисе; НЕ выделять detection-ensemble-service.

[Структурщик]: Ozhegov. Ведёт Задачу 4 (S3-каркас: canonical entry-ids для 3+1 UserCases, регистрация combined через MembranaRegistry, без прямого registerModule). Со-ведёт Задачу 2 (границы сценариев Beta/Gamma в фазах C/D). Проверяет, что fusion-код не вводит analyzer↔analyzer зависимость (import-lint по diff).

[Математик]: Dynin. Ведёт правило объединения confidence в Задаче 1 — чистая функция fuse(yamnetConfidence: raw, trendsScore) → combinedScore, без побочных эффектов. Ведёт Задачу 3 (таблица P/R/FPR/F1 trends DRONE_TIGHT vs yamnet на одном val-срезе, обновление DETECTOR_BENCHMARK.md) — БЕЗ нового DSP-прогона. Попутно: #10 (unit-тесты чистой математики fft-analyzer) и #34 (edge cases FFT) — если останется ёмкость.

[Музыкант]: Kuryokhin. Alarm-реакция петли «ближе/дальше»: реагирует на combinedScore/громкость, а не подменяет алгоритм. 24/48 kHz дисциплина. Перед существенным кодом эффекта — короткое одобрение формы у Teamlead.

[Верстальщик]: Rodchenko. UI лупов в Задаче 2 (тумблер activeBranch #358, отражение мягкого/жёсткого захвата). Со-ведёт S3-каталог (Задача 4, презентация 3+1). Презентационный слой строго по DESIGN.md; бизнес-логику fusion в JSX не тащить.
```

---

## 🕐 План дня

### ФАЗА 0 — Блокирующая гигиена (08:00–09:00) · Ozhegov + Rodchenko
```bash
yarn turbo run lint typecheck test --filter=@membrana/client --filter=@membrana/device-board
yarn docs:lint && yarn catalog:verify-client
git status --porcelain | grep -E '\.txt$' && echo "⚠ убрать" || echo "✓ clean"
```
**DoD:** client+device-board зелёные; docs/catalog sync; нет `.txt` в корне; базовая линия device-board **до** старта фаз C/D (#359); все 5 ролей прочитали этот стендап.
**Если регресс #347/#346** (journal-singleton дублируется / latent-ошибки молчат) → **P1, СТОП магистрали**.

### ФАЗА 1 — МАГИСТРАЛЬ: Задача 1 · собрать S2 combined UC (09:00–13:00) · **L**
- **Ведут:** Dynin (правило fusion) + Vesnin (контракт) → Kuryokhin (alarm) + Rodchenko (UI)
- **Порядок (эвристика §1):** Teamlead форма → Математик `fuse()` → Музыкант/Верстальщик параллельно → Структурщик интеграция → Teamlead LGTM
- **DoD:** alarm-переход по **сырому** yamnet confidence + trends-score (не бинарные вердикты); `activeBranch` (#358) корректен; `logs:parse` (секция detection-alarm) показывает вход по `combinedScore>=0.5` + петлю громкости; fusion **не** создаёт analyzer↔analyzer зависимость.

### ФАЗА 2 — Задача 2 · закрыть фазы C/D loop-refactor #359 (13:00–15:00) · **M**
- **Ведут:** Ozhegov (границы сценариев) + Rodchenko (UI лупов)
- **⚠️ Из code-review:** усилить проход C2/C6 — границы `combinedScore`, NaN, гистерезис 0.15/debounce 3; **обязательна** сверка с ADR loop-switch (#356) и консилиумом (#355)
- **DoD:** Beta/Gamma зелёные на pack-гарде; L36 Alpha entry-id red-тест зафикшен (self-destruct) **или** явно перевешен в долг с тикетом; registry.json спринта закрыт, карточка в archive.

### ФАЗА 3 — Задача 3 · таблица объяснимости (15:00–16:00) · **M** · Dynin
- **DoD:** P/R/FPR/F1 trends `DRONE_TIGHT` vs yamnet на **одном** val-срезе; зафиксирована рекомендация fusion (сырой yamnet — основной, trends — объяснимый бэкап); `DETECTOR_BENCHMARK.md` обновлён; **unified DSP-бенчмарк НЕ перезапускался**.

### 📦 Side-слот (P2, только при остатке ёмкости)
- **Задача 4** — S3-каркас 3+1 UserCases (Ozhegov, M): canonical entry-ids валидны pack-гардом; combined UC регистрируется через `MembranaRegistry`.
- **Задача 5** — VDS-смоук background-office (Vesnin, S): `_ssh-office-smoke`/TLS на новом домене; закрыть OM3 / `office-vds-migration` (#349).
- **Долг математики** (Dynin, при простое): #10 unit-тесты `fft-analyzer` math + #34 edge cases FFT — дешёвые, укрепляют базу под fusion.

---

## 🚫 Что НЕ делаем сегодня

- ❌ Повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1 — эшелон 0 исчерпан (FFT_METRICS §6).
- ❌ «Доводка Этапа 1.A» и повторный тюнинг DSP-порогов.
- ❌ `tdoa/localizer/tracker/transport-service` и синхронизация времени — Stage 2 заморожен (WHITE_PAPER §8/§9).
- ❌ Выделение `detection-ensemble-service` — один потребитель, правило SERVICES.md не выполнено.
- ❌ Реанимация #344 night-triage; hermes-brief — только в отдельной сессии.

---

## 📋 Открытые Issues — приоритизация относительно магистрали

| Issue | Отношение к дню | Действие |
|-------|-----------------|----------|
| **#359** (loop-refactor C/D) | 🎯 Магистраль (Задача 2) | Закрыть сегодня |
| **#10** (unit-тесты fft math) | 🟢 Попутно к fusion | Side-слот Dynin |
| **#34** (FFT edge cases docs) | 🟢 Попутно | Side-слот Dynin |
| #349 (office-vds) | 🟡 Side (Задача 5) | При остатке ёмкости |
| #236 (tray emergency stop) | ⏸ risk-задача | Не сегодня |
| #195–197 (intern) | 👤 Вертикаль стажёра | Отдельный трек, fork+ревью |
| #187 (headroom proxy-perf) | ⏸ enabler | Не магистраль |
| #95/#92/#59/#58/#57/#49 | ⏸ эпики/деплой | Вне магистрали |
| #33/#27/#8/#7 | ⏸ imperfection/a11y | Backlog |
| #344 (night-triage) | ❄️ Заморожен | Не трогать |

---

## Итоговый артефакт
`docs/DAILY_STANDUP.md` (12.07) — план дня с магистралью **S2 combined UC** (Задача 1, L), закрытием loop-refactor C/D (#359), таблицей объяснимости и side-слотом (S3-каркас + VDS + math-долг).

## Definition of Done (день)
- ✅ ФАЗА 0 зелёная (client+device-board lint/typecheck/test, docs/catalog sync, дерево чистое, нет регресса #347/#346).
- ✅ **Combined UC собран:** `logs:parse` показывает вход в alarm по fusion `combinedScore>=0.5` (сырой yamnet + trends), петля громкости работает, `activeBranch` корректен.
- ✅ **Фузия не нарушает границы:** нет зависимости analyzer↔analyzer (import-lint по diff); `detection-ensemble-service` не выделен.
- ✅ **Спринт loop-refactor закрыт:** фазы C/D смёржены, Beta/Gamma pack-гард зелёные, судьба L36 Alpha решена, registry обновлён.
- ✅ **Таблица объяснимости:** строка «trends DRONE_TIGHT vs yamnet» на одном val в `DETECTOR_BENCHMARK.md`; unified DSP-бенчмарк не перезапускался.
- ✅ Соответствие DESIGN.md (UI лупов), отсутствие клиппинга (alarm-петля), чистые функции у Математика (`fuse()` без побочных эффектов).