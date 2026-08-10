# Обсуждение: cut-dump-inventory-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-10 15:41 UTC · vesnin

**Контекст:** GitHub Issue #1814: «Опись дампа читается из лога чужой утилиты, а не с диска — источник назван, но временный»
**Вопрос:** Прогон контекста резчика: нарезка спринта dump-inventory-from-archive (M, карточка в реестре, membrana-local-sprint). Иссью приложена. Факты дерева 10.08: (1) scripts/archivarius-dump.mjs — buildManifest чистая, inventorySource='mongodump-stderr', dbInventory=parseDbInventory(stderr), incompleteCollections(stderr) — четвёртый дефект класса, гард полноты; (2) scripts/lib/mongo-dump-policy.mjs — закрытый список INVENTORY_SOURCES уже несёт 'archive-contents' (строка 43), валидация :185; (3) откат влит (#1809, c41637df): scripts/archivarius-restore-drill.mjs держит dockerAdapter (up/waitHealthy/mongosh/restore через стенд deploy/archivarius-backup/local-proof.compose.yml, изоляция именем проекта), runDrill читает опись ОДНИМ конвейером buildInventory (subject collection-bson-sorted-by-id, source 'archive-contents'), ядро сравнения — lib/mongo-restore-policy.mjs; (4) приёмка иссью: manifest.inventorySource==='archive-contents' И зуб сравнивает опись с фактическим содержимым артефакта, не с текстом лога; (5) правило иссью: чтение содержимого архива = восстановление, двух правд в двух местах быть не должно — конвейер один. Вопросы резчику: (а) архитектура — дамп читает опись артефакта ЧЕМ: вызовом машинерии дрилла? но дрилл — скрипт, импорт скрипт-к-скрипту запрещён (класс #1638/#1681) — значит вынос общего конвейера «опись-из-артефакта» в scripts/lib (какое имя дома?) и оба скрипта его потребляют; (б) судьба stderr-разбора: dbInventory уходит на archive-contents, а incompleteCollections — гард полноты из протокола самого mongodump — оставить? разбор stderr целиком не выкидывать или демонтировать?; (в) деградация: докера при дампе нет — падать (дамп без честной описи не дамп) или писать манифест с inventorySource='mongodump-stderr' честно названным источником и non-zero warning? (г) зубы без докера — инъекция адаптера как у дрилла? (д) нарезка на блоки с зонами, оценками, порядком; сервер (packages/background-*, deploy/) не трогаем — стенд переиспользуем как есть.

**Ответ:**

Резать буду по конструкции, не по симпатии. Иссью честная: источник назван полем, значит смена источника — смена значения, а не молчаливая правка регулярки. Дальше по вашим вопросам.

**(а) Общий конвейер.** Дом — `scripts/lib/archive-inventory.mjs`. Публичный контракт: `buildInventoryFromArchive({ archivePath, adapter }) → { source: 'archive-contents', dbInventory, incompleteCollections: [] }`. Он и есть та самая «одна правда». Дрилл и дамп его импортируют; импорт скрипт-к-скрипту действительно запрещён (класс #1638/#1681), а `scripts/lib/*` — легальный дом. Ядро адаптера (docker up/mongosh/restore) остаётся в `mongo-restore-policy.mjs` и `dockerAdapter`; конвейер — тонкий фасад над ним, subject тот же (`collection-bson-sorted-by-id`).

**(б) Судьба stderr-разбора.** `parseDbInventory` — демонтировать: контракт «что выгружено» уходит на артефакт. `incompleteCollections(stderr)` — оставить как **гард протокола**, а не как источник описи: это проверка «mongodump не оборвался посередине» и она читается из его же протокола законно. В манифесте два разных поля: `inventorySource: 'archive-contents'` и `protocolChecks.incompleteCollections: [...]`. Не смешивать.

**(в) Деградация без докера.** Падать. Дамп без честной описи — не дамп; политика уже держит закрытый список, соблазн вернуть `'mongodump-stderr'` как «честный warning» — это возврат к двум правдам через чёрный ход. Non-zero exit, код `DUMP_INVENTORY_UNAVAILABLE`, причина в манифест не пишется (манифеста нет).

**(г) Зубы без докера.** Да, инъекция адаптера как в дрилле — `buildInventoryFromArchive({ archivePath, adapter })`, в тестах — fake-adapter, отдающий заранее заготовленный листинг коллекций. Фикстура — дословный снимок реального артефакта, не сочинённая.

**Нарезка (M, membrana-local-sprint):**

| # | Блок | Зона | Оценка | Порядок |
|---|------|------|--------|---------|
| B1 | `scripts/lib/archive-inventory.mjs` + зубы с fake-adapter | scripts/lib, scripts/**/*.test.mjs | S | 1 |
| B2 | Дрилл переезжает на B1 (buildInventory заменяется вызовом фасада) | scripts/archivarius-restore-drill.mjs | XS | 2 |
| B3 | Дамп: удалить `parseDbInventory`, вызвать B1 через тот же dockerAdapter; `incompleteCollections` вынести в `protocolChecks` | scripts/archivarius-dump.mjs, mongo-dump-policy.mjs (валидация нового поля) | M | 3 |
| B4 | Приёмка иссью: живой прогон, манифест с `inventorySource==='archive-contents'`, зуб сравнения описи с артефактом | scripts/, docs/tasks/archive/ | S | 4 |

Сервер (`packages/background-*`, `deploy/`) не трогаем — стенд как есть.

**Рекомендация: форма готова, ADR не нужен** (решение укладывается в уже принятую политику закрытого списка и разделение lib/scripts). Консилиум — тоже нет: спор между Тарасовым и мной по (в) может быть, если он захочет мягкую деградацию; тогда позовём. Уточнение к владельцу одно: **B3 требует поднятого докера в CI-прогоне дампа** — это уже так или нужно закладывать в блок?

---
