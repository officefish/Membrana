# Промпт: night-triage-office — детерминированный триаж реестра на background-office

> Task-промпт (размер **M**). Реестр: `id` = `night-triage-office`. GitHub Issue: [#380](https://github.com/officefish/Membrana/issues/380).
> Наследует пилот #344 (заморожен: облачная Claude-рутина умирала молча, нет канала ошибок) —
> артефакты и инварианты переиспользуются, меняется только **субстрат исполнения**: claude.ai/code Routine → **background-office** (git-ФС, логи, управляемый cron, уже крутит night-hunt).

## Решение владельца (2026-07-12)

**Детерминированное TS-ядро + LLM-нарратив.** Детекция ghost/orphan/stale — типизированный код (детерминизм тривиален, юнит-тесты, совпадает с эталонным срезом). LLM (OpenRouter) — только человекочитаемые рекомендации в отчёте, graceful-fallback без LLM.

## Инварианты (консилиум `docs/seanses/night-triage-routine-2026-07-10.md`, не пересматривать)

- «sink not source»: рутина **НЕ** закрывает issues, **НЕ** правит `registry.json`, **НЕ** пишет во внешние сервисы. Единственный выход — один файл-отчёт + draft PR.
- Категории: **ghost** (active делит GitHub Issue с архивной задачей) · **orphan** (active без tracker ID) · **stale** (active без движения > N дней; N=14 старт, не канон — dwell-time в отчёте).
- Изменения младше 24ч не классифицируются (переходные состояния).
- Отчёт: сводка первой строкой; три таблицы `id · категория · ссылка · действие (close/relink/re-scope) · уверенность (high/low)`; для stale — колонка dwell-time; high/low визуально разделены; сортировка по id (**byCodePoint**, не localeCompare).
- Секрет-гейт `yarn night-triage:secret-scan` блокирует запись/push при находке.
- draft PR в ветку `claude/night-triage-<date>`, diff = один новый файл-отчёт.
- Расписание 02:30 МСК, `enabled` по env-флагу, включается **только после приёмки**.

## Фазы

| # | Артефакт |
|---|----------|
| **NT1** | Детерминированное ядро `night-triage-core.ts` (ghost/orphan/stale, guard 24ч, byCodePoint) + юнит-тесты; сверка с эталоном (ghost:9, orphan:~110) |
| **NT2** | Рендер отчёта `night-triage-report.ts` (формат консилиума) + тесты |
| **NT3** | LLM-нарратив через `openrouter` (рекомендации/уверенность поверх детерминированного среза; graceful) |
| **NT4** | Модуль `night-triage` в background-office (scheduler/service/controller/module по паттерну `night-hunt`): git-активность для dwell-time, GitHub Issues state, секрет-гейт, draft PR |
| **NT5** | Деплой на office-VDS `176.124.218.4`, ручной ран, приёмка по DoD |

## Definition of Done

- [ ] NT1 ядро + тесты зелёные; находки ⊇ эталонного среза на одном срезе; два прогона идентичны.
- [ ] NT2 отчёт по формату консилиума (сводка + 3 таблицы + dwell-time + high/low).
- [ ] NT3 LLM-нарратив опционален, graceful без ключа.
- [ ] NT4 ран производит отчёт `docs/reports/night-triage/NIGHT_TRIAGE_<date>.md` + draft PR (diff = один файл); секрет-гейт блокирует; ноль модифицирующих действий вне отчёта.
- [ ] NT5 ручной ран на office даёт draft PR; ложные ghost/orphan ≤ 20%; расписание включается после LGTM.

## Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Ядро | `packages/background-office/src/modules/night-triage/night-triage-core.ts` | Чистая детекция; весь I/O — снаружи |
| Отчёт | `.../night-triage-report.ts` | Детерминированный markdown-рендер среза |
| Модуль | `.../night-triage.{module,service,scheduler,controller}.ts` | Оркестрация по паттерну `night-hunt` |
| Секрет-гейт | `scripts/night-triage-secret-scan.mjs` (готов) | Блокирующая проверка перед записью |
| Отчёты | `docs/reports/night-triage/NIGHT_TRIAGE_<date>.md` | Производный артефакт (ветка `claude/`) |

## Out of scope

- Права рутины на закрытие/изменение задач (никогда).
- Linear/Slack-доставка отчёта (кандидат фазы 2).
- Возврат к облачной claude.ai/code Routine.

## Связанные документы

- Пилот: `docs/day-sprint/night-triage-routine-2026-07-10/` (SPRINT_BRIEF, ROUTINE_PROMPT, INSIGHT, REFERENCE_SNAPSHOT), `docs/prompts/NIGHT_TRIAGE_ROUTINE_PROMPT.md`, консилиум `docs/seanses/night-triage-routine-2026-07-10.md`.
- Паттерн: `packages/background-office/src/modules/night-hunt/`.
