# Промпт: Tariff Dataset DS3 — client bundled + UI

> Task-промпт · размер **M** · **1 PR**.  
> Реестр: `tariff-dataset-ds3-client-bundled` · эпик: [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md).  
> GitHub Issue: [#47](https://github.com/officefish/Membrana/issues/47).  
> **Зависит от:** merge DS2.

---

## Контекст

Автономный узел без media-server должен видеть **Базовый набор (free-v1)** с 120 сэмплами. Assets: `apps/client/public/catalog/free-v1/` (manifest + WAV). `MediaLibraryService.init()` уже вызывает seed с `assetBaseUrl: '/catalog/free-v1'`.

---

## Промпт целиком

### Что построить

1. Скопировать каталог из DS1 sync в `apps/client/public/catalog/free-v1/`.
2. `SampleLibraryModule`: read-only для `tariff-dataset` (нет импорта/удаления; badge «системный датасет»).
3. `moveTargets` исключает `kind: system`.

### Definition of Done

- [ ] Первый запуск client dev: коллекция с 120 сэмплами (после seed).
- [ ] Импорт в tariff заблокирован в UI и service.
- [ ] Ручная проверка playback одного drone + one not-drone.
- [ ] Отчёт Issue #47 + `yarn task:archive tariff-dataset-ds3-client-bundled`.

### Out of scope

- Paired provisioning (DS5).
- LFS policy — согласовать с Teamlead если PR > 50 MB.

---

## Проверка

```bash
yarn dataset:sync-free-v1
yarn workspace @membrana/client dev
# UI: Библиотека сэмплов → Базовый набор (free-v1)
```
