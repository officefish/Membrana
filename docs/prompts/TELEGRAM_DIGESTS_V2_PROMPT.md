# Промпт: Telegram-дайджесты v2 — вшитая md-шапка пояснений + подробная фактура

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **M**. Ожидаемый артефакт: **1 PR** — расширение `modules/telegram`
> (office) + extract-скрипта + md-шапка в `docs/comms/`.
> Реестр: `id` = `telegram-digests-v2` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Канал союзников пробит (#428, закрыт): дайджесты day/evening доставляются в приватную
группу. Решение владельца 2026-07-13 (вечер) — доработать содержание
([Issue #434](https://github.com/officefish/Membrana/issues/434)):

1. Выжимка может оставаться технической, но отчёт должен быть **подробным и толковым**
   (сейчас вечер = 1 вердикт + 6 однострочных булитов).
2. **Пояснения о проекте вшиты в каждый отчёт** «мелкими буквами» — реализация
   в Telegram: `<blockquote expandable>` (HTML parse mode), свёрнуто по умолчанию.
3. **Источник пояснений — .md в репо** (`docs/comms/`, по образцу ALLY_PRIMER):
   редактируется без кода.

Консилиум не требуется — исполнение по готовому канону #428
([`TELEGRAM_ALLY_REPORTS_PROMPT.md`](./TELEGRAM_ALLY_REPORTS_PROMPT.md)); все
запреты канона действуют дословно (stateless office, никакого двустороннего бота,
токены только в env, LLM-пересказ — отдельная фаза, НЕ здесь).

## Что построить

| Слой | Путь | Изменение |
|------|------|-----------|
| md-шапка | `docs/comms/ALLY_DIGEST_HEADER.md` | Новый файл: 3–5 строк о проекте + мини-словарь; краткая версия ALLY_PRIMER |
| DTO | `modules/telegram/ritual-digest.dto.ts` | `primerMd?: string` (сырой md шапки), `tracks?: string[]` (вечер: треки дня) |
| Конвертер | `modules/telegram/telegram-md.ts` (новый) | Чистая функция md→Telegram-HTML: bold/italic/ссылки/`код`, экранирование, **без внешних зависимостей** |
| Формат | `modules/telegram/telegram-format.ts` | Шапка `<blockquote expandable>` после заголовка; вечер: секция «Треки дня»; жёсткий клэмп 4096 символов (детерминированное усечение булитов с хвоста) |
| Extract | `scripts/lib/ritual-digest-extract.mjs` | День: полный блок каждой «Задачи N» (фактура, не первое предложение); вечер: `tracks` из «Итоги дня:» каждой роли (роль: первое предложение) |
| Скрипт | `scripts/telegram-ritual-digest.mjs` | Читает `docs/comms/ALLY_DIGEST_HEADER.md` → `payload.primerMd`; graceful: нет файла → поле отсутствует, отчёт уходит без шапки |

Пайплайн не меняется: локальный скрипт извлекает payload и POST-ит в office
(push-ingest ADR 0004); **конвертация md и вёрстка — только в office** (канон #428:
«форматирование живёт в office, в скрипте — только извлечение»).

## Acceptance criteria (из Issue #434)

- [ ] md-файл шапки в `docs/comms/` (3–5 строк + словарик), редактируется без кода.
- [ ] Конвертер md→Telegram-HTML — чистая функция, unit-тесты, без внешних зависимостей.
- [ ] Шапка вшита в day/evening как `<blockquote expandable>` (свёрнута по умолчанию).
- [ ] Фактура расширена: день — задачи с «что даст» (полные блоки), вечер — треки дня
      + вердикт + оценка + «что дальше»; лимит 4096 символов соблюдён (клэмп-тест).
- [ ] Graceful: нет md-шапки → отчёт уходит без неё.

## Тесты

| Область | Минимум |
|---------|---------|
| telegram-md | bold/italic/ссылка/код; экранирование & < >; смешанный сниппет |
| telegram-format | с primerMd → `<blockquote expandable>`; без — нет blockquote; tracks-секция; клэмп >4096 → ≤4096 с усечением булитов |
| extract | фикстуры v2: день — полные блоки задач; вечер — 5 треков по ролям; старые фикстуры не ломаются |
| скрипт | primerMd подхватывается из docs/comms; graceful без файла |

## Definition of Done

- [ ] Acceptance criteria выше.
- [ ] `yarn workspace @membrana/background-office test` + `yarn test:scripts` зелёные.
- [ ] `node scripts/telegram-ritual-digest.mjs --kind day --dry-run` показывает payload с `primerMd`.
- [ ] Живой smoke: дайджест с шапкой виден в группе (после мёржа, office уже задеплоен — редеплой по `membrana-office-vds-deploy` при изменении office-кода).
- [ ] Отчёт в Issue #434, LGTM Teamlead.

## Out of scope

- LLM-пересказ «по-простому» (следующая фаза, после хвостов #424/#425).
- Изменение транспорта/endpoint/guard (канон #428 не трогаем).
- Per-merge нотификации, двусторонний бот, alarm-уведомления.

## Порядок работы ролей

1. **Teamlead (Vesnin)** — приёмка фактуры и тона; гейт 4096.
2. **Структурщик (Ozhegov, lead)** — конвертер как чистая функция; граница «office форматирует, скрипт извлекает»; DTO без импорта core.
3. **Верстальщик (Rodchenko)** — вёрстка: порядок секций, expandable-шапка, усечение без обрыва тегов.
4. **Математик (Dynin)** — детерминизм extract/клэмпа; secops не затронут (секреты не трогаем).
5. **Музыкант** — не задействован.
