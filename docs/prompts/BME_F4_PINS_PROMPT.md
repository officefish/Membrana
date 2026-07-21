# Промпт: F4 — PINNED_SUBGRAPH на инструкции

> **M** · `bme-f4-pins` · [#828](https://github.com/officefish/Membrana/issues/828) · lead **dynin**

## Промпт целиком

Математик: манифест подграфа инструкций (корни MDX + `docs.json` + транзитивные
ссылки, которые входят в канон) → `path → SHA`. Аудит полноты; latest (dev) /
pinned (автономные прогоны). Владелец пина назван (контейнер git-audit или
домен docs). Чеклист PINNED_SUBGRAPH в README контейнера или рядом с манифестом.

Переиспользовать дух/инструменты из `kam-k2-audit` (#817), если уже в main —
не плодить второй остров без нужды.

**DoD:** манифест + команда аудита; тест на уехавший SHA; чеклист ✅/⚠.

## Статус (2026-07-21)

- [x] `docs/audit/git/pins/branch-instructions.manifest.json`
- [x] `yarn audit:branch-instructions-pin` (+ `--write`)
- [x] тесты drift/missing в `scripts/audit-branch-instructions-pin.test.mjs`
- [x] чеклист в README контейнера
- [ ] Archive после ship
