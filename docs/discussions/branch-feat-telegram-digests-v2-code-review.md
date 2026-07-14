<!-- Сгенерировано: 2026-07-14T05:16:14.055Z (yarn code-review; branch) -->

Tier: T1

[Teamlead]: Ветка `feat/telegram-digests-v2` — расширение `modules/telegram` (office) + extract-скрипта + md-шапка. Границы соблюдены: конвертация md→HTML живёт в office, скрипт только извлекает и POST-ит (канон #428, ADR 0004). Автозона T2 не задета — это `background-office`, но telegram-модуль, не auth-путь; C9 (секреты) не затронут — токены остаются в env. Все acceptance criteria из #434 покрыты кодом и тестами (unit конвертера, клэмп >4096, graceful без шапки, треки по ролям). PR size: **oversized (+559 при target ≤400)**, но обоснованно (новый модуль + тесты + docs + промпт+registry). Вердикт: **LGTM** после зелёного `yarn turbo run lint typecheck test --filter=@membrana/background-office` + `yarn test:scripts` + `yarn docs:lint`.

[Структурщик]: C4 соблюдён — `telegram-md.ts` чистая функция без внешних зависимостей и без импорта core; DTO расширен опциональными полями (`tracks`, `primerMd`) с валидацией zod (`.max(8)`, `.max(3000)`) — обратная совместимость сохранена. Граница «office форматирует, скрипт извлекает» выдержана: скрипт лишь читает md и кладёт в `payload.primerMd`. C7 — тесты рядом с модулями, критичные ветки покрыты. Дублирования `escapeTelegramHtml` нет — `telegram-md` экранирует независимо (внутри своего конвейера), это оправдано разной логикой (слоты кода); стоит лишь свериться, что двойного экранирования шапки не происходит — в `render` primerMd проходит `renderExpandablePrimer` в обход `escapeTelegramHtml`, корректно (P2, проверено тестом lines[2]). Границы пакетов: —.

[Математик]: Детерминизм extract/клэмпа — сильная сторона. `renderClamped` завершается: цикл монотонно уменьшает items → снимает primer → жёсткое усечение, инвариант «выход ≤ LIMIT» доказан тестами, включая крайний случай (headline 5000, обрыв тега снят регэкспом `<[^>]*$`). Off-by-one в CODE_SLOT-маркерах: `\u0000${i}\u0000` — риск коллизии если в тексте цифры вокруг NUL, но NUL в md не встречается (комментарий верен). `firstSentences` split по `(?<=\.)\s+` — корректно для точки; аббревиатуры с точкой дадут ложное разбиение, но maxChars=240 клэмпит — приемлемо (P2). Correctness error paths: `codeSlots[Number(i)] ?? ''` защищает от undefined. Границы/NaN не применимы.

[Музыкант]: —

[Верстальщик]: `<blockquote expandable>` — корректный Bot API HTML, свёрнуто по умолчанию; порядок секций (заголовок → шапка → headline → score → секции → footer) читаемый. Усечение не рвёт HTML-теги (`replace(/<[^>]*$/, '')`) — критично для parse_mode HTML, покрыто тестом. a11y/DESIGN.md для Telegram-HTML не применимы (не веб-контрол). Тон шапки нетехнический с мини-словарём — соответствует замыслу #434 «фоновая реклама». Замечаний нет.

Итоговый артефакт: markdown-review → `docs/discussions/branch-telegram-digests-v2-code-review.md`
Definition of Done: `yarn turbo run lint typecheck test --filter=@membrana/background-office` + `yarn test:scripts` + `yarn docs:lint` (новые md: ALLY_DIGEST_HEADER, TELEGRAM_DIGESTS_V2_PROMPT); dry-run `node scripts/telegram-ritual-digest.mjs --kind day --dry-run` показывает `primerMd`; живой smoke после мёржа+редеплоя office.
Риски:
- **P2** (nit, не блокирует): `firstSentences` split по точке даст ложное разбиение на аббревиатурах — смягчено maxChars, opportunity.
- **P2** (opportunity): oversized PR (+559) — сплит на «код модуля» / «docs+registry» был бы чище, но связность оправдывает единый PR.
Вердикт: **LGTM** (при зелёном CI выше)