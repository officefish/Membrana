# Обсуждение: tariff-matrix-2331-b2-ozhegov-review-3

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-09-08 16:59 UTC · ozhegov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana/cc734f7c-3147-44cc-917e-9c0cb538c99e/scratchpad/review-b2-subject.md
**Вопрос:** Ревью блока b2 matrix-granules-rights спринта tariff-matrix-2331 ПОСЛЕ твоего прогона контекста по ратифицированной версии плана (v2). Предмет приложен (гранулы nodes, workspaces — с поправкой словаря «по аналогии», datasets с заёмом, system-datasets matrix-only, instruments; таблица правил дизайна). Прежний pass записан раньше опорной точки прогона — гейт требует порядок context_run ≺ review_pass, ревью повторяется. Судить только по приложенному; вердикт бинарный pass | fail с причиной.

**Ответ:**

**Вердикт: pass.**

Порядок соблюдён: ревью идёт после прогона контекста по ратифицированному v2.

Проверка по существу приложенного:

- **Закрытый список правил** род ↔ `reseedRule` (`KIND_RULES`) — соблюдён: `quota → exact-bytes/exact-count`, `catalog → catalog-id/matrix-only`, `instrument → enabled-flag`, `gated → gated-by-precondition`, `produce → produce-scope`. Контрабанда форм невозможна.
- **`matrix-only`** (`tariff-system-datasets`) — форма `available/outsideQuota`, пересев пропускает; в техническую сетку прав не проецируется. Соответствует плану.
- **`stub`** у `observatory-v1` в datasets — помечен как заём (`stub.reason`, `resolvesBy`), `ratifiedAt: null`; слово владельца 08.09 зафиксировано. Не выдан за решение.
- **Поправка словаря** в workspaces — «по аналогии» вместо «нижняя граница», `ratifiedAt: null`: значение не закреплено, названо честно.

Слабая связанность не нарушена: гранулы автономны, ссылка на `tariff-system-datasets` — декларативная, не импорт. Структура соответствует словарю дизайна.

---
