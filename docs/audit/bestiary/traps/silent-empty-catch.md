# Ловушка: `silent-empty-catch`

| Поле | Значение |
|------|----------|
| **id** | `silent-empty-catch` |
| **status** | `stub` (W2 #948) |
| **targets** | класс `silent` · шаблон [`../antipatterns/silent.md`](../antipatterns/silent.md) |
| **kitPin** | `null` — жилец кита и aim «Ведьмак» = W4 (#950) |

## Что ловит (на примерах, T14)

Пустой / проглоченный `catch` без декларации намеренности; родственный `\|\| true` /
внешний вход → `null` без пометки — см. `detectSilent` в линзе.

Пример улова (stub): [`../registry/CATCH_LIST.md`](../registry/CATCH_LIST.md) →
`catch-silent-swallow-specimen` (evidence = specimen, не смешивать роли T1/T2).

## Промпты

| Path | Роль |
|------|------|
| [`../AGENT_PROMPT.md`](../AGENT_PROMPT.md) · Scenario Trap-Doc | операторский вход к карточке |
| [`../AGENT_PROMPT.md`](../AGENT_PROMPT.md) · Scenario Issue-Trap | заказ поставки (`issueTrap`) — контракт до W4 |

Отдельного trap-prompt файла в W2 нет (stub); вынос в `docs/prompts/` — follow-up после W4.

## Scripts (pure)

| Path | Символ | Заметка |
|------|--------|---------|
| [`scripts/lib/lens-bestiary.mjs`](../../../../scripts/lib/lens-bestiary.mjs) | `detectSilent` | существующий детектор; **новый не писать** в W2 |

## Цепочка смысла (T13/T14)

`antipatterns/silent.md` (шаблон) → **эта ловушка** → гранула в `CATCH_LIST`.

Kit (W4) пинит набор prompts+scripts этой ловушки, **не** файл шаблона.
