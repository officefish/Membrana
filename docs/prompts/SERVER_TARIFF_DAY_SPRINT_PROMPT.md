# Day sprint: Server Tariff Enforcement v1 (STE)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) · [`SERVER_TARIFF_ENFORCEMENT_V1_EPIC_PROMPT.md`](./SERVER_TARIFF_ENFORCEMENT_V1_EPIC_PROMPT.md)  
> **Реестр:** `id` = **`server-tariff-enforcement-v1`** · `sprintKind` = **`day-sprint`**  
> **GitHub Issue:** [#150](https://github.com/officefish/Membrana/issues/150) (создать/привязать при triage)  
> **Стратегическая волна:** **W5** (free tier close) · продуктовый блокер для user workspace  
> **Статус:** **active** · старт 2026-06-23  
> **Размер:** **L** (4–5 PR)

---

## Контекст (баг + эпик)

**Симптом (prod/paired):** при попытке создать **второй** user workspace оператор получает ошибку сохранения (403 Forbidden или ложное сообщение о квоте), хотя на free-v1 допустимо **3** слота.

**Корневые причины (intake):**

| # | Причина | Слой |
|---|---------|------|
| 1 | Cabinet **не передавал** `maxUserWorkspaces` в media sync при pair (только storage/buffer) | `background-cabinet` |
| 2 | Client **не парсил** NestJS 403 body `{ message: { code: WORKSPACE_QUOTA_EXCEEDED, used, max } }` | `apps/client` |
| 3 | На media могли остаться **сироты** от smoke / старых client (used на сервере > видимых в launcher) | media + reconcile |
| 4 | Квота enforced на media (W1), но **без** cabinet sync и client UX — оператор видит неясную ошибку | STE v1 gap |
| 5 | **Media `assertDeviceScenarioDocument` принимал только v1**, client создаёт **v2** (`createEmptyDeviceScenarioDocument`) → **400** на 2-й сценарий | `device-scenario-assert.ts` |

**Связанные коммиты:** `8db252a` (client quota UX), `c47f2c4` (media W1).

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-STE-SPRINT** | Оформить как **day-sprint** (не night-build): prod-smoke и deploy media/cabinet допустимы днём |
| **D-STE-B0** | P0: второй сценарий создаётся на чистом device при used&lt;max; при quota — явный `used/max` + refresh списка |
| **D-STE-TARIFF** | Тариф: cabinet `Tariff` → snapshot на media `Device` → client `resolveWorkspaceTariff` |

---

## Фазы day-sprint

| Phase | Task id | Статус | Deliverable |
|-------|---------|--------|-------------|
| **W1** | `ste-v1-w1-media-quota` | **done** `c47f2c4` | Media PUT 403, Device.maxUserWorkspaces |
| **B0** | `ste-v1-b0-second-workspace` | **done** `e67a427` | Cabinet sync, client 403, list quota, media v2 assert |
| **W2** | `ste-v1-w2-cabinet-sync` | **done** (B0) | pair → media membrane PATCH |
| **W3** | `ste-v1-w3-client-403` | **done** (B0) | WorkspaceQuotaExceededError |
| **D1** | `ste-v1-d1-docs` | **done** | TARIFF_MATRIX, user-workspace.mdx, deploy note |
| **S1** | `ste-v1-s1-prod-smoke` | **ready** | smoke script extended; **deploy отложен** |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор Membrana (Vesnin). Day-sprint **`server-tariff-enforcement-v1`**. Issue **#150**. Порядок: **B0 → D1 → S1 prod deploy/smoke**.

### Что построить (B0)

1. **Cabinet:** `MediaMembraneContext.maxUserWorkspaces`; `pair.service` передаёт в register/sync.
2. **Media:** `GET device-workspaces` → `userWorkspacesQuota: { used, limit }`.
3. **Client:** `WorkspaceQuotaExceededError`; parse 403; launcher refresh list on quota.
4. **Verify:** paired create 1st + 2nd workspace; при 3 сиротах на сервере — launcher показывает 3/3 и понятное сообщение.

### Definition of Done (sprint)

- [x] Код: media v1–v2 assert, cabinet sync, client 403, list quota (коммиты `034950f`…`e67a427`)
- [x] D1 docs + smoke script (STE checks)
- [ ] **Deploy** media+cabinet одним заходом (`yarn cabinet:u10-workspace:prod`)
- [ ] `yarn cabinet:u10-workspace:smoke` на prod после deploy
- [ ] Ручная проверка: 2-й сценарий в launcher (local client)
- [ ] Отчёт в Issue #150 · `yarn task:archive` для эпика

### Out of scope

- Billing / indie tariff seeds
- Downgrade purge лишних workspace
- Night-build only refactor

### Stop rules

- 2 CI fail подряд на одной фазе → handoff в Issue, не расширять scope

---

## Заметки для постановщика

1. `yarn main-day-issue` — выставить `primaryFocusId: server-tariff-enforcement-v1`.
2. Deploy: `media:migrate` + cabinet image после merge B0.
3. Client — local dev build до появления client deploy pipeline.
