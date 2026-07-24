# HANDOFF: спринт tasks-workshop → новая сессия

**Закрыт (хендоф):** 2026-07-24 · **Focus:** `DAY_SPRINT_ACTIVE` → tasks-workshop  
**Основание:** PR [#1032](https://github.com/officefish/Membrana/pull/1032) (заседание) → план → Linear [DRU-403](https://linear.app/techies68/issue/DRU-403)  
**Промпт:** [`docs/prompts/TASKS_WORKSHOP_SPRINT_PROMPT.md`](../prompts/TASKS_WORKSHOP_SPRINT_PROMPT.md)  
**OPEN:** [`docs/day-sprint/tasks-workshop-2026-07/OPEN.md`](../day-sprint/tasks-workshop-2026-07/OPEN.md)  
**Параллельно:** общий [`../HANDOFF.md`](../HANDOFF.md) — другой поток (фреймы/процедуры). Не перезаписывать.

## Главное для новой сессии

Осталось **4 фазы** (канон фазы #1056–1065). Следующий шаг: **sync tip `origin/main` → `tw-v6-invariants` (#1062 / DRU-410)**. Код v6 в сессии хендофа не начинали.

Параллельный bootstrap-дубль #1066–1075 **закрыт**; не открывать заново.

## Что сделано (в `main`, не переделывать)

| Фаза | Иссью / archive | Суть |
|------|-----------------|------|
| g0 V2 wins | [#1080](https://github.com/officefish/Membrana/pull/1080) | audit/decompose **вне** мастерской `docs/tasks`; `HOME_WORKSHOP` уточнён (MUST = покрытие дома, не обязанность каждой мастерской тащить пару в verbs) |
| v1+v2 manifest+verbs | [#1087](https://github.com/officefish/Membrana/pull/1087), archive [#1091](https://github.com/officefish/Membrana/pull/1091) | манифест + decision-verbs + граница в README |
| v3 axes | [#1106](https://github.com/officefish/Membrana/pull/1106), archive [#1110](https://github.com/officefish/Membrana/pull/1110) | `decompose --by` **вне** verbs мастерской |
| v4 inspect | [#1113](https://github.com/officefish/Membrana/pull/1113), archive [#1116](https://github.com/officefish/Membrana/pull/1116) | `yarn task:inspect` |
| v5 validity | [#1127](https://github.com/officefish/Membrana/pull/1127) → `c89a1f09`, archive [#1130](https://github.com/officefish/Membrana/pull/1130) → `2dc30ecf` | `yarn task:validate` |

Порядок зависимостей (из промпта): `v1 → v5 → v6`; `v1 → v7`; хвост one-shot `v8 → v9`.

## Осталось (4)

| id | GH | Linear | size | lead | суть |
|----|----|--------|------|------|------|
| `tw-v6-invariants` | [#1062](https://github.com/officefish/Membrana/issues/1062) | [DRU-410](https://linear.app/techies68/issue/DRU-410) | M | vesnin (+dynin) | Linear HARD / Issue WARN / closed→closedAt |
| `tw-v7-readme-tooth` | [#1063](https://github.com/officefish/Membrana/issues/1063) | [DRU-411](https://linear.app/techies68/issue/DRU-411) | M | ozhegov | README↔registry pre-commit зуб; #1014 переформулировать |
| `tw-v8-oneshot-rank` | [#1064](https://github.com/officefish/Membrana/issues/1064) | [DRU-412](https://linear.app/techies68/issue/DRU-412) | L | vesnin | one-shot rank (не вердикт) |
| `tw-v9-trail` | [#1065](https://github.com/officefish/Membrana/issues/1065) | [DRU-413](https://linear.app/techies68/issue/DRU-413) | M | ozhegov (+vesnin) | `one-shot-trail.jsonl` анти-дробление |

## Грабли процесса (не наступать)

- **Не сидеть часами в ci-wait** в том же агенте; merge/archive — отдельным проходом.
- **Linear Done из РФ → 403**; skip или media-NL (`LINEAR_TASKS_GEAR` §9).
- **Не красть `main` у чужого worktree** — ветку брать от `origin/main` (`yarn neighbors`).
- **V2 wins:** не тащить `audit`/`decompose` в verbs мастерской `docs/tasks`.
- Focus дня: `docs/DAY_SPRINT_ACTIVE.md` → tasks-workshop (Also open не затирать Focus).

## С чего начать холодной сессии

1. Открыть этот handoff + промпт `TASKS_WORKSHOP_SPRINT_PROMPT.md`.
2. `git fetch origin` → ветка **от tip `origin/main`** для `tw-v6-invariants`.
3. Читать карточку #1062 / DRU-410 и DoD в промпте/OPEN — **потом** код v6.
4. Не начинать v7–v9, пока v6 не закрыт (или явное слово владельца на параллель v7).

> Copy-paste в новую сессию:  
> «Открой `docs/handoff/tasks-workshop-2026-07-24.md` и начни с v6 (`tw-v6-invariants` #1062).»
