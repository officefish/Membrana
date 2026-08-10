# Membrana Local Sprint OPEN: dump-inventory-from-archive

| Поле | Значение |
|------|----------|
| Sprint | `dump-inventory-from-archive` |
| Procedure | `membrana-local-sprint` |
| Registry card | `dump-inventory-from-archive` ([#1814](https://github.com/officefish/Membrana/issues/1814)) |
| Plan | [`docs/sprint/cut/dump-inventory-from-archive.json`](../../sprint/cut/dump-inventory-from-archive.json) (v1, ратифицирован 10.08 15:46Z) |
| Prompt | [`DUMP_INVENTORY_FROM_ARCHIVE_PROMPT.md`](../../prompts/DUMP_INVENTORY_FROM_ARCHIVE_PROMPT.md) |
| Cutter | vesnin ([конспект](../../discussions/cut-dump-inventory-vesnin.md)) |
| Blocks | b1-archive-inventory-lib (dynin) · b2-drill-on-facade (ozhegov) · b3-dump-archive-source (tarasov) · b4-acceptance-live-run (tarasov) |
| Forecast | `vesnin-dump-inventory-from-archive-cut-1` записан ДО исполнения (гейт ADR-0026 прожит штатно: open-запись `@2`, `forecastRequired: true` — первый прогон, где обязательность сработала по построению) |
| Status | b1–b3 исполнены; b4 — живой прогон |

## Зачем

Строка 2 десятки хендофа 09.08, выбор владельца 10.08. Иссью #1814 (из BLOCK Тарасова
08.08): опись дампа читалась разбором человекочитаемого stderr `mongodump` — формат не
контракт («зуб вернётся на 7.1»), живой прогон уже ловил обратные кавычки в имени БД.
Предпосылка снята мерджем отката (#1809, `c41637df`): читать содержимое архива можно,
не разводя две правды. Приёмка: `manifest.inventorySource === 'archive-contents'`, зуб
сравнивает опись с фактическим содержимым артефакта.

## Итоги блоков

- **b1** — дом [`scripts/lib/archive-inventory.mjs`](../../../scripts/lib/archive-inventory.mjs):
  единственная правда «опись-из-артефакта» — стенд-константы, скрипты снятия
  (ДОСЛОВНО из дрилла), `buildInventory`, `readProjectInventory`,
  `buildInventoryFromArchive` (down в finally, `keepUp` — явный escape-хатч),
  `dockerAdapter({repoRoot})`. Возврат обеих форм `{inventory, listing}` — маппинг в схему
  манифеста остаётся у потребителя. Зубы 8/8 на fake-адаптере.
- **b2** — дрилл на приборах дома; оркестровка цели оставлена дриллу («снятие» и «сверка» —
  разные леммы, слияние было бы синонимией фасадов); реэкспорты — временный мост для зубов.
  Неизменность поведения — тремя точками: зубы дрилла 11/11 без правок, зубы дома 8/8,
  **побайтовое** равенство описи и дословность текстов скриптов против HEAD (в ходе переезда
  этой точкой пойман и вычинен дрейф `HASH_SCRIPT` — `require('crypto')` против `crypto`).
- **b3** — дамп на `archive-contents`: `parseDbInventory` демонтирован; опись — read-back
  с закрытого tmp до rename (инвариант «манифест раньше переименования» цел); манифест v2 —
  `protocolChecks.incompleteCollections` отдельным полем; политика ветвится по
  `schemaVersion`, манифесты v1 от 09.08 вечно читаемы ретенцией (зуб совместимости);
  стенд недоступен → стоп `DUMP_INVENTORY_UNAVAILABLE`, манифеста нет, tmp — след.
  Зубы 53/53 четырёх сьютов.
- **b4** — живой прогон: см. вещдок
  [`docs/audit/dump-inventory-acceptance-2026-08-10.md`](../../audit/dump-inventory-acceptance-2026-08-10.md).

## Шероховатости

- Докер-демон на машине был выключен в момент старта b4 — живой прогон ждал слова владельца
  (поднять Docker Desktop); b1–b3 шли на fake-адаптере, как и велит канон зубов тракта.
- «Дословность» фикстур уточнена по существу: дословным обязан быть снимок ЧУЖОГО формата
  (stderr mongodump); форма листинга — контракт нашего скрипта снятия, синтетика в зубах
  дома законна (решение держателя b1, вопрос (в)).
