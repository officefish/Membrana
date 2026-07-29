/**
 * Готовность к переключению тарифной сетки на роль источника истины
 * (S9 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Переключение — не флаг, а **предикат**: сетка становится источником истины
 * только когда готовы все предыдущие шаги И зубы зелёные. Пока хоть одна опора
 * не встала, включение запрещено — иначе права поедут на непроверенном носителе.
 *
 * Откат — выключение флага, и только оно: двойная запись при откате **не**
 * включается (вердикт M8), иначе у прав снова окажется два автора.
 *
 * Чистые функции: ФС и отчёт — в `scripts/tariff-cutover-check.mjs`.
 */

/** Опоры переключения. Каждая — носитель в дереве, а не намерение. */
export const CUTOVER_REQUIREMENTS = Object.freeze([
  {
    id: 'S0_scalars',
    title: 'Числа тарифов объявлены декларацией, носитель её читает',
    carrier: 'docs/tariffs/tariff-scalars.json',
  },
  {
    id: 'S1_grid_home',
    title: 'Документ сетки: реестр прав и матрица тарифов',
    carrier: 'docs/tariffs/tariff-grid.json',
  },
  {
    id: 'S2_resolve',
    title: 'Чистое чтение прав с тремя состояниями и честным stub_unwired',
    carrier: 'packages/background-cabinet/src/domain/tariff-resolve.ts',
  },
  {
    id: 'S3_projection',
    title: 'Единственный писатель проекции; двойная запись невозможна',
    carrier: 'packages/background-cabinet/src/domain/tariff-projection.ts',
  },
  {
    id: 'S4_quota',
    title: 'Учёт квот: класс памяти обязателен, исчерпание отказывает создание',
    carrier: 'packages/background-cabinet/src/domain/quota-ledger.ts',
  },
  {
    id: 'S5_produce',
    title: 'Гейт производства на создании, не на существовании',
    carrier: 'packages/background-cabinet/src/domain/produce-gate.ts',
  },
  {
    id: 'S6_board',
    title: 'Жёсткие двери борда: загрузка, клонирование, запуск',
    carrier: 'packages/background-cabinet/src/domain/board-gate.ts',
  },
  {
    id: 'S7_vitrine',
    title: 'Витрина притемняет и объясняет, не прячет',
    carrier: 'apps/client/src/modules/device-board/tariffVitrineViewModel.ts',
  },
  {
    id: 'S8_transition',
    title: 'Смена тарифа одной точкой записи + журнал и промокод',
    carrier: 'packages/background-cabinet/src/domain/tariff-transition.ts',
  },
]);

/**
 * Вердикт готовности: собран из наличия носителей и чистоты зубов.
 * @param {(path: string) => boolean} exists проверка носителя
 * @param {{gridClean: boolean}} teeth состояние зубов
 */
export function cutoverReadiness(exists, teeth) {
  const missing = CUTOVER_REQUIREMENTS.filter((r) => !exists(r.carrier));
  const blockers = missing.map((r) => ({
    toothId: 'cutover_not_ready',
    where: r.id,
    reason: `носителя нет: ${r.carrier} — шаг «${r.title}» не выполнен`,
  }));

  if (!teeth?.gridClean) {
    blockers.push({
      toothId: 'cutover_not_ready',
      where: 'teeth',
      reason: 'зубы сетки не зелёные — включать источник истины на непроверенном носителе запрещено',
    });
  }

  return { ready: blockers.length === 0, blockers, checked: CUTOVER_REQUIREMENTS.length };
}

/**
 * Можно ли включать режим сетки. Отдельная функция от `cutoverReadiness`,
 * чтобы «включить, потому что очень надо» было негде написать: включение
 * законно ТОЛЬКО при полной готовности.
 */
export function mayEnableGridMode(readiness) {
  return readiness?.ready === true;
}

/**
 * Правило отката: выключить флаг. Двойная запись при откате не включается —
 * функция возвращает именно это, чтобы намерение было в коде, а не в памяти.
 */
export function rollbackPlan() {
  return Object.freeze({
    action: 'disable_grid_mode',
    dualWrite: false,
    note: 'откат — выключение флага; двойная запись НЕ включается, иначе у прав снова два автора',
  });
}
