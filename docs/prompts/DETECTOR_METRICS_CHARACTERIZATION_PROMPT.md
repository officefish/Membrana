# Промпт: detector-metrics-characterization — паспорт детектора (ROC/AUC/CI/EER)

> **Task-промпт для агента-разработчика.** Реестр: `detector-metrics-characterization`.
> GitHub Issue: [#565](https://github.com/officefish/Membrana/issues/565).
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

## Контекст

Консилиум `alex-critics-detector-characterization`: заказчик спросит паспорт детектора
(ROC AUC + Pd-vs-SNR). Вердикт: ROC AUC на free-v1 с bootstrap-CI; Pd-vs-SNR на курированном
корпусе — отложено (нет оси SNR). Новый пакет `@membrana/detection-metrics-service`.

---

## Промпт целиком

### Definition of Done

- [ ] `@membrana/detection-metrics-service` (foundation): чистые функции на `@membrana/core`.
- [ ] Офлайн benchmark → `detection-metrics-v1.json` с provenance.
- [ ] UI «Контроль качества» / cabinet: ROC/PR, EER, operating points (scope по промпту эпика).
- [ ] Тесты метрик; CI зелёный в scope.

### Out of scope

- Полевой Pd-vs-SNR без размеченной оси SNR; синтетический SNR-sweep — фаза 2.

---

## Закрытие

`yarn task:archive detector-metrics-characterization --notes "PR #N, …"` · [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md)
