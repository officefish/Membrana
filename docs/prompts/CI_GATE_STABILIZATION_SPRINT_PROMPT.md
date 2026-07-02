# Sprint: CI-gate stabilization & flaky hardening

**Epic id:** `ci-gate-stabilization`
**Основание:** консилиум `docs/seanses/ci-gate-friction-consilium-2026-07-02.md`
**Триггер:** прод-деплой cabinet-фикса заблокировался, т.к. CI-gate требует зелёный CI всего монорепо, а упал несвязанный флейки `@membrana/rag-service` (`retrieveContext`, timeout 5000ms), ~7 мин ретрая.

## Вердикт консилиума

Prod-гейты DR5 (main деплоируемый, deploy из зелёного main) правильные, не отменяем. Scoped-gate по пакетам отложен до недели flaky-метрик.

## Поправка (адаптация под стек)

Консилиум дрейфанул: `jest.config` — репо на vitest; источник флейки не «device-board e2e», а `@membrana/rag-service` retrieveContext timeout. Фазы скорректированы.

## CG1 — стабилизация флейки (немедленно)

Lead Dynin+Kuryokhin, S. rag-service retrieveContext timeout 5000ms: диагностировать гонку vs жёсткий таймаут; fix (timeout/подписка/изоляция); прогнать N раз, подтвердить не-флейки.

## CG2 — двухуровневый test gate (vitest)

Lead Ozhegov, M. smoke (обязательный hard-блокер, быстрый) + full (опциональный перед релизом) через vitest projects/теги, не jest. smoke < ~2 мин.

## CG3 — flaky-метрики (неделя)

Lead Dynin, S. Логирование test-run-id/attempt/seed/duration; сбор за 7 прогонов main → docs/ci-metrics/flaky-report-<дата>.md.

## CG4 — документация

Lead Ozhegov+Rodchenko, S. CONTRIBUTING § CI & Testing: таблица smoke vs full.

## Deferred (день 7)

Scoped CI-gate деплоя / package-level gate'ы — только если flaky > 10% после CG1 (≤5% статус-кво; 5–10% дофиксить). Path-filter docs-only — малый приоритет.

## Кандидат (обнаружено 2026-07-02, спринт db-capture-tariff-v2)

**Stacked PR без CI-checks → closure review не набирает evidence.** `ci.yml` `pull_request.branches` покрывает только `[main, develop, vesnin, …]`; PR с base = feature-ветка (stacked, PR #227) не получает checks, а T1+ ревью требует ≥2 pass на SHA. Локальный `--check` недоступен по построению (untracked манифест ревью → worktree грязный). Workaround: ручной `workflow_dispatch` scheduled-ci на ветку. Фикс: добавить `feat/**` в `pull_request.branches` ci.yml (concurrency per-PR уже есть — лишних прогонов не будет). Размер XS, кандидат в CG2 или отдельным PR.

## Out of scope

Отмена DR5-гейтов; версионирование пакетов (отдельный консилиум).
