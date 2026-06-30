# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-30T07:57:46.414Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md` |
| Порядок ролей | Математик → Структурщик → Teamlead → Верстальщик → Музыкант |

**Вопрос:**

Архивация AI-сессий (Claude Code, Cursor, Codex): операционное решение и место в ежедневном цикле.

---

# Консилиум: Архивация AI-сессий в ежедневный цикл разработки

**Повестка:** Как интегрировать архивацию сессий Claude Code / Cursor / Codex в `yarn ritual:day` и `yarn ritual:evening`? Где хранить архив (в репозитории / отдельно)? Какой регламент скруба секретов и дедупликации? Кто ответственен за адаптеры под каждый IDE?

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Структурщик → Teamlead → Верстальщик → Музыкант

---

[Математик]: Сессии Claude Code экспортируются в JSONL, это стабильный формат. У нас уже есть INSIGHT с набросками адаптера для скруба `sk-ant-`, `ghp_` и других high-entropy токенов. Первый вопрос — где хранить архив: в `docs/sessions/` как часть репозитория или на отдельном сервисе? Если в репо, то дедуп по хеш-сумме turn'а, если отдельно — нужна HTTP-граница.

[Структурщик]: Хранение в репозитории — архитектурная проблема. `docs/sessions/` раздуется; за месяц сотни MB архивов. Лучше создать отдельный пакет `@membrana/session-archive-service`, который:
1. Читает `.jsonl` из `~/.claude/sessions/` (или коррелирует с git HEAD);
2. Скрубит и нормализует turns;
3. Отправляет на S3 или локальное хранилище в `background-media`.

Сам архив — в `background-media`, не в монорепо. Git следит только за **метаданными сессии** — UUID, branch, timestamp, link.

[Teamlead]: Согласен, метаданные в репо, архив отдельно. Но нужна **обязательная интеграция в ritual:day и ritual:evening**. Дневной ритуал: предложение архивировать текущую Claude-сессию (если открыта), подтверждение — и сессия уходит в очередь. Вечерний ритуал: финализация и отправка на S3 с тегом дня. Это **Структурщику** — новый фасад в `scripts/consilium.mjs` или `yarn archive:session`.

[Верстальщик]: Если это CLI-команда (`yarn archive:session`), нужна ясная обратная связь. Где-то в `apps/client` выводить статус: «Сессия архивирована (UUID: `abc...`), N turns, M токенов скрублено, link на S3». Это не требует UI, просто вывод в консоль и опционально toast в клиенте при следующем запуске.

[Музыкант]: Из аудио-контекста: если во время сессии IDE записывал audio-demo (захват микрофона через Membrana), то сессия должна корелировать с аудиофайлом. Это означает, что архив сессии должен включать **ссылку на временной диапазон** в аудиозаписи, если есть. Структурщик должен предусмотреть поле `correlatedAudioSegment: { startMs, endMs }` в метаданных.

[Математик]: Корреляция сессии с аудио — это отдельная задача, сейчас не критична. Первый адаптер — только Claude Code. Скруб токенов: regex-паттерны для `sk-ant-` (Anthropic), `ghp_` (GitHub), `lin_api_` (Linear), и генерические high-entropy хвосты после `=`. Список паттернов держать в `@membrana/core` как `SECRET_PATTERNS`.

[Структурщик]: Согласен, `SECRET_PATTERNS` в core. Дедупликация: каждый turn имеет deterministic hash (содержимое сообщения + timestamp + role). Если turn с таким hash уже архивирован, пропускаем. Это предотвращает дублирование при переархивации одной сессии. Хеш вычисляется **после** скруба.

[Teamlead]: Прямо сейчас нужна **регламентация**. Напиши, Структурщик:
1. Когда архивировать (вечерний ритуал, после завершения work session)?
2. Как связать с branch/commit/Issue (если есть)?
3. Что делать, если сессия прервана (incomplete)?

[Верстальщик]: Добавлю: как пользователю найти свою сессию позже? Нужна команда `yarn list:sessions --filter="2026-06-29" --branch="rodchenko"`, которая выводит таблицу. Или Web-интерфейс в cabinet, где видна история сессий?

[Музыкант]: Web-интерфейс сложнее, начни с CLI. Но если это пойдёт в production (Membrane Platform), то cabinet должен иметь вкладку **Session Journal** с фильтрацией и preview turn'ов (с секретами скрытыми).

[Математик]: Согласен, обязательно исключить `sk-*`, `ghp_*` из preview. Для preview достаточно: `role` (user/assistant), `timestamp`, тип (`text` / `tool_use` / `tool_result`), первые 100 символов (или `[sensitive]` если там ключ). Полное содержимое turn'а читается при разворачивании, но всё ещё скрублено.

[Структурщик]: Итак, архитектура:
- **Пакет:** `@membrana/session-archive-service` (foundation), может импортировать только core и типы детектора.
- **Бэкенд:** `background-media` получает POST `/api/sessions/upload` (JSONL, метаданные), сохраняет S3/disk, возвращает UUID.
- **Фасад:** `scripts/archive-session.mjs`, вызывается из ritual:evening, или команда `yarn archive:session`.
- **Метаданные:** `docs/sessions/<uuid>.meta.json` (в репо) — timestamp, branch, issue link, correlatedAudioSegment, turn_count, secret_pattern_count.

[Teamlead]: Да, это правильная граница. Но нужна **explicit ответственность**: Структурщик пишет фасад + регламент, Математик — скруб-паттерны + дедуп, Верстальщик — CLI-вывод и opционально cabinet-интеграция (отложим до Membrane v2). Музыкант — наблюдает требования для аудиокорреляции.

[Верстальщик]: Какой формат вывода в консоль? JSONL (каждая строка — результат) или таблица (более читаемая)?

[Музыкант]: Таблица понятнее:
```
UUID        | Branch    | Date       | Turns | Secrets scrubbed | Status
abc...      | ozhegov   | 2026-06-29 | 42    | 3                | ✓ uploaded
def...      | rodchenko | 2026-06-28 | 15    | 1                | ⏳ pending
```

[Структурщик]: Хорошо. Ещё один момент: если сессия не завершена (IDE рухнула), `state` может быть `incomplete`. Должны ли мы её архивировать? Я предлагаю: архивируем, но метаданные указывают `isIncomplete: true`, и она не попадает в основной журнал — только для отладки.

[Teamlead]: Согласен. Добавим флаг `isIncomplete` в `.meta.json`. А что с **адаптерами для Cursor и Codex**? Они сложнее, структура не стабильна. Сейчас fokus на Claude Code (SNDF), адаптеры Cursor/Codex отложим до `rag-top-k-c3`.

[Математик]: Claude Code — достаточно, это эталон. Если потом адаптер Cursor понадобится, его напишет Структурщик по тому же шаблону.

[Верстальщик]: Добавим ещё команду `yarn inspect:session <uuid>`, которая выводит в формате JSONL (для удобства diffing между двумя сессиями или экспорта в claude/gpt для анализа ошибки). Секреты всё ещё скрублены.

[Музыкант]: Идеально. И экспорт в `docs/session-reports/<uuid>/` для долгосрочного хранения important сессий — например, когда нашли и зафиксили баг через сессию агента.

[Teamlead]: Отлично, консенсус есть. Definition of Done ниже, и это входит в спринт на неделю.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **Где хранить архив** | Метаданные в `docs/sessions/` (в репо), полные JSONL-данные на S3 / localdisk в `background-media` |
| **Когда архивировать** | В `yarn ritual:evening`, опционально через `yarn archive:session <uuid>` перед этим |
| **Адаптер IDE** | Первый — Claude Code (JSONL), остальные (Cursor, Codex) — отложены до C3 RAG-этапа |
| **Скруб секретов** | `SECRET_PATTERNS` в `@membrana/core` (sk-ant-, ghp_, lin_api_, high-entropy хвосты); вычисляется до дедупликации |
| **Дедупликация** | Per-turn hash (после скруба); если уже архивирован — пропускаем |
| **Incomplete сессии** | Архивируются с флагом `isIncomplete: true`; не входят в основной журнал |
| **Корреляция с audio** | Поле `correlatedAudioSegment: { startMs, endMs }` в метаданных; детали — в отдельном консилиуме (C2) |
| **CLI-команды** | `yarn archive:session [<uuid>]` (интерактив + очередь), `yarn list:sessions [--filter]`, `yarn inspect:session <uuid>` (JSONL preview) |
| **Cabinet интеграция** | Отложена до Membrane Platform v2; сейчас только CLI |
| **Пакет-сервис** | `@membrana/session-archive-service` (в `packages/services/`), зависит только от core + детектор-типы |
| **Бэкенд-граница** | `POST /api/sessions/upload` в `background-media`, возвращает UUID + S3-link |
| **Ответственность** | **Структурщик** — фасад + регламент; **Математик** — скруб + дедуп; **Верстальщик** — CLI/cabinet-макет; **Музыкант** — требования корреляции audio |

**Definition of Done:**

1. ✅ Пакет `@membrana/session-archive-service` с публичным API:
   - `parseClaudeCodeJSONL(buffer): Turn[]`
   - `scrubSecrets(turn: Turn): Turn`
   - `deduplicateTurns(turns: Turn[]): Turn[]`
   - `computeTurnHash(turn: Turn): string`

2. ✅ Файл `@membrana/core/SECRET_PATTERNS.ts` с regex-паттернами.

3. ✅ Фасад `scripts/archive-session.mjs` (или встроить в ritual:evening):
   - Читает UUID из env / аргумента
   - Вызывает `session-archive-service`
   - POST на `background-media/api/sessions/upload`
   - Записывает `.meta.json` в `docs/sessions/`

4. ✅ Регламент в `docs/SESSION_ARCHIVE_REGULATION.md`:
   - Когда архивировать
   - Как связать с branch/commit/Issue
   - Lifecycle incomplete сессий
   - Формат `.meta.json`

5. ✅ Команды в `package.json`:
   - `yarn archive:session [uuid]`
   - `yarn list:sessions [filter]`
   - `yarn inspect:session uuid`

6. ✅ Unit-тесты на скруб + дедуп + хеш (Математик); эталон: `fv1-S1` спринт-метрики.

7. ✅ Integration-тест: Claude Code `.jsonl` → скруб → дедуп → дельта `docs/sessions/*.meta.json` без ошибок.

8. ✅ **LGTM** от **Teamlead** перед merge.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза. Консенсус достигнут.*
