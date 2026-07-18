---
topic: "Сегодняшний ritual:day продемонстрирует… × Граф правды второй день вытесняет рутину…"
mode: derived
origin: pair:todays-ritual-will-demo-c1+truth-graph-displaces-its-own-purpose
status: checked
ttl: 14
date: 2026-07-17
---

# Сон системы: Сегодняшний ritual:day продемонстрирует… × Граф правды второй день вытесняет рутину…

**Пара кристаллов:** `todays-ritual-will-demo-c1__truth-graph-displaces-its-own-purpose`
**Общий корень:** `magistral-17-07-truth-graph`

## Вопрос к внешней практике

Наш вывод «Сегодняшний ritual:day продемонстрирует C1 на себе: план будет сгенерирован ДО проверки, и…» в сочетании с «Граф правды второй день вытесняет рутину, ради которой строится: живой MAIN_DAY_ISSUE сген…» — правда или бред? Что говорит внешняя практика 2025–2026?

## Результат проверки сна

**Догнано руками 17.07** (контур `night:research` формулирует сон, но в Perplexity не ходит — S6 half-built; Perplexity доступен через туннель `127.0.0.1:12334`, HTTP 200; вопрос дежаргонизирован руками — `externalizeQuery` не дочистил `ritual:day`/`C1`/`MAIN_DAY_ISSUE`).

**Вердикт: сон — НЕ бред. Оба кристалла названы внешней практикой 2025–2026.**

1. **«План генерируется ДО проверки посылок» (C1)** — специфичного имени анти-паттерна нет, но это проявление **Improper Input Validation (CWE-20)** и нарушение принципа **Separate Responsibilities** (валидация не изолирована от исполнения). Защита: whitelisting («accept known good»), **layered validation** (проверка на нескольких стадиях), канонизация входа до валидации.

2. **«Инструмент вытесняет цель, ради которой построен»** — явно назван: **Goal Displacement** (= **Means-Ends Inversion**), теоретически управляется **законом Гудхарта** (когда мера становится целью, она перестаёт быть хорошей мерой). Рекомендации практиков: MVP с конкретными метриками против «полировки ядра»; приоритет value vs time/effort; **data-driven testing на исходы, не на соблюдение процесса**; threat modeling — не стал ли сам процесс валидации узким местом.

**Источники (Perplexity `sonar`):**
- CWE-20 Improper Input Validation — security-database.com/cwe.php?name=CWE-20
- OWASP Input Validation Cheat Sheet
- Nafees, Vulnerability Anti-Patterns (Abertay, 2017)
- ACM 10.1145/3551902.3551965

**Связь с проектом:** Goodhart/Goal-Displacement — прямая теоретическая опора под кристалл `truth-graph-displaces-its-own-purpose` и метрику `nightYield` (мера, чтобы граф правды не стал самоцелью). CWE-20/layered-validation — под кристалл `todays-ritual-will-demo-c1` и наш же гейт `main-day-probe` (проверка посылок ДО генерации плана).

> `adopted` проставляется ТОЛЬКО обратной ссылкой из реестра задач или инсайта
> (владельческий гейт), не этим контуром. Сейчас `status: checked` — проверено, находка есть, ждёт владельческого решения о принятии.
