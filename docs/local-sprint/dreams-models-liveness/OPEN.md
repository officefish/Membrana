# Membrana Local Sprint OPEN: dreams-models-liveness

| Поле | Значение |
|------|----------|
| Sprint | `dreams-models-liveness` |
| Procedure | `membrana-local-sprint` |
| Registry card | `dreams-models-liveness` (M) |
| Plan | [`docs/sprint/cut/dreams-models-liveness.json`](../../sprint/cut/dreams-models-liveness.json) (v1, ратифицирован 10.08 15:35Z) |
| Cutter | dynin ([конспект](../../discussions/cut-dreams-models-liveness-dynin.md)) |
| Blocks | b1-test-reads-registry (dynin) · b2-no-second-table-guard (ozhegov) · b3-liveness-verb (dynin) · b4-nightly-cadence (vesnin) |
| Debt | `#office-dreams-test-stubs-own-models` (строка 8 десятки 09.08) |
| Status | gate pass 4/4 `honest_pair`, находок 0 |

## Зачем

Зуб офиса держал свою таблицу маршрутов и настоящий реестр не читал. 07.08 реестр сменил
два id ([`e3c0fb59`](../../../scripts/lib/dreams-providers.mjs)) — прежние ответили с прода
HTTP 404 «Grok 4 Fast is deprecated» и «No endpoints found». Копия осталась на мёртвых.

## Замер вместо риторики

Резчик потребовал посчитать, прежде чем закладывать цену в обоснование: фраза «девять дней
ложного диагноза» принадлежит **соседнему** дефекту (классификатор `net`, погашен PR #1805).

| Мерка | Значение |
|-------|----------|
| Своя таблица в зубе стоит с | 20.07 (`80f2fe18`) |
| Реестр разошёлся с ней | 07.08 (`e3c0fb59`) |
| Окно расхождения | **3 дня** |
| Коммитов в ствол за окно | 38 |
| Зелёных прогонов на main | 45 (`ci.yml`) + 46 (`unit-tests.yml`) |

В каждом из 91 прогона зуб числился пройденным, утверждая маршруты на двух мёртвых моделях.

## Два предиката, два дома

Резчик потребовал не смешивать их в один тест — «иначе снова строим вторую копию правды».

- **Маршрутизация** — зуб пакета. Читает настоящий `scripts/lib/dreams-providers.mjs` тем же
  динамическим импортом по file-URL, что и прод (`dreams.service.ts` → `lib()`). Ожидания
  считаны из реестра, а не выписаны литералами.
- **Живость** — `yarn dreams:probe-models`, ночью. Зуб про маршруты живости не докажет:
  07.08 реестр содержал `grok-4-fast`, и тот был мёртв.

## Что нашёл гард, а не человек

`scripts/dreams-model-ids.test.mjs` при первом же прогоне поймал **третий** носитель id:
[`openrouter.service.ts:20`](../../../packages/background-office/src/modules/openrouter/openrouter.service.ts#L20)
возвращает `anthropic/claude-haiku-4.5` дефолтом при пустом `OPENROUTER_MODEL` — литерал в
прод-коде, вне реестра, на живость не проверяемый. Закрыт оговоркой с причиной и карточкой
`openrouter-default-model-unverified`; нормой не признан.

## Живой прогон глагола

```
dreams:probe-models — вердикт alive · живых 3 · мёртвых 0 · путь: proxy
  alive: perplexity → perplexity/sonar
  alive: grok → x-ai/grok-4.3
  alive: gemini → google/gemini-3.5-flash
  skip:  deepseek — канал deepseek не спрашивает каталог моделей
```

Первый прогон дал `inconclusive · HTTP 403` — тот же geo-блок, что `llm-probe` показывает
для openrouter. Без второй попытки через прокси глагол отвечал бы «не знаю» вечно с любой
машины из РФ, и правило троекратности покраснело бы на третью ночь, означая «мы за
границей», а не «модель мертва». Прокси добавлен по идиоме соседей.

## Три исхода, а не два

`alive` (провайдер ответил, id на месте) · `dead` (ответил, id нет — факт, красный) ·
`inconclusive` (сеть, 5xx, таймаут — мы не знаем). Коды 0/1/2 по прецеденту
`execution-gate`: «проверка сказала нет» и «проверки не было» — разные новости. Один
`inconclusive` ночь красным не красит; три подряд за 72 часа — красят, и правило читает
ленту `docs/truth/dreams-liveness.jsonl`, а не помнит.

## Границы, названные заранее

Проверка живости **не идёт в мердж-гейт** (вердикт резчика: сеть на каждый PR = зелёный шум
при первом же 5xx). Автозамена мёртвых id отклонена: провайдер решал бы за нас, что считать
эквивалентом. Ночь станет блокирующей только после защиты `main` — ход владельца.

## Проверки

`test:scripts` 3935 pass · офисный пакет 273 pass (43 файла) · `kits:pins` чисто ·
`sprint:gate` 4/4 `honest_pair` · точность нарезки 75% (b3 переполнен: 414 против 330 —
прокси в прогноз не закладывался, его потребовал живой прогон).
