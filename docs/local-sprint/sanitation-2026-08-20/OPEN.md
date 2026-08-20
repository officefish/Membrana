# Membrana Local Sprint OPEN: sanitation-2026-08-20

| Поле | Значение |
|------|----------|
| Sprint | `sanitation-2026-08-20` |
| Issue | [#2009](https://github.com/officefish/Membrana/issues/2009) (e2e-smoke) · точка входа `docs/prompts/SESSION_G_SANITATION_SPRINT_2026-08-20.md` |
| Plan | [`docs/sprint/cut/sanitation-2026-08-20.json`](../../sprint/cut/sanitation-2026-08-20.json) (ратифицирован владельцем 20.08 11:18Z, «ратифицирую») |
| Cutter | ozhegov ([конспект](../../discussions/cut-sanitation-2026-08-20-ozhegov.md)) |
| Blocks | 6× review (tarasov ×2, vesnin ×2, dynin ×2) · ci-smoke-app-di (ozhegov) · optional-canon-rule (vesnin) · secret-parser-gate (ozhegov) |
| Status | gate pass 9/9 honest_pair (0 находок) · прогноз↔исход **hit** (9/9, overflow 0) · журнал: close pass |

## Предмет

Санитария по фидбеку 19.08: (1) шесть oversized-PR без вердикта — #1980 · #1981 · #1987 ·
#2003 · #2004 · #2013 (`054e371a`, «HEAD-847»); (2) #2009 — CI-шаг «сервис поднимается» для
media/office после restart-loop прода 8 минут (Тарасов без него деплой не подписывает);
(3) веха `secret-parser-built` — закрыть или эскалировать с ценой.

## Итог блоков

**Ревью-долг (1–6) — шесть отдельных прогонов, все LGTM, P0 не найдено.** Артефакты в репо
(`git add -f`, правило .gitignore не тронуто): [#1980](../../discussions/pr-1980-code-review.md) ·
[#1981](../../discussions/pr-1981-code-review.md) · [#1987](../../discussions/pr-1987-code-review.md) ·
[#2003](../../discussions/pr-2003-code-review.md) · [#2004](../../discussions/pr-2004-code-review.md) ·
[#2013](../../discussions/pr-2013-code-review.md) («HEAD-847» = `054e371a`). Находки P1/P2 сведены
в [#2020](https://github.com/officefish/Membrana/issues/2020): порог 400 должен предупреждать в
`pr:ship` ДО создания PR (4 из 6 — «обоснованный» oversized), обход `SKIP_PREPUSH` обязан
оставлять след.

**#2009 (7–8).** Смоук подъёма графа DI для media и office + шаг «App DI smoke» в
`unit-tests.yml`. Судит **dist** (артефакт tsc, как на проде): vitest/esbuild не эмитит
`design:paramtypes`, DI по классам на src не разрешим в принципе — ложное красное на здоровом
графе поймано и снято. `compile()` не зовёт `onModuleInit` → БД и Mongo не нужны (least-effort
из issue, testcontainers не потребовались). Класс 19.08 воспроизведён намеренной поломкой DI
(`can't resolve dependencies … Function at index [0]`) и снят откатом. Правило «`@Optional` для
внешних портов» — в каноне `docs/ARCHITECTURE.md` §1d.

**Веха secret-parser-built (9).** Критерий 1 закрыт: сканер получил резак (`--redact` поверх
общего ядра `lib/secret-redact.mjs`; детекторный гейт и его exit-контракт не тронуты — рез и
гейт остаются двумя ответственностями). Критерий 2 закрыт: датированный проход на **грязной
фикстуре**, манифест `docs/security/rotation-manifest-2026-08-20.md` (3 реза, копия чиста, вход
байт в байт не тронут). Критерий 3 — **эскалирован владельцу**
([#2022](https://github.com/officefish/Membrana/issues/2022)) с ценой: `day-horizon.json` по
собственному `_note` ставится человеком, а настоящая цена — ротация реальных ключей и
НЕОБРАТИМЫЙ проход архива.

## Что НЕ сделано

Отметка гейта не проставлена агентом (акт владельца). Находка: `morning-gates-state.json` вехи
не несёт — только `magistral`/`swallow`; форма отметки не выдумывалась, эта часть зоны блока 9
не тронута. Правки самих отревьюированных PR — вне спринта (только вердикты и Issue). Магистраль
дня и полосы Б/В не тронуты, прод не деплоился.
