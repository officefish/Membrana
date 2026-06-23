# CURRENT_TASK

> **Day-sprint:** `membrana-studio-ms0-ms4-day-sprint` · Issue [#93](https://github.com/officefish/Membrana/issues/93)

## Фокус

**Membrana Studio MS0–MS4:** canon → Electron shell → media/journal FS → Windows installer.

**Ограничение:** `apps/client` **не трогаем** — только `apps/membrana-studio`, scripts, docs, CI.

## Промпт

[`docs/prompts/MEMBRANA_STUDIO_MS0_MS4_DAY_SPRINT_PROMPT.md`](./prompts/MEMBRANA_STUDIO_MS0_MS4_DAY_SPRINT_PROMPT.md)

## Порядок фаз

MS0 (Vesnin) → MS1 (Ozhegov) → MS2 (Ozhegov + Dynin) → MS3 (Ozhegov) → MS4 (Rodchenko)

## MS5

Prod paired smoke — **вне** этого спринта (`membrana-studio-ms5-prod-smoke`).

## Команды

```bash
yarn studio:dev
yarn workspace @membrana/membrana-studio test
yarn studio:build
yarn studio:package   # MS4 verify
```
