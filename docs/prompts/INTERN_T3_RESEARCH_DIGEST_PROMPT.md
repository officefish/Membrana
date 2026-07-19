# Промпт: Intern T3 — ресёрч-дайджест (утренняя пресса)

> **Task-промпт.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **S**. Артефакт: **1 PR**. Спека: [`docs/intern/INTERN_ONBOARDING_BACKGROUND_OFFICE.md`](../intern/INTERN_ONBOARDING_BACKGROUND_OFFICE.md) §3.3.
> Реестр: `id` = `intern-t3-research-digest`. **GitHub Issue:** [#197](https://github.com/officefish/Membrana/issues/197).

---

## Решения постановщика (Issue TODO)

| Параметр | Значение (можно сменить куратору) |
|----------|-----------------------------------|
| yarn-команда | `yarn office:research-digest` |
| Тема по умолчанию | `acoustic detection of small UAVs / drones` (override: `OFFICE_DIGEST_TOPIC`) |

---

## Промпт целиком

### Что построить

1. CLI `yarn office:research-digest [--dry-run] [--date YYYY-MM-DD] [--force]`:
   - Perplexity Sonar (`PERPLEXITY_API_KEY`, proxy как в `insight-ritual`);
   - артефакт `docs/research/digest-YYYY-MM-DD.md`;
   - ≤7 пунктов, у каждого источник+дата; секретарский регистр (без «стоит попробовать»);
   - идемпотентность: существующий файл → skip (exit 0), `--force` перезаписывает;
   - `--dry-run` печатает markdown без записи.
2. Тема: `OFFICE_DIGEST_TOPIC` или дефолт выше.
3. Unit-тесты: путь файла, skip-if-exists, парсинг/сборка markdown без сети.
4. `PERPLEXITY_API_KEY` в `packages/background-office/.env.example`.

### Out of scope

Расписание, OpenRouter, запись в Linear/GitHub, action-пункты.

### DoD

- [ ] DoD Issue #197. `Closes #197`.
