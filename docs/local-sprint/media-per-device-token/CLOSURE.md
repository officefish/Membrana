# Membrana Local Sprint CLOSURE: media-per-device-token

| Поле | Значение |
|------|----------|
| Sprint | `media-per-device-token` |
| Procedure | `membrana-local-sprint` |
| Cut | [`docs/sprint/cut/media-per-device-token.json`](../../sprint/cut/media-per-device-token.json) |
| Trace | [`docs/sprint/trail/media-per-device-token.jsonl`](../../sprint/trail/media-per-device-token.jsonl) |
| Gate | PASS, 5/5 honest pairs |
| Experience | `vesnin-media-per-device-token-cut-2`, outcome `hit` |

## Итог

ADR-0028 Р1+Р2 реализованы без смены формы `PairResponse`: поле `mediaToken`
по-прежнему строка, но теперь содержит per-device client audience key, а не
служебный `MEDIA_API_TOKEN`.

Сделано:

- Media `NodeKey` получил `audience: node | client`, мягкий отзыв и раздельный active key
  по `deviceId + audience`.
- Media выдаёт raw client key при регистрации device и через служебный endpoint re-pair.
- Device-scoped client media surfaces принимают client audience key в `X-Membrana-Token`
  и сохраняют проверку device-boundary через `DeviceGuard`.
- Cabinet `PairService.pair` возвращает client key вместо служебного token.
- Revoke paired access key в cabinet каскадно вызывает media revoke для client key.

Вне scope осталось нетронутым: Р3 service-token rotation, Р4 client safeStorage,
`apps/client`, prod deploy, форма `PairResponse`.

## Проверки

- PASS: `node scripts/sprint-cut-check.mjs --plan docs/sprint/cut/media-per-device-token.json`
- PASS: `node scripts/execution-gate.mjs --plan docs/sprint/cut/media-per-device-token.json --traces docs/sprint/trail/media-per-device-token.jsonl --now 2026-08-20T17:52:00+03:00 --json`
- PASS: `node scripts/sprint-experience.mjs --plan docs/sprint/cut/media-per-device-token.json --traces docs/sprint/trail/media-per-device-token.jsonl --segments docs/local-sprint/media-per-device-token/SEGMENTS.json --now 2026-08-20T17:53:00+03:00 --json`
- PASS: focused vitest ADR-0028 files, 4 files / 16 tests.
- PASS: `tsc --noEmit -p packages/background-cabinet/tsconfig.json`.
- PASS: `git diff --check`.

Named existing gap:

- `tsc --noEmit -p packages/background-media/tsconfig.json` remains blocked by local
  workspace package resolution (`@membrana/wav-decode`, `@membrana/plugin-contracts`,
  `@membrana/plugin-handlers`). After `prisma generate`, no ADR-0028 Prisma type error remains.
- Broad backend vitest without `.worktrees/**` exclusion has the same workspace resolution gap
  for the media first-wave/plugin/audio suites; focused ADR-0028 tests pass.
