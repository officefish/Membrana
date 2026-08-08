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
| состояние | M7 run4 BLOCK; внешний бюджет 4/5; предаудит run5 PASS, ожидается разрешение |

## Ход заседания

| Комната | Вопрос | Состояние | Протокол |
|---|---|---|---|
| **M0** | порядок семи вопросов | **PASS; РАТИФИЦИРОВАНО владельцем 2026-08-03** | [`протокол`](../../seanses/static-mmbrn-container-m0-order-2026-08-03.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run1-false-dag.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run2-missing-affine-edge.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run3-premature-ratification.md) · [`run4`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run4-second-carrier.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run5-access-granularity.md) · [`run6`](../../seanses/rejected/static-mmbrn-container-m0-order-2026-08-03-run6-access-identity-dependency.md) |
| **M1** | граница контейнера | **PASS; ЗАКРЫТА** | [`протокол`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) · [`повестка`](M1_AGENDA.md) · восемь отклонённых прогонов перечислены в аудите |
| **M2** | тождество и источник истины | **PASS; РАТИФИЦИРОВАНО владельцем 2026-08-03** | [`carrier`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) · [`повестка`](M2_AGENDA.md) · [`прецедент`](../../precedents/2026-08-03-static-mmbrn-m2-twenty-consilium-calls.md) |
| **M3** | доступ | **PASS; РАТИФИЦИРОВАНО владельцем 2026-08-04**; внешний бюджет закрыт **5/5** | [`carrier`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md) · [`повестка`](M3_AGENDA.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m3-access-2026-08-04-run1-seven-contract-defects.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m3-access-2026-08-04-run2-grant-revocation-threshold.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m3-access-2026-08-04-run3-inheritance-revocation-affine.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m3-access-2026-08-04-run5-final-external.md) · [`run4-прецедент`](../../precedents/2026-08-04-static-mmbrn-m3-run4-overlay-chain-exhausted.md) |
| **M4** | хранение и живучесть | **PASS local-synthesis; РАТИФИЦИРОВАНО владельцем 2026-08-05**; внешний бюджет закрыт **5/5** | [`carrier`](../../seanses/static-mmbrn-container-m4-storage-2026-08-04.md) · [`повестка`](M4_AGENDA.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m4-storage-2026-08-04-run1-m2-retention-restore-boundaries.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m4-storage-2026-08-04-run2-dedup-capacity-checkpoint-rpo-m6.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m4-storage-2026-08-04-run3-count-location-dedup-checkpoint-quota-m6.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m4-storage-2026-08-05-run5-final-external.md) · [`run4-прецедент`](../../precedents/2026-08-05-static-mmbrn-m4-run4-overlay-chain-rate-limit.md) |
| **M5** | роль Affine | **PASS local-synthesis; РАТИФИЦИРОВАНО владельцем 2026-08-06**; внешний бюджет закрыт **5/5** | [`carrier`](../../seanses/static-mmbrn-container-m5-affine-role-2026-08-06.md) · [`повестка`](M5_AGENDA.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m5-affine-role-2026-08-05-run1-m3-actions-m6-binding-readiness.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m5-affine-role-2026-08-05-run2-m3-semantics-m6-fd3-annotations.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m5-affine-role-2026-08-06-run3-false-m3-circular-set-fd3.md) · [`run4`](../../seanses/rejected/static-mmbrn-container-m5-affine-role-2026-08-06-run4-m3-owner-stale-m6-durability.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m5-affine-role-2026-08-06-run5-final-external-m6-reducer-annotations.md) |
| **M6** | приём и выдача | **PASS local-synthesis; РАТИФИЦИРОВАНО владельцем 2026-08-06**; внешний бюджет закрыт **5/5** | [`carrier`](../../seanses/static-mmbrn-container-m6-intake-delivery-2026-08-06.md) · [`повестка`](M6_AGENDA.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m6-intake-delivery-2026-08-06-run1-30-replies-m3-preview-idempotency.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m6-intake-delivery-2026-08-06-run2-m2-source-canonicalref-m3-atomicity-rpo.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m6-intake-delivery-2026-08-06-run3-surface-authority-m2-recovery-readiness.md) · [`run4`](../../seanses/rejected/static-mmbrn-container-m6-intake-delivery-2026-08-06-run4-m2-bytes-m3-audit-m4-capacity-reconcile.md) · [`run5`](../../seanses/rejected/static-mmbrn-container-m6-intake-delivery-2026-08-06-run5-final-external-surface-fingerprint-readiness.md) |
| **M7** | переезд и доставка | **run4 BLOCK**; внешний бюджет **4/5**; **предаудит run5 PASS**, ожидается разрешение | [`повестка`](M7_AGENDA.md) · [`run1`](../../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-06-run1-m3-actions-rollout-cycles-inventory-retirement-predicates.md) · [`run2`](../../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-07-run2-m3-objects-gate-cycles-m6-corpus-rollback-retirement.md) · [`run3`](../../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-07-run3-cyclic-dag-readiness-ledger-inventory-routes-retirement.md) · [`run4`](../../seanses/rejected/static-mmbrn-container-m7-migration-delivery-2026-08-08-run4-carrier-replies-cyclic-gates-m6-ledger-tables.md) |

## Гейт M0

Порядок вынесен в единственном инструментальном протоколе, прошёл независимый аудит и
ратифицирован владельцем сообщением «ратифицирую» 2026-08-03. Гейт M0 открыт; M1 можно
созывать. Более поздние комнаты по-прежнему ждут закрытия своих предшественников.

## Бюджет попыток

Владелец установил общий предел: не более пяти внешних попыток на комнату. После пятого
BLOCK председатель прекращает внешние вызовы и локально собирает носитель из материалов
неудачных прогонов. Для уже превысившей предел M2 run20 стал последним внешним carrier;
run21 не допускается.
