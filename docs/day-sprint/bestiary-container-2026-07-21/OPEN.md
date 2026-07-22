# OPEN: bestiary-container — бестиарий как контейнер

| Поле | Значение |
|------|----------|
| **Sprint** | `bestiary-container-2026-07-21` |
| **Registry epic** | `bestiary-container` · [#878](https://github.com/officefish/Membrana/issues/878) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **closed** · см. [`CLOSURE.md`](./CLOSURE.md) |
| **Started** | 2026-07-21 |
| **Closed** | 2026-07-22 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Branch** | `feat/bc-b5-closure` (фаза B5) |
| **Insight** | [`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B) |

**Prompt эпика:** [`BESTIARY_CONTAINER_PROMPT.md`](../../prompts/BESTIARY_CONTAINER_PROMPT.md)  
**Паттерн:** [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md)  
**Дом:** [`docs/audit/bestiary/`](../../audit/bestiary/)  
**Engines:** `scripts/lib/lens-bestiary.mjs` · `scripts/lens-run.mjs` · `yarn bestiary:audit` · `yarn bestiary:weekly`  
**CLOSURE:** [`CLOSURE.md`](./CLOSURE.md)

---

## Инварианты

1. Бестиарий = **контейнер** `docs/audit/bestiary/` + хранилище **бетий** (`specimens/`).
2. Детектор класса обязан ловить свой specimen (forcing function).
3. Engines остаются в `scripts/`; код в audit не копируем.
4. Реестр зверей **производный**; линза находит, не чинит (#533).
5. Аудитор не молчун: `not-run` ≠ `clean`.

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **B0** | `bc-b0-brief` | [#879](https://github.com/officefish/Membrana/issues/879) | vesnin | ✅ done · [PR #885](https://github.com/officefish/Membrana/pull/885) |
| **B1** | `bc-b1-home` | [#880](https://github.com/officefish/Membrana/issues/880) | ozhegov | ✅ done · [PR #889](https://github.com/officefish/Membrana/pull/889) |
| **B2** | `bc-b2-specimens` | [#881](https://github.com/officefish/Membrana/issues/881) | dynin | ✅ done · [PR #895](https://github.com/officefish/Membrana/pull/895) |
| **B3** | `bc-b3-missing-beasts` | [#882](https://github.com/officefish/Membrana/issues/882) | dynin | ✅ done · [PR #898](https://github.com/officefish/Membrana/pull/898) |
| **B4** | `bc-b4-weekly` | [#883](https://github.com/officefish/Membrana/issues/883) | angelina | ✅ done · [PR #919](https://github.com/officefish/Membrana/pull/919) |
| **B5** | `bc-b5-closure` | [#884](https://github.com/officefish/Membrana/issues/884) | vesnin | ✅ done · [PR #937](https://github.com/officefish/Membrana/pull/937) · см. [`CLOSURE.md`](./CLOSURE.md) |

---

## Gate checklist (B5)

- [x] [`CLOSURE.md`](./CLOSURE.md) — фазы B0–B5 + PR + matrix aim + handoff + archive notes
- [x] OPEN → closed; `DAY_SPRINT_ACTIVE` → «Нет активного day-sprint» → этот CLOSURE
- [x] `yarn bestiary:audit` + `yarn bestiary:weekly` · coverage 5/5 · matrix в CLOSURE
- [x] `BESTIARY_CONTAINER_PROMPT` / `BC_B5` acceptance; registry notes `bc-b5-closure`
- [x] `yarn branch:check feat/bc-b5-closure` · holder vesnin
- [x] LGTM vesnin (owner ok 2026-07-22)
- [ ] Archive `bc-b5-closure` + эпик — **после merge** (как D4/K5)

---

## Gate checklist (B4)

- [x] `yarn bestiary:weekly` → `analysis/bestiary-run-YYYY-MM-DD.md`
- [x] Trend vs previous snapshot (если есть)
- [x] Анти-молчун: `## Summary` всегда; `not-run` ≠ `clean`; silent-hunter = exit 1
- [x] Тесты `scripts/bestiary-weekly.test.mjs`
- [x] AGENT_PROMPT Scenario Weekly-Report; OPEN/ACTIVE; registry notes; prompt #883
- [x] `yarn branch:check` · holder angelina
- [x] LGTM angelina (owner ok 2026-07-22)

---

## Gate checklist (B3)

- [x] `echo` — детектор + specimen (`specimens/echo/triple-reflection.mjs`); lean on `dedupeByOrigin`/`originHash`
- [x] `goal-displacement` — **явный defer** (см. ниже) + follow-up id
- [x] `yarn bestiary:audit` → coverage ≥4 (ожид. 5/5 с echo)
- [x] Тесты `scripts/bestiary-audit.test.mjs` расширены
- [x] orphan-ruleset self-check
- [x] LGTM dynin (owner ok 2026-07-22)

### Defer: goal-displacement

**Почему не в B3:** машинный сигнал из инсайта — «доля self-referential записей» над корпусом (кристаллы / реестр правды), не грубый file-lens в форме `(object, ruleset) → finding[]`. Пилить эвристику «слово self в файле» = украшение без forcing function.

**Follow-up card (после B5 или отдельная M):** `bc-followup-goal-displacement` — корпусный детектор + specimen-корпус (или явная метрика тренда в B4 analysis). Не молчаливый пробел: класс отсутствует в `BESTIARY` до follow-up.

---

## Gate checklist (B2) — закрыт

- [x] Specimens ×4 (silent / unwired / ornament / jargon-out)
- [x] `yarn bestiary:audit` → `registry/BESTIARY_LIST.md` (4/4)
- [x] Тесты `scripts/bestiary-audit.test.mjs` + `test:scripts`
- [x] Самопроверка: findings > 0 на specimens/
- [x] LGTM dynin (owner ok 2026-07-22)

---

## As-is (после B5)

| Есть | Отложено |
|------|----------|
| Контейнер + 5 specimens + audit + weekly | `goal-displacement` → `bc-followup-goal-displacement` |
| Производный BESTIARY_LIST | — |
| CLOSURE · ACTIVE cleared | Archive фаз B5 + эпика — после merge |
