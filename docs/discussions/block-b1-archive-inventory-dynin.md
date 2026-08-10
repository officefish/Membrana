# Обсуждение: block-b1-archive-inventory-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-10 15:48 UTC · dynin

**Вопрос:** Блок b1-archive-inventory-lib спринта dump-inventory-from-archive (план ратифицирован, ты держатель). Строишь дом scripts/lib/archive-inventory.mjs — единственную правду «опись-из-артефакта». Факты: дрилл держит в себе INVENTORY_SCRIPT (getCollectionNames→{name,count,indexes}), HASH_SCRIPT (sha256 по EJSON отсортированных по _id), buildInventory (subject collection-bson-sorted-by-id, source archive-contents), invariantsOfCollection, dockerAdapter (up/down/waitHealthy/mongosh/restore через стенд local-proof, изоляция именем проекта) и константы стенда. Дамп импортировать из дрилла НЕ может (скрипт-к-скрипту запрещён). Предлагаемый контракт lib: (1) переезжают INVENTORY_SCRIPT/HASH_SCRIPT/buildInventory/invariantsOfCollection/dockerAdapter/константы стенда; (2) readProjectInventory({adapter, project}) — бывший readSide дрилла; (3) buildInventoryFromArchive({archivePath, adapter, project=TARGET_PROJECT}) — up→waitHealthy→restore→readProjectInventory→down(в finally?), возвращает опись archive-contents; (4) зубы на fake-адаптере: порядок жизненного цикла, сортировка коллекций, system.* отфильтрованы скриптом, down зовётся и при падении restore. Вопросы: (а) down в finally — или падение прогона должно ОСТАВЛЯТЬ цель для разбора (drill имеет --keep-up)? (б) возвращать ли из buildInventoryFromArchive сырой listing рядом с канонической описью — дампу нужен маппинг в {db, collection, documentCount} манифеста (маппинг делает b3 у себя или lib отдаёт обе формы?); (в) детерминизм зубов: фикстура listing — дословный снимок живого прогона дрилла 09.08 — где взять честный снимок (из зубов дрилла? из var/backups манифеста?).

**Ответ:**

Отвечаю по существу, как держатель.

[память:подсознание] emerge dynin-2026-08-08-static-mmbrn-container-m7-migration-delivery — там я уже фиксировал: inventory-gate это не «прогнали и хорошо», а fenced snapshot с per-object предикатами. Ровно этот контракт сейчас переезжает в lib — субъект «collection-bson-sorted-by-id», источник «archive-contents» и есть тот самый fence. Полезно как якорь: lib не отдаёт «инвентарь вообще», она отдаёт инвентарь **под конкретную дисциплину**.

По вопросам:

(а) **down в finally — да, но с явным escape-хатчем.** Инвариант «стенд не течёт между прогонами» дороже удобства разбора: если finally опустить, любая ошибка теста-родителя оставляет висящий проект и следующий прогон ловит грязный `waitHealthy`. Контракт: `buildInventoryFromArchive({..., keepUp?: boolean = false})`. При `keepUp=true` down не зовётся ни в happy, ни в error пути — тогда разбор возможен через `docker compose -p <project> ...`. Дамп в CLI по умолчанию `keepUp=false`, флаг `--keep-up` пробрасывается наверх (симметрично дриллу). Зуб: при `restore` throw и `keepUp=false` — `adapter.down` вызван ровно 1 раз; при `keepUp=true` — 0 раз, ошибка проброшена.

(б) **Возвращать обе формы, но не в одном поле.** `{ inventory, listing }`: `inventory` — каноническая опись (subject/source/collections с count+indexes+invariants, готовая к hash), `listing` — сырой ответ `readProjectInventory` (плоский `{name,count,indexes}[]` до нормализации). Маппинг в `{db, collection, documentCount}` манифеста — это **работа b3**: lib не знает про схему манифеста дампа (это утечка вверх). Но давать b3 парсить каноническую опись обратно — глупо, поэтому `listing` рядом. Правило: `inventory` стабильна по контракту lib, `listing` — сырьё под нужды потребителя.

(в) **Честный снимок — из зубов дрилла, а не из var/backups.** var/backups — это артефакт конкретного бэкапа, он смешивает «что было в архиве» с «что стенд успел проиндексировать». Зубы дрилла 09.08 — уже отфильтрованный, воспроизводимый листинг с зафиксированным ожиданием. Копируем фикстуру буквально (`test/fixtures/listing-drill-2026-08-09.json`), в PR указываем sha256 файла и коммит дрилла-источника. Если фикстуры дрилла нет в его зубах в нужной форме — это дефект дрилла, чинить там, а не восстанавливать из бэкапа задним числом.

Что мне нужно от тебя перед кодом: подтверди (а) — `keepUp` наверх в CLI дампа, и (в) — фикстура дрилла существует в его `test/` (иначе первым коммитом идёт PR в дрилл на экспорт снимка).

---
