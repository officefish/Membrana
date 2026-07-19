# Промпт: Ласточка — идемпотентность доставки (таймаут ≠ недоставка)

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — ledger + честные коды/сообщения при таймауте.
> Реестр: `id` = `swallow-delivery-idempotency` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Живой прогон 18.07: `telegram-swallow.mjs` при таймауте ответа печатает «office недоступен»;
агент считает отправку провалившейся и повторяет — сообщение уже доставлено, владелец
удаляет дубль руками. Office `/v1/telegram/ally-message` **stateless**, idempotency-key
на сервере нет (канон «office ничего не хранит»). Клиентский ledger + честный статус —
минимальный фикс. Родня: #585 (след), exit-code-semantics (#622).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| `scripts/telegram-swallow.mjs` | Точка правки |
| Ally editorial gate #569 | Не трогать формат/редактуру |
| Issue #585 | След доставки (пересекается: ledger закрывает «невыводимость») |

**GitHub Issue:** — (карточка без issue; при желании связать с #585 в PR).

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `scripts/lib/swallow-delivery-ledger.mjs`:
   - ключ = SHA-256 нормализованного текста (trim);
   - статусы: `delivered` | `unknown` | `failed`;
   - файл `.membrana/swallow-deliveries.jsonl` (gitignore).
2. `telegram-swallow.mjs`:
   - до POST: если ключ `delivered` → skip, exit 0 (если нет `--force`);
   - успех `sent=true` → запись `delivered` (+ message_id если есть);
   - таймаут/сеть → запись `unknown`, сообщение
     «статус неизвестен — не повторяй вслепую; --force для принудительного повтора»,
     **отдельный exit-код** (например 3), не общий «office недоступен»;
   - HTTP/sent=false → `failed`, exit 1.
3. Тесты: ключ стабилен; повтор после delivered → skip; unknown ≠ failed.

### Definition of Done

- [ ] Повтор с тем же текстом после успешной доставки не шлёт второе сообщение.
- [ ] Таймаут не печатает «office недоступен» как факт недоставки.
- [ ] Тесты в `test:scripts`. LGTM Teamlead.

### Out of scope

- Формат ласточки, редакторский гейт (#569), server-side Idempotency-Key в office
  (отдельный follow-up при смене канона).

---

## Заметки для человека-постановщика

1. Закрытие: `yarn task:archive swallow-delivery-idempotency --notes "PR #…"`.
2. Опционально комментарий в #585: ledger закрывает клиентский след.
