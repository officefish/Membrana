import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CODEX_VERSION,
  REQUIRED_SECTIONS,
  QC_CODES,
  sha256,
  codex,
  bumpKind,
  returned,
  passStatus,
  isPetRemarkInReasons,
  filterPetFromReasons,
} from './lib/storm-codex.mjs';

const DIGEST = sha256('источники шторма v1');

/** Документ, проходящий все пять QC. */
const GOOD = {
  sourceDigest: DIGEST,
  sections: [...REQUIRED_SECTIONS],
  claims: { статус: 'черновик' },
  facts: { статус: 'черновик' },
  signatures: ['заявка-участника', 'подтверждение-владельца'],
  premises: [
    { text: 'дивергентный формат', isConclusion: false },
    { text: 'дом — директория', isConclusion: false },
  ],
};

test('codex: все 5 QC pass ⟹ {pass:true, reasons:[]}', () => {
  const r = codex(GOOD, DIGEST);
  assert.deepEqual(r, { pass: true, reasons: [] });
});

test('QC1 свежесть: совпал дайджест pass / расходится fail', () => {
  assert.deepEqual(codex(GOOD, DIGEST).reasons, [], 'дайджест совпал');
  assert.deepEqual(
    codex(GOOD, sha256('источники шторма v2')).reasons,
    ['QC1'],
    'источники сменились — не свежо',
  );
  assert.deepEqual(codex({ ...GOOD, sourceDigest: undefined }, DIGEST).reasons, ['QC1']);
});

test('QC2 структура: все обяз. секции pass / без «Список посылок» fail', () => {
  const noPremises = { ...GOOD, sections: ['Конспект', 'Развилка'] };
  assert.deepEqual(codex(noPremises, DIGEST).reasons, ['QC2'], 'нет секции «Список посылок»');
  assert.ok(REQUIRED_SECTIONS.includes('Список посылок'), 'канон: «Список посылок» обязателен');
  assert.deepEqual(codex({ ...GOOD, sections: [] }, DIGEST).reasons, ['QC2']);
});

test('QC3 honest-шапка: совпало/нет-общих-ключей pass, расхождение fail', () => {
  assert.deepEqual(codex(GOOD, DIGEST).reasons, [], 'все общие ключи совпали');
  const disjoint = { ...GOOD, claims: { a: 1 }, facts: { b: 2 } };
  assert.deepEqual(codex(disjoint, DIGEST).reasons, [], 'нет общих ключей — не врёт');
  const lie = { ...GOOD, claims: { статус: 'принято' }, facts: { статус: 'черновик' } };
  assert.deepEqual(codex(lie, DIGEST).reasons, ['QC3'], 'заявленное противоречит факту');
});

test('QC4 две подписи: >=2 pass, одна/ноль fail (T10)', () => {
  assert.deepEqual(codex(GOOD, DIGEST).reasons, [], 'две подписи');
  assert.deepEqual(codex({ ...GOOD, signatures: ['только-заявка'] }, DIGEST).reasons, ['QC4']);
  assert.deepEqual(codex({ ...GOOD, signatures: [] }, DIGEST).reasons, ['QC4']);
  assert.deepEqual(codex({ ...GOOD, signatures: undefined }, DIGEST).reasons, ['QC4']);
});

test('QC5 посылки-не-выводы: только посылки pass, вывод среди посылок fail', () => {
  assert.deepEqual(codex(GOOD, DIGEST).reasons, [], 'ни одна не вывод');
  const withConclusion = {
    ...GOOD,
    premises: [
      { text: 'посылка', isConclusion: false },
      { text: 'вывод комнаты', isConclusion: true },
    ],
  };
  assert.deepEqual(codex(withConclusion, DIGEST).reasons, ['QC5'], 'заключение затесалось в посылки');
  assert.deepEqual(codex({ ...GOOD, premises: [] }, DIGEST).reasons, [], 'пустой список — не вывод');
});

test('codex — конъюнкция: один павший QC валит весь документ', () => {
  const r = codex({ ...GOOD, signatures: [] }, DIGEST);
  assert.equal(r.pass, false, 'pass=false при единственном павшем QC4');
  assert.deepEqual(r.reasons, ['QC4']);
});

test('reasons = ровно павшие, в порядке QC1..QC5', () => {
  const broken = {
    sourceDigest: 'stale', // QC1 fail
    sections: [], // QC2 fail
    claims: { k: 'a' },
    facts: { k: 'b' }, // QC3 fail
    signatures: [], // QC4 fail
    premises: [{ text: 'x', isConclusion: true }], // QC5 fail
  };
  assert.deepEqual(codex(broken, DIGEST).reasons, ['QC1', 'QC2', 'QC3', 'QC4', 'QC5']);
  // выборочно — только QC2 и QC4, порядок сохранён
  const two = { ...GOOD, sections: [], signatures: [] };
  assert.deepEqual(codex(two, DIGEST).reasons, ['QC2', 'QC4']);
  // reasons ⊆ QC (замкнутое множество)
  for (const code of codex(broken, DIGEST).reasons) assert.ok(QC_CODES.includes(code));
});

test('bumpKind: три ветки (major/minor/patch)', () => {
  assert.equal(bumpKind(['QC1', 'QC2', 'QC3'], ['QC1', 'QC2']), 'major', 'удалён пункт');
  assert.equal(bumpKind(['QC1', 'QC2'], ['QC1', 'QC2b']), 'major', 'переименован пункт');
  assert.equal(bumpKind(['QC1', 'QC2'], ['QC1', 'QC2', 'QC3']), 'minor', 'добавлен непрерывающий');
  assert.equal(bumpKind(['QC1', 'QC2', 'QC3'], ['QC1', 'QC2', 'QC3']), 'patch', 'та же структура');
  // удаление доминирует над добавлением → major
  assert.equal(bumpKind(['QC1', 'QC2'], ['QC1', 'QC3']), 'major', 'и убрали, и добавили');
});

test('returned — адресный АКТ (перечислены павшие QC + версия)', () => {
  const r = codex({ ...GOOD, signatures: [], sections: [] }, DIGEST);
  const act = returned(r.reasons);
  assert.deepEqual(act, { kind: 'returned', reasons: ['QC2', 'QC4'], codexVersion: CODEX_VERSION });
  // акт несёт свою копию оснований (не ссылку на исходный массив)
  assert.notEqual(act.reasons, r.reasons);
  assert.equal(returned(['QC1'], '9.9.9').codexVersion, '9.9.9', 'версия параметризуема');
});

test('passStatus — derived-статус (passed/blocked), не акт', () => {
  assert.equal(passStatus(codex(GOOD, DIGEST)), 'passed');
  assert.equal(passStatus(codex({ ...GOOD, signatures: [] }, DIGEST)), 'blocked');
  assert.equal(passStatus(undefined), 'blocked', 'отсутствие валидного passed = blocked');
  // статус НЕ перечисляет причины — это состояние, а акт возврата — событие
  const blocked = passStatus(codex({ ...GOOD, sections: [] }, DIGEST));
  assert.equal(typeof blocked, 'string');
});

test('питомец: реплика origin=pet НИКОГДА не может стать основанием возврата', () => {
  const petRemark = { origin: 'pet', text: 'владелец не прав' };
  const participantRemark = { origin: 'participant', text: 'довод по предмету' };
  // прямая проверка-гарантия
  assert.equal(isPetRemarkInReasons(['QC1', petRemark], petRemark), true, 'детектит питомца в основаниях');
  assert.equal(isPetRemarkInReasons(['QC1'], participantRemark), false, 'участник — не питомец');
  // фильтр отсекает питомские записи, оставляя легитимные QC-коды
  const filtered = filterPetFromReasons(['QC1', petRemark, 'QC4', participantRemark]);
  assert.deepEqual(filtered, ['QC1', 'QC4', participantRemark], 'питомец вычищен из оснований');
  assert.equal(
    filtered.some((r) => r && r.origin === 'pet'),
    false,
    'после фильтра ни одной питомской записи',
  );
});
