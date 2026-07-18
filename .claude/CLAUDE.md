# Membrana — Claude Code

Read first: [`AGENTS.md`](../AGENTS.md), [`.cursorrules`](../.cursorrules).

**Project agent skills (canonical):** [`.cursor/skills/README.md`](../.cursor/skills/README.md)

Claude Code skills in `.claude/skills/` are **thin mirrors** — follow the linked `.cursor/skills/*/SKILL.md` for full playbooks.

## Daily rhythm

- Morning: `yarn ritual:day` — see `membrana-developer-rhythm`
- Evening: `yarn ritual:evening` — archive day before code-review
- Task close: `yarn task:archive <id>` then evening `yarn task:close-github`

## Mandatory end-of-session: Team Evening Feedback

**`membrana-team-evening-feedback` is a process obligation, not an option.**

After `yarn ritual:evening` completes (or when the user signals end of day — "уходим на
вечерний ритуал", "до завтра", "closing the day"), Claude Code MUST run:

```bash
yarn team-evening-feedback
```

Rules:
- Run even if `code-review` step failed — feedback is independent.
- If `ANTHROPIC_API_KEY` is unavailable, run `yarn team-evening-feedback:dry` and show
  the context to the user instead.
- Commit `docs/seanses/team-evening-feedback-<date>.md` after a successful run.
- Do not skip silently — if blocked, tell the user explicitly and offer `--dry` fallback.

## Mandatory: Partner swallow (ласточка) — утром И вечером, РУКАМИ

**Партнёрский отчёт — обязательство, но отправка ручная и только через линзу.**
Дважды в день в приватную группу союзников уходит выжимка: утром план, вечером итоги.

**Автоотправка из ритуала снята (18.07).** Причина: `telegram-ritual-digest.mjs`
детерминированно склеивает текст из артефакта, линзы Ожегова в нём нет — жаргон
наследуется как есть. Вечером 18.07 партнёрам ушло `INPUT_DOCS`, `C7`, `oversized`,
`P1`, россыпь SHA и целиком вшитый `DAILY_CODE_REVIEW`. Гейт требует формулировку
Ожеговым и явное «да» владельца ДО отправки — цепочка отправляла молча, то есть
нарушала гейт конструктивно, а не по забывчивости.

Порядок:
1. Дождаться артефакта (утро — `docs/MAIN_DAY_ISSUE.md`, вечер —
   `docs/seanses/team-evening-feedback-<date>.md`).
2. **Написать текст через линзу Ожегова**: продуктовый слой фактов, аудитория
   нетехническая. Запрещено: имена файлов и переменных, коды проверок (C7, P1),
   `oversized`/`drift`/`probe`, SHA и внутренние URL. Номера PR/Issue — допустимы
   одной строкой «деталей» в конце, не в теле.
3. **Показать черновик владельцу в чате и дождаться «ок».**
4. Отправить: `yarn telegram:swallow --file docs/comms/drafts/<файл>.md`
   (`--dry-run` — посмотреть payload). Убедиться в `sent=true`.

Rules:
- `yarn telegram:digest:day/evening` руками **не звать** — он и есть источник жаргона.
  Годится только как сырьё: посмотреть факты и переписать по-человечески.
- Office транзиентно таймаутит (`office недоступен`) — **повторить** (проверить
  `https://office.mmbrn.tech/health`), не оставлять партнёров без отчёта.
- `sent=true` подтверждает доставку, НЕ качество. Текст должен быть прочитан до
  отправки — своим глазом, а не «скрипт собрал».
- Не скипать молча — если office мёртв, сказать владельцу.

## Parallel sessions

**Второй и последующие агенты — всегда в отдельном worktree** (`membrana-worktree`),
не в основном дереве: параллельные сессии в одном worktree коллизят (инцидент
2026-07-09 — чужая сессия переключила ветку; вынужденная сериализация работы).
Коммитить строго свои файлы поимённо, никогда `git add -A` при параллельной работе.

## CLI

```bash
yarn claude:code    # proxy-aware Claude Code launcher
```

Do not commit `.env` or deploy logs to repo root — use `%TEMP%` / `$TMPDIR`.
