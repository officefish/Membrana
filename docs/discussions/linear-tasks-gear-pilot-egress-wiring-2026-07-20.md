# Пилот LINEAR_TASKS_GEAR × `linear-egress-media-wiring`

> Открыт: 2026-07-20. Статус: **в работе** (первый PR = инкременты 1–2 + `pullOk`).  
> Цель файла: трение старого регламента vs gear при проводке egress. Материал для адаптации процедур.

---

## 0. Исходные документы (прочитаны до кода)

| Документ | Роль |
|---|---|
| [`docs/tasks/LINEAR_TASKS_GEAR.md`](../tasks/LINEAR_TASKS_GEAR.md) | паспорт движка |
| [`docs/tasks/UNITS_DICTIONARY.md`](../tasks/UNITS_DICTIONARY.md) | единицы счёта |
| [`docs/meeting/linear-egress-gear-wiring/`](../meeting/linear-egress-gear-wiring/) | вердикты К1–К4b |
| [`docs/tasks/LINEAR_SNAPSHOT_CONTRACT.md`](../tasks/LINEAR_SNAPSHOT_CONTRACT.md) | контракт снимка @1 |
| Прецедент пилота | [#686](https://github.com/officefish/Membrana/issues/686) / sec-upgrade журнал |

## 1. Импровизированный START

| Шаг | Старый путь | Пилот на движке |
|---|---|---|
| Удостоверение | registry ± Issue | **сначала** GH Issue [#691](https://github.com/officefish/Membrana/issues/691) |
| Движение | Linear ad-hoc / статусы JSON | **stub** `deferred-egress` (egress ещё не live) |
| Содержание | часто BRIEF | отдельный `LINEAR_EGRESS_MEDIA_WIRING_PROMPT.md` |
| Ответственный | `leadPersona: dynin` | dynin; исполнитель обезличен |
| Worktree | dirty main | `Membrana-egress-wiring` / `feat/linear-egress-media-wiring` @ `origin/main` `3fb231de` |
| Closure | commit trailer / PR body | позже файл `{acceptedBy, headRev}` — не в commit message |

### Stub движения

```
container: (deferred) Linear parent «linear-egress-gear-wiring» — egress blocked / not live
central: GH #691 ⟺ registry id linear-egress-media-wiring
delegate: anonymous agent session 2026-07-20
assignee/lead: dynin
movement: deferred-egress
state improvisation: Started (локально, не в Linear)
```

## 2. Наблюдения (факты эпизода)

### O1. Worktree sibling обязателен, но агент-subagent не может `move_agent_to_root`
Сессия стартовала в `Membrana-grok`; worktree создан явно. Subagent API блокирует смену корня — работа идёт абсолютными путями. **Рефакторинг:** в `task:start` / playbook — «сначала worktree + re-root родителя».

### O2. `yarn task:register` в свежем worktree требует `yarn install`
До install скрипт падает на `findPackageLocation`. Старый регламент молчит. **Рефакторинг:** `task:start` = Issue → worktree bootstrap → register.

### O3. Паспорт §6 ещё говорил «office-батч», заседание уже media-NL
Агент читает паспорт и получает устаревший producer. Вердикты M1/M3 сильнее; паспорт правим в том же PR. **Рефакторинг:** после закрытия заседания — автоматический diff паспорта vs EPIC «работы».

### O4. Два литерала `source: office-batch`
1) шапка `linear-snapshot` (M3: **заменить** на producedBy/mode);  
2) cold archive honest-шапка (`ARCHIVE_FORMAT`, `COLD_SOURCE_PREFIX`) — **другой** контракт. Слепое grep-migrate ломает холод. Зуб: разные словари, разные поля.

### O5. Office `LinearModule` (issue-view) всё ещё ходит в GraphQL
Snapshot-путь очищен; issue-view — долг. Полное «office не ходит в Linear» ≠ один PR. **Рефакторинг:** карточка follow-up или фаза 2 того же эпика.

### O6. `MEDIA_API_URL` не был в office env
Trigger требует явный URL media. Деплой: прописать URL NL-media + общий класс токена. Блокер live — не код, а секреты/деплой.

### O7. Нет `task:start` → ручной каркас как у #686
Повторяется O4 пилота sec-upgrade. Заседание M1b вердиктовало `yarn task:start`; в этом PR — только журнал, без полной команды (объём).

### O8. `--kind sprint` отвергнут регистратором
Живые kind: `day-sprint|epic|night-build|competition-sprint|cowork-sprint`. Слово «спринт» в речи владельца ≠ CLI enum. **Рефакторинг:** `task:start` принимает синонимы или печатает enum в usage первой строкой.

## 3. Что сделано в коде (инкременты)

| Инкремент | Статус |
|---|---|
| 1 media-NL producer + honest-шапка | сделано |
| 2 office→media trigger (`X-Membrana-Token`) | сделано |
| 3 `pullOk` + офлайн `snapshot-contract` | сделано |
| К5 stub-lift / К4b hard closure | **не** в этом PR |

## 4. Блокеры live

- `LINEAR_API_KEY` на media-NL (env) + сеть NL → `api.linear.app`
- `MEDIA_API_URL` (+ токен) на office MSK
- Деплой media с новым модулем; первый live `pullOk` артефакт → потом К5
