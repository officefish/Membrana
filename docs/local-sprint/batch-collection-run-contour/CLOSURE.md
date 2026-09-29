# Membrana Local Sprint CLOSURE: batch-collection-run-contour

| Поле | Значение |
|------|----------|
| PR stack | [#2517](https://github.com/officefish/Membrana/pull/2517) contract → [#2518](https://github.com/officefish/Membrana/pull/2518) runner → [#2519](https://github.com/officefish/Membrana/pull/2519) registration → [#2520](https://github.com/officefish/Membrana/pull/2520) cabinet → [#2521](https://github.com/officefish/Membrana/pull/2521) evidence |
| Гейт | 4/4 `honest_pair`, находок 0, журнал `pass` 29.09 |
| Опыт | `vesnin-batch-collection-run-contour-cut-1` · **miss** · точность 75% (3/4), overflow 25% (1/4) |
| Review | #2517–#2520: LGTM и опубликованный `review/teamlead=success`; #2521: итоговый check на точном SHA — источник статуса |
| Merge | запрещён заказом владельца |

## Что доставлено

- Read-only batch executor замораживает `inputHash`, последовательно читает WAV выбранной
  коллекции и вызывает существующий drone-detection orchestrator через внедрённый порт.
- Полный отказ и ошибка отдельной пробы названы раздельно; частичный исход не теряет успешные
  строки и несёт агрегат `ok/failed/skipped/detected` вместе с p50/p95.
- Серверный plugin request и media-library backend доводят исход до кабинета. Полный буфер не
  блокирует анализ и явно сообщает, что прогон не освобождает место.
- Массовый перенос и пагинация не переисполнялись: сверка подтвердила, что #2488/#2489/#2499
  и #2505 уже закрыли эту часть старого билета #494.

## Проверки

- detector executor: 7/7;
- background-media registrar/controller: 22/22;
- media-library server backend: 5/5;
- cabinet panel: 3/3;
- typecheck затронутых пакетов и `background-media`: pass;
- targeted ESLint и `git diff --check`: pass.

## Остаток

- Прогон синхронен относительно HTTP-запроса и не показывает прогресс между пробами. Фоновая
  очередь потребует отдельного решения, если живой замер выявит таймауты на больших WAV.
- Таблица до 2000 результатов не виртуализирована; это осознанный предел текущего контура.
- Runner дал 514 строк против прогноза 390 из-за executor, семи зубов и server registration;
  это записано как overflow, а не скрыто новой оценкой после исполнения.
- Стек не предназначен для прямого merge с вершины: порядок посадки совпадает со стрелкой в
  таблице, каждый PR создан с `--no-merge`.
