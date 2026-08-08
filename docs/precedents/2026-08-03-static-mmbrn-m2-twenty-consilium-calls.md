# Прецедент 2026-08-03: двадцать вызовов консилиума для комнаты M2

<!-- precedent-meta
{
  "id": "2026-08-03-static-mmbrn-m2-twenty-consilium-calls",
  "date": "2026-08-03",
  "class": "session-report",
  "symptom": "Комната M2 заседания static-mmbrn-container произвела двадцать внешних carrier-протоколов подряд, и каждый был отклонён содержательным постаудитом",
  "rootCause": "Не установлен: этот прецедент сохраняет сырой корпус вызовов и отказов; причинный разбор намеренно вынесен в отдельную работу",
  "canonicalCause": "Не классифицировано до отдельного разбора корпуса двадцати вызовов консилиума",
  "fix": "Все двадцать сырых carrier-протоколов сохранены в rejected, два fail-closed входа записаны в аудит, внешний run21 запрещён, канонический carrier собирается локально из добытых материалов",
  "prevention": "Владелец установил предел в пять внешних попыток на комнату; после пятого BLOCK заседание верстается локально из сохранённого корпуса",
  "actionItems": [
    {"text": "Отдельно разобрать корпус M2 run1-run20 и определить проверяемую причину повторных содержательных BLOCK", "owner": "vesnin", "status": "open"},
    {"text": "Внести предел пяти внешних попыток в канонический контракт процедуры заседания", "owner": "ozhegov", "status": "open"}
  ],
  "related": ["2026-07-24-consilium-green-but-hollow"]
}
-->

## Что сохранено

Это регистрация фактуры, а не причинный разбор. M2 заседания `static-mmbrn-container`
получила двадцать API-generated carrier-протоколов. Каждый прошёл отдельный постаудит и был
отведён в `docs/seanses/rejected/`; канонический путь освобождался перед следующим созывом.

| Прогоны | Сырые носители |
|---|---|
| 1–5 | [run1](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run1-false-sensitive-identity.md) · [run2](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run2-chain-source.md) · [run3](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run3-composites-metadata.md) · [run4](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run4-effective-predecessor.md) · [run5](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run5-bytes-not-derivative.md) |
| 6–10 | [run6](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run6-canonicalref-levels.md) · [run7](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run7-initial-levels.md) · [run8](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run8-count-echo-premises.md) · [run9](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run9-tip-pdf-root.md) · [run10](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run10-root-tip-values.md) |
| 11–15 | [run11](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run11-bytes-ep-type.md) · [run12](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run12-five-contradictions.md) · [run13](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run13-lineage-echo-cell.md) · [run14](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run14-meta-repetition.md) · [run15](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run15-four-carrier-defects.md) |
| 16–20 | [run16](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run16-single-place-legacy-td.md) · [run17](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run17-cells-epistemics-selfcount.md) · [run18](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run18-overconstraint-and-case-proof.md) · [run19](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run19-duplicate-component-sensitive.md) · [run20](../seanses/rejected/static-mmbrn-container-m2-identity-2026-08-03-run20-final-external.md) |

Полная хронология предаудитов, post-BLOCK и точных причин каждого отвода сохранена в
[`AUDIT_READ_ONLY.md`](../meeting/static-mmbrn-container/AUDIT_READ_ONLY.md). Исходные
протоколы несут собственные метаданные модели, времени, вопроса, повестки и отпечатков входа.

## Вызовы, которых не было

Перед успешными API-вызовами run7 и run12 механизм по одному разу остановился fail-closed
из-за обрезания предметного входа. Внешний API не вызывался, кредит не расходовался,
протокол не создавался; эти два события сохранены только в хронологии аудита и не увеличивают
число внешних carrier-протоколов.

## Принятое ограничение

После фиксации этого случая владелец установил предел: **пять внешних попыток на комнату**.
После пятого BLOCK председатель прекращает созывы и верстает носитель локально из материалов
неудачных прогонов. Для M2 правило вступило в силу после run20: внешнего run21 нет.

Локально собранный [канонический M2 carrier](../seanses/static-mmbrn-container-m2-identity-2026-08-03.md)
явно помечен `local-synthesis` и не считается новым вызовом консилиума.

## Граница записи

Почему потребовалось столько попыток, какие ограничения были полезными, а какие создавали
новые противоречия, и где именно расходятся механический гейт и содержательный аудит, здесь
не решается. Это предмет отдельного разбора, указанного в `actionItems`.
