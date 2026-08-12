# Материал к заседанию: контейнер `network` (такт 1 — сырьё)

> Слово владельца 29.07: контейнер сети проектируем заседанием, но сначала собираем
> данные, чтобы форма не проектировалась поверх незнания. Это такт 1.

## Главная находка такта: диагноз был шире, чем причина

Вчерашняя формулировка — «на office-VDS нет исходящего маршрута к LLM, сетевой фильтр
Timeweb». Разбор кода office показывает картину точнее.

**Прокси на office предусмотрен архитектурно и уже реализован:**

- [`config/env.schema.ts`](../../packages/background-office/src/config/env.schema.ts#L25-L26)
  объявляет `HTTPS_PROXY` и `HTTP_PROXY` как опциональные переменные;
- строка 36 той же схемы: `/** Dreams NB2: Perplexity sonar via HTTPS_PROXY */` —
  **сны спроектированы ходить через прокси**;
- [`openrouter.service.ts`](../../packages/background-office/src/modules/openrouter/openrouter.service.ts#L33)
  полностью proxy-aware, с комментарием в коде: «голый fetch не видит `HTTPS_PROXY`
  (урок night-hunt)» — грабля уже была выучена и учтена;
- [`lib/outbound-self-check.ts`](../../packages/background-office/src/lib/outbound-self-check.ts#L54)
  читает те же переменные и строит `ProxyAgent`.

**А прод-компоуз их не передаёт.** В
[`deploy/background-office.prod.compose.yml`](../../deploy/background-office.prod.compose.yml#L27-L30)
блок `environment` содержит ровно две переменные — `DREAMS_ENABLED` и
`DREAMS_VOLUME_PATH`. Ни одной прокси-настройки.

Следствие: `resolveProxyUrl()` возвращает `null`, диспетчер не создаётся, запрос идёт
напрямую — и получает `net`. Тридцать раз из тридцати.

**То есть проверять нужно сначала не фильтр хостера, а доставку переменной в
прод-контейнер.** Это не отменяет возможного гео-блока — но ставит его вторым в
очереди, а не первым.

## Расхождение внутри самого office: два класса каналов

| канал | транспорт | proxy-aware |
|---|---|---|
| `openrouter.service` | `undici` + `ProxyAgent` | **да** |
| `claude.service` | `undici` + `ProxyAgent` | **да** |
| `telegram.client` | `undici` + `ProxyAgent` | **да** |
| `outbound-self-check` | `undici` + `ProxyAgent` | **да** |
| **`deepseek.service`** | **глобальный `fetch`** | **нет** |
| `github.service` | глобальный `fetch` | нет |

Сны ходят двумя путями:
[`dreams.service.ts`](../../packages/background-office/src/modules/dreams/dreams.service.ts#L169-L186)
маршрутизирует `deepseek` в собственный сервис, а `grok`/`gemini`/`perplexity` — через
`openrouter`.

**Практический вывод:** если завтра передать `HTTPS_PROXY` в прод-контейнер, три
провайдера из четырёх поедут, а `deepseek` останется красным — его сервис переменную не
читает. Одна правка конфига закроет три четверти симптома и оставит четверть, которую
легко списать на «туннель не помог».

## Инвентарь: кто звонит наружу из office

Из `packages/background-office/src`: `api.anthropic.com` · `api.deepseek.com` ·
`openrouter.ai` · `api.perplexity.ai` · `api.telegram.org` · `api.github.com` ·
`github.com` · `panel.mmbrn.tech` · `membrana.space` · `linear.app`.

**Особый случай — Linear.** В `outbound-self-check.ts` зонд на Linear намеренно
исключён с формулировкой: *«office must not egress to api.linear.app (K1). Live pull =
media-NL → linear-snapshot@1. Probing Linear from office would either 403 (RU) or
falsely green-light a forbidden path.»*

То есть **транзит через media-NL — не идея, а работающий код**:
[`linear-snapshot/media-snapshot.client.ts`](../../packages/background-office/src/linear-snapshot/media-snapshot.client.ts)
дёргает media-VPS, тот снимает снимок и отдаёт результат; ключ Linear в запросе не
передаётся. Прецедент делегирования вызова машине вне РФ уже живёт в проде.

## Что уже есть как органы будущего контейнера

- `net:diag` — классификатор состояний сети: `unreachable · tcp-data-filter ·
  pmtu-blackhole · packet-loss · ok`. Чистое ядро с тестом, выведено из инцидента
  office 11.07.
- `llm:probe`, `infra:probe`, `net:http`, `probe:node-link` — зонды.
- `llm-calls:audit` — **готовый образец жанра**: дом `docs/audit/llm-calls`, построен по
  GROUP_CONTAINERIZATION + HOME_WORKSHOP, с закрытым списком запрещённых к записи полей
  (`prompt`, `apiKey`, `rawResponse`, `messages`, `content`).
- `infra-policy.json` — 13 звеньев с `billing`, `probe`, `knownBlocked`. Соседняя
  поляна: реестр **мощностей**, не маршрутов. Граница с ним — вопрос заседания.
- `outbound-self-check` в самом office — орган измерения с `reachable`, `latencyMs`,
  `httpStatus`, переиспользуемый в `/ready`.

## Чего по-прежнему нет

1. **Карты маршрутов.** Какая машина через какой выход ходит — нигде не сведено.
   `infra-policy` описывает ресурсы, не пути.
2. **Замера с самого office.** Всё знание о блокировке — это `net` тридцать раз.
   Ни трассировки, ни различения «фильтр хостера» от «геоблок провайдера».
   `net:diag` это умеет, но с office его не запускали.
3. **Инвентаря не-LLM исходящих по всему репозиторию.** Собран только по office;
   cabinet, media, скрипты — не сведены.
4. **Рядов вместо снимков.** Все зонды дают «сейчас так». Для аудита *состояния*
   нужна история: когда деградировало, как часто, что предшествовало.

## Что нужно от владельца (прод в hard deny у агента)

Один заход на office-VDS, три вопроса:

1. Видит ли контейнер `HTTPS_PROXY`? — `docker exec <office> env | grep -i proxy`
2. Есть ли вообще исходящий путь наружу? — `docker exec <office> node -e
   "fetch('https://api.github.com/').then(r=>console.log(r.status)).catch(e=>console.log('FAIL',e.message))"`
3. Достижим ли с office прокси-эндпоинт и media-VPS?

Первый ответ, скорее всего, закрывает половину вопроса.

## Открытые вопросы к заседанию (форма)

- Где дом контейнера и что считать **звеном**: пара (источник → цель)? маршрут? хост?
- Какие состояния различаем — берём ли пять из `net:diag` как готовый enum?
- Граница с `infra-policy`: мощности там, маршруты здесь — где ровно проходит шов?
- Кто владелец такта: аудит сети — ритуал дня, недели или по требованию?
- Что записывается в реестр, а что остаётся в `cache/` (секретов и токенов в репо нет —
  образец запретного списка уже есть у `llm-calls:audit`).
- Как контейнер относится к **исходящим правилам**: `K1` (office не ходит в Linear) —
  это архитектурное решение, которое должно где-то жить как проверяемое правило.

---

## Дополнение сырья 12.08 (пробелы 1 и 3 такта 1; агент, read-only)

> Прод не трогался (hard deny): всё ниже — из кода и деплой-доков ствола @ 12.08.

### Пробел 3 — инвентарь исходящих по всему репозиторию (не только office)

Греп `fetch(/undici/ProxyAgent/https.request` по `packages/*/src` и `scripts/`:

| Вызыватель | Куда ходит | Proxy-aware |
|---|---|---|
| office: `openrouter` / `claude` / `telegram` / `outbound-self-check` / `proxy-fetch` | LLM/Telegram | **да** (материал 29.07) |
| office: `deepseek.service` | api.deepseek.com | **нет** (известное расхождение) |
| office: `linear-snapshot/media-snapshot.client` | media-VPS NL | транзит K1 — по построению |
| cabinet: `pair/media-bridge.service` | media | **нет** — голый fetch |
| media: `linear-snapshot.service` | Linear | **нет** — и легально: NL-машина без фильтра, прокси не нужен; но это решение НИГДЕ не записано словом |
| media-library: `server-storage-backend`, `bundled-catalog` | сторадж/каталог | **нет** |
| rag: `openai-embedder`, `voyage-embedder` | OpenAI/Voyage | **да** — единственные proxy-aware вне office |
| scripts (dev-машина): `net-http`, `infra-probe`, `network/probe`, `affine-import`, `cabinet-catalog-client`, `media-samples-client`, `dataset-audio`, `fetch-real-dataset-collection`, `office-image-smoke`, `telegram-swallow` (push-ingest) | GitHub/office/media/cabinet/Affine/датасеты | смешанно; dev-машина за локальным прокси из `.env` |

**Наблюдение к заседанию:** «deepseek красный» — не единичный пропуск, а класс:
proxy-awareness сегодня — свойство ФАЙЛА, а не машины или политики. Правило вида
«с какой машины какой выход легален» нигде не живёт как проверяемое (K1 — единственный
записанный прецедент, и тот прозой).

### Пробел 1 — карта маршрутов (из кода, не из замера)

```
dev-машина (RF)   → локальный прокси (.env HTTPS_PROXY) → LLM/GitHub/Affine
office (RF VDS)   → HTTPS_PROXY (если доставлен компоузом! — дыра из находки 29.07) → LLM
office            → media-VPS NL (транзит K1) → Linear
media (VPS NL)    → Linear / сторадж напрямую (фильтра нет)
cabinet           → media (media-bridge)
CI (GitHub)       → registry.npmjs/провайдеры напрямую
```

Замер С office (пробел 2) и история рядов (пробел 4) — по-прежнему за владельцем
и за заседанием: зонды все снимковые, ленты нет (кандидат формы — по образцу
`docs/audit/llm-calls`).

### Готовность к такту 2

Сырьё по пробелам 1 и 3 добрано; повестка заседания в #1449 остаётся узкой:
форма контейнера, не починка сети. Новый пункт в повестку от инвентаря:
**proxy-awareness как политика машины, а не свойство файла** — где живёт правило
и чем проверяется (зуб?).
