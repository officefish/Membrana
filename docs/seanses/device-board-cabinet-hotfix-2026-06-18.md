# Консилиум: device-board + cabinet hotfix (prod UX)

> **Дата:** 2026-06-18  
> **Эпик:** `device-board-cabinet-hotfix`  
> **Тема:** [`docs/prompts/DEVICE_BOARD_CABINET_HOTFIX_CONSILIUM_TOPIC.md`](../prompts/DEVICE_BOARD_CABINET_HOTFIX_CONSILIUM_TOPIC.md)  
> **Участники:** Teamlead (Vesnin), Структурщик, Верстальщик (Rodchenko), Ozhegov (service/cabinet), Музыкант (smoke QA)

---

## Повестка

Пять замечаний prod QA после DBR6. Нужны архитектурные решения до кодирования.

---

## Teamlead (Vesnin) — постановка

Приоритет **P0 hotfix**: layout борда и ops узлов/ключей блокируют демо и ежедневную работу на `cabinet.membrana.space`. Эпик **M**, один milestone deploy после merge. Не смешивать с DBR0–DBR5. Ветка `ozhegov-module-catalog-v1`.

**Решение:** пять подзадач DBH0…DBH4; DBH0+DBH1 — один PR в `device-board`; DBH2 — cabinet SPA; DBH3+DBH4 — cabinet-api + cabinet UI (можно один PR backend, один frontend).

---

## HF1 — Canvas fullscreen, сайдбары overlay

### Структурщик

Текущая схема «flex siblings» противоречит §15 «fullscreen editor» и §8 «панели не сжимают рабочую область». Канвас — **единственный sizing-child** блока под header; сайдбары — **sibling-слой overlay**, не flex-column участники ширины.

**Паттерн:**

```text
┌──────────────────────────────────── header ────────────────────────────────────┐
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌─ canvas (absolute inset-0, z-0) ─────────────────────────────────────────┐ │
│ │                     React Flow full viewport                              │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│ ┌left z-20┐                                              ┌right z-20┐        │
│ │ palette │                                              │ inspector│        │
│ └─────────┘                                              └──────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- `relative flex-1 min-h-0 overflow-hidden` на контейнере.
- Сайдбары: `absolute top-0 bottom-0`, фон `bg-base-100/95 backdrop-blur-sm`, тень `shadow-lg` для читаемости поверх графа.
- Collapse: width → 0 или `w-10` strip; канвас **не** пересчитывается.

**Риск:** React Flow `onInit` fitView — вызывать после mount; resize observer не нужен при overlay (размер main не меняется при toggle sidebar).

**LGTM** на DBH0.

### Верстальщик (Rodchenko)

Реализация в `device-board-shell.tsx`: убрать `flex` row с `shrink-0` сайдбарами. Проверить a11y: сайдбары `role="complementary"`, focus trap не обязателен (не modal). Z-index: header z-30, sidebars z-20, canvas z-0.

Smoke: `apps/cabinet` `/device-board`, `apps/client` если shell там же — regression только visual.

---

## HF2 — Ширина сайдбаров

### Верстальщик (Rodchenko)

Фиксированные `w-56`/`w-72` на wide monitor съедают ~512px. **Clamp:**

| Панель | CSS |
|--------|-----|
| Left | `w-[clamp(11rem,13vw,14rem)]` (~176–224px) |
| Right | `w-[clamp(12rem,15vw,16rem)]` (~192–256px) |

На viewport `<1280px` — не auto-hide в этом hotfix (есть collapse toggle); при необходимости follow-up.

**LGTM** DBH1 в том же PR что DBH0.

### Структурщик

Согласен. Не вводить JS resize hooks — чистый CSS clamp достаточен.

---

## HF3 — Delete node, тариф 1 узел, revoke keys

### Ozhegov

**Факты:**

- `createNode` + `assertNodeLimit` есть; `deleteNode` **нет**.
- Prisma: `Node` delete → cascade `NodeAccessKey`, `Device`.
- Seed/migration MP7B выставили `maxNodesPerMembrane: 2` — расходится с продуктом «1 узел на free».

**API `DELETE /v1/nodes/:nodeId`:**

1. Auth + membrane ownership.
2. `revokeAccessKey` для всех ключей с `revokedAt IS NULL` (invalidate pair session на Device).
3. `prisma.node.delete({ where: { id } })`.

Каскад удалит keys/device rows. Revoke-before-delete нужен для **инвалидации live session** на клиенте (тот же код что `revokeAccessKey`).

**Тариф:** data migration `free-v1` → 1; seed sync. **Не** удалять второй узел автоматически — пользователь с 2 legacy узлами удалит лишний через UI.

**UI:** кнопка «Удалить» на карточке узла, confirm с текстом «Будут отозваны N ключей, сопряжение разорвано».

**Минимум узлов:** 0 допустим (пустая мембрана); create снова до лимита 1.

### Teamlead

LGTM. Один PR DBH3: backend + NodesPage + migration + seed.

### Музыкант

После delete — проверить field client: paired device должен потерять доступ (401/invalid session). Smoke вручную.

---

## HF4 — Узлы и ключи: два раздела

### Teamlead

RT5 временно объединил nav для prod deploy. Продуктовое решение **откатываем**: два пункта меню по умолчанию.

### Верстальщик (Rodchenko)

`CabinetShell`: default = split (`nodes` + `keys`). Combined `nodes-keys` — только при `VITE_CABINET_NODES_KEYS_COMBINED=true` (opt-in для QA). Убрать необходимость ставить `SPLIT=true` в prod.

Cross-link: на `NodesPage` у каждого узла ссылка «Ключи →» с `?nodeId=`.

### Структурщик

Маршруты `/nodes`, `/keys` уже есть — только nav flags. Out of scope: объединённая страница tabs.

**LGTM** DBH2 — isolated cabinet PR.

---

## HF5 — Purge expired keys

### Ozhegov

`purgeRevokedAccessKeys` фильтрует `revokedAt != null`. Просроченные (`expiresAt < now()`, `revokedAt null`) остаются навсегда.

**Решение:**

- Переименовать семантику endpoint (или расширить): purge **inactive** = `(revokedAt IS NOT NULL) OR (expiresAt < NOW())`.
- UI: «Очистить неактивные»; для expired строки — кнопка «Удалить» (single `DELETE /v1/access-keys/:id` с тем же guard «не active»).

Active key (`!revoked && expiresAt >= now`) — delete запрещён, только revoke.

### Teamlead

Не плодить два bulk endpoint — один purge inactive. Single delete — опционально, но улучшает UX для одного зависшего ключа.

**LGTM** DBH4.

---

## Сводка решений

| ID | Решение | PR scope |
|----|---------|----------|
| **DBH0** | Canvas `absolute inset-0`; sidebars overlay `z-20` | `device-board` |
| **DBH1** | `clamp(11rem,13vw,14rem)` / `clamp(12rem,15vw,16rem)` | `device-board` (с DBH0) |
| **DBH2** | Split nav default; combined opt-in flag | `apps/cabinet` |
| **DBH3** | `DELETE /v1/nodes/:id` + revoke active keys; free-v1 maxNodes=1 | `background-cabinet` + `apps/cabinet` |
| **DBH4** | Purge inactive (expired ∪ revoked); UI + optional single delete | `background-cabinet` + `apps/cabinet` |

---

## Риски и follow-up

| Риск | Митигация |
|------|-----------|
| Клики «сквозь» прозрачный сайдбар | `pointer-events-auto` на панелях, opaque/blur фон |
| Пользователь удаляет единственный узел с live device | Ожидаемо: session invalid; QA checklist |
| Два PR в API без migrate order | Одна migration file в DBH3 |
| CONCEPT §8 текст про flex | Однострочное уточнение overlay в DBH0 PR |

---

## Итог Teamlead

**Консилиум закрыт.** Эпик `device-board-cabinet-hotfix` → реализация по [`DEVICE_BOARD_CABINET_HOTFIX_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_CABINET_HOTFIX_EPIC_PROMPT.md). Deploy prod после merge всех DBH*. Issue GitHub — создать при старте работ (label `hotfix`, milestone cabinet).

**Следующий шаг:** агент / разработчик открывает PR DBH0+DBH1 в `device-board`, параллельно DBH2; затем DBH3+DBH4.
