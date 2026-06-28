# @membrana/usercase-catalog-service

## Что делает

Фасад entitlement над инъецируемым UserCase-каталогом: bundled / community / tariff SKU, `canApply`, `loadDocumentIfEntitled`. Пакет зависит только от `@membrana/core`.

## Установка

Workspace dependency в монорепо: `"@membrana/usercase-catalog-service": "*"`.

## Использование

```ts
import {
  ClientUserCaseCatalogService,
  type UserCaseCatalogPort,
} from '@membrana/usercase-catalog-service';

declare const catalog: UserCaseCatalogPort; // composition root supplies the owner adapter
const service = new ClientUserCaseCatalogService({ catalog });
const cards = service.listCards('microphone');
```

## API

- `ClientUserCaseCatalogService` — entitlement facade
- `UserCaseCatalogPort` — runtime-neutral input port
- `getDefaultClientUserCaseCatalogService` / `resetDefaultClientUserCaseCatalogService`
- `useClientUserCaseCatalogService` — React hook

## Слой

**Platform facade**: зависит только от `@membrana/core`. Реализация каталога подключается в composition root (`apps/client`); см. решение Issue #185.
