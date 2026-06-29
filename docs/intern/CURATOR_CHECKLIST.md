# Куратор: сводный чеклист онбординга стажёра

Синхронизирован с `CURATOR_PHASE0_RUNBOOK.md` и `CURATOR_INTERN_ONBOARDING_PLAYBOOK.md`.
Статус на 2026-06-29 после Phase 0 scaffold (PR #199).

> **Условные обозначения:**
> `[x]` — сделано · `[ ]` — ожидает человека · `[~]` — частично / требует перепроверки

---

## Фаза 0 — Подготовка (до прихода стажёра)

### 0.1 GitHub — защита `main`

- [x] **CODEOWNERS создан** — `.github/CODEOWNERS` с `@officefish` на `/`, `/.github/`, `/packages/background-office/`
  > Смержен в `main` в PR #199.
  >
  > **Агент проверяет:**
  > ```bash
  > gh api repos/officefish/Membrana/contents/.github/CODEOWNERS | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); console.log(Buffer.from(j.content,'base64').toString())"
  > ```
  > Ожидаемый вывод — строки с `@officefish`.

- [ ] **Ruleset на `main` активен** — требует PR + ревью code-owner, блокирует force-push и удаление
  > Только за человеком. Команда из `CURATOR_PHASE0_RUNBOOK.md §0.1`:
  > ```bash
  > gh api --method POST -H "Accept: application/vnd.github+json" \
  >   "repos/officefish/Membrana/rulesets" --input - <<'JSON'
  > { "name": "Protect main (PR + CODEOWNERS)", "target": "branch",
  >   "enforcement": "active",
  >   "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  >   "rules": [
  >     { "type": "pull_request", "parameters": {
  >         "require_code_owner_review": true, "require_last_push_approval": true,
  >         "required_approving_review_count": 1,
  >         "required_review_thread_resolution": true,
  >         "dismiss_stale_reviews_on_push": false }},
  >     { "type": "non_fast_forward" }, { "type": "deletion" }
  >   ] }
  > JSON
  > ```
  >
  > **Агент проверяет после выполнения:**
  > ```bash
  > gh api "repos/officefish/Membrana/rulesets" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.map(r=>r.name+': '+r.enforcement))"
  > ```
  > Ожидается строка `Protect main (PR + CODEOWNERS): active`.

### 0.2 GitHub — доступ стажёра

- [ ] **Стажёр добавлен как outside-collaborator (read)** или может форкнуть без ограничений
  > Только за человеком:
  > ```bash
  > gh api --method PUT "repos/officefish/Membrana/collaborators/<intern-username>" -f permission=read
  > ```
  >
  > **Агент проверяет после выполнения:**
  > ```bash
  > gh api "repos/officefish/Membrana/collaborators" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.map(u=>u.login+': '+u.role_name))"
  > ```
  > Имя стажёра должно быть в списке.

### 0.3 Anthropic — отдельный workspace со spend-лимитом

- [ ] **Workspace создан, workspace-ключ выпущен, spend-лимит установлен**
  > Только за человеком: console.anthropic.com → Settings → Workspaces.
  > Подробности: `CURATOR_PHASE0_RUNBOOK.md §0.3`.
  >
  > **Агент не может проверить** (нет API-доступа к Anthropic Console).
  > Куратор подтверждает вручную: Console → Usage/Cost → фильтр по workspace стажёра.

### 0.4 Perplexity — ключ для стажёра

- [ ] **Sonar-ключ выдан стажёру (его собственный, не долька твоего)**
  > Только за человеком. Передать по защищённому каналу, не в репозиторий.
  >
  > **Агент не может проверить.** Куратор подтверждает устно/письменно.

### 0.5 `.env.example` и `.gitignore`

- [x] **`.env.example` содержит все нужные переменные** — `PORT`, `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `GITHUB_TOKEN`, `LINEAR_API_KEY`
  > Проверено: все переменные присутствовали до PR #199.
  >
  > **Агент проверяет:**
  > ```bash
  > grep -E "PORT=|ANTHROPIC_API_KEY=|PERPLEXITY_API_KEY=|GITHUB_TOKEN=|LINEAR_API_KEY" .env.example
  > ```
  > Ожидается: 5 строк.

- [x] **Реальный `.env` в `.gitignore`**
  > Проверено: `.env` в `.gitignore`.
  >
  > **Агент проверяет:**
  > ```bash
  > grep "^\.env$" .gitignore && echo "OK" || echo "MISSING"
  > ```

### 0.6 Проверить локальный запуск на себе

- [~] **`yarn office:dev` поднимается без фатальных ошибок**
  > Проверено 2026-06-29: при запуске без `yarn install` падал с `TSError: @nestjs/schedule not found`.
  > После `yarn install` — пакет установлен. Повторный тест после установки **не выполнен** — нужна проверка куратором.
  >
  > **Агент проверяет наличие пакета:**
  > ```bash
  > ls node_modules/@nestjs/schedule/package.json && echo "installed" || echo "MISSING — run yarn install"
  > ```
  >
  > Полный тест запуска — за куратором: `yarn office:dev` должен слушать `:3000`, в логах нет фатальных ошибок.

### 0.7 Три GitHub-issue заведены

- [x] **Issue #195** — T1: Outbound self-check (пинг 4 эндпоинтов)
- [x] **Issue #196** — T2: `/health` и `/ready`
- [x] **Issue #197** — T3: Ресёрч-дайджест через Perplexity Sonar

  > **Агент проверяет:**
  > ```bash
  > gh issue list --state open --json number,title | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); [195,196,197].forEach(n=>{const i=d.find(x=>x.number===n); console.log(n+': '+(i?'OPEN — '+i.title:'NOT FOUND'))})"
  > ```

### 0.8 Заглушки входящего документа

- [ ] **Тема дайджеста** выбрана (конкретная, не «новости вообще»)
  > Только за куратором. Зафиксировать в issue #197.

- [ ] **Имя `yarn`-команды** джобы дайджеста определено
  > Только за куратором. Зафиксировать в issue #197.

---

## Ворота Фазы 0

Все пункты выше отмечены `[x]` → отдать стажёру `INTERN_ONBOARDING_BACKGROUND_OFFICE.md` и перейти к Фазе 1.

**Сейчас блокируют переход:** 0.1-ruleset, 0.2, 0.3, 0.4, 0.6-retest, 0.8.

---

## Фазы 1–5

Полное описание фаз — в `CURATOR_INTERN_ONBOARDING_PLAYBOOK.md`.
Краткая сводка ворот:

| Фаза | Ворота |
|------|--------|
| **1** | Стажёр поднял сервис локально + первая micro-PR (правка дока) прошла ревью |
| **2** | PR T1 (outbound self-check) смержена против DoD |
| **3** | PR T2 (`/health` + `/ready`) смержена против DoD |
| **4** | PR T3 (дайджест) смержена, `docs/research/digest-*.md` создан |
| **5** | Ревью-ритм стабилен; Usage/Cost фильтруется по workspace стажёра |

---

## Быстрая карта: что агент может проверить

| Пункт | Команда агента |
|-------|---------------|
| CODEOWNERS в repo | `gh api repos/officefish/Membrana/contents/.github/CODEOWNERS` |
| Ruleset активен | `gh api repos/officefish/Membrana/rulesets` |
| Коллабораторы | `gh api repos/officefish/Membrana/collaborators` |
| .env.example vars | `grep -E "PORT=\|ANTHROPIC_API_KEY=" .env.example` |
| .env в .gitignore | `grep "^\.env$" .gitignore` |
| @nestjs/schedule установлен | `ls node_modules/@nestjs/schedule/package.json` |
| Issues #195–197 открыты | `gh issue list --state open --json number,title` |
| Антропик workspace | ❌ нет API — только куратор |
| Perplexity ключ | ❌ нет API — только куратор |

---

_Создан: 2026-06-29 · Синхронизирован с CURATOR_PHASE0_RUNBOOK.md и CURATOR_INTERN_ONBOARDING_PLAYBOOK.md · Phase 0 scaffold PR #199_
