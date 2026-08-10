# Промпт: Резолюция node_modules/@membrana/* в чужое дерево — инвентарь и переустановка

> **Task-промпт для агента-разработчика.** Размер: **S**. Lead: dynin (среда/tooling),
> ревью границ: ozhegov. Ожидаемый артефакт: **1 PR** (заметка политики) + починенная среда.
> Реестр: `id` = `fix-node-modules-links-1647` в [`docs/tasks/registry.json`](../tasks/registry.json).

## Проблема одной строкой

`node_modules/@membrana/*` в дереве Membrana-weave резолвятся симлинками в **чужое дерево**
`Membrana-grok` (снимок от 29.07): стволовые изменения нашего дерева невидимы локальным
прогонам, и любой typecheck/test врёт о предмете.

## Вещдоки (10.08)

- [`docs/audit/typecheck-verdict-2026-08-10.md`](../audit/typecheck-verdict-2026-08-10.md) —
  office красный локально при зелёном CI: TS читает
  `…/Membrana-grok/packages/core/dist/index` без контракта #1828.
- [`docs/precedents/2026-08-10-detectors-red-ci-verdict-foreign-tree.md`](../precedents/2026-08-10-detectors-red-ci-verdict-foreign-tree.md) —
  три «красных CI» детекторов; `detector-base` без `sample-window.ts`.
- `@membrana/static-registry-service` в node_modules отсутствует вовсе (пакет моложе 29.07).

## Что сделать

1. **Инвентаризация до починки:** `find node_modules/@membrana -maxdepth 1 -type l | xargs -I{} readlink {}` —
   зафиксировать полный список чужих линков (детекторные — 10+, `core`, `detector-report`, …).
2. **Понять источник:** почему линки смотрят в Membrana-grok (портальные resolutions? ручной линк 29.07?
   `yarn config`/`.yarnrc.yml` проверить). Ответ — в PR, не в голове.
3. **Переустановка:** `yarn install` (при необходимости `--check-files`/чистка) так, чтобы
   `readlink` всех `node_modules/@membrana/*` указывал в **текущее** дерево.
4. **Критерий приёмки:** `yarn turbo run typecheck --filter=@membrana/background-office` локально
   зелёный на текущем HEAD; `yarn turbo run typecheck test --filter=@membrana/harmonic-detector-service`
   локально зелёный (снимает и красноту детекторов).
5. **Политика:** заметка в `docs/CONTRIBUTING.md` — `yarn install` после мерджа ствола,
   принёсшего новые workspace-пакеты; симптом «путь чужого дерева в тексте ошибки TS» = класс #1647.

## Границы

- **Не** трогать контракты `@membrana/core` — контракт #1828 уже в дереве, дыра только в резолюции.
- **Не** создавать/править пакеты — только среда node_modules + одна doc-заметка.
- **Не** сносить чужое дерево Membrana-grok — оно не наш субъект (и там живут worktree-сессии).
