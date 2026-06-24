# Промпт: продовый деплой `background-office` (домен, DNS, HTTPS, хостинг)

> **Устарело как монолитная задача.** Исполнение разбито на эпик O1–O4:
> [`BACKGROUND_OFFICE_V1_EPIC_PROMPT.md`](./BACKGROUND_OFFICE_V1_EPIC_PROMPT.md).
> Этот файл остаётся справочником по PaaS/VPS, секретам и Linear webhook.

---

## Контекст этого документа

Membrana — проект пространственной разведки нижнего неба (см.
[`../WHITE_PAPER.md`](../WHITE_PAPER.md)). К моменту, когда этот промпт
исполняется, в проекте уже есть:

- Пакет `packages/background-office/` — централизованный HTTP-сервер на Node.js
  + TypeScript (см. [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md)).
  Локально запускается на `localhost:3000`, `GET /health` отвечает `200`.
- Журнал бутстрапа этого сервера: [`../discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md).
- Все секреты пока живут в локальном `.env` исполнителя; модель секретов
  в фазе уточнения (см. журнал, этап 2 — отложено).

**Чего не хватает.** Сервер не доступен снаружи. Это означает:

- Linear не может направить webhook на наш `/webhooks/linear`.
- GitHub-webhook'и в v0.2 направлять некуда.
- Любой клиент Membrana (apps/client / GitHub Action / cron / другой агент)
  не может ходить в `/v1/*` без локального туннеля.

Этот промпт устраняет именно это: **домен + DNS + HTTPS + хостинг + секреты
в env провайдера**, после чего `https://<domain>/health` работает из любой
точки интернета.

---

## Промпт целиком (для вставки агенту)

> Всё, что ниже до раздела «Заметки для человека-постановщика», — это
> **промпт для агента**. Можно копировать без правок.

---

### Кто ты

Ты — **DevOps-инженер виртуальной команды Membrana**. Действуешь в характере
роли **Vesnin** (Teamlead): см. `docs/virtual-team/PROMPT_TEAMLEAD.md`.
Принцип конструктивизма «**форма следует функции, каждая деталь оправдана
конструкцией, декора без смысла не существует**» применяется и к инфре: никаких
«потому что у всех так», только обоснованные решения. Никаких преждевременных
оптимизаций (multi-region, autoscaling, мульти-окружения) в v0.1.

### Что построить

Продовая среда для `packages/background-office/` с следующими свойствами:

1. **Домен** уровня вроде `membrana.<tld>` зарегистрирован на проект (а не
   на личный аккаунт разработчика, насколько возможно).
2. **DNS** настроен у провайдера (рекомендуется отделить регистратора от
   DNS-провайдера: Cloudflare как DNS — бесплатно, гибко, имеет анти-ботовую
   защиту из коробки).
3. **HTTPS** — действующий TLS-сертификат (Let's Encrypt либо managed-cert
   у PaaS), auto-renew настроен. **Никакого HTTP в проде**, все запросы
   редиректятся на HTTPS.
4. **Хостинг** — обоснованно выбранный PaaS либо VPS, на котором запускается
   процесс Node.js из `packages/background-office/`. Решение зафиксировано в
   `packages/background-office/README.md` (`## Deployment`) с короткой
   аргументацией.
5. **Секреты** — `ANTHROPIC_API_KEY`, `API_INTERNAL_TOKEN`, `LINEAR_API_KEY`,
   `LINEAR_WEBHOOK_SECRET` и любые GitHub-credentials (формат зависит от
   выбора PAT vs GitHub App — см. отложенный PR #17) хранятся **в dashboard
   хостинг-провайдера**, в репозитории нет ничего, кроме `.env.example`.
6. **Боевой `https://<domain>/health` → 200** при `curl` из любой сети.
7. **Боевой Linear webhook** — создан в Linear Settings → API → Webhooks с URL
   `https://<domain>/webhooks/linear`, signing secret скопирован в env хостинга,
   тестовый event приходит и возвращает `200`.

### Документы, которые обязательно прочитать перед стартом

1. [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md) —
   спецификация самого сервера, что он умеет, какие env переменные ждёт,
   какие эндпоинты выставляет.
2. [`../discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md) —
   журнал бутстрапа: что уже сделано, какие решения отложены, текущее
   состояние пакета.
3. [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — границы пакетов; деплой
   касается только `packages/background-office/`, никаких других пакетов не
   трогаем.
4. [`../TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) — методология; этот
   ticket — продолжение `MEM-API-1` (бутстрап).
5. [`../WHITE_PAPER.md`](../WHITE_PAPER.md) — стратегическая цель, чтобы
   понимать, что мы тут не строим e-commerce на 100k RPS, а делаем сервис
   для внутренней команды и редких webhook-событий от Linear.

### Технические рамки

#### Выбор хостинга — PaaS vs VPS

Сравнение **должно** быть оформлено как таблица в `README.md` пакета (раздел
`## Deployment`). Минимум — три кандидата с явным «за / против» и финальный
выбор. Шаблон таблицы (значения — на твой ресёрч, не копируй):

| Платформа | Тип | За | Против | Стоимость v0.1 |
|-----------|-----|----|--------|----------------|
| Fly.io | PaaS, container | edge-локации, простой `fly deploy`, бесплатный tier | ограничения cold-start, биллинг по машинам | $0–5/мес |
| Render | PaaS, container | managed TLS, autodeploy из GitHub, простой UI | бесплатный tier спит после 15 мин неактивности | $0–7/мес |
| DigitalOcean App Platform | PaaS, container | стабильность, хорошие логи | дороже базового tier на ~$5 | $5–12/мес |
| Hetzner CX22 | VPS | дёшево (~€4/мес), полный контроль | надо самому ставить nginx + Let's Encrypt + systemd | €4/мес + время |

Рекомендация по умолчанию: **PaaS** (Fly.io или Render — на твой выбор),
потому что v0.1 — это «один маленький Node-процесс с редкими webhook'ами» и
никакой нагрузки. VPS оправдан, только если есть конкретная причина (например,
будем добавлять локальный диск под cache, или сторонний софт).

**Не выбирай Cloudflare Workers** — наш сервер использует Node API
(`crypto.timingSafeEqual`, `fs`, длинные TCP keep-alives к Anthropic);
Workers Runtime несовместим.

#### Домен и DNS

- **Регистратор.** Рекомендуется Cloudflare Registrar (если зона `.com` / `.dev`
  / `.app`) — at-cost, без скрытых наценок. Альтернатива — Porkbun, Namecheap.
  **Не GoDaddy** (платный приватный whois, переадресации, апселлы).
- **Имя.** Должно быть про проект, не про автора. Варианты на выбор:
  - `membrana.dev` (если свободно — приоритет 1, dev-сообщество).
  - `membrana.app` (приоритет 2).
  - `membrana.cloud` (приоритет 3).
  - `<owner>-membrana.com` — только как fallback, если все целевые TLD заняты.
- **DNS-провайдер.** Cloudflare (бесплатный план), даже если регистратор
  другой. Преимущества: DNSSEC, скорость, защита от ботов, dashboard для CAA.
- **Записи v0.1:**
  - `A` / `AAAA` или `CNAME` → endpoint хостинга (зависит от PaaS).
  - `CAA` для Let's Encrypt: `0 issue "letsencrypt.org"` — запрещает
    выпуск сертификатов любым другим CA.
  - **Отдельный subdomain под сервер.** Не `membrana.dev` напрямую, а
    `api.membrana.dev` (или `office.membrana.dev`). Корневой домен остаётся
    под landing page / будущий UI.
- **MX-записи** — пусто (пока не нужен email). Намеренно: при пустых MX
  спам-боты не пытаются делать SMTP-handshake.

#### HTTPS

- **PaaS-вариант.** Managed-cert у платформы — настраивается одним
  переключателем в UI. Auto-renew — на стороне платформы.
- **VPS-вариант.** Caddy (рекомендуется) либо nginx + certbot. Caddy умеет
  Let's Encrypt из коробки, конфиг короче. Если выбран nginx — обязательно
  настроить `certbot renew` в systemd timer и убедиться, что таймер активен
  (`systemctl list-timers`).
- **Минимальный TLS — 1.2.** TLS 1.0/1.1 запрещены. Проверь итог через
  [SSL Labs](https://www.ssllabs.com/ssltest/) — должен быть **A** или **A+**.
- **HSTS.** Включить заголовок `Strict-Transport-Security: max-age=31536000;
  includeSubDomains`. В коде Fastify/NestJS — через стандартный middleware
  (`@fastify/helmet` / `helmet`).

#### Секреты в проде

- **Никаких `.env` в репозитории.** В git только `.env.example`.
- **Все реальные значения** — в dashboard хостинг-провайдера (Fly.io Secrets,
  Render Environment Variables, DO App Platform → App-level env vars).
- **Ротация.** В README пакета — раздел «Как ротировать секрет», для каждого:
  где создаётся новый, как заменить в hosting-env, как убедиться, что сервер
  перезапустился со свежим значением.
- **Никаких секретов в логах.** Сервер уже это умеет (см. промпт бутстрапа);
  при деплое проверь, что логи в dashboard PaaS реально маскируют значения.
  Тест: положи `API_INTERNAL_TOKEN=super-secret-test`, сделай запрос, открой
  логи — слова `super-secret-test` быть не должно.

#### Запуск процесса

- **PaaS.** Используй декларативный конфиг провайдера:
  - Fly.io: `fly.toml` в `packages/background-office/`.
  - Render: `render.yaml` в корне репо или в пакете.
- **Команда запуска.** `yarn workspace @membrana/background-office start` —
  этот скрипт должен присутствовать в `package.json` пакета (если нет —
  добавь PR в `packages/background-office/`).
- **Build-step.** Если используется TS-компилятор (а не `ts-node`): на этапе
  build платформы — `yarn install --immutable && yarn workspace
  @membrana/background-office build`.
- **Health check.** В конфиге PaaS укажи `/health` как HTTP health check
  endpoint, чтобы платформа сама перезапускала контейнер при падении.
- **Graceful shutdown.** Уже описан в промпте бутстрапа (SIGTERM, drain
  inflight, timeout 10s). Проверь, что PaaS шлёт SIGTERM (а не SIGKILL) —
  у большинства это так, но при деплое уточни.

#### CI/CD (минимально)

- v0.1 — **auto-deploy из `main`**: при merge в `main` платформа автоматически
  пересобирает и выкатывает контейнер. Никакого ручного `fly deploy` каждый
  раз.
- GitHub Actions workflow для этого **не нужен**, если PaaS сам слушает webhook
  GitHub'а (Render, Fly.io, DO App Platform — все умеют).
- **Что нужно из GitHub-стороны.** Дать платформе read-доступ к репо (это
  делается через UI платформы, не через настройки агента).

### Definition of Done для этого PR

- [ ] **Домен зарегистрирован** под Membrana (название, регистратор, дата
  истечения — записаны в README).
- [ ] **DNS настроен** у Cloudflare (или альтернативы): A/AAAA/CNAME на
  endpoint хостинга, CAA на Let's Encrypt. `dig +short api.<domain>` возвращает
  ожидаемое.
- [ ] **HTTPS работает**: `curl -v https://<domain>/health` возвращает `200`,
  цепочка сертификатов валидна, SSL Labs ≥ A.
- [ ] **HSTS** включён, проверено через `curl -I` (header
  `Strict-Transport-Security` присутствует).
- [ ] **Auto-renew** TLS-сертификата настроен и проверен (для VPS — `systemctl
  list-timers | grep certbot` показывает активный таймер; для PaaS — UI говорит
  «Managed»).
- [ ] **HTTP → HTTPS редирект** работает: `curl -I http://<domain>/health`
  возвращает `301`/`308` на `https://<domain>/health`.
- [ ] **Secrets** все живут в env хостинг-провайдера; в git — только
  `.env.example`. Грепом по PR — ни одного реального ключа.
- [ ] **Все env-переменные** из `.env.example` пакета настроены в hosting
  dashboard. Сервер стартует без ошибок валидации zod.
- [ ] **Linear webhook**: создан в Linear → Settings → API → Webhooks с URL
  `https://<domain>/webhooks/linear`. Тестовый event (отправь руками через
  «Test webhook» в Linear или дождись реального) приходит, в логах хостинга
  видно `received: true`, HTTP-ответ Linear-у — `200` за < 1 сек.
- [ ] **Health check** на стороне PaaS настроен на `/health`, проверка
  проходит зелёная.
- [ ] **Logs** доступны из dashboard платформы; secrets в них замаскированы
  (проверь по описанному выше тесту).
- [ ] **`packages/background-office/README.md`** дополнен разделом
  `## Deployment`:
  - таблица сравнения PaaS/VPS с финальным выбором,
  - пошаговая инструкция first-time setup (создать аккаунт, подключить репо,
    добавить env, выпустить домен),
  - инструкция «как обновить деплой» (обычно — просто merge в main),
  - инструкция «как ротировать секрет»,
  - troubleshooting на 5–10 строк (типичные грабли: cold-start, истёкший
    cert, неправильный DNS).
- [ ] **`docs/ARCHITECTURE.md`** — короткое упоминание, что `background-office`
  доступен по адресу `https://<domain>` в продовой среде (не описание самого
  деплоя, только факт публичности).
- [ ] **Журнал** [`../discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md)
  дополнен **новой секцией «Этап 5 — деплой»** с краткой ретроспективой:
  что выбрано (платформа, домен, DNS-провайдер), сколько стоит в месяц, что
  идёт не так / куда смотреть в первую очередь при инциденте.

### Out of scope для этого PR (НЕ делать сейчас)

- **GitHub webhooks** — приём событий от GitHub, отдельный ticket после деплоя.
- **Staging environment** — v0.1 monoprod; staging заводим, когда появится
  реальный риск сломать прод.
- **CI/CD по PR-веткам (preview deploys)** — соблазнительно, но в v0.1 платформа
  для preview-deploy не нужна.
- **Monitoring / alerting** (Sentry / Datadog / UptimeRobot) — следующий
  ticket; в v0.1 хватит логов в dashboard платформы и ручной проверки
  `/health` раз в день.
- **WAF / DDoS protection** — Cloudflare proxy (если DNS у CF) даёт базовый
  уровень из коробки бесплатно; ничего дополнительно не настраиваем.
- **Backups / persistence** — сервер stateless, бэкапить нечего.
- **Multi-region / autoscaling** — нагрузки нет, оверкилл.
- **Email-канал** (для нотификаций) — позже.

### Архитектурные правила деплоя

1. **Реверсная зависимость минимальна.** Сервер ничего не должен знать про
   домен. URL он печатает только в логах при старте (например,
   `BASE_URL=https://api.membrana.dev`). Сама публичность — снаружи кода.
2. **Конфигурация — через env, не через файлы.** Никаких config-файлов,
   читаемых из FS в проде (промпт бутстрапа это уже зафиксировал — соблюди).
3. **Деплой воспроизводим.** Любой член команды по README пакета должен суметь
   повторить деплой с нуля в новый аккаунт PaaS за ≤ 30 минут.
4. **Один источник истины для секретов — dashboard платформы.** Не Vault,
   не GitHub Secrets, не локальные файлы. Если позже понадобится Vault —
   отдельный ticket.
5. **Если выбран VPS** — обязательно systemd-unit для процесса, обязательно
   firewall (ufw / nftables) только на 22/80/443, обязательно sshd с
   запретом password-auth.

### Подсказки и риски

- **Сначала зарегистрируй домен**, потом всё остальное. Регистрация может
  занять до часа на propagate DNS; не блокируй на этом весь день.
- **Cloudflare proxy «orange cloud»** — для PaaS-варианта оставь его
  **выключенным** на subdomain `api.*`: некоторые PaaS не любят, когда их
  endpoint скрыт за CF (особенно если у тебя managed-cert у PaaS — будет
  double-TLS и неработающие webhook'и). Включить можно позже, отдельным
  решением.
- **CAA-запись** обязательна. Без CAA любой compromised CA может выпустить
  сертификат на твой домен. С CAA — только Let's Encrypt.
- **Не используй wildcard-сертификаты** в v0.1 — нет необходимости,
  и они требуют DNS-01 challenge, что усложняет конфиг.
- **Прогон Linear-webhook'а реально**. Не доверяй mock'ам — Linear шлёт
  довольно специфичный payload и заголовок подписи, проверить надо вживую.
  Используй кнопку «Test webhook» в Linear settings.
- **Если у Anthropic будет 403 из IP хостинга** — проверь, не нужен ли
  региональный endpoint или прокси. Anthropic иногда блокирует датацентры
  определённых стран; в проде это решается выбором региона PaaS.
- **Стоимость.** Зафиксируй фактический месячный счёт в журнале (этап 5
  секция). Если выходит > $15/мес — обсуди с постановщиком (это знак, что
  выбран overkill-вариант).
- **Не привязывай платёжку к личной карте, если есть выбор.** Многие PaaS
  принимают виртуальные карты — это снимает риск перевыставления больших
  сумм при ошибке.

### Формат финального PR

1. **Заголовок:** `feat(background-office): production deployment — domain,
   DNS, HTTPS, hosting`.
2. **Описание:** что сделано / Definition of Done чек-листом / что НЕ
   сделано / как ревьюить (включая `curl https://<domain>/health`).
3. **Коммиты:** логически разделённые — отдельно README, отдельно `fly.toml`
   / `render.yaml`, отдельно правка `.env.example` (если нужно).
4. **LGTM** — у роли Teamlead (Vesnin) на основе принципов конструктивизма.
5. **В описании PR** обязательно — ссылка на этот промпт и на journal-файл.

При конфликте этих правил с существующими конвенциями монорепо выигрывают
конвенции и `docs/ARCHITECTURE.md`. Любое отступление — обоснуй в
PR-описании.

---

## Заметки для человека-постановщика

Эти заметки — **не для агента**, а для постановщика. Агент их игнорирует.

### Что я (постановщик) делаю **до** запуска промпта

1. **Заведи Linear-ticket** (например, `MEM-API-2`) с label'ом `vesnin`.
   В описании — короткая выжимка из этого промпта и ссылка на файл
   `docs/prompts/SERVER_DEPLOYMENT_PROMPT.md` и на journal
   `docs/discussions/background-office-v0.1.md`.
2. **Создай GitHub Issue** через шаблон `wish`. В acceptance criteria —
   список из 4–5 пунктов: домен работает, HTTPS зелёный, `/health`
   публичный, Linear webhook приходит, README обновлён.
3. **Реши, кто платит за инфру и каким способом.** Это блокер: без
   платёжки регистратор/PaaS откажет. Варианты:
   - Личная карта постановщика → потом ребилл проекту.
   - Корпоративная карта / счёт.
   - Виртуальная карта (Revolut / Privacy.com) — рекомендуется, если есть.
4. **Реши на верхнем уровне, какой домен покупаем.** Чтобы агент не
   тратил циклы на сравнение `.dev` vs `.app` vs `.cloud` — закрепи
   приоритет:
   - 1. `membrana.dev`
   - 2. `membrana.app`
   - 3. `membrana.cloud`
   - 4. fallback на `<owner-prefix>-membrana.com`.
5. **Реши, какой PaaS на первый круг.** Если нет предпочтений — закрепи
   Fly.io (бесплатный tier, edge, простой `fly.toml`). Render — вторая
   рекомендация.
6. **Перед запуском промпта** — заведи аккаунты на выбранных платформах
   (регистратор, DNS, PaaS), привяжи платёжку. Агенту не давай доступ к
   этим аккаунтам напрямую; он работает по инструкции из README. Финальные
   секреты в env платформы вносишь **ты**, не агент.

### Что я делаю **после** того, как агент сдал PR

1. Прохожу Definition of Done руками — все чек-боксы должны быть зелёные.
2. Запускаю боевые smoke-тесты:
   ```bash
   curl -i https://<domain>/health
   curl -i http://<domain>/health        # должен быть 301/308 на https
   curl -I https://<domain>/health | grep -i strict-transport-security
   ```
3. Захожу в Linear → Settings → API → Webhooks → жму «Test webhook» на
   созданном webhook → проверяю, что в логах PaaS видно успешный приём.
4. Заполняю в README пакета и в журнале:
   - имя домена,
   - дату истечения регистрации,
   - выбранный PaaS,
   - месячную стоимость по факту первого счёта.
5. Закрываю Linear-ticket и GitHub Issue с формальным отчётом по форме
   [`TASKS_MANAGEMENT.md` § 6](../TASKS_MANAGEMENT.md#этап-56-pr-отчёт-закрытие).

### Что не нужно класть в этот промпт

- **Конкретные ключи и пароли.** Они не в коде и не в промпте — только в
  dashboard платформы.
- **Полная DevOps-история** (multi-region, blue-green, canary). Эти решения
  ждут реальной нагрузки.
- **Документация по тому, как пользоваться сервером.** Это в основном README
  пакета и в [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md).
  Этот промпт — про то, как **поставить сервер в прод**, не про то, что он
  делает.
- **CI/CD pipeline за пределами auto-deploy из `main`.** Это отдельный
  ticket, если/когда понадобится.

### Связанные документы

- [`API_SERVER_BOOTSTRAP_PROMPT.md`](./API_SERVER_BOOTSTRAP_PROMPT.md) —
  предыдущий этап (бутстрап самого сервера).
- [`../discussions/background-office-v0.1.md`](../discussions/background-office-v0.1.md) —
  журнал работы над пакетом, куда дописывается «Этап 5 — деплой».
- [`../TASKS_MANAGEMENT.md`](../TASKS_MANAGEMENT.md) — методология задач.
- [`../WHITE_PAPER.md`](../WHITE_PAPER.md) — стратегическая цель.
