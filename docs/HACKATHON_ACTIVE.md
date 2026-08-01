# Hackathon Active

| Поле | Значение |
|------|----------|
| **status** | `open` |
| **hackathonId** | `mintlify-workshops-procedures-2026-08-01` |
| **openedAt** | 2026-08-01 |
| **branch** | `codex/mintlify-workshops-procedures-hackathon` |
| **base** | PR #1613 · `codex/execution-procedure-interface` |
| **brief** | [`docs/prompts/MINTLIFY_WORKSHOPS_PROCEDURES_HACKATHON_BRIEF.md`](./prompts/MINTLIFY_WORKSHOPS_PROCEDURES_HACKATHON_BRIEF.md) |
| **interview** | [`docs/seanses/hackathon-brief-interview-mintlify-workshops-procedures-2026-08-01.md`](./seanses/hackathon-brief-interview-mintlify-workshops-procedures-2026-08-01.md) |
| **prompt** | [`docs/prompts/MINTLIFY_WORKSHOPS_PROCEDURES_HACKATHON_PROMPT.md`](./prompts/MINTLIFY_WORKSHOPS_PROCEDURES_HACKATHON_PROMPT.md) |

## Замороженный scope

Отрендерить в Mintlify доступную документацию по всем живым мастерским и всем
записям реестра процедур. Редакционные страницы объясняют систему, а каталоги
генерируются из первичных источников. Реальные примеры используются там, где
они существуют; их отсутствие становится явным входом marathon-задачи.

## Эстафета

| Этап | Держатель | Карточка | Выход | Статус |
|------|-----------|----------|-------|--------|
| H1 foundation | vesnin | `mwp-h1-foundation` | архитектура проекции и генератор | accepted |
| H2 runtime | ozhegov | `mwp-h2-workshops` | страницы мастерских | accepted |
| H3 extension | ozhegov | `mwp-h3-procedures` | страницы процедур | accepted |
| H4 close | vesnin | `mwp-h4-render-close` | marathon, render, audit, PR | team LGTM; owner gate |

## Stop rules

- Не начинать следующий H-этап без принятого stage-completion-checklist.
- Не поддерживать вручную список, который уже существует в реестре или
  манифестах.
- Не придумывать пример для заполнения пустоты.
- Не строить процедуру marathon внутри этого хакатона.
- Не публиковать Mintlify в production без отдельного слова владельца.

## Лог

Текущий прогон: [`docs/HACKATHON_LOG_2026_08_01.md`](./HACKATHON_LOG_2026_08_01.md).
Исторический `device-board-hackathon-1` закрыт и остаётся в архиве
`docs/archive/hackathon/2026-06-17/`.
