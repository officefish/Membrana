<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-29T11:10:46.258Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/network-container-form-2026-07-29.md` |
| Порядок ролей | Структурщик → Математик → Верстальщик → Архитектор → Музыкант → Teamlead |
| Повестка | `C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana-openrouter/824ece24-fa76-41ed-877b-3f453c301277/scratchpad/network-container-agenda.md` |

**Вопрос:**

Спроектируйте контейнер network и его мастерскую. Слово владельца: инструменты должны (1) впредь позволять находить сетевые ошибки БЫСТРЕЕ, чем двое суток, и (2) информировать агентов о нашем сетевом окружении ЗАРАНЕЕ. Отвечайте по вопросам Q1-Q7 повестки конкретикой: имена файлов, имена команд, закрытые перечни значений, что падает красным. Не проектируйте туннель — замер показал, что сеть работает. Центральный вопрос — Q3: перечень исходов, который отличает сетевой отказ от гео-403, снятой модели, кончившихся денег и отсутствующего ключа. В итоге дайте: дом контейнера, органы, перечень исходов, состав мастерской, зуб, ритм и способ информировать агента заранее.

---

# Консилиум: контейнер network и мастерская диагностики

**Повестка:** Q1 дом контейнера · Q2 органы · Q3 перечень исходов (сеть ≠ geo-403 ≠ снятая модель ≠ деньги ≠ ключ) · Q4 состав мастерской · Q5 зуб · Q6 ритм · Q7 информирование агента заранее. Туннель не проектируем — замер показал, что сеть работает. Цель владельца: (1) находить сетевые ошибки быстрее двух суток; (2) агент знает окружение до первого запроса.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Структурщик → Математик → Верстальщик → Архитектор → Музыкант → Teamlead

---

[Структурщик]: Начинаю со словаря, иначе снова синонимы. **Контейнер network** — не туннель и не VPN-пакет, а home артефактов сетевого окружения и диагностики исходящих вызовов (LLM/API/git). **Орган** — именованный файл/команда с одной словарной ролью. **Исход (outcome)** — закрытый enum причины отказа, не свободный текст в логе. **Мастерская** — набор зубов и ритуалов над контейнером. Дом предлагаю: `docs/network/` + машинный снимок `docs/network/env.snapshot.json`; скрипты — `scripts/network/*.mjs`. Не мешать с `packages/services/*` — это ops-контур, не product-сервис.

[Математик]: Формализую без UI. Пусть запрос R к провайдеру P даёт наблюдение O = (httpStatus?, errno?, bodyCode?, latencyMs, dnsOk, tcpOk, tlsOk). Классификатор `classify(O) → outcome` обязан быть **тотальным** на закрытом множестве исходов и **взаимно исключающим**: один O → ровно один outcome. Сетевой отказ — только когда падает dns|tcp|tls **до** HTTP-статуса приложения; geo-403, billing, missing_key, model_gone — это HTTP/API-слой при живом транспорте. Порог «быстрее двух суток»: медиана времени до первого верного outcome ≤ 15 минут с момента красного прогона.

[Верстальщик]: С витрины агента и капитана отказ обязан читаться без легенды. Не «Error: fetch failed» серой прозой, а карточка: `outcome` + одна строка «что это» + «что не делать». Честная пустота: если снимок окружения старше SLA — бейдж `stale`, не зелёный «ок». UI продукта не рисуем; контракт текста для терминала и для блока в промпте агента — одна таблица исходов, одни имена.

[Архитектор]: Конструкция: контейнер network — **read-model окружения + classify-контракт**, не новый микросервис и не туннель. Граница: пишет только мастерская (скрипты/CI); читают агенты, preflight и человек. Цена альтернативы «держать в SERVICES.md» — смешение product и ops. Затронутые модули: `docs/network/**`, `scripts/network/**`, опционально хук в pre-push/evening, вставка в agent context (AGENTS.md / consilium seed) — **не** `packages/services/*`. Рекомендация: форма = ADR-коротыш в `docs/network/README.md` + schema снимка; отдельный ADR в `docs/adr/` только если появится runtime-daemon.

[Музыкант]: На слух боль владельца — два дня «ищу обрыв», а играла другая струна: ключ, бан, модель снята. Туннель не строим — тракт живой. Нужен **count-in до соло**: агент слышит room tone сети *до* первого API-take. Мастерская = тюнер и meters, не новый эффект в цепи продукта. Если meter врёт «network» на 403 — это клиппинг доверия хуже тишины.

[Teamlead]: Положение: сеть работает, матч проигран на классификации и на незнании окружения заранее. Планка владельца — две: скорость верного outcome и preflight для агента. Связка: Структурщик — homes/леммы; Математик — enum и предикаты classify; Архитектор — граница ops-контейнера; Верстальщик — честные формулировки карточки; Музыкант — слух на ложные «network». Не проектируем VPN. Дальше — Q1–Q7 по существу, без «улучшить логи».

[Структурщик]: **Q1. Дом.** Канон:
- `docs/network/README.md` — манифест контейнера (что есть / чего нет: «не туннель»).
- `docs/network/outcomes.yml` — закрытый перечень исходов (единственный словарь).
- `docs/network/env.snapshot.json` — последний снимок окружения (машинный).
- `docs/network/env.snapshot.md` — человекочитаемая проекция снимка (как memory md).
- `docs/network/probes/` — профили зондов (`openai.json`, `anthropic.json`, `github-api.json`, `npm-registry.json`).
- `docs/network/history/*.jsonl` — append-only лента прогонов (не перетирать снимок без следа).
Скрипты не живут в docs: `scripts/network/probe.mjs`, `classify.mjs`, `snapshot.mjs`, `preflight.mjs`.

[Математик]: **Q3 (центр).** Черновик закрытого множества `NetworkOutcome` (имена стабильные, snake):
1. `ok` — транспорт + auth + model/route доступны.
2. `dns_fail` — не резолвится host.
3. `tcp_fail` — connect timeout/refused до TLS.
4. `tls_fail` — handshake/cert.
5. `timeout_idle` — TCP/TLS есть, ответа нет до deadline.
6. `proxy_intercept` — неожиданный MITM/SSL body/corporate portal.
7. `geo_blocked` — HTTP 403 + маркеры geo/region/country/cloudflare-code (не путать с auth).
8. `auth_missing_key` — нет ключа в env/OS keychain; локальный preflight, без сети.
9. `auth_invalid_key` — 401 / invalid_api_key.
10. `billing_exhausted` — 402/429 с billing|quota|insufficient|payment.
11. `model_removed` — 404/400 с model_not_found|deprecated|no longer available.
12. `rate_limited` — 429 без billing-маркеров (retry-after).
13. `provider_5xx` — 500–599.
14. `provider_unreachable_http` — соединение ок на control-probe, целевой host — нет (частичный outage).
15. `unknown_protocol` — не уложились; **красный** зуб требует дописать правило, не молчать.

Предикат «сетевой отказ» = исход ∈ {`dns_fail`,`tcp_fail`,`tls_fail`,`timeout_idle`,`proxy_intercept`,`provider_unreachable_http`}. Остальное — **не сеть**.

[Верстальщик]: Для каждого outcome в `outcomes.yml` поля витрины (обязательные):
- `id`, `layer`: `transport|http|local|provider`,
- `title_ru`, `summary_ru` (≤120 символов),
- `agent_hint_ru` — что делать агенту,
- `do_not_ru` — типичная ошибка («не поднимай туннель», «не ротируй ключ»),
- `badge`: `ok|red|amber|grey`.
Красные для «искали сеть два дня»: любые transport + `unknown_protocol`. Янтарный: billing, model_removed, geo, rate_limit. Серый: local missing key (ещё не ходили в сеть). Фальшивый title «сетевая ошибка» на `geo_blocked` — запрещён словарём.

[Архитектор]: **Q2. Органы** (один орган — одна ответственность):

| Орган | Path / команда | Роль |
|-------|----------------|------|
| Словарь исходов | `docs/network/outcomes.yml` | единственный enum |
| Зонд | `yarn network:probe --profile <name>` → `scripts/network/probe.mjs` | сырое O |
| Классификатор | `yarn network:classify` → `scripts/network/classify.mjs` | O→outcome чистая функция |
| Снимок | `yarn network:snapshot` | пишет `env.snapshot.json` + md |
| Preflight | `yarn network:preflight` | exit≠0 + машиночитаемый stderr/json |
| История | `docs/network/history/YYYY-MM-DD.jsonl` | append run |
| Карточка агента | блок в snapshot.md + emit в context | «окружение заранее» |

Запрет: classify внутри probe UI-строк; запрет: agent сам парсит curl. Граница: ключи **не** пишутся в snapshot (только `present|absent|fingerprint_sha256_8`).

[Музыкант]: Профили зондов — как входные канала, не один «пинг мира». Минимум v1: `cloudflare-trace` (контроль «интернет жив»), `api.openai.com`, `api.anthropic.com`, плюс `github.com` если ship страдает. Control-probe отделяет `dns_fail` глобальный от `provider_unreachable_http`. На слух: если control ok, а openai tcp_fail — это не «у нас интернета нет» и не повод к туннелю по умолчанию.

[Teamlead]: Фиксирую дисциплину: **сначала preflight, потом гипотеза туннеля**. Туннель вне скоупа — слово владельца. Q3 Математика принимаем как рабочий enum v1; `unknown_protocol` всегда красный — иначе снова два дня фольклора. Дальше — мастерская, зуб, ритм, how-to для агента.

[Структурщик]: **Q4. Состав мастерской** (файлы, не идеи):
1. `scripts/network/lib/outcomes.mjs` — загрузка YAML, freeze enum.
2. `scripts/network/lib/classify.mjs` — чистый classify(O).
3. `scripts/network/probe.mjs` — DNS→TCP→TLS→HTTP, пишет raw json в stdout.
4. `scripts/network/snapshot.mjs` — собирает: OS, proxy env (`HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` — values redacted), DNS servers, clock skew, node version, presence ключей (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`… — closed list в `docs/network/keys.catalog.yml`), last probe outcomes.
5. `scripts/network/preflight.mjs` — snapshot+probe+classify; exit codes: 0 ok, 10 transport, 20 auth, 30 billing/geo/model, 40 unknown.
6. `scripts/network/render-agent-block.mjs` — markdown ≤40 строк для вставки в контекст.
7. `docs/network/outcomes.yml` + `keys.catalog.yml` + `probes/*.json`.
8. Тесты: `scripts/network/__tests__/classify.test.mjs` — фикстуры на каждый outcome.

[Математик]: Предикаты classify (порядок важен, first-match):
0. local: key required && !present → `auth_missing_key`.
1. !dns → `dns_fail`.
2. !tcp → `tcp_fail`.
3. !tls → `tls_fail` (если body/html portal → `proxy_intercept`).
4. idle > T → `timeout_idle`.
5. status 401 / codes ∈ {invalid_api_key, authentication_error} → `auth_invalid_key`.
6. status 403 && geoMarkers → `geo_blocked`; 403 && !geo → остаётся ветка provider (может `auth_invalid_key` или `unknown_protocol` если нет маркеров — лучше unknown, чем врать network).
7. billing markers → `billing_exhausted`.
8. model markers → `model_removed`.
9. 429 && !billing → `rate_limited`.
10. 5xx → `provider_5xx`.
11. control ok && target transport fail → `provider_unreachable_http`.
12. 2xx → `ok`.
13. else → `unknown_protocol`.

Фикстуры: по одному raw O на исход; тест на **отсутствие** пути `geo_blocked → dns_fail`. T_idle v1 = 15000 ms (константа в probe profile, не магия в classify).

[Верстальщик]: Проекция `env.snapshot.md` — конструкция из трёх полос, без декора:
1. **Статус:** `preflight: OK|FAIL` + dominant outcome badge.
2. **Исходы зондов:** таблица profile → outcome → latencyMs.
3. **Ключи:** имя → present/absent (без секрета).
4. **Agent block** fenced: «до любого внешнего API прочитай это».
Пустой history — строка `history: empty (no runs)`, не отсутствие секции. Stale: если `generatedAt` старше 24h — `badge: stale` в шапке.

[Архитектор]: **Q7. Информировать агента заранее** — три канала, один источник (`env.snapshot.json`):
A. **Статический** — `docs/network/env.snapshot.md` в репо (обновляется ритмом); ссылка из `AGENTS.md` секция «Network preflight».
B. **Командный** — агент/человек перед внешним вызовом: `yarn network:preflight --emit-agent-block`.
C. **Вшивка в тяжёлые входы** — `yarn consilium` / bridge seed / task prompt: опциональный флаг `--with-network` (как `--with-memory`), вставляет agent-block.
Не плодить второй snapshot в `.cursor/`. Цена: без C агент «не видит» пока не прочитает docs; с C — токены. v1: A+B обязательны, C — opt-in.

[Музыкант]: Ритм на слух (Q6): не cron-демон, а **count-in в существующих ритуалах**. Утро/evening developer-rhythm — soft step `network-snapshot` (как leveling soft). Перед ship в облако моделей — hard preflight только если задача трогает provider API (не на каждый lint). Ложный daily red на rate_limit не должен орать как transport — иначе глушим meters.

[Teamlead]: Q6 принимаю: snapshot в evening soft; preflight — по требованию и в CI job `network-preflight` **non-blocking** первую неделю, потом blocking на `unknown_protocol`+transport. Зуб (Q5) — следующий круг. Кто краснеет — названо.

[Структурщик]: **Q5. Зуб** — `scripts/network/tooth.mjs`, команда `yarn network:tooth`:
- читает last snapshot + обязательный self-check classify fixtures;
- **падает красным (exit 1)**, если:
  1. нет `docs/network/outcomes.yml` или enum не покрыт тестами;
  2. snapshot отсутствует;
  3. snapshot stale > 48h (планка «быстрее двух суток» — зуб не даёт жить со снимком старше боли);
  4. last dominant outcome ∈ transport ∪ {`unknown_protocol`} и нет `history` записи younger than 48h с `ok` или не-transport (т.е. « Ignored red»);
  5. agent-block hash ≠ hash от snapshot (проекция соврала).
- **не краснеет** на `billing_exhausted` / `model_removed` / `geo_blocked` в tooth репо-гигиены — это сигнал продукта/аккаунта, отдельный annotation в snapshot, amber.
Wire: optional CI + можно в pre-push soft (warn) → hard после приживления.

[Математик]: Метрика успеха владельца — не uptime. Счётчики в jsonl run:
- `t_detect_ms` — от start probe до outcome;
- `misclass_suspected` — ручная метка в history (v1 optional);
- предикат SLA: доля run, где transport-исход подтверждён повторным probe в том же run (double-check), ≥ 1 для transport.
Инвариант: `P(outcome=dns_fail | httpStatus∈2xx..5xx) = 0` — если нарушен classify, tooth на unit-тестах красный до мержа.

[Верстальщик]: Карточка `unknown_protocol` на витрине: title «Не классифицировано», do_not «не называй это сетью», agent_hint «приложи raw json из probe к отчёту, допиши правило в outcomes». Иначе снова фольклор. Для geo: do_not «не чини DNS и не роняй туннель по умолчанию».

[Архитектор]: Уточнение границы с product: если завтра client ходит в API — classify остаётся в scripts/network; UI может показать badge только через чтение preflight JSON, без импорта probe в `apps/client`. Никакого `@membrana/network-service` в v1 — преждевременная лемма. Home остаётся docs+scripts.

[Музыкант]: Double-check transport на слух: два take подряд, если один ok один fail — outcome `unknown_protocol` или явный `flaky_transport`? Предлагаю не плодить исход: в raw писать `samples:2`, classify по worse-of, в summary «flaky». Enum не раздувать без фикстур.

[Teamlead]: Flaky — в raw/summary, не новый enum v1. Согласен. Ангелину не зовём — неправды по репо-фактам нет, мы проектируем. Фаррелл молчит. Добиваем закрытые перечни ключей и exit codes, потом вердикт.

[Структурщик]: `docs/network/keys.catalog.yml` v1 closed list:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY` (если есть gemini-контур)
- `GITHUB_TOKEN` / `GH_TOKEN`
- `NPM_TOKEN`
- `CURSOR_API_KEY` (если используется)
Каждый: `requiredFor: [profiles…]`, `redact: fingerprint`. Нет ключа в catalog — snapshot его **не** ищет (запрет сканировать весь env).

[Математик]: Exit codes preflight (закрытый перечень):
- `0` — all required profiles `ok`
- `10` — transport-class outcome
- `20` — auth_missing_key | auth_invalid_key
- `30` — geo_blocked | billing_exhausted | model_removed | rate_limited | provider_5xx
- `40` — unknown_protocol
- `2` — usage/tool error (нет profile, YAML broken)
Агент ветвится по коду, не по regex английского stderr. Stdout always JSON: `{ok, dominantOutcome, profiles[], agentBlockMd, generatedAt}`.

[Верстальщик]: В `AGENTS.md` одна короткая секция-конструкция (не роман): «Перед внешним API: `yarn network:preflight`. Исходы: см. `docs/network/outcomes.yml`. Не трактуй любой fail как VPN.» Ссылка на snapshot.md. Всё. Декор и эссе — вне контракта.

[Архитектор]: Итоговая форма решения: **ops-контейнер `docs/network` + мастерская `scripts/network` + tooth + soft rhythm**. Q3 enum — несущая балка. Туннель/VPN — out of scope явно в README. Принимаю к вердикту Тарасова.

[Музыкант]: Принимаю enum и control-probe. Главное на слух — чтобы `geo_blocked` и `billing_exhausted` больше никогда не микшировались в дорожку «сеть упала».

[Teamlead]: Вердикт комнаты — **делать**. Связка исполнения: Структурщик (scaffold homes+yarn), Математик (classify+tests), Верстальщик (md/AGENTS тексты), Архитектор (README границы), Музыкант (профили probe на слух маркеров). LGTM на дизайн; BLOCK на реализацию, если появится туннель или `@membrana/network-service` без ADR.

[Структурщик]: DoD-леммы для scaffold: yarn-скрипты `network:probe|classify|snapshot|preflight|tooth`; файлы homes существуют; classify tests 15/15 green; README содержит фразу-запрет туннеля. Принимаю.

[Математик]: Принимаю. Добавляю в DoD: таблица фикстур «исход → raw O» в `scripts/network/__tests__/fixtures/*.json` ровно по одному на id из outcomes.yml (кроме ok — два: openai+anthropic).

[Верстальщик]: Принимаю. DoD витрины: snapshot.md рендерится из json; stale виден; agent-block без секретов (тест на regexp ключей).

[Архитектор]: Принимаю. Граница ops/docs+scripts зафиксирована; product packages не трогаем.

[Музыкант]: Принимаю. Control-probe + provider probes в v1 must-have.

[Teamlead]: Единое решение ниже. Матч = агент за <15 мин получает верный outcome и до запроса видит snapshot. Тренировка = зелёные unit-тесты classify. Сдаём оба.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **Q1. Дом контейнера** | `docs/network/` (README, `outcomes.yml`, `keys.catalog.yml`, `env.snapshot.json`, `env.snapshot.md`, `probes/*`, `history/*.jsonl`). Код мастерской: `scripts/network/*.mjs`. **Не** `packages/services/*`. Туннель не проектируется. |
| **Q2. Органы** | Словарь `outcomes.yml` · зонды `yarn network:probe` · classify `yarn network:classify` · снимок `yarn network:snapshot` · preflight `yarn network:preflight` (JSON stdout, exit 0/10/20/30/40/2) · history jsonl · agent-block render · зуб `yarn network:tooth`. |
| **Q3. Перечень исходов** | Закрытый enum: `ok`, `dns_fail`, `tcp_fail`, `tls_fail`, `timeout_idle`, `proxy_intercept`, `geo_blocked`, `auth_missing_key`, `auth_invalid_key`, `billing_exhausted`, `model_removed`, `rate_limited`, `provider_5xx`, `provider_unreachable_http`, `unknown_protocol`. **Сеть** = transport-множество {dns,tcp,tls,timeout_idle,proxy_intercept,provider_unreachable_http}. Geo/billing/model/key — **не** сеть. Classify first-match, фикстуры на каждый id. |
| **Q4. Состав мастерской** | `probe.mjs`, `classify.mjs` (+ `lib/`), `snapshot.mjs`, `preflight.mjs`, `render-agent-block.mjs`, `tooth.mjs`, `outcomes.yml`, `keys.catalog.yml`, `probes/*.json`, `__tests__/classify.test.mjs` + fixtures. Yarn: `network:probe\|classify\|snapshot\|preflight\|tooth`. |
| **Q5. Зуб (что красное)** | `yarn network:tooth` red: нет словаря/снимка; snapshot >48h; transport\|unknown без свежего follow-up; agent-block рассинхрон; unit-coverage enum дырявый. **Не** red tooth: billing/geo/model (amber в snapshot). CI: сначала non-blocking. |
| **Q6. Ритм** | Evening/morning soft step `network-snapshot`; preflight по требованию перед внешним API и opt-in в тяжёлых входах; не демон; не hard на каждый commit в v1. |
| **Q7. Агент заранее** | Источник истины — `env.snapshot.json`. Каналы: (A) `env.snapshot.md` + секция в `AGENTS.md`; (B) `yarn network:preflight --emit-agent-block`; (C) opt-in `--with-network` в consilium/bridge. Ключи только present/absent/fingerprint. |

### Сводка «на руки» (как просил владелец)

| Элемент | Значение |
|---------|----------|
| **Дом** | `docs/network/` + `scripts/network/` |
| **Органы** | outcomes · probe · classify · snapshot · preflight · history · agent-block · tooth |
| **Исходы** | 15 id выше; сеть ≠ geo-403 ≠ model_removed ≠ billing ≠ missing/invalid key |
| **Мастерская** | scripts + yaml-каталоги + fixtures + yarn targets |
| **Зуб** | `yarn network:tooth` (stale 48h, enum, transport/unknown, sync projection) |
| **Ритм** | soft snapshot в ритуале дня; preflight before external API |
| **Заранее** | snapshot.md + AGENTS.md + `network:preflight` (+ opt-in seed) |

**Definition of Done:**

1. Homes и yarn-команды на месте; README явно: «не туннель / сеть уже работает — классифицируй».
2. `outcomes.yml` = единственный enum; classify + 1 fixture на исход; инвариант «HTTP status ⇒ не dns_fail».
3. `yarn network:preflight` печатает JSON и agent-block без секретов; exit codes 0/10/20/30/40/2.
4. `yarn network:tooth` краснеет на stale>48h и дырявый enum.
5. `AGENTS.md` содержит секцию preflight; `env.snapshot.md` рендерится из json.
6. Control-probe + ≥2 provider profiles в `docs/network/probes/`.
7. Нет пакета `@membrana/network-service` и нет VPN/tunnel design в PR.

---

*Реплик в диалоге: 36; каждый участник высказался не менее одного раза.*
