# Задание сессии A: грант `cabinet-register` и внутренняя дверь офиса (21.09)

**Контур:** заседание «Регистрация в кабинете по промокоду панели», комната M1 — **ратифицирована владельцем 21.09**. Решение комнаты ниже приведено дословно из протокола; менять его сессия не может — только исполнить. Спорное — в чат ведущей, не в код.

**Слово владельца 21.09 (данность):** промокоды регистрации — те же, что у партнёров панели офиса; выдаёт и отзывает панель под ролью владельца; новой системы промокодов в кабинете не заводить; правда о коде — в панели.

**Дерево:** своё, отдельное, от свежего `origin/main` (`≥ a45cd536`). Ветка вида `feat/office-cabinet-register-door`. Коммитить только свои файлы поимённо, никогда `git add -A`.

## Границы файлов (M0 + расширение по ратификации M1)

Ровно эти пути, ничего кроме:

- `packages/background-office/src/modules/panel-users/panel-users-core.ts`
- `packages/background-office/src/modules/panel-users/panel-users.controller.ts`
- **новый** файл контроллера внутренней двери в `packages/background-office/src/modules/panel-users/` (имя — за сессией, например `panel-users-internal.controller.ts`)
- `packages/background-office/src/modules/panel-users/panel-users.module.ts`
- **новые** тесты в том же каталоге по образцу `panel-users-core.test.ts`
- `scripts/_ssh-panel-smoke.mjs`

Кабинет (`packages/background-cabinet`), веб-кабинет (`apps/cabinet`), деплой-скрипты и лендинг — не трогать: это сессии B, C, D по M0.

## Решение комнаты M1 (протокол `docs/seanses/cabinet-registration-promo-m1-grant-door-2026-09-21.md`, строки 162–192, дословно)

| Вопрос | Решение |
|--------|---------|
| Вид кода | Тот же панельный `PromoCode`; **не** отдельный вид и **не** новая система в кабинете |
| Грант | Словами: «регистрация в кабинете»; строка: **`cabinet-register`** в `grants[]` после `normalizeGrants` |
| Почему грант, не новый тип | Выдача/отзыв/аудит/state уже в панели; данность «правда в панели»; `cabinet-register` не sectionId и не идёт через `grantsAllowSection` |
| Дверь | `POST /v1/internal/cabinet/registration-codes/consume` |
| Охрана | Внутренняя service-auth офиса; **не** `@PanelPublic`, **не** `@OwnerAdmin`, **не** сессия пользователя панели |
| Запрос | `{ "code": string, "mode": "check" \| "redeem" }` оба поля обязательны; иной/пустой mode → 400 |
| Успех check | 200 `{ "ok": true, "redeemable": true, "grant": "cabinet-register", "uses": { "used", "max" } }` без inc |
| Успех redeem | 200 `{ "ok": true, "code", "grant": "cabinet-register", "uses": { "used", "max" } }` после inc |
| Отказы | 409 `{ "ok": false, "reason" }` где reason ∈ `not_found` \| `revoked` \| `expired` \| `grant_mismatch` \| `exhausted`; `invalid_code`/тело → 400; auth → 401/403 |
| Порядок предикатов | not_found → revoked → expired → grant_mismatch → exhausted → ok |
| Q3 (не различать причину) | На **публичный** контур (и UX кабинета) — да; на **внутреннюю** дверь — **нет**, reason для сервиса кабинета; в браузер reason не отдавать |
| Атомарность | В `panel-users-core`: сериализованный read-check-inc-write `PanelUsersState` (mutex/exclusive lock writer-контура); успех redeem ≤ maxUses при гонке |
| Аудит | Запись `redeem-cabinet-code` (успех и отказ) в аудит-ленту state |
| Отзыв | `revoke-code` не откатывает `usedCount` и не трогает кабинетных пользователей; дальнейший consume → `revoked` |
| Эффект двери | **Не** создаёт пользователя панели и **не** копирует section-grants panel user |
| Что НЕ строить в M1 | Клиент офиса и ключ в кабинете (M2); порядок «погасить → создать пользователя» и unavailable office (M3); форма/тексты (M4); Prisma; публичная дверь; вторая система промокодов; UI админки под грант |

**Definition of Done (только M1):**

1. В core офиса: проверка литерала `cabinet-register`; `consume` с mode check/redeem; lock на state; audit `redeem-cabinet-code`.
2. Маршрут `POST /v1/internal/cabinet/registration-codes/consume` под internal guard; ответы и reason как в таблице.
3. Зубы (красные до правки, затем зелёные): каждый reason; invalid/missing mode; check не меняет `usedCount`; redeem inc; **гонка** maxUses=1 → один success; revoke после/до; код без гранта; код только с section grants → `grant_mismatch`.
4. Дверь не вызывает register панели и не создаёт PanelUser.
5. Нет кода клиента кабинета, нет формы, нет политики unavailable — вне M1.
6. Smoke: mint с `cabinet-register` → redeem → повтор exhausted (по образцу panel smoke, без требования UI).

## Факты ствола, которые уходят в задание (сверены председателем и аудитором по `origin/main` = `72bc026a`; решение не меняют)

- **Охрана по имени.** Комната оставила «имя в фактуре позже». Канон внутренней охраны офиса один: `packages/background-office/src/common/guards/api-token.guard.ts` — класс `ApiTokenGuard`, заголовок `X-Membrana-Token`, сравнение с `API_INTERNAL_TOKEN`; 14 файлов офиса уже его используют (в том числе `night-hunt.controller.ts`). Дверь ставится под него. Новый класс стража не заводить.
- **Почему новый контроллер.** `panel-users.controller.ts:53–54` — класс объявлен `@Controller('v1/panel')` под `@UseGuards(PanelAuthGuard)`; в NestJS путь метода относителен префиксу класса, а классовый страж накрывает все методы. Дверь вне `/v1/panel` и вне `PanelAuthGuard` — отдельный контроллер в том же модуле, регистрируется в `panel-users.module.ts` (`controllers: [...]`). Контроллеров с `@Controller('v1/internal…')` в офисе сегодня нет — этот первый.
- **Сериализация сегодня.** Контроллер панели работает «snapshot-first»: между снимком и записью нет ожидания (`panel-users.controller.ts:91–92`), а `PanelUsersStore.mutate` синхронен — временный файл и переименование (`panel-users.store.ts:77–95`). Замок из решения — дополнительный страж, ставится в core; предмет приёмки — инвариант «успешных redeem ≤ maxUses при гонке» и красный зуб на него (DoD 3).
- **Модель.** `panel-users-core.ts:24` `PromoCode { code, grants[], maxUses, usedCount, expiresAt, … }`; `normalizeGrants` (:91) пропускает любую строку до 64 символов с тримом и дедупом — литерал `cabinet-register` проходит без правки; `grantsAllowSection` (:86) — точное имя раздела или `*`, литерал через него не идёт; проверки истечения и исчерпания сегодня — :191–192; аудит-действия `'register' | 'grants' | 'revoke-user' | 'mint-code' | 'revoke-code'` (:41) — добавить `'redeem-cabinet-code'`.
- **Словарь в коде и тестах.** Имена полей и значений контракта (`code`, `mode`, `check`, `redeem`, `reason`, значения enum) — как в таблице, буква в букву. В комментариях и сообщениях: приращение, замок, единственный пишущий контур — не «inc», «lock», «writer».

## Порядок работы

1. Сначала красные зубы (DoD 3) — на стволе они должны падать, показать это в отчёте (`yarn workspace @membrana/background-office test` или как в `package.json` пакета). Красный вход до правки обязателен: зуб, который ни разу не краснел, не принимается.
2. Потом core → контроллер → модуль → smoke.
3. PR через `yarn pr:ship --type feat --scope office --message "…" --execute`; в теле PR — команды, которыми проверены DoD 1–6, и вывод зубов до/после. Не `gh pr merge`.
4. Ревью и слияние — по приёмке ведущей по факту; отдельного слова владельца не нужно. Прод не выкатывать: выкатка — слово владельца, и она идёт после M2–M3, когда есть кому звать дверь.

## Отчёт ведущей (в чат, по факту, не по exit code)

- ветка, вершина PR, что в границах и что нет;
- вывод зубов на стволе (красные) и на ветке (зелёные) — цитатой;
- вывод smoke `mint → redeem → exhausted`;
- что осталось спорным — вопросом, не решением.

## Границы

- Решение M1 не переоткрывать; «а лучше бы» — в чат ведущей, отдельным вопросом.
- Не трогать кабинет, деплой, лендинг, секреты, прод.
- Никаких `--no-verify`, `git add -A`, ручных правок `docs/tariffs/tariff-grid.json`.
