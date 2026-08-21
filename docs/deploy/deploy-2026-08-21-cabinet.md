# Выкатка cabinet 21.08 — вторым, после media

**Блок 3 `deploy-cabinet` спринта `deploy-safestorage-2026-08-21`. Держатель: ozhegov.**

Порядок соблюдён: cabinet выкатывался **после** поднявшегося media (кабинет зовёт media при
связке). Время выбрано по решению владельца — **после конца живого сеанса** (13:45 МСК);
на момент выкатки простой устройства составлял 2 ч 03 мин (`now() - max(Sample.createdAt)`).

## Как выкачено

`node scripts/_ssh-cabinet-deploy-image.mjs --allow-dirty` — деплой **из готового образа GHCR**
(не сборка на VPS): образ собран CI-workflow «Cabinet images» на том же `6ff9aaeb`, что и media.

| Поле отчёта деплоя | Значение |
|---|---|
| `imageTag` | `main` (не `latest` — прецедент отката прода) |
| `images.api` / `images.web` | `ghcr.io/officefish/membrana-cabinet-api:main` / `…-web:main` |
| `composeSha` | `6ff9aaeb33af5716162141263ead9e171c001ff8` |
| `durationMs` | 82 041 |
| `exitCode` · `smokeOk` · `ok` | `0` · `true` · `true` |

`--allow-dirty` объяснён: в дереве лежал **чужой** нетрекаемый черновик ласточки от 19.08
(`docs/comms/drafts/swallow-day-2026-08-19.md`); прод собирается из образа CI, локальное дерево
в сборку не входит. Свой код в дереве закоммичен и влит (PR #2050) до выкатки.

## Состояние после

```
membrana-cabinet-cabinet-api-1  ghcr.io/officefish/membrana-cabinet-api:main  Up (healthy)
membrana-cabinet-cabinet-web-1  ghcr.io/officefish/membrana-cabinet-web:main  Up (healthy)
health: {"status":"ok","version":"0.1.0","protocolVersion":1}
```

Откат остаётся возможным: образы `…-api:rollback-2026-08-21` и `…-web:rollback-2026-08-21`
(ID `c141fd4311f8` / `e759320d1a87`) помечены в preflight и на месте; команда возврата —
`docs/deploy/deploy-2026-08-21-preflight.md` §3.

Приёмка связки — отдельным документом: `deploy-2026-08-21-acceptance.md` (держатель — Дынин).
