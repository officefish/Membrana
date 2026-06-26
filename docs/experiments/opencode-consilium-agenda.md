# Повестка: консилиум opencode proxy (эксперимент)

## Контур opencode в Membrana (факты)

- **mjs-скрипты** (не TUI): `yarn opencode:smoke`, `opencode:task`, `opencode:ask`, `opencode:preflight`
- Ключи: `.env.llm-proxy` — `OPENROUTER_API_KEY`, опционально `FREEMODEL_DEV_API_KEY`
- **Prod-ритуалы не трогаем:** `yarn ritual:day`, `code-review`, `standup`, `anthropic:smoke` → корневой `.env` + прямой Anthropic
- FreeModel: `cc.freemodel.dev/messages` только для Claude Code; скрипты идут через `api.freemodel.dev` (OpenAI-формат) или OpenRouter
- OpenRouter smoke: OK (`anthropic/claude-haiku-4.5`)
- Skill: `membrana-opencode-proxy`

## Существующие yarn-процессы (кандидаты на классификацию)

| Процесс | Сейчас API | Риск |
|---------|------------|------|
| `ritual:day` / `morning-care` | прямой Anthropic | высокий |
| `code-review` / `ritual:evening` | прямой Anthropic | высокий |
| `standup`, `plan:day`, `plan:week` | прямой Anthropic | средний |
| `ask <persona>` | прямой Anthropic | низкий–средний |
| `consilium` | прямой Anthropic | низкий (этот сеанс — эксперимент через proxy) |
| `team-evening-feedback` | прямой Anthropic | средний |
| `analyzers:research:week` | прямой Anthropic | низкий |
| `local-code-review` | Ollama | локально |
| `opencode:*` | OpenRouter/FreeModel | эксперимент |
| `night:open` / автономные агенты | смешанно | ? |

## Perplexity (внешний контекст)

Безопасно через proxy: smoke, ad-hoc Q&A, brainstorm/consilium, черновики review, planning.

Оставить на direct API: prod-ритуалы, billing-critical, длинный CI, strict fidelity.

## Задача консилиума

Для **каждого** процесса Membrana выше (и смежных из DEVELOPER_RHYTHM) дать рекомендацию:
- **proxy** (opencode/OpenRouter/FreeModel)
- **direct** (ANTHROPIC_API_KEY)
- **local** (Ollama)
- **запрет** (не автоматизировать)

Таблица с обоснованием по ролям. Итог: пошаговый пилот на 2 недели.
