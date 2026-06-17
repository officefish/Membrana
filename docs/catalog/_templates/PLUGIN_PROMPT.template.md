# Плагин: <!-- id --> — <!-- имя -->

> **Catalog-спецификация** (живая правда о плагине).  
> Parent module: `<!-- microphone | sample-library -->`  
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `<!-- PLUGIN_ID constant -->` |
| **parentModuleId** | `…` |
| **Версия** | `…` |
| **Lead-роль** | Ozhegov / Dynin / Rodchenko |
| **Статус catalog** | `draft` |

---

## 2. Зачем пользователю

<!-- 2–4 предложения: что видит пользователь при активном плагине. -->

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| plugin inactive | Панель скрыта / свёрнута |
| нет потока | «Ожидание микрофона» / disabled анализ |
| анализ | live-обновление метрик |
| error | … |

Sidebar: ветка в `pluginSidebarDetails.tsx` (если есть настройки).

---

## 4. install / teardown

- **install(`ModuleContext`)**: <!-- подписки hub, LiveSampler, timers -->
- **teardown**: <!-- отписки, stop sampler -->
- React-эффекты — в panel/hooks, не в install (кроме долгоживущих ресурсов).

Эталон: [`MODULE_AND_PLUGIN_UI.md`](../../MODULE_AND_PLUGIN_UI.md) §0.

---

## 5. Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Фабрика | `create…Plugin()` | `Plugin<TConfig>` |
| State | `…PluginState.ts` | singleton + `useSyncExternalStore` |
| Panel | `…Panel.tsx` | только презентация |
| Сервис | `@membrana/…-service` | чистая математика / классификация |

### Запрещено

- Второй `AudioContext` в обход engine
- Бизнес-логика в panel (только отображение snapshot)
- Импорт panel другого плагина

---

## 6. Конфиг

```ts
interface <!-- Name -->PluginConfig {
  // defaultConfig + persist
}
```

---

## 7. Аудио-контракт

| Поле | Значение |
|------|----------|
| Источник | mic hub / sample playback / none |
| Engine | `LiveSampler` + `FftAnalyzer` / … |
| Sample rate | из `AudioContext` engine |

---

## 8. Журнал / telemetry

<!-- reportType, LiveJournalService, droneDetectionHub — или «нет» -->

---

## 9. Тестирование

| Область | Файл |
|---------|------|
| Unit | `….test.ts` |

---

## 10. Связанные task-промпты

- …

---

## 11. Changelog

| Дата | Изменение |
|------|-----------|
| YYYY-MM-DD | draft |
