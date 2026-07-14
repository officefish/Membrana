# Task Closure Teamlead Review — regulation v1

> Канон автоматического review при закрытии конкретного Issue, task или sprint.
> Владелец: Vesnin (Teamlead). Основание: консилиум 2026-06-28.

## Назначение

Пользователь не должен отдельно писать «team lead review» после каждой публикации.
Если агент довёл зарегистрированную задачу до commit/push, closure-review запускается
автоматически, если пользователь явно не попросил остановиться на публикации.

Процесс дополняет, но не заменяет:

- `CODE_REVIEW_REGULATION.md` — глубина T0/T1/T2 и LGTM/BLOCK;
- `TASK_CLOSURE_REGULATION.md` — merge, Issue report и archive;
- `TASK_PROMPT_WORKFLOW.md` — registry и task prompt.

## Identity

Closure unit определяется кортежем:

```text
taskId + currentCommitSha + branch + githubIssue? + pullRequest?
```

Review, сделанный для другого SHA или task id, недействителен. Manifest хранится в
`docs/reviews/<task-id>/manifest.json`; immutable review — рядом как `<sha>-review.md`.

**Норма хранения (консилиум agent-tooling-friction, 2026-07-13, ti-1):** содержимое
`docs/reviews/*/` — локальные рабочие артефакты процесса закрытия, в git НЕ
коммитятся (`.gitignore`), в PR не входят и публичным контрактом не являются.
Доказательство ревью в истории — вердикт/SHA в `archiveNotes` карточки реестра и
отчёте Issue, не сами файлы.

## State machine

| State | Meaning | Allowed next |
|-------|---------|--------------|
| `implementation_ready` | DoD выполнен локально | `published` |
| `published` | commit существует и push подтверждён | `review_pending` |
| `review_pending` | context/evidence собраны | `lgtm`, `blocked`, `needs_fix` |
| `blocked` | P0/P1 либо недостаточно evidence | `implementation_ready`, `review_pending` |
| `needs_fix` | исправления запрошены | `implementation_ready` |
| `lgtm` | Vesnin одобрил exact SHA | `merged`, `accepted_branch_only` |
| `merged` | merge evidence подтверждён | `archived` |
| `accepted_branch_only` | human явно отложил merge | `archived` |
| `archived` | registry и Issue closure завершены | — |

Любой новый commit после review переводит состояние в `implementation_ready`, очищает
verdict/review artifact и требует нового review.

## Commands

```bash
yarn task:review:prepare --id <id> [--ref HEAD] [--pr N] [--dry-run]
yarn task:review:run --id <id> [--dry-run]
yarn task:review:status --id <id>
yarn task:review:finalize --id <id> [--accepted-branch-only "reason"] [--dry-run]
```

### prepare

1. Найти active task в registry и прочитать её prompt целиком.
2. Зафиксировать branch, current SHA, Issue/PR metadata и diff scope.
3. Определить tier по `CODE_REVIEW_REGULATION.md`.
4. Собрать фактические checks; не превращать отсутствие результата в `pass`.
5. Создать/обновить per-task manifest идемпотентно.

### run

1. Проверить manifest/schema и соответствие current SHA.
2. Выполнить review correctness → security → architecture → performance → readability.
3. Для T2 применить C1–C10 полностью; для T0 допускается краткий формат.
4. Записать immutable review artifact и `LGTM | BLOCK`.
5. BLOCK не вызывает GitHub close или task archive.

### finalize

1. Повторно проверить exact SHA и LGTM artifact.
2. Требовать merge evidence. Исключение — явный `--accepted-branch-only` с причиной.
3. Только после gate вызвать существующий archive flow и очередь GitHub closure.
4. Повторный вызов не дублирует archive card или Issue comment.

## Automatic trigger contract

Skills Cursor, Claude Code и Codex после успешного commit/push зарегистрированной задачи:

1. определяют task id;
2. запускают `prepare`;
3. запускают `run`;
4. сообщают verdict и artifact;
5. не вызывают `finalize`, пока GitHub merge/acceptance не подтверждены.

Явная просьба «только commit/push», «остановись после публикации» отключает автоматический
review на этот turn. Неоднозначный task id — fail-closed с запросом выбора.

## Evidence policy

- `pass` допустим только при сохранённых command, timestamp и exit code/CI conclusion.
- Проверки, выполненные на другом SHA, помечаются stale.
- GitHub offline не блокирует local review, но блокирует утверждение `merged`.
- P0/P1 дают BLOCK; P2 не блокирует LGTM.
- Секреты, `.env`, deploy logs и unrelated files проверяются по commit diff.

## Tiers and roles

- T0: docs/config, краткий Vesnin verdict; человеческий запрос не требуется.
- T1: Teamlead + Structurer; остальные роли по затронутому домену.
- T2: полный состав и C1–C10.

`reviewersStatus` — evidence участия ролей, но финальный verdict всегда принадлежит
Vesnin. Нельзя вычислять LGTM простым большинством ролей.

## Fail-closed rules

Finalize запрещён, если выполняется хотя бы одно условие:

- task отсутствует, archived либо prompt не найден;
- manifest невалиден;
- reviewed SHA отличается от current SHA;
- verdict не LGTM или review artifact отсутствует;
- есть unresolved P0/P1;
- merge evidence отсутствует и branch-only не принят явно;
- GitHub state неизвестен, но запрошено состояние `merged`.

## Backward compatibility and migration

В пилоте старые команды продолжают работать. `task:archive` сначала получает warning,
если для новой задачи нет closure-review evidence; hard gate включается только после R5
и отдельного migration decision. Legacy tasks не мигрируются автоматически.

## Required review output

```text
Tier: T0 | T1 | T2
Task: <id>
Commit: <40-char SHA>
Verdict: LGTM | BLOCK
P0/P1: <items or —>
P2: <items or —>
Checks: <command/status list>
Closure readiness: ready | waiting_merge | needs_fix
```
