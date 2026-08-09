# Архив: Neural tier 1.B: NeuralDetector контракт + YAMNet/CLAP skeleton

| Поле | Значение |
|------|----------|
| **ID** | `neural-tier-1b-contract` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-26 |
| **Архивирована** | 2026-08-09 |
| **GitHub Issue** | #47 |
| **Linear** | — |
| **Промпт** | [`docs/INTEGRATIONS_STRATEGY.md`](../../docs/INTEGRATIONS_STRATEGY.md) |

## Заметки при закрытии

ОТМЕНЕНО, не сделано (слово владельца 09.08): контракт NeuralDetector в detector-base так и не заведён — в packages/services/detectors/base/src/types.ts только DetectorFamily 'neural', skeleton yamnet/clap создан 34089bd2 ещё до появления карточки. Цель эшелона 1.B закрыта другим маршрутом: YamnetDetector 9a7ca7fd (PR #266), yamnet в benchmark 8a53826d (PR #268), плагин neural-drone-analyzer, живой fusion 5e42c937 (PR #417); консилиум 2026-06-26 переопределил нейродетектор как family=neural поверх DroneDetector. Переоткрыть, если понадобится второй нейро-детектор (CLAP zero-shot всё ещё scaffold) и общий контракт predict/InferenceContext станет обязательным.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
