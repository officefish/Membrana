# Обсуждение: tariff-matrix-2331-b2-ozhegov-review

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-09-08 12:02 UTC · ozhegov

**Контекст:** GitHub Issue #2331: «Матрица тарифов как единственный источник правды: гранулы по ресурсу + шаблон в контейнере strategic-docs, сетка — производная (сессия Б, спринт)»
**Вопрос:** Ревью по заявке о готовности блока b2 matrix-granules-rights спринта tariff-matrix-2331 (ты — ответственный контекст; вердикт бинарный: pass | fail с причиной). Проверь по коммиту 6a22bdf8 в ветке feat/tariff-matrix-2331 гранулы docs/containers/strategic-docs/granules/: tariff-nodes (nodes.max 1/4/9, exact-count, unitWords «прибор/прибора/приборов», закреплено 29.07), tariff-workspaces (3/3/3, старшие ratifiedAt null «нижняя граница»), tariff-datasets (catalog-id: free-v1-catalog / checkpoint-v1-catalog / у наблюдательного пункта заём checkpoint-v1-catalog с stub {since, reason, resolvesBy} и ratifiedAt null у значения), tariff-system-datasets (matrix-only, «да, вне квоты» ×3, T2/T10), tariff-instruments (составная форма entries: fft_trends/yamnet/mfcc enabled-flag; bearing.position gated-by-precondition minimal_network_ready; produce.own produce-scope). Твои требования из прогона b2: заглушка — «заём» словами с ratifiedAt null у значения; системные наборы — отдельная гранула; домены rights/catalog/instrument закрыты; заголовки «Приборы / Сценарии / Наборы звуков / Системные наборы / Инструменты». Скажи: (1) выполнены ли, (2) что в словах или паспортах лжёт, (3) вердикт.

**Ответ:**

Всплытие: [id=ozhegov-2026-07-29-tariff-grid-m3-tri] — леммы entitlement/precondition/гейта из tariff-grid повторяются здесь в форме гранул прав; важна точность: «заём» и gated-by-precondition — разные сущности.

Ответ по пунктам.

1. **Форма — да, выполнена.** Домены закрыты (`rights`/`catalog`/`instrument`), заголовки те, что заказывал. Заглушка наблюдательного пункта записана честно: значение `checkpoint-v1-catalog` + `stub {since, reason, resolvesBy}`, `ratifiedAt: null` — это заём словами, не претензия на истину набора. Системные наборы — отдельная гранула `matrix-only`, вне квоты.

2. **Что лжёт в словах:**
   - **workspaces: 3/3/3.** Для датчика 3 — закреплено; для старших — «нижняя граница», `ratifiedAt: null`. Но если все три ячейки численно равны, слово «нижняя граница» в паспорте не объясняет, почему значение не закреплено. Тогда это не «нижняя граница», а «значение-заглушка по аналогии». Термин требует поправки: либо закрепи 3 для всех, либо назови поле `placeholderForRatification: true`.
   - **tariff-instruments.** `produce.own` с правилом `produce-scope` — правило не из закрытого списка в TARIFF-MATRIX-DESIGN.md (там `enabled-flag`/`gated-by-precondition`). Либо добавь `produce-scope` в словарь правил, либо это синоним `enabled-flag` со scope — тогда сформулируй как значение, а не правило.

3. **Вердикт: fail.** Причина — несоответствие словаря: «нижняя граница» при численно равных ячейках и неописанное правило `produce-scope`. До исправления двух формулировок блок не принимаю.

Затронутые пути: `docs/containers/strategic-docs/granules/` — `tariff-workspaces.json` (поле-примечание), `tariff-instruments.json` (правило).

---
