# Membrana Local Sprint OPEN: deploy-safestorage-2026-08-21

| Поле | Значение |
|------|----------|
| Sprint | `deploy-safestorage-2026-08-21` |
| Основание | ADR-0028 (Р1/Р2 в стволе — PR #2031; Р4 — сегодня) · точка входа `docs/prompts/SESSION_G_DEPLOY_SAFESTORAGE_SPRINT_2026-08-21.md` |
| Plan | [`docs/sprint/cut/deploy-safestorage-2026-08-21.json`](../../sprint/cut/deploy-safestorage-2026-08-21.json) — **ждёт ратификации владельца** |
| Cutter | ozhegov ([конспект](../../discussions/cut-deploy-safestorage-2026-08-21-ozhegov.md)) |
| Blocks | deploy-preflight (tarasov) → deploy-media (ozhegov) → deploy-cabinet (ozhegov) → deploy-acceptance (dynin) · secure-store-cache (vesnin) → studio-bridge-honest (ozhegov) → client-store-wiring (vesnin) |
| Status | OPEN · нарезка предъявлена владельцу 21.08; ни деплоя, ни кода до ратификации |

## Состояние прода (проверено руками 21.08, не со слов)

`/root/membrana` на `6df73034` (19.08) · media-api Up 40 ч (образ 19.08) · cabinet Up 5 недель ·
в `NodeKey` **нет колонки `audience`**, миграция `20260820111700_node_key_audience` не применена ·
гейт Тарасова: шаг «App DI smoke (#2009)» на стволе `2693e1ff` — **success**.

## Итог блоков

_(заполняется по исполнению)_
