# Промпт: синхронизация счётчиков, пагинация и очистка live-журнала (JS1–JS4)

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (4 PR) · **Размер:** **L** (фазы JS1–JS4)  
> **Ожидаемый артефакт:** 4 последовательных PR; каждый `Closes` подзадачу в GitHub Issue эпика.  
> **Реестр:** `id` = **`live-journal-sync-pagination`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Предпосылка:** эпики **#81** (TJ7–TJ10) и **#83** (JE1–JE5) закрыты; пагинация ≤50 и `clearByFilter` уже есть, но **счётчики client ≠ cabinet** и сервер «обрезает» списки.

**GitHub Issue:** `null` (создать `bug` / `imperfection` перед стартом JS1).

---

## Контекст продукта

Оператор paired-сценария видит рассинхрон:

| Место | Все | Треки | Симптом |
|-------|-----|-------|---------|
| **Client** (журнал узла) | 176 | 161 | Полный локальный кэш |
| **Cabinet** (сервер) | 65 | 50 | Ровно **50 треков** — подозрение на cap API |

Ожидание product:

1. **Счётчики** в фильтрах («Все», «Треки», «Отчёты», «Обнаружения») **одинаковы** на client и cabinet для одного `mediaDeviceId`.
2. **Пагинация** — только если в **активном фильтре** > 50 строк (пример: 60 треков + 15 обнаружений → pager у «Треки», без pager у «Обнаружения»).
3. **Очистка** по фильтру — одинаковая семантика client/cabinet; очистка с одной стороны отражается на другой без ручного «Обновить».

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_UX_EPIC_PROMPT.md) | TJ9: `LIVE_JOURNAL_PAGE_SIZE = 50` |
| [`TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md`](./TELEMETRY_JOURNAL_EVENT_DRIVEN_EPIC_PROMPT.md) | JE5: `clearByFilter`, hub refresh |
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Client ↔ cabinet journal |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Hub, границы client/cabinet |
| [`DESIGN.md`](../DESIGN.md) | Pager, loading, a11y |
| [`TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) | Issue / PR |

---

## Диагностика (root cause, зафиксировано в коде)

### RC1 — сервер обрезает источник merge до 50 строк **на каждую таблицу**

`JournalService.listJournalItems` вызывает `listReports` / `listLiveRecords` с `MERGED_FETCH_CAP = 1000`, но `parseJournalListLimit` **всегда cap'ит до 50**:

```typescript
// packages/background-cabinet/src/modules/journal/journal.service.ts
const MAX_LIST_LIMIT = LIVE_JOURNAL_PAGE_SIZE; // 50
return Math.min(n, MAX_LIST_LIMIT);
```

Итог: в merged-пул попадает **не более 50 reports + 50 tracks** независимо от cursor. Cursor листает только этот усечённый набор → cabinet не видит старые записи; счётчик треков «залипает» на 50.

### RC2 — client pull только **добавляет**, не удаляет

`SyncJournalStorageBackend.fetchRemoteItems` запрашивает **одну** страницу `listJournalItems` (без обхода cursor).  
`MemoryJournalStorageBackend.mergeRemoteItems` — **append-only** по `clientEntryId`; удаления на сервере не отражаются.

Итог: client копит локальный кэш (localStorage + append) → 176/161 при 65/50 на сервере.

### RC3 — пагинация UI в целом верная, но питается **разными данными**

`TelemetryJournalModule` / `useCabinetLiveJournal` считают `totalPages` от `filtered.length` активного фильтра — контракт TJ9 соблюдён **если** `items` полные и актуальные. При RC1/RC2 pager и badge-счётчики вводят в заблуждение.

### RC4 — очистка cabinet → client не синхронизируется

- Client `clearByFilter` → `deleteJournalItems` на API + локальный clear (**OK**).
- Cabinet `deleteJournalItems` → reload cabinet (**OK**).
- Client **не** узнаёт об очистке с cabinet до ручного refresh; merge не убирает «осиротевшие» строки.

Hub `liveJournalHub` сегодня публикует только `journalSnapshotUpdated` (append), **нет** `journalCleared`.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Отдельный эпик JS1→JS4, не смешивать с MFCC/калибровкой. Сначала server truth (JS1), потом client reconcile (JS2),
затем контрактные тесты pager (JS3), затем clear sync (JS4). Каждый PR — CI + paired smoke: счётчики client=cabinet.

[Структурщик — Ozhegov]:
Разделить «page size для UI/API» (50) и «internal fetch для merge» (отдельная константа или без cap).
Ответ journal-items расширить: items + nextCursor + counts по фильтрам (authoritative с сервера).
SyncJournalStorageBackend: fetchAllPages (cursor walk) + reconcile (replace by clientEntryId set), не merge-only.
Новый hub event journalCleared { filter, mediaDeviceId?, deletedCount } — client subscribe → service.refresh().
Cabinet после DELETE не импортирует client hub; client тянет server как source of truth после события/refresh.

[Математик — Dynin]:
counts на сервере = countLiveJournalFilters(mergedFullSet) — та же функция, что в UI.
Пагинация: paginate*(mergedFull, { filter, limit: 50, cursor }) — filter до slice.
Инвариант: sum не требуется; tracks + reports - detections ⊆ reports. Тест: 60 track rows, 15 detection reports →
counts.tracks=60, counts.detections=15, pages(tracks)=2, pages(detections)=1.

[Музыкант]:
Smoke paired: записать >55 auto-сегментов → client и cabinet показывают одинаковые «Треки (N)».
Очистить «Треки» в cabinet → client journal пустеет от треков ≤30s (poll или hub).
Очистить «Обнаружения» на client → cabinet badge обновляется на poll 1s.

[Верстальщик — Rodchenko]:
Pager: totalPages > 1 только для активного фильтра (уже так — не ломать). Badge фильтров брать из
authoritative counts (после JS1 — с API; client после reconcile). Пока идёт clear — busy на кнопке (JE5).
Не показывать «Стр. 2 из 2», если в активном фильтре ≤50 строк.
```

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (Teamlead Vesnin). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и merge-order **JS1 → JS2 → JS3 → JS4**.

### Фазы

| Фаза | id | PR | Содержание |
|------|-----|-----|------------|
| **JS1** | `js1-server-journal-full-fetch` | 1 | Server: полный fetch для merge; API `counts`; cursor по полному набору |
| **JS2** | `js2-client-journal-reconcile` | 2 | Client: cursor walk + reconcile pull; единый source of truth |
| **JS3** | `js3-per-filter-pagination-contract` | 3 | Тесты + UI: pager только при count(filter)>50; counts синхронны |
| **JS4** | `js4-journal-clear-bidirectional-sync` | 4 | `journalCleared` hub; refresh после remote clear; parity clear |

---

### JS1 — server full fetch + counts (детали)

**Пакет:** `@membrana/background-cabinet` (+ shared types в `@membrana/telemetry-journal-service` при необходимости).

1. Ввести `JOURNAL_INTERNAL_FETCH_CAP` (например 5000) **отдельно** от `LIVE_JOURNAL_PAGE_SIZE = 50`.
2. `listJournalItems` загружает reports + liveRecords с internal cap **без** UI page cap.
3. Ответ `GET /v1/telemetry/journal-items`:

```typescript
{
  items: LiveJournalItem[];
  nextCursor: string | null;
  counts: Record<LiveJournalFilter, number>; // all, tracks, reports, detections
}
```

4. `counts` считаются через `countLiveJournalFilters` на **полном** merged наборе (до cursor slice).
5. Публичные `GET /reports` и `GET /live-records` могут оставить limit≤50 для legacy; unified endpoint — источник правды для UI.
6. Тесты: 60 tracks + 15 reports → `counts.tracks=60`, cursor page1/page2 для filter=tracks.

**DoD JS1:** cabinet `fetchAllJournalItems` получает все страницы с корректным `nextCursor`; prod smoke: треков >50 отображается N, не 50.

---

### JS2 — client reconcile pull (детали)

**Пакеты:** `@membrana/telemetry-journal-service`, `apps/client`.

1. `SyncJournalStorageBackend.fetchRemoteItems` — обход **всех** cursor-страниц (как `fetchAllJournalItems` в cabinet).
2. Заменить merge-only на **reconcile**:
   - после full pull: local items с тем же `mediaDeviceId` scope заменяются server snapshot;
   - локальные append ещё не на сервере — сохранять до успешного push (как сейчас).
3. `pullLimit` deprecated или = internal cap; документировать в README сервиса.
4. Тест: server 3 items → pull → local 3; server delete 1 → pull → local 2.

**DoD JS2:** после paired-сессии client `filterCounts` === cabinet `filterCounts` (допуск 0 при полной синхронизации).

---

### JS3 — per-filter pagination contract (детали)

**Пакеты:** `@membrana/telemetry-journal-service`, `apps/client`, `apps/cabinet`.

1. UI: `totalPages = countLiveJournalPages(filterCounts[activeFilter])` **или** `filtered.length` — должны совпадать при полных данных.
2. Pager рендерится iff `totalPages > 1` для **активного** фильтра (не для «Все», если в «Все» ≤50, но в «Треки» >50 — при переключении на «Треки» pager появляется).
3. Badge фильтров: при наличии API `counts` — использовать server counts (cabinet); client после refresh — те же числа.
4. Интеграционные тесты pagination service: 60 tracks / 15 detections сценарий из замечания постановщика.

**DoD JS3:** ручной сценарий 60+15 подтверждён; unit-тесты зелёные.

---

### JS4 — bidirectional clear sync (детали)

**Пакеты:** `apps/client` (`liveJournalHub`), `@membrana/telemetry-journal-service`, `apps/cabinet`.

1. Hub: `publishJournalCleared` / `subscribeJournalCleared` с payload `{ filter, mediaDeviceId?, deletedCount }`.
2. Client: после локального `clearByFilter` — publish cleared; `LiveJournalService` / `useLiveJournalAutoRefresh` на cleared → `refresh()` (full reconcile).
3. Client: периодический refresh (JE3 fallback) после reconcile удаляет строки, снятые на cabinet.
4. Cabinet: после успешного `DELETE journal-items` — клиент узнаёт через reconcile на следующем pull (≤1s cabinet poll уже есть); опционально `counts` в ответе DELETE.
5. Семантика фильтров — как JE5 (`filters.ts`), без cascade track→reports.

**DoD JS4:** clear «Треки» в cabinet → client без ручного клика «Обновить» показывает 0 треков; обратное — аналогично.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| API | `packages/background-cabinet/.../journal.service.ts` | full merge, counts, cursor |
| Service | `packages/services/telemetry-journal` | pagination, filters, reconcile backend |
| Client UI | `apps/client/.../telemetry-journal/` | pager, badges, clear |
| Cabinet UI | `apps/cabinet/.../journal/` | pager, badges, clear |
| Hub | `apps/client/src/lib/liveJournalHub.ts` | journalCleared + snapshotUpdated |

**Запрещено:**

- Прямой import плагинов микрофона в journal UI.
- SSE/WebSocket stream (отдельный post-v1 эпик).
- Менять `LIVE_JOURNAL_PAGE_SIZE` без согласования с TJ9.

---

### Definition of Done (эпик)

- [ ] Client и cabinet: одинаковые `counts` для paired `mediaDeviceId` при >50 треках.
- [ ] Pager только при count активного фильтра > 50.
- [ ] Clear client ↔ cabinet симметричен (JS4).
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] Paired smoke задокументирован в Issue.
- [ ] LGTM Teamlead.

### Out of scope

- Retention по тарифам / auto-purge старых записей.
- Cascade delete reports при удалении track.
- Real-time push cabinet→client без pull (SSE).

---

### Порядок работы ролей

1. **Teamlead** — Issue, Linear, merge-order JS1→JS4.
2. **Структурщик** — RC1/RC2 фиксы, API counts, reconcile.
3. **Математик** — тесты counts/pagination инвариантов.
4. **Музыкант** — paired smoke >55 сегментов, clear сценарии.
5. **Верстальщик** — pager/badge UX, busy на clear.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …
[Музыкант]: …
[Верстальщик]: …

Итоговый артефакт: 4 PR (JS1–JS4)
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. GitHub Issue типа `bug`: «Журнал: рассинхрон счётчиков client/cabinet, cap 50 на сервере, clear не синхронизируется».
2. Acceptance criteria — таблица из раздела «Контекст продукта» + DoD эпика.
3. После merge JS4: `yarn task:archive live-journal-sync-pagination --notes "PR #…"`.
4. Связать с закрытым #83 как follow-up hardening.

### Проверка после PR (paired)

```bash
# >55 auto-сегментов на client, сравнить badge «Треки» client vs cabinet
# Очистить «Треки» в cabinet → client обновился
# Очистить «Обнаружения» на client → cabinet на следующем poll
yarn workspace @membrana/client test
yarn workspace @membrana/cabinet test
```
