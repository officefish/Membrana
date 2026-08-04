# Процедура: deploy-media-vps — выкладка на media-VPS с прогоном в журнале

**Определение.** `deploy-media-vps` — процедура разворачивания на media-VPS
(`BACKGROUND_MEDIA_IPV4`): сервисы **media**, **cabinet**, **device-board**,
**root-site**. Входы исполнителей — `_ssh-media-deploy`, `_ssh-cabinet-deploy(-image)`,
`_ssh-device-board-deploy`, `root-site:deploy`.

**Держатель:** Vesnin (`leadPersona` манифеста).

**Происхождение.** Слово владельца 04.08: два сервера — две процедуры, пока две;
сервис — параметр прогона, не пятая копия связки (П1 обзора 03.08). Канон формы —
ADR-0023 (ACCEPTED 04.08); посервисные специализации — позже, словом владельца.

## Кадры

| Кадр | Держатель | Что |
|------|-----------|-----|
| `build` | vesnin | сборка (`media:docker:build`, `cabinet:docker:build`, `*:docker:prod:build`) |
| `rollout` | tarasov | выкладка посервисными ssh-входами; **гейт `owner-rollout`**: печатает — владелец запускает |
| `smoke` | dynin | `cabinet:smoke:prod`, `_ssh-*-smoke`; дрейф прод↔ствол — Р5, после первого прогона |
| `record` | angelina | запись прогона в общую ленту через `deploy-run` |

## Журнал прогонов

`yarn deploy:run deploy-media-vps --service <media|cabinet|device-board|root-site> -- <команда>`
открывает прогон (subject = сервис + ревизия), исполняет, закрывает `pass`/`fail`.
Секреты и env-значения в журнал не пишутся (Р3 ADR-0023). Первый обжитый провод —
`cabinet:deploy:prod` (блок d3 спринта).

## Осадок узла

~20 датированных одноразовых скриптов этого сервера (`mp2…mp7-prod`,
`quota-refactor-prod`, …) — правило Р4 ADR-0023 действует вперёд; разбор — отдельная
санитарная работа, не эта процедура.

## Манифест

[`MANIFEST.json`](./MANIFEST.json) — `id: deploy-media-vps`, кадры
`build → rollout(gate owner-rollout) → smoke → record`; зуб — `validateProcedure`.
