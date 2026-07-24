# Промпт: W2 — wires atlas render + CI

> **M** · `dmd-w2-wires` · [#1124](https://github.com/officefish/Membrana/issues/1124) · parent `dual-mintlify-docs` · lead **ozhegov**  
> Эпик: [`DUAL_MINTLIFY_DOCS_PROMPT.md`](./DUAL_MINTLIFY_DOCS_PROMPT.md).

## Промпт целиком

1. `yarn tooling:atlas --render` (и связанный mintlify-path в `scripts/tooling-atlas.mjs` /
   verify): целевой путь страницы контейнеров —
   `apps/docs-harness/tooling/containers.mdx` (не `apps/docs/tooling/...`).
2. Обновить любые хардкоды / docs notes, что атлас публикуется из harness workspace.
3. CI / scripts:
   - `verify-mintlify-docs` (или обёртки) гоняет **оба** корня;
   - `yarn workspace @membrana/docs build` + `@membrana/docs-harness build` в пайплайне
     или turbo filter — без регрессии product-only.
4. Тесты скриптов (`tooling-atlas.test.mjs`, `verify-mintlify-docs` если есть) —
   путь harness.
5. Не публиковать agent-truth наружу; только уже публичный atlas digest.

## DoD

- [x] `--render` пишет в harness mintlify path
- [x] CI / verify покрывает оба docs.json
- [x] Тесты зелёные; product verify не ждёт harness pages в apps/docs
