# Архив: Аномалия: задача спринта закрылась сама

| Поле | Значение |
|------|----------|
| **ID** | `issue-979-selfclose` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-23 |
| **Архивирована** | 2026-07-26 |
| **GitHub Issue** | #1004 |
| **Linear** | DRU-368 |
| **Промпт** | [`docs/prompts/FRAME_RAILS_2307_PROMPT.md`](../../docs/prompts/FRAME_RAILS_2307_PROMPT.md) |

## Заметки при закрытии

Forensics #1004: #979 closed 22.07 with PR #986 reg, not DoD; reopened; guard invariant.github.closedWhileActive; precedent 2026-07-26-issue-979-selfclose-premature-github-close.md

## Отчёт о выполнении

**Корень:** GitHub #979 (`frames-alive-ozhegov`) закрыта 2026-07-22T18:18:03Z — через 2 с после merge PR #986 (регистрация карточек). Карточка оставалась `active`, DoD не выполнен. `closedByPullRequestsReferences` пуст — не автозакрытие по `Closes`. Siblings #980/#981 с тем же упоминанием в squash остались OPEN → гипотеза «упоминание номера» **опровергнута**. Вероятнее Linear↔GitHub sync (DRU-352) или ручное закрытие в merge-сессии.

**Действия:** `gh issue reopen 979`; инвариант `invariant.github.closedWhileActive`; прецедент `docs/precedents/2026-07-26-issue-979-selfclose-premature-github-close.md`.

**Рекомендация:** проверить DRU-352 в Linear (не Done, пока спринт не сдан); регистрационные PR — без `--issue` на sprint-issue.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
