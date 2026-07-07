<!-- Сгенерировано: 2026-07-07T03:58:38.058Z (yarn standup) -->
<!-- Тип: ежедневный стендап виртуальной команды (daily standup / daily sync) -->
<!-- Входы: VIRTUAL_TEAM_PROMPT, docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md, STRATEGIC_PLAN_DAY, DAILY_CODE_REVIEW, GitHub Issues (17), packages/temp (0 файлов) -->
<!-- Issues: gh CLI -->

# 🗓️ DAILY STANDUP — 2026-07-07

**Координатор:** Vesnin (Teamlead) · **Tier вчерашнего ревью:** T0 (чисто, блокеров нет)
**Магистраль:** продуктовая (форсайт S2 — **combined UC: fusion спектр+нейро**) · детекция стала поддерживающей полосой

---

## 1. Синтез входных сигналов

| Источник | Ключевой вывод | Действие сегодня |
|----------|----------------|------------------|
| **CODE_REVIEW** (06.07 вечер) | T0, дерево чистое; один хвост — untracked `scripts/node-link-probe.mjs` | ФАЗА 0: осознанно закоммитить/убрать скрипт (проверить секреты/URL, лог не в корень) |
| **STRATEGIC_PLAN_DAY** (07.07) | Прорыв суток — **yamnet F1 0.803** (лучший на free-v1); вход в **S2 fusion** | Магистраль = Задача 1 (fusion-контракт) → далее 2/3/4/5 |
| **FFT_METRICS §6** (#84) | Эшелон 0 (DSP/FFT) исчерпан; рост — только fusion (trends+yamnet) на сыром confidence | Пересборка бенчмарка **только** в рамках fusion; НЕ повторять DSP-тюнинг free-v1 |
| **Открытые Issues** | Продуктовых блокеров детекции нет; #34 (FFT edge-docs) попутно | В фон: #34 к math-касанию; intern #195–197, #236 — вне магистрали |
| **packages/temp** | Набросков, двигающих магистраль, не обнаружено | — |

---

## 2. Разворот дня (легализация нейро/fusion)

Вчерашний `MAIN_DAY_ISSUE` вёл к `DRONE_TIGHT` промоушену. За сутки картина изменилась: yamnet (#266/#268) вышел в prod с **F1 0.803**, обойдя trends `DRONE_TIGHT` (0.771). Магистраль официально переходит от «промоушена одиночного DSP» к **combined UC (fusion)**. Это снимает риск дрейфа план↔факт (feedback 7.4/10) — план дня явно легализует нейро/fusion-разворот.

---

## 3. План на сегодня по ролям

```
[Teamlead] (Vesnin):
  • LGTM выбора основного детектора (Задача 2): yamnet = основной hard-gate, trends DRONE_TIGHT = объяснимый бэкап.
  • Держать S2 ведущей, детекцию — поддерживающей; не пускать «unified DSP benchmark» в магистраль.
  • go/no-go по границе transport-service (не выделять пакет сегодня).

[Структурщик] (Ozhegov):
  • ФАЗА 0: судьба scripts/node-link-probe.mjs (секреты/URL нет; лог в %TEMP%/docs/archive, не в корень).
  • Задача 1: где живёт fusion-контракт — в @membrana/core (типы combined), НЕ внутри detectors/*; check:boundaries зелёный.
  • Задача 4: скелет 3+1 UserCase в device-board (зависит только от core).
  • Задача 5 (NB0/NB1): пробник флапа связи узел↔cabinet, deviceId в UI.

[Математик] (Dynin):
  • Задача 1 (ВЕДЁТ): чистая функция слияния trends(спектр)+yamnet(нейро) на СЫРОМ confidence — не бинарный OR.
    Вход: {trendsConfidence, yamnetConfidence(raw)} → выход: combined score + пер-источник. Unit-тесты: согласованный/расходящийся вердикт.
  • Задача 2: единая таблица val (P/R/FPR/F1) yamnet vs trends DRONE_TIGHT — БЕЗ нового DSP-прогона.
  • Попутно #34: FFT edge-cases в JSDoc/README fft-analyzer (пустой буфер, NaN, Nyquist, окно).

[Музыкант] (Kuryokhin):
  • Задача 3 (DSP-часть): alarm-loop «ближе/дальше/стабильно» по RMS-тренду live (через audio-engine, §1b).
    Pure-логика классификации тренда — на синтетических рядах. Форму фичи согласовать с Teamlead (1–2 абзаца).

[Верстальщик] (Rodchenko):
  • Задача 3 (UI): индикатор «приближается/удаляется/стабильно»; явная пометка «грубый индикатор громкости, не координата».
  • Задача 4 (UI): карточки 3+1 UC по DESIGN.md; бизнес-логика не в JSX.
  • Задача 5: видимый deviceId сопряжения (NB1).
```

---

## 4. Календарная развёртка

| Слот | Фаза | Кто | Артефакт |
|------|------|-----|----------|
| **08:00–09:00** | ФАЗА 0 (гигиена) | Ozhegov + Rodchenko | Чистое дерево (судьба `node-link-probe.mjs`); `@membrana/client` lint/typecheck/test зелёные; все 5 ролей прочитали standup |
| **09:00–12:00** | Магистраль — Задача 1 (fusion-контракт) | Dynin вед. + Ozhegov | Тип combined в `core` + чистая функция слияния + unit-тесты; `check:boundaries` зелёный |
| **11:00–13:00** | Задача 2 (долг объяснимости) | Dynin + Vesnin (LGTM) | Таблица val yamnet vs trends в `DETECTOR_BENCHMARK.md`; основной/бэкап зафиксирован |
| **13:00–16:00** | Задача 3 (alarm-loop) ∥ | Kuryokhin + Rodchenko | Плагин «ближе/дальше», тренд-логика в тестах, регистрация/teardown |
| **13:00–16:00** | Задача 4 (скелет UC) ∥ | Ozhegov + Rodchenko | 3+1 UC в device-board; scenario-тесты + журнал (#269); границы зелёные |
| **по остатку** | Задача 5 (NB0/NB1) · #34 | Ozhegov + Rodchenko · Dynin | Отчёт пробника связи + deviceId; FFT edge-docs |

---

## 5. Итоговый артефакт дня

**Fusion-контракт combined UC** (сырой confidence trends+yamnet) в `@membrana/core` + чистая функция слияния + единая val-таблица детекторов — вход в S2 продуктовой магистрали.

## 6. Definition of Done (сводный)

- ✅ **Задача 1:** тип combined-результата в `@membrana/core` (сырой confidence обоих источников + агрегат, **без бинарного OR**); unit-тесты слияния (согласованный/расходящийся); `check:boundaries` зелёный (детекторы не зависят друг от друга); combined-точка отражена в `DETECTOR_BENCHMARK.md`.
- ✅ **Задача 2:** одна таблица на held-out `val` с P/R/FPR/F1 обоих кандидатов; зафиксировано «yamnet — основной, trends `DRONE_TIGHT` — бэкап»; **без нового DSP-тюнинга** free-v1; LGTM Teamlead.
- ✅ **Задача 3:** плагин показывает «приближается/удаляется/стабильно» по RMS-тренду; pure-логика покрыта тестами; регистрация через `MembranaRegistry` (lazy), teardown корректный; аудио только через engine; UI помечает «грубый индикатор, не координата».
- ✅ **Задача 4:** 3+1 UC заведены в device-board; scenario-тесты и журнал (#269) отражают запуск; `check:boundaries` зелёный.
- ✅ **Задача 5:** отчёт NB0 (флап связи) + видимый deviceId (NB1); prod-контракты не тронуты.
- ✅ **Гигиена/согласованность:** нет `.txt`-логов в корне; `node-link-probe.mjs` — осознанно закоммичен/убран; нигде магистралью не стоит «Этап 1.A / unified DSP benchmark»; S2 combined UC — ведущая полоса.

---

## 7. Что НЕ делаем сегодня (антидрейф)

- ❌ Повторный unified benchmark harmonic/cepstral/spectral-flux на free-v1 (эшелон 0 исчерпан, FFT_METRICS §6). Разрешена **только** пересборка в рамках fusion (Задача 1).
- ❌ Бинарный OR trends+yamnet вместо fusion на сыром confidence — потеряется смысл combined UC.
- ❌ `tdoa-service` / `localizer-service` / `tracker-service` — Этапы 2–4 заморожены до hard-gate 85/90.
- ❌ Выделение отдельного пакета `transport-service` — транспорт пока прорастает через `background-cabinet`; только фиксация границы.
- ❌ Гнать S4 (студия-download) / S5 (лендинг) вперёд S2/S3.
- ❌ Переизобретать yamnet-детектор/плагин/бенчмарк — уже в prod (#266/#268).

---

**Одна фраза дня:** сегодня строим **мост fusion** — сырой confidence спектра (trends) и нейро (yamnet) в один combined-контракт `@membrana/core`, открывая S2 продуктовой магистрали; детекция-DSP уходит в поддержку.