# INSIGHT: Персистентная память и непрерывность виртуальных персон

| Поле | Значение |
|------|----------|
| **ID** | `insight-persona-persistent-memory` |
| **Статус** | draft |
| **Источник** | user |
| **Создан** | 2026-07-12 |

---

## Проблема / наблюдение

Виртуальная команда (`docs/virtual-team/PROMPT_*.md`: Vesnin, Dynin, Структурщик,
Музыкант, Верстальщик) существует только **на время вызова**: каждый консилиум /
`yarn ask` персона рождается заново из статического промпта. Между вызовами у персоны
нет собственного состояния — она не помнит, какую позицию занимала в консилиуме №25,
за что голосовала, какие прогнозы давала и как жизнь их рассудила.

Сырьё для такой памяти **уже накапливается**, но лежит мёртвым грузом с точки зрения
персоны: протоколы консилиумов в `docs/seanses/` (≥20 реплик каждый), таблицы
голосований инсайт-ревью (`docs/insights/*/REVIEW.md`), evening-feedback с оценками
дня. Никто из этого не строит **пер-персонный** след, и загрузчик consilium/ask его
не инъектирует.

Следствия:
- позиции персон **дрейфуют** от сессии к сессии (нет якоря «я уже это говорил»);
- накопленной калибровки нет: прогноз Дынина из консилиума №25 нельзя сопоставить
  с фактом и предъявить ему же в №40;
- споры повторяются с нуля — команда переспоривает уже решённое.

Это **первый слой** более широкой идеи владельца о «субъектности» виртуальной
команды (2026-07-12). Слои 2 («собственный компьютер» — автономный рантайм персоны)
и 3 («собственный бюджет») владелец пока обдумывает — они сознательно **не входят**
в этот инсайт.

## Гипотеза

Если дать каждой персоне персистентный **журнал субъектного опыта** —
`docs/virtual-team/memory/<persona>.md` (или аналог): занятые позиции, поданные
голоса с оценками, сделанные прогнозы и их исход, признанные ошибки — и
детерминированно **инъектировать** его (с токен-бюджетом) в промпт персоны при
consilium / ask / insight-review, то:

1. качество консилиумов вырастет: персоны спорят с учётом собственной истории,
   а не рождаются «с холода»;
2. появится **калибровка**: расхождение прогноз↔факт становится проверяемым и
   само становится записью журнала (петля обучения без fine-tune);
3. решённые споры перестают переигрываться — «мы это уже решили в №N» становится
   дешёвой репликой со ссылкой.

Наполнение журналов — **дистилляция из существующих артефактов** (протоколы
`docs/seanses/`, REVIEW-таблицы, evening-feedback), а не свободная генерация:
каждая запись со ссылкой на протокол-источник и датой.

Отличие от соседей:
- `insight-team-stack-watch` (adopted 6.6, припаркован) — **внешнее знание стека**
  («что нового в DSP/React»); здесь — **собственный опыт** персоны («что Я говорил,
  как Я голосовал, где Я ошибся»). Слои дополняют друг друга, не пересекаются.
- `insight-mcp-hindsight-agent-memory` (draft) — память **кодинг-агента** об
  операционных ошибках (ритуалы, спринты); здесь — память **ролей команды** о
  позициях и решениях.

## Scope (черновик)

- **In scope:** формат журнала персоны (позиции / голоса / прогнозы / исходы,
  жёсткий токен-бюджет + ротация/сжатие старого); точка инъекции в загрузчик
  consilium / ask / insight-review; дистилляция журнала из протоколов
  `docs/seanses/` и REVIEW-файлов (ретро-наполнение по существующему архиву +
  инкрементальный дописок после каждого консилиума); provenance каждой записи
  (ссылка на протокол + дата); человек-гейт на записи в журнал.
- **Out of scope:** слой 2 «собственный компьютер» (автономный рантайм, cron-рутины
  персон — уроки заморозки #344) и слой 3 «бюджет/счёт» — отдельные будущие
  инсайты по решению владельца; изменение состава команды или самих
  `PROMPT_*.md`-характеров; автономные **действия** персоны на основе памяти;
  Hermes как 6-я роль (остаётся функцией ритма); замена RAG-контура.

## Связи

- Идея-родитель: беседа с владельцем 2026-07-12 «субъектность виртуальной команды»
  (3 слоя: память → компьютер → бюджет; здесь только слой 1).
- Инсайты-соседи: `insight-team-stack-watch` (знание стека, adopted/parked),
  `insight-mcp-hindsight-agent-memory` (память кодинг-агента, draft),
  `insight-hermes-liaison-agent` → спринт `hermes-brief` (PR #316, паттерн
  детерминированной read-only функции ритма).
- Сырьё: `docs/seanses/*-PROTOCOL.md` (консилиумы), `docs/insights/*/REVIEW.md`
  (голоса 5 ролей), `docs/seanses/team-evening-feedback-*.md`.
- Документы: `docs/virtual-team/PROMPT_*.md`, `docs/VIRTUAL_TEAM_PROMPT.md`,
  `docs/prompts/INSIGHT_REGULATION.md`.
- Урок процесса: пилот night-triage #344 (заморожен) — автономность без
  наблюдаемости не работает; потому слой 1 — файлы в git с человек-гейтом.

## Вопросы для research (Q1–Q3)

1. **Landscape:** What established patterns exist in 2025-2026 for giving prompt-defined LLM personas or multi-agent role ensembles persistent identity and episodic memory across sessions - position journals, voting and decision histories, prediction-outcome calibration logs, reflection loops (Generative Agents, Reflexion, Letta/MemGPT, Mem0, Zep) - and what measurably improves multi-agent deliberation quality versus stateless role prompts?
2. **Fit (Membrana):** How to deterministically distill a per-persona experience journal for LLM agent roles from existing deliberation artifacts (meeting protocols, review vote tables, retro notes) with provenance links, keep it within a strict token budget via rotation and summarization tiers, and inject it into role prompts without context bloat - plain curated Markdown files in git versus vector memory stores, and when is plain Markdown enough?
3. **Risk:** What are the failure modes of persistent persona memory for LLM agents - position ossification, self-consistency bias overriding fresh evidence, memory poisoning and drift, token-cost growth, fabricated recollections - and which mitigations (human-gated writes, provenance links, staleness TTL, explicit changed-my-mind entries, calibration scoring) are considered best practice?
