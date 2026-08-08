# Прецедент 2026-08-04: M3 run4: панельная цепочка исчерпана без carrier

<!-- precedent-meta
{
  "id": "2026-08-04-static-mmbrn-m3-run4-overlay-chain-exhausted",
  "date": "2026-08-04",
  "class": "session-report",
  "symptom": "Разрешённый внешний M3 run4 исчерпал три звена panel overlay и завершился без контента и carrier",
  "rootCause": "Не установлен: все три настроенных звена вернули no-content, а непробованное default-звено deepseek отсутствует в panel overlay",
  "fix": "Автоматический повтор был запрещён; владелец отдельно разрешил run5 через defaults, сырой carrier сохранён, внешний бюджет 5 из 5 закрыт и M3 собирается локально",
  "canonicalCause": "Consilium panel overlay exhausted without content; provider-level cause remains unclassified",
  "prevention": "До последней попытки либо исправить overlay в панели, либо получить явное разовое разрешение владельца на LLM_NO_OVERLAY=1; после пятого отказа собирать M3 локально",
  "actionItems": [
    {"text": "Отдельно разобрать no-content всех трёх звеньев и полноту panel overlay", "owner": "ozhegov", "status": "open"},
    {"text": "Определить владельцем маршрут последней внешней попытки M3", "owner": "vesnin", "status": "done"}
  ],
  "related": ["2026-08-03-static-mmbrn-m2-twenty-consilium-calls", "2026-07-24-consilium-green-but-hollow"]
}
-->

## Что случилось

После явного разрешения владельца председатель запустил M3 run4 заседания
`static-mmbrn-container` через `scripts/consilium.mjs`. Повестка run4 до вызова прошла
независимый read-only предаудит; её SHA-256:
`2a3666c65e8925f1948aa68b294bcb90887d7c305b06fc6377f55005873c6034`.

Режим вызова: `--save-as static-mmbrn-container-m3-access`, `--min-replies 36`,
`--seed 71`, `--no-context`, `--no-rag`, `--no-memory`. Внешний процесс действительно
дошёл до LLM-цепочки, но ни одно звено не вернуло контент:

1. `anthropic/claude-sonnet-4-6`;
2. `xai/grok-4.5`;
3. `openrouter/anthropic/claude-sonnet-4.6`.

Инструмент завершился с `chain exhausted for consilium after 3 attempt(s) (unknown)`.
Канонический `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md` не создан.
Поэтому сырого carrier для `rejected/` нет: вещдок этого события — вывод инструмента,
этот прецедент и запись в аудите заседания.

## Корень

Причина no-content каждого провайдера не доказана и здесь не сочиняется. Измерено только:
panel overlay содержал три перечисленных звена, все они исчерпались, а default-звено
`deepseek/deepseek-chat` не входило в overlay и потому не пробовалось. Инструмент предложил
две владельческие развилки: исправить overlay панели либо разово разрешить defaults через
`LLM_NO_OVERLAY=1`.

## Фикс

Председатель не включал fallback самовольно и не повторял вызов. Run4 засчитан как четвёртая
из пяти разрешённых внешних попыток M3. Содержательная повестка остаётся прошедшей предаудит;
пятая попытка требует отдельного владельческого выбора внешнего маршрута.

## Профилактика

Владельческий лимит остаётся fail-closed: после пятой внешней неудачи новых API-вызовов для
M3 нет, носитель верстается локально из run1-run3 и их постаудитов. Причинный разбор цепочки
и настройка overlay вынесены в открытые action items этого прецедента.

## Последняя попытка run5

Владелец отдельно разрешил разовый `LLM_NO_OVERLAY=1`. Вызов с той же прошедшей
предаудит повесткой, `--min-replies 36`, `--seed 89` и разреженным входом прошёл по default
chain `anthropic/claude-haiku-4-5-20251001 -> openrouter/anthropic/claude-haiku-4.5 ->
deepseek/deepseek-chat -> xai/grok-4.5` и вернул carrier через
`openrouter/anthropic/claude-haiku-4.5`.

Carrier содержал 41 фактическую ролевую реплику и прошёл структурный гейт, но получил
семантический BLOCK независимого аудитора по grant scope, ordinary revocation, version
checks, Affine mapping, Cases 4/5/8, sensitive-контракту M2, посылкам и самосчёту после DoD.
Сырой результат сохранён в
[`run5-final-external`](../seanses/rejected/static-mmbrn-container-m3-access-2026-08-04-run5-final-external.md).

Это попытка 5 из 5. Внешний run6 запрещён; следующий carrier M3 может быть только явно
помеченной локальной сборкой из сохранённого корпуса.
