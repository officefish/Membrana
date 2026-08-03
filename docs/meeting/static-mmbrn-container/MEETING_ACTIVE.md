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
| состояние | M2 ратифицирована; повестка M3 прошла независимый предаудит и ожидает разрешения владельца на первый созыв |

## Ход заседания

| Комната | Вопрос | Состояние | Протокол |
|---|---|---|---|
| **M0** | порядок семи вопросов | **PASS; РАТИФИЦИРОВАНО владельцем 2026-08-03** | [`протокол`](../../seanses/static-mmbrn-container-m0-order-2026-08-03.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run1-false-dag.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run2-missing-affine-edge.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run3-premature-ratification.md) · [`run4`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run4-second-carrier.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run5-access-granularity.md) · [`run6`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run6-access-identity-dependency.md) |
| **M1** | граница контейнера | **PASS; ЗАКРЫТА** | [`протокол`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) · [`повестка`](M1_AGENDA.md) · восемь отклонённых прогонов перечислены в аудите |
| **M2** | тождество и источник истины | **PASS; РАТИФИЦИРОВАНО владельцем 2026-08-03** | [`carrier`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) · [`повестка`](M2_AGENDA.md) · [`прецедент`](../../precedents/2026-08-03-static-mmbrn-m2-twenty-consilium-calls.md) |
| **M3** | доступ | **предаудит PASS; 0/5 внешних попыток; ожидает разрешения владельца** | [`повестка`](M3_AGENDA.md) |
| **M4..M7** | по одному вопросу в порядке M0 | не созывались | — |

## Гейт M0

Порядок вынесен в единственном инструментальном протоколе, прошёл независимый аудит и
ратифицирован владельцем сообщением «ратифицирую» 2026-08-03. Гейт M0 открыт; M1 можно
созывать. Более поздние комнаты по-прежнему ждут закрытия своих предшественников.

## Бюджет попыток

Владелец установил общий предел: не более пяти внешних попыток на комнату. После пятого
BLOCK председатель прекращает внешние вызовы и локально собирает носитель из материалов
неудачных прогонов. Для уже превысившей предел M2 run20 стал последним внешним carrier;
run21 не допускается.
