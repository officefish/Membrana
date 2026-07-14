<!-- Сгенерировано: 2026-07-14T06:47:13.337Z (yarn code-review; branch) -->

Tier: T1

[Teamlead]: Tier T1 (feature в одном пакете `background-office` + скрипты/скиллы; не auth-модуль, не core, не audio — auto-T2 не срабатывает). PR size OK (~295 lines < 400). Границы соблюдены: DTO локальный, без импорта `@membrana/core`; office остаётся тупым stateless-транспортом (ADR 0004 не нарушен). Скилл зеркалирован в три среды (.cursor канон + .agents/.claude mirror), README-таблица обновлена — C10 sync ✓; C8 (console.* — это CLI-скрипт, не production runtime, допустимо); C9 секретов в diff нет, токен только из env. **Вопрос вне scope дня:** MAIN_DAY_ISSUE фокус — продукт FREE (fusion/yamnet/UC), а это `telegram-swallow` — ветка не по магистрали; помечаю как P2 process-note, не блокер. **Вердикт: LGTM** после зелёного `yarn turbo run lint typecheck test --filter=@membrana/background-office` + `yarn test:scripts` + `yarn docs:lint`.

[Структурщик]: Границы чистые: `ally-message.dto.ts` — zod-схема без core, `formatAllyMessage` — чистая функция вёрстки, контроллер тонкий (parse→format→send). Хорошо вынесен `clampTelegramHtml` из инлайна `renderClamped` в `telegram-md.ts` — устранено дублирование логики усечения (было `.slice().replace(/<[^>]*$/)`), теперь единый источник. C7 ✓: тесты рядом (`telegram-format.test.ts`, `telegram.controller.test.ts`, `telegram-swallow.test.mjs`), покрыты happy-path, невалидный вход, fire-and-forget. C4 ✓: ядро без React, скрипт — тонкий клиент над HTTP. Замечание P2: `resolveSwallowText` парсит `--file` руками — при росте флагов стоит вынести в общий argv-хелпер (opportunity, не сейчас).

[Математик]: Correctness `clampTelegramHtml` — проверил границы: `html.length <= limit` → возврат как есть ✓; иначе `slice(0, limit-1)` + отсечение оборванного тега + `…`. Тест «клэмп без обрыва тегов» (`not.toMatch(/<[^>]*$/)`) закрывает основной риск. P2-риск (не блокер): регэксп `/<[^>]*$/` режет только последний оборванный **открывающий** фрагмент; если срез попал внутрь парного тега (`<b>…сре`|`з</b>`), закрывающий `</b>` может потеряться → Telegram может отвергнуть незакрытый `<b>`. На md-подмножестве (bold/italic/a/code) риск низкий, но стоит завести follow-up тест на срез внутри парного тега. Лимит 4096 продублирован в скрипте (жёсткая 4096) и в схеме (`max(4096)`) — консистентно.

[Музыкант]: — (Web Audio / DSP не затронуты).

[Верстальщик]: — (UI/DESIGN.md не затронуты; «вёрстка» здесь — Telegram-HTML, зона Структурщика).

Итоговый артефакт: `docs/discussions/branch-telegram-swallow-code-review.md`
Definition of Done: `yarn turbo run lint typecheck test --filter=@membrana/background-office` + `yarn test:scripts` (включён `telegram-swallow.test.mjs`) + `yarn docs:lint` (новые SKILL.md) — все зелёные.
Риски:
- P2: срез `clampTelegramHtml` внутри парного тега может потерять закрывающий тег — завести follow-up тест (Математик).
- P2: ветка вне магистрали дня (FREE product); подтвердить у владельца приоритет «ласточки» перед merge (Teamlead).
- P2: `resolveSwallowText` ручной парсинг флагов — opportunity на общий argv-хелпер.

Вердикт: **LGTM** (при зелёном CI; блокеров P0/P1 нет)