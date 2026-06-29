# Фаза 0 — подробный runbook куратора

**Дата:** 27 июня 2026 · **Версия:** 0.1 · **Статус:** рабочий
**Часть:** `CURATOR_INTERN_ONBOARDING_PLAYBOOK.md`, Фаза 0

> Пошаговое разворачивание подготовки до прихода стажёра. Команды даны под
> `officefish/Membrana` — замени, если репозиторий другой. После каждого шага —
> проверка. Порядок шагов важен (особенно 0.1).

---

## 0.1 GitHub — защита `main` (ruleset + CODEOWNERS)

Порядок критичен: **сначала** CODEOWNERS в `main`, **потом** правило. Если
включить требование code-owner-ревью до появления файла, репозиторий считается
бесхозным.

**Шаг 1. Создай `.github/CODEOWNERS` и влей в `main`.**

```
# .github/CODEOWNERS
# Владелец по умолчанию — ты. Замени на свой username/команду.
*                       @officefish

# Защитить сам файл владельцев и чувствительные пути
/.github/               @officefish
/packages/background-office/   @officefish
```

Code owner должен иметь **write**-доступ к репозиторию (стажёр им быть не может —
и не должен).

**Шаг 2. Создай ruleset на `main` (через `gh`).**

```bash
gh api --method POST \
  -H "Accept: application/vnd.github+json" \
  "repos/officefish/Membrana/rulesets" \
  --input - <<'JSON'
{
  "name": "Protect main (PR + CODEOWNERS)",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "pull_request", "parameters": {
        "require_code_owner_review": true,
        "require_last_push_approval": true,
        "required_approving_review_count": 1,
        "required_review_thread_resolution": true,
        "dismiss_stale_reviews_on_push": false
    }},
    { "type": "non_fast_forward" },
    { "type": "deletion" }
  ]
}
JSON
```

Это запрещает прямой push в `main`, требует PR с твоим одобрением как
code-owner, блокирует force-push и удаление ветки.

**Решение по bypass.** Если хочешь иметь возможность пушить в `main` напрямую в
аварии — добавь себя в bypass-список правила. Это ослабляет защиту и портит
чистоту следа; для одиночного ревью лучше без bypass.

**Проверка:**

```bash
gh api "repos/officefish/Membrana/rulesets"          # правило в списке, active
git push origin main --dry-run                        # должно отлететь по правилу
```

- [ ] CODEOWNERS в `main`.
- [ ] Ruleset активен, прямой push отклоняется.

## 0.2 GitHub — доступ стажёра

Рабочая модель — **scoped write + защищённый `main`**: стажёр пушит фиче-ветки
прямо в репозиторий, а ruleset из 0.1 не пускает их в `main` без твоего ревью.
Один маршрут, без форка и без синхронизации форка — меньше всего мест ошибиться.

```bash
# Дать стажёру write (push) как collaborator:
gh api --method PUT \
  "repos/officefish/Membrana/collaborators/<intern-username>" \
  -f permission=push
```

- [ ] Стажёр добавлен с write (push); прямой push в `main` блокируется ruleset'ом.

## 0.3 Anthropic — отдельный workspace с лимитом

Цель: его расход атрибутируется и ограничен (это и есть прозрачность).

1. Console → **Settings → Workspaces** → создать workspace под стажёра.
2. В этом workspace выпустить **API-ключ** (он привязан к workspace).
3. Поставить workspace **месячный spend-лимит**.
4. Передать стажёру ключ (по защищённому каналу), не свой продакшен-ключ.

**Проверка:** Console → **Settings → Usage / Cost**, отфильтровать по его
workspace — расход виден отдельной строкой.

- [ ] Workspace создан, ключ выпущен, spend-лимит стоит.
- [ ] Usage/Cost фильтруется по его workspace.

Док: https://platform.claude.com/docs/en/manage-claude/workspaces

## 0.4 Perplexity (Sonar) — его собственный ключ

1. Стажёр (или ты под него) заводит аккаунт Perplexity.
2. В developer/API-настройках добавить кредиты/биллинг и сгенерировать ключ.
3. Ключ — **его**, не долька твоего.

- [ ] Sonar-ключ есть, лежит у стажёра, не в репозитории.

Док: https://docs.perplexity.ai

## 0.5 `.env.example` и fail-fast

Положи в репозиторий пример (без значений), чтобы стажёр знал, что нужно:

```dotenv
# .env.example
PORT=3000
ANTHROPIC_API_KEY=
PERPLEXITY_API_KEY=
GITHUB_TOKEN=
# LINEAR_API_KEY=   # если office дёргает Linear
```

Сервис без обязательных переменных должен падать **внятно** (это часть задачи 1
у стажёра — пусть закроет, но базовая проверка должна быть уже сейчас).

- [ ] `.env.example` в репозитории, реальный `.env` в `.gitignore`.

## 0.6 Проверить инструкцию локального запуска на себе

Инструкция не должна врать. Прогон с **чистого клона**:

```bash
git clone <repo> /tmp/membrana-check && cd /tmp/membrana-check
corepack enable && corepack prepare yarn@4.5.0 --activate
yarn install
cp .env.example .env   # заполнить своими тестовыми ключами
yarn office:dev        # должен подняться на :3000 без ошибок
```

**Проверка:** dev-сервер слушает 3000, в логах нет фатальных ошибок старта.

- [ ] С нуля поднимается по шагам входящего документа.

## 0.7 Завести 3 issue с DoD

Скопируй как есть (DoD из входящего документа):

**Issue 1 — Outbound self-check**

> Диагностика: пинг `api.anthropic.com`, Linear, GitHub, `api.perplexity.ai`,
> сводка со статусом и латентностью.
> DoD: читаемая сводка по 4 эндпоинтам; недостижимый помечается, не роняет
> проверку (таймаут).
> Не-цели: не чинить связность, без ретраев-как-фичи, без алертов, без расписания.

**Issue 2 — `/health` и `/ready`**

> `/health` — живость (наружу не ходит); `/ready` — готовность зависимостей
> (Claude/Linear/GitHub/Perplexity), переиспользует логику задачи 1.
> DoD: оба эндпоинта отвечают; `/ready` отражает реальное состояние;
> поведение задокументировано.
> Не-цели: без auth, без стека метрик/дашбордов.

**Issue 3 — Ресёрч-дайджест («утренняя пресса»)**

> Заметка по одной теме из конфига, Perplexity Sonar, артефакт
> `docs/research/digest-YYYY-MM-DD.md`.
> DoD: ≤ 7 пунктов по убыванию важности; у каждого источник+дата;
> идемпотентность; `--dry-run`; секретарский регистр.
> Не-цели: без расписания, мультимодельности, записи в Linear/GitHub, действий.

- [ ] Три issue заведены, у каждой свой DoD.

## 0.8 Заполнить заглушки входящего документа

Единственное, что блокирует выдачу документа:

- [ ] **Тема дайджеста** в конфиге (выбрать одну, не «новости вообще»).
- [ ] **Имя `yarn`-команды** джобы дайджеста.
- [ ] **Путь к репозиторию** и актуальный `.env.example`.

---

## Ворота Фазы 0

Все чекбоксы выше отмечены → отдаёшь стажёру входящий документ и переходишь к
Фазе 1.
