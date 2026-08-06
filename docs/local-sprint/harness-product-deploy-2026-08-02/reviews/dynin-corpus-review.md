# Review pass: Harness corpus and generator

**Reviewer:** Dynin  
**Verdict:** LGTM  
**Exact SHA:** `a57d91c5fcda7c6ce44ed2427363c4bdaa3227fc`  
**Captured:** 2026-08-02T19:19:15+03:00

Первый проход дал BLOCK: семь `declared-not-built` процедур публиковались как
обычные страницы, а тесты подтверждали только количество файлов и отсутствие
дрейфа. На повторном проходе блокирующие находки сняты: основная навигация
содержит только процедуры с назначением и хотя бы одним операционным
свидетельством, а неполный корпус назван отдельно и копит долг через
`workflow-examples-marathon`.

Проверка содержательности, синхронности генерации и границы Product/Harness:
`node --test scripts/mintlify-workflow-docs.test.mjs` — 9/9.

