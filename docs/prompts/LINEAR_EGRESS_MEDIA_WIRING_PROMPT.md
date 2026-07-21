# Task-промпт: linear-egress-media-wiring

> Размер: **L** · lead: **dynin** · Issue: **#691**  
> Заседание: `docs/meeting/linear-egress-gear-wiring/` (PR #690 @ ~3fb231de)  
> Паспорт: `docs/tasks/LINEAR_TASKS_GEAR.md` · контракт: `docs/tasks/LINEAR_SNAPSHOT_CONTRACT.md`  
> Пилот движка: `docs/discussions/linear-tasks-gear-pilot-egress-wiring-2026-07-20.md`

## Контекст

Проводка тракта egress Linear: producer `linear-snapshot@1` на **media-NL**, office — trigger + потребитель. Движение Linear до live pull — stub `deferred-egress`.

Порядок вердиктов: К1 → К2 → К3; К5/К4b — **не** в первом PR.

## Промпт целиком

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и этому промпту.
Центральная задача: GitHub #691 ⟺ registry id linear-egress-media-wiring.
Ответственный: dynin. Исполнитель обезличен (LINEAR_TASKS_GEAR §3).
Инкремент 1: media-NL Linear client + batch-full-pull → linear-snapshot@1
  с honest-шапкой (producedBy=media-NL, egressRegion=NL, mode=batch-full-pull).
Инкремент 2: office→media trigger через X-Membrana-Token; ключ Linear не в запросе.
Инкремент 3: pullOk(S) чистая + офлайн-гейт; task:start — опционально.
Не делай stub-lift (К5) и hard closure (К4b) в первом PR.
Тесты без сети. Веди журнал пилота. Closure: {acceptedBy, headRev}-файл, не commit trailer.
```

## Definition of Done (первый PR)

- [ ] Issue #691 + registry linked (`leadPersona`, `promptPath`, active)
- [ ] media: producer + `POST /v1/linear-snapshots/capture` под `ApiTokenGuard`
- [ ] office: MediaSnapshotClient (trigger), без GraphQL в snapshot-пути
- [ ] Тесты снимка / honest-шапки / `pullOk` зелёные без сети
- [ ] `docs/tasks/LINEAR_SNAPSHOT_CONTRACT.md` (или эквивалент JSDoc по К3)
- [ ] Журнал пилота с наблюдениями (трение старого регламента vs gear)
- [ ] PR draft/ready с телом = DoD + ссылка на заседание
- [ ] Linear movement: stub `deferred-egress` в журнале (не притворяться что Linear создан)

## Out of scope

Stub-lift, hard closure, live pull в прод, полный `yarn task:start` (если раздувает), снятие `LINEAR_API_KEY` из office env (legacy LinearModule issue-view — follow-up).
