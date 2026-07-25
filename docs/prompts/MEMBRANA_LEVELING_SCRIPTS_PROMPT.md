# Промпт: `membrana-leveling` §8.3 — скрипты `main-fill` / `workspace-level`

> **СТАТУС: DONE в main** (§8.3). Adopt: skill + soft evening — [`MEMBRANA_LEVELING_ADOPT_SPRINT_PROMPT.md`](./MEMBRANA_LEVELING_ADOPT_SPRINT_PROMPT.md).
> Реестр: `id = membrana-leveling-scripts` (archived). Размер: **L**. Lead: **vesnin**.
> Основание: [`MEMBRANA_LEVELING_REGULATION.md`](./MEMBRANA_LEVELING_REGULATION.md) v1.0 §§ 3–5 (вердикты M2, M3, M4).

---

## Контекст

Два сюжетных скрипта процедуры по фрейм-раскладке §5. Потребляют `disposition` (§8.2) и реализуют
гейт (§3) + отчёт (§4). **Не начинать до готовности `disposition`.**

## Что построить

- **`main-fill`** (фрейм `leveling-main-fill`): `ready` → `main` сериализованным `pr:ship`-поездом
  (T9/#700): влил ready → main поехал → пере-проверил остальных → следующая.
- **`workspace-level`** (фреймы `leveling-workspace` + гейт `leveling-gate`): снимок dirty-путей →
  `disposition` по каждому → корзины `{L,R,U,T}` → гейт-процедура §3 (STOP на `unnamed-trash` /
  `unregistered-unfinished` / `main-fill-failed`; PASS = `Named(T) ∧ Registered(U) ∧ Filled(R)`) →
  манифест-отчёт §4 (детерминированный view, 3 раздела поимённо).
- Служебные фреймы: `leveling-wires` (входы), `leveling-scratch` (времянки `%TEMP%`/scratchpad,
  cleanup, never commit — T13), `leveling-deliver` (доставка отчёта, шов к `HANDOFF`).

## Definition of Done (из вердиктов M2/M3/M4)

- [x] Гейт-процедура 1–9 (§3) с оракульными сценариями: `unnamed-trash → STOP`; `unfinished` без
  карточки → STOP; WIP-коммит ≠ регистрация; `only-ready → PASS iff main-fill done/noop`; `live` не стопорит.
- [x] Манифест-отчёт `buildWorkspaceLevelReport` = f(persisted gate-output), 3 раздела поимённо,
  переживает обрыв сессии (§4) — «нет входа» без gate-output.
- [x] Времянки: вне repo, cleanup, never commit (T13) — тест на отсутствие WIP-снимок-антипаттерна.
- [x] Тесты `node --test` зелёный. LGTM Teamlead — в PR.

## Out of scope

- Реализация `disposition` (§8.2). Контейнер слоя (§8.1). Пин отрезков (#900).
- Переписывание канона `HANDOFF`/вечернего ритуала — только шов ссылкой (§4).
