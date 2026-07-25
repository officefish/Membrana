/**
 * Продуктовый критерий §8.2 / M1 DoD: снимок «как живое дерево» с ручной разметкой.
 * path → ожидание → факт проверяет тест membrana-leveling-disposition.test.mjs.
 *
 * Виды: ready / unfinished (брошенное|ждёт штампа) / trash-корень / scratch / live.
 */

/** @typedef {import('../lib/membrana-leveling-disposition.mjs').DispositionCtx} DispositionCtx */
/** @typedef {import('../lib/membrana-leveling-disposition.mjs').Disposition} Disposition */

/**
 * @typedef {object} ProductCase
 * @property {string} path
 * @property {DispositionCtx} ctx
 * @property {Disposition} expect
 * @property {string} kind
 */

/** @type {ProductCase[]} */
export const PRODUCT_CASES = [
  {
    kind: 'live-правка',
    path: 'apps/client/src/modules/microphone/MicrophonePanel.tsx',
    ctx: { dirty: true, registered: false, inActiveSession: true },
    expect: 'live',
  },
  {
    kind: 'live-правка (зарегистрирована, но сессия)',
    path: 'scripts/lib/task-registry.mjs',
    ctx: {
      dirty: true,
      registered: true,
      inActiveSession: true,
      ciGreen: true,
      prApproved: true,
      leadStamp: true,
    },
    expect: 'live',
  },
  {
    kind: 'готовое → ready',
    path: 'docs/procedures/membrana-leveling/README.md',
    ctx: {
      dirty: false,
      registered: true,
      inActiveSession: false,
      ciGreen: true,
      conflictsMain: false,
      prApproved: true,
      leadStamp: true,
      unitOf: 'pr-1155',
    },
    expect: 'ready',
  },
  {
    kind: 'готовое факты, ждёт штампа → unfinished',
    path: 'scripts/lib/one-shot-rank.mjs',
    ctx: {
      registered: true,
      inActiveSession: false,
      ciGreen: true,
      conflictsMain: false,
      prApproved: true,
      leadStamp: false,
      unitOf: 'pr-pending-stamp',
    },
    expect: 'unfinished',
  },
  {
    kind: 'брошенное registered, CI красный → unfinished',
    path: 'packages/agenda/src/store.ts',
    ctx: {
      dirty: true,
      registered: true,
      inActiveSession: false,
      ciGreen: false,
      unitOf: 'card-abandoned',
    },
    expect: 'unfinished',
  },
  {
    kind: 'мусор корня dirty ¬registered',
    path: 'cabinet-recover-2026-07-24.txt',
    ctx: { dirty: true, registered: false, inActiveSession: false },
    expect: 'trash',
  },
  {
    kind: 'мусор корня deploy log',
    path: 'deploy-prod-check.txt',
    ctx: { dirty: true, registered: false, inActiveSession: false },
    expect: 'trash',
  },
  {
    kind: 'времянка scratchpad',
    path: 'docs/scratchpad/leveling-wip.md',
    ctx: { dirty: true, inActiveSession: true, registered: false },
    expect: 'trash',
  },
  {
    kind: 'времянка %TEMP%',
    path: 'C:/Users/user/AppData/Local/Temp/membrana-leveling-snap.json',
    ctx: { dirty: true, inActiveSession: true },
    expect: 'trash',
  },
  {
    kind: 'времянка .tmp',
    path: 'scripts/cache/gate-partial.tmp',
    ctx: { dirty: true, registered: false },
    expect: 'trash',
  },
  {
    kind: 'conflicts main → unfinished не ready',
    path: 'yarn.lock',
    ctx: {
      registered: true,
      ciGreen: true,
      conflictsMain: true,
      prApproved: true,
      leadStamp: true,
      inActiveSession: false,
    },
    expect: 'unfinished',
  },
  {
    kind: 'PR не approved → unfinished',
    path: 'package.json',
    ctx: {
      registered: true,
      ciGreen: true,
      conflictsMain: false,
      prApproved: false,
      leadStamp: true,
      inActiveSession: false,
    },
    expect: 'unfinished',
  },
];
