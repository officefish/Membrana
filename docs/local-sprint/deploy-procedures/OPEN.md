# Membrana Local Sprint OPEN: deploy-procedures

| Поле | Значение |
|------|----------|
| Sprint | `deploy-procedures` |
| Procedure | `membrana-local-sprint` |
| Registry card | `deploy-procedures` |
| Plan | [`docs/sprint/cut/deploy-procedures.json`](../../sprint/cut/deploy-procedures.json) (ратифицирован 04.08 16:26Z) |
| Prompt | [`DEPLOY_PROCEDURES_PROMPT.md`](../../prompts/DEPLOY_PROCEDURES_PROMPT.md) |
| Cutter | tarasov ([конспект](../../discussions/cut-deploy-procedures-tarasov.md)) |
| Blocks | d1-procedures (vesnin) · d2-run-wrapper (vesnin) · d3-verb-wiring (ozhegov) |
| Status | gate pass (3/3 honest_pair, 0 находок) · журнал: close pass производителем |

## Зачем

Слово владельца 04.08 (вторая важная задача дня): «Деплой как процедура с прогонами.
Два сервера — значит и процедуры будет две. Пока две. Некоторые деплои будем со
временем ещё больше конкретизировать». Грунт — обзор деплоя 03.08 (П1: процедуры нет,
П2: деплой не пишет прогон); канон — ADR-0023, поднят DRAFT → **ACCEPTED** с
амандментом Р1 по слову владельца (процедура на сервер, не одна с параметром).

## Итог блоков

- **d1** — две процедуры в реестре (23→25): `deploy-office-vds` (office+panel,
  `getOfficeSshConfig`) и `deploy-media-vps` (media, cabinet, device-board, root-site;
  `BACKGROUND_MEDIA_IPV4`); кадры `build → rollout(gate owner-rollout) → smoke → record`;
  `validateProcedure` 27/27; REGISTRY.md перегенерён скриптом.
- **d2** — `scripts/deploy-run.mjs`: open прогона (subject = сервис + ревизия) →
  команда с наследованием stdio → close pass/fail; exit-код прозрачен; секреты и
  env-значения в журнал не текут (зуб с подсадным env); обрыв ловится ленивым
  закрытием (#1694, зуб). 5/5.
- **d3** — дверь `deploy:run` + врезка ровно двух глаголов: `cabinet:deploy:prod` →
  `deploy-media-vps`, `vds:run` → `deploy-office-vds` (прежние исполнители в хвосте —
  процедура лишь рамка); `deploy:when-green` не тронут; зуб по факту package.json. 5/5.

## Шероховатости (симптомы — в close-записи гейта)

1. Резчик и оба держателя частично уплывали из материала (prod-ритмы/opencode,
   `:dry`-пары) — решения транскрибированы координатором, спорное вынесено владельцу
   (имена процедур, статус ADR — оба решены его словом на ратификации).
2. Валидатор процедур честно отказал манифестам до существования движка
   `deploy-run.mjs` — порядок d1→d2 резать с оглядкой на резолв engines.

## Осталось за спринтом (не долг — ожидание жизни)

Первый живой прогон в ленте (последний пункт DoD ADR-0023) случится при первой
настоящей выкладке рукой владельца: `yarn cabinet:deploy:prod` или `yarn vds:run <script>`
теперь пишут прогон сами.
