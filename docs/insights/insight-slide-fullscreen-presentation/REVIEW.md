# Review: Slide + fullscreen presentation

> Virtual team · 2026-06-25

[Teamlead]: Закрывает gap между engineer canvas и stakeholder demo. Связка с async narrative (Acts as slides) и Scenario Builder (Usability first). **Adopted** после comment profiles (H); export как tariff upsell — согласовано с platform. Fullscreen только edit mode — осознанное ограничение v0.

[Структурщик]: Отдельная сущность `ScenarioSlide` в core scenario model, не overload `boardGroup`. Presenter — thin module в device-board (viewport controller), export — client-side render + optional cabinet quota check. Не тащить slides в runtime executor. Оценка **8**.

[Математик]: Zoom policy = fit bounding box with min readable scale; node count limits — O(n) layout check before present. Export metering — debit per deck export in tariff ledger (как agent tokens). Оценка **6**.

[Музыкант]: Demo mic scenario для инвестора/оператора — slides «Act I connect → Act II record → Act IIb upload» без шума 32 nodes. Полезнее comment frames для **walkthrough**. Оценка **8**.

[Верстальщик]: Fullscreen chrome minimal; mode toggle Edit|Present; slide strip sidebar; export dialog with tariff badge. DaisyUI presenter overlay; a11y ←/→, Esc, live region «Slide 3/7». Оценка **9**.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | месяц–квартал | 8 |
| Структурщик | да | месяц | 8 |
| Математик | частично | квартал | 6 |
| Музыкант | да | месяц | 8 |
| Верстальщик | да | месяц | 9 |

**Средний балл:** 7.8

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **7.8** (паритет с scenario builder)
- Следующий шаг: spike `ScenarioSlide` schema + presenter POC на competition Alpha main branch
