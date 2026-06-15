<!-- Обновлено: 2026-06-14 (VDR1 — validated-drone-recognition epic) -->
<!-- Тип: центральная задача дня (MAIN_DAY_ISSUE) -->
<!-- Эпик: docs/prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md -->
<!-- Реестр: vdr1-sample-label-patch-api -->

# MAIN_DAY_ISSUE — 2026-06-14

**Дата:** 2026-06-14 · **Хранитель:** Teamlead (Vesnin)

---

## Один обязательный фокус дня

### **VDR1: PATCH label + notes + роль admin**

**GitHub Issue:** [#47](https://github.com/officefish/Membrana/issues/47)  
**Эпик:** `validated-drone-recognition`  
**Фаза:** `vdr1-sample-label-patch-api`  
**Промпт:** [`docs/prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md`](./prompts/VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md)

---

## Цель

API и права для ground truth: `label` + `notes` в media; `User.role` в cabinet; admin размечает tariff dataset.

---

## Definition of Done (VDR1)

- [x] `PATCH /v1/devices/:deviceId/samples/:sampleId` (media)
- [x] `PATCH /v1/membranes/:membraneId/catalog/samples/:sampleId` (cabinet, admin)
- [x] `User.role` + миграция; seed `admin` → role admin
- [x] `@membrana/media-library-service` `updateSampleLabelNotes()`
- [x] Unit-тесты media + cabinet
- [ ] Merge PR → `yarn task:archive vdr1-sample-label-patch-api`

**Следующее:** VDR2 — UI разметки в client + cabinet.

---

## Команды

```bash
yarn workspace @membrana/background-media test
yarn workspace @membrana/background-cabinet test
yarn workspace @membrana/media-library-service test
```
