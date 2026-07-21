# OPEN: bestiary-container — бестиарий как контейнер

| Поле | Значение |
|------|----------|
| **Sprint** | `bestiary-container-2026-07-21` |
| **Registry epic** | `bestiary-container` · [#878](https://github.com/officefish/Membrana/issues/878) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **open** |
| **Started** | 2026-07-21 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Branch** | `feat/bc-b2-specimens` (фаза B2) |
| **Insight** | [`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B) |

**Prompt эпика:** [`BESTIARY_CONTAINER_PROMPT.md`](../../prompts/BESTIARY_CONTAINER_PROMPT.md)  
**Паттерн:** [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md)  
**Дом:** [`docs/audit/bestiary/`](../../audit/bestiary/)  
**Engines:** `scripts/lib/lens-bestiary.mjs` · `scripts/lens-run.mjs` · `yarn bestiary:audit`

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
| **B2** | `bc-b2-specimens` | [#881](https://github.com/officefish/Membrana/issues/881) | dynin | 🔄 in progress |
| **B3** | `bc-b3-missing-beasts` | [#882](https://github.com/officefish/Membrana/issues/882) | dynin | ⬜ |
| **B4** | `bc-b4-weekly` | [#883](https://github.com/officefish/Membrana/issues/883) | angelina | ⬜ |
| **B5** | `bc-b5-closure` | [#884](https://github.com/officefish/Membrana/issues/884) | vesnin | ⬜ |

---

## Gate checklist (B2)

- [x] Specimens ×4 (silent / unwired / ornament / jargon-out)
- [x] `yarn bestiary:audit` → `registry/BESTIARY_LIST.md` (4/4)
- [x] Тесты `scripts/bestiary-audit.test.mjs` + `test:scripts`
- [x] Самопроверка: findings > 0 на specimens/
- [x] LGTM dynin (owner ok 2026-07-22)

---

## As-is

| Есть | Нет / next |
|------|------------|
| Контейнер + 4 specimens + audit | эхо / goal-displacement (B3) |
| Производный BESTIARY_LIST | weekly + тренд (B4) |
