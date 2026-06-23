# Client browser smoke (Playwright S1)

Optional CI — не блокирует PR. См. [`docs/LGTM_SMOKE_TESTING.md`](../../../docs/LGTM_SMOKE_TESTING.md).

## Локально

```bash
yarn workspace @membrana/client build
yarn smoke:test
yarn smoke:test -- --headed
yarn smoke:test -- --grep "@smoke"
```

Первый раз: `yarn workspace @membrana/client exec playwright install chromium`

При первом заходе выбрать **«Автономный узел»** в модалке «Режим узла» (spec делает это автоматически).

## Новый тест

1. Добавить `data-testid` по паттерну `<module>-<element>`.
2. Файл `e2e/smoke/*.spec.ts`, title содержит `@smoke`.
3. Не проверять реальный микрофон/WebSocket в S1.

## CI

Workflow `.github/workflows/e2e-smoke.yml` — `continue-on-error: true`.
