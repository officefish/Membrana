# Архив: Тракт архива сессий: scan → extract → ingest как связанная цепочка, а не три точки входа

| Поле | Значение |
|------|----------|
| **ID** | `archivarius-evening-tract` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-08-01 |
| **Архивирована** | 2026-08-04 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/ARCHIVARIUS_EVENING_TRACT_PROMPT.md`](../../docs/prompts/ARCHIVARIUS_EVENING_TRACT_PROMPT.md) |

## Заметки при закрытии

Закрыто спринтом archivarius-live-wiring 04.08 (блок cli-office-client-and-tract, Веснин): тракт scan→extract→ingest существует как код — yarn archivarius:push (scripts/archivarius-push.mjs), шаги читают выход друг друга, транскрипты в stdout неповторимы по построению. Дефекты карточки сняты: «без --out весь корпус в stdout» — исключено формой отчёта (только счётчики); три независимые точки входа — связаны композицией runTract. Живой вещдок: заливка 106884/106884 спанов 214 батчами в office+Mongo (dev), отчёт {files:170, spans:106884, maskedLines:64, accepted:106884}. Зубы 13/13. PR спринта — следом.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
