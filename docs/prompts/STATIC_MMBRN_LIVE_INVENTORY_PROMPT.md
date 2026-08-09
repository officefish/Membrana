# Промпт: #1305-A2 live read-only sealed inventory Affine

> **Task-промпт для операционного агента.** Размер: **M**. Реестр:
> `static-mmbrn-live-inventory`. Родитель: `static-mmbrn-container`.
> Ожидаемый артефакт: один reviewable evidence PR без raw content, секретов и
> приватных source paths. Отдельная GitHub Issue не создаётся: holder — #1305.

---

## Контекст

PR #1806 доставил офлайн-инструмент `affine:inventory`, но доказал его только на
синтетическом corpus. Live INV-1 остаётся `NOT_PERFORMED`. Эта задача закрывает
ровно операционный разрыв: получить отдельно разрешённый read-only source bundle,
прогнать существующий инструмент и доказать полноту fenced DB/export snapshot.

Регистрация задачи и этот prompt **не разрешают** доступ к production. До
отдельного слова владельца/ops агент может выполнять только подготовку и dry-run
на fixtures.

**Связанные документы:**

| Документ | Зачем |
|----------|-------|
| [`AFFINE_INVENTORY.md`](../deploy/AFFINE_INVENTORY.md) | контракт существующего инструмента |
| [`EPIC.md`](../meeting/static-mmbrn-container/EPIC.md) | ратифицированный migration DAG и NO-GO |
| [`DEPS.json`](../meeting/static-mmbrn-container/DEPS.json) | машинные зависимости фаз |
| [`CLOSURE.md`](../local-sprint/static-mmbrn-inventory-export/CLOSURE.md) | граница завершённой tool-фазы |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | exact-SHA review и архив |

---

## Промпт целиком

### Кто ты

Ты — координатор операционной задачи `static-mmbrn-live-inventory`. За exact-set
и воспроизводимость отвечает Дынин; Веснин держит границу EPIC, Ожегов — форму
evidence и отсутствие второй истины.

### Что сделать

1. До live-действия зафиксировать отдельное owner/ops-разрешение, read-only способ
   получения source bundle, source identity и два fence marker: database/export.
2. Получить immutable offline bundle разрешённым способом. Bundle, raw documents,
   assets, credentials и private paths в Git не помещать.
3. Запустить `affine:inventory` дважды на одном bundle в две новые директории.
4. Сравнить `manifest.json` и `manifest.sha256` byte-for-byte; проверить exact
   DB/export set, hashes, sizes, timestamps, relations и grants.
5. Создать redacted evidence report: snapshot identity, время, fence descriptors,
   counts по kind, seal, digest команды/версии, оператор и итог PASS/FAIL.
6. При любом mismatch остановить фазу как FAIL. Counts `82 pages / 57 assets` и
   `affine-cli doc list = 0` никогда не считать доказательством полноты.

### Жёсткие запреты

- Никаких production write, import, sync, publish, rehydrate или delete.
- Никакого bypass флага замороженного Affine publish.
- Не менять DNS, Caddy, Panel, access policy или target storage.
- Не коммитить raw bytes, grants с identity, source paths, credentials и refs.
- Не открывать `static-mmbrn-disposition-ledger` по FAIL или неполному evidence.

### Evidence contract

| Поле | Требование |
|------|------------|
| authorization | кто и когда разрешил read-only акт; без секрета |
| snapshot | `snapshotId`, `capturedAt`, source class |
| fences | отдельные DB/export markers, совпавший snapshot identity |
| reconciliation | exact-set PASS; counts только дополнение |
| determinism | два byte-identical manifest и seal |
| seal | SHA-256 финального canonical manifest |
| boundary | mutation/network publication/raw-content = none |
| verdict | `PASS` или `FAIL`, без промежуточного зелёного |

### Проверки

```powershell
node --test scripts/affine-inventory-lib.test.mjs `
  scripts/affine-inventory-extractor.test.mjs `
  scripts/affine-inventory.test.mjs
node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/static-mmbrn-live-inventory.json
node scripts/execution-gate.mjs --plan docs/sprint/cut/static-mmbrn-live-inventory.json `
  --traces docs/sprint/trail/static-mmbrn-live-inventory.jsonl
```

### Definition of Done

- [ ] Отдельное owner/ops-разрешение записано до live read.
- [ ] Source bundle immutable и несёт согласованные DB/export fences.
- [ ] Два независимых запуска дали byte-identical manifest и seal.
- [ ] Exact-set reconciliation PASS; metadata/content checks PASS.
- [ ] В Git нет raw content, секретов, private refs и source paths.
- [ ] Дынин, Ожегов и Веснин увидели evidence; финальные verdict LGTM.
- [ ] Exact-SHA Teamlead review и серверный CI зелёные.
- [ ] Только после merge downstream `static-mmbrn-disposition-ledger` считается unblocked.

### Out of scope

- Disposition решений по объектам.
- Provision target и перенос bytes.
- Rehydrate/parity Affine.
- M6 alignment, ingress, canary, cutover и retirement.

### Формат отчёта

```text
[Dynin]: authorization / fences / exact-set / determinism / verdict
[Ozhegov]: evidence surface / redaction / canonical identity
[Vesnin]: EPIC boundary / downstream gate

Итоговый артефакт: <redacted evidence path>
Live INV-1: PASS | FAIL | NOT_PERFORMED
Следующая разрешённая фаза: <task id или none>
```

---

## Заметки постановщика

- Holder: GitHub #1305; отдельная Issue не нужна и umbrella не закрывается фазой.
- Registration owner act: «делаем registry-задачу и потом идем в коворк», 2026-08-09.
- Если live-разрешение не дано, законный итог текущего запуска — подготовка завершена,
  `Live INV-1: NOT_PERFORMED`; карточка остаётся active.
