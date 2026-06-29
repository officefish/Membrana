# Регламент: публикация competition UserCase в catalog picker

> После закрытия Competition Sprint — вывести fork'и в список системных UserCase (`tier: community`) для operator debug в браузере. Не путать с merge победителя в bundled MVP.

Связано: [`COMPETITION_SPRINT_REGULATION.md`](../COMPETITION_SPRINT_REGULATION.md) · skill `membrana-competition-packaging`.

---

## Когда

| Момент | Действие |
|--------|----------|
| Sprint **closed** | `CLOSURE.md` + `WINNER.md` готовы |
| Operator debug | Нужны все три fork в picker (не только winner) |
| Перед archive следующего sprint | `comp:unpublish-catalog` (manual) или замена `CATALOG_PUBLISH.json` |

---

## Артефакты

| Файл | Назначение |
|------|------------|
| `docs/competition-sprint/<sprint-id>/CATALOG_PUBLISH.json` | Manifest: ids, loaders, titles, verify command |
| `packages/device-board/src/catalog/community-competition-user-case-entries.ts` | **Generated** — active picker entries |
| `docs/competition-sprint/<sprint-id>/CATALOG_PUBLISH_STATE.md` | Дата публикации, список ids |
| `archived-competition-user-case-entries.ts` | Исторические loaders (rebuild), **не** picker |

---

## Команда

```bash
# 1. Убедиться что packs собраны
yarn usercase:build-competition-async-v2-all   # или sprint-specific build

# 2. Публикация (verify + codegen)
yarn comp:publish-catalog --id comp-mvp-async-v2-2026-06-25

# Dry-run
yarn comp:publish-catalog --id comp-mvp-async-v2-2026-06-25 --dry-run

# 3. Тесты
yarn workspace @membrana/device-board test -- src/catalog/user-case-catalog.test.ts
yarn workspace @membrana/usercase-catalog-service test
```

---

## CATALOG_PUBLISH.json (schema)

```json
{
  "sprintId": "comp-mvp-async-v2-2026-06-25",
  "winner": "beta",
  "verifyCommand": "node scripts/usercase.mjs verify-competition-async-v2",
  "entries": [
    {
      "id": "usercase-mvp-microphone-alpha-async-v2",
      "loader": "getDefaultMvpMicrophoneAlphaAsyncV2Document",
      "loaderModule": "default-usercase-mvp-microphone-alpha-async-v2.js",
      "title": "…",
      "description": "…",
      "functionCount": 4
    }
  ]
}
```

---

## Operator workflow (browser)

1. `yarn workspace @membrana/client dev`
2. Device-board → UserCase list → выбрать Alpha / Beta / Gamma (badge **Sprint**)
3. Apply → Run ≥60s
4. `yarn logs:parse` → `smoke v2.0-async: PASS`, `drone-skip: 0`

---

## Unpublish (следующий sprint)

1. Очистить или заменить `community-competition-user-case-entries.ts` (пустой массив или новый sprint)
2. `yarn comp:publish-catalog --id <new-sprint-id>`
3. Старые fork остаются в `ARCHIVED_*` для rebuild

---

## CI

При изменении `community-competition-user-case-entries.ts` или `CATALOG_PUBLISH.json` — `usercase-competition.yml` + catalog tests green.

---

## Синтез замыслов (optional)

```bash
yarn competition:synthesis-async-v2              # Anthropic
yarn competition:synthesis-async-v2 --deepseek # DeepSeek (DEEPSEEK_API_KEY in .env)
```

Output: `docs/competition-sprint/comp-mvp-async-v2-2026-06-25/COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md`
