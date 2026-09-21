# Задание сессии C: регистрация в кабинете по коду — порядок гашения и режим отказа (21.09)

**Контур:** заседание «Регистрация в кабинете по промокоду панели», комната M3 «порядок гашения и режим отказа» — **ратифицирована владельцем 21.09**. Решение комнаты ниже приведено дословно из протокола; менять его сессия не может — только исполнить. Спорное — в чат ведущей, не в код.

**Данности:** промокоды регистрации — те же, что у партнёров панели офиса; правда о коде — в панели; вторую систему кодов в кабинете не заводить. Дверь офиса — по M1 (сессия A): `POST /v1/internal/cabinet/registration-codes/consume`, `mode: "check" | "redeem"`, 409 `{ ok: false, reason }`, reason ∈ `not_found | revoked | expired | grant_mismatch | exhausted`; продуктовый путь зовёт только `redeem`. Клиент в сервере кабинета — по M2 (сессия B): модуль `packages/background-cabinet/src/modules/office-registration/`, метод `redeemRegistrationCode(code): Promise<RegistrationOutcome>`, исход `{ kind: 'ok'; payload } | { kind: 'refused'; reason } | { kind: 'office-unavailable'; detail } | { kind: 'config-invalid'; detail }`; `APP_CONFIG.office === null`, если пара `OFFICE_URL`/`OFFICE_API_TOKEN` не задана. **Сессии A и B работают параллельно** — до их PR интерфейс клиента берётся из решения M2 (тип исхода выше), тесты идут на подменном клиенте, не на сети.

**Дерево:** своё, отдельное, от свежего `origin/main`. Ветка вида `feat/cabinet-register-by-code`. Коммитить только свои файлы поимённо, никогда `git add -A`.

## Границы файлов (M0 + расширение по ратификации M3)

Ровно эти пути, ничего кроме:

- `packages/background-cabinet/src/modules/auth/auth.controller.ts`
- `packages/background-cabinet/src/modules/auth/auth.service.ts`
- `packages/background-cabinet/src/modules/auth/auth.dto.ts` (расширение: поле кода)
- `packages/background-cabinet/src/modules/auth/auth.module.ts` (расширение: импорт модуля M2)
- **новый** файл-помощник ограничителя скользящего окна в `packages/background-cabinet/src/modules/auth/` (расширение; имя — за сессией) и его тест
- новые тесты `packages/background-cabinet/src/modules/auth/*.test.ts`
- `packages/background-cabinet/src/config/env.schema.ts:37,47` — **только чтение** флага `ALLOW_REGISTRATION`, семантику строк не менять

**Не трогать:** `modules/office-registration/` (B), `config/config.module.ts`, `config/office-env.schema.ts`, `modules/health-deep/`, `app.module.ts` (B), `modules/tariff/` и тарифный `PromoCode` (чужой контур), `modules/membrane/`, `apps/cabinet` (D), офис (A), деплой, лендинг, секреты, прод. Код панели офиса (`panel-auth-core.ts`) в кабинет не импортировать и не копировать целиком — помощник ограничителя пишется свой, тонкий.

## Решение комнаты M3 (протокол `docs/seanses/cabinet-registration-promo-m3-order-failure-2026-09-21.md`, строки 177–228, дословно; заголовок готовности — по сборке председателя)

| Вопрос | Решение |
|--------|---------|
| Порядок шагов | 1) отказ если `ALLOW_REGISTRATION === false` **или** `office === null`; 2) ограничитель по IP; 3) нормализация/длины login/password; 4) `code = trim(code)`, пустой или length>128 → отказ без офиса; 5) `findUnique(login)` занят → отказ без офиса; 6) `hashPassword`; 7) `redeemRegistrationCode(code)`; 8) только при `kind==='ok'` → `user.create` + `createSessionForUser`. Иначе — не создавать. |
| Почему так | Нет общей транзакции двух хранилищ; `create` до гашения даёт пользователя без кода; гашение до проверок сжигает код на валидации; `check` запрещён M1. |
| Компенсация A: redeem ok, create fail | Код сгорел; повтор того же кода невозможен (`exhausted`); наружу 403 `Registration was not accepted`; лог error `registration_redeem_orphaned` (login, code, ошибка БД); un-redeem нет; разбор — ops/панель вручную. |
| Компенсация B: исход redeem неизвестен (таймаут) | При принятом порядке `create` не вызывается; ответ 503 `Please try again later`; лог warn `registration_redeem_outcome_unknown`; ретрай клиента M2 нет; возможен сирота в офисе без пользователя — допустимо данностями. Сценарий «create прошёл при неизвестном гашении» **запрещён порядком**. |
| Исход `ok` | Как сегодня: пользователь + сессия; HTTP успех двери register без смены контракта сессии. |
| Исход `refused` (5 reason) | HTTP **403**, фраза **`Registration was not accepted`**; `reason` только в лог. |
| Локальный отказ до redeem (длины, код пустой, логин занят) | HTTP **403**, та же фраза; офис не звать. |
| `office-unavailable` | HTTP **503**, **`Please try again later`**; пользователь не создан. |
| `config-invalid` | HTTP **503**, **`Please try again later`**; лог error `registration_office_config_invalid`. |
| Регистрация выключена | `!(ALLOW_REGISTRATION && office≠null)` → HTTP **401**, **`Registration is disabled`**; mock/офис не вызывать. |
| Ограничитель | Нужен; ключ = IP; окно **600000** мс; порог **10**; HTTP **429**, **`Too many requests`**; hit в `auth.controller.ts` до service. |
| DTO | `auth.dto.ts`: обязательное поле **`code: string`**; нормализация trim в service; не смешивать с тарифным promo. |
| Подключение клиента | `auth.module.ts` импортирует модуль M2 `office-registration`; DI в `AuthService`; расширение границы C — явное. |
| Зубы C | Mock всех kind; оба флага выключения; 429; гонка кода maxUses=1; гонка логина; orphan create after ok; reason не в HTTP-теле. |
| Что НЕ строить | un-redeem, ретраи, outbox, check-before-redeem, кэш кодов, вторая система кодов, трогать тарифный PromoCode, мембрану на register, контракты M1/M2, UI-тексты M4. |

### Карта двери `POST /v1/auth/register`

| Условие / исход | HTTP | Фраза наружу | Пользователь | Гашение с стороны кабинета |
|-----------------|------|--------------|--------------|----------------------------|
| выключено (флаг или office null) | 401 | Registration is disabled | нет | не вызывалось |
| лимит IP | 429 | Too many requests | нет | не вызывалось |
| refused / локальный отказ / orphan create | 403 | Registration was not accepted | нет | refused: нет; orphan: да (сожжено) |
| office-unavailable / config-invalid | 503 | Please try again later | нет | не подтверждено ok |
| ok + create | успех как сегодня | сессия | да | да |

**Определение готовности:**

1. `register` в service реализует порядок из таблицы вердикта без `check` и без ретраев.
2. Все `kind` клиента M2 мапятся на HTTP/фразы таблицы; `reason` не попадает в response.
3. `RegisterDto.code` обязателен; `auth.module` импортирует office-registration.
4. Ограничитель 10 / 600000 мс / IP → 429 на register.
5. Тесты auth покрывают зубы C (mock bridge, гонки, оба выключения, orphan-лог).
6. Тарифный `PromoCode` / `redeemPromo` / мембрана на register не изменены.
7. Нет UI-текстов и лендинга (зона M4).

## Факты ствола, которые уходят в задание (сверены председателем и аудитором по `origin/main`; решение не меняют)

- **Регистрация сегодня** — `auth.service.ts:15–34`: флаг (16) → длины (19–21) → `findUnique` (24–26) → `hashPassword` + `user.create` (29–31) → `createSessionForUser` (34). Порядок решения вставляет ограничитель после флага и гашение между хешем и созданием. Ошибки сегодня — `UnauthorizedException` на выключенную регистрацию и на длины, `ConflictException` на занятый логин; по решению локальный отказ по длинам, коду и логину — **403** с одной фразой (выключено — 401, как сегодня).
- **Код успеха.** `auth.controller.ts:21` — `@Post('register')` без `@HttpCode` → **201** с телом сессии (`LoginResult`); контракт сессии не меняется.
- **Ограничитель.** В кабинете его нет (`grep -iE "throttle|rate-limit|429"` по `modules/auth` и `common` → пусто); образец — офис, `packages/background-office/src/modules/panel-auth/panel-auth-core.ts:237` `createSlidingWindowLimiter(maxPerWindow, …)` и удар `panel-users.controller.ts:86`. Писать свой тонкий помощник в `modules/auth/` (чистая функция + состояние в памяти процесса), с тестом на окно и порог; IP брать из запроса Fastify (`req.ip`) — за обратным прокси кабинета проверить, что доезжает адрес клиента, а не прокси; если нет — сказать ведущей, не решать молча.
- **Два условия включения.** `ALLOW_REGISTRATION` — `env.schema.ts:37` необязателен, `:47` по умолчанию `true` только в `development`; в проде `deploy/generate-cabinet-env.sh:34` пишет `false`. `APP_CONFIG.office` появится из работы B (составной тип конфига); до слияния B в тестах подменять конфиг. Включение = оба условия; отказ по любому — 401 «Registration is disabled», офис не звать.
- **DTO.** `auth.dto.ts` — `RegisterDto { login: string; password: string }` (интерфейс, не класс); поле `code: string` обязательное; нормализация `trim` в сервисе, длина ≤128 (панельные коды короче; предел — от вредных тел).
- **Мембрана** — `membrane.service.ts:157` `getOrCreateMembraneForUser` лениво при первом входе на `FREE_TARIFF_ID`; регистрация её не создаёт. Приёмка владельца: второй кабинет на `free-v1`.
- **Тесты `auth` сегодня** — только `password.util.test.ts`; `auth.service.test.ts` — новый файл, на стволе красный уже по отсутствию поля `code` и клиента.
- **Словарь в коде.** Фразы наружу — буква в букву как в карте двери (локализация — M4, не C). В комментариях: гашение, полуудача, ограничитель, помощник — не «redeem-flow», «orphan», «limiter» в прозе.

## Порядок работы

1. Сначала красные зубы (`auth.service.test.ts` с подменным клиентом M2): на стволе падают — показать вывод.
2. DTO → помощник ограничителя (с тестом) → модуль (импорт M2) → сервис (порядок шагов, соответствие исходов) → контроллер (удар ограничителя, `body.code`).
3. PR через `yarn pr:ship --type feat --scope cabinet --message "…" --execute`; в теле PR — команды по каждому пункту готовности, вывод зубов до/после. Не `gh pr merge`.
4. Ревью и слияние — по приёмке ведущей по факту; отдельного слова владельца не нужно. Если PR B ещё не влит — сказать ведущей: порядок слияния B → C, у C импорт модуля B.
5. Прод не выкатывать; выкатка после A+B+C — слово владельца.

## Отчёт ведущей (в чат, по факту, не по exit code)

- ветка, вершина PR, список файлов — все в границах;
- вывод зубов на стволе (красные) и на ветке (зелёные) — цитатой;
- таблица «исход клиента → HTTP → фраза» из тестов, совпадающая с картой двери;
- что осталось спорным — вопросом, не решением (например, адрес клиента за прокси).

## Границы

- Решение M3 не переоткрывать; «а лучше бы» — в чат ведущей, отдельным вопросом.
- Не трогать файлы B, D, A, тарифный контур, мембрану, деплой, секреты, прод.
- Никаких `--no-verify`, `git add -A`.
