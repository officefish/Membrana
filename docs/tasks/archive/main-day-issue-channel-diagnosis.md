# Архив: Диагноз канала ritual-main-day-issue: звено называется, полый артефакт не пишется

| Поле | Значение |
|------|----------|
| **ID** | `main-day-issue-channel-diagnosis` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-26 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #1239 |
| **Linear** | DRU-472 |
| **Промпт** | [`docs/prompts/MAIN_DAY_ISSUE_CHANNEL_DIAGNOSIS_PROMPT.md`](../../prompts/MAIN_DAY_ISSUE_CHANNEL_DIAGNOSIS_PROMPT.md) |

## Заметки при закрытии

implemented in this workspace by restoring missing #1275 code path; evidence: commit 4abec180 exists in history but is not ancestor of current HEAD; scripts/_main-day-issue.mjs now logs ritual-main-day-issue attempts via onAttempt, writes provider/model/source/generations provenance into MAIN_DAY_ISSUE header, refuses skeleton failure without writing file, saves raw failed response only under OS temp; scripts/main-day-issue-channel.test.mjs added and package.json test:scripts registers it; node --test scripts/main-day-issue-channel.test.mjs scripts/branch-grammar.test.mjs = 17/17; code-review artifact docs/tasks/archive/main-day-issue-channel-diagnosis-code-review.md = LGTM; Linear live media snapshot 2026-07-29T15:36:48.212Z pullOk=true recordCount=299 found DRU-472 state=Done stateType=completed githubIssueRefs=[1239] completedAt=2026-07-26T15:30:16.794Z; registry linearId repaired to DRU-472

## Отчёт о выполнении

Эта карточка не была stale в текущем HEAD: исправление существовало в истории как
`4abec180 fix(ritual): канал центральной задачи называет себя... (#1275)`, но
`git merge-base --is-ancestor 4abec180 HEAD` вернул `no`. Поэтому недостающий путь
восстановлен в этом workspace без cherry-pick побочных registry-правок.

**Что сделано в коде.**

- `scripts/_main-day-issue.mjs` логирует каждую попытку `ritual-main-day-issue`
  через `onAttempt`, называя provider/model и номер попытки.
- В шапку `MAIN_DAY_ISSUE.md` добавлен машиночитаемый провенанс LLM-звена:
  `provider`, `model`, `source`, `generations`.
- При провале скелетного гейта файл `MAIN_DAY_ISSUE.md` не пишется; отказ называет
  звено, потерянные слоты и путь к сырому ответу.
- Сырой ответ сохраняется только во временный каталог ОС, не в репозиторий.
- Добавлен `scripts/main-day-issue-channel.test.mjs`; `package.json`
  `test:scripts` теперь включает этот файл.

**Проверки и review.**

- `node --test scripts/main-day-issue-channel.test.mjs scripts/branch-grammar.test.mjs`
  → 17/17 pass.
- `docs/tasks/archive/main-day-issue-channel-diagnosis-code-review.md` →
  штатный code-review, вердикт LGTM; условие review (тестовый файл существует и
  зелёный) выполнено.

**Linear.**

Live snapshot через media:

- `format=linear-snapshot@1`, `producedBy=media-NL`;
- `pullOk=true`;
- `capturedAt=2026-07-29T15:36:48.212Z`;
- `recordCount=299`;
- найден `DRU-472`: `state=Done`, `stateType=completed`,
  `githubIssueRefs=[1239]`, `completedAt=2026-07-26T15:30:16.794Z`.

`linearId` в реестре исправлен на `DRU-472` перед архивом.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
