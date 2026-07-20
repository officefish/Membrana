# docs/insights/

Каталог инсайтов Membrana. Гид агента: [`INSIGHT_LIFECYCLE_FOR_AGENTS.md`](../prompts/INSIGHT_LIFECYCLE_FOR_AGENTS.md) ·
артефакты: [`INSIGHT_REGULATION.md`](../prompts/INSIGHT_REGULATION.md).

## Структура одного инсайта

```text
docs/insights/<id>/
  INSIGHT.md    # идея (промпт)
  RESEARCH.md   # Perplexity (3 запроса)
  REVIEW.md     # 5 ролей, /10
  meta.json     # статус, weight, horizon
```

## registry.json

Единый индекс для `yarn insight list` и `yarn plan:week`.

## Шаблон

Скопировать из [`_template/`](./_template/) или:

```bash
yarn insight create <slug> --title "…"
```
