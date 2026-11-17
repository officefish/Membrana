# Архив: Установщик Studio: честный отказ при AV-блокировке + fallback на артефакт CI (Г3)

| Поле | Значение |
|------|----------|
| **ID** | `studio-package-av-refusal` |
| **Статус** | archived |
| **Размер** | S |
| **Создана** | 2026-08-25 |
| **Архивирована** | 2026-11-17 |
| **GitHub Issue** | — |
| **Linear** | — |
| **Промпт** | [`docs/prompts/STUDIO_PACKAGE_AV_REFUSAL_PROMPT.md`](../../../docs/prompts/STUDIO_PACKAGE_AV_REFUSAL_PROMPT.md) |

## Заметки при закрытии

Исполнено: PR #2159 (sha 211480c9) — чистая функция классифицирует отказ electron-builder (leftover / app-running / external-holder), называет файл и даёт fallback на артефакт CI командой gh run download; scripts/lib/studio-package-failure.mjs и scripts/studio-package.test.mjs в main. Класс называется external-holder, а не av-locked. (ревизия реестра 17.11, шаг 0.7 RETURN_STRATEGY_2026-11)

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
