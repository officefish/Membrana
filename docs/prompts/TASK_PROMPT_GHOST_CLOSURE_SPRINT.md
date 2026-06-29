# TASK PROMPT — Спринт закрытия задач-призраков

**Размер:** L

**Дата старта:** 2026-06-29

**Источник постановки:** snapshot 2026-06-28
**Артефакт:** атомарный commit реестра + отчёт аудита + Teamlead closure review.

## Контекст

В реестре обнаружены active-задачи, разделяющие `githubIssue` с архивными
задачами-сёстрами. Это только гипотеза рассинхрона. Архивировать задачу можно лишь
после независимой проверки состояния GitHub Issue и выполнения её спецификации.

| Источник | Роль |
|---|---|
| `docs/tasks/registry.json` | источник истины по задачам |
| `docs/prompts/TASK_CLOSURE_REGULATION.md` | канон закрытия |
| prompt каждой задачи | критерий выполнения работы |
| GitHub Issue/PR/commit history | внешнее evidence |

## Промпт целиком

Проведи поштучный аудит задач-призраков для GitHub Issues #47, #67, #81, #93 и
#133. Для каждой задачи установи фактический issue state и бинарный work_done по
её prompt, PR и истории коммитов. Не архивируй по эвристике общей issue. Оставь
stage-gate #47 active без отдельного человеческого подтверждения. Не закрывай
issue с живыми active-детьми. Сформируй таблицу evidence и вердиктов, затем
атомарно обнови registry только для доказанных закрытий.

## Scope snapshot

- #47: `single-node-detection-first`, `sld3-dsp-detectors-free-v1`,
  `sld4-stage-gate-calibration`, `validated-drone-recognition`, `vdr1-*`…`vdr6-*`,
  `real-dataset-live-calibration`, `sample-library-drone-detection`.
- #67: `membrane-platform-v1`, `cabinet-mp4-hardening-night-build`, `cabinet-mp4-nb0-*`…
  `cabinet-mp4-nb3-*`, `cabinet-sample-library-v1`, `cabinet-sample-library-csl1-*`…
  `csl3-*`, `cabinet-journal-hotfix`, `cj-0-*`…`cj-5-*`.
- #81: `smoke-testing-s1-night-build`, `smoke-s1-nb0-*`…`smoke-s1-nb4-*`.
- #93: `membrana-studio-desktop`.
- #133: `db-recording-gate-v07`, `db-recording-gate-r4-scenario-smoke`.

Перед исполнением точный список пересчитать из текущего registry; snapshot не
заменяет актуальное состояние.

## Decision matrix

| Issue | Работа | Вердикт |
|---|---|---|
| closed | done | `archived` |
| closed | not done | `needs-decision`; не архивировать молча |
| open | done | `closed+archived`, только если нет живых active-детей |
| open | not done | `kept-active` |
| unknown | any | `unverified` |

## Строгие ограничения

- Никакой массовой архивации по входному списку.
- Цепочка stage-gate #47 не архивируется без явного подтверждения человека.
- Issue не закрывается, пока на нём остаётся хотя бы одна живая active-задача.
- Недоступность `gh` даёт `unverified`, а не предположение.
- Орфаны и волна 17–18.06 вне scope.
- Наблюдение о root cause зарегистрировать как insight, но не реализовывать hook/audit.
- Изменения `registry.json` публикуются атомарным commit отдельно от прочей работы.

## Definition of Done

- [ ] Пересчитан актуальный набор кандидатов из registry.
- [ ] GitHub state получен один раз на каждую из пяти issue.
- [ ] Для каждой кандидатуры проверены prompt и evidence реализации.
- [ ] Все кандидаты имеют один verdict: `archived`, `closed+archived`,
      `kept-active`, `needs-decision` или `unverified`.
- [ ] #47 не архивирован без human confirmation.
- [ ] Ни одна issue не закрыта при наличии живых active-детей.
- [ ] Создан отчёт `id | issue | issue_state | work_done | verdict | действие` и счётчики.
- [ ] Registry/archive cards/README согласованы.
- [ ] Зарегистрирован insight о причине рассинхрона.
- [ ] Проверки пройдены, commit/push выполнены, Teamlead closure review сохранён.

## Порядок ролей

1. Vesnin: issue/task identity, evidence policy, финальный verdict.
2. Ozhegov: registry invariants и атомарность изменений.
3. Доменные роли подключаются только для неоднозначного work_done.

## Out of scope

- Реализация незавершённых продуктовых задач.
- Новый registry hook или `registry:audit --ghosts`.
- Закрытие орфанов и других волн рассинхрона.
- Автоматическая архивация stage-gate #47.
