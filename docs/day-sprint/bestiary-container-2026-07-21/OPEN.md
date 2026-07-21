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
| **Branch** | `feat/bc-b0-brief` (фаза B0) |
| **Insight** | [`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B) |

**Prompt эпика:** [`BESTIARY_CONTAINER_PROMPT.md`](../../prompts/BESTIARY_CONTAINER_PROMPT.md)  
**Паттерн:** [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md)  
**Engines (уже в main):** `scripts/lib/lens-bestiary.mjs` · `scripts/lens-run.mjs`

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
| **B0** | `bc-b0-brief` | [#879](https://github.com/officefish/Membrana/issues/879) | vesnin | ✅ LGTM — ship |
| **B1** | `bc-b1-home` | [#880](https://github.com/officefish/Membrana/issues/880) | ozhegov | ⬜ |
| **B2** | `bc-b2-specimens` | [#881](https://github.com/officefish/Membrana/issues/881) | dynin | ⬜ |
| **B3** | `bc-b3-missing-beasts` | [#882](https://github.com/officefish/Membrana/issues/882) | dynin | ⬜ |
| **B4** | `bc-b4-weekly` | [#883](https://github.com/officefish/Membrana/issues/883) | angelina | ⬜ |
| **B5** | `bc-b5-closure` | [#884](https://github.com/officefish/Membrana/issues/884) | vesnin | ⬜ |

---

## Gate checklist (B0)

- [x] Эпик + фазы в реестре (#878–#884)
- [x] Лемма контейнера+specimens в INSIGHT
- [x] OPEN + DAY_SPRINT_ACTIVE
- [x] LGTM vesnin (owner ok 2026-07-21)

---

## As-is (для B1+)

| Есть | Нет |
|------|-----|
| 4 детектора: silent / unwired / ornament / jargon-out | контейнер, specimens, тесты |
| `lens-run.mjs` | эхо-камера, смещение цели |
| | weekly + тренд |
