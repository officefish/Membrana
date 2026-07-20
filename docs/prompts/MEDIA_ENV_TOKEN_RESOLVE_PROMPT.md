# Промпт: media env/token resolve

> Размер: **S** · `id` = `media-env-token-resolve` · [#723](https://github.com/officefish/Membrana/issues/723).

## Контекст

Нет аналога `resolveOfficeToken` для media → 401 / путаница с office `API_INTERNAL_TOKEN`.

## Промпт целиком

`scripts/lib/media-token.mjs` + `yarn media:env:check` (URL + источник токена, без секрета).
Документировать `MEDIA_API_*` в `membrana-env-secrets-guard`. Голый `API_INTERNAL_TOKEN` без media URL — не media-токен.

### Definition of Done

- [x] resolveMediaEnv / pickMediaEnv + тесты
- [x] media:env:check в package.json
- [x] env-secrets-guard обновлён
