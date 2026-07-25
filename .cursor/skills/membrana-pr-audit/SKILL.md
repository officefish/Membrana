---
name: membrana-pr-audit
description: >-
  Массовая ревизия ОТКРЫТЫХ PR: для КАЖДОГО — уже ли его содержание в main
  (перекрыт другим путём), живой ли и валидный (влить), или сломан/устарел
  (закрыть/пересобрать). Параллельные read-only аудиторы → таблица вердиктов
  (merge-ready / close-superseded / close-low-value / needs-work) со
  свидетельством-в-main. Use when user says разобраться с открытыми PR, ревизия
  PR, какие PR влить/закрыть, «мы это уже сделали», PR распухли, аудит PR. Do NOT
  use for ревизии карточек реестра (membrana-tasks-audit), ревью одного PR по
  качеству (membrana-code-review) или закрытия задачи (membrana-task-lifecycle).
---

# Membrana PR audit — разбор открытых PR

Зеркало [`membrana-tasks-audit`](../membrana-tasks-audit/SKILL.md), но по **открытым PR**,
не по карточкам реестра. Прецедент-эталон: аудит 13 PR 2026-07-24 (#1166 spawn) — 6 закрыто
как superseded, 3 влито, 2 закрыто малоценными, 2 пересобрано чистым PR.

Инструменты: `gh pr list/view/diff/close/merge`, `git show origin/main:<path>`,
[`yarn pr:verify`](../../../scripts/pr-verify.mjs) (ассерт мерджа состоянием),
[`yarn pr:recreate`](../../../scripts/pr-recreate.mjs) (пересборка устаревшей ветки).

## Неподвижные правила

- **«PR уже сделан / перекрыт» — гипотеза, не вердикт.** Close только после проверки, что
  контент реально в `origin/main`: файл/скилл/запись присутствует (`git show origin/main:<path>`,
  `git cat-file -e`), ИЛИ перекрыт более свежим PR, ИЛИ развёрнут стратегией. Прецедент 24.07:
  #575/#574 перекрыты коммитом #579; но #517/#894 несли **непокрытый** живой контент — не закрывать.
- **Никакой пакетной операции по механическому признаку.** Каждый PR — индивидуальный
  `gh pr close --comment` со свидетельством (SHA/путь/новее-PR/red-чек), либо индивидуальный мердж.
- **Close/merge — наружу и по слову владельца.** Аудитор выдаёт таблицу вердиктов; закрытие и
  мердж 11 PR — необратимо, только по явному «да» (можно группами: «первую группу закрыть, вторую влить»).
- **Устаревшую ветку (сотни коммитов позади) НЕ ребейзить** — force-push закрыт политикой.
  Ценный контент → `yarn pr:recreate <N>` (пересборка от свежего main); малоценный/датированный → close.
- **Факт мерджа — состоянием, не exit-кодом.** После каждого мерджа — `yarn pr:verify <N> [--file <path>]`
  (`MERGED ∧ mergeCommit ∧ файл-в-main`); `pr:ship … | tail` маскирует код.

## Вердикт-категории

| Вердикт | Когда | Действие |
|---------|-------|----------|
| **merge-ready** | не в main, mergeable, CI зелёный | влить (`gh pr merge --squash` / `pr:ship --merge-only`) → `pr:verify` |
| **close-superseded** | контент уже в main другим путём (коммит/новее-PR/разворот) | `gh pr close --comment <свидетельство>` |
| **close-low-value** | датированный/спекулятивный отчёт, ценность ~0 | close с причиной (лучше пробел, чем шум) |
| **needs-work** | непокрытый живой контент, но CONFLICTING / red / устаревшая ветка | `pr:recreate` (пересобрать) либо resolve+rebase-in-place (если свежая) |

## Workflow

1. **Свежесть**: `git fetch origin main`. `gh pr list --state open --json number,title`.
2. **Разбить на группы** (по типу: night-triage/hunt · content/docs · skills · fixes) и запустить
   **параллельных read-only аудиторов** (Agent tool, по образцу 24.07 — 4 агента на 13 PR). Каждому:
   подмножество PR + задание вернуть **на КАЖДЫЙ** таблицу: `PR | что это (файлы) | перекрыто? (да/нет + где в main) | ВЕРДИКТ | одно-строчное свидетельство`.
3. **Свести** вердикты аудиторов в один список; проверить спорные глазами (не доверять «green» — CI мог быть транзиентным; проверять `mergeable`/`statusCheckRollup`).
4. **Вынести владельцу** таблицу + предложение пакетом (что закрыть / что влить / что пересобрать).
   Дождаться слова — close/merge наружу.
5. **По слову**: close superseded (индивидуальные comment-свидетельства) · merge live (→ `pr:verify` каждый) ·
   needs-work → `pr:recreate` → ревью → ship → закрыть старый как superseded.

## Ловушки (из прецедента 24.07)

- **CI-green ≠ merge-ready**: `mergeable` мог стать CONFLICTING **во время** ci-wait (сосед влил); merge-шаг упадёт. Проверять `mergeable` перед мерджем, не только checks.
- **Ветка от squash-merged ветки → CONFLICTING** (контент задвоился): новую брать от `origin/main`.
- **pre-push env-флейк** (`vite 127` на markdown-правке внутри пакета) — см. AGENTS §Agent tooling.
- Night-triage/hunt Draft — обычно **артефакты** (старые перекрываются свежим прогоном), не фичи.

## НЕ использовать

- Ревизия карточек реестра задач → `membrana-tasks-audit`.
- Ревью одного PR по качеству кода → `membrana-code-review`.
- Ветки (не PR) → `membrana-branch-audit` / `membrana-branch-decompose`.
