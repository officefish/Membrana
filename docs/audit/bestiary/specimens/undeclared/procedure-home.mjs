// specimen: undeclared — намеренный пример для бестиария; не прод-код.
// Дом данных процедуры, которым код пользуется, а манифест о нём молчит: детектор
// обязан дать finding при declarationsOf === 0 (вещдок #1221: дом комнаты живёт
// с 22.07, контейнер знает движки и держателя, про свой дом — нет).

import { readFileSync, writeFileSync } from 'node:fs';

const STATE = 'docs/roomkeeper/state.json';
const DEBTS = 'docs/roomkeeper/DEBTS.md';

export function bestiarySpecimenUndeclaredHome(phase) {
  const state = JSON.parse(readFileSync(STATE, 'utf8'));
  writeFileSync(STATE, JSON.stringify({ ...state, phase }, null, 2));
  return DEBTS;
}
