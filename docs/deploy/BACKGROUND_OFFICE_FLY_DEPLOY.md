# Fly.io — временный бесплатный хостинг background-office (Night Hunt)

> **Пакет:** `@membrana/background-office`  
> **Альтернатива prod:** `https://office.membrana.space` (VPS) — см. [`BACKGROUND_OFFICE_DEPLOY.md`](./BACKGROUND_OFFICE_DEPLOY.md)

## Почему Fly.io

| Критерий | Fly.io free allowance | Render free | Локальный ПК |
|----------|----------------------|-------------|--------------|
| Always-on для cron | да (shared-cpu-1x) | sleep после idle | выключен ночью |
| Docker | да | да | — |
| Секреты | `fly secrets` | dashboard | .env |

Для **Night Hunt** нужен процесс, который живёт 24/7 и крутит `@nestjs/schedule`.

## Быстрый старт (сегодня)

### 1. Установить flyctl

```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
fly version
```

### 2. Логин и приложение

```bash
cd packages/background-office
fly auth login
fly apps create membrana-office-night-hunt --org personal
```

### 3. Деплой из корня монорепо

Конфиг: [`deploy/fly.office.toml`](../../deploy/fly.office.toml)

```bash
# из корня репозитория
fly deploy --config deploy/fly.office.toml --dockerfile packages/background-office/Dockerfile
```

### 4. Секреты

```bash
fly secrets set -a membrana-office-night-hunt \
  API_INTERNAL_TOKEN="<random>" \
  ANTHROPIC_API_KEY="<direct-key-still-required-by-schema>" \
  LINEAR_API_KEY="<key>" \
  LINEAR_WEBHOOK_SECRET="<secret>" \
  GITHUB_TOKEN="<repo-scope-pat>" \
  GITHUB_OWNER=officefish \
  GITHUB_REPO=Membrana \
  NIGHT_HUNT_ENABLED=true \
  OPENROUTER_API_KEY="<openrouter>" \
  OPENROUTER_MODEL=anthropic/claude-haiku-4.5 \
  NIGHT_HUNT_BASE_BRANCH=techies68
```

`ANTHROPIC_*` и `LINEAR_*` обязательны для zod-схемы office v0.1 даже если Night Hunt использует только OpenRouter.

### 5. Smoke

```bash
curl https://membrana-office-night-hunt.fly.dev/health
curl -X POST https://membrana-office-night-hunt.fly.dev/v1/night-hunt/run/design-token-drift \
  -H "X-Membrana-Token: <API_INTERNAL_TOKEN>"
```

Ответ `skipped` при ошибке proxy — **норма** (optional).

### 6. Ручной trigger (backup)

GitHub Action: `.github/workflows/night-hunt-office-trigger.yml` — ping office если cron на Fly пропустил.

## Поток Night Hunt

1. **Ночь (UTC):** Fly office cron → OpenRouter → PR `docs/seanses/night-hunt/*-YYYY-WW.md`
2. **Утро:** `yarn night-hunt:pr-review` → `docs/NIGHT_HUNT_PR_REVIEW.md` → `main-day-issue`
3. **Merge PR** вручную
4. **Вечер:** `yarn archive:night-hunt` → `docs/archive/night-hunt/<date>/`

## Ограничения free tier

- Лимит RAM/CPU — держать `max_tokens` умеренным в OpenRouter
- При исчерпании кредитов OpenRouter job skip (exit 0 на уровне сервиса)
- Для prod-интеграций Linear webhook лучше оставить на `office.membrana.space`

## Откат

```bash
fly apps destroy membrana-office-night-hunt
```

Локальные ритуалы продолжают работать без office.
