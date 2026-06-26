# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-25T06:47:34.616Z |
| Команда | `yarn opencode:consilium` |
| Модель | openrouter/anthropic/claude-haiku-4.5 |
| Файл | `docs/seanses/opencode-proxy-processes-2026-06-25.md` |
| Порядок ролей | Teamlead → Математик → Музыкант → Структурщик → Верстальщик |
| Повестка | `docs/experiments/opencode-consilium-agenda.md` |

**Вопрос:**

Какие процессы Membrana (yarn-ритуалы, ask, consilium, планирование, code-review, standup, team-evening-feedback, analyzers:research, night build, opencode-скрипты) целесообразно доверить экспериментальному контуру opencode proxy OpenRouter/FreeModel, а какие оставить на прямом ANTHROPIC_API_KEY или Ollama? Дай таблицу по процессам и пилот на 2 недели.

---

# Консилиум: классификация yarn-процессов Membrana для opencode proxy

**Повестка:** Распределение yarn-ритуалов, планирования, code-review и вспомогательных скриптов между каналами — прямой Anthropic API, opencode proxy (OpenRouter/FreeModel), локальная Ollama и запретная зона. Обоснование по рискам, fidelity, billing и стабильности. Пилот на 2 недели.

**Участники:** Teamlead (Vesnin), Математик (Dynin), Музыкант, Структурщик (Ozhegov), Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Математик → Музыкант → Структурщик → Верстальщик (циклически).

---

[Teamlead]: Начнём с карты рисков. У нас есть два видимых потока: prod-ритуалы (morning-care, code-review, standup — они критичны для ритма дня) и эксперименты (opencode:task, opencode:ask — они пилотные, можно сломать). Плюс длинные процессы типа analyzers:research, которые жрут токены. Вопрос: что можно отправить в proxy без ущерба для качества решений, а что должно оставаться на прямом ANTHROPIC_API_KEY? Начнём с очевидного: morning-care и evening-ritual — это ядро распорядка дня, там критична консистентность ответа и скорость. Это **direct** или **локально**?

[Математик]: morning-care, standup и evening-ritual — чистые текстовые аналитические задачи, никакой DSP. Но там есть контекст репозитория (выдержки из коммитов, метрик ночного билда). OpenRouter с Claude Haiku справится, но есть замечание: если ночной build (night:open) выкидывает много ошибок, то утренний анализ должен их увидеть синхронно. Если это зависит по времени, то **direct**, чтобы быть уверены в fidelity. Analysers:research — вот это точно можно в proxy, там это только поиск паттернов, не критично на секунду точно.

[Музыкант]: Согласен с прямыми ритуалами, но с уточнением: для DSP-related code-review (если мы ревьюим мат. ядро, эффекты, Web Audio) нужен точный глаз — лучше direct. Но код UI-интеграций opencode proxy справится. Всё, что касается конкретных нот, битрейтов, артефактов 24bit/48kHz — это мы не доверяем proxy. Зато opencode:ask для быстрых консультаций о стандартах, форматах (FLAC vs MP3) — welcome.

[Структурщик]: Тут для меня ясно: любой code-review архитектуры пакетов, сервисов, хуков — это **direct**. Это основа стабильности монорепо. Но opencode:task для рутины в соответствии с уже принятым pattern («добавь хук в сервис X по шаблону из docs/patterns» и т.п.) — можно прототипировать в proxy. Плюс plan:day, plan:week — это не критичное, можно proxy, потом human пересмотрит. Что-то насчёт сеть-коммуникации, микросервисов? Это **direct**, если затрагивает ARCHITECTURE.md.

[Верстальщик]: Для UI я вижу так: code-review дизайна (DaisyUI, a11y, адаптив, макеты) — это **direct**, потому что ошибки в a11y и конструктивизме критичны, а proxy может пропустить тонкость DESIGN.md. Но opencode:ask для вопросов вроде «как в DaisyUI сделать кастомный toggle с темизацией?» — точно proxy. Прототипы React-компонент по готовому дизайну — пробуем proxy, потом ревью от человека.

[Teamlead]: Хорошо, начнёт вырисовываться матрица. Давайте опишем каждый процесс явно: что входит, что выходит, какой тип решения. Начну с критичных: **morning-care** (ritual:day) — вход: логи, метрики ночи, коммиты, TODO; выход: сводка дня, приоритет эпиков, warning'ы. Это можно в proxy, но с условием: если ночной build упал, мы должны это заметить за 30 сек. Может быть, асинхронный proxy через OpenRouter, потом уведомление? Или это всё-таки **direct с fallback на proxy**?

[Математик]: morning-care можно разбить: **анализ метрик** (CPU, error rate, покрытие) — это чистый парсинг логов, OpenRouter справится, push в Slack async. **Приоритизация** (какой эпик взять) — вот это нужен мозг, здесь **direct**, потому что это стратегическое решение, а не просто чтение данных. Итак: **анализ логов → proxy (async)**, **priority-setting → direct**. Разделяем по функциям.

---

## Итоговая таблица (синтез, `yarn opencode:task` через OpenRouter)

| Процесс | Канал | Обоснование |
|---------|-------|-------------|
| `ritual:day` / `morning-care` / `main-day-issue` | **direct** | Ядро утреннего ритма; приоритизация эпика — стратегия |
| `standup` | **direct** | Синхронный ритм, блокеры критичны |
| `ritual:evening` / `code-review` (вечер) | **direct** | Prod-ритуал, высокий риск регрессии |
| `code-review` (архитектура, DSP, UI/a11y) | **direct** | ARCHITECTURE.md, DESIGN.md, Web Audio guard |
| `code-review` (docs/i18n, мелочи) | **proxy** | Низкий риск, pattern-matching |
| `plan:day`, `plan:week` | **proxy** | Черновик; human пересматривает |
| `ask <persona>` | **proxy** (эксп.) / **direct** (prod) | Ad-hoc Q&A — proxy; важные решения — direct |
| `consilium` (prod) | **direct** | Стратегические решения |
| `opencode:consilium` | **proxy** | Экспериментальный контур (этот сеанс) |
| `team-evening-feedback` | **proxy** | Async, некритично по latency |
| `analyzers:research:week` | **proxy** | Длинный, токеноёмкий, низкий стейк |
| `local-code-review` | **local** (Ollama) | Уже локально |
| `opencode:*` (smoke, task, ask, preflight) | **proxy** | Целевой экспериментальный контур |
| `night:open` / `night:close` | **direct** (+ proxy для черновиков) | Автономная ночь — надёжность важнее |
| `anthropic:smoke` | **direct** | Канон prod-ключа |
| Редактирование ROADMAP/ARCHITECTURE, merge в main | **запрет** | Только человек |

**Внешний контекст (Perplexity):** proxy по умолчанию для dev-workflows (brainstorm, standup-notes, planning drafts); direct — для release gates, audited outputs, agent actions.

---

## Консенсус (3 буллета)

1. **Три канала:** `direct` — prod-ритуалы и архитектурное/DSP/UI-ревью; `proxy` — opencode-line, планирование, research, evening-feedback; `local` — `local-code-review`.
2. **Разделение внутри процесса:** например `morning-care` — парсинг метрик async через proxy, приоритизация эпика — direct.
3. **Governance:** выходы proxy помечать `[PROXY-DRAFT]`; FreeModel — только fallback (503/502); OpenRouter — primary.

---

## Пилот на 2 недели

**Неделя 1:** smoke `opencode:*` → `plan:day` на proxy → `analyzers:research:week` → `team-evening-feedback` 50→100% proxy; prod-ритуалы на direct.

**Неделя 2:** стоп-лист prod подтверждён; сравнение cost/quality; fallback FreeModel; post-pilot review → обновить `DEVELOPER_RHYTHM` при успехе.

**Критерий успеха:** ≥4 процесса на proxy без регрессии `ritual:day` / `code-review` / `standup`.

---

*Дополнено: `yarn opencode:task` (OpenRouter Haiku) + Perplexity Sonar для внешнего контекста. Первый проход консилиума — `--compact` из-за лимита кредитов OpenRouter.*
