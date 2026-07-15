# Промпт: vds-panel-tooling — 6 инструментов против трения Windows-сессии с VDS/панелью

> **Task-промпт** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер: **M**. Ожидаемый артефакт: **1 PR** — зонтик из 6 независимых ti.
> Реестр: `id` = `vds-panel-tooling` в [`docs/tasks/registry.json`](../tasks/registry.json).
> **GitHub Issue:** [#485](https://github.com/officefish/Membrana/issues/485).
>
> **Оформлен по факту исполнения** (2026-07-15): пункты приехали готовым списком с
> evidence из ретро #485, консилиум-гейт не требовался (механика по канону `_ssh-*`,
> прецедент #433/#469). Промпт фиксирует контракт DoD для closure-ревью и архива.

---

## Контекст

Ретро [#485](https://github.com/officefish/Membrana/issues/485) собрало трение сессии
2026-07-14 (борд detector-compare + эпик панели + живой деплой + ласточка). Каждый пункт
— с эпизодом, не с теорией. Плюс два пункта ретро #476 (п.3 `office:ssh`, п.7 комментарий
у gitignore) попадают в тот же скоуп и берутся здесь же.

Что уже есть: `_ssh-office-config.mjs` (#349 — ключ/пароль, туннельный endpoint),
`_ssh-media-exec.mjs` (образец генерик-exec для media), `_ssh-panel-deploy.mjs` (OP4),
`panel-auth-core.ts` (HMAC-токены панели), `task-closure-review.mjs`, `task-registry.mjs`.

Что НЕ трогаем: формат `registry.json`, ядро `panel-auth` (скрипты только сверяются с
ним), `lib/task-closure-review.mjs` в части state-машины, прод-данные панели.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Канон SSH-скриптов, VPS deploy |
| [`AGENTS.md`](../../AGENTS.md) | Agent tooling, Windows-канон |
| [`PANEL_DEPLOY.md`](../deploy/PANEL_DEPLOY.md) | Норма прав caddy, аудио-бандл |
| [`TASK_CLOSURE_REVIEW_REGULATION.md`](./TASK_CLOSURE_REVIEW_REGULATION.md) | Гейт закрытия |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Lead-персона задачи — **dynin** (инфраструктура/тулинг), поддержка: ozhegov, vesnin.

### Что построить

1. **ti-1 · `yarn office:ssh` / `yarn vds:run`** — генерик-exec на office-VDS: разовая
   команда ИЛИ локальный `.sh`. Снимает CRLF сам, заливает во временный путь, выполняет,
   убирает за собой (в том числе когда скрипт упал). Закрывает и п.3 ретро #476.
2. **ti-2 · `_ssh-panel-deploy.mjs`** — `chmod -R a+rX` после распаковки (caddy не root)
   и сохранение `dist/compare-audio` (вне git) через `rm -rf dist/*`; `--audio <dir>` —
   заливка бандла из локального корпуса.
3. **ti-3 · `_ssh-panel-smoke.mjs`** — прод-смоук с owner-cookie: секрет читается с VDS и
   не печатается; сценарий доступ → промокод → регистрация → эпоха `permVersion` → revoke.
   `--read-only` — безопасный режим без записи в прод-стор.
4. **ti-4 · ложный красный `task:review:run`** — путь к артефакту и dry-run строки в
   stdout (PowerShell красит stderr как `NativeCommandError`); гард «LGTM несовместим с
   P0/P1» решает по маркеру, а не по слову «P1» в прозе.
5. **ti-5 · гард «фаза не носит `githubIssue` эпика»** — архивная фаза с Issue эпика
   закрыла бы весь эпик на вечернем ритуале.
6. **ti-6 · Windows-канон** — `node -e` с JSON/`$()`/переносами только файлом; здесь же
   остальные грабли PS 5.1, пойманные вживую.

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| SSH-обвязка | `scripts/_ssh-office-exec.mjs` | connect/exec/sftp поверх `_ssh-office-config`; чистые функции экспортируются |
| Деплой панели | `scripts/_ssh-panel-deploy.mjs` | права под caddy, аудио-бандл |
| Смоук | `scripts/_ssh-panel-smoke.mjs` | чеканка owner-cookie + сценарий по `/v1/panel/*` |
| Гард реестра | `scripts/lib/task-registry.mjs` | `findEpicIssueCollisions`, фильтр очереди закрытия |
| Гард ревью | `scripts/lib/task-closure-review.mjs` | `hasP0P1Blockers` (fail-closed) |
| Канон | `AGENTS.md`, `docs/CONTRIBUTING.md` | нормы + discoverability команд |

**Запрещено:**

- Заводить вторую ssh2-обвязку вместо `_ssh-office-config` (#349).
- Печатать секреты (`PANEL_SESSION_SECRET`, промокод целиком) в лог.
- Менять формат `registry.json` и state-машину closure-ревью.
- Чинить 189 исторических строк реестра в этом PR (отдельная задача) — гард обязан
  снимать вред без правки данных.
- `process.exit()` в новых скриптах — только `process.exitCode`.

### Тесты

| Область | Минимум |
|---------|---------|
| `_ssh-office-exec` | CRLF-стрип, квотирование аргументов (пробел/апостроф/`$()`), нормализация `--` |
| `_ssh-panel-smoke` | вектор owner-токена + **гард дрейфа**: токен принимается собранным ядром `panel-auth`; протухший TTL отвергается |
| Гард реестра | фикстуры (свой Issue / null / Issue эпика, битый `parentEpic`, эпик без Issue) + регрессия по живому `registry.json` |
| Гард P0/P1 | отрицания, отрицание с пояснением, настоящие блокеры, markdown-пункт (fail-closed) |

### Definition of Done

- [ ] Все 6 ti в одном PR со ссылкой на #485.
- [ ] `yarn test:scripts` — зелёный.
- [ ] ti-1/ti-2/ti-3 проверены **на живом VDS**, а не только тестами.
- [ ] Прод-панель не повреждена; `/tmp` VDS без хвостов.
- [ ] Секреты не в логах.
- [ ] Code review (branch, Tier T2) — LGTM.
- [ ] LGTM Teamlead (closure review).

### Out of scope

- Починка данных реестра (189 фаз-носителей `githubIssue` эпика).
- Остаток #476: merge-driver реестров, `pr:land`, mojibake-гейт, Tier из манифеста,
  ветко-гард сессии.
- Проход по `process.exit()` в остальных скриптах (`code-review.mjs` и др.).

---

## Заметки для человека-постановщика

1. Issue #485 (tooling-retro) — этот файл в описании карточки реестра.
2. `githubIssue` карточки поднимается с `null` на `485` **только когда взяты все 6
   пунктов** — иначе `task:close-github` закроет ишью по части (это ровно баг ti-5).
3. После merge: `yarn task:archive vds-panel-tooling --notes "…"` → `yarn task:close-github`.

### Проверка после PR

```bash
yarn test:scripts
yarn office:ssh 'hostname'                      # живой VDS
node scripts/_ssh-panel-smoke.mjs --read-only   # owner 200, аноним 404
yarn task:close-github:dry                      # фазы-носители Issue эпика заблокированы
```

---

## Связь с дорожной картой

Продолжает линию agent-tooling-friction (#433 → #469 → этот пакет): ретроспектива сессии
превращается в инструменты в тот же/следующий день, каждый — против измеренного трения.
