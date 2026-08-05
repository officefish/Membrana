# Прецедент 2026-08-05: M4 run4: панельная цепочка исчерпана по rate limit

<!-- precedent-meta
{
  "id": "2026-08-05-static-mmbrn-m4-run4-overlay-chain-rate-limit",
  "date": "2026-08-05",
  "class": "session-report",
  "symptom": "Разрешённый M4 run4 исчерпал три звена panel overlay по rate_limit и завершился без carrier",
  "rootCause": "Все три настроенных overlay-звена вернули rate_limit; default-звено deepseek не входило в overlay и не пробовалось",
  "fix": "Run4 засчитан как 4 из 5 без автоповтора; владелец разрешил run5 через defaults, после его BLOCK внешний бюджет закрыт и M4 собран локально",
  "canonicalCause": "Все три настроенных overlay-звена вернули rate_limit; default-звено deepseek не входило в overlay и не пробовалось",
  "prevention": "До последней попытки исправить overlay либо получить отдельное разрешение на LLM_NO_OVERLAY=1; после пятого отказа собирать M4 локально",
  "actionItems": [
    {"text": "Разобрать общий rate_limit трёх overlay-звеньев и полноту panel chain", "owner": "ozhegov", "status": "open"},
    {"text": "Выбрать владельцем маршрут последней внешней попытки M4", "owner": "vesnin", "status": "done"}
  ],
  "related": ["2026-08-04-static-mmbrn-m3-run4-overlay-chain-exhausted", "2026-08-03-static-mmbrn-m2-twenty-consilium-calls"]
}
-->

## Что случилось

После явного разрешения владельца председатель запустил M4 run4 заседания
`static-mmbrn-container`. Повестка объёмом 10 333 символа до вызова прошла машинный и
независимый read-only предаудиты; один `S1`, canonical carrier отсутствовал.

Режим: `--save-as static-mmbrn-container-m4-storage`, `--min-replies 42`, `--seed 137`,
`--no-context`, `--no-rag`, `--no-memory`. Все три звена panel overlay вернули `rate_limit`:

1. `anthropic/claude-sonnet-4-6`;
2. `xai/grok-4.5`;
3. `openrouter/anthropic/claude-sonnet-4.6`.

Инструмент завершился `chain exhausted for consilium after 3 attempt(s) (rate_limit)`.
Канонический `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md` не создан,
поэтому сырого carrier для `rejected/` нет. Вещдоки события: этот прецедент, вывод
инструмента и запись в аудите заседания.

## Корень

Доказан общий класс ответа трёх настроенных звеньев: `rate_limit`. Точная провайдерская
причина и длительность ограничения не измерены и здесь не сочиняются. Default-звено
`deepseek/deepseek-chat` отсутствовало в panel overlay и потому не пробовалось. Инструмент
назвал две допустимые развилки: исправить overlay в панели либо разово разрешить defaults
через `LLM_NO_OVERLAY=1`.

## Фикс

Автоматический fallback и повтор запрещены. Run4 засчитан как четвёртая из пяти внешних
попыток M4. Содержательная повестка не меняется и сохраняет предаудит PASS; последний
внешний run5 требует отдельного владельческого выбора маршрута.

## Профилактика

Перед run5 либо восстановить panel overlay, либо получить явное разовое разрешение на
`LLM_NO_OVERLAY=1`. После пятого BLOCK/no-carrier внешнего run6 не будет: председатель
локально собирает M4 из сохранённых run1-run3, полной повестки и постаудитов, затем отдаёт
его независимому аудитору.

## Последняя попытка run5

Владелец отдельно разрешил `LLM_NO_OVERLAY=1`. Default chain вернул carrier через
`deepseek/deepseek-chat`: 44 ролевые реплики, но файл был записан под датой 05.08 вместо
канонической 04.08 и получил машинный и независимый BLOCK. Постаудит зафиксировал 15
дефектов topology/schema/quota/checkpoint/retention/tables/boundaries. Сырой результат
сохранён в
`docs/seanses/rejected/static-mmbrn-container-m4-storage-2026-08-05-run5-final-external.md`.

Внешний бюджет 5 из 5 закрыт, run6 запрещён. Локальная сборка из всего корпуса прошла
машинный аудит; после одной локальной BLOCK-редакции по трём точкам вторая редакция получила
независимый PASS и ждёт владельческой ратификации.
