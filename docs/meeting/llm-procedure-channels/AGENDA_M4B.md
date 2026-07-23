# M4b — повестка: панель на mmbrn.tech

> M4b · кандидат 3 · зависит от C1+T1+F1 · параллельно U1 · secretary

## **V1 — Какой минимальный UI/API поверхности панели v1 для каналов и учёта?**

Host (panel.mmbrn.tech), grant админа, экраны: сводка дня + переключатель/цепочка.
Не полный дизайн-система — контракт поверхности.

### Кандидаты (текст)

1. Раздел в существующем `apps/panel`: страница «LLM channels» (owner-only); day summary + per-procedure chain editor + badge source.
2. Отльный мини-SPA на subdomain — нет, слишком дорого.
3. Только read-only dashboard v1; write overlay — CLI/`yarn` до v1.1.
4. Ally видит агрегаты без имён моделей; owner — полный write.

### Форма вердикта + **список посылок обязателен.**
Запреты: не пересматривать SoT (C1); не менять поля T1; не fallback механизм (F1) — только отображение chain.
