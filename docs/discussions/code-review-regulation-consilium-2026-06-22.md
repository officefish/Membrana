# Консилиум: регламент `CODE_REVIEW_REGULATION.md`

**Дата:** 2026-06-22  
**Повестка:** оценить системный промпт code review (режимы daily/pr/branch, Teamlead Vesnin, чеклист C1–C10) и согласовать улучшения с industry best practices.  
**Источник промпта:** [`docs/prompts/CODE_REVIEW_REGULATION.md`](../prompts/CODE_REVIEW_REGULATION.md)  
**Внешние источники (Perplexity):** Google eng-practices (small CLs, approve if improves code health), risk-tiered review, correctness→security→performance→readability для AI-assisted review, PR &lt;400 LOC, human final LGTM.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Структурщик → Математик → Музыкант → Верстальщик → (цикл ×4)

---

[Teamlead]: Открываю. Регламент правильно ставит Vesnin владельцем LGTM и разделяет daily vs pr. По Google: одобряем, если change **улучшает code health**, не ждём идеала. Наш P2 как «opportunity» — ок, но нужно явно: **nit не блокирует merge**. Предлагаю tier-ы: T0 docs-only, T1 стандарт, T2 architecture/security/device-board runtime.

[Структурщик]: C1–C4 — сильная сторона, это наш rubric, не generic checklist. Perplexity советует не гонять полный чеклист на каждый PR — согласен. Для **daily** достаточно сводки context-collector; пять блоков ролей на вечер избыточны, если diff пустой. Предлагаю: daily — **сокращённый формат** (Teamlead + Структурщик + риски), full five-block только pr/branch.

[Математик]: C6 верно отсекает UI из analyzer. Добавил бы явный проход **correctness первым** (граничные значения, off-by-one, idempotency) — это из AI review checklist 2025–2026. Для `packages/services/*` с DSP/FFT — отдельный подпункт в блоке Математика: numeric stability, NaN, window bounds.

[Музыкант]: C2 обязателен — без audio-engine guard мы ловили регрессии. В **pr mode** для путей `microphone`, `streaming`, `audio-engine` — автоматически tier T2. Perplexity: security review отдельно от quality — у нас C9 частично; добавить **trust boundary** (client vs device-board vs background-*).

[Верстальщик]: C5 и DESIGN.md — да. Риск: пять одинаковых блоков провоцируют «стену текста» в `DAILY_CODE_REVIEW.md`. Rodchenko просит **лимит**: каждый блок ≤6 предложений, кроме Teamlead (вердикт). Для a11y — один явный вопрос в чеклисте: focus order / keyboard на новых контролах device-board.

[Teamlead]: Принимаю лимит блоков и tier-ы. T0: только lint/docs. T1: feature/fix. T2: core, MembranaRegistry, audio path, auth, RAG, migrations. LGTM только после указания tier в шапке ответа.

[Структурщик]: `yarn code-review:pr` должен требовать **linked issue или MAIN_DAY_ISSUE** в контексте — Perplexity: «no ticket, no merge» как policy. Скрипт может подмешивать `docs/MAIN_DAY_ISSUE.md` и acceptance criteria, не только diff.

[Математик]: Severity: наш P0≈Blocker, P1≈Major, P2≈Minor/Nit — добавить **таблицу соответствия** в регламент, чтобы модель не путала. Запрет «выглядит ок» уже есть — хорошо.

[Музыкант]: Для AI-generated diff (Cursor co-author) — extra scrutiny: C8 + «совпадает ли с CONCEPT». Это не паранойя: industry 2025 рекомендует усиленный review AI-assisted changes.

[Верстальщик]: Daily вечером читают утром standup — блок «что прогнать утром» обязателен в Teamlead. Сейчас есть в режиме daily, усилить: **конкретные yarn-команды с filter**, не общие слова.

[Teamlead]: PR size: Google/augment — target 200, ceiling 400 LOC. В pr mode Teamlead пишет: «PR в пределах нормы / oversized — рекомендовать split». Не BLOCK автоматически, но P1 если &gt;400 без обоснования.

[Структурщик]: Разделение **membrana-code-review** vs **review-bugbot** правильное. Bugbot — механика; наш регламент — границы и LGTM. Не дублировать в промпте инструкции Bugbot.

[Математик]: Режим **uncommitted** — полезен перед commit; но не заменяет CI. DoD всегда включает typecheck затронутых пакетов.

[Музыкант]: RAG в контексте — ок как дополнение. Прописать **context boundary** (один абзац): RAG не видит runtime, cross-service, .env; сомнения → human.

[Верстальщик]: Русский язык и пять ролей — фирменный стиль Membrana, не менять. Добавить пример **хорошего** `[Teamlead]:` на 4 строки в appendix регламента.

[Teamlead]: Конфликт daily full vs short: **компромисс**. Daily: минимум Teamlead + Структурщик + Риски + «утро»; полные пять блоков — **если** context-collector показывает изменения в ≥2 пакетах или есть P0/P1 вчера.

[Структурщик]: Чеклист C1–C10 оставить; добавить колонку **Tier** (T0/T1/T2). C2,C3,C9 — T2. C5 — T1 если UI. C10 — T1 device-board docs.

[Математик]: Согласен. Ещё: в pr mode Математик молчит «—», если нет изменений в analyzer/math paths — уже в духе «не применимо».

[Музыкант]: Human approval обязателен даже если AI LGTM — у нас это Vesnin BLOCK/LGTM. Зафиксировать: **скрипт не merge’ит**, только markdown artifact.

[Верстальщик]: Метрики (time-to-review) — в CONTRIBUTING, не в системный промпт. Регламент не раздуваем.

[Teamlead]: Итог близко. Принимаю tier-ы, mapping severity, context boundary RAG, сокращённый daily, PR size note, issue context для pr, appendix example. Версия регламента → **v0.2** после правок.

[Структурщик]: Принимаю. Прошу одну строку в skill `membrana-code-review`: «consilium 2026-06-22» как ссылка на этот файл.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Владелец LGTM | **Vesnin (Teamlead)** — без изменений |
| Формат daily | **Сокращённый** (Teamlead + Структурщик + риски), full 5 ролей если ≥2 пакета затронуто |
| Tier review | **T0 / T1 / T2** — указывать в шапке каждого pr/branch review |
| Severity | Таблица **P0=Blocker, P1=Major, P2=Minor/Nit**; nit не блокирует |
| PR size | Target ≤400 LOC; oversized → P1 recommendation split (не авто-BLOCK) |
| AI-assisted diff | Усиленный проход C8 + CONCEPT/catalog для T2 |
| RAG | Явный **context boundary** в регламенте |
| pr контекст | Подмешивать **issue / MAIN_DAY_ISSUE** (follow-up в скрипт) |
| Industry alignment | Small CLs, risk-tiered depth, human final say — **да** |
| Артефакт | Этот файл + правки `CODE_REVIEW_REGULATION.md` v0.2 |

## Definition of Done (правки регламента)

- [x] Секции: Review tiers T0–T2, Severity mapping, Daily short vs full, Context boundaries, PR size note
- [x] Appendix: пример блока `[Teamlead]:`
- [x] Ссылка из `membrana-code-review` SKILL на этот consilium
- [x] `code-review-ritual.mjs`: MAIN_DAY_ISSUE + CURRENT_TASK в pr/branch/uncommitted; PR size hint

## Ссылки (Perplexity / industry)

- Google eng practices: small CLs, approve if improves code health — [google.github.io/eng-practices](https://google.github.io/eng-practices/review/)
- Risk-prioritized review depth — Apiiro / industry summaries 2025
- AI review order: correctness → security → performance → readability
- PR scope &lt;400 LOC, automation for baseline — Augment Code, CodeRaptor 2025–2026
