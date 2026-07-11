# Office VDS deploy — фильтрованная сеть (runbook)

> Находки миграции `office-vds-migration` ([#349](https://github.com/officefish/Membrana/issues/349), 2026-07-11):
> деплой `@membrana/background-office` на выделенный VDS **94.141.162.3 (Timeweb, Москва)**,
> домен **office.mmbrn.tech**. Собран урок «сервер за сетевым фильтром провайдера».
>
> Базовый чеклист O1–O4: [`BACKGROUND_OFFICE_DEPLOY.md`](./BACKGROUND_OFFICE_DEPLOY.md).
> Этот файл — про **нештатные** барьеры и обходы, всплывшие на чистом MSK-VDS.

---

## 0. TL;DR — что оказалось не так

| Симптом | Корень | Фикс |
|---------|--------|------|
| SSH: TCP есть, баннера нет / зависает | провайдерский фильтр входящего **data-path** к MSK-VDS | reverse-tunnel через media-VPS (NL) |
| `entrypoint.sh: not found` в build | `.dockerignore` исключал весь `background-office` (кроме README) | `!packages/background-office/**` |
| corepack/yarn: timeout к `repo.yarnpkg.com` | docker-bridge NAT блэкхолит крупные TLS-пакеты к Cloudflare | `build.network: host` в prod-compose |
| `429 Too Many Requests` на `node:20-alpine` | анонимный лимит Docker Hub с общего egress-IP + buildkit HEAD | legacy-билдер (`DOCKER_BUILDKIT=0`) из локального образа |
| `@membrana/rag-service: Workspace not found` | office оброс workspace-депом (rag-r4), артефакты отставали | rag в `.dockerignore` whitelist + `Dockerfile` COPY (build+runtime) |
| Let's Encrypt HTTP-01 **и** TLS-ALPN «Timeout after connect» | входящий data-path режется **со всего интернета** | **⛔ фикс только на стороне Timeweb** |

## 1. Диагностика фильтра (воспроизведение)

Ключевой признак: **TCP-хендшейк проходит, пакеты с данными после connect дропаются**.

- `check-host.net/check-tcp?host=IP:22|80|443` — «доступно» отовсюду (только SYN/ACK, без данных → обманчиво).
- `tcpdump -ni eth0 'tcp port 22'` на сервере: сервер шлёт SSH-баннер и **ретранслит 9× без ACK**; чужие боты при этом проходят авторизацию целиком (фильтр избирателен по источнику).
- Let's Encrypt: и HTTP-01 (крошечный GET), и TLS-ALPN-01 = «Timeout after connect» → **не MTU** (MSS-clamp 1200 + MTU 1400 не помогли).
- В панели Timeweb: DDoS-защита и firewall **выключены** — фильтр невидим в UI, живёт на edge/скраббинге.

**Вывод:** публичный HTTPS и приём вебхуков невозможны, пока Timeweb не снимет фильтр. Туннель спасает **только админ-доступ**, не публичный трафик. → тикет в поддержку.

## 2. Обход для админ-доступа (reverse-tunnel через media)

Media-VPS в NL имеет чистый маршрут. Office сам исходящим соединением строит обратный туннель:

```bash
# на office (исходящее — работает): ключ office → media authorized_keys, затем
ssh -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -N \
  -R 127.0.0.1:2223:localhost:22 root@<MEDIA_IP>
# закреплено systemd-юнитом media-reverse-tunnel (Restart=always) на office
```

Локально: `scripts/_ssh-office-local-forward.mjs` слушает `127.0.0.1:2224` → media → office:22.
В корневом `.env`: `BACKGROUND_OFFICE_SSH_HOST=127.0.0.1`, `BACKGROUND_OFFICE_SSH_PORT=2224` —
все `_ssh-office-*` скрипты ходят через туннель прозрачно (см. `scripts/_ssh-office-config.mjs`).

## 3. Сборка образа на фильтрованном/лимитированном хосте

```bash
# 1) база в хранилище демона (обход buildkit-HEAD 429), retry сквозь лимит:
docker pull node:20-alpine     # повторять при 429 — лимит циклический
# 2) legacy-билдер использует локальную базу без обращения к реестру:
DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 ./deploy/office-stack.sh build
./deploy/office-stack.sh up
curl -fsS http://127.0.0.1:3000/health   # {"status":"ok",...}
```

`build.network: host` (в `deploy/background-office.prod.compose.yml`) обязателен: docker-bridge
NAT на этом канале душит крупные TLS-пакеты к Cloudflare (yarn download), хост-сеть — нет.

## 4. OM3 (после фикса сети Timeweb)

1. Реальные ключи: `node scripts/_sync-office-env-from-root.mjs --restart` (сейчас `office.env` = `REPLACE_BEFORE_PROD`).
2. TLS: `node scripts/_ssh-office-tls-setup.mjs` — LE выпустит сертификат, **когда входящий :80/:443 заработает**.
3. Linear webhook → `https://office.mmbrn.tech/webhooks/linear`; GitHub secrets `OFFICE_URL`/`OFFICE_API_TOKEN`.
4. Гашение старого: `./deploy/office-stack.sh down` (проект `membrana-office` на 72.56.27.58) + снять `office.caddy` (media/кабинет **не трогать**).
5. Откатить диагностические твики на VDS: docker `daemon.json` mtu, eth0 mtu, iptables MSS-clamp, порт 2222 — если сеть починена, они не нужны.

## 5. Границы

- Обходной туннель — **админ-only**. Продовый публичный трафик обязан идти напрямую.
- `_ssh-office-tunnel-*` / `_ssh-media-*` скрипты — одноразовые, gitignored, локальные.
- Не тащить эти обходы в media/cabinet-деплой — там сеть чистая (NL).
