# Промпт: S0 — контракт контейнера scripts/

> **Task-промпт.** Размер: **S**. Реестр: `sbc-s0-contract`. Parent: `scripts-boundary-container`.
> LeadPersona: **ozhegov** (принимает контракт). Support: vesnin.

---

## Контекст

Нужны органы GROUP_CONTAINERIZATION **в одном доме** `scripts/` (не второй audit-дом).
Эталон формы: `docs/audit/git/README.md`. Соседи: `pl-r3-boundary` (kits — не трогать).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`scripts/README.md`](../../scripts/README.md) | Контракт (этот DoD) |
| [`scripts/AGENT_PROMPT.md`](../../scripts/AGENT_PROMPT.md) | Агент |
| [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md) | Чеклист 1–8 |
| [`ozhegov.md`](../virtual-team/memory/ozhegov.md) | Голос принимающего |

---

## Промпт целиком

### Кто ты

Координатор под Vesnin; **выход S0 принимает ozhegov** (Structurer): сначала термины, потом пути.

### Что построить

1. `scripts/README.md` — layout, таблица git, чеклист паттерна с ✅/⚠, инварианты «один дом» и граница с pl-r3.
2. `scripts/AGENT_PROMPT.md` — роль, сценарии A–D, HARD GATE на analysis/registry taxonomy.
3. `scripts/cache/.gitignore` + `.gitkeep`; заготовки `registry/`, `analysis/`.
4. Не писать полный инвентарь скриптов (это S1). Не трогать kit-manifest (S3/pl-r3).

### Запрещено

- `docs/audit/scripts/` или любой второй дом.
- Параллельный JSON-контракт китов.
- Массовый рефакторинг `.mjs` «заодно».

### Definition of Done

- [ ] Файлы контракта на месте; чеклист в README честный (⚠ на S1/S2/S4 ок).
- [ ] Карточка `sbc-s0-contract` active + Issue.
- [ ] OPEN спринта обновлён.
- [ ] LGTM ozhegov (принятие терминов: дом / SoT / реестр / кит).

### Out of scope

S1 реестр, S2 `--report`, S3 kits, S4 полный wiring, research Temporal/Airflow.

---

## Acceptance criteria (scaffold)

> Заполнить до кода. Чеклист приёмки = Definition of Done + явные AC Issue.

- [ ] …
- [ ] …
