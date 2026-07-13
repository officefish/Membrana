# CURRENT_TASK

> **Буфер** — при конфликте проигрывает [`MAIN_DAY_ISSUE.md`](./MAIN_DAY_ISSUE.md) и реестру.

## live-neural-combined-fusion (2026-07-13)

**Мандат владельца 2026-07-13: нейро-fusion ОБЯЗАТЕЛЕН для FREE** — DSP-only combined (#372)
недостаточен для выпуска. Отменяет точку 3 консилиума `s2-combined-uc-dsp`; остальные границы
консилиума в силе. Критпуть FREE: **этот спринт → S2 live-smoke (гейт) → S3 упаковка UC**.

**Трек:** `live-neural-combined-fusion` (M, Issue #415, из инсайта
`insight-live-neural-combined-detector`, adopted решением владельца)

### Старт (вставить в начало новой сессии)

```text
Следуй docs/prompts/TASK_PROMPT_WORKFLOW.md и промпту:
docs/prompts/LIVE_NEURAL_COMBINED_FUSION_PROMPT.md (блок «Промпт целиком»).
```

### Scope (кратко — канон в промпте)

- yamnet → `createCombinedStreamDetectors()` (`apps/client/src/plugins/mic-combined-detection/`)
  через готовый `loadYamnetBrowserModel` (офлайн-бандл) — одна точка питает клиент И device-board мост
- Graceful DSP-only деградация с **видимой** меткой (молчаливая — запрещена)
- Честная метка «спектр+нейро» в панели/карточке S2 UC
- Перф-замер инференса на живом каденсе (p50/p95, документировать)
- **Запрещено:** новые узлы палитры, правка ядра #357 / make-detection-fusion,
  сетевые загрузки модели, прямые импорты между детекторами

### Команды

```bash
yarn turbo run test --filter=@membrana/client --filter=@membrana/detection-ensemble-service
yarn catalog:verify-client
```

**Инсайт:** [`insight-live-neural-combined-detector`](./insights/insight-live-neural-combined-detector/INSIGHT.md)
**Промпт:** [`LIVE_NEURAL_COMBINED_FUSION_PROMPT.md`](./prompts/LIVE_NEURAL_COMBINED_FUSION_PROMPT.md)
**Консилиум-границы:** [`seanses/s2-combined-uc-dsp-2026-07-12.md`](./seanses/s2-combined-uc-dsp-2026-07-12.md) (точка 3 отменена владельцем)
**Реестр:** `id: live-neural-combined-fusion` (`status: active`, `insightId: insight-live-neural-combined-detector`)
