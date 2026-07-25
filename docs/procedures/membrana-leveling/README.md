# Процедура: membrana-leveling — вечернее выравнивание рабочего пространства

**Определение.** Зонтичная процедура **детерминированного выравнивания** общего
рабочего пространства: классифицировать dirty-пути (`live` / `ready` / `unfinished` /
`trash`), влить `ready` в `main` сериализованным `pr:ship`-поездом, выровнять деревья
и выдать манифест-отчёт. Не смешивать живую правку, готовую работу, незавершёнку и мусор.

**Держатель контейнера:** Ozhegov (`leadPersona` манифеста). Holder’ы фреймов — по
вердикту M4 (см. таблицу ниже).

**Регламент:** [`MEMBRANA_LEVELING_REGULATION.md`](../../prompts/MEMBRANA_LEVELING_REGULATION.md)
(ратифицирован 2026-07-24). Заседание:
[`docs/meeting/membrana-leveling/EPIC.md`](../../meeting/membrana-leveling/EPIC.md).
Шторм: [`storm-membrana-leveling-2026-07-24`](../../storm/storm-membrana-leveling-2026-07-24/REPORT.md).

**Паттерн фреймов:** [`PROCEDURE_FRAMES`](../../patterns/PROCEDURE_FRAMES.md) (#1094).
Механика очереди / пин отрезков — эпик `procedure-frames` (#900): пользуемся, не проектируем.

---

## Фрейм-раскладка (M4 / K3)

| id | Тег | Holder | Полоса | Назначение |
|----|-----|--------|--------|------------|
| `leveling-wires` | служебный-провода | vesnin | `preflight` | Входы: `disposition`, dirty-snapshot, LLM-канал |
| `leveling-gate` | сюжетный | vesnin | `preflight` | Голова-гейт (K4); без PASS → frames не открываются |
| `leveling-main-fill` | сюжетный | ozhegov | `frames` | `ready` → `main` (`pr:ship`-поезд T9/#700) |
| `leveling-workspace` | сюжетный | ozhegov | `frames` | `main` → деревья + гигиена; SoT `isLeveled`/`legit` |
| `leveling-scratch` | служебный-времянки | dynin | `frames` | T13: `%TEMP%`/scratchpad; cleanup; never commit |
| `leveling-deliver` | служебный-доставка | vesnin | `post` | Манифест-отчёт → соседи / шов к `HANDOFF` |

**Порядок:** `preflight` (wires → gate) → `frames` (main-fill → workspace; scratch
параллельно, cleanup к концу) → `post` (deliver).

Машиночитаемо: [`MANIFEST.json`](./MANIFEST.json).

---

## Движки (вне контейнера)

| Путь | Карточка | Статус |
|------|----------|--------|
| `scripts/lib/membrana-leveling-disposition.mjs` | §8.2 | `disposition` — [`DISPOSITION.md`](./DISPOSITION.md) |
| `scripts/lib/membrana-leveling-gate.mjs` + CLI | §8.3 | гейт + main-fill + отчёт — [`SCRIPTS.md`](./SCRIPTS.md) |

Кода и тестов в этом каталоге нет (Т12 / `manifest-only`).

---

## Чеклист PROCEDURE_FRAMES

1. ✅ Сюжет — серия: gate → main-fill → workspace (`tag: "сюжетный"`).
2. ✅ Фрейм `провода` (`leveling-wires`) объявлен в `preflight`.
3. ✅ Фрейм `времянки` (`leveling-scratch`): дом вне repo, never commit (T13).
4. ✅ Фрейм `доставка` (`leveling-deliver`) в `post`.
