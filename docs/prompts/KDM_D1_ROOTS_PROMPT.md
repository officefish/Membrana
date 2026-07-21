# Промпт: D1 — финальный список roots dream-master

> **M** · `kdm-d1-roots` · [#857](https://github.com/officefish/Membrana/issues/857) · lead **ozhegov** · parent `kits-dream-master`

## Контекст

После D0 границы эпика зафиксированы. D1 утверждает **roots** и **out-of-kit**
до сборки пинов в D2.

## Промпт целиком

1. Roots кита = точки входа yarn `dreams:*` → один файл `scripts/dreams.mjs`
   (tick/digest — подкоманды). Lib `dreams-*` входят замыканием, не отдельными roots.
2. Out-of-kit: Night Build; CLI `night:research`; Nest office dreams; промпт автора.
3. `DREAM_MASTER_PROMPT.md` — **не** в pins (аудит пинит path→SHA по статическим
   импортам `.mjs`; версия автора читается из текста промпта в runtime). В D3 —
   `precedents[]` процедуры `ritual-dreams`.
4. Честно: замыкание `dreams.mjs` тянет `scripts/lib/night-research.mjs` (enumeratePairs)
   и соседний infra — это **зависимость**, не продукт `yarn night:research`.

## Acceptance criteria

- [x] Таблица roots / out-of-kit в эпик-промпте + OPEN
- [x] LGTM ozhegov (owner ship 2026-07-21)

## Out of scope

Сборка MANIFEST/pins (D2); процедура (D3).
