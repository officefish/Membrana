# Заседание static-mmbrn-container — протокол контейнера

| Поле | Значение |
|---|---|
| id | `static-mmbrn-container` |
| предмет | контракт контейнера оригиналов на `static.mmbrn.tech` и роль Affine под ним |
| вход | расследование текущего Affine 03.08.2026; Issue #1303 и #1305 |
| председатель | Codex, текущая сессия |
| аудитор | **Codex S-M5 Read-Only Auditor, static-mmbrn-container, 2026-08-03** (agent `019fc720-8fec-7c63-8d9f-28a52e2fb5c2`), отдельный от председателя |
| предаудит | [`AUDIT_READ_ONLY.md`](AUDIT_READ_ONLY.md) — PASS до запуска M0 |
| задание | [`MEETING_BRIEF.md`](MEETING_BRIEF.md) |
| состояние | M2 run11 отклонён; первый intake run12 остановлен до API из-за размера; компактная повестка прошла повторный предаудит и готова к созыву |

## Ход заседания

| Комната | Вопрос | Состояние | Протокол |
|---|---|---|---|
| **M0** | порядок семи вопросов | **PASS; РАТИФИЦИРОВАНО владельцем 2026-08-03** | [`протокол`](../../seanses/static-mmbrn-container-m0-order-2026-08-03.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run1-false-dag.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run2-missing-affine-edge.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run3-premature-ratification.md) · [`run4`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run4-second-carrier.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run5-access-granularity.md) · [`run6`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run6-access-identity-dependency.md) |
| **M1** | граница контейнера | **PASS; ЗАКРЫТА** | [`протокол`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) · [`повестка`](M1_AGENDA.md) · восемь отклонённых прогонов перечислены в аудите |
| **M2** | тождество и источник истины | run1-run11 **BLOCK**; первый intake run12 fail-closed до API; повторный предаудит **PASS**, готова к созыву | [повестка](M2_AGENDA.md) |
| **M3..M7** | по одному вопросу в порядке M0 | не созывались | — |

## Гейт M0

Порядок вынесен в единственном инструментальном протоколе, прошёл независимый аудит и
ратифицирован владельцем сообщением «ратифицирую» 2026-08-03. Гейт M0 открыт; M1 можно
созывать. Более поздние комнаты по-прежнему ждут закрытия своих предшественников.
