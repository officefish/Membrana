# Промпт (эпик): Code review debt closeout — Jun 2026

> **Стратегический task-промпт (эпик)** — Cursor IDE / Claude.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **L** (фазы D0–D6).
> Ветка: **`techies68`** (после `git merge origin/main` — на `main` уже PR #124/#125).
> Реестр: `id` = **`code-review-debt-closeout-jun2026`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Вечерние code review **2026-06-14** (MP4), **2026-06-18** (device-board runtime), **2026-06-19** (device-board MVP + Mintlify Phase 0) и утренний стендап **2026-06-20** зафиксировали **технический долг и архитектурные риски**, не закрытые продуктовыми эпиками дня (JE1–JE5, trends promotion, zero-shot TZ).

**Цель эпика:** довести до зелёного CI и документированного LGTM все пункты из таблицы рисков review, **не добавляя новых фич**.

**Уже закрыто (не дублировать):**

| PR / commit | Что снято с долга |
|-------------|-------------------|
| [#87](https://github.com/officefish/Membrana/pull/87) `turbo-build-green-apps` | Честный typecheck apps, cabinet references, ~35 TS client |
| [#124](https://github.com/officefish/Membrana/pull/124) device-board MVP | Catalog, streaming host, hooks в `board-flow-node`, CI docs verify |
| [#125](https://github.com/officefish/Membrana/pull/125) evening hygiene | `.gitignore` deploy/recover logs, `scripts/docs-dev.mjs` Node guard |

**Связанные документы (обязательно прочитать перед кодом):**

| Документ | Зачем |
|----------|--------|
| [`DAILY_CODE_REVIEW.md`](../DAILY_CODE_REVIEW.md) | Актуальный snapshot рисков MP4 (lint, registry, граф) |
| [`archive/daily-code-review/DAILY_CODE_REVIEW-2026-06-19T18-24-23-740Z.md`](../archive/daily-code-review/DAILY_CODE_REVIEW-2026-06-19T18-24-23-740Z.md) | Device-board boundaries, trends OOM, gitignore |
| [`DAILY_STANDUP.md`](../DAILY_STANDUP.md) (2026-06-20) | Синтез: MP4 urgent + infra |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | MembranaRegistry, границы пакетов, Web Audio |
| [`SERVICES.md`](../SERVICES.md) | cabinet ↔ background-media через HTTP |
| [`DESIGN.md`](../DESIGN.md) | WaveformPlayer, таблица sample-library |
| [`DEPLOY_PIPELINE_REFACTOR_EPIC_PROMPT.md`](./DEPLOY_PIPELINE_REFACTOR_EPIC_PROMPT.md) | **Out of scope** — детерминизм деплоя (#94), отдельный эпик |

**GitHub Issue:** [#126](https://github.com/officefish/Membrana/issues/126) — Close code-review tech debt (Jun 2026).

---

## Матрица рисков → фазы

| # | Источник review | Риск | Приоритет | Фаза | Статус на старт |
|---|-----------------|------|-----------|------|-----------------|
| R1 | MP4 / standup | `cabinet` импортирует `background-media` напрямую вместо HTTP | 🔴 | D1 | TBD |
| R2 | MP4 / standup | `MembraneRegistry` не готов до первого `quotaService.get()` | 🔴 | D1 | TBD |
| R3 | MP4 / standup | `@membrana/client#lint` exit 1 | 🔴 | D2 | TBD |
| R4 | 2026-06-19 | `trends-detector-service#test` error 134 (OOM) | 🔴 | D3 | TBD |
| R5 | MP4 / standup | `audio-engine` / `fft-analyzer` — WARNING / `passWithNoTests` | 🟡 | D3 | TBD |
| R6 | 2026-06-19 | `device-board` coverage: ноды, порты, переменные, сценарии | 🟡 | D3 | TBD |
| R7 | MP4 | `WaveformPlayer` a11y (aria, Escape, высота строки ≤48px) | 🟡 | D4 | TBD |
| R8 | 2026-06-19 | Обратные импорты `packages/services/*` → `device-board` | 🔴 | D1 | TBD |
| R9 | 2026-06-19 | Web Audio напрямую в UI device-board | 🔴 | D1 | TBD |
| R10 | 2026-06-19 | Служебные файлы в корне / `.claude` `.continue` | 🟡 | D5 | Частично (#125) |
| R11 | MP4 | Docker image cabinet >50 МБ после расширения context | 🟢 | D5 | TBD |
| R12 | 2026-06-19 | Mintlify UI examples vs DESIGN.md | 🟢 | D5 | Phase 0 only |

---

## Промпт целиком (для вставки агенту)

> Ты — координатор виртуальной команды Membrana под руководством **Vesnin**. Закрой технический долг из code review (Jun 2026) **без новых продуктовых фич**.
>
> **Перед кодом:** `git merge origin/main` на рабочей ветке; `yarn turbo run lint typecheck test build --continue` — зафиксировать baseline (фаза D0).
>
> **Цель:** все строки матрицы R1–R12 либо ✅, либо явно deferred с Issue + LGTM Vesnin.
>
> **Запрещено:** JE1–JE5 telemetry, trends promotion, ensemble/zero-shot scaffold, device-board v0.4 (#95), deploy-pipeline (#94), новые детекторы; `any` без обоснования; прямой Web Audio в UI; ослабление `strict`.
>
> **Фазы (строго по зависимостям):**
> 1. **D0** — baseline audit + таблица «риск → факт» в Issue.
> 2. **D1** — граф пакетов + MembraneRegistry + device-board boundaries.
> 3. **D2** — lint/hooks green (`client`, `device-board`).
> 4. **D3** — test health (trends OOM, passWithNoTests, device-board coverage).
> 5. **D4** — MP4 WaveformPlayer a11y.
> 6. **D5** — hygiene guardrails + docker size note.
> 7. **D6** — full CI green, PR → `main`, `yarn task:archive code-review-debt-closeout-jun2026`.

---

## Распределение по виртуальной команде

| Фаза | ID | Ответственный | Поддержка | Артефакт |
|------|-----|---------------|-----------|----------|
| **D0** | `crdc-d0-baseline-audit` | **Vesnin** | Ozhegov — turbo log | Issue comment: baseline matrix |
| **D1** | `crdc-d1-boundaries-registry` | **Ozhegov** | Vesnin — registry policy | grep/check-deps report; fix imports; init order test |
| **D2** | `crdc-d2-lint-hooks-green` | **Rodchenko** | Ozhegov — ESLint config | `yarn workspace @membrana/client lint` = 0 errors |
| **D3** | `crdc-d3-test-health` | **Dynin** | Музыкант — smoke | trends vitest heap fix; real tests in audio-engine/fft; device-board ≥80% critical paths |
| **D4** | `crdc-d4-waveform-a11y` | **Rodchenko** | — | aria-label, role, Escape, row height, axe |
| **D5** | `crdc-d5-hygiene-guardrails` | **Ozhegov** | Vesnin — deploy policy | `.gitignore` local tools; docker size doc; CONTRIBUTING note |
| **D6** | `crdc-d6-ci-green-archive` | **Vesnin** | все роли | PR, archive, Issue close |

**Порядок ролей:** Vesnin (D0, D6) → Ozhegov (D1, D5) → Dynin (D3) → Rodchenko (D2, D4) → Музыкант (browser smoke D6, не блокер CI).

---

## Архитектурный контракт

| Слой | Путь | Правило |
|------|------|---------|
| Cabinet ↔ media | `apps/cabinet` | Только HTTP (`/v1/*`) + `@membrana/media-library` client SDK; **нет** импорта из `packages/background-media` |
| Registry | `apps/client/src/modules/registerClientModules.ts` | `MembranaRegistry.finalizeRegistration()` до любого quota/tariff fetch |
| Device-board | `packages/device-board` | Зависит только от `@membrana/core`; сервисы **не** импортируют device-board |
| Web Audio | UI / plugins | Только через `@membrana/audio-engine-service` |
| Tests | `packages/services/*` | Минимум один meaningful test; `passWithNoTests` — только с LGTM + TODO Issue |
| Repo hygiene | repo root | Нет `deploy-*.txt`, `cabinet-recover*.txt`; local AI dirs в `.gitignore` |

**Запрещено:**

- Циклы `cabinet` ↔ `background-cabinet` ↔ `tariff-dataset`.
- `new AudioContext()` / `getUserMedia` в `device-board` components.
- Коммит deploy-логов в корень (см. `CONTRIBUTING.md`).

---

## Фазы и DoD

### D0 — Baseline audit (S) — Vesnin

- [ ] `git merge origin/main` на `techies68` (или работа от актуального `main`).
- [ ] `yarn turbo run lint typecheck test build --continue 2>&1 | tee docs/archive/crdc-baseline-YYYY-MM-DD.log` (или комментарий в Issue).
- [ ] Таблица R1–R12 заполнена фактическим статусом (pass/fail/deferred).
- [ ] Зафиксировано: какие пункты уже закрыты PR #87/#124/#125.

### D1 — Boundaries + MembraneRegistry (M) — Ozhegov

- [ ] `rg "from ['\"]@membrana/background-media|from ['\"].*background-media"` в `apps/cabinet` — 0 прямых server imports.
- [ ] `grep -r "from.*device-board" packages/services/` — 0 обратных зависимостей.
- [ ] `rg "AudioContext|getUserMedia|createAnalyser" packages/device-board/src` — 0 (или только re-export docs).
- [ ] Порядок init: unit или integration test — quota fetch **после** `finalizeRegistration`.
- [ ] Опционально: `scripts/check-package-boundaries.mjs` или расширение существующего `check-deps` — в DoD D6 если быстро.

### D2 — Lint & React hooks (M) — Rodchenko + Ozhegov

- [ ] `yarn workspace @membrana/client lint` — exit 0.
- [ ] `yarn workspace @membrana/device-board lint` — exit 0 (exhaustive-deps в shell/flow nodes).
- [ ] Нет новых `eslint-disable` без комментария «почему».

### D3 — Test health (M) — Dynin

- [ ] `yarn workspace @membrana/trends-detector-service test` — exit 0 (fix OOM: smaller fixtures, `--pool=forks`, `NODE_OPTIONS=--max-old-space-size` только с обоснованием в README).
- [ ] `audio-engine-service`, `fft-analyzer-service`: либо ≥1 unit test, либо Issue + явный `passWithNoTests` с дедлайном.
- [ ] `device-board`: tests на `event-node`, `validate-pre-run`, `serialize-scenario`, graph builders — coverage критических путей (не cosmetic 100%).

### D4 — WaveformPlayer a11y (S) — Rodchenko

- [ ] `aria-label` + `role="region"` на inline player в таблице sample-library.
- [ ] `Escape` останавливает playback без trap focus.
- [ ] Высота строки таблицы ≤48px (DESIGN.md) — visual check.
- [ ] axe / lighthouse a11y — без critical на странице каталога.

### D5 — Hygiene & guardrails (S) — Ozhegov

- [ ] `.gitignore`: `.claude/`, `.continue/` (local AI tooling на techies68).
- [ ] Verify #125 patterns still in `.gitignore`; CONTRIBUTING deploy-log rule present.
- [ ] `docker image inspect` cabinet — размер задокументирован в `docs/deploy/` или Issue (threshold 50 МБ — warn, не блокер).
- [ ] Mintlify: `yarn docs:verify` green; UI screenshots — defer full parity unless trivial.

### D6 — CI green + archive (S) — Vesnin

- [ ] `yarn turbo run lint typecheck test build --continue` — green на PR branch.
- [ ] PR → `main`, `Closes #<issue>`.
- [ ] `yarn task:archive code-review-debt-closeout-jun2026 --notes "PR #…"`.
- [ ] Обновить `DAILY_CODE_REVIEW.md` вечером — риски R1–R12 сняты или перенесены.

---

## Out of scope

- **Телеметрия JE1–JE5** — эпик `telemetry-journal-event-driven`.
- **Детекция / stage-gate** — trends promotion, ensemble, zero-shot, VDR (MAIN_DAY / STRATEGIC_PLAN).
- **Device-Board v0.4** (#95) — продуктовый refactor, не debt closeout.
- **Deploy pipeline refactor** (#94) — отдельный промпт `DEPLOY_PIPELINE_REFACTOR_EPIC_PROMPT.md`.
- **Mintlify preview на background-office** — инфра-фича, не блокер debt.
- **MP7 Node Realtime Gateway** — продуктовый эпик.

---

## Ожидаемые PR

| PR | Фаза | Пакеты |
|----|------|--------|
| 1 | D1 | `apps/client`, `apps/cabinet`, `packages/agenda`, scripts |
| 2 | D2–D3 | `apps/client`, `packages/device-board`, `packages/services/trends-detector`, `audio-engine`, `fft-analyzer` |
| 3 | D4–D5 | `apps/cabinet`, `.gitignore`, docs |
| 4 (optional squash) | D6 | merge + registry archive |

Допустимо **2 PR** (D1+D5 infra, D2–D4 quality) при LGTM Vesnin.

---

## Definition of Done (эпик)

- [ ] Матрица R1–R12: все 🔴 закрыты; 🟡 — закрыты или deferred с Issue.
- [ ] `yarn turbo run lint typecheck test build --continue` — green на `main`.
- [ ] MembraneRegistry + cabinet/media boundaries — проверены кодом и grep.
- [ ] trends-detector test стабилен в CI (3 прогона подряд).
- [ ] WaveformPlayer a11y — axe без critical.
- [ ] Реестр: `code-review-debt-closeout-jun2026` → `archived`.
- [ ] LGTM Teamlead.

---

## Формат ответа координатора (планирование)

```text
[Teamlead]: Baseline D0, merge main, финальный LGTM D6.
[Структурщик]: D1 граф + registry; D5 gitignore/docker doc.
[Математик]: D3 trends OOM + passWithNoTests policy.
[Музыкант]: Browser smoke WaveformPlayer + device-board (D6).
[Верстальщик]: D2 lint client; D4 WaveformPlayer a11y.

Итоговый артефакт: 2–4 PR, Issue закрыт, registry archived.
Definition of Done: см. выше.
```

---

## Заметки для постановщика

1. Создать GitHub Issue `imperfection` со ссылкой на этот файл.
2. Запись в `docs/tasks/registry.json` (`status: active`) + фазы `crdc-d0`…`crdc-d6`.
3. **Не** ставить в `MAIN_DAY_ISSUE` — параллельный debt-track; брать слоты между продуктовыми задачами или Night Build.
4. После merge: `yarn task:archive code-review-debt-closeout-jun2026`.

### Проверка после PR

```bash
yarn turbo run lint typecheck test build --continue
yarn workspace @membrana/client lint
yarn workspace @membrana/trends-detector-service test
rg "background-media" apps/cabinet/src --glob "*.ts" --glob "*.tsx"
grep -r "from.*device-board" packages/services/ || true
```

---

## Связь с дорожной картой

- Разблокирует **безопасный merge** MP4-хвостов и device-board на `main` без скрытых регрессий CI.
- Не меняет stage-gate детекции; готовит чистую базу для MP7 (#92) и Device-Board v0.4 (#95).
