# Промпт: office-vds-migration — переезд background-office на выделенный VDS

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1–2 PR** (OM1 — параметризация; OM3 — актуализация доков) + живой прод на новом VDS.
> Реестр: `id` = `office-vds-migration` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`@membrana/background-office` уже в проде с 2026-06-13 (эпик O1–O4, archived): общий VPS `72.56.27.58` (там же background-media и кабинет), домен `office.membrana.space`, Caddy + Let's Encrypt, Linear webhook live. Владелец арендует **выделенный VDS** (2 vCPU / 4 GB RAM / 40–60 GB NVMe — запас под будущий RAG-контур, триггер T3 из `DEPLOY.md`) и регистрирует **новый корневой домен**; office переезжает на `office.<новый-домен>`. Старый инстанс гасится после cutover. Fly-инстанс night-hunt (`membrana-office-night-hunt`) — отдельная площадка, миграцией **не затрагивается**.

Это **не** новая архитектура: весь канон деплоя есть и переиспользуется. Задача — параметризация под новый хост, повторный прогон канона, cutover.

**Решения владельца (2026-07-11):** профиль VDS с запасом под RAG · старый инстанс погасить после cutover · новый домен, office на субдомене.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`packages/background-office/DEPLOY.md`](../../packages/background-office/DEPLOY.md) | Канон двух площадок, матрица секретов, триггеры миграции |
| [`docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_DEPLOY.md) | Пошаговый VPS-чеклист O1–O4 (переиспользуется) |
| [`packages/background-office/README.md`](../../packages/background-office/README.md) | Эндпоинты, секреты, troubleshooting |
| [`docs/BACKGROUND_SERVERS.md`](../BACKGROUND_SERVERS.md) | Границы office ↔ media |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |

**GitHub Issue:** [#349](https://github.com/officefish/Membrana/issues/349).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (фазы)

**OM1 — параметризация deploy-артефактов под новый хост (PR):**

1. Домен вынести в параметр везде, где зашит `office.membrana.space`:
   - `deploy/Caddyfile.office.membrana.space` → генерируемый/шаблонный site block (домен из `OFFICE_DOMAIN`), имя файла без зашитого домена;
   - дефолты в `scripts/_ssh-office-tls-setup.mjs`, `_ssh-office-smoke.mjs`, `_ssh-office-check.mjs`, `_ssh-office-prod-up.mjs`, `_sync-office-env-from-root.mjs` — читать `OFFICE_DOMAIN` / `BACKGROUND_OFFICE_IPV4` / `BACKGROUND_OFFICE_PASSWORD` из корневого `.env` (ключи уже поддержаны — проверить, что нигде не остался fallback только на `BACKGROUND_MEDIA_*`).
2. Починить протухшие ветки в деплой-доках: `GIT_BRANCH=techies68` и `NIGHT_HUNT_BASE_BRANCH=techies68` → `main` (techies68 мертва; прецедент отката прода кабинета из-за протухшего дефолта — не повторять).
3. Актуализировать `DEPLOY.md` / `BACKGROUND_OFFICE_DEPLOY.md`: новый VDS = отдельный сервер (не «тот же VPS, что background-media»), таблица «данные для сеанса» параметрами, раздел Prod URL.

**OM2 — прогон канона O1–O4 на новом VDS (без PR, живые действия + лог):**

1. Подготовка сервера: Docker Engine 24+ + Compose v2, `git clone` в `/root/membrana` (ветка `main`).
2. `deploy/generate-office-env.sh /etc/membrana/office.env` → заполнить реальные ключи (`node scripts/_sync-office-env-from-root.mjs --restart`).
3. `./deploy/office-stack.sh build && up` → `curl http://127.0.0.1:3000/health` → 200.
4. DNS: A-record `office.<домен>` → IP нового VDS; `node scripts/_ssh-office-tls-setup.mjs --check-dns`, затем установка site block, LE-сертификат.
5. Smoke: `node scripts/_ssh-office-smoke.mjs` и `--external` — все проверки OK; `ss -tlnp` — :3000 только localhost.

**OM3 — cutover и гашение старого (PR на доки):**

1. Linear → Settings → API → Webhooks: URL на `https://office.<домен>/webhooks/linear`, новый signing secret → `office.env`, Test webhook → 200.
2. GitHub repo secrets: `OFFICE_URL`, `OFFICE_API_TOKEN` → новый хост (backup-workflow night-hunt).
3. Старый VPS 72.56.27.58: `./deploy/office-stack.sh down` (compose-проект `membrana-office`), media/кабинет не трогать; `office.caddy` site block убрать, caddy reload.
4. Доки: Prod URL, IP, домен, дата `DEPLOYED_AT`; запись о миграции.

---

**OM4 — релокация на non-RU хост (Казахстан), т.к. московский IP режется ТСПУ (пивот 2026-07-12):**

> **Причина пивота:** диагностика (WinMTR 3% loss на ICMP, DF-ping 1400B проходит, ssh kex timeout, MSS-clamp не помог) + **ответ саппорта Timeweb 2026-07-12**: с их стороны сервер доступен, IP режется **магистральными провайдерами** на входе в RU-сегмент (stateful TCP-data фильтр ТСПУ, ~74% потерь на data-path). Смена IP в том же ДЦ — гипотеза «блок на конкретный IP», НЕ гарантия (фильтр может быть на подсеть/AS/эвристику). Durable-фикс — вывод office из-под RU-магистрали. Дедлайн 15-е. office контейнеризирован (OM2 образ собран, `/health` OK через туннель) → переезд дешёвый.

Каждая под-фаза помечает: 🧑 = действие **человека-владельца** (панель провайдера, DNS, платёж), 🤖 = действие **агента** (скрипты/деплой/смоук).

**OM4-A — (опционально, параллельно) дешёвый выстрел: смена IP на московском VDS.**
- 🧑 **Чек-лист владельца:**
  - [ ] Панель Timeweb → [Network](https://timeweb.cloud/my/servers/8347521/network): отвязать старый IP `94.141.162.3`.
  - [ ] [Add-IP](https://timeweb.cloud/my/servers/8347521/add-ip): привязать новый IP (сервер ребутнётся).
  - [ ] **A-записи НЕ трогать** пока — сначала тест. Сообщить агенту новый IP + root-пароль.
- 🤖 Агент: прогнать data-path smoke на новый IP (тот же TCP-data тест, что падал) **до** правки DNS.
- **Гейт:** новый IP чист → можно остаться (сэкономили KZ-сервер); снова режет → **фильтр на подсеть/AS**, идём в OM4-B без сомнений. Не блокирует OM4-B.

**OM4-B — провижн KZ-сервера.**
- 🧑 **Чек-лист владельца:**
  - [ ] Арендовать VPS в KZ (профиль как в #349: **2 vCPU / 4 GB / 40–60 GB NVMe**, запас под RAG T3). Провайдеры: PS.KZ / Hoster.KZ (Алматы) или международный с KZ-PoP.
  - [ ] Получить: **IP**, **root-пароль**, выбрать **домен/субдомен** (`office.<домен>`).
  - [ ] Записать в корневой `.env`: `BACKGROUND_OFFICE_IPV4=`, `BACKGROUND_OFFICE_PASSWORD=`, `OFFICE_DOMAIN=office.<домен>`. **Секреты только в `.env`, не в git.**
  - [ ] Сообщить агенту: «KZ готов».
- 🤖 Агент: проверить SSH-доступ; прогнать data-path smoke с KZ IP — убедиться, что KZ вне фильтра **до** деплоя.

**OM4-C — деплой канона O1–O4 на KZ (переиспользование OM2).**
- 🤖 Агент: Docker 24+ / Compose v2; `git clone` (`main`) в `/root/membrana`; `deploy/generate-office-env.sh` + `_sync-office-env-from-root.mjs --restart`; `office-stack.sh build && up`; `curl 127.0.0.1:3000/health` → 200.
- 🧑 **Чек-лист владельца:**
  - [ ] Завести A-запись `office.<домен>` → KZ IP (сразу — DNS-пропагация до часов).
- 🤖 Агент: `_ssh-office-tls-setup.mjs --check-dns` → site block → LE-сертификат; `_ssh-office-smoke.mjs --external` все OK; `ss -tlnp` — :3000 только localhost.

**OM4-D — cutover + гашение московского.**
- 🧑 **Чек-лист владельца:**
  - [ ] Linear → Settings → API → Webhooks: URL → `https://office.<домен>/webhooks/linear`, сгенерить новый signing secret, **передать агенту** (не в git).
  - [ ] Подтвердить обновление GitHub repo secrets `OFFICE_URL` / `OFFICE_API_TOKEN` (или дать агенту доступ через `gh`).
  - [ ] После зелёного cutover — освободить/не продлевать московский VDS `72.56.27.58` / `8347521`.
- 🤖 Агент: webhook secret → `office.env`, Test webhook → 200 в логах; `gh secret set OFFICE_URL/OFFICE_API_TOKEN`; на московском `office-stack.sh down` (проект `membrana-office`) + снять office site block + caddy reload; **проверить, что background-media/кабинет живы** (health после down).

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| deploy-артефакты | `deploy/*office*`, `packages/background-office/docker*` | параметризация, никакой логики приложения |
| ssh-хелперы | `scripts/_ssh-office-*.mjs`, `_sync-office-env-from-root.mjs` | оркестрация с Windows; секреты только из `.env` |
| доки | `packages/background-office/{README,DEPLOY}.md`, `docs/deploy/*` | канон оператора |

**Запрещено:**

- Трогать код приложения office (`src/`) — миграция инфраструктурная.
- Секреты/IP/пароли в git (включая тело PR и коммиты); логи деплоя в корень репо (`%TEMP%` / `$TMPDIR`).
- Затрагивать background-media / кабинет на старом VPS.
- Включать RAG_REPO_ROOT / archive-контур — отдельная задача (диск заложен, не более).

---

### Тесты

| Область | Минимум |
|---------|---------|
| ssh-хелперы | существующие node-тесты скриптов зелёные; новые параметры покрыты (unit на разбор env, если появляется логика) |
| smoke | `_ssh-office-smoke.mjs` все OK на новом хосте, `--external` включительно |

---

### Definition of Done

- [ ] OM1 PR смёржен: домен/IP параметризованы, `techies68` из деплой-доков office убрана.
- [ ] `https://office.<домен>/health` → 200 извне; TLS валиден.
- [ ] Smoke: все проверки OK; unsigned webhook → 403; `/v1/*` без токена → 401; :3000 не публичен.
- [ ] Linear webhook на новом URL принят (Test → 200 в логах).
- [ ] GitHub secrets `OFFICE_URL` / `OFFICE_API_TOKEN` обновлены.
- [ ] Старый инстанс погашен; site block снят; media/кабинет живы (health-проверка после down).
- [ ] Доки актуализированы (OM3 PR); отчёт в Issue #349; `yarn task:archive office-vds-migration`.
- [ ] LGTM Teamlead.

**OM4 (пивот на KZ) — дополнительный DoD:**
- [ ] (опц.) OM4-A: вердикт по смене московского IP зафиксирован (чист/режет).
- [ ] OM4-B: KZ VPS арендован, `.env` заполнен, SSH + data-path smoke с KZ IP зелёные (KZ вне фильтра).
- [ ] OM4-C: `https://office.<домен>/health` → 200 **извне** с KZ; TLS валиден; :3000 не публичен.
- [ ] OM4-D: Linear webhook на KZ URL (Test → 200); GitHub secrets обновлены; московский `72.56.27.58`/`8347521` погашен; media/кабинет живы.

---

### Out of scope

- RAG-контур на сервере (`RAG_REPO_ROOT`, `OPENAI_API_KEY`) — отдельный спринт (T3).
- Миграция Fly night-hunt на VDS (триггеры в `DEPLOY.md` не сработали).
- Переезд background-media / кабинета на новый VDS.
- SSH-hardening нового VDS сверх текущего паттерна (root+password из `.env`) — зафиксировать как follow-up, не блокер.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — приёмка cutover-чеклиста, LGTM.
2. **Структурщик (Ozhegov)** — ведёт: параметризация, прогон O1–O4, гашение старого.
3. **Математик / Музыкант** — не задействованы.
4. **Верстальщик (Rodchenko)** — проверка Swagger/health извне, читаемость доков оператора.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Верстальщик]: …

Итоговый артефакт: живой office на новом VDS + OM1/OM3 PR
Definition of Done: см. чеклист выше
```

---

## Заметки для человека-постановщика

1. **Блокер старта OM2:** от владельца нужны — IP нового VDS, root-пароль (в корневой `.env`: `BACKGROUND_OFFICE_IPV4`, `BACKGROUND_OFFICE_PASSWORD`), имя домена (`OFFICE_DOMAIN`). OM1 можно делать до этого.
2. DNS-пропагация может занять до часов — заводить A-record сразу после аренды.
3. После merge: отчёт в Issue #349 → `yarn task:archive office-vds-migration --notes "…"`.
4. **Пивот на KZ (OM4, 2026-07-12):** московский VDS фундаментально режется ТСПУ (подтверждено саппортом). Блокер старта OM4-C — тот же `.env` (IP/пароль/домен), но уже **KZ-сервера**. OM4-A (смена московского IP) опциональна и параллельна — можно пропустить и сразу KZ. Дедлайн 15-е.

### Проверка после PR

```bash
node scripts/_ssh-office-check.mjs
node scripts/_ssh-office-smoke.mjs --external
curl -s https://office.<домен>/health
```

---

## Связь с дорожной картой

- Инфраструктурная гигиена вне детекционной магистрали (S2/S3 не блокирует и не ждёт).
- Готовит площадку под RAG archive-контур (T3, deferred до `OPENAI_API_KEY`).
