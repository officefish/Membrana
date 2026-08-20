# Membrana local sprint log

Хронология локальных спринтов (`sprintKind: membrana-local-sprint` в реестре).
Активный спринт — [`LOCAL_SPRINT_ACTIVE.md`](./LOCAL_SPRINT_ACTIVE.md).

---

## 2026-08-20 — `media-per-device-token` — **OPEN**

- **Goal:** реализация ADR-0028 Р1+Р2: per-device client key media вместо служебного
  `MEDIA_API_TOKEN` в `PairResponse.mediaToken`, плюс revoke cascade от `pairedKey`.
- **Task:** `media-per-device-token` (Issue с первым PR по DoD)
- **OPEN:** [`local-sprint/media-per-device-token/OPEN.md`](./local-sprint/media-per-device-token/OPEN.md)
- **Prompt:** [`prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md`](./prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md)
- **Cut:** [`sprint/cut/media-per-device-token.json`](./sprint/cut/media-per-device-token.json) · ждёт ратификации владельца в чате
- **Boundary:** Р3/Р4, `apps/client`, изменение формы `PairResponse`, prod deploy — вне прогона.

## 2026-08-08 — `static-mmbrn-inventory-export` — **CLOSED**

- **Goal:** offline, read-only Affine source snapshot extractor with sealed exact-set manifest
- **Task:** `static-mmbrn-inventory-export` (#1305-A), parent `static-mmbrn-container`
- **OPEN:** [`local-sprint/static-mmbrn-inventory-export/OPEN.md`](./local-sprint/static-mmbrn-inventory-export/OPEN.md)
- **CLOSURE:** [`local-sprint/static-mmbrn-inventory-export/CLOSURE.md`](./local-sprint/static-mmbrn-inventory-export/CLOSURE.md)
- **Gate:** recut v2 · 3/3 `honest_pair` · 0 findings · focused tests 16/16
- **Boundary:** live source snapshot and INV-1 remain `NOT_PERFORMED`; S5 excluded
- **Delivery:** exact-SHA `0b559221` LGTM · PR #1806 merged as `741a4033` · task archived

---

## 2026-08-02 — `harness-product-deploy-2026-08-02` — **CLOSED**

- **Goal:** отдельные страницы 13 мастерских и 23 процедур, честный marathon debt,
  production deploy Product и Harness
- **Issue:** [#1622](https://github.com/officefish/Membrana/issues/1622)
- **OPEN:** [`local-sprint/harness-product-deploy-2026-08-02/OPEN.md`](./local-sprint/harness-product-deploy-2026-08-02/OPEN.md)
- **CLOSURE:** [`local-sprint/harness-product-deploy-2026-08-02/CLOSURE.md`](./local-sprint/harness-product-deploy-2026-08-02/CLOSURE.md)
- **Delivery:** PR #1650 merged; Product and Harness custom domains verified
- **Prompt:** [`prompts/HARNESS_WORKFLOW_PAGES_PROMPT.md`](./prompts/HARNESS_WORKFLOW_PAGES_PROMPT.md)

---

## 2026-08-02 — `product-mintlify-container-2026-08-02` — **CLOSED**

- **Goal:** формальный Product Mintlify на базе `apps/docs`: Device Board, узлы,
  тарифная проекция и контракт `product.mmbrn.tech`
- **Issue:** [#1622](https://github.com/officefish/Membrana/issues/1622)
- **OPEN:** [`local-sprint/product-mintlify-container-2026-08-02/OPEN.md`](./local-sprint/product-mintlify-container-2026-08-02/OPEN.md)
- **Prompt:** [`prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`](./prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md)
- **Next:** `harness-workflow-pages` получает свежий cut после закрытия Product

---

## 2026-08-01 — `procedure-run-journal-2026-08-01` — **OPEN**

- **Goal:** журнал прогона процедур: local trail с subject/evidence/gaps, чтобы прогон доказывал покрытие предмета, а не только факт запуска
- **OPEN:** [`local-sprint/procedure-run-journal-2026-08-01/OPEN.md`](./local-sprint/procedure-run-journal-2026-08-01/OPEN.md)
- **Prompt:** [`prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`](./prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md)
- **F1:** `procedure-run-journal-f1-local-trail` — code pass; local JSONL trail + CLI + tests; report [`F1_REPORT.md`](./local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md)
- **Review-sprint:** `procedure-run-journal-2026-08-01-code-review` — `sprint:cut` contract, владелец ратифицировал v1/v2/v3, Дынин/Веснин/Ожегов дали LGTM после BLOCK fixes, `sprint:gate` exit 0
- **Procedure note:** исходный проход был blocked из-за отсутствия pre-work frames; закрывающий review-sprint прошёл как отдельный честный прогон с evidence
