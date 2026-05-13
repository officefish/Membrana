# packages/services — раздел сервисов

Этот раздел содержит **автономные пакеты-сервисы** с чистой бизнес-логикой и тонким React-слоем.

Каждый подкаталог — самостоятельный vite-ts-react пакет, разрабатываемый независимо от остального кода. Подробные соглашения: [../../docs/SERVICES.md](../../docs/SERVICES.md).

## Доступные сервисы

| Сервис | Назначение | Роль (по [VIRTUAL_TEAM_PROMPT](../../docs/VIRTUAL_TEAM_PROMPT.md)) |
|--------|-----------|---------------------------------------------------------------------|
| [`audio-analyzer`](./audio-analyzer) | Анализ аудио: live (микрофон / MediaStream) + file (File / Blob / AudioBuffer). FFT, центроид, flux, RMS, детекция по порогам, пресеты (drone/speech/music). | Математик + Музыкант |

## Как добавить новый сервис

1. Создай папку `packages/services/<имя>/` по образцу `audio-analyzer/`.
2. Заполни `package.json`, `tsconfig.json`, `vite.config.ts`, `src/index.ts`.
3. Пропиши alias в `apps/client/vite.config.ts` и `apps/client/tsconfig.app.json`.
4. Добавь сервис в таблицу выше.
5. Получи `LGTM` от Teamlead.

Полный чек-лист — в [SERVICES.md](../../docs/SERVICES.md#создание-нового-сервиса).
