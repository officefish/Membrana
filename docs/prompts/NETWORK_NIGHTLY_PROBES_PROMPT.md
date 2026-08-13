# Промпт: Ночной такт 01:00 — сбор зонд-снимков, транспорт в дом, registry-пересчёт (#1913)

> M · id `network-nightly-probes` · Issue [#1913](https://github.com/officefish/Membrana/issues/1913) · lead **ozhegov**, support **dynin**.
> Поставка 3 исполнения формы (канон — вердикты **В4/В5/В6-T_night** заседания
> [`network-container`](../meeting/network-container/MEETING_VERDICT.md), ратифицированы
> 13.08). Дом и нормы в стволе (#1910); зуб bare-fetch — #1912.

## Что построить

1. **Сборщик снимков** (чистое ядро + CLI): прогоняет доступные органы (`net:diag`,
   `net:http`, `infra:probe`, …) c dev/CI-машины, нормализует каждый результат в
   зонд-снимок по `docs/audit/network/schema.json` (status словаря / outcome=failed при
   несостоявшейся проверке / organ_raw_status для чужих значений; санитизация target —
   запрещённые классы полей).
2. **Workflow 01:00 UTC-такт** (до vitest 02:00 и tests-nightly 03:00, вердикт В4):
   собирает `probes.jsonl`, кладёт артефактом (по образцу tests-nightly-full).
3. **Транспорт + пересчёт**: `--pull` тянет артефакт, кладёт ленту в
   `analysis/YYYY-MM-DD/probes.jsonl` и пересчитывает overwrite-проекции
   `registry/{probe_id}.json` + `summary.json` (`meta.generated_at`) **одним коммитом**;
   при пропуске ночи проекции не трогаются. КОНТРАКТ: пересчёт НЕ касается рукописных
   норм (`egress-rules`, `machine-policy`, `network-policy-violations-budget`) — хвост
   сборки заседания, записан в README дома.
4. **T_night-зуб (В6)**: снимки свежей ленты против active-правил `egress-rules.json`;
   противоречие → находка в канал М4 (тихая запись night-report; промоут — night-triage).
5. **Retention**: `scripts/archive-network-analysis.mjs` — перекладка лент старше 90
   дней в `analysis/archive/YYYY-MM/` по требованию (не автоматом).

## Запрещено

- Чинить сеть и вызовы (#1425); прод-замер с office (за владельцем — ритм живёт без
  baseline, снимки штатным словарём).
- Новый транспорт (только образец night-report: артефакт + pull).
- Пересчёт рукописных норм registry.

## Тесты (минимум)

| Область | Минимум |
|---|---|
| Нормализация | результат органа → валидный снимок по schema.json; failed без status |
| Пересчёт | лента → проекции; пропуск ночи → проекции нетронуты; нормы нетронуты ВСЕГДА |
| T_night | подсаженный снимок против K1 → находка с rule_id |
| Retention | лента старше 90д — кандидат перекладки; свежая — нет |

## DoD

- [ ] Живой прогон сборщика с dev-машины пишет валидную ленту и проекции.
- [ ] Workflow заведён (schedule 01:00 + dispatch), артефакт при любом исходе.
- [ ] Карта exit-кодов дополнена, если шаги входят в цепочки.
- [ ] LGTM Teamlead.
