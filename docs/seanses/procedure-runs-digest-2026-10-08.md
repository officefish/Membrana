# Витрина пяти опор — прогоны процедур за 7 дн. (по 2026-10-08)

Окно: 2026-10-02T00:00:00.000Z → 2026-10-08T23:59:59.999Z

| Опора | Прогоны | pass | fail | blocked | skipped | Сироты | Трения (непогашенные) |
|---|---|---|---|---|---|---|---|
| membrana-local-sprint | 14 | 5 | 0 | 0 | 0 | 0 | 0 (0) |
| ritual-day | 13 | 3 | 10 | 0 | 0 | 1 | 9 (9) |
| ritual-evening | 8 | 0 | 7 | 0 | 0 | 1 | 13 (13) |
| meeting | 0 прогонов | 0 | 0 | 0 | 0 | 0 | 0 (0) |
| one-shot | 0 прогонов | 0 | 0 | 0 | 0 | 0 | 0 (0) |

Вне пяти опор: deploy-media-vps (32) · deploy-office-vds (4)

## Отказы без трения (#2413)

Закрытия, заявившие дыру в покрытии и ни одного трения: графа «Трения (непогашенные)» выше занижена ровно на эти отказы.

- ritual-evening · ritual-evening-2026-10-02#2 · 2026-10-02T18:00:37.244Z — gaps: deliver-to-main: не дошло — цепочка остановлена лимитом времени фоновой задачи на шаге archivarius-evening; хвост evening-tail прогнан отдельно (--only), доставка — отдельным PR
- deploy-media-vps · deploy-media-vps-2026-10-03#2 · 2026-10-03T12:40:48.473Z — gaps: exit:1
- deploy-media-vps · deploy-media-vps-2026-10-03#2 · 2026-10-03T16:03:43.597Z — gaps: exit:1
- deploy-media-vps · deploy-media-vps-2026-10-07-r3#2 · 2026-10-07T16:23:13.811Z — gaps: exit:1
- deploy-media-vps · deploy-media-vps-2026-10-07-r4#2 · 2026-10-07T16:23:30.727Z — gaps: exit:1
- deploy-media-vps · deploy-media-vps-2026-10-07-r5#2 · 2026-10-07T16:26:55.046Z — gaps: exit:1
- deploy-media-vps · deploy-media-vps-2026-10-07-r6#2 · 2026-10-07T16:27:08.146Z — gaps: exit:1
- deploy-media-vps · deploy-media-vps-2026-10-07-r8#2 · 2026-10-07T16:40:16.162Z — gaps: exit:1
