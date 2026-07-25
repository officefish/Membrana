# main-fill / workspace-level — §8.3

Движки (плоский `scripts/`, не в контейнере):

| Модуль | Роль |
|--------|------|
| [`membrana-leveling-gate.mjs`](../../../scripts/lib/membrana-leveling-gate.mjs) | гейт K4: корзины → Named(T) ∧ Registered(U) ∧ Filled(R) |
| [`membrana-leveling-main-fill.mjs`](../../../scripts/lib/membrana-leveling-main-fill.mjs) | поезд ready→main (`pr:ship`-сериализация, ship inject) |
| [`membrana-leveling-report.mjs`](../../../scripts/lib/membrana-leveling-report.mjs) | `buildWorkspaceLevelReport` = f(gate-output) |
| [`membrana-leveling-scratch.mjs`](../../../scripts/lib/membrana-leveling-scratch.mjs) | T13 времянки вне repo, WIP-антипаттерн |

## CLI

```bash
yarn membrana-leveling:main-fill --units units.json          # dry-run plan
yarn membrana-leveling:workspace-level --snapshot snap.json --ship-ok --out report.md
```

Реальный merge через CLI **не** делается молча: нужен inject `shipOne` / флаг `--ship-ok`
(орхистратор вечера подключает `pr:ship`).

## Гейт STOP

| reason | Когда |
|--------|--------|
| `unnamed-trash` | T без акта именования |
| `unregistered-unfinished` | U без карточки T7 / WIP-only |
| `main-fill-failed` | поезд вернул failed |
