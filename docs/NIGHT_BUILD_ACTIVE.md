# Night Build — активный sprint

> Сгенерировано: `2026-07-03T15:22:13.665Z` (`yarn night:open`)
> Регламент: [`NIGHT_SPRINT_REGULATION.md`](./NIGHT_SPRINT_REGULATION.md)

**Epic:** `vdr-label-roundtrip-night-build`
**Старт:** 2026-07-03T15:22:13.665Z
**Ветка:** `night/vdr-label-roundtrip-night-build-2026-07-03`
**Base:** `techies68`
**Промпт:** [`docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md`](./prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md)

## Предусловия

- [ ] `yarn ritual:evening` выполнен (или code-review актуален)
- [ ] Epic-промпт прочитан агентом
- [ ] Ветка `night/vdr-label-roundtrip-night-build-2026-07-03` создана от `techies68`
- [ ] Scope заморожен — без prod-deploy

## Фазы (чеклист)

- [ ] `nb-vlr-0-gate` — NB0: gate — baseline scoped CI + фиксация модели хранения библиотеки
- [ ] `nb-vlr-1-labels-export-ui` — NB1: кнопка «Экспорт меток (JSON)» коллекции в SampleLibraryModule
- [ ] `nb-vlr-2-labels-merge-script` — NB2: yarn vdr:labels-merge — merge меток в манифест пилота + --labels-only для intra-rater
- [ ] `nb-vlr-3-library-label-filter` — NB3: фильтр по метке + счётчик прогресса в клиентской библиотеке (порт HG1-UX)
- [ ] `nb-vlr-4-docs` — NB4: DATASET_CURATION §Пилот — операторский путь разметки через библиотеку + round-trip

## Чекпоинты

Append: `yarn night:checkpoint --phase NB<n> --status pass|fail --note "..."`

Лог: [`NIGHT_BUILD_LOG.md`](./NIGHT_BUILD_LOG.md)

## Закрытие

```bash
yarn night:close --id vdr-label-roundtrip-night-build
```
