# deploy/affine — шаблон AFFiNE self-host (strategy.mmbrn.tech)

Шаблон **без секретов** для office VDS. Живые данные и `.env` — только на хосте
`/opt/membrana-affine/` (см. [`docs/deploy/STRATEGY_AFFINE_DEPLOY.md`](../../docs/deploy/STRATEGY_AFFINE_DEPLOY.md)).

| Файл | Назначение |
|------|------------|
| `compose.yml` | Pin upstream AFFiNE self-host + bind `127.0.0.1` + memory limits |
| `.env.example` | Поля для `/opt/membrana-affine/.env` (пароль пустой) |

## Install (агент / ops)

```bash
yarn affine:capacity-gate          # must print [go]
yarn panel:dns-gate --domain strategy.mmbrn.tech --expect 176.124.218.4
yarn affine:install                # → node scripts/_ssh-affine-install.mjs
```

После up: первый **admin** создаёт владелец в UI `https://strategy.mmbrn.tech`
(агент admin bootstrap не делает — W2/W3 owner checklist).

## Backup path (W3)

| Путь | Назначение |
|------|------------|
| `/opt/membrana-affine/postgres/` | Postgres data |
| `/opt/membrana-affine/storage/` | blobs |
| `/opt/membrana-affine/config/` | private key / config |
| `/opt/membrana-affine/backups/YYYY-MM-DD/` | снимки (`pg_dump` + tar storage/config) |

Процедура и post-W2 размеры — [`STRATEGY_AFFINE_DEPLOY.md`](../../docs/deploy/STRATEGY_AFFINE_DEPLOY.md) § Backup volumes.
Surface UI: https://strategy.mmbrn.tech · panel раздел «Стратегия».
