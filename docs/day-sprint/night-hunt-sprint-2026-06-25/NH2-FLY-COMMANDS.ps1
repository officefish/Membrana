# NH2 — Fly deploy (operator). Run from repo root after `fly auth login`.
# Canon: packages/background-office/DEPLOY.md
# Do NOT commit secrets. Fill placeholders locally.

$ErrorActionPreference = "Stop"
$App = "membrana-office-night-hunt"

Write-Host "=== 1. App (skip if exists) ===" -ForegroundColor Cyan
# fly apps create $App --org personal

Write-Host "=== 2. Secrets (skip if already set) ===" -ForegroundColor Cyan
# fly secrets set -a $App `
#   API_INTERNAL_TOKEN="<random>" `
#   ANTHROPIC_API_KEY="<from root .env>" `
#   LINEAR_API_KEY="<from .env>" `
#   LINEAR_WEBHOOK_SECRET="<from .env>" `
#   GITHUB_TOKEN="<PAT repo write>" `
#   GITHUB_OWNER=officefish `
#   GITHUB_REPO=Membrana `
#   NIGHT_HUNT_ENABLED=true `
#   OPENROUTER_API_KEY="<from .env.llm-proxy>" `
#   OPENROUTER_MODEL=anthropic/claude-haiku-4.5 `
#   NIGHT_HUNT_BASE_BRANCH=techies68

Write-Host "=== 3. Deploy (from repo root) ===" -ForegroundColor Cyan
fly deploy --config deploy/fly.office.toml --dockerfile packages/background-office/Dockerfile

Write-Host "=== 4. Smoke ===" -ForegroundColor Cyan
curl.exe -sS "https://${App}.fly.dev/health"
Write-Host ""
Write-Host "Manual job (replace TOKEN):" -ForegroundColor Yellow
Write-Host "curl.exe -X POST https://${App}.fly.dev/v1/night-hunt/run/design-token-drift -H `"X-Membrana-Token: TOKEN`""

Write-Host "=== 5. Logs ===" -ForegroundColor Cyan
Write-Host "fly logs -a $App"
