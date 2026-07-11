---
name: membrana-office-vds-deploy
description: >-
  Deploy @membrana/background-office to the dedicated MSK VDS (office.mmbrn.tech) behind a
  provider network filter. Use when deploying/redeploying office to the VDS, debugging "SSH
  connects but hangs", Let's Encrypt "Timeout after connect", docker build 429 / Cloudflare
  yarn timeout / rag Workspace-not-found, or finishing OM3 cutover. Do NOT use for
  media/cabinet deploy (clean NL network) or choosing which background server to extend
  (membrana-background-servers).
---

# Office VDS deploy (filtered network)

Канон-runbook: [`docs/deploy/OFFICE_VDS_FILTERED_NETWORK_RUNBOOK.md`](../../../docs/deploy/OFFICE_VDS_FILTERED_NETWORK_RUNBOOK.md).
Базовый O1–O4: [`docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`](../../../docs/deploy/BACKGROUND_OFFICE_DEPLOY.md).
Спринт: [`docs/prompts/OFFICE_VDS_MIGRATION_PROMPT.md`](../../../docs/prompts/OFFICE_VDS_MIGRATION_PROMPT.md) · Issue #349.

## When to use

- Деплой/редеплой office на выделенный VDS **94.141.162.3 / office.mmbrn.tech**.
- Диагноз «SSH подключается, но виснет», LE «Timeout after connect», build 429 / yarn-Cloudflare timeout / rag Workspace-not-found.
- Финализация OM3 после того, как Timeweb снимет сетевой фильтр.

## Диагностический признак фильтра (запомнить)

**TCP-хендшейк проходит, пакеты с данными после connect дропаются.** check-host покажет
«доступно» (только SYN), но LE HTTP-01 **и** TLS-ALPN таймаутят «after connect», а `tcpdump`
на сервере — 9× ретрансмит SSH-баннера без ACK. **Не MTU** (MSS-clamp не помогает).
Панель Timeweb чиста (DDoS/firewall off) → фильтр на edge → **фикс только у Timeweb** (тикет).

## Админ-доступ (обход, не для прод-трафика)

Reverse-tunnel office→media(NL), закреплён systemd `media-reverse-tunnel`. Локально:

```bash
node scripts/_ssh-office-local-forward.mjs   # 127.0.0.1:2224 → media → office:22 (держать)
# .env: BACKGROUND_OFFICE_SSH_HOST=127.0.0.1, BACKGROUND_OFFICE_SSH_PORT=2224
node scripts/_ssh-office-inventory.mjs        # смоук доступа через туннель
```

## Сборка на фильтрованном хосте

```bash
docker pull node:20-alpine    # retry сквозь 429 (циклический лимит)
DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 ./deploy/office-stack.sh build && ./deploy/office-stack.sh up
curl -fsS http://127.0.0.1:3000/health
```

Обязательно в prod-compose: `build.network: host` (bridge NAT душит TLS к Cloudflare).
rag-service должен быть в build-контексте (`.dockerignore` whitelist + Dockerfile COPY build+runtime).

## OM3 (после фикса Timeweb)

1. `node scripts/_sync-office-env-from-root.mjs --restart` (реальные ключи).
2. `node scripts/_ssh-office-tls-setup.mjs` (LE выпустит, когда :80/:443 заработают).
3. Linear webhook → `office.mmbrn.tech`; gh-secrets `OFFICE_URL`/`OFFICE_API_TOKEN`.
4. Down старого `membrana-office` на 72.56.27.58 + снять `office.caddy` (media/кабинет не трогать).
5. Откатить диагностические твики VDS (mtu/iptables MSS/порт 2222).

## Границы

Туннель — **админ-only**; публичный трафик идёт напрямую. Обходы не тащить в media/cabinet.
`_ssh-office-tunnel-*` / `_ssh-media-*` — одноразовые, gitignored.

## Output

Сказать: какой шаг (доступ / сборка / TLS / OM3), что сделано, где блок (обычно — фильтр Timeweb).
