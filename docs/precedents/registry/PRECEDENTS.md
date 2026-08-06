# PRECEDENTS — снимок-реестр (производный, руками не править)

> Meta · Date: 2026-08-06 · SHA: 4cfe557e · Source: docs/precedents/*.md
> Пересобрать: `yarn precedent:register --rebuild`. Источник истины — файлы прецедентов.

Всего прецедентов: **24** · различных классов: **6** · доля рецидива: **75%** (ориентир ≤15%).

## Рецидив по классам

| Класс | Прецедентов |
|-------|-------------|
| session-report | 7 ⚠ рецидив |
| tooling-gap | 7 ⚠ рецидив |
| ritual-mechanics-vs-value | 4 ⚠ рецидив |
| cold-start | 3 ⚠ рецидив |
| reporting-gap | 2 ⚠ рецидив |
| task-lifecycle | 1 |

## Прецеденты

| Дата | Класс | Прецедент | Корень |
|------|-------|-----------|--------|
| 2026-07-21 | ritual-mechanics-vs-value | [2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail](../2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail.md) | ритуал прошёл механически, ценность не создана |
| 2026-07-21 | session-report | [2026-07-21-morning-ritual-session-report-7f931953-ca19-490e-a919-6ca27a60a8c9](../2026-07-21-morning-ritual-session-report-7f931953-ca19-490e-a919-6ca27a60a8c9.md) | сырой отчёт сессии (фактура, не класс) |
| 2026-07-21 | cold-start | [2026-07-21-ritual-old-scenario-lost-sprint](../2026-07-21-ritual-old-scenario-lost-sprint.md) | холодная сессия детерминированно идёт по устаревшему скиллу |
| 2026-07-22 | reporting-gap | [2026-07-22-empty-night-not-reported-first](../2026-07-22-empty-night-not-reported-first.md) | существенный empty-state не доложен первой репликой |
| 2026-07-22 | cold-start | [2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-cold-start-autostart](../2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-cold-start-autostart.md) | холодная сессия детерминированно идёт по устаревшему скиллу |
| 2026-07-22 | session-report | [2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-honest-linear-sprint-foundation](../2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-honest-linear-sprint-foundation.md) | честное заземление спринта без декларации |
| 2026-07-23 | tooling-gap | [2026-07-23-manual-mint-invisible-to-cascade](../2026-07-23-manual-mint-invisible-to-cascade.md) | Документированный ручной путь не имеет представления в гейте, который его судит |
| 2026-07-23 | ritual-mechanics-vs-value | [2026-07-23-night-merged-not-deployed](../2026-07-23-night-merged-not-deployed.md) | Работа принята мерджем, но не доехала до среды исполнения: зелёные гейты слияния |
| 2026-07-23 | ritual-mechanics-vs-value | [2026-07-23-oneshot-issue-closed-without-procedure](../2026-07-23-oneshot-issue-closed-without-procedure.md) | Issue закрыт мерджем промпта или карточки, DoD продукта не выполнен |
| 2026-07-23 | reporting-gap | [2026-07-23-wrong-tree-main-day-request](../2026-07-23-wrong-tree-main-day-request.md) | существенный факт топологии worktree не доложен первой репликой |
| 2026-07-24 | session-report | [2026-07-24-align-all-worktrees-to-main](../2026-07-24-align-all-worktrees-to-main.md) | Параллельные сессии в разных worktree накопили дивергенцию; общий origin/main уш |
| 2026-07-24 | tooling-gap | [2026-07-24-consilium-green-but-hollow](../2026-07-24-consilium-green-but-hollow.md) | LLM-процедура без служебного фрейма «провода» молча деградирует: сигнал утоплен  |
| 2026-07-24 | tooling-gap | [2026-07-24-evening-ritual-conduct-channel-gap-and-swallow-links](../2026-07-24-evening-ritual-conduct-channel-gap-and-swallow-links.md) | Объявленный шаг ритуала (вечер) не покрыт тулингом на своём пути: каналы только  |
| 2026-07-25 | tooling-gap | [2026-07-25-bridge-open-three-days-close-step-has-no-carrier](../2026-07-25-bridge-open-three-days-close-step-has-no-carrier.md) | Канон описывает шаг жизненного цикла (bridge-close) как обязанность соседней про |
| 2026-07-25 | tooling-gap | [2026-07-25-bridge-room-declared-cast-without-carriers](../2026-07-25-bridge-room-declared-cast-without-carriers.md) | Агент оформляет декларацию (состав комнаты, ответственный в карточке) в артефакт |
| 2026-07-25 | ritual-mechanics-vs-value | [2026-07-25-morning-ritual-silent-magistral-inherit-and-dead-channels](../2026-07-25-morning-ritual-silent-magistral-inherit-and-dead-channels.md) | Ритуал считает гейт магистрали пройденным по наличию любого sources[0], не по св |
| 2026-07-25 | session-report | [2026-07-25-tasks-workshop-map-lookup](../2026-07-25-tasks-workshop-map-lookup.md) | Дом docs/tasks имеет primary-workshop с манифестом и границей V2; знание размаза |
| 2026-07-26 | tooling-gap | [2026-07-26-affine-editor-paradigm-impedance](../2026-07-26-affine-editor-paradigm-impedance.md) | Инструмент выбран по КЛАССУ («редактор документов»), а нужен по СПОСОБУ работы ( |
| 2026-07-26 | task-lifecycle | [2026-07-26-issue-979-selfclose-premature-github-close](../2026-07-26-issue-979-selfclose-premature-github-close.md) ✗ | Issue закрыта без task:archive и без DoD — active-карточка и GitHub расходятся |
| 2026-07-29 | cold-start | [2026-07-29-greeting-stale-picture-from-memory-cache](../2026-07-29-greeting-stale-picture-from-memory-cache.md) | Холодная сессия озвучивает картину состояния из кеша (память + локальный git-сни |
| 2026-07-31 | session-report | [2026-07-31-orphan-tests-subject-unresolved-not-missing-rule](../2026-07-31-orphan-tests-subject-unresolved-not-missing-rule.md) | Предупреждение прибора называет причину остатка, которая в этом прогоне не задей |
| 2026-07-31 | session-report | [2026-07-31-scripts-workshop-lookup-orphans-sets-atlas](../2026-07-31-scripts-workshop-lookup-orphans-sets-atlas.md) | Приоритет между протоколом хука SessionStart и каноном проекта не зафиксирован — |
| 2026-08-02 | tooling-gap | [2026-08-02-review-blindness-scales-with-diff](../2026-08-02-review-blindness-scales-with-diff.md) | Механизм проверяет, что шаг отработал, но не что утверждение шага истинно |
| 2026-08-06 | session-report | [2026-08-06-worktree-remove-bypassed-controlled-demolition](../2026-08-06-worktree-remove-bypassed-controlled-demolition.md) | Агент выполнил радикальную операцию raw-командой, имея санкционированный глагол  |

