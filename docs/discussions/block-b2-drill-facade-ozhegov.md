# Обсуждение: block-b2-drill-facade-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-10 15:56 UTC · ozhegov

**Вопрос:** Блок b2-drill-on-facade спринта dump-inventory-from-archive (ты держатель, XS-переезд). b1 готов: дом scripts/lib/archive-inventory.mjs экспортирует COMPOSE_FILE/SOURCE_PROJECT/TARGET_PROJECT/MONGO_SERVICE/DB_NAME, INVENTORY_SCRIPT/HASH_SCRIPT, buildInventory/invariantsOfCollection, readProjectInventory({adapter,project})→{inventory,listing}, buildInventoryFromArchive (down в finally, keepUp), dockerAdapter({repoRoot}). Твоя работа: scripts/archivarius-restore-drill.mjs переводится на импорты из дома — локальные копии констант/скриптов/buildInventory/invariantsOfCollection/dockerAdapter удаляются, readSide внутри runDrill заменяется на readProjectInventory (drill берёт .inventory), restore-путь цели может стать buildInventoryFromArchive({keepUp: cli.keepUp}) либо остаться своей оркестровкой на приборах дома. Вопросы границ: (а) runDrill сейчас сам зовёт up/waitHealthy/restore для цели — переводить его на buildInventoryFromArchive целиком (минус свой жизненный цикл, но drill теряет свой лог-поток по шагам?) или оставить оркестровку дриллу, забрав только константы+скрипты+readProjectInventory? (б) реэкспорты из дрилла для его зубов (зубы импортируют buildInventory/invariantsOfCollection из скрипта) — оставить живыми ссылками на дом (прецедент sprint-cut-check: реэкспорт после переезда) или переключить зубы на дом? (в) поведенческий инвариант: ни один вердикт verifyRestore не должен измениться — чем это доказываем (зубы дрилла как были зелёные)?

**Ответ:**

Контекст понял: b1 переехал, b2 — фасад дрилла на дом. Отвечаю по трём границам, как держатель.

**(а) Оркестровка цели — оставить дриллу.** `buildInventoryFromArchive` — словарная статья «снять инвентарь из архива с полным жизненным циклом». Дрилл — другая лемма: «прогнать restore и сверить предикатом», у него **свой лог-поток по шагам** (up → waitHealthy → restore → inventory → verify) и свой `--keepUp` семантикой отладки, не снятия. Слить их — синонимия фасадов, о которой предупреждает §1: «два фасада на одно и то же — повод объединить или назвать различие в ADR». Здесь различие есть: снятие vs. сверка. Забираем из дома только приборы: константы, `INVENTORY_SCRIPT`/`HASH_SCRIPT`, `buildInventory`, `invariantsOfCollection`, `readProjectInventory`, `dockerAdapter`. Жизненный цикл цели — руками дрилла.

**(б) Реэкспорты из дрилла — оставить живыми ссылками на дом**, ровно по прецеденту `sprint-cut-check`. Зубы импортируют по старому пути → в дрилле `export { buildInventory, invariantsOfCollection } from '<дом>'`. Это временный мост XS-переезда, не постоянная норма; в реестре мостов пометить срок жизни (следующий XS — переключение зубов на дом и удаление реэкспортов). Иначе получим два входа в одну статью словаря.

**(в) Инвариант поведения доказывается тремя точками:**
1. Зубы дрилла как были — зелёные (тот же корпус, тот же вердикт `verifyRestore`).
2. Зубы дома на `buildInventory`/`invariantsOfCollection`/`readProjectInventory` — зелёные (это они и переехали в b1).
3. Diff сериализованного `.inventory` до/после переезда на одном фикстуре — пустой (байтовое равенство ordered-JSON). Это ловит скрытый дрейф форматтера при импорте.

Уточнения перед мержем:
- Реэкспорты из дрилла в b2 — ок как временный мост, или сразу отдельным b-задачником переключаем зубы на дом?
- `--keepUp` дрилла и `keepUp` в `buildInventoryFromArchive` — один термин, два контекста (отладка сверки vs. снятие); зафиксировать различие в README дома, чтобы не всплыло синонимией?

---
