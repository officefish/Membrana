# Архив: Зуб снов читает настоящий реестр; живость моделей проверяется ночью, а не руками

| Поле | Значение |
|------|----------|
| **ID** | `dreams-models-liveness` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-08-10 |
| **Архивирована** | 2026-08-10 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DREAMS_MODELS_LIVENESS_PROMPT.md`](../../docs/prompts/DREAMS_MODELS_LIVENESS_PROMPT.md) |

## Заметки при закрытии

Влито PR #1835 (80b1129d, 10.08). Зуб офиса читает настоящий scripts/lib/dreams-providers.mjs тем же динамическим импортом по file-URL, что и прод; ожидания считаны из реестра, не выписаны литералами. Гард scripts/dreams-model-ids.test.mjs не даёт завести третью копию и живёт в корпусе scripts (мердж-гейт vitest выборочный — гард обязан стоять и когда правят соседа). yarn dreams:probe-models проверяет живость id у провайдера: три исхода alive/dead/inconclusive, коды 0/1/2 по прецеденту execution-gate, правило троекратности читает ленту docs/truth/dreams-liveness.jsonl. Каденция — ночь (vitest-nightly.yml, if: always()); в мердж-гейт не ставили по вердикту резчика. Замер, изменивший обоснование: окно расхождения зуба с реестром — 3 дня (07.08 e3c0fb59 → 10.08), 38 коммитов и 91 зелёный прогон на main при двух мёртвых id. Гард по ходу нашёл третий носитель (openrouter.service.ts:20) — заведена карточка openrouter-default-model-unverified. Живой прогон нашёл geo-блок: без прокси глагол вечно отвечал бы inconclusive с машины из РФ. sprint:gate 4/4 honest_pair, точность нарезки 75%.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
