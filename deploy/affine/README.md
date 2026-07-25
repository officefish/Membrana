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

## Backup path

`/opt/membrana-affine/backups/YYYY-MM-DD/` — детализация dump в W3.
Volumes: `postgres/`, `storage/`, `config/`.
