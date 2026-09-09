/**
 * Готовность тарифной сетки как единственного источника истины
 * (#2333; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Переключение больше не флаг, а **зеркало зубов**: сетка законна как источник
 * истины только когда готовы все носители #2333 И зубы зелёные. Пока хоть одна
 * опора не встала, публикация запрещена — иначе права поедут на непроверенном
 * носителе.
 *
 * Откат — вернуть предыдущий артефакт/код, а не включать двойную запись
 * (вердикт M8), иначе у прав снова окажется два автора.
 *
 * Чистые функции: ФС и отчёт — в `scripts/tariff-cutover-check.mjs`.
 */

/** Опоры переключения. Каждая — носитель в дереве, а не намерение. */
export const CUTOVER_REQUIREMENTS = Object.freeze([
  {
    id: 'v1_cabinet_contract',
    title: 'Кабинет хранит версию контракта на строке тарифа',
    carrier: 'packages/background-cabinet/prisma/migrations/20260908172033_tariff_contract_version/migration.sql',
  },
  {
    id: 'v1_media_contract',
    title: 'Media хранит версию контракта на записи прибора',
    carrier: 'packages/background-media/prisma/migrations/20260908172033_device_tariff_contract_version/migration.sql',
  },
  {
    id: 'v2_grid_home',
    title: 'Документ сетки: реестр прав и матрица тарифов',
    carrier: 'docs/tariffs/tariff-grid.json',
  },
  {
    id: 'v2_cabinet_projection',
    title: 'Проекция сетка → база кабинета одной командой',
    carrier: 'scripts/tariff-project-cabinet.mjs',
  },
  {
    id: 'v2_seed_projection',
    title: 'Seed кабинета берёт строки тарифов из сетки',
    carrier: 'packages/background-cabinet/prisma/seed.mjs',
  },
  {
    id: 'v3_device_tooth',
    title: 'Зуб тариф ↔ запись прибора сверяет поля, не счётчик',
    carrier: 'scripts/tariff-devices-check.mjs',
  },
  {
    id: 'v3_rollout_fanout',
    title: 'Разноска тарифного контекста проходит по всем мембранам',
    carrier: 'scripts/tariff-devices-fanout.mjs',
  },
  {
    id: 'v3_fanout_service',
    title: 'Кабинет умеет освежить все мембраны одним проходом',
    carrier: 'packages/background-cabinet/src/modules/pair/membrane-tariff-fanout-run.service.ts',
  },
  {
    id: 'v4_single_truth',
    title: 'Внешний рубильник режима снят, автор прав один',
    carrier: 'packages/background-cabinet/src/domain/tariff-projection.ts',
  },
]);

export const CUTOVER_TEETH = Object.freeze([
  {
    id: 'gridClean',
    title: 'сетка проходит форму и честно называет provisional',
  },
  {
    id: 'cabinetProjectionClean',
    title: 'проекция сетка → база кабинета и seed зелёные',
  },
  {
    id: 'deviceProjectionClean',
    title: 'зуб тариф ↔ запись прибора краснеет на дрейфе полей',
  },
  {
    id: 'singleTruthClean',
    title: 'в packages/scripts нет внешнего переключателя режима',
  },
]);

/**
 * Вердикт готовности: собран из наличия носителей и чистоты зубов.
 * @param {(path: string) => boolean} exists проверка носителя
 * @param {Record<string, boolean>} teeth состояние зубов
 */
export function cutoverReadiness(exists, teeth) {
  const missing = CUTOVER_REQUIREMENTS.filter((r) => !exists(r.carrier));
  const blockers = missing.map((r) => ({
    toothId: 'cutover_not_ready',
    where: r.id,
    reason: `носителя нет: ${r.carrier} — шаг «${r.title}» не выполнен`,
  }));

  for (const tooth of CUTOVER_TEETH) {
    if (teeth?.[tooth.id]) continue;
    blockers.push({
      toothId: 'cutover_not_ready',
      where: tooth.id,
      reason: `${tooth.title} — публиковать источник истины на непроверенном носителе запрещено`,
    });
  }

  return { ready: blockers.length === 0, blockers, checked: CUTOVER_REQUIREMENTS.length };
}

/**
 * Можно ли публиковать сетку как единственный источник истины. Отдельная
 * функция от `cutoverReadiness`, чтобы «включить, потому что очень надо» было
 * негде написать: публикация законна ТОЛЬКО при полной готовности.
 */
export function mayPublishGridTruth(readiness) {
  return readiness?.ready === true;
}

/**
 * Правило отката: вернуть предыдущий артефакт/код. Двойная запись при откате
 * не включается — функция возвращает именно это, чтобы намерение было в коде,
 * а не в памяти.
 */
export function rollbackPlan() {
  return Object.freeze({
    action: 'restore_previous_artifact',
    dualWrite: false,
    note: 'откат — возврат предыдущего артефакта/кода; двойная запись НЕ включается, иначе у прав снова два автора',
  });
}
