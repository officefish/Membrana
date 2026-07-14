# Деплой панели panel.mmbrn.tech (OP4, эпик #438)

> Консилиум: [`office-panel-contour-2026-07-14.md`](../seanses/office-panel-contour-2026-07-14.md).
> Топология: static SPA (`apps/panel` → dist) + `reverse_proxy /v1/*` → office-api
> (127.0.0.1:3000) на том же MSK-VDS (176.124.218.4), Caddy терминирует TLS.
> Уроки сети VDS — скилл `membrana-office-vds-deploy` (bridge NAT, LE rate-limit).

## Предусловия (owner-гейты)

1. **DNS**: A-запись `panel.mmbrn.tech → 176.124.218.4` (тот же VDS, что office).
2. **Секреты панели** в `/etc/membrana/office.env` (office-api читает их из env):
   - `PANEL_SESSION_SECRET` — обязателен (подпись cookie/state/invite);
   - `PANEL_INVITE_SECRET` — опционально (иначе = session-секрет);
   - `PANEL_GITHUB_CLIENT_ID` / `PANEL_GITHUB_CLIENT_SECRET` — GitHub OAuth App
     (Authorization callback URL: `https://panel.mmbrn.tech/v1/panel/auth/github/callback`);
   - `PANEL_GITHUB_ALLOWLIST` — JSON `{"<github_user_id>":"owner"}`;
   - `PANEL_PUBLIC_URL=https://panel.mmbrn.tech`.
3. Office-api на VDS обновлён до версии с модулем panel-auth (обычный редеплой
   по [`BACKGROUND_OFFICE_DEPLOY.md`](./BACKGROUND_OFFICE_DEPLOY.md)).

## Быстрый путь (скрипт, живой прогон 2026-07-14)

```bash
yarn panel:dns-gate --expect 176.124.218.4         # обязателен: [go]
yarn turbo run build --filter=@membrana/panel
node scripts/_ssh-panel-deploy.mjs                  # секреты+статика+Caddy (см. шапку скрипта)
# если PANEL_* добавились впервые — пересоздать office-контейнер:
#   ssh → cd /root/membrana && ./deploy/office-stack.sh up   (env читается при создании!)
yarn panel:invite --label smoke --days 1            # код → вход на витрине → роль «союзник»
```

Скрипт генерирует `PANEL_SESSION_SECRET`/`PANEL_INVITE_SECRET` (в локальный `.env`
и `/etc/membrana/office.env`, значения не печатает), НЕ трогает `PANEL_GITHUB_*`
(OAuth App создаёт владелец) и добавляет import Caddyfile.d только если его нет
в ЛЮБОЙ форме (живой урок: двойной import → «ambiguous site definition»).

## Шаги

### 1. DNS-гейт (обязателен ДО выпуска сертификата)

```bash
yarn panel:dns-gate --expect 176.124.218.4
# [go] → продолжать; [no-go] → ЖДАТЬ консистентности, Caddy не трогать
```

### 2. Сборка SPA и выгрузка на VDS

```bash
yarn turbo run build --filter=@membrana/panel
# dist → /opt/membrana-panel/dist (rsync/scp; каталог создать при первом деплое)
scp -r apps/panel/dist/* root@176.124.218.4:/opt/membrana-panel/dist/
```

### 3. Caddy site-block

Отрендерить [`deploy/Caddyfile.panel.template`](../../deploy/Caddyfile.panel.template)
(`{{PANEL_DOMAIN}}` → `panel.mmbrn.tech`) → `/etc/caddy/Caddyfile.d/panel.caddy`
(рядом с `office.caddy`, паттерн `scripts/_ssh-office-tls-setup.mjs`), затем:

```bash
caddy validate --config /etc/caddy/Caddyfile   # прежде чем reload
systemctl reload caddy                          # LE выпустится сам (после гейта!)
```

### 4. Smoke (DoD фазы)

```bash
curl -sI https://panel.mmbrn.tech | head -3                      # 200, text/html
curl -s https://panel.mmbrn.tech/v1/panel/auth/me                # {"role":"public","sub":null}
curl -sI https://panel.mmbrn.tech/v1/panel/auth/me | grep -i cache  # no-store
curl -s -o /dev/null -w '%{http_code}' https://panel.mmbrn.tech/v1/panel/auth/whoami-operator  # 401
yarn panel:invite --label smoke --days 1  # → код → вход на витрине → роль «союзник»
```

## Обновление панели (после первого деплоя)

`yarn turbo run build --filter=@membrana/panel` → rsync dist → Caddy трогать не нужно
(статика). Обновление API — обычный редеплой office.

### Аудио-бандл борда detector-compare (#452)

JSON-артефакт (`/compare-data/latest.json`) попадает в dist при build; wav-бандл —
ВНЕ git, копируется из локального бенчмарк-корпуса при деплое (при обновлении
корпуса/артефакта повторить):

```bash
yarn detector:compare:export --audio-out /tmp/compare-audio && scp -r /tmp/compare-audio/* root@176.124.218.4:/opt/membrana-panel/dist/compare-audio/
```

## Анти-паттерны

- Выпускать LE без `panel:dns-gate` = [go] — повторение ожога OM4-C.
- Открывать office-api наружу напрямую (bind остаётся 127.0.0.1; наружу только Caddy).
- Класть dist внутрь контейнера office — панель обновляется независимо от API.
- **Доверять правам после scp с Windows** (живой урок 2026-07-14, деплой #457):
  OpenSSH-scp создаёт каталоги с `700` — caddy (не root) не читает, `try_files`
  молча отдаёт index.html вместо статики (ломаются и /assets). После scp всегда:
  `ssh root@176.124.218.4 "chmod -R a+rX /opt/membrana-panel/dist"`.
