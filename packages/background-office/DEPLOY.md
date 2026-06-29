# Деплой `@membrana/background-office`

> Канон для оператора: **как сейчас устроен деплой**, **куда класть секреты**, **когда переезжать с Fly на VPS**.  
> Пакет: `packages/background-office` · эпик Night Hunt: [`NIGHT_HUNT_SPRINT_PROMPT.md`](../../docs/prompts/NIGHT_HUNT_SPRINT_PROMPT.md)

---

## Две площадки (намеренно)

Сейчас office **может** жить в двух местах одновременно — с **разными ролями**:

```mermaid
flowchart LR
  subgraph fly [Fly.io — эксперимент]
    NH[Night Hunt cron]
    OR[OpenRouter]
    GH[GitHub PR]
  end
  subgraph vps [VPS — prod]
    WH[Linear webhooks]
    CL[Claude /v1/claude/*]
    RAG[/api/rag/query]
  end
  NH --> OR --> GH
```

| Площадка | URL (пример) | Роль сейчас | Обязательна? |
|----------|--------------|-------------|--------------|
| **Fly.io** | `https://membrana-office-night-hunt.fly.dev` | Night Hunt (cron → OpenRouter → PR) | Для NH2 пилота — **да** |
| **VPS** | `https://office.membrana.space` | Prod: Claude, Linear, webhooks, RAG | Для ритуалов / интеграций — **да** |

**Не смешивать секреты в git.** Fly: `fly secrets`. VPS: `/etc/membrana/office.env`. Локально: `.env` + `packages/background-office/.env`.

Подробный чеклист Fly: [`docs/deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md`](../../docs/deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md).  
Подробный чеклист VPS: [`docs/deploy/BACKGROUND_OFFICE_DEPLOY.md`](../../docs/deploy/BACKGROUND_OFFICE_DEPLOY.md).

---

## Что считается «сейчас» (после merge PR #175)

### На Fly (пилот Night Hunt)

- Приложение: `membrana-office-night-hunt` (`deploy/fly.office.toml`)
- Включено: `NIGHT_HUNT_ENABLED=true`, `@nestjs/schedule`, `OpenRouterService`
- Cron (UTC): design-drift ср 07:00 · graph вт 08:30 · services-api пн 11:00
- Ручной запуск: `POST /v1/night-hunt/run/:jobId` (нужен `X-Membrana-Token`)
- Выход: GitHub PR → `docs/seanses/night-hunt/*-YYYY-WW.md`, label `night-hunt`

### На VPS (без изменений)

- Linear webhook, persona ask, RAG — как в v0.1
- Night Hunt **не обязан** быть на VPS, пока Fly справляется

### Локально / CI

- `yarn office:dev` — разработка
- `yarn office:docker:*` — smoke образа
- Prod-ритуалы (`yarn ritual:day`) — **не** через Fly; прямой Anthropic в корневом `.env`

---

## NH2: деплой на Fly (пошагово)

### 1. flyctl

```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
fly auth login
fly apps create membrana-office-night-hunt --org personal
```

(Если app уже создан — пропустить `apps create`.)

### 2. Сборка из корня монорепо

```bash
fly deploy --config deploy/fly.office.toml --dockerfile packages/background-office/Dockerfile
```

### 3. Секреты

```bash
fly secrets set -a membrana-office-night-hunt \
  API_INTERNAL_TOKEN="<случайная строка>" \
  ANTHROPIC_API_KEY="<из корневого .env>" \
  LINEAR_API_KEY="<из .env>" \
  LINEAR_WEBHOOK_SECRET="<из .env>" \
  GITHUB_TOKEN="<PAT с scope repo — для PR>" \
  GITHUB_OWNER=officefish \
  GITHUB_REPO=Membrana \
  NIGHT_HUNT_ENABLED=true \
  OPENROUTER_API_KEY="<из .env.llm-proxy>" \
  OPENROUTER_MODEL=anthropic/claude-haiku-4.5 \
  NIGHT_HUNT_BASE_BRANCH=techies68
```

| Переменная | Для Night Hunt | Примечание |
|------------|----------------|------------|
| `OPENROUTER_API_KEY` | **обязательна** | единственный LLM для hunt |
| `GITHUB_TOKEN` | **обязательна** | **repo** write, не read-only |
| `NIGHT_HUNT_ENABLED` | **обязательна** | `true` |
| `API_INTERNAL_TOKEN` | **обязательна** | для manual run / backup workflow |
| `ANTHROPIC_*`, `LINEAR_*` | формально обязательны | zod-схема v0.1; hunt их не вызывает |

OpenRouter для локальных скриптов: [`.env.llm-proxy.example`](../../.env.llm-proxy.example) (что required vs optional).

### 4. Smoke

```bash
curl https://membrana-office-night-hunt.fly.dev/health

curl -X POST https://membrana-office-night-hunt.fly.dev/v1/night-hunt/run/design-token-drift \
  -H "X-Membrana-Token: <API_INTERNAL_TOKEN>"
```

`skipped` в JSON при 402/503 OpenRouter — **норма** (optional job).

### 5. Backup (опционально)

Repo secrets: `OFFICE_URL`, `OFFICE_API_TOKEN` → workflow `.github/workflows/night-hunt-office-trigger.yml`.

---

## Пределы Fly (когда **ещё** можно оставаться)

Текущий профиль в `fly.office.toml`: **1× shared-cpu, 512 MB RAM**, `min_machines_running = 1`.

| Параметр | Оценка для Night Hunt |
|----------|------------------------|
| Нагрузка | ~3 cron/job в неделю + редкий manual POST |
| RAM | Достаточно, если нет embedded RAG index на диске |
| Диск | Stateless; LanceDB на Fly **не** планируем |
| Сеть | Исходящие к OpenRouter + GitHub API |
| Стоимость | Free allowance / малый счёт |

**Оставайтесь на Fly**, если:

- Night Hunt стабильно открывает PR (или корректно `skip`)
- Нет требования принимать Linear webhooks на том же хосте
- Не нужен `RAG_REPO_ROOT` с полным индексом на сервере
- Память стабильно < 400 MB в `fly metrics`

---

## Когда **уже имеет смысл переезд на VPS**

Переезд = **добавить** переменные Night Hunt в `/etc/membrana/office.env` на `office.membrana.space`, задеплоить образ, **выключить** Fly (`fly apps destroy` или `NIGHT_HUNT_ENABLED=false` на Fly).

### Жёсткие триггеры (делать миграцию)

| # | Сигнал | Почему Fly не тянет |
|---|--------|---------------------|
| T1 | Fly **suspend** / billing block / нет always-on | cron не сработает |
| T2 | Нужен **один** публичный URL для всего office | webhook + hunt + RAG на одном домене |
| T3 | Включаем **`RAG_REPO_ROOT`** + archive circuit на сервере | диск + RAM + `OPENAI_API_KEY` embeddings |
| T4 | Память **> 512 MB** стабильно или OOM kill в логах | лимит VM Fly |
| T5 | **> 1** инстанс / HA / второй регион | Fly paid + сложность; проще VPS compose |
| T6 | Существенный трафик на `/v1/claude/*` через тот же процесс | prod latency + rate limits |

### Мягкие триггеры (планировать переезд)

| # | Сигнал | Действие |
|---|--------|----------|
| S1 | 2+ недели подряд **нет PR** из-за Fly (не proxy) | расследовать → VPS |
| S2 | OpenRouter OK, но GitHub rate limit от частых веток | объединить jobs или VPS с очередью |
| S3 | Хотим night hunt + **Linear webhook** в одном логе/метрике | единый office на VPS |
| S4 | Fly invoice **> $5–10/мес** при том же объёме | VPS уже оплачен — миграция дешевле |

### Что **не** является причиной переезда

- Разовый `skipped` из-за OpenRouter 402 (пополнить кредиты)
- Отсутствие PR в неделю без cron (проверить `NIGHT_HUNT_ENABLED`, логи)
- Prod-ритуалы на прямом Anthropic (они **никогда** не были на Fly)

---

## Процедура миграции Fly → VPS

1. Добавить в `/etc/membrana/office.env` на VPS:
   ```env
   NIGHT_HUNT_ENABLED=true
   OPENROUTER_API_KEY=...
   OPENROUTER_MODEL=anthropic/claude-haiku-4.5
   NIGHT_HUNT_BASE_BRANCH=techies68
   ```
   И **`GITHUB_TOKEN` с repo write**, если на VPS был только read.

2. `git pull` на VPS → `./deploy/office-stack.sh build && ./deploy/office-stack.sh up`

3. Smoke на `https://office.membrana.space/health` + manual night-hunt run

4. Обновить `OFFICE_URL` в GitHub secrets (если используется backup workflow)

5. `fly secrets set NIGHT_HUNT_ENABLED=false -a membrana-office-night-hunt` или destroy app

6. Запись в `docs/day-sprint/night-hunt-sprint-2026-06-25/CLOSURE.md` (при закрытии NH2)

---

## Матрица: куда класть ключи

| Ключ | Локальный dev | Fly (NH2) | VPS prod |
|------|---------------|-----------|----------|
| `ANTHROPIC_API_KEY` | корневой `.env` | secrets (схема) | `office.env` |
| `OPENROUTER_API_KEY` | `.env.llm-proxy` | secrets | `office.env` (после миграции) |
| `GITHUB_TOKEN` read | `.env` | — | `office.env` |
| `GITHUB_TOKEN` write | `.env.llm-proxy` / PAT | secrets (hunt) | при миграции |
| `API_INTERNAL_TOKEN` | package `.env` | secrets | `office.env` |

---

## Мониторинг пилота (первые 2 недели)

| Проверка | Частота | Ожидание |
|----------|---------|----------|
| `GET /health` на Fly | раз в день | `status: ok` |
| Открытые PR `label:night-hunt` | утро `yarn night-hunt:pr-review` | 0–3 PR, skip OK |
| `fly logs -a membrana-office-night-hunt` | после cron | `night-hunt PR created` или `skipped` |
| OpenRouter balance | раз в неделю | не 402 на smoke |

---

## Связанные файлы

| Файл | Назначение |
|------|------------|
| `deploy/fly.office.toml` | Fly app config |
| `Dockerfile` | образ (build из корня монорепо) |
| `.env.example` | локальные переменные пакета |
| [`BACKGROUND_OFFICE_FLY_DEPLOY.md`](../../docs/deploy/BACKGROUND_OFFICE_FLY_DEPLOY.md) | краткий Fly quickstart |
| [`BACKGROUND_OFFICE_DEPLOY.md`](../../docs/deploy/BACKGROUND_OFFICE_DEPLOY.md) | VPS O1–O4 |

---

## Версия

- **2026-06-25** — Night Hunt NH2: dual Fly + VPS, пороги миграции
