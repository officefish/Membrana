# Архив: NB2: yarn vdr:labels-merge — merge меток в манифест пилота + --labels-only для intra-rater

| Поле | Значение |
|------|----------|
| **ID** | `nb-vlr-2-labels-merge-script` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-07-03 |
| **Архивирована** | 2026-08-09 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md`](../../docs/prompts/VDR_LABEL_ROUNDTRIP_NIGHT_BUILD_EPIC_PROMPT.md) |

## Заметки при закрытии

yarn vdr:labels-merge зарегистрирован в package.json (L86) и реализован в scripts/vdr-labels-merge.mjs: матч по имени файла без расширения, отчёт applied/same/untouched/unmatched, --dry-run и --labels-only для intra-rater; тесты scripts/vdr-labels-merge.test.mjs. Влито aaf4d119 (PR #241).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
