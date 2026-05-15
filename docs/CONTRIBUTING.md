# CONTRIBUTING — процесс для людей и CI-агентов

Репозиторий использует **виртуальную команду** из пяти ролей. Нормативные промпты и дизайн: [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN.md](./DESIGN.md), [MODULE_AND_PLUGIN_UI.md](./MODULE_AND_PLUGIN_UI.md), [SERVICES.md](./SERVICES.md).

## Жизненный цикл задачи

Любое пожелание, баг или недоделка оформляется как **GitHub Issue** по шаблонам в [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/) (`wish`, `bug`, `imperfection`). Дальше задача конвертируется в **Linear**, где идут декомпозиция и внутренние обсуждения; PR в GitHub связывается с Issue через `Closes #N`. Перед закрытием GitHub Issue автор оставляет формальный отчёт.

Полный регламент: [TASKS_MANAGEMENT.md](./TASKS_MANAGEMENT.md).

## Локальная разработка

- Установка и скрипты — см. корневой `README.md` (если отсутствует — `package.json`).
- Перед PR: те же проверки, что в CI — `yarn install --immutable` (при необходимости) и `yarn turbo run lint typecheck test build` для затронутых пакетов или всего монорепо.

## Архитектурная ветка `vesnin`

Для изменений, затрагивающих **критические архитектурные элементы** (контракты `@membrana/core` и `agenda`, фасады регистрации модулей, lifecycle плагинов, ядро `audio-engine`, граф зависимостей сервисов, базовые типы store), работа ведётся в отдельной ветке `vesnin` (в честь братьев Весниных, русских архитекторов-авангардистов).

**Когда обязательно `vesnin`:**
- Изменение `MembranaRegistry`, `MembranaState`, типов `Module` / `Plugin` в `@membrana/agenda`.
- Изменение публичного API `@membrana/core` или сервисов в `packages/services/*`.
- Внедрение новых архитектурных паттернов (например, lifecycle `plugin.install()` в store).
- Обновление стратегических документов (`ARCHITECTURE.md`, `SERVICES.md`, `MODULE_AND_PLUGIN_UI.md`).

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

- **Обязательный прогон**: `.github/workflows/ci.yml` — на каждый push и pull request в ветки `main`, `master`, `develop` выполняется `yarn install --immutable` и `yarn turbo run lint typecheck test build`. Локально перед коммитом имеет смысл запускать то же самое.
- **По расписанию**: `.github/workflows/scheduled-ci.yml` — раз в неделю плюс ручной запуск.
- **Релиз**: `.github/workflows/release.yml` — при push тега вида `v*` собирается монорепо и создаётся GitHub Release с автогенерацией текста.
- **Опционально**: `.github/workflows/optional-claude-pr-review.yml` — дополнительный обзор PR через Claude. Job выполняется, если в настройках репозитория задана переменная **`ENABLE_CLAUDE_PR_REVIEW`** = `true` (GitHub не позволяет включать job по наличию секрета в `if:`). Для шага с `anthropics/claude-code-action` по-прежнему нужен секрет **`ANTHROPIC_API_KEY`**; при ошибке шаг не блокирует merge (`continue-on-error`). Не заменяет обязательный CI и ревью людей.
- **Локальный CLI**: в корне `yarn anthropic:smoke` и `yarn anthropic:task` (ключ только в `.env`, см. `.env.example`). Навык агента: `.cursor/skills/membrana-anthropic-cli/SKILL.md`.
- **Скрипты code review (локально, без обязательного GitHub Actions)** — поддержка и изменения: **Teamlead** / **Структурщик** (оркестрация, границы репозитория, без утечек секретов).

| Скрипт | Команда | Когда запускать | Выход / назначение |
|--------|---------|-----------------|---------------------|
| `scripts/context-collector.mjs` | `node scripts/context-collector.mjs` / `--full` / `--help` | Перед ручным разбором или из `code-review.mjs` | Текст в stdout: git, yarn test/lint (фрагменты), верхний уровень каталога (без `node_modules`, `.git`, `.env*`). |
| `scripts/code-review.mjs` | `yarn code-review` / `yarn code-review:full` / `--help` | Локально при наличии `ANTHROPIC_API_KEY` | Перезапись `docs/DAILY_CODE_REVIEW.md` + дублирование в stdout. Модель: `ANTHROPIC_MODEL` или значение по умолчанию в `_anthropic-env.mjs`. Контекст обрезается по длине (см. комментарий в скрипте). |
| `scripts/daily-standup.mjs` | `yarn standup` / `yarn standup:full` / `yarn standup:dry` / `--help` | После `plan:day` и `code-review` | Перезапись `docs/DAILY_STANDUP.md` — ежедневный стендап: сводка плана, ревью, GitHub Issues, `packages/temp`. Issues: `gh` CLI или GitHub API. |
| `scripts/generate_report.mjs` | `node scripts/generate_report.mjs` / `--help` | Диагностика без вызова Anthropic | JSON в `%TEMP%/membrana-code-review/code-review-context.json` (Windows) или `$TMPDIR/membrana-code-review/` (Unix). |

Переменные окружения для этих сценариев: `ANTHROPIC_API_KEY` (обязательно для `code-review`), опционально `ANTHROPIC_MODEL`, прокси `HTTPS_PROXY` / `HTTP_PROXY` (см. `.env.example`).

- Проверка политики путей (исключения чувствительных): `yarn test:scripts` (Node built-in test для `scripts/context-collector-paths.mjs`, `scripts/daily-standup-paths.mjs`).
- **Деплой**: `.github/workflows/deploy-stub.yml` — заготовка под ваши шаги деплоя (по умолчанию без публикации наружу).

## Коммиты

- Сообщения в повелительном наклонении, на английском или русском — как принято в команде; главное — единообразие в PR.
- Не коммитить секреты, `node_modules`, артефакты сборки.

## Разрешение споров

При противоречии между удобством реализации и архитектурой выигрывает **ARCHITECTURE.md** и решение **Teamlead**.
