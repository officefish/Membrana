# Архив: Product и Harness Mintlify в двух спринтах

| Поле | Значение |
|------|----------|
| **ID** | `dual-mintlify-product-harness` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-08-02 |
| **Архивирована** | 2026-08-02 |
| **GitHub Issue** | #1622 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DUAL_MINTLIFY_PRODUCT_HARNESS_PROMPT.md`](../../prompts/DUAL_MINTLIFY_PRODUCT_HARNESS_PROMPT.md) |

## Заметки при закрытии

Issue #1622; Product PR #1640 merged (e6c04420); Harness PR #1650 merged (40468d1d); both Mintlify domains Connected and production smoke PASS; workflow-examples-marathon remains an independent standing follow-up

## Отчёт о выполнении

**Что сделано.** Product и Harness разведены в два Mintlify-контейнера и два
последовательных `membrana-local-sprint`. Product публикует Device Board, узлы и
тарифы; Harness публикует мастерские и процедуры.

**PRs.** Product PR #1640 и Harness PR #1650 смёржены. Оба спринта прошли
назначенное ревью; production smoke подтвердил `product.mmbrn.tech` и
`harness.mmbrn.tech`.

**Связь со стратегией.** Эпик делает знания проекта о продукте и рабочем
контуре доступными через две поверхности, не смешивая их предметы.

**Реестр.** `task:archive dual-mintlify-product-harness` выполнен 2026-08-02.

**Известные нюансы / отложено.** `workflow-examples-marathon` остаётся отдельной
standing-задачей накопления прожитых примеров и не объявлен завершённым.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
