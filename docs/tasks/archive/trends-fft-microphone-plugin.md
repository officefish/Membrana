# Архив: Плагин микрофона: анализатор тенденций FFT (trends-fft-analyzer)

| Поле | Значение |
|------|----------|
| **ID** | `trends-fft-microphone-plugin` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-11 |
| **Архивирована** | 2026-06-11 |
| **GitHub Issue** | #56 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md`](../../docs/prompts/TRENDS_FFT_MICROPHONE_PLUGIN_PROMPT.md) |

## Заметки при закрытии

techies68 9b40fa4 + 655acf1

## Отчёт о выполнении

**Что сделано.** Пакет `@membrana/trends-detector-service` (classifyTrends, системные шаблоны WIND/QUIET/TRAFFIC/DRONE/BIRDS/VOICE, unit-тесты). Плагин `trends-fft-analyzer`: сбор замеров по интервалу, auto/manual, tick UI, fullscreen, telemetry `trends-fft`, топ-3 рейтинг и таблица разбора совпадений (`buildTemplateMatchBreakdown`).

**Коммиты.** `9b40fa4`, `655acf1` на ветке `techies68`.

**Тесты.** `@membrana/trends-detector-service` 8/8; client plugin smoke tests green; typecheck OK.

**Регистрация.** Плагин в `registerClientModules`, `MicrophoneModule`, sidebar.

**Follow-up.** Редактор пользовательских шаблонов — отдельная задача `trends-fft-template-editor` (#57).

**Отложено (out of scope v1).** sample-library mode; полный редактор шаблонов (#57).

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
