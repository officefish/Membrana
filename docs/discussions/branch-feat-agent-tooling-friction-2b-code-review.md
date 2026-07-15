# Review: ветка feat/agent-tooling-friction-2b — вторая половина ti-3/2/1 (#469)

> Проведено в IDE-чате по CODE_REVIEW_REGULATION v0.2 (Anthropic API — кредит
> исчерпан; формат «chat without script»). База: origin/main (886b8e22).

Tier: T1

[Teamlead]: Три оставшихся ti по консилиуму agent-tooling-friction-2: ti-3 task:register (schema-валидация + вставка в начало + rebase-регенерация), ti-2 consilium --secretary-file (валидатор канона + оффлайн-сохранение), ti-1 task:review:ship (обёртка над lib-runner, деривация SHA/базы, хореография с печатью шагов). Все запреты консилиума соблюдены: формат registry не изменён (ti-3 добавляет только вставку), lib/task-closure-review.mjs не переписан (ti-1 — обёртка через yarn task:review:*), координационных файлов нет. Живой dry-run ship на PR #479 показал корректный план (detached-детект, база = родитель). **LGTM**.
[Структурщик]: Чистые функции вынесены и тестируемы во всех трёх: buildTaskEntry/insertTaskAtFront (lib/task-registry — не мутируют вход, дубль→ошибка), validateProtocol/countRoleReplies/parseVotingTable (lib/protocol-validator — без сети/LLM), extractSquashSha/shipSteps (task-review-ship). ti-1 не дублирует runner — оркестрирует yarn task:review:prepare/run/finalize как есть. Границы чистые.
[Математик]: Деривация ship корректна по research Q2: extractSquashSha fail-closed (не MERGED / нет 40-hex oid → throw, SHA не угадывается), база = первый родитель mergeCommit. Золотой кейс #451 (merge d452582d, HEAD уехал на 2f9dd521, база 23d6a5ba) — в тесте, detached-ветка распознаётся. Валидатор протокола: арифметика голосования сверяется с заявленным средним ±0.1, регресс-фикстуры — живые протоколы (2 консилиума + insight-review 14.07). task:register регенерация вставки на rebase — ephemeral regeneration research Q1.
[Музыкант]: — (аудио не затронуто). Отмечу: ship возвращается на исходную ветку при падении в detached (try/finally-семантика) — не бросает человека в detached HEAD.
[Верстальщик]: ship печатает каждый шаг хореографии ДО выполнения (требование консилиума — прозрачность важнее краткости); dry-run по умолчанию (--execute для реального). Вывод всех трёх — статус словом, без ANSI. secretary-file честно требует --save-as, register печатает «что дальше».

P0/P1: —
P2: ti-1 оркестровка (execute-путь) не покрыта юнит-тестами — тестируются чистые функции деривации; execute проверен живым dry-run на #479. secretary-file не валидирует insight-review-путь через CLI (только consilium) — insight review --review-file остаётся follow-up.
Побочно: фикс латентной дыры #479 — verify-encoding.test.mjs тропил собственный гард (self-фикстуры mojibake), закрыт allow-маркером.
Checks: yarn test:scripts — pass 301/301 (13 новых тестов ti-3/2/1); yarn verify:encoding — OK (1688 файлов); живой dry-run yarn task:review:ship --pr 479 — план корректен; yarn consilium --secretary-file на живом протоколе — канон OK, сохранён.
Вердикт: LGTM
