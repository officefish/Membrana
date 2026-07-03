# Бриф для консилиума — VDR: судьба эпика, пилот валидации и протокол разметки

| Поле | Значение |
|------|----------|
| **Статус** | Бриф (вход в консилиум), не протокол |
| **Повод** | MAIN_DAY_ISSUE 2026-07-03: «VDR-инициация» (пилот 20–30 сэмплов, Cohen's Kappa ≥0.75, таймлайн) |
| **Эпик** | `validated-drone-recognition` (VDR1–VDR6) · [`VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md`](./prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md) · GH #47 |
| **Связано** | [`DATASET_CURATION.md`](./DATASET_CURATION.md) · [`DETECTOR_CALIBRATION.md`](./DETECTOR_CALIBRATION.md) · `FFT_METRICS_POTENTIAL_AND_LIMITS.md` · fv1 sound catalog (merged #222) |
| **Предлагаемый slug** | `vdr-validation-scope` |

---

## Вопрос консилиуму (повестка)

План дня предлагает «VDR-инициацию» с нуля (VDR_PROTOCOL.md, пилот 20–30 сэмплов, консенсус двух аннотаторов, Cohen's Kappa ≥0.75). Но **VDR1–VDR3 фактически завершены ещё 2026-06-14**, VDR4 завершён **провалом DSP**, а trends-путь с тех пор прошёл мягкий gate на новом fv1-каталоге. Что мы на самом деле валидируем дальше: как закрыть эпик VDR, нужен ли **новый валидационный корпус** для hard-gate 85/90, и какой **протокол качества разметки** применять (один оператор vs межаннотаторское согласие)?

---

## Факты репозитория (проверено 2026-07-03)

### Что уже сделано (вопреки плану дня)

| Факт | Источник |
|------|----------|
| **VDR1–VDR2 реализованы**: PATCH label/notes API, `updateSampleLabelNotes()` во всех storage-backends, UI разметки в client+cabinet, badges в DESIGN.md | `media-library-service`, `sample-library-drone-analysis`, DESIGN.md §labels |
| **VDR3 завершён с sign-off**: протокол в `DATASET_CURATION.md`, **120/120 размечено (60 drone / 60 not-drone), 0 unlabeled**, manifest v0.2 экспортирован, блокеры VDR4 сняты | `DATASET_CURATION.md` (sign-off 2026-06-14), `data/detectors-benchmark/v0.2/manifest.json` |
| **VDR4 выполнен — цель НЕ достигнута**: лучший DSP (cepstral) **50% val accuracy** при цели ≥80%; harmonic 40%; cepstral/flux дают TN=0 (кричат «дрон» на всём) | `DETECTOR_CALIBRATION.md` (2026-06-15) |
| **VDR5 частично**: `@membrana/template-match-detector-service` — implemented v0.1 | ARCHITECTURE.md §1e |
| **Новый fv1-каталог** (после VDR4): ~250 сэмплов, 6 не-дроновых классов (SILENCE/WIND/BIRDS/SPEECH/MACHINE_HUM/GUNSHOT), multi-class routing в детекторе, **мягкий stage-gate пройден: FPR<15% / recall≥90%** на смешанном датасете | fv1-s1..s3 (PR #217/#222, merged 2026-07-01) |
| **Trends-DRONE_TIGHT: 95% recall / 30% FPR** — мягкий гейт пройден; **hard-gate 85/90 требует нового датасета** | `FFT_METRICS_POTENTIAL_AND_LIMITS.md` |
| **Bookkeeping-разрыв**: все 7 записей VDR в registry до сих пор `active`, без notes | `docs/tasks/registry.json` |

### Чего НЕТ (и предлагается планом дня)

- `docs/VDR_PROTOCOL.md`, `scripts/validate-vdr-labels.mjs` (Kappa-скорер), `prepare-vdr-annotations.mjs` (standalone HTML-UI разметки), CI `vdr-validate.yml` — **не существуют**.
- Второго аннотатора-человека **нет** (в БД один admin; разметка VDR3 сделана одним оператором).
- Полевых записей дрона (не ESC-50/DAD-снипы) в корпусе нет.

---

## Точки решения

| # | Вопрос | Вариант A | Вариант B |
|---|--------|-----------|-----------|
| D1 | Судьба эпика VDR1–6 | Закрыть bookkeeping VDR1–3 (done), VDR4 (done-fail с отчётом), доформатировать VDR5, написать VDR6-отчёт → **закрыть эпик**, hard-gate — новым эпиком | Держать эпик открытым и расширять его пилотом |
| D2 | Новый валидационный корпус для hard-gate | **Пилот 20–30 новых сэмплов** (источник?) → alpha 100+ | Расширить разметку fv1-каталога (250, мультикласс) метками drone/not-drone |
| D3 | Протокол качества разметки | **Один оператор** (как VDR3) + выборочный аудит | **2 «аннотатора» + Cohen's Kappa ≥0.75** — но второго человека нет: второй голос = zero-shot (CLAP/YAMNet) как *советник, не истина*, или отложить Kappa до появления второго человека |
| D4 | Таймлайн пилота | 1 день (20–30 сэмплов, один оператор) | Неделя (сбор полевых записей + разметка) |
| D5 | Инструменты | **Reuse VDR2-UI** (cabinet sample-library) + маленький `validate:vdr` (счётчики/Kappa при наличии второго голоса) | Standalone annotation-ui.html из плана дня — **дубликат существующего UI**, предлагаю отклонить |
| D6 | VDR_PROTOCOL.md | Не плодить: расширить `DATASET_CURATION.md` секцией «пилот hard-gate» | Новый документ поверх существующего |

---

## Открытые вопросы для ролей

- **OQ1 (Teamlead).** D1: закрываем ли эпик VDR отчётом VDR6 (вход: провал DSP 50%, trends 95/30, template-match v0.1) с рекомендацией «hard-gate = новый эпик»? Каков statement для WHITE_PAPER §8 / STAGE_GATE_1_TO_2_DECISION?
- **OQ2 (Математик).** Cohen's Kappa при **одном** человеке-аннотаторе неприменима. Что берём метрикой качества разметки: intra-rater (повторная разметка подвыборки через N дней), agreement человек-vs-zero-shot (advisory), или простой аудит 10%? Порог и правило эскалации.
- **OQ3 (Математик/Музыкант).** Источник пилотных сэмплов для hard-gate: новые полевые записи (какой дрон, какая дистанция/SNR), свежие срезы DAD/ESC-50 (не из train!), или срезы с микрофона узла? Требование к независимости от train-корпуса.
- **OQ4 (Музыкант).** Валидируем **что**: только trends/template-match (текущий фаворит 95/30) или всю линейку (DSP уже провалены — стоит ли жечь время)? Роль zero-shot (CLAP) в пилоте — участник benchmark или только советник разметки?
- **OQ5 (Структурщик).** `validate:vdr` — что реально нужно: счётчики/полнота/дубликаты + опциональная Kappa? Куда: `scripts/` + `yarn validate:vdr`. CI-гейт на разметку (как в плане дня) — нужен ли, если разметка ручная и редкая? (осторожно: свежий ci-gate-stabilization спринт против лишних обязательных чеков).
- **OQ6 (Структурщик).** Bookkeeping: архивирование VDR1–VDR3 (+VDR4 c notes «цель не достигнута, отчёт в DETECTOR_CALIBRATION.md») — сейчас или вместе с VDR6?
- **OQ7 (Верстальщик).** Если пилот на fv1-каталоге (D2-B): в UI разметки нужен фильтр «не размечено» и прогресс-каунтер? Мелочь или задача?
- **OQ8 (Teamlead).** Связь с параллелями дня: zero-shot scaffold (эшелон 1.B) и STAGE_GATE_1_TO_2 doc — их DoD зависят от решений D1–D4; зафиксировать порядок.

---

## Формат ожидаемого решения

- Таблица «Вопрос → Решение» по D1–D6 (да/нет/отложено с условием).
- Если новый эпик — имя, размер, фазы, DoD; если пилот внутри VDR — правка эпик-промпта.
- Протокол качества разметки — одним абзацем в `DATASET_CURATION.md` (готовая формулировка).
- Definition of Done пилота (объём, метрика качества, критерий «годен для hard-gate benchmark»).

---

## Запуск

```bash
yarn consilium \
  --topic-file docs/VDR_VALIDATION_SCOPE_BRIEF.md \
  --save-as vdr-validation-scope \
  "Реши судьбу эпика VDR и scope пилота валидации (см. topic-file): VDR1-3 done (120/120, \
   sign-off 2026-06-14), VDR4 провален (DSP 50% vs цель 80%), trends прошёл мягкий gate 95/30 \
   на новом fv1-каталоге; hard-gate 85/90 требует нового датасета. Реши D1-D6 и OQ1-OQ8: \
   закрытие эпика, источник и размер пилота, протокол качества разметки без второго \
   человека-аннотатора (Kappa неприменима), reuse VDR2-UI вместо нового annotation-ui, DoD."
```
