# Промпт: атлас контейнеров — контейнер контейнеров + мастерская + mintlify

> Спринт `tooling-atlas` · M · lead ozhegov, support dynin.
> По слову владельца 22.07: контейнер с документацией по всем остальным контейнерам +
> мастерская, предоставляющая информацию о них («общая документация по туллингу», под mintlify).
> Развилка закрыта владельцем: **производный индекс** (агрегатор, без копий), **строить сразу**.
> **Исполнено в этом же спринте** — ниже спецификация как запись.

## Что построено

Контейнер контейнеров `docs/tooling-atlas/` (паттерны GROUP_CONTAINERIZATION + HOME_WORKSHOP,
**шестой живущий жилец** мастерской). Его группа — сами контейнеры проекта.

- **`docs/tooling-atlas/README.md`** — контракт мета-контейнера: элемент = целый контейнер;
  источник истины остаётся в каждом контейнере (README + workshop.manifest), атлас лишь
  агрегирует. Копий нет.
- **Агрегатор** `scripts/lib/tooling-atlas.mjs` (производный): `discoverContainers`
  (по `workshop.manifest.json`), `auditContainers`, `decomposeContainers`, `inspectContainer`,
  `renderAtlasRegistry`, `renderMintlifyPage`. Переиспользует `validateWorkshop`/`listWorkshopManifests`.
- **`yarn tooling:atlas`** — мастерская: `--audit` (инвентарь + здоровье мастерских),
  `--decompose --by family|holder|kit`, `--inspect <home>`, `--render` (пересбор индекса +
  mintlify), `--check` (дрейф производных, зуб CI).
- **`workshop.manifest.json`** — три глагола (полностью оснащён, без ⚠).
- **Производные**: `docs/tooling-atlas/registry/ATLAS.md` (индекс) +
  `apps/docs/tooling/containers.mdx` (mintlify-витрина, группа «Tooling» в `docs.json`).
- Замер 22.07: **6 контейнеров** (git, tasks, bestiary, procedures, precedents, сам атлас);
  самоссылка работает (атлас индексирует себя как `meta`).

## Границы (осознанные)

- Индексируются контейнеры с `workshop.manifest.json`; плоский `scripts/` без мастерской —
  кандидат на включение позже.
- Только агрегация и чтение; собственных описаний атлас не держит (никаких копий README).
- Каталог-UI сверх mintlify-страницы — вне области.

## Definition of Done — выполнено

- [x] README-контракт мета-контейнера; источник истины назван (README+манифест каждого контейнера).
- [x] Агрегатор + `tooling:atlas` (audit/decompose/inspect/render/check); 8 тестов.
- [x] `workshop.manifest.json` (три глагола); `validate:workshop`/`check:workshop-ownership` зелёные (6 манифестов).
- [x] Производный индекс `registry/ATLAS.md` + mintlify `apps/docs/tooling/containers.mdx` + группа в `docs.json`; `--check` ловит дрейф.
- [x] Тесты 30/30 (atlas + мастерские).
