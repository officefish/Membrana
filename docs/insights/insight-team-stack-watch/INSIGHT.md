# INSIGHT: Начитанная виртуальная команда: досье персон + фоновый stack-watch за новинками стека

| Поле | Значение |
|------|----------|
| **ID** | `insight-team-stack-watch` |
| **Статус** | draft |
| **Источник** | user |
| **Создан** | 2026-07-09 |

---

## Проблема / наблюдение

Виртуальная команда (`docs/virtual-team/PROMPT_*.md`: Vesnin, Dynin, Структурщик,
Музыкант, Верстальщик) сейчас **без персистентной базы знаний**. Каждый консилиум
персона входит «с холода», опираясь только на текст промпта и общую эрудицию модели —
она **не «начитана»** по актуальному состоянию своего стека (DSP/FFT, Web Audio, React/
Tailwind/a11y, monorepo-архитектура, процесс) и **не следит** за новинками фоном.

Частично паттерн «фонового подчитывания» уже существует: `yarn analyzers:research:week`
— недельный радар (arXiv + HuggingFace API → `docs/WEEKLY_ANALYZERS_RESEARCH.md` →
`plan:week`). Но он **узкий** (только внешние аналайзеры для каталога детекции) и **не
пер-персона**. «Начитанности» негде жить, слежение не покрывает стек ролей.

## Гипотеза

Если добавить **два слоя** поверх существующей инфраструктуры (perplexityAsk /
insight-ritual / RAG / ритмы), команда станет начитанной и будет подучиваться фоном:

1. **Слой «Начитанность» (статика):** курируемое досье на персону
   `docs/virtual-team/knowledge/<persona>.md` (must-know по стеку роли, жёсткий
   токен-бюджет), которое загрузчик consilium/ask **инъектирует** в промпт персоны.
   Длинный хвост → RAG (`rag:index`), подтягивается top-K по теме обсуждения.
2. **Слой «Слежение» (динамика):** обобщить `analyzers:research:week` до
   `yarn team:stack-watch` — пер-персона/пер-топик **детерминированный** сбор из
   реальных источников (Perplexity/sonar + arXiv + HF + GitHub releases/changelogs) →
   датированный **с источниками** дайджест `docs/seanses/stack-watch-<date>.md` +
   инкрементальный **дедуплицированный** дописок в досье.

Значимое graduates через **существующий** insight-пайплайн (research → голос 5 ролей
≥6.0 → `plan:week` → спринт). Концептуально — **сестра Hermes**: read-only функция
ритма, дескриптивная, кормит команду (Hermes собирает состояние сессии, «Начётчик» —
знание стека).

## Scope (черновик)

- **In scope:** формат досье персоны + точка инъекции в consilium/ask; обобщённый
  `team:stack-watch` (сбор→дистилляция→дайджест→дедуп-дописок); каденс (недельный
  ритуал ИЛИ scheduled cloud-агент); guardrails (источники+даты, дистилляция без
  инференса, человек-гейт, cap/стоимость, дедуп).
- **Out of scope:** автономное **исполнение** знаний персоной (только начитанность,
  не действия); замена insight/plan:week-гейтов; тяжёлый RAG-редизайн (переиспользуем
  существующий `rag-dual-circuit-v1`); LLM-«новости» без источника.

## Связи

- Эпики / PR: `hermes-brief` (PR #316, паттерн read-only функции ритма);
  `insight-hermes-liaison-agent` (форсайт-горизонт: библиотекарь/оркестратор как
  отложенные гипотезы); `rag-dual-circuit-v1`.
- Документы: `docs/virtual-team/PROMPT_*.md`, `docs/VIRTUAL_TEAM_PROMPT.md`,
  `scripts/analyzers-research-week.mjs` (+ `_analyzers-research.mjs`),
  `scripts/lib/insight-ritual.mjs` (`perplexityAsk`, `buildResearchQueries`).

## Вопросы для research (Q1–Q3)

1. **Landscape:** Which established patterns and tools give LLM agents or prompt-defined "personas" persistent, continuously-updated domain knowledge without weight fine-tuning — curated knowledge dossiers, retrieval-augmentation (RAG), scheduled research digests, agent-memory systems, continuous-learning loops — and what actually works in 2025–2026, with typical architectures and their limitations?
2. **Fit (Membrana):** How to inject such knowledge into prompt-defined roles deterministically, without context bloat and without hallucinated "news" — splitting curated token-budgeted dossiers vs an on-demand RAG tail, deduplication and staleness/TTL of knowledge, distillation strictly from provided sources with URL+date provenance, and cheap regular monitoring of stack releases/papers (arXiv, HuggingFace, GitHub releases, changelogs) on a ritual or cron cadence?
3. **Risk:** What are the failure modes of automatically feeding knowledge to an agent team — hallucinated, stale, or contradictory facts, knowledge drift, over-trust in the digest, token-cost blowup, noise vs signal — and what mitigations (human-in-the-loop gate, provenance/citations, item caps, dedup, knowledge TTL) are considered best practice?
