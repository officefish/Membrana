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
| **Branch** | `feat/bc-b1-home` (фаза B1) |
| **Insight** | [`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B) |

**Prompt эпика:** [`BESTIARY_CONTAINER_PROMPT.md`](../../prompts/BESTIARY_CONTAINER_PROMPT.md)  
**Паттерн:** [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md)  
**Дом:** [`docs/audit/bestiary/`](../../audit/bestiary/)  
**Engines:** `scripts/lib/lens-bestiary.mjs` · `scripts/lens-run.mjs`

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
| **B1** | `bc-b1-home` | [#880](https://github.com/officefish/Membrana/issues/880) | ozhegov | ✅ LGTM — ship |
| **B2** | `bc-b2-specimens` | [#881](https://github.com/officefish/Membrana/issues/881) | dynin | ⬜ |
| **B3** | `bc-b3-missing-beasts` | [#882](https://github.com/officefish/Membrana/issues/882) | dynin | ⬜ |
| **B4** | `bc-b4-weekly` | [#883](https://github.com/officefish/Membrana/issues/883) | angelina | ⬜ |
| **B5** | `bc-b5-closure` | [#884](https://github.com/officefish/Membrana/issues/884) | vesnin | ⬜ |

---

## Gate checklist (B1)

- [x] `docs/audit/bestiary/` — README, AGENT_PROMPT, registry/, analysis/, cache/, specimens/
- [x] Чеклист GROUP_CONTAINERIZATION в README (п.5 ⚠ до `yarn bestiary:audit` в B2)
- [x] Провода: `docs/audit/README`, `AGENTS.md`, паттерн known implementations
- [ ] LGTM ozhegov

---

## As-is

| Есть | Нет / next |
|------|------------|
| Контейнер-дом (B1) | specimens-файлы + `yarn bestiary:audit` (B2) |
| 4 детектора в engines | эхо / goal-displacement (B3) |
| stub `BESTIARY_LIST.md` | weekly + тренд (B4) |
