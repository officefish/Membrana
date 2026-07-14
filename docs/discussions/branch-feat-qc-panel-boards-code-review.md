# Review: ветка feat/qc-panel-boards (#454)

> Проведено в IDE-чате по CODE_REVIEW_REGULATION v0.2 (Anthropic API — кредит
> исчерпан; формат «chat without script»). База: origin/main, HEAD d7fc520f.

Tier: T2

[Teamlead]: Спринт #454 — потребители каркаса #438 по консилиуму quality-control-contour (гейт пройден сегодня, 24 реплики). Diff +1026/−14, 18 файлов, три зоны: office-модуль `benchmark`, скрипт-продюсер, панельные борды. PR size: oversized относительно 400, но это один связный контур «источник → транспорт → витрина», сплит дал бы нерабочие половины. Порядок «канон → витрина» соблюдён: борд рендерит зафиксированный прогон, ничего не перезапускает; зона Задачи A (DETECTOR_BENCHMARK.md, data/**, benchmark-detectors.mjs) не тронута — коллизия-гард выдержан. PR size: oversized (обоснован). **LGTM** при зелёных прогонах (office turbo 4/4, panel turbo 3/3 + 17 тестов, scripts 267/267 — подтверждены).

[Структурщик]: C1/C4 — границы чистые. Office: `modules/benchmark` — локальный zod-DTO без импата core, in-memory сервис (stateless, ADR 0004), POST за ApiTokenGuard (producer-канал, как drift-anchor), GET за PanelAuthGuard+@MinRole('operator') — норма OP5 (default-deny, no-store, rate-limit, аудит приходят из единой точки, дублирования нет). BenchmarkModule корректно импортирует PanelAuthModule (guard экспортирован). Панель: только `/v1/*` fetch + свои lib/components, internals кабинета/office не тянет; конвенции authApi (относительные пути, credentials include) соблюдены. Скрипт переиспользует паттерн telegram-swallow (isMain-гард, loadDotEnv, OFFICE_API_TOKEN приоритет). C7 — тесты рядом во всех трёх зонах.

[Математик]: Правильность чисел. FPR = fp/(fp+tn) с честным null при нуле негативов (не 0 — верно, деление на ноль не маскируется); pct один знак; тест сверяет 22/60 по канонической матрице yamnet. Происхождение чисел выполнено по консилиуму: шапка борда несёт generatedAt/datasetVersion/sampleCount, drift-записи — detectorVersion+возраст. Data-минимизация Q3 доказуема: `.strict()` на всех уровнях DTO — попытка протащить perSample даёт 400 (тест есть), дистилляция скрипта отбрасывает perSample и посторонние ключи (тест есть). compareProdMain — три исхода покрыты. P2: возраст в ageLabel монотонен, но отрицательные дельты (рассинхрон часов) дадут «только что» — приемлемо, не блокер.

[Музыкант]: Аудио-контур не затронут; live-перф-срез корректно НЕ включён (потребитель №4 после задачи B — по консилиуму). Замечаний нет.

[Верстальщик]: Shell-навигация минимальна и честна: state вместо router (одна страница, «← Разделы»), карточки без контента сохраняют пометку «в разработке», ally-digest остаётся заглушкой. Состояния всех бордов полные: loading (aria-busy) / error (role=alert) / empty с объяснением ПРИЧИНЫ (in-memory журнал + команда для оживления) / forbidden словом. Вердикты и уровни — словом, не только цветом; `tabular-nums` на числах; таблицы в overflow-x-auto; focus-visible на кнопках. Токены DaisyUI кабинетного стека — без нового стиля. P2: нет кнопки «обновить» на бордах (только перезагрузка страницы) — opportunity, не блокер.

Итоговый артефакт: docs/discussions/branch-feat-qc-panel-boards-code-review.md
Definition of Done: `yarn turbo run lint typecheck test --filter=@membrana/background-office --filter=@membrana/panel` + `yarn test:scripts` + `yarn benchmark:push --dry-run` (дистилляция живого latest.json) — все зелёные, подтверждено до ревью.
Риски:
- P2: ageLabel при отрицательной дельте времени → «только что» (рассинхрон часов producer/клиент) — не блокер.
- P2: нет refresh-кнопки на бордах — opportunity следующей итерации.
- Note: OOM в первом параллельном turbo-прогоне — окружение (7 задач параллельно), не код; последовательный прогон зелёный.
Вердикт: LGTM
