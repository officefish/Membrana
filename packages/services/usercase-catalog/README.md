# @membrana/usercase-catalog-service

## Что делает

Фасад entitlement над bundled UserCase-каталогом из `@membrana/device-board`: bundled / community / tariff SKU, `canApply`, `loadDocumentIfEntitled`.

## Установка

Workspace dependency в монорепо: `"@membrana/usercase-catalog-service": "*"`.

## Использование

```ts
import {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
} from '@membrana/usercase-catalog-service';

const service = getDefaultClientUserCaseCatalogService();
const cards = service.listCards('microphone');
```

## API

- `ClientUserCaseCatalogService` — entitlement facade
- `getDefaultClientUserCaseCatalogService` / `resetDefaultClientUserCaseCatalogService`
- `useClientUserCaseCatalogService` — React hook

## Слой

**Platform facade** (исключение из foundation-only): зависит от `@membrana/core` + `@membrana/device-board` (catalog types + bundled index). См. Phase 3 консилиум A1.
