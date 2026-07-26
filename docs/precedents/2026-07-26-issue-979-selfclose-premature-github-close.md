<!-- precedent-meta
{
  "id": "2026-07-26-issue-979-selfclose-premature-github-close",
  "date": "2026-07-26",
  "class": "task-lifecycle",
  "symptom": "GitHub Issue #979 (frames-alive-ozhegov) CLOSED при active-карточке и невыполненном DoD спринта",
  "rootCause": "Закрытие в ту же секунду, что merge PR #986 (регистрация карточек); не task:close-github (карточка active), не Closes #979 (siblings #980/#981 остались OPEN). Упоминание (#979) в squash не закрывает — refuted. Вероятнее Linear↔GitHub sync или ручное закрытие при merge-сессии.",
  "fix": "gh issue reopen 979; инвариант invariant.github.closedWhileActive в task-invariants; карточка issue-979-selfclose archived",
  "canonicalCause": "Issue закрыта без task:archive и без DoD — active-карточка и GitHub расходятся",
  "prevention": "task:invariants ловит active+closed GitHub; Closes только из PR с DoD; регистрационные PR — --allow-mention / без номеров sprint-issue в title",
  "actionItems": [
    {"text": "Проверить DRU-352 в Linear — не Done, если спринт не начат", "owner": "vesnin", "status": "open"}
  ],
  "related": ["2026-07-23-oneshot-issue-closed-without-procedure", "2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-honest-linear-sprint-foundation"]
}
-->

# Прецедент 2026-07-26: Issue #979 закрылась при active-карточке (issue-979-selfclose)

## Что случилось

Карточка `frames-alive-ozhegov` (`status: active`, `githubIssue: 979`, `linearId: DRU-352`) — спринт «Оживление фреймов / Ожегов» **не начинался**. GitHub Issue **#979** оказалась **CLOSED** (2026-07-22T18:18:03Z, `stateReason: COMPLETED`).

Расследование заведено карточкой `issue-979-selfclose` → Issue **#1004**.

## Вещдоки (forensics)

| Факт | Значение |
|------|----------|
| Закрыта | 2026-07-22T18:18:03Z, actor `officefish` |
| Merge PR [#986](https://github.com/officefish/Membrana/pull/986) | 2026-07-22T18:18:00Z — регистрация карточек спринта, **не DoD** |
| `closedByPullRequestsReferences` | **пусто** — GitHub не считает закрытие автопо PR |
| Timeline #979 | `referenced` commit 74715bb4 (+1s), `closed` (+2s) |
| Siblings #980, #981 | **OPEN** — в squash те же `(#979/#980/#981)` |
| `task:close-github` | **не причина** — закрывает только `status=archived` |
| Registry `frames-alive-ozhegov` | `active`, `githubIssueClosedAt: null` |

## Корень (вердикт)

**Преждевременное закрытие Issue без архивации карточки.**

Гипотеза «упоминание #979 в сообщении merge закрыло issue» — **опровергнута**: #980/#981 упомянуты так же и остались OPEN; GitHub закрывает только по `Closes`/`Fixes`/`Resolves`, не по `(#N)`.

Наиболее правдоподобно:

1. **Linear↔GitHub зеркало** — Done на DRU-352 синхронизировал закрытие только #979 (per-ticket), в merge-сессии 22.07; или
2. **Ручное** `gh issue close` / UI сразу после merge регистрации.

Класс совпадает с прецедентом [#1022 closed without procedure](./2026-07-23-oneshot-issue-closed-without-procedure.md): зелёный/закрытый статус Issue ≠ сданный продукт.

## Фикс

1. **`gh issue reopen 979`** — карточка active, DoD не выполнен.
2. **Инвариант** `invariant.github.closedWhileActive` (`scripts/lib/task-invariants.mjs`) — WARNING при `active` + GitHub CLOSED.
3. Архив карточки расследования `issue-979-selfclose`.

## Профилактика

- Регистрационные PR (`chore(tasks): …`) — **не** ставить `--issue` на sprint-issue; при упоминании номеров в title — `pr:ship --allow-mention`.
- Перед merge спринтовых chore — `yarn task:invariants` / dry-run audit: active + closed GitHub = жёлтый флаг.
- Linear: не переводить DRU-352/353/354 в Done до `task:archive` фазы.

## Ссылки

- Issue расследования: [#1004](https://github.com/officefish/Membrana/issues/1004)
- Затронутая задача: [#979](https://github.com/officefish/Membrana/issues/979) · карточка `frames-alive-ozhegov`
- PR регистрации: [#986](https://github.com/officefish/Membrana/pull/986)
- Норма зеркала: [#984](https://github.com/officefish/Membrana/issues/984)
