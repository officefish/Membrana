# Реестр секретов — сроки и ротация

> Issue [#2662](https://github.com/officefish/Membrana/issues/2662). Слово владельца 18.11: у токенов
> ограниченный срок жизни, нужна регулярная ревизия свежести.
>
> **Значений здесь нет и быть не может.** Только имя, место, хозяин и даты. Ротация — только
> рукой владельца; значения не попадают в чат, PR, логи (см.
> [INCIDENT_RESPONSE_REGULATION.md](./INCIDENT_RESPONSE_REGULATION.md), раздел «(в) Дисциплина секретов и `.env`»).

## Откуда взяты имена (срез 18.11)

- секреты репозитория — `gh api repos/officefish/Membrana/actions/secrets` (имя и `updated_at`;
  срок действия самих токенов GitHub не показывает);
- использование в Actions — `secrets.<ИМЯ>` в `.github/workflows/*.yml`;
- серверы и локальная среда — имена из `.env.example`, `.env.llm-proxy.example`,
  `packages/background-{office,cabinet,media}/.env*.example`, `deploy/affine/.env.example`.
  Раскладка по `/etc/membrana/*.env` на хостах выведена из этих примеров и деплой-скриптов,
  **на хостах не сверялась** (агент на серверы не ходит) — сверить владельцу.

«неизвестно — спросить владельца» — честная пустая клетка: в репозитории и документах даты нет.
Владелец, заполняя срок, пишет дату `ГГГГ-ММ-ДД` в колонку «Истекает» — её и читает проверка.

## Как читать колонку «Истекает»

| Значение | Смысл | Что делает `verify:secrets-freshness` |
|---|---|---|
| `ГГГГ-ММ-ДД` | записанная дата истечения | за 14 дней — предупреждение; дата прошла — красный |
| `неизвестно — спросить владельца` | срок не записан | считается в «срок неизвестен», не красит |
| `не истекает` | адрес/идентификатор, не учётные данные | пропускается |
| `на прогон` | выдаётся Actions автоматически на один прогон | пропускается |

## Реестр

<!-- secrets-registry:start -->
| Имя | Где лежит | Кто использует | Кто выпустил | Обновлён | Истекает | Как ротировать |
|---|---|---|---|---|---|---|
| `WEEKLY_PLAN_TOKEN` | GitHub secret | `weekly-strategic-plan.yml` (#2649, #2664) | владелец (fine-grained PAT) | 2026-11-18 | неизвестно — спросить владельца | GitHub → Settings → Developer settings → fine-grained PAT; затем `gh secret set WEEKLY_PLAN_TOKEN` рукой владельца |
| `ANTHROPIC_API_KEY` | GitHub secret | `weekly-strategic-plan.yml`, `weekly-analyzers-research.yml`, `optional-claude-pr-review.yml` | владелец | 2026-08-29 | неизвестно — спросить владельца | console.anthropic.com → Keys; `gh secret set ANTHROPIC_API_KEY` |
| `OFFICE_API_TOKEN` | GitHub secret | `night-hunt-office-trigger.yml`, `detector-drift-gate.yml` | владелец (токен office) | 2026-09-18 | неизвестно — спросить владельца | выпуск на office ([скилл membrana-office-vds-deploy](../../.cursor/skills/membrana-office-vds-deploy/SKILL.md)); `gh secret set OFFICE_API_TOKEN` |
| `OFFICE_URL` | GitHub secret | `night-hunt-office-trigger.yml`, `detector-drift-gate.yml` | владелец | 2026-09-18 | не истекает | адрес office; менять при переезде (`gh secret set OFFICE_URL`) |
| `BACKGROUND_MEDIA_PASSWORD` | GitHub secret | `u10-workspace-prod.yml` | владелец | 2026-06-23 | неизвестно — спросить владельца | смена пароля на хосте media рукой владельца; `gh secret set BACKGROUND_MEDIA_PASSWORD` |
| `BACKGROUND_MEDIA_IPV4` | GitHub secret | `u10-workspace-prod.yml` | владелец | 2026-06-23 | не истекает | адрес хоста media |
| `BACKGROUND_MEDIA_IPV6` | GitHub secret | ни один workflow (срез 18.11) — кандидат на удаление | владелец | 2026-06-23 | не истекает | адрес хоста media; не используется — решить владельцу |
| `GITHUB_TOKEN` | GitHub Actions (встроенный) | 7 ссылок в `.github/workflows` | GitHub, автоматически | — | на прогон | не ротируется — выдаётся на каждый прогон |
| `API_INTERNAL_TOKEN` (office) | `/etc/membrana/office.env` | `@membrana/background-office` (служебные двери) | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | [скилл membrana-office-vds-deploy](../../.cursor/skills/membrana-office-vds-deploy/SKILL.md) |
| `ANTHROPIC_API_KEY` (office) | `/etc/membrana/office.env` | office: LLM-процедуры, персоны | владелец | неизвестно | неизвестно — спросить владельца | console.anthropic.com; затем office.env + перезапуск office |
| `DEEPSEEK_API_KEY` | `/etc/membrana/office.env`, локальный `.env` | каналы LLM-процедур (панель «Каналы LLM») | владелец | неизвестно | неизвестно — спросить владельца | кабинет провайдера; office.env |
| `OPENROUTER_API_KEY` | `/etc/membrana/office.env`, локальный `.env`, `.env.llm-proxy` | каналы LLM, llm-proxy | владелец | неизвестно | неизвестно — спросить владельца | кабинет провайдера; office.env |
| `PERPLEXITY_API_KEY` | `/etc/membrana/office.env`, локальный `.env`, `.env.llm-proxy` | office, MCP фазы B, deep-research | владелец | неизвестно | неизвестно — спросить владельца | perplexity.ai/settings/api |
| `GITHUB_TOKEN` (office) | `/etc/membrana/office.env`, локальный `.env` | office: ночные PR охоты, GitHub API | владелец (PAT) | неизвестно | неизвестно — спросить владельца | GitHub PAT; office.env |
| `LINEAR_API_KEY` | `/etc/membrana/office.env`, локальный `.env` | office: зеркало GitHub↔Linear | владелец | неизвестно | неизвестно — спросить владельца | Linear → Settings → API |
| `LINEAR_WEBHOOK_SECRET` | `/etc/membrana/office.env` | office: вебхуки Linear | владелец | неизвестно | неизвестно — спросить владельца | Linear → Webhooks; office.env |
| `TELEGRAM_BOT_TOKEN` | `/etc/membrana/office.env` | office: ласточка (`telegram:swallow`) | владелец (BotFather) | неизвестно | неизвестно — спросить владельца | BotFather `/revoke`; office.env |
| `PANEL_GITHUB_CLIENT_SECRET` | `/etc/membrana/office.env` | панель: вход через GitHub OAuth (OP2, #438) | владелец | неизвестно | неизвестно — спросить владельца | GitHub → OAuth Apps; office.env |
| `PANEL_SESSION_SECRET` | `/etc/membrana/office.env` | панель: подпись сессий | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | новый случайный секрет; разлогинит всех |
| `PANEL_INVITE_SECRET` | `/etc/membrana/office.env` | панель: приглашения | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | новый случайный секрет; старые приглашения умрут |
| `ARCHIVARIUS_MONGO_PASSWORD` | `/etc/membrana/office.env` | office: архивариус (Mongo) | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | [ARCHIVARIUS_DUMP_RUNBOOK.md](../deploy/ARCHIVARIUS_DUMP_RUNBOOK.md); секрет сохранять ДО применения |
| `CABINET_OFFICE_TOKEN` | `/etc/membrana/office.env` (и парный в кабинете) | office ↔ кабинет (грант cabinet-register, #2393) | владелец | 2026-10-07 (по #2662) | неизвестно — спросить владельца | выпуск на кабинете; office.env |
| `API_INTERNAL_TOKEN` (cabinet) | `/etc/membrana/cabinet.env` | `@membrana/background-cabinet` | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | [MEMBRANE_PLATFORM_DEPLOY.md](../deploy/MEMBRANE_PLATFORM_DEPLOY.md) |
| `MEDIA_API_TOKEN` | `/etc/membrana/cabinet.env`, локальный `.env` | кабинет → media; страж деплоя (#2199) | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | выпуск на media; cabinet.env |
| `POSTGRES_PASSWORD` (cabinet) | `/etc/membrana/cabinet.env` | БД кабинета | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | смена пароля роли в Postgres, затем cabinet.env |
| `CABINET_BOOTSTRAP_PASSWORD` | `/etc/membrana/cabinet.env` | первичный вход кабинета | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | cabinet.env |
| `GHCR_TOKEN` | `/etc/membrana/cabinet.env`, локальный `.env` | прод тянет образы кабинета из GHCR | владелец (PAT, read:packages) | неизвестно | неизвестно — спросить владельца | GitHub PAT; cabinet.env |
| `API_INTERNAL_TOKEN` (media) | `/etc/membrana/media.env` | `@membrana/background-media` | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | [MEMBRANE_PLATFORM_DEPLOY.md](../deploy/MEMBRANE_PLATFORM_DEPLOY.md) |
| `POSTGRES_PASSWORD` (media) | `/etc/membrana/media.env` | БД media | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | смена пароля роли в Postgres, затем media.env |
| `MEDIA_INTERNAL_TOKEN` | локальный `.env` | страж деплоя media/cabinet (#2199) | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | выпуск на media |
| `DEPLOY_MEDIA_PROBE_TOKEN` | локальный `.env` | страж деплоя: `/v1/deploy-preflight/last-sample` | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | выпуск на media |
| `VITE_MEDIA_API_TOKEN` | локальный `.env`, сборка клиента, полевой узел | клиент → prod media API | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | выпуск на media; пересборка клиента |
| `FIELD_NODE_KEY` | `.env` полевого узла | узел-устройство (ADR-0027, `firebat:poller`) | оператор (`POST /v1/devices/:id/node-key`) | неизвестно | неизвестно — спросить владельца | отзыв и новый ключ узла через media |
| `OPENAI_API_KEY` | локальный `.env` | RAG (`@membrana/rag-service`), каналы LLM | владелец | неизвестно | неизвестно — спросить владельца | platform.openai.com |
| `VOYAGE_API_KEY` | локальный `.env` | RAG-эмбеддинги | владелец | неизвестно | неизвестно — спросить владельца | кабинет провайдера |
| `PINECONE_API_KEY` | локальный `.env` | RAG-векторное хранилище | владелец | неизвестно | неизвестно — спросить владельца | кабинет провайдера |
| `FREEMODEL_DEV_API_KEY` | `.env.llm-proxy` | llm-proxy | владелец | неизвестно | неизвестно — спросить владельца | кабинет провайдера |
| `AFFINE_API_TOKEN` | `deploy/affine/.env` (хост AFFiNE) | AFFiNE CLI ([AFFINE_INVENTORY.md](../deploy/AFFINE_INVENTORY.md)) | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | AFFiNE → настройки токенов |
| `AFFINE_ADMIN_PASSWORD` | `deploy/affine/.env` | AFFiNE: админ | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | AFFiNE |
| `AFFINE_PASSWORD` | `deploy/affine/.env` | AFFiNE CLI | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | AFFiNE |
| `DB_PASSWORD` (affine) | `deploy/affine/.env` | БД AFFiNE | неизвестно — спросить владельца | неизвестно | неизвестно — спросить владельца | смена пароля БД AFFiNE |
| `gh` CLI | связка ключей ОС владельца/агента | `gh`, `pr:ship`, ритуалы | владелец (`gh auth login`) | неизвестно | неизвестно — спросить владельца | `gh auth refresh` / `gh auth login` |
<!-- secrets-registry:end -->

## Проверка `yarn verify:secrets-freshness`

`node scripts/verify-secrets-freshness.mjs [--today ГГГГ-ММ-ДД] [--warn-days 14] [--json]`

- **красный (exit 1):** секрет назван в `.github/workflows` (`secrets.<ИМЯ>`), а строки
  «GitHub secret»/«GitHub Actions» с этим именем в реестре нет; или записанная дата истечения
  уже прошла;
- **предупреждение (exit 0):** до записанной даты истечения ≤ 14 дней;
- **сводка:** сколько строк с неизвестным сроком — список для владельца.

Читает только этот файл и `.github/workflows/*.yml`; значения секретов не читает и не может
(их нет в репозитории). Ядро — `scripts/lib/secrets-freshness.mjs`, тест —
`scripts/verify-secrets-freshness.test.mjs`.

### Как подключить (не подключено — решение владельца)

- **Утро:** отдельный шаг утренней цепочки (`ritual:day`) раз в месяц или каждое утро — проверка
  дешёвая, сетевых вызовов нет; красный показывать владельцу как пункт чек-листа, а не ронять утро.
- **CI:** шаг в `ci.yml` рядом с `verify:declared-imports` — ловит новый `secrets.X` в workflow
  без строки реестра в том же PR. Предупреждения о сроке в CI бесполезны (PR не про сроки) —
  там запускать с `--warn-days 0`, а сроки смотреть утром.
- **Ежемесячный workflow** (`schedule`) с выводом в Summary — вариант без участия ритуала.

## Порядок ротации

1. Владелец выпускает новый ключ у провайдера (или на своём сервисе).
2. Владелец кладёт его на место (GitHub secret — `gh secret set`, хост — `/etc/membrana/*.env` и
   перезапуск сервиса по скиллу сервиса). Агент значение не видит и не передаёт.
3. Старый ключ отзывается.
4. В этот файл — PR с новой датой «Обновлён» и, если известна, «Истекает».
