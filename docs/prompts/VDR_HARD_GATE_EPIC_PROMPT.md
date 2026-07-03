# Эпик: VDR-Hard-Gate — пилот валидации, плагин микрофона, trends benchmark 85/90

> **Task-эпик** · регламент [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Размер:** L · **GitHub:** [#47](https://github.com/officefish/Membrana/issues/47) (продолжение)
> **Предшественник:** [`VALIDATED_RECOGNITION_EPIC_PROMPT`](./VALIDATED_DRONE_RECOGNITION_EPIC_PROMPT.md) (VDR1–VDR4 архив: 1–3 done, 4 done-fail DSP 50%)
> **Консилиум:** [`docs/seanses/vdr-validation-scope-2026-07-03.md`](../seanses/vdr-validation-scope-2026-07-03.md)

---

## Ключевое достижение эпика

> **Trends-детектор (текущий фаворит: 95% recall / 30% FPR мягкий gate) проверен на независимом пилотном корпусе (30–35 сэмплов, intra-rater ≥95%) с воспроизводимым отчётом: hard-gate F1 ≥85% пройден — либо зафиксирован gap с рекомендацией R&D. Эксперимент имеет продуктовую поверхность — плагин модуля «Микрофон».**

## Требование владельца (2026-07-03)

**Все эксперименты в самом продукте представлены в виде плагина для модуля «Микрофон».** Скрипты benchmark — канон воспроизводимости метрик; плагин — операторская поверхность тех же экспериментов (прогон корпуса, pred-vs-truth, метрики gate). Отдельный новый плагин, не расширение существующих (решение владельца).

---

## Решения консилиума (вход)

| Решение | Содержание |
|---------|------------|
| Корпус | 30–35 новых независимых сэмплов: остатки DAD + свежие срезы ESC-50 (3–5 с), **без пересечения с VDR3-train**; полевые записи отложены |
| Манифест | `data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json` (поля: sampleId, source, label, operator, date, notes) |
| Качество разметки | **Intra-rater**: оператор повторно размечает 15–20% через 3–5 дней, воспроизводимость **≥95%**; Cohen's Kappa отложена до второго человека-аннотатора |
| UI разметки | Reuse VDR2-UI (cabinet sample-library) + фильтр статуса (toggle-кнопки в toolbar) + счётчик прогресса; standalone annotation-ui **отклонён** |
| Протокол | Секция «Пилот hard-gate» в [`DATASET_CURATION.md`](../DATASET_CURATION.md); VDR_PROTOCOL.md **не создаём** |
| `validate:vdr` | Вспомогательный скрипт `scripts/validate-vdr.mjs` (счётчики/дубли, `--intra-rater-threshold` default 95%, Kappa при двух файлах, JSON export); **без CI-гейта** |
| Приём пилота | trends F1 **≥85%** → hard-gate пройден; 80–85% → мягкий; **<80%** → team-разбор (шумная разметка → повтор; неадекватность trends → R&D-эпик) |

---

## Фазы

| Фаза | `id` реестра | Размер | Содержание | DoD (кратко) |
|------|--------------|--------|------------|--------------|
| **HG1** | `vdr-hg1-pilot-corpus` | M | Пилотный корпус 30–35 (DAD-остаток + ESC-срезы, независимость от train подтверждена по IDs manifest v0.2); фильтр статуса + счётчик в VDR2-UI; `scripts/validate-vdr.mjs`; разметка 100% + intra-rater ≥95% | manifest v0.3 в git; sign-off в DATASET_CURATION |
| **HG2** | `vdr-hg2-mic-validation-plugin` | L | **Плагин «VDR-валидация» модуля «Микрофон»** (требование владельца): прогон trends на пилотном корпусе и live-микрофоне, pred-vs-truth по сэмплам, P/R/F1 сводка gate в UI | MembranaRegistry; звук только audio-engine; catalog prompt; DESIGN-токены; a11y |
| **HG3** | `vdr-hg3-trends-benchmark` | M | `yarn benchmark:detectors` на пилоте (канон метрик); плагин зеркалит те же числа; сравнение с template-match v0.1 | P/R/F1 в отчёте; расхождение скрипт↔плагин ≤ погрешности |
| **HG4** | `vdr-hg4-hard-gate-report` | S | Отчёт «Пилот hard-gate» в DATASET_CURATION; statement в WHITE_PAPER §8; ARCHITECTURE §1e статусы; решение по критерию приёма | LGTM Vesnin; рекомендация следующего эпика |

**Порядок:** HG1 → HG2 ∥ HG3 (плагин и benchmark параллельно после корпуса) → HG4.
**Таймлайн (консилиум):** ~2 дня + плагин (HG2, добавлен требованием владельца после консилиума).

---

## Ограничения

- Звук — **только** `@membrana/audio-engine-service` (скилл membrana-audio-engine-guard; никаких `new AudioContext()` в плагине).
- Регистрация плагина — `MembranaRegistry.registerPlugin`; catalog prompt в `docs/catalog/client/registry.json`.
- Никакого обучения нейросетей; zero-shot (CLAP/YAMNet) — вне эпика (эшелон 1.B), допустим позже как advisory-строка.
- Метки пилота редактируются только через VDR2-UI (cabinet admin) — как в DATASET_CURATION.

## Out of scope

- Полевые записи дрона (отдельное решение после пилота)
- Cohen's Kappa как gate (до второго аннотатора)
- Ensemble / neural детекторы
- Закрытие GitHub #47

---

## Definition of Done эпика

- [ ] Манифест пилота (30–35, независимость от train, intra-rater ≥95%) в git
- [ ] Плагин «VDR-валидация» зарегистрирован и показывает pred-vs-truth + P/R/F1 (продуктовая поверхность эксперимента)
- [ ] `yarn benchmark:detectors` на пилоте воспроизводим; числа совпадают с плагином
- [ ] Отчёт hard-gate + обновления WHITE_PAPER/ARCHITECTURE/DATASET_CURATION
- [ ] HG1–HG4 в архиве реестра; LGTM Vesnin
