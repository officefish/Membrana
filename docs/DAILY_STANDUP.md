<!-- Сгенерировано: 2026-07-14T04:03:26.176Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (24), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓 Ежедневный стендап виртуальной команды Membrana — 2026-07-14

**Координатор:** Vesnin (Teamlead)
**Источники:** STRATEGIC_PLAN_DAY (14.07), DAILY_CODE_REVIEW (13.07 вечер, T0), MAIN_DAY_ISSUE (13.07), CURRENT_TASK (буфер), FFT_METRICS §6 (#84), открытые GitHub Issues (gh CLI), packages/temp (0), RAG operative

---

## Входные артефакты — актуальность

| Источник | Свежесть | Что берём |
|----------|----------|-----------|
| STRATEGIC_PLAN_DAY.md | ✅ свежий (14.07) | Магистраль = **объяснимость fusion** (Задача A) + **перф-замер yamnet** (Задача B) + **S3 combined UC** (Задача C); side D/E (spec-preserve, долг смоуков) |
| DAILY_CODE_REVIEW.md | ✅ вечер 13.07 | **T0**, CI зелёный (test 56/56, lint 35/35). Diff = docs-only. Незакоммиченный `docs/reviews/tdoa-localizer-spec-s1/` — отдельным коммитом |
| MAIN_DAY_ISSUE.md | ⚠️ вчерашний (13.07) | Контекст: DA4/DA5 замкнуты, S3-старт. **Перевыпустить на 14.07** — фокус сместился: эпик #396 закрывается, магистраль = fusion-объяснимость + продукт |
| CURRENT_TASK.md | 🔸 буфер | Два новых трека: UI-панель дрейфа (#396 финал, **консилиум-гейт** `drift-panel-placement`) + telegram v2 (#434). `hermes-brief` — отдельная сессия |
| FFT_METRICS §6 (#84) | ✅ канон | Эшелон 0 исчерпан → **не** запускать «Этап 1.A / benchmark 3 DSP» |
| GitHub Issues (открыты) | ✅ актуально | #434, #433 (agent-tooling), #420 (privacy-backlog), #416/#415 (fusion-perf), #411/#410/#409/#408/#407 (tooling-friction), #402, #396, #236, #197–195 (intern), #187, #57 |
| packages/temp | — (0) | Набросков нет — ничего не подмешиваем |
| RAG operative | ✅ | Подтверждает непрерывность магистрали (12→13→14.07): drift-anchor → продукт |

---

## Вчера (13.07) — что закрыто

- **Telegram-спринт `#428`** — ЗАКРЫТ (PR #431 + hotfix `0291f954`). E2E живой, оба дайджеста доставлены (sent=true). Памятка `docs/comms/ALLY_PRIMER.md`.
- **`llm-providers-unblock` (#424/#425/#426)** — ЗАКРЫТ (bf6f7fb0, LGTM ×2). Хвосты — на владельце (баланс DeepSeek, платёжный метод Voyage).
- **Persona Memory фаза 1 (#422/#423)** — ЗАКРЫТА. Пилот = `--with-memory` на ближайшем консилиуме.
- **drift-anchor DA0-DA3 + DA4/DA5 контур (#396)** — ядро + процессный контур замкнуты. Осталась UI-панель (финал эпика).
- **yamnet live-fusion (#415/#417/#416)** — в prod-бенчмарке, F1 0.803; DEV-лог `latencyMs` добавлен.

---

## Позиция на дорожной карте

Между **Этапом 1.B** (нейро-эшелон на одном узле, yamnet в prod) и **продуктовой финализацией FREE** (дедлайн ~17.07). Многоузловые этапы 2–7 (TDOA/localizer/tracker/transport) — **заморожены** до hard-gate на VDR-корпусе.

**Риск дня:** доля инфра-коммитов за сутки заметно выше продуктовых (S2/S3) при дедлайне FREE через ~3 дня. Сегодня баланс возвращается к продукту.

---

## 🎯 Магистраль дня — три задачи + side

### Задача A (M) — Сводная таблица trends `DRONE_TIGHT` vs yamnet на общем `val`
```
[Teamlead]:    Форма решения принята. Одна таблица «основной vs объяснимый бэкап»
               на held-out val — вход в hard-gate. БЕЗ повторного тюнинга DSP (#84 §6).
[Структурщик]: —
[Математик]:   Ведёт. recall/precision/FPR/F1 обеих конфигураций в одной шкале на
               одном val-срезе. Отразить слабую корреляцию профилей ошибок (заметка ND3).
               Явно назвать «основной для hard-gate» / «объяснимый бэкап» + обоснование.
[Музыкант]:    —
[Верстальщик]: —

Итоговый артефакт: секция в DETECTOR_BENCHMARK.md (таблица + вердикт).
Definition of Done: одна таблица на общем val; назван основной/бэкап с обоснованием;
   отражена слабая корреляция DSP/нейро; без повторного тюнинга порогов; LGTM Teamlead.
```

### Задача B (S) — Перф-замер p95 yamnet-инференса в live combined
```
[Teamlead]:    Закрывает перф-долг §2 (Этап 1.A: p95 < 100 ms для нейро-канала). Мандат #416.
[Структурщик]: —
[Математик]:   —
[Музыкант]:    Ведёт. Снять p50/p95 из DEV-лога latencyMs (#416) на живом каденсе
               (windowSec 2с, опрос нейро раз в 6с) с реальным микрофоном (headless не в счёт).
               При непопадании в каденс — снижать pollIntervalMs нейро, НЕ DSP.
[Верстальщик]: Поддержка: UI-метка модальностей («спектр+нейро» / graceful DSP-only).

Итоговый артефакт: цифра p50/p95 в DETECTOR_BENCHMARK.md или LIVE_DETECTION_UI.md.
Definition of Done: p95 снят на репрезентативном живом прогоне; зафиксирован; если >
   бюджета — follow-up на pollIntervalMs; тесты плагина зелёные. Удобно совместить с S2 live-smoke.
```

### Задача C (M) — Продвижение S2 combined UC к упаковке (шаг к S3)
```
[Teamlead]:    Магистраль продукта. combined UC (спектр+нейро + alarm-loop «ближе/дальше»
               по громкости) как готовый FREE UserCase. Границы + LGTM за мной.
[Структурщик]: Границы пакетов: UC через MembranaRegistry (lazy-module, §1c ARCHITECTURE),
               fusion — на уровне СЦЕНАРИЯ, не внутри analyzer-сервиса. Ядро device-board не трогать.
[Математик]:   —
[Музыкант]:    По fusion-контракту: alarm-loop поверх fusion-выхода, сырой confidence
               yamnet (не бинарный вердикт).
[Верстальщик]: Ведёт. Карточка UC в device-board-каталоге; регистрация в free-tier-user-case-entries.ts.

Итоговый артефакт: combined UC зарегистрирован + карточка в device-board-каталоге.
Definition of Done: alarm-loop «ближе/дальше» поверх fusion; UC через MembranaRegistry;
   карточка в каталоге; сырой confidence yamnet; LGTM Teamlead. Прогнать catalog:verify-client.
```

### Side-слот (P2, только при остатке ёмкости)

- **Задача D (S)** — пометить `docs/reviews/tdoa-localizer-spec-s1/` как `@stage 2 / preserved / за hard-gate`; закоммитить отдельным осмысленным коммитом (не в daily-снимок). Ведёт: Структурщик + Teamlead.
- **Задача E (S)** — зафиксировать долг живых смоуков DeepSeek/voyage (баланс/rate-limit) в `CURRENT_TASK`/реестре; подтвердить graceful fallback; VDR-железо ~17.07 явно помечено «не блокер FREE». Ведёт: Teamlead + Структурщик.

---

## 🟢 ФАЗА 0 — блокирующая гигиена (перед магистралью)

1. Закоммитить незакоммиченные docs (daily-снимок + `branch-feat-telegram-ally-reports-code-review.md`) — до вечернего `archive:daily-day`.
2. `docs/reviews/tdoa-localizer-spec-s1/` — **отдельным** коммитом (не смешивать с daily-снимком, вердикт Структурщика 13.07).
3. `yarn turbo run lint typecheck test --filter=@membrana/client` (зелёный якорь плагинов fusion).
4. `yarn docs:lint` (новые md: branch-review + tdoa-spec).
5. Нет `.txt` в корне (гигиена рабочего дерева).
6. `yarn catalog:verify-client` (для Задачи C).

**Ответ:** Ozhegov + Rodchenko.

---

## ⚠️ Отдельные сессии (НЕ в марафоне дня)

- **UI-панель «Дрейф-якоря» (#396 финал):** свежей сессией. Шаг 0 **обязателен** — `yarn consilium --save-as drift-panel-placement` (развилка «кабинет vs отдельный panel-app `panel.mmbrn.tech`», поднял владелец). **НЕ начинать компонент до вердикта консилиума.** Удобно проверить пилот persona-memory (`--with-memory`).
- **Telegram v2 (#434):** md-шапка (expandable blockquote) + подробная фактура — отдельная S/M-сессия, канон модуля #428 уже есть.
- **`hermes-brief`:** только отдельная сессия, магистраль не трогать.

---

## 🚫 Что НЕ делаем сегодня

- **НЕ** повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1 — потолок эшелона 0 зафиксирован (#84 §6). Задача A — БЕЗ нового DSP-прогона.
- **НЕ** начинаем реализацию `tdoa-service` / `localizer-service` / `tracker-service` / `transport-service` — Этапы 2–7 заморожены (WHITE_PAPER §8). Спека — только preserved-пометка (Задача D).
- **НЕ** переизобретаем yamnet/нейро-детектор — уже в prod (#415/#417, F1 0.803).
- **НЕ** гонимся за precision hard-gate 85/90 на free-v1 — проверяется на VDR-корпусе (~17.07).
- **НЕ** трогаем ядро device-board при упаковке UC (Задача C).
- **НЕ** начинаем UI-панель дрейфа и полевой data-anchor (#420) без консилиума + LGTM владельца.

---

## 🚫 Ключевой инвариант

Fusion trends+yamnet живёт на уровне **сценария**, НЕ внутри analyzer-сервиса. `drift-anchor` остаётся чистым пакетом. Провайдеры (deepseek/voyage) инкапсулированы в `background-office` с локальным DTO (ADR 0004: три инварианта push-ingest — держать при повторе паттерна). analyzer не зависит от analyzer; сервисы не зависят от `apps/client`.

---

## ✅ Проверки в конце дня

- **Задача A:** таблица на общем `val` в `DETECTOR_BENCHMARK.md`, явный вердикт «основной / объяснимый бэкап»; LGTM Teamlead.
- **Задача B:** p95 yamnet измерен и записан; если > бюджета — follow-up на `pollIntervalMs`; тесты плагина зелёные.
- **Задача C:** combined UC с alarm-loop зарегистрирован через `MembranaRegistry`, карточка видна в каталоге, fusion = сырой confidence; `catalog:verify-client` зелёный.
- **Задача D (если делали):** spec помечена preserved/@stage 2, закоммичена отдельным коммитом; untracked очищены.
- **Задача E (если делали):** долг смоуков зафиксирован; graceful fallback подтверждён; VDR ~17.07 = «не блокер FREE».
- **Границы:** ни один новый код не нарушает граф зависимостей `ARCHITECTURE.md`/`SERVICES.md`; проверено на code-review.

---

**Одна фраза дня:** вчера **замкнули процессный контур drift-anchor (DA4/DA5) и закрыли три спринта** (telegram, llm-providers, persona-memory), сегодня **возвращаем баланс к продукту** — объяснимость fusion (таблица trends vs yamnet, Задача A) + перф-замер yamnet (B) + упаковка S3 combined UC (C); UI-панель дрейфа и telegram v2 — отдельными сессиями через консилиум-гейт, без нового DSP-тюнинга и без Этапа 2.

---

## 🧭 Дрейф-якоря (read-only, DRIFT_2026-07-13.json)

Сводка: ok 8 · drift 0 · broken 0 — снимок 2026-07-13T05:16:22.454Z.

Все якоря в норме. Вердикты вынесены чистой `computeDrift`, не LLM.