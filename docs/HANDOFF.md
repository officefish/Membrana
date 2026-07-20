# HANDOFF → 2026-07-20 (вечер) · **старт спринта `worktree-hygiene-order`**

**Центральная задача новой сессии: запустить спринт `worktree-hygiene-order`** — навести
порядок в ветках/деревьях под 4 агентами. Все решения уже приняты и **влиты в main**;
следующая сессия — чистое исполнение по промпту, без нового консилиума.

## Что уже сделано (НЕ переделывать)

Полная цепочка выработки решения замкнута и **на main** (PR #726 смёржен, `39ed48d8`):

- **Инсайт** `insight-tier2-worktree-topology` — 5 канонических деревьев.
- **Консилиум** `tier2-git-hygiene-multi-agent-2026-07-20` — ратифицировал ядро гигиены.
- **Заседание** `worktree-hygiene-gaps`: M0 (порядок K2→K1, ратифицирован владельцем),
  M1 (K2 — lifecycle/teardown). K1 (синхрон базы) — через **ADR-0014 (ACCEPTED)**,
  т.к. комната M2 4× уронила секцию посылок (S-M2), содержание стабильно.
- **Спринт заведён в новом движке** (не в `registry.json`): GitHub **#717** ⟺ Linear
  **DRU-234** (биекция; дубль DRU-235 отменён). Промпт: `docs/prompts/WORKTREE_HYGIENE_ORDER_PROMPT.md`.

## Что делать (по промпту, 5 пунктов = один спринт)

Ответственный: **Ozhegov**; `classifyWorktree` — **Dynin**; отчёт/баннер — **Rodchenko**.
Работать **в своём worktree** (по канону, что спринт и вводит), ветка от свежего `main`.

1. **Разовая чистка** деревьев (сейчас ~35 → 5 канонических `main/tooling/product/codex/cursor`).
   Первый шаг: `yarn repo:clean --dry-run` → **показать владельцу список под снос** →
   чистка `--execute --worktrees` по слову (истина = состояние PR, деструктивно).
2. **Карточки + gc**: `WORKTREE.md` (kind canon|sprint, база, владелец, gc/install) +
   `.worktree-owner`; `git config gc.auto 0` + строка в `CONTRIBUTING.md`.
3. **Teardown-предикат (K2)**: чистая `classifyWorktree(w)` (`canon`/`sprint-closed`/
   `sprint-open`/`unregistered`, сеть→`unknown`) + юнит-тесты; `repo:clean` и merge-гейт —
   потребители; гейт «нет хвостов» = `repo:clean --dry-run` шагом `ritual:day`.
4. **Синхрон базы (K1, ADR-0014)**: `worktree-sync-check` (чистая ф-ция после fetch:
   `fresh/ff-able/diverged/dirty`) + `yarn worktree:sync` (авто только `--ff-only`,
   расхождение → сигнал), шаг `ritual:day`; список деревьев из носителя п.3, `main` исключён.
5. **Единый словарь классов** — свести таксономию п.3 (`canon/sprint-*`) и п.4
   (`fresh/ff-able/…`) в один непротиворечивый словарь (P2 ревью).

## Опоры (грунтовка кодом)

- Промпт: `docs/prompts/WORKTREE_HYGIENE_ORDER_PROMPT.md` (полный DoD и ограничения).
- ADR: `docs/adr/ADR-0014-worktree-base-branch-sync.md` (ACCEPTED, Р1–Р5).
- Заседание: `docs/meeting/worktree-hygiene-gaps/MEETING_ACTIVE.md` + протоколы M0/M1 в `docs/seanses/`.
- Уже есть в коде: `repo:clean` (#492, teardown), `branch:check-base` (свежесть),
  `worktree:bootstrap` (#711). Их НЕ зовёт ни ритуал, ни хук — это и подключает спринт.

## Границы и предупреждения

- Только `scripts/` + docs + git-config; `packages/*` не трогать. Новый core-контракт → эскалация в консилиум.
- `repo:clean --execute --worktrees` деструктивно — сначала dry-run, показать владельцу.
- **Новый движок задач**: GitHub↔Linear-синхрон авто-создаёт Linear-issue при заведении
  GitHub-issue — второй руками плодит дубль (урок DRU-235). Регистрация задачи ≠ `registry.json`.
- main очень активен (ritual-refactor спринт) — мерджить в тихом окне: догнать до 0-позади
  (`git merge origin/main`, union-драйвер сам сольёт `registry.json`) → `pr:ship --merge-only`.

## Хвост этой сессии

- Локальная ветка `truth/session-crystallization-19-07` осталась (remote удалён при мердже) —
  её уберёт `repo:clean` первого шага спринта (иронично уместно).
