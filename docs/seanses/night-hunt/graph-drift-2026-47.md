# Night Hunt: monorepo-dependency-graph

| Поле | Значение |
|------|----------|
| Week | 2026-47 |
| Generated (UTC) | 2026-11-17T16:52:57.207Z |
| Channel | claude |

---

## Находки

- Правило §1 `service-depends-on-core-only` нарушено 11 раз, все — зависимости прода (`dependencies`), циклов при этом нет. Сервисы должны зависеть только от `@membrana/core`, но зависят от других сервисов и библиотек.

- `@membrana/drone-detection-orchestrator-service` (`packages/services/drone-detection-orchestrator/package.json`) — главный нарушитель: 7 из 11 рёбер. Он тянет в прод `→ @membrana/cepstral-detector-service`, `→ @membrana/detector-base`, `→ @membrana/detector-report`, `→ @membrana/harmonic-detector-service`, `→ @membrana/spectral-flux-detector-service`, `→ @membrana/template-match-detector-service`, `→ @membrana/trends-detector-service`. Это оркестратор, собирающий поддетекторы напрямую.

- `@membrana/fft-analyzer-service` (`packages/services/fft-analyzer/package.json`) `→ @membrana/audio-engine-service` и `@membrana/sample-playback-service` (`packages/services/sample-playback/package.json`) `→ @membrana/audio-engine-service` — два сервиса зависят от `audio-engine-service` как от сервиса, а не от core.

- `@membrana/detection-ensemble-service` (`packages/services/detection-ensemble-service/package.json`) `→ @membrana/detector-base` — ансамбль зависит от базового слоя детекторов в проде.

- `@membrana/media-library-service` (`packages/services/media-library/package.json`) `→ @membrana/plugin-contracts` — сервис зависит от контрактов плагинов, что выходит за рамки «только core».

- Отдельная системная деталь: `@membrana/detector-base` (`packages/services/detectors/base`) сам `→ @membrana/audio-engine-service`. Поскольку на `detector-base` завязаны почти все детекторы и оркестратор, этот узел концентрирует транзитивную связность прода.

## Риски

- `drone-detection-orchestrator` с 7 прод-рёбрами на конкретные детекторы — жёсткая связка: смена контракта любого из `cepstral/harmonic/spectral-flux/template-match/trends-detector` или `detector-report` ломает прод-сборку оркестратора. Адрес: `packages/services/drone-detection-orchestrator/package.json`.

- `audio-engine-service` как прод-зависимость у `fft-analyzer-service`, `sample-playback-service` и транзитивно через `detector-base` — узкое место: он собирает на себя прод-замыкание большой части детекторного дерева.

- Нарушения — именно прод (`dependencies`), а не сборочные. По §1 это приговор, а не вопрос: они расширяют рантайм-поверхность сервисов и мешают их независимому деплою/версионированию.

- Замер склеивает `dependencies` и `devDependencies` на уровне `yarn.lock`; вид каждого из 11 рёбер уточнён по `package.json` подозреваемого и подтверждён как prod. Отдельного ручного риска «непрочитанных манифестов» здесь нет — все 11 прочитаны.

## Рекомендации

- Для `drone-detection-orchestrator` (`packages/services/drone-detection-orchestrator/package.json`) вынести взаимодействие с поддетекторами на интерфейсы из `@membrana/core` (реестр/контракты детекторов), заменив 7 прямых прод-рёбер на инъекцию реализаций. Это убирает большинство нарушений разом.

- По паре `fft-analyzer-service` и `sample-playback-service` → `audio-engine-service`: перенести нужные типы/API audio-engine в `@membrana/core` (или в выделенный contracts-пакет уровня core) и переключить обоих потребителей на него. Адреса: `packages/services/fft-analyzer/package.json`, `packages/services/sample-playback/package.json`.

- Разобраться с `detector-base → audio-engine-service` (`packages/services/detectors/base`): так как `detector-base` — общий слой под детекторами, его прод-зависимость от audio-engine транзитивно тянется во всё дерево; свести её к core-контракту с наибольшим эффектом.

- Для `media-library-service → plugin-contracts` (`packages/services/media-library/package.json`) и `detection-ensemble-service → detector-base` (`packages/services/detection-ensemble-service/package.json`) решить явно: либо перевести требуемые куски в core, либо зафиксировать исключение из §1 в ARCHITECTURE с обоснованием, чтобы правило и реальность совпадали.

- Закрепить проверку в CI: fail при любом новом прод-ребре `service → не-core`, чтобы после расшивки 11 текущих нарушений счётчик не рос обратно.
