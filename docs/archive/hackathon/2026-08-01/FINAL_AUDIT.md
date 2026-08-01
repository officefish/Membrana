# Final audit — Mintlify workshops and procedures

**Hackathon:** `mintlify-workshops-procedures-2026-08-01`
**Статус:** team LGTM; awaiting owner ratification and PR

## Scope

В scope остались только: генератор проекции, документация 14 мастерских и 24
процедур, навигация, проверенные примеры, marathon-карточка пробелов и доставка
кода на ревью. Production publish и постройка marathon procedure исключены.

## Acceptance map

| Критерий brief | Evidence | Вердикт |
|----------------|----------|---------|
| все мастерские видимы | atlas 14, broken 0, generated catalog | pass |
| все процедуры видимы | registry 24, defects 0, generated catalog | pass |
| доступный читательский путь | 6 editorial pages + 2 catalogs | pass |
| примеры не придуманы | `run|fixture` schema + source validation | pass |
| пробелы вынесены в marathon | active `workflow-examples-marathon` | pass |
| настоящий Mintlify render | validate + 14 viewport checks | pass |
| desktop/mobile без overflow | Playwright 1440×900 + 390×844 | pass |
| accessibility | primary 5.47:1, 61 MDX alt audit | pass |
| команда видела предмет | H1/H2/H3 reviews + final diff review v3 | pass |
| код доставлен через PR | stacked PR | pending |

## Owner gate

После LGTM финального рецензента и открытия PR владелец принимает либо возвращает
final audit. До этого `HACKATHON_ACTIVE.md` остаётся open.
