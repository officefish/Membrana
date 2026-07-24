# Промпт: `membrana-leveling` §8.2 — чистая функция `disposition(path, ctx)`

> **СТАТУС: ЗАРЕГИСТРИРОВАНО, НЕ В РАБОТЕ.** Не начинать без явного слова владельца.
> Реестр: `id = membrana-leveling-disposition` в [`docs/tasks/registry.json`](../tasks/registry.json). Размер: **M**. Lead: **vesnin**, support: **dynin**.
> Основание: [`MEMBRANA_LEVELING_REGULATION.md`](./MEMBRANA_LEVELING_REGULATION.md) v1.0 § 2 (вердикт M1).

---

## Контекст

Ядро процедуры `membrana-leveling` — чистая функция состояния файла/работы. Реализовать её как
детерминированный движок в плоском `scripts/lib/` (движок контейнера `membrana-leveling-container`).
**Фундамент гейта** (K4) — без неё гейт и скрипты не определены.

## Что построить

Чистая функция (без сети/LLM внутри; ctx подаётся снаружи как снимок):

```
disposition(path, ctx) → 'live' | 'ready' | 'unfinished' | 'trash'
порядок ветвлений (first-match):
  1. isTempOrScratch(path)                                    → trash  (мусор по расположению)
  2. dirty ∧ inActiveSession                                  → live   (активная правка — НЕ трогать)
  3. registered ∧ CI_green ∧ ¬conflicts(main) ∧ PR_approved
     ∧ leadStamp ∧ ¬inActiveSession                           → ready
  4. registered ∧ ¬(шаги 1–3)                                 → unfinished
  5. fallback: dirty ∧ ¬registered ∧ ¬(шаги 1–2)              → trash  (несохранённый хлам, не в работе)
```

**Критично (исправление порядка M1/§2):** `live` обязан идти ДО fallback-trash. Клаузу
`dirty ∧ ¬registered` НЕЛЬЗЯ ставить первым ветвлением — иначе активная незарегистрированная правка
(живой новый файл, который пишут сейчас) попадёт в `trash`, и гейт **снесёт живую работу** (нарушение R2).
`isTempOrScratch` — trash по расположению (первым, он trash даже в сессии); `dirty ∧ ¬registered` —
только **fallback** после отсечения live/ready/unfinished.

**Граница детерминизм↔штамп (T8):** функция читает `leadStamp`/`registered` как факты ctx;
*решение* их выставить — человек/тимлид, вне функции.

## Definition of Done (из вердикта M1)

**Продуктовый критерий (не механика):** на живом снимке dirty-путей реального рабочего дерева
функция даёт диспозицию, совпадающую с ручной разметкой держателя на ≥10 разнородных примерах
(готовое / брошенное / мусор корня / времянка scratch / live-правка). Именно этот прогон, а не
синтетика юнит-тестов, доказывает, что гейт `membrana-leveling` не снесёт работу и не пропустит мусор.

- [ ] Продуктовый критерий выше пройден и приложен таблицей «путь → ожидание → факт».
- [ ] Чистая функция + контракт ctx-словаря (`dirty`, `registered`, `inActiveSession`, `ciGreen`,
  `conflictsMain`, `prApproved`, `leadStamp`, `isTempOrScratch`, `unitOf`) как порты.
- [ ] Тесты матрицы состояний: `readyFacts ∧ ¬stamp → unfinished`; `dirty ∧ ¬registered → trash`;
  `dirty ∧ session → live`; тотальность на домене (fallback trash). **Определить `inActiveSession`**
  (session-lock/оркестратор, не голый mtime) — названный gap M1.
- [ ] `node --test` зелёный. LGTM Teamlead.

## Out of scope

- Гейт-оркестрация (карточка `membrana-leveling-scripts` / вердикт M2) — функция только классифицирует.
- Форма манифеста-отчёта (вердикт M3). Контейнер слоя (`membrana-leveling-container`).
