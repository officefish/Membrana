# CONTRIBUTING — процесс для людей и CI-агентов

Репозиторий использует **виртуальную команду** из пяти ролей. Нормативные промпты и дизайн: [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [BACKGROUND_SERVERS.md](./BACKGROUND_SERVERS.md), [DESIGN.md](./DESIGN.md), [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md), [SERVICES.md](./SERVICES.md), [каталог модулей/плагинов](./catalog/README.md).

## Каталог модулей и плагинов

Перед правками `apps/client/src/modules/*` или `plugins/*` читайте живую спецификацию из [`docs/catalog/`](./catalog/README.md) (`client/registry.json` → `promptPath`). После существенного PR обновляйте catalog-промпт в том же или follow-up PR.

## Жизненный цикл задачи

Любое пожелание, баг или недоделка оформляется как **GitHub Issue** по шаблонам в [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/) (`wish`, `bug`, `imperfection`). Дальше задача конвертируется в **Linear**, где идут декомпозиция и внутренние обсуждения; PR в GitHub связывается с Issue через `Closes #N`. Перед закрытием GitHub Issue автор оставляет формальный отчёт.

Полный регламент: [TASKS_MANAGEMENT.md](./TASKS_MANAGEMENT.md).

## Локальная разработка

- Установка и скрипты — см. корневой `README.md` (если отсутствует — `package.json`).
- Перед PR: те же проверки, что в CI — `yarn install --immutable` (при необходимости) и `yarn turbo run lint typecheck test build` для затронутых пакетов или всего монорепо.
- `yarn dev` / Vite HMR **не** заменяют typecheck: в apps `typecheck` = `tsc -b` (тот же solution build, что первый шаг `build`, без `vite build`).

## Архитектурная ветка `vesnin`

Для изменений, затрагивающих **критические архитектурные элементы** (контракты `@membrana/core` и `agenda`, фасады регистрации модулей, lifecycle плагинов, ядро `audio-engine`, граф зависимостей сервисов, базовые типы store), работа ведётся в отдельной ветке `vesnin` (в честь братьев Весниных, русских архитекторов-авангардистов).

**Когда обязательно `vesnin`:**
- Изменение `MembranaRegistry`, `MembranaState`, типов `Module` / `Plugin` в `@membrana/agenda`.
- Изменение публичного API `@membrana/core` или сервисов в `packages/services/*`.
- Новый или существенный API в `packages/background-office` / `packages/background-media` (границы — [BACKGROUND_SERVERS.md](./BACKGROUND_SERVERS.md)).
- Внедрение новых архитектурных паттернов (например, lifecycle `plugin.install()` в store).
- Обновление стратегических документов (`ARCHITECTURE.md`, `BACKGROUND_SERVERS.md`, `SERVICES.md`, `MODULE_AND_PLUGIN_UI.md`).

**Когда не нужно:**
- Точечные правки UI внутри одного модуля без изменения контрактов.
- Багфиксы с малой областью влияния.
- Документация, которая описывает уже существующее поведение (без изменения кода).

**Workflow:**

```bash
git checkout main
git pull
git checkout -b vesnin            # или git checkout vesnin && git pull
# … изменения …
yarn typecheck && yarn lint && yarn test && yarn build
git push -u origin vesnin
# Открыть PR с базой main; в описании указать [vesnin] и затронутые контракты.
```

После merge `vesnin → main` ветка локально удаляется (`git branch -d vesnin`) и заводится заново при следующей архитектурной задаче. Решение, нужна ли ветка `vesnin`, принимает **Teamlead** при формулировке задачи.

## Регламент веток деплоя (DR5 deploy-pipeline-refactor)

Первопричина постмортема MP7B — выкат из длинной мульти-эпиковой ветки с незакоммиченными
зависимостями (`docs/deploy/POSTMORTEM-MP7B-2026-06-18.md`). Чтобы это не повторялось:

1. **`main` всегда деплоируемое.** Каждый коммит в `main` обязан проходить обязательный CI
   (`turbo run lint typecheck test build` из чистого checkout). Красный `main` чинится в приоритете.
2. **Выкат только из `main`.** Прод-образы (`cabinet-vX.Y.Z`) собираются из коммитов `main`;
   деплой-скрипты гейтятся на `origin/<branch>` + зелёный CI (DR0/DR1). Деплой из произвольной
   feature-ветки — только осознанный обход гейтов для hotfix, с последующим возвратом в `main`.
3. **Один эпик — одна ветка/серия PR.** Ветка живёт от своего эпика; PR небольшие и атомарные.
4. **Длинные мульти-эпиковые ветки запрещены** как источник прод-выката: в них копятся
   незакоммиченные/несинхронизированные изменения, которые «works on my machine», но падают в CI/прод.
5. **Контракты `@membrana/core`/`agenda`** — через `vesnin` (см. выше), оттуда в `main` до релиза.

Деплой и откат — через image-модель: `docs/deploy/MEMBRANE_PLATFORM_DEPLOY.md`,
`docs/deploy/BACKGROUND_CABINET_DEPLOY.md`.

## Регламент миграций БД: expand/contract (DR5)

Прод применяет миграции автоматически (`prisma migrate deploy` в entrypoint) и **только вперёд**.
Откат образа (DR3) кода не откатывает схему. Поэтому каждая миграция обязана быть
**обратносовместимой**: задеплоенный сейчас код и предыдущий релиз должны работать с новой схемой.
Это предпосылка безопасного отката и (в будущем) zero-downtime (DR7).

Несовместимое изменение делится на фазы по схеме **expand → migrate → contract**, каждая — отдельный релиз:

| Фаза | Что делает | Совместимость |
|------|------------|---------------|
| **expand** | Добавить новое (nullable-колонка/таблица/индекс), не трогая старое | старый и новый код работают |
| **migrate** | Бэкофилл данных + переключение кода на новое поле (старое ещё на месте) | новый код пишет в новое; старый ещё жив |
| **contract** | Удалить старое (колонку/таблицу) после того, как старый код выведен | только после стабилизации нового |

**Можно в одной миграции:** добавить nullable-колонку; добавить таблицу/индекс; расширить enum;
ослабить ограничение (NOT NULL → NULL).

**Нельзя в одной миграции (делить на expand/contract):** `DROP`/переименование колонки или таблицы,
которые ещё читает работающий код; добавление `NOT NULL` без default к существующей таблице;
сужение типа; изменение, ломающее предыдущий релиз (нужен для отката).

**Правило отката:** если миграция выполнила `contract` (удаление), откат образа на релиз до неё —
**небезопасен** (старая схема уже не существует). Перед таким релизом фиксируется «точка невозврата»
в отчёте; откат за неё делается только вместе с восстановлением БД из бэкапа.

## Pull requests

1. Описание PR: **что**, **зачем**, **какие пакеты** затронуты (`apps/client`, `packages/*`, `packages/services/*`).
2. Если фича затрагивает аудио+UI: кратко укажи согласование с ролями **Teamlead** / **Музыкант** / **Верстальщик** (можно ссылкой на комментарий в issue).
3. Нет прямых импортов между плагинами; соблюдение [ARCHITECTURE.md](./ARCHITECTURE.md).
4. UI: соответствие [DESIGN.md](./DESIGN.md) и при работе с модулями/плагинами в UI — [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md).
5. Новый сервис: соответствие [SERVICES.md](./SERVICES.md), Definition of Done выполнен.

## Добавление нового сервиса (`packages/services/<name>`)

Шаги (полный чек-лист — в [SERVICES.md](./SERVICES.md#создание-нового-сервиса)):

1. Скопировать подходящий эталон: `packages/services/audio-engine/` для foundation или `packages/services/fft-analyzer/` для analyzer, переименовать.
2. Прописать в `package.json` имя `@membrana/<name>-service`.
3. Добавить alias в `apps/client/vite.config.ts` и `tsconfig.app.json`.
4. Добавить запись в таблицу `packages/services/README.md`.
5. Добавить ссылку в `references` корневого `tsconfig.json`.
6. Получить `LGTM` от Teamlead.

Что Teamlead проверит на ревью:

- Ядро сервиса не импортирует React/DOM/Web Audio.
- Хуки не содержат бизнес-логики.
- Граф зависимостей не нарушен (только `@membrana/core`).
- Есть README с разделами **Что делает**, **API**, **Использование**.

## Добавление нового модуля или плагина клиента

Полный чек-лист — в [MODULE_AND_PLUGIN_UI.md §0](./MODULE_AND_PLUGIN_UI.md#0-регистрация-модулей-и-lazy-loading). Кратко:

1. Создать `apps/client/src/modules/<Name>Module.tsx` (для модуля) или `apps/client/src/plugins/<name>/` (для плагина).
2. Зарегистрировать в `apps/client/src/modules/registerClientModules.ts` через `MembranaRegistry.registerLazyModule({ ..., loader })` или `MembranaRegistry.registerPlugin(moduleId, factory())`.
3. **Запрещено** дёргать `useMembranaStore.getState().registerModule(...)` напрямую — только через фасад.
4. Если плагин имеет UI настроек — добавить ветку в `apps/client/src/pluginSidebarDetails.tsx`.
5. Если работаете с аудио — только через `@membrana/audio-engine-service` (см. [ARCHITECTURE.md §1b](./ARCHITECTURE.md)).

Изменения, затрагивающие сам фасад `MembranaRegistry` или контракты `Module` / `Plugin` — через ветку **`vesnin`** (см. выше).

## Виртуальные агенты (Cursor / GitHub Actions)

- **Координатор** читает `docs/VIRTUAL_TEAM_PROMPT.md` целиком и прикладывает к задаче релевантные разделы `ARCHITECTURE.md` / `DESIGN.md`.
- Для узкого агента (одна роль) в начало системного сообщения вставляй блок роли из таблицы в `VIRTUAL_TEAM_PROMPT.md` + соответствующий раздел архитектуры.
- Workflow `.github/workflows/virtual-team-context.yml` печатает пути к документам и краткую памятку в **Job summary** — используйте summary как чеклист при ручном запуске.

## CI (ежедневный цикл)

- **Обязательный прогон**: `.github/workflows/ci.yml` — на каждый push и pull request в ветки `main`, `master`, `develop`, **`techies68`** выполняется `yarn install --immutable` и `yarn turbo run lint typecheck test build`. Локально перед коммитом имеет смысл запускать то же самое.
- **По расписанию**: `.github/workflows/scheduled-ci.yml` — раз в неделю плюс ручной запуск; включает `node scripts/usercase.mjs verify-competition` (alpha/beta/gamma layout + pre-run).
- **UserCase pack/collapse (PR)**: `.github/workflows/usercase-competition.yml` — при изменениях pack/collapse или sprint forks; `yarn usercase:verify-competition` локально.
- **RAG (`@membrana/rag-service`)**: локально `yarn workspace @membrana/rag-service typecheck test` + `node --test scripts/rag-ritual.test.mjs`. Operative circuit в ритуалах работает без `OPENAI_API_KEY`; archive — после `yarn rag:index --full`. Оператор: [`docs/RAG.md`](./RAG.md), closure: [`docs/rag-dual-circuit-v1/CLOSURE.md`](./rag-dual-circuit-v1/CLOSURE.md).
- **Релиз**: `.github/workflows/release.yml` — при push тега вида `v*` собирается монорепо и создаётся GitHub Release с автогенерацией текста.
- **Опционально**: `.github/workflows/optional-claude-pr-review.yml` — дополнительный обзор PR через Claude. Job выполняется, если в настройках репозитория задана переменная **`ENABLE_CLAUDE_PR_REVIEW`** = `true` (GitHub не позволяет включать job по наличию секрета в `if:`). Для шага с `anthropics/claude-code-action` по-прежнему нужен секрет **`ANTHROPIC_API_KEY`**; при ошибке шаг не блокирует merge (`continue-on-error`). Не заменяет обязательный CI и ревью людей.
- **Локальный CLI**: в корне `yarn anthropic:smoke` и `yarn anthropic:task` (ключ только в `.env`, см. `.env.example`). Навык агента: `.cursor/skills/membrana-anthropic-cli/SKILL.md`.
- **Скрипты code review (локально, без обязательного GitHub Actions)** — поддержка и изменения: **Teamlead** / **Структурщик** (оркестрация, границы репозитория, без утечек секретов).

| Скрипт | Команда | Когда запускать | Выход / назначение |
|--------|---------|-----------------|---------------------|
| `scripts/context-collector.mjs` | `node scripts/context-collector.mjs` / `--full` / `--help` | Перед ручным разбором или из `code-review.mjs` | Текст в stdout: git, yarn test/lint (фрагменты), верхний уровень каталога (без `node_modules`, `.git`, `.env*`). |
| `scripts/code-review.mjs` | `yarn code-review` / `yarn code-review:full` / `--help` | **Вечер**; `ANTHROPIC_API_KEY` | Перезапись `docs/DAILY_CODE_REVIEW.md`. Утром не запускать — только читать файл в `standup` / `main-day-issue`. |
| `scripts/daily-standup.mjs` | `yarn standup` / `yarn standup:full` / `yarn standup:dry` / `--help` | **Утро**, после `plan:day` | Перезапись `docs/DAILY_STANDUP.md`; вход — вчерашний `DAILY_CODE_REVIEW.md`, Issues, `packages/temp`, **operative RAG** (`--no-rag` отключает). |
| `scripts/main-day-issue.mjs` | `yarn main-day-issue` / `:dry` / `:full` | **Утро**, после `standup` | `docs/MAIN_DAY_ISSUE.md`; operative RAG (`--no-rag`). |
| `scripts/consilium.mjs` | `yarn consilium` | Consilium | Archive RAG по умолчанию (`useLongTerm`); `--no-rag`. |
| `scripts/generate_report.mjs` | `node scripts/generate_report.mjs` / `--help` | Диагностика без вызова Anthropic | JSON в `%TEMP%/membrana-code-review/code-review-context.json` (Windows) или `$TMPDIR/membrana-code-review/` (Unix). |

Переменные окружения для этих сценариев: `ANTHROPIC_API_KEY` (обязательно для `code-review`), опционально `ANTHROPIC_MODEL`, **`OPENAI_API_KEY`** (только archive RAG / `yarn rag:index`), прокси `HTTPS_PROXY` / `HTTP_PROXY` (см. `.env.example`).

- Проверка политики путей (исключения чувствительных): `yarn test:scripts` (Node built-in test для `scripts/context-collector-paths.mjs`, `scripts/daily-standup-paths.mjs`).
- **Деплой**: `.github/workflows/deploy-stub.yml` — заготовка под ваши шаги деплоя (по умолчанию без публикации наружу).

### VPS deploy (SSH-скрипты)

Операционные скрипты в `scripts/_ssh-*.mjs` — **часть CD**, коммитятся в репозиторий. Они читают секреты только из корневого `.env` (не коммитится): `BACKGROUND_MEDIA_IPV4`, `BACKGROUND_MEDIA_PASSWORD`, опционально `CABINET_GIT_BRANCH`.

| Команда | Назначение |
|---------|------------|
| `yarn cabinet:deploy:prod` | Cabinet stack: pull, **build на VPS**, up, Caddy, smoke (легаси-путь) |
| `yarn cabinet:deploy:image:prod` | **DR2/рекоменд.**: деплой образа GHCR по тегу (`CABINET_IMAGE_TAG`), без build на VPS; JSON-сводка |
| `yarn cabinet:rollback:prod` | **DR3**: откат на предыдущий релиз (`CABINET_ROLLBACK_TAG`); без тега — список тегов |
| `yarn cabinet:smoke:prod` | **DR4**: функциональный smoke (health/login/узлы/migrate/runtime-канал) |
| `yarn cabinet:pairing:e2e:deploy` | Hotfix pairing: `MEDIA_PUBLIC_API_URL`, media CORS, rebuild cabinet+media |
| `yarn cabinet:mp3:smoke` | Prod smoke MP1–MP3 (pair + media device) |
| `yarn cabinet:mp3:prod` | MP3 post-deploy + smoke (media docker net + pairing) |
| `yarn cabinet:quota-refactor:prod` | Deploy tariff quota refactor (cabinet migrate + split media quota smoke) |
| `yarn cabinet:mp3:post-deploy` | Patch `cabinet.env` (CLIENT_CORS, MEDIA_API_*) |
| `yarn cabinet:mp6:prod` | Prod regression MP1–MP5 (one session) |
| `yarn cabinet:mp7:prod` | MP7: MP1–MP5 + WebSocket journal/mic-live smoke |

Подробно: [`docs/deploy/BACKGROUND_CABINET_DEPLOY.md`](./deploy/BACKGROUND_CABINET_DEPLOY.md), [`docs/deploy/MEMBRANE_PLATFORM_DEPLOY.md`](./deploy/MEMBRANE_PLATFORM_DEPLOY.md).

**Не коммитить:** `**/.env.docker` (синк из `.env`), `ssl/` (TLS-ключи), корневой `.env`.

**Логи отладки deploy/recover (агенты и люди):** не сохранять вывод `yarn cabinet:*:prod`, `yarn device-board:deploy:*` и прочих SSH-скриптов в **корень репозитория** (`Tee-Object -FilePath cabinet-recover.txt`, `> deploy-*.txt` и т.п.). Это одноразовые артефакты, они загрязняют `git status` и preflight deploy-gate. Если лог нужен:

- Windows: `%TEMP%\membrana-deploy-<дата>.log`
- Unix: `$TMPDIR/membrana-deploy-<дата>.log`
- Для обмена с командой: `docs/archive/` (коммит только по решению постановщика)

Паттерны в `.gitignore`: `/cabinet-recover*.txt`, `/deploy-*.txt`, `/prod-check.txt`; вывод скриптов — `scripts/_*-out.txt`. Локальные каталоги AI IDE — `.claude/`, `.continue/` (целиком).

## Коммиты

- Сообщения в повелительном наклонении, на английском или русском — как принято в команде; главное — единообразие в PR.
- Не коммитить секреты, `node_modules`, артефакты сборки.

## Разрешение споров

При противоречии между удобством реализации и архитектурой выигрывает **ARCHITECTURE.md** и решение **Teamlead**.
