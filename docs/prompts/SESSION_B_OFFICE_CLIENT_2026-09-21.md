# Задание сессии B: пара «адрес + ключ офиса» и клиент двери офиса в сервере кабинета (21.09)

**Контур:** заседание «Регистрация в кабинете по промокоду панели», комната M2 «связь и ключ» — **ратифицирована владельцем 21.09**. Решение комнаты ниже приведено дословно из протокола; менять его сессия не может — только исполнить. Спорное — в чат ведущей, не в код.

**Данности:** промокоды регистрации — те же, что у партнёров панели офиса; правда о коде — в панели; вторую систему кодов в кабинете не заводить (слово владельца 21.09). Дверь офиса — по M1 (ратифицирован): `POST /v1/internal/cabinet/registration-codes/consume` под стражем класса `X-Membrana-Token`, запрос `{ "code", "mode": "check" | "redeem" }`, успех 200 `{ "ok": true, … }`, отказ 409 `{ "ok": false, "reason" }`, reason ∈ `not_found | revoked | expired | grant_mismatch | exhausted`. Дверь строит сессия A параллельно — до её PR клиент тестируется на подменном офисе.

**Дерево:** своё, отдельное, от свежего `origin/main`. Ветка вида `feat/cabinet-office-client`. Коммитить только свои файлы поимённо, никогда `git add -A`.

## Границы файлов (M0 + расширение по ратификации M2)

Ровно эти пути, ничего кроме:

- **новый** модуль `packages/background-cabinet/src/modules/office-registration/` (файлы по решению: `office-registration.module.ts`, `office-registration-bridge.service.ts`, `modes.ts`, `index.ts`, тесты `*.test.ts`)
- **новый** `packages/background-cabinet/src/config/office-env.schema.ts`
- `packages/background-cabinet/src/config/config.module.ts`
- `packages/background-cabinet/src/modules/health-deep/` (модуль, сервис, тесты)
- `packages/background-cabinet/src/app.module.ts` — **только строка подключения нового модуля в `imports`**
- `deploy/generate-cabinet-env.sh`

**Не трогать:** `packages/background-cabinet/src/config/env.schema.ts` (сессия C), `modules/auth/` (C), `apps/cabinet` (D), офис (A), лендинг, секреты, прод.

## Решение комнаты M2 (протокол `docs/seanses/cabinet-registration-promo-m2-link-key-2026-09-21.md`, строки 140–190, дословно; два заголовка — по сборке председателя)

| Вопрос | Решение |
|--------|---------|
| Имена пары «адрес + ключ» | `OFFICE_URL` (адрес) и `OFFICE_API_TOKEN` (ключ) |
| Обязательность | Оба **необязательны**. Кабинет стартует без пары; при отсутствии любого из двух `APP_CONFIG.office === null`, флаг регистрации выведен как производный и регистрация выключена |
| Файл-схема пары | `packages/background-cabinet/src/config/office-env.schema.ts`, экспорт `parseOfficeEnv(env): OfficeEnv \| null` — граница B |
| Способ загрузки | `packages/background-cabinet/src/config/config.module.ts` расширяется так, чтобы `APP_CONFIG` нёс поле `office: OfficeEnv \| null`. `config.module.ts` в M0 не закреплён; по решению комнаты его правит сессия B. `env.schema.ts` — не трогается (файл C) |
| Какой ключ | Общий `API_INTERNAL_TOKEN` офиса, тот же, что у пусковика охоты. Отдельный ключ гостя-кабинета не вводим — страж офиса `packages/background-office/src/common/guards/api-token.guard.ts:22` знает ровно один ключ (строка 18 `x-membrana-token`), расширение стража — дверь M1, закрыта |
| Доставка на хост кабинета | Не `generate-cabinet-env.sh` (тот генерирует случайное). Способ — перенос значения из root `.env` на хост кабинета: ручной перенос владельцем **или** план-скрипт `scripts/_sync-cabinet-office-env-from-root.mjs` по образцу `scripts/_sync-office-env-from-root.mjs`. `generate-cabinet-env.sh` правится только комментарием-маркером секции офиса — значение не пишет |
| Отличие от ключа пусковика | Носитель разный (секрет репозитория `OFFICE_API_TOKEN` у пусковика против файла `/etc/membrana/cabinet.env` на хосте кабинета). Значение — то же. Смена ключа офиса ломает оба носителя сразу. Кто проверяет живость: кабинет — чекером `health-deep` (ниже); пусковик — отдельный контур, не эта комната |
| Клиент | Модуль `packages/background-cabinet/src/modules/office-registration/`. Класс `OfficeRegistrationBridgeService`, по образцу `media-bridge.service.ts`: единственный выход наружу `officeFetch`, заголовки `Content-Type: application/json` + `X-Membrana-Token: OFFICE_API_TOKEN`, база `OFFICE_URL` без хвостового `/` |
| Поверхность для C | Один метод `redeemRegistrationCode(code: string): Promise<RegistrationOutcome>`. Тип исхода — размеченное объединение: `{ kind: 'ok'; payload }` \| `{ kind: 'refused'; reason }` \| `{ kind: 'office-unavailable'; detail }` \| `{ kind: 'config-invalid'; detail }`. `reason` — одно из пяти значений M1 |
| Соответствие ответов офиса классам исхода | `200` → `ok`; `409 { ok: false, reason }` → `refused`; `401`, `403` → `config-invalid`; прочие не-2xx → `office-unavailable`; таймаут (`AbortError`) → `office-unavailable`; сетевой сбой (ECONNREFUSED, DNS, `TypeError: fetch failed`) → `office-unavailable` |
| Таймаут | `5000` мс, через `AbortSignal.timeout(5000)` на `officeFetch` |
| Проверка живости | Метод `probeOfficeConfig(): Promise<ConfigProbeOutcome>`: `POST …/consume` с `mode: "check"` и заведомо несуществующим кодом; `409 not_found` — живо; `401`/`403` — ключ мёртв; сбой сети/таймаут — адрес мёртв. Зовётся из расширенного `health-deep`; не на старте кабинета |
| Зубы B | Сетевой сбой; `401` от офиса; таймаут; `409` с каждым из пяти `reason` по отдельности; отсутствие пары в окружении (метод возвращает `config-invalid` без сетевого вызова). Плюс зуб `probeOfficeConfig`: «ключ мёртв» → `config-invalid`; «живо» → `ok`. Зуб сети `network:tooth` / `network:bare-fetch` проходит |
| Что НЕ строить | Вторую систему кодов в кабинете; дверь офиса и её охрану; отдельный ключ гостя для кабинета; порядок «погасить → создать пользователя» (M3); форму и тексты (M4); очередь/ретраи/бэкофф; кэш проверок кода |

**Определение готовности (в границах B, только вопрос Q2):**

- Создан `packages/background-cabinet/src/config/office-env.schema.ts` — схема пары `OFFICE_URL` / `OFFICE_API_TOKEN`, экспорт `parseOfficeEnv(env): OfficeEnv | null`. Обе переменные — необязательные.
- Правка `packages/background-cabinet/src/config/config.module.ts` — `APP_CONFIG` несёт `office: OfficeEnv | null`; `env.schema.ts` не тронут.
- Создан модуль `packages/background-cabinet/src/modules/office-registration/` с классом `OfficeRegistrationBridgeService`, одним выходом `officeFetch`, заголовками `Content-Type` + `X-Membrana-Token`, базой `OFFICE_URL` без хвостового `/`, таймаутом `5000` мс через `AbortSignal.timeout(5000)`.
- Публичная поверхность модуля через `index.ts`: метод `redeemRegistrationCode(code: string): Promise<RegistrationOutcome>` (для C) и метод `probeOfficeConfig(): Promise<ConfigProbeOutcome>` (для живости).
- Маппинг HTTP → класс исхода соответствует таблице вердикта: `200`→`ok`; `409`→`refused`; `401`/`403`→`config-invalid`; прочие не-2xx→`office-unavailable`; таймаут→`office-unavailable`; сетевой сбой→`office-unavailable`. `reason` в ветви `refused` — одно из пяти значений M1 без склейки.
- `packages/background-cabinet/src/modules/health-deep/` расширен чекером живости пары через `probeOfficeConfig`; поведение: `409 not_found` → `ok`, `401`/`403` → `config-invalid`, сетевой сбой/таймаут → `office-unavailable`.
- `deploy/generate-cabinet-env.sh` правится комментарием-маркером секции офиса; значения офиса не пишет.
- Названа (план, не реализация) форма скрипта `scripts/_sync-cabinet-office-env-from-root.mjs` по образцу `scripts/_sync-office-env-from-root.mjs`.
- Тесты сессии B: сетевой сбой; `401` от офиса; таймаут (5000 мс, вызов не виснет дольше); `409` с каждым из пяти `reason` по отдельности; отсутствие пары в окружении (метод возвращает `config-invalid` без сетевого вызова); `probeOfficeConfig`: «ключ мёртв» → `config-invalid`, «живо» → `ok`.
- Прогон зуба сети `network:tooth` / `network:bare-fetch` — зелёный (единственный выход наружу `officeFetch`).
- В браузерный бандл `apps/cabinet` ключ офиса не попадает — проверка границы M0.

## Факты ствола, которые уходят в задание (сверены председателем и аудитором по `origin/main`; решение не меняют)

- **Составной тип конфига.** Тип `AppConfig` объявлен в `env.schema.ts:51` как `z.infer<typeof envSchemaWithDefaults>` — файл C, его не трогать. «`APP_CONFIG` несёт поле `office`» реализуется составным типом рядом со схемой пары (например `AppConfigWithOffice = AppConfig & { office: OfficeEnv | null }`), фабрика в `config.module.ts` возвращает его; потребители `APP_CONFIG` получают поле через тот же токен. Тип экспортируется из `office-env.schema.ts` или `config.module.ts`, не из `env.schema.ts`.
- **Образец клиента.** `packages/background-cabinet/src/modules/pair/media-bridge.service.ts`: класс на строке 97, `@Inject(APP_CONFIG)` (100), заголовки (102–108), база (110–112), единственный выход `mediaFetch` (145–152), `assertOk` (155–159), разбор `{ ok: false, reason }` (207–209). Таймаута у моста нет — у клиента офиса он обязателен (5000 мс). Единственный прецедент `AbortSignal.timeout` в кабинете — `common/incident/incident-sentry.ts:75,82`.
- **Подключение модуля.** `app.module.ts:47–62` — `imports: [AppConfigModule, PrismaModule, …, HealthDeepModule]`; новый модуль подключается там одной строкой. `health-deep.module.ts` сегодня `imports: [PrismaModule]` — для чекера импортировать модуль клиента, не сервис напрямую.
- **Откуда ключ.** Значение ключа офиса рождается в `deploy/generate-office-env.sh:21,29` при первом развёртывании офиса и живёт в `/etc/membrana/office.env` на VDS офиса; корневой `.env` — промежуточный носитель. У пусковика ночной охоты то же значение лежит в секрете репозитория `OFFICE_API_TOKEN` (`.github/workflows/night-hunt-office-trigger.yml:26–27`). Сессия значение не переносит и не печатает — перенос на хост кабинета делает владелец.
- **Флаг регистрации.** Существующий `ALLOW_REGISTRATION` (`env.schema.ts:37,47`, в проде `false`) в решении M2 не назван; два условия включения регистрации — предмет M3 и сессии C. B отдаёт только `APP_CONFIG.office === null` как факт и регистрацию не включает и не выключает.
- **Имена тестов.** Прецедент кабинета — `media-bridge.service.test.ts`, не `.spec.ts`.
- **Словарь в коде.** Имена переменных, полей и значений — как в таблице, буква в букву. В комментариях: таймаут, недоступность офиса, ошибка конфигурации — не «fallback», «retry», «healthcheck».

## Порядок работы

1. Сначала красные зубы: на стволе модуля нет — зубы падают на импорте; показать это в отчёте. Подменный офис в тестах — локальный `http` сервер или перехват `fetch` на уровне модуля; голого `fetch` вне `officeFetch` быть не должно, иначе зуб сети красный.
2. Схема пары → составной тип и фабрика → модуль клиента → чекер живости → строка в `app.module.ts` → маркер в `generate-cabinet-env.sh`.
3. PR через `yarn pr:ship --type feat --scope cabinet --message "…" --execute`; в теле PR — команды, которыми проверены пункты готовности, и вывод зубов до/после, вывод `yarn network:tooth`. Не `gh pr merge`.
4. Ревью и слияние — по приёмке ведущей по факту; отдельного слова владельца не нужно. Прод не выкатывать, пару в `cabinet.env` не писать: это слово владельца после M3.

## Отчёт ведущей (в чат, по факту, не по exit code)

- ветка, вершина PR, список файлов — все в границах;
- вывод зубов на стволе (красные) и на ветке (зелёные) — цитатой; вывод зуба сети;
- как выглядит `RegistrationOutcome` в `index.ts` — это контракт для сессии C, его текст в отчёт целиком;
- что осталось спорным — вопросом, не решением.

## Границы

- Решение M2 не переоткрывать; «а лучше бы» — в чат ведущей, отдельным вопросом.
- Не трогать `env.schema.ts`, `modules/auth/`, `apps/cabinet`, офис, деплой-скрипты кроме маркера, секреты, прод.
- Никаких `--no-verify`, `git add -A`.
