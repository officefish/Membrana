# Пилот LINEAR_TASKS_GEAR × `linear-egress-media-wiring`

> Открыт: 2026-07-20. Статус: **ЗАКРЫТ** (код в main `a82fd5af` / PR #692; media-NL live smoke `pullOk=true`; карточка archived).  
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

## 5. Секреты vs egress (2026-07-20, слово владельца)

Владелец: «все секреты у тебя есть, они в корневом env».

### O9. Секреты в корневом `.env` ≠ egress

| Факт | Следствие |
|---|---|
| Корневой `Membrana/.env` несёт `LINEAR_API_KEY` + класс токена (`API_INTERNAL_TOKEN` / `OFFICE_API_TOKEN`) | Достаточно для **локальных** скриптов и доказательств |
| `MEDIA_API_URL` в корневом `.env` **missing** | Trigger office→media не сконфигурирован явно; канон-хост `https://media.membrana.space` |
| Live `GET /health` media → 200 | Хост жив |
| Live `POST /v1/linear-snapshots/capture` → **404** | Код PR #692 **не** на media; smoke pullOk невозможен до деплоя |
| Прямой GraphQL с клиентской сети при валидном ключе → **403 / RESTRICTED_COUNTRY_BLOCKED** | Подтверждает паспорт §9: live pull только с media-NL |
| `generate-media-env.sh` **не** пишет `LINEAR_API_KEY` | Ключ на NL надо дописать в `/etc/membrana/media.env` вручную (или расширить генератор) |
| Ноутбук `.env` ≠ `/etc/membrana/media.env` | Ключ на ноутбуке **не** делает egress; контейнер media читает server env |

**Норма:** «секреты в корневом `.env`» закрывает наличие ключей у агента; **не** закрывает тракт egress. Для боевого снимка ключ обязан лежать в **env на media-NL**, а образ — с модулем `linear-snapshots` (#692).

### Dry-run → выполнен (слово владельца «Разрешаю» 2026-07-20)

1. Teamlead `yarn code-review:pr 692` → **LGTM** (P1 oversized follow-up, не BLOCK).
2. Squash-merge #692 → `a82fd5af` на `main`.
3. Media VPS: `git fetch --depth 1 origin main` → checkout `a82fd5af` (клон раньше знал только `techies68`).
4. `/etc/membrana/media.env`: `LINEAR_API_KEY` upsert из корневого `.env` (значение не логировалось) → `LINEAR_API_KEY_IN_ENV=present`.
5. `media-stack.sh build media-api` + `up --force-recreate media-api` → healthy.
6. Smoke localhost:3010 и `https://media.membrana.space`: **HTTP 200**, `pullOk=true`, `producedBy=media-NL`, `egressRegion=NL`, `mode=batch-full-pull`, `recordCount=224`.

### O10. VPS clone без локальной `main`
`git checkout main` падал (`pathspec did not match`) — shallow/`techies68`-only. Нужен `git fetch origin main && git checkout -B main FETCH_HEAD`. **Рефакторинг:** `_ssh-media-deploy` / tip-main path не должен предполагать существующую локальную `main`.

### O11. `generate-media-env.sh` не знает Linear
После generate ключ всё равно руками. Кандидат: опциональная строка `LINEAR_API_KEY` в генераторе или отдельный `media:env:set-linear` без echo значения.

## 6. Live DoD (закрыт)

- [x] Issue #691 + registry linked
- [x] PR #692 MERGED `a82fd5af` (LGTM + green CI)
- [x] media-NL deploy tip main + `LINEAR_API_KEY` в server env
- [x] Live smoke `pullOk=true` / honest-шапка media-NL (224 records)
- [x] `yarn task:archive linear-egress-media-wiring`
- [x] Closure: `docs/tasks/closures/linear-egress-media-wiring.md`
- [x] Linear movement live units — stub снят по К5 в #694 (явный `movementMode` switch)

---

## 7. Follow-up #694 — К5 stub-lift + office GraphQL refuse (2026-07-20)

> Issue [#694](https://github.com/officefish/Membrana/issues/694) · registry `linear-stub-lift-office-graphql` · слово владельца «идем туда».

### O12. К5 lift — явная атомарная запись, не silent

После live `pullOk` (#692) stub снят скриптом `yarn movement:lift --execute` →
`docs/tasks/movement-mode.json` = `{ movementMode: live-snapshot, snapshotRef, switchedAt }`.
Producer/capture **не** мутирует флаг. Носитель — git-файл, не cold и не env
(см. [`MOVEMENT_MODE.md`](../tasks/MOVEMENT_MODE.md)).

### O13. Office issue-view больше не зонд Linear

`LinearService` бросает `503` / `LINEAR_OFFICE_EGRESS_DISABLED` без `fetch`.
`outbound-self-check` убрал probe `api.linear.app` — иначе RU→403 выглядел бы
как «канал мёртв», а не как запрещённый путь. **Рефакторинг:** любой health-probe
не должен зелёнить запрещённый egress.

### O14. Live ref snapshot в git (~225 records)

`docs/tasks/snapshots/linear-snapshot-live-ref.json` — сохранённый S для
`audit(S)=pullOk(S)` без сети. Размер шумный для diff, но M4 требует
переигрываемый артефакт; обрезать тело нельзя (`recordCount` = `|B|`).
