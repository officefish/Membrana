# INSIGHT: Тембровый детектор на MFCC: ловить портрет, а не гармонику

| Поле | Значение |
|------|----------|
| **ID** | `insight-mfcc-timbre-detector` |
| **Статус** | draft |
| **Источник** | user (слово владельца 30.07: «делается пока проверочный, два других стоит добавить через инсайты») |
| **Создан** | 2026-07-30 |

---

## Проблема / наблюдение

Владелец назвал третий детектор MFCC-ядра «вариантом гармонического, но уже на этом ядре».
Исследование `mfcc-lib-choice` (30.07) показало обратное по существу: **MFCC сжимает спектр в
низкоразмерную кепстральную огибающую и теряет гармоническую структуру** — расстояние между
гармониками, частные тоны, узкополосные детали. Именно там живут роторные боковые полосы дрона.

«Гармонический детектор на MFCC» — противоречие в терминах: признак выбрасывает ровно то, что
детектор обязан ловить. Но выброшенное — не всё, что там есть: **MFCC силён в том, от чего
гармонический анализ отказывается**, в широком тембровом портрете источника.

## Гипотеза

Если построить детектор, который **не претендует на гармонику**, а ловит **тембровый портрет**
цели — форму спектральной огибающей, устойчивую к смене оборотов и расстояния, — он даст класс
различений, недоступный ни трубе (мин-макс), ни тренду, ни гармоническому анализу: «похоже на
дрон по тембру» при размытой или отсутствующей гармонической решётке.

Для оператора: цель, у которой гармоника съедена ветром, шумом или расстоянием, всё ещё может
быть узнана. Для контура: **три детектора перестают быть тремя видами одного и того же** — труба
и тренд считают уровень, гармонический считает структуру, тембровый считает форму.

## Scope (черновик)

- **In scope:** детектор поверх MFCC-ядра, работающий с вектором коэффициентов как с портретом ·
  мера «расстояния» между портретами · порог как предикат, а не впечатление · проверка на своих
  253 звуках существующей лестницей (`scripts/lab-learning-curve.mjs`).
- **Out of scope:** выбор библиотеки MFCC (предмет `mfcc-lib-choice`) · гармонический анализ (он
  живёт на FFT-ядре и остаётся там) · витринная часть и тарифная привязка.

## Связи

- Родитель по существу: шторм [`storm-mfcc-as-sprint-test-2026-07-30`](../../storm/storm-mfcc-as-sprint-test-2026-07-30/REPORT.md)
- Основание находки: [`mfcc-lib-choice-DECISION.md`](../../tasks/research/mfcc-lib-choice-DECISION.md)
- Образец контура: `packages/services/fft-analyzer`; соседи — `packages/services/detectors/*`
- Сосед по решению владельца: `insight-mfcc-combined-two-cores`

## Вопросы для research (Q1–Q3)

1. **Landscape:** How do practitioners build acoustic detectors that classify a source by its MFCC
   "timbre fingerprint" rather than by harmonic structure? Which distance measures between MFCC
   vectors (Euclidean, cosine, DTW, GMM likelihood) are used in 2024-2026 for machine and vehicle
   sounds, and how are decision thresholds chosen without training a neural network?
2. **Fit:** For a small labelled dataset of a few hundred recordings of drone versus non-drone
   sounds, what is the minimum viable approach to build an MFCC-based timbre classifier that stays
   explainable — template matching against averaged MFCC profiles, simple statistical models, or
   something else — and what accuracy do such simple methods typically reach compared with neural
   approaches?
3. **Risk:** How stable is the MFCC timbre profile of one source across changes in distance,
   microphone, wind and rotor speed? Which normalisation techniques (cepstral mean subtraction,
   variance normalisation, channel compensation) are considered mandatory to keep profiles
   comparable, and what residual drift remains after them?

## Почему инсайт, а не блок спринта

Слово владельца: **сейчас делается только проверочный** детектор. Тембровый — не отложенная
работа, а **отдельная гипотеза без доказанной ценности**: пока не прошёл сравнительный прогон,
неизвестно, даёт ли MFCC различение на нашем материале вообще. Ставить его в нарезку до этого
значило бы предсказывать объём работы, предмет которой не определён — ровно тот класс промаха,
который петля опыта сегодня поймала трижды.
