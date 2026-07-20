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

### Dry-run деплоя (не выполнен — нет слова на ship/merge + 404 на роуте)

1. Merge или явный ok на выкладку ветки `feat/linear-egress-media-wiring` на media VPS (текущие `_ssh-media-deploy.mjs` тянут `techies68` — **не** эту ветку).
2. На NL: `git fetch` → checkout SHA/ветки #692 → `./deploy/media-stack.sh build && up`.
3. В `/etc/membrana/media.env` добавить `LINEAR_API_KEY=…` (из корневого `.env` владельца, scp/ssh вручную; не в git). `docker compose … up -d --force-recreate media-api`.
4. Локально/office: `MEDIA_API_URL=https://media.membrana.space`; токен = **тот же**, что в media.env (`API_INTERNAL_TOKEN` на VPS), не обязательно laptop-токен.
5. Smoke: `POST /v1/linear-snapshots/capture` → `pullOk: true` + honest-шапка `producedBy=media-NL`.
