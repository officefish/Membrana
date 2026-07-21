<!-- Сгенерировано: 2026-07-21T20:30:46.308Z (yarn code-review; daily) -->

> Контур ревью (rt-8):
> Режим: работа дня
> Precision: exact
> Период: 8e3d25923c90ad43a8c880f78c71b009d0278710^..5fdaf6e8e435d24a6a34575b5b3ec4013d2b692f (81 коммит(ов))
> ⚠ Oversized (>400 строк, дифф не развёрнут — ревьюить отдельно): 80f2fe18 (720), 44d703b3 (856), 273b6659 #751 (2027), 97325df2 #752 (1659), aff8b1b9 #756 (530), bab091a9 #755 (555), b03880c7 #758 (903), ad474e68 #760 (728), 4f8e216a #765 (702), ebba82c7 #764 (558), f372fff2 #772 (565), 67b2ad98 #773 (876), 37f01df6 #776 (2120), 2583d50f #787 (970), 54a24dc3 #797 (668), 1721b9fa #793 (1590), b292c49c #810 (1030), 82dd8192 #794 (503), 823d4c4d #809 (613), f22f35bf #832 (1632), 84ea5175 #835 (968), b80e75a8 #817 (615), 299cbf38 #862 (404)

---

Tier: T2

[Teamlead]: День крупный — 81 коммит, Night Build `linear-hygiene-dreams-providers-night` (#746) + серия влитых PR (#749/#751/#753), затронуто ≥2 пакета (`scripts/`, `@membrana/background-office`, docs/truth). Ключевая работа ночи чистая: NB1 (anti-duplicate START) и NB2 (4 провайдера снов через proxy) — с юнит-тестами, оба на моках без сети, что верно (человеко-in-loop не фабрикуется). **P1**: 23 oversized-коммита (>400 строк) не развёрнуты — среди них merge #746 и Nest OpenRouter path `80f2fe18` (720 строк) не проревьюены построчно, ревьюить отдельно перед прод-выкатом. **P1**: канон снов кристаллизован (tier2=OpenRouter, tier3=direct) в truth-registry, но код NB2 шлёт grok/gemini через OpenRouter, а deepseek/perplexity — прямыми URL, т.е. tier-лестница из truth пока не отражена в `dreams-providers.ts` — нужен follow-up. **P2**: осиротевшая пустая строка в `dreams.service.ts` (лишний `+  ` после `}`) — nit, линтеру. Вердикт по ночному коду: **LGTM** ночного диффа (NB0–NB2) при зелёном scoped CI; oversized merge-хвост — на утренний отдельный проход.

[Структурщик]: Границы соблюдены — новая логика в `scripts/lib/task-start-links.mjs` вынесена чистыми хелперами (resolve/assert/register) без сети, покрыта юнит-тестами на anti-duplicate id/issue/linear — C6/C7 закрыты хорошо. В office `dreams-providers.ts` корректно изолирует HTTP от NestJS-сервиса, `DreamsService` больше не тянет `DeepSeekModule` (удалён import из module) — связанность улучшена, C4 ок. Проверить: `registerOrLinkTask` в `upsert-links` не затирает заполненные поля — тест `twice` это подтверждает, но нет теста на коллизию linearId при upsert существующей карточки (только на insert-collision) — **P2**, дописать ветку. `postChatCompletion` дублирует три ветки (fetchFn/proxy/plain) с копипастой обработки `!res.ok` — opportunity на извлечение общего парсера ответа (**P2**, не блокер).

[Математик]: Correctness провайдеров: `classifyOutcome`-friendly shape выдержан — 402→balance, 429→rate, 401→not-configured, пустой content→502; edge-кейсы покрыты тестом «first balance then ok» и «attempts=4». `AbortSignal.timeout(90_000)` разумен; `dispatcher.close()` в finally с проглатыванием — ок для утечки соединений. Замечание: `score: 0.55` захардкожен для всех ответов — это не оценка качества, а плейсхолдер; убедиться, что downstream не принимает его за реальный скоринг (**P2**). Security C9: секреты читаются из env-schema (`PERPLEXITY_API_KEY` и др.), в diff ключей нет, `bodyText.slice(0, 400)` ограничивает утечку тела ответа в логи — приемлемо.

[Музыкант]: —

[Верстальщик]: —

Итоговый артефакт: `docs/DAILY_CODE_REVIEW.md` (на утро 21.07).

Definition of Done (утро):
- `node --test scripts/task-start-links.test.mjs scripts/task-register.test.mjs scripts/task-start.test.mjs` — зелёный.
- `yarn workspace @membrana/background-office typecheck && yarn workspace @membrana/background-office test` (vitest dreams-providers).
- Отдельный проход oversized-хвоста: `yarn code-review:pr 746` и `80f2fe18` (Nest OpenRouter path) — построчно перед любым prod.
- `yarn docs:lint` (много новых docs/prompts/reports).

Риски:
- **P1** — oversized merge #746 + `80f2fe18` (720 стр., Nest OpenRouter) не проревьюены построчно; ревью отдельным PR-проходом до прод-выката.
- **P1** — tier2/tier3 канон снов (truth-registry 20.07) не отражён в `dreams-providers.ts`: grok/gemini→OpenRouter, deepseek/perplexity→direct; нужен follow-up issue на приведение маршрутов к лестнице.
- **P2** — нет теста на linearId-коллизию в режиме `upsert-links`; лишняя пустая строка в `dreams.service.ts`; захардкоженный `score: 0.55`; копипаста веток в `postChatCompletion`.
- Open gap (owner): tier1 для снов не определён — не код-риск, вопрос владельцу.