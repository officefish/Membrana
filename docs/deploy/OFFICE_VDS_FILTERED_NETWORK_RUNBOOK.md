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

Локально форвардер поднимается штатным ssh-клиентом (скрипта-обёртки **нет** —
`_ssh-office-local-forward.mjs` не существует, был замыслом):

```bash
ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:2224:127.0.0.1:2223 root@<MEDIA_IP>
```

Затем в корневом `.env` расскомментировать `BACKGROUND_OFFICE_SSH_HOST=127.0.0.1` и
`BACKGROUND_OFFICE_SSH_PORT=2224` — все `_ssh-office-*` скрипты пойдут через туннель
прозрачно (см. `scripts/_ssh-office-config.mjs`).

> **Состояние на 2026-07-15:** туннель **не используется** — обе строки в `.env`
> закомментированы, прямой SSH на `BACKGROUND_OFFICE_IPV4:22` работает (проверено
> `yarn office:ssh 'hostname'` → `msk-mmbrn-office`). Раздел держим как fallback на
> случай, если фильтр провайдера снова закроет прямой маршрут.

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

## 5. scheduled-code-anchor (DA4, #404) — ежесуточный дрейф-джоб на хосте

Пересборка детекторов из `main` + прогон корпуса free-v1 → `DriftAnchorRecord(source=schedule)`;
ловит «Прод ≠ main» в паре с CI-записью. **Не** в docker-образе office-приложения —
отдельный полный клон монорепы на хосте (server-first, решение владельца 2026-07-12).

```bash
# однократная установка на office (новый IP 176.124.218.4, data-path чист):
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs && corepack enable && corepack prepare yarn@4.5.0 --activate
mkdir -p /opt/membrana-drift && cd /opt/membrana-drift
git clone https://github.com/officefish/Membrana.git
cd Membrana && yarn install --immutable                       # см. swap-ловушку ниже; сеть чиста, см. §3
crontab -l 2>/dev/null | { cat; echo '15 0 * * * /opt/membrana-drift/Membrana/deploy/office-drift-code-cron.sh >> /var/log/membrana-drift-code.log 2>&1'; } | crontab -
```

**Ловушка (2026-07-13): `yarn install` на голом хосте убит OOM (exit 137).** VDS — 3.8 GiB RAM,
`swapon --show` пуст (докер-контейнеры это скрывают, голый node-процесс — нет). Фикс —
разовый 2 GiB swapfile **до** `yarn install`, персистентно (переживает ребут):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

После свопа install прошёл штатно (717 пакетов, ~3.5 мин, exit 0). `cpu-features@0.0.10`
(нативный опциональный модуль `ssh2`, build-only) падает на этом хосте — не блокер, детекторный
путь его не использует.

Джоб: [`deploy/office-drift-code-cron.sh`](../../deploy/office-drift-code-cron.sh) —
`git reset --hard origin/main` → `yarn install --immutable` → `yarn drift:code:schedule`.
Exit 2 (broken) виден в cron-логе. Записи журнала: `docs/reports/drift-anchor/records/` (клона).

**Живая проверка 2026-07-13:** ручной прогон на office дал `verdict=ok, delta=0` — F1 всех
5 детекторов **совпали с локальным прогоном до знака** (детерминизм подтверждён на другом хосте,
не только повтором на одной машине). Cron установлен (`systemctl is-active cron` → active),
первый автозапуск — 00:15 UTC / 03:15 МСК.

**data-anchor (ADR 0004, владелец 2026-07-13):** тот же прогон дополнительно тянет
`__tariff_dataset__` с background-media (canary-устройство, `docs/anchors/data-anchor-canary-device.json`)
и сравнивает F1 с тем же baseline — целостность провижининга, не реальный акустический дрейф
(осознанное сужение владельцем). Требует **дополнительной строки** в `$OFFICE_TOKEN_FILE`
(`/etc/membrana/office.env`):

```bash
echo 'MEDIA_API_TOKEN=<тот же токен, что VITE_MEDIA_API_TOKEN в корневом .env>' >> /etc/membrana/office.env
```

Без этой строки `office-drift-code-cron.sh` пропускает data-anchor (optional, лог-строка,
не падает). Живой прогон 2026-07-13 против прод-media (`https://media.membrana.space`) дал
`verdict=ok, delta=0, samples=120/120` — провизионированный корпус byte-идентичен git-канону.

## 6. Границы

- Обходной туннель — **админ-only**. Продовый публичный трафик обязан идти напрямую.
- `_ssh-office-tunnel-*` / `_ssh-media-*` скрипты — одноразовые, gitignored, локальные.
- Не тащить эти обходы в media/cabinet-деплой — там сеть чистая (NL).
