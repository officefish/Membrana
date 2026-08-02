/**
 * Зуб полноты ростера персональной памяти.
 *
 * ПОВОД, ЗАМЕРЕННЫЙ 02.08. `PERSONA_ROLE_LABELS` знала пятерых, журналы на диске были у
 * восьмерых. Карта у этого объекта две работы сразу: ростер `persona-memory:extract --all`
 * (`Object.keys`) и гейт `readPersonaMemory` (незнакомый слаг → `null`). Поэтому отсутствие
 * персоны читалось не как «нет метки», а как «памяти нет вовсе»: журнал не извлекался и не
 * подмешивался. Тимлид проекта, самая вызываемая персона, был вне карты шесть дней — с 27.07,
 * когда роли переставили, и до 02.08, когда влитый лифт всплытия упал на `null` и тем себя
 * обнаружил.
 *
 * ЗАЧЕМ ЗУБ, А НЕ ВНИМАТЕЛЬНОСТЬ. Расхождение карты с реестром голосов не даёт ни ошибки, ни
 * предупреждения: персона просто тихо остаётся без памяти. Ровно это и означает «механизм
 * проверяет, что шаг отработал, и не проверяет, что шаг покрыл свой предмет».
 *
 * Прогон: `node --test scripts/persona-memory-roster.test.mjs`
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { PERSONA_ROLE_LABELS, personaMemoryPath } from './lib/persona-memory.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(
  readFileSync(join(repoRoot, 'docs/virtual-team/voices.registry.json'), 'utf8'),
);
const voiceIds = (registry.voices ?? []).map((v) => v.id).filter((id) => typeof id === 'string');

test('реестр голосов читается и непуст — иначе зуб проверял бы пустоту', () => {
  assert.ok(voiceIds.length >= 5, `голосов в реестре ${voiceIds.length}`);
});

test('карта меток покрывает ВЕСЬ реестр голосов', () => {
  const missing = voiceIds.filter((id) => !PERSONA_ROLE_LABELS[id]);
  assert.deepEqual(
    missing,
    [],
    `персоны вне карты остаются без памяти молча: ${missing.join(', ')}`,
  );
});

test('в карте нет персон, которых нет в реестре голосов', () => {
  // Обратная сторона: метка для несуществующего голоса завела бы ростеру фантомную персону,
  // и `--all` пошёл бы извлекать память тому, кого нет.
  const extra = Object.keys(PERSONA_ROLE_LABELS).filter((id) => !voiceIds.includes(id));
  assert.deepEqual(extra, [], `в карте есть посторонние: ${extra.join(', ')}`);
});

test('метки УНИКАЛЬНЫ — иначе двое собирают одни и те же строки протоколов', () => {
  // Метка — ключ сбора (`collectSeansesCandidates(roleLabel)`), а не подпись. Две персоны с
  // одной меткой делят чужие реплики. Так и было до 02.08: `vesnin` носил `Teamlead` после
  // того, как тимлидом стал Тарасов.
  const labels = Object.values(PERSONA_ROLE_LABELS);
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
  assert.deepEqual([...new Set(dupes)], [], `метка занята дважды: ${dupes.join(', ')}`);
});

test('у каждой персоны карты есть путь журнала, и он в общем каталоге', () => {
  for (const slug of Object.keys(PERSONA_ROLE_LABELS)) {
    const rel = personaMemoryPath(slug);
    assert.ok(typeof rel === 'string' && rel.length > 0, `${slug}: путь журнала пуст`);
    assert.ok(rel.includes('virtual-team/memory'), `${slug}: журнал вне общего каталога — ${rel}`);
  }
});

test('журналы, лежащие на диске, принадлежат персонам из карты', () => {
  // Обнаружение шло от файла к карте: именно так дефект и был найден — angelina.md, farrell.md
  // и tarasov.md существовали, а карта их не знала.
  const orphanJournals = [];
  for (const slug of voiceIds) {
    const abs = join(repoRoot, personaMemoryPath(slug));
    if (existsSync(abs) && !PERSONA_ROLE_LABELS[slug]) orphanJournals.push(slug);
  }
  assert.deepEqual(
    orphanJournals,
    [],
    `журнал на диске есть, а в карте персоны нет: ${orphanJournals.join(', ')}`,
  );
});
