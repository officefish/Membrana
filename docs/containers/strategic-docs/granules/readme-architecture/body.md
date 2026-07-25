## Архитектура

```
membrana/
├── packages/
│   ├── core/                 # Базовые сущности, контракты, утилиты
│   ├── agenda/               # Модули, плагины, store (зависит от core)
│   ├── device-board/         # Сценарии устройств (зависит от core)
│   ├── libs/                 # Shared UI/отчёты (audioDataViz, detector-report, …)
│   ├── services/             # Автономные TS-сервисы (foundation + analyzer)
│   ├── background-office/    # NestJS: Claude, Linear, GitHub (:3000)
│   ├── background-media/     # NestJS: сэмплы + trends по deviceId (:3010, #58)
│   └── background-cabinet/   # NestJS: auth, мембраны, узлы, ключи (:3020, #67)
│
└── apps/
    ├── client/               # Vite + React — полевой клиент (:5173)
    ├── cabinet/              # SPA личного кабинета
    ├── membrana-studio/      # Electron: расширенный desktop-клиент
    └── docs/                 # Mintlify-документация (публикация отдельно)
```

**Границы:** `packages/services/*` — чистая бизнес-логика + React-хуки; `background-*` — NestJS data-plane и интеграции, **не** входят в граф сервисов. Канон: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/BACKGROUND_SERVERS.md`](./docs/BACKGROUND_SERVERS.md), [`docs/SERVICES.md`](./docs/SERVICES.md).
