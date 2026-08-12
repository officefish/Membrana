# Ревизия реестра 2026-08-11 — категория «Агентский тулинг, CI и техдолг»

**Мандат владельца:** «в агентском тулинге — сколько на самом деле актуальных задач,
проверить все на свежесть»; после отчёта — «неактуальные закрыть, актуальные — сегодняшний
хендоф».

**База свидетельств:** `origin/main` @ `e77919dc` (2026-08-10). Метод — по канону
[`REGISTRY_AUDIT_PROMPT.md`](../../../prompts/REGISTRY_AUDIT_PROMPT.md): L1 механика
(`yarn tasks:audit`), затем L2/L3 по КАЖДОЙ из 34 карточек категории (не только по
механическим кандидатам) четырьмя параллельными read-only аудиторами: A — закрытые иссью
(7), B — открытые иссью (9), C — август без иссью (8), D — июнь-июль без иссью (10).

## Числа

| | до | после |
|---|---|---|
| active всего | 171 | **152** (−19, ровно по числу архиваций) |
| категория «Агентский тулинг…» | 34 | **15** |
| механических кандидатов tasks:audit | 26 (7 в категории) | 20 |

Корзины: **архивировано 19** · **отменено 0** · **живых 15** (из них 1 — развилка
владельца, 2 — тонкие зонтики, ждущие детей).

## Архивировано (19) — свидетельство в notes каждой карточки

| id | свидетельство |
|---|---|
| review-diff-explicit-base | PR #1807 (`68ba1d32`) |
| worktree-hygiene-epic | PR #1289 (`975a8cd5`); Ф4 отдельно — `c5d2e966` (#743) |
| send-gate-on-path | PR #1295 (`10e13eff`) |
| tc-setups-selector | PR #1315 (`4354c83a`), ADR-0018 |
| tc-home-workshop | PR #1315 (`4354c83a`) |
| friction6-test-scripts-groups | PR #1285 (`7386df0a`) |
| delivery-predicates-honest | PR #1765 (`9abf5084`); блок B вынут ADR-0024 |
| weekly-dead-wire-audit | PR #1585/#1588/#1676 |
| deps-basket-immediate-2026-07-29 | PR #1490 (`39da90f8`) |
| tooling-friction-2607 | PR #1280 (`4e6e659c`) |
| agent-tooling-friction-3 | PR #555/#556 (`748e81a0`/`a672384e`) |
| review-oversized-queue | PR #1642 (`4388f415`) + #1674/#1741 |
| deps-watch-disappearance-named | PR #1642 (`4388f415`) |
| tooling-truth-orphans-diagnosis | PR #1642 (`4388f415`) |
| ship-automerge-predicate | PR #1279 (`41017c8c`) |
| opencode-proxy-sprint-2026-06-25 | `4fc37d90`/`c85942ff`/`02f975a3`, консилиум 23.07 |
| oc-proxy-s1-opencode-install | `4fc37d90`, `02f975a3`, CLOSURE 26.06 |
| oc-proxy-s2-freemodel-keys | `c85942ff`, llm-providers.json |
| oc-proxy-s3-llm-proxy-script | `4fc37d90` |

Приметная тройня: `review-oversized-queue` / `deps-watch-disappearance-named` /
`tooling-truth-orphans-diagnosis` заведены 02.08 и **в тот же день исполнены одним
PR #1642** — реестр не почистили. Спринт `oc-proxy-*` (25.06) НЕ протух: работа сделана
в те же сутки, протухла только бухгалтерия.

## Живые (15) → десятка в [`docs/HANDOFF.md`](../../../HANDOFF.md) от 11.08

NOT_DONE с живым остатком: `fix-sprint-experience-dead-ends`,
`fix-node-modules-links-1647`, `tests-container-cross-package-imports`,
`one-shot-trail-forecast-fact`, `sprint-cut-teeth-to-live-modules` (долг с ненаступившим
условием), `tc-nightly-frame` (**ложное срабатывание механики** — иссью #1293 закрыта,
а `blocksMorningWhen` без потребителя; ловушка канона поймана третий раз),
`worktrees-align` (#1738 REOPENED владельцем), `friction6-secret-inventory` (не начата),
`friction6-hygiene-notes` (реестр скриптов дрейфует: снимок 407 против 439 в main),
`friction6-scripts-lint` (не начата), `tw-declared-verbs-honest-no` (**развилка
владельца**), `notes-regex-cyrillic-translit`, `leveling-snapshot-out-path`,
`tests-container` (эпик, держится одним ребёнком), `agent-tooling-friction-6`
(зонтик, жив тремя детьми #1264/#1265/#1266).

## Решения владельца

- 11.08: «неактуальные закрыть» → 19 архиваций выполнено;
- 11.08: «актуальные — сегодняшний хендоф» → `docs/HANDOFF.md` перечеканен из живого
  остатка; ось дня не назначена (owner-choice за владельцем);
- ранее 06.08: переоткрытие #1738 (`worktrees-align`) — учтено, карточка оставлена.

## Попутные находки

1. **Регрессия**: глагол `worktree:merge` снят из `package.json` PR #1285 (диф содержит
   `- "worktree:merge"`), скрипт `scripts/worktree-merge.mjs` жив сиротой — Ф3
   (слияние в изоляции) через yarn недоступна.
2. `docs/tasks/dead-wire-pending.json`: у всех 6 записей `until: 2026-08-09` истёк.
3. Документация OC зовёт несуществующие алиасы `llm-proxy:ask`/`smoke`, `opencode:membrana`.
4. Системное (повтор находки 18.07): `githubIssueClosedAt` не заполняется
   (чинится `yarn tasks:sync-issues`); зонтики схемой не помечены (`umbrella: true`
   напрашивается). У пяти заархивированных карточек иссью открыты
   (#1764, #1447, #1422, #1272, #554) — ждут вечернего `task:close-github`.
5. `yarn task:board` падает: `scripts/generate-active-tasks-board.mjs` отсутствует —
   это предмет живой карточки `tw-declared-verbs-honest-no`.
