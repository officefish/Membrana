# Промпт: Tariff Dataset DS5 — server provisioning при pair

> Task-промпт · размер **M** · **1 PR**.  
> Реестр: `tariff-dataset-ds5-server-provision` · эпик: [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md).  
> GitHub Issue: [#47](https://github.com/officefish/Membrana/issues/47) или новый sub-issue.  
> **Зависит от:** merge DS1 + DS2.

---

## Контекст

После pairing клиент переключается на `remote-server`. Сейчас `ensureReserved` создаёт пустой `__tariff_dataset__`. Нужно **provisioning**: залить `free-v1-catalog` (120 blobs) для `deviceId` по тарифу.

---

## Промпт целиком

### Что построить

1. Скрипт `yarn media:provision-catalog` (или hook в pair flow): читает v0.2 manifest, upload в tariff collection.
2. Идемпотентность: повторный pair не дублирует samples.
3. Квота: catalog samples не в `userStorage`.
4. Docs: `BACKGROUND_SERVERS.md` или deploy note.

### Definition of Done

- [ ] Paired client: 120 samples в tariff-dataset с media-server.
- [ ] Guards: client upload/delete в tariff — 4xx.
- [ ] Prod smoke на media.membrana.space (если деплой в scope).
- [ ] Отчёт Issue + `yarn task:archive tariff-dataset-ds5-server-provision`.

### Out of scope

- Платные тарифы с другими catalogId (только free-v1).
