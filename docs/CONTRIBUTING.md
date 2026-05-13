# CONTRIBUTING — процесс для людей и CI-агентов

Репозиторий использует **виртуальную команду** из пяти ролей. Нормативные промпты и дизайн: [VIRTUAL_TEAM_PROMPT.md](./VIRTUAL_TEAM_PROMPT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN.md](./DESIGN.md), [SERVICES.md](./SERVICES.md).

## Локальная разработка

- Установка и скрипты — см. корневой `README.md` (если отсутствует — `package.json`).
- Перед PR: те же проверки, что в CI — `yarn install --immutable` (при необходимости) и `yarn turbo run lint typecheck test build` для затронутых пакетов или всего монорепо.

## Pull requests

1. Описание PR: **что**, **зачем**, **какие пакеты** затронуты (`apps/client`, `packages/*`, `packages/services/*`).
2. Если фича затрагивает аудио+UI: кратко укажи согласование с ролями **Teamlead** / **Музыкант** / **Верстальщик** (можно ссылкой на комментарий в issue).
3. Нет прямых импортов между плагинами; соблюдение [ARCHITECTURE.md](./ARCHITECTURE.md).
4. UI: соответствие [DESIGN.md](./DESIGN.md).
5. Новый сервис: соответствие [SERVICES.md](./SERVICES.md), Definition of Done выполнен.

## Добавление нового сервиса (`packages/services/<name>`)

Шаги (полный чек-лист — в [SERVICES.md](./SERVICES.md#создание-нового-сервиса)):

1. Скопировать `packages/services/audio-analyzer/` как образец, переименовать.
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

## Виртуальные агенты (Cursor / GitHub Actions)

- **Координатор** читает `docs/VIRTUAL_TEAM_PROMPT.md` целиком и прикладывает к задаче релевантные разделы `ARCHITECTURE.md` / `DESIGN.md`.
- Для узкого агента (одна роль) в начало системного сообщения вставляй блок роли из таблицы в `VIRTUAL_TEAM_PROMPT.md` + соответствующий раздел архитектуры.
- Workflow `.github/workflows/virtual-team-context.yml` печатает пути к документам и краткую памятку в **Job summary** — используйте summary как чеклист при ручном запуске.

## CI (ежедневный цикл)

- **Обязательный прогон**: `.github/workflows/ci.yml` — на каждый push и pull request в ветки `main`, `master`, `develop` выполняется `yarn install --immutable` и `yarn turbo run lint typecheck test build`. Локально перед коммитом имеет смысл запускать то же самое.
- **По расписанию**: `.github/workflows/scheduled-ci.yml` — раз в неделю плюс ручной запуск.
- **Релиз**: `.github/workflows/release.yml` — при push тега вида `v*` собирается монорепо и создаётся GitHub Release с автогенерацией текста.
- **Опционально**: `.github/workflows/optional-claude-pr-review.yml` — дополнительный обзор PR через Claude, только если в секретах репозитория задан `ANTHROPIC_API_KEY` (не заменяет обязательный CI и ревью людей).
- **Локальный CLI**: в корне `yarn anthropic:smoke` и `yarn anthropic:task` (ключ только в `.env`, см. `.env.example`). Навык агента: `.cursor/skills/membrana-anthropic-cli/SKILL.md`.
- **Деплой**: `.github/workflows/deploy-stub.yml` — заготовка под ваши шаги деплоя (по умолчанию без публикации наружу).

## Коммиты

- Сообщения в повелительном наклонении, на английском или русском — как принято в команде; главное — единообразие в PR.
- Не коммитить секреты, `node_modules`, артефакты сборки.

## Разрешение споров

При противоречии между удобством реализации и архитектурой выигрывает **ARCHITECTURE.md** и решение **Teamlead**.
