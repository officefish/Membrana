# M2 — вердикт: дома крепления

> Носитель вердикта. Протокол: `docs/seanses/server-plugin-foundation-m2-mount-homes-2026-08-17.md`.
> Замечание аудита A2-1 поднято из тела протокола в носитель (иначе решение терялось).

- **Дома первой очереди — два:** `background-office/journal` · `background-media/collections`
  (длинная форма `<пакет>/<домен>`). **Устройства отложены** до появления Nest-модуля
  `background-devices` — не «сейчас», не «никогда».
- **Домом делает интерфейс** `IPluginHost` из `plugin-contracts`, три обязательных члена:
  `readonly mountTargetId: string` · `registerPlugin(manifest, module)` ·
  `getRegisteredPlugins(): ReadonlyArray<PluginManifest>`.
- **Реестр домов:** `HOME_REGISTRY` — статический const в `plugin-contracts`; тип ключей
  экспортируется как `HomeName`. Добавление дома — PR в `plugin-contracts` при существующем
  Nest-модуле. Манифест с `mountTarget ∉ HOME_REGISTRY` отвергается валидацией до рантайма.
- **Уточнение типа (A2-1, поднято аудитом):** поле манифеста `mountTarget` типизируется
  как `HomeName` (сужение `string` из M1 — легально, аналогично делегированной типизации
  `triggers`).
- **Дефицит фактами:** ни journal, ни collections контракта хоста сегодня не несут
  (по три отсутствующих члена); в `plugin-contracts` отсутствуют `IPluginHost`,
  `HOME_REGISTRY`, `HomeName`.
- **Замечание аудита A2-3 (при реализации):** сигнатура `registerPlugin` не должна
  тянуть Nest-тип `Type` в framework-нейтральный `plugin-contracts` — заменить
  нейтральным параметром при вёрстке контракта.
