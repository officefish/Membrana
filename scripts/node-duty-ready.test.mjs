/**
 * Зубы предиката готовности узла (#2049). Судьи гоняются на фикстурных выводах Windows —
 * английском И русском: узел может стоять на любой локали, и парсер, знающий одну, молчал бы
 * на другой ровно так, как молчал бы сломанный.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { acIndexOf, judge, judgeAutologon, judgeSleep, judgeTask } from './node-duty-ready.mjs';

const PC_EN_0 = 'Power Setting GUID: 29f6c1db-…  (Sleep after)\n    Current AC Power Setting Index: 0x00000000\n    Current DC Power Setting Index: 0x00000384';
const PC_EN_20M = 'Power Setting GUID: 29f6c1db-…  (Sleep after)\n    Current AC Power Setting Index: 0x000004b0\n    Current DC Power Setting Index: 0x00000384';
// Русская фикстура — с ЖИВОГО прогона 25.08 (после декодирования cp866), не из памяти:
// первая редакция угадала фразу «для источника переменного тока», а Windows пишет иначе.
const PC_RU_0 = 'GUID параметра питания: 29f6c1db-…  (Сон после)\n    Минимальная возможная настройка: 0x00000000\n    Текущий индекс настройки питания от сети: 0x00000000\n    Текущий индекс настройки питания от батарей: 0x000000b4';

const REG_ON = 'HKEY_LOCAL_MACHINE\\…\\Winlogon\n    AutoAdminLogon    REG_SZ    1\n    DefaultUserName    REG_SZ    indic\n';
const REG_OFF = 'HKEY_LOCAL_MACHINE\\…\\Winlogon\n    AutoAdminLogon    REG_SZ    0\n    DefaultUserName    REG_SZ    indic\n';

const TASK_EN_OK = 'TaskName:                             \\MembranaNode\nStatus:                               Ready\nTask To Run:                          C:\\Program Files\\nodejs\\node.exe firebat-poller.mjs\nScheduled Task State:                 Enabled\nSchedule Type:                        At logon time\n';
const TASK_RU_OK = 'Имя задачи:                           \\MembranaNode\nСостояние:                            Готово\nЗадача для выполнения:                C:\\Program Files\\nodejs\\node.exe firebat-poller.mjs\nСостояние запланированной задачи:     Включено\nТип расписания:                       При входе в систему\n';
const TASK_DISABLED = TASK_EN_OK.replace('Enabled', 'Disabled');
const TASK_MISSING = 'ERROR: The system cannot find the file specified.\n[exit 1]';

test('powercfg: индекс для сети читается и на английской, и на русской Windows', () => {
  assert.equal(acIndexOf(PC_EN_0), 0);
  assert.equal(acIndexOf(PC_EN_20M), 1200);
  assert.equal(acIndexOf(PC_RU_0), 0);
  assert.equal(acIndexOf('мусор'), null, 'нечитаемое — null, не ноль: ноль означал бы «выключено»');
});

test('сон: оба таймера 0 — «да»; сон через 20 минут — «нет» с лекарством', () => {
  assert.equal(judgeSleep({ standby: PC_EN_0, hibernate: PC_EN_0 }).ok, true);
  const bad = judgeSleep({ standby: PC_EN_20M, hibernate: PC_EN_0 });
  assert.equal(bad.ok, false);
  assert.match(bad.detail, /сон через 1200 с/u);
  assert.match(bad.fix, /Никогда/u, 'лекарство — переключатель Windows, не код');
});

test('сон: нечитаемый вывод — «нет» С ПРИЧИНОЙ «не прочитан», а не ложное лекарство', () => {
  // Предикат готовности обязан быть fail-closed: не смог прочитать — не подтверждает. И
  // ПРИЧИНА обязана быть честной: порча 25.08 сняла ветку нечитаемости, и «нет» осталось —
  // но с лекарством «сон через null с → Параметры → Питание», которое владельца обманет.
  const v = judgeSleep({ standby: 'мусор', hibernate: PC_EN_0 });
  assert.equal(v.ok, false);
  assert.match(v.detail, /не прочитан/u);
  assert.doesNotMatch(v.detail, /null/u);
});

test('автовход: включён с пользователем — «да»; выключен — «нет» с netplwiz', () => {
  const on = judgeAutologon(REG_ON);
  assert.equal(on.ok, true);
  assert.match(on.detail, /indic/u);
  const off = judgeAutologon(REG_OFF);
  assert.equal(off.ok, false);
  assert.match(off.fix, /netplwiz/u);
});

test('задача: включена, при входе, поллер — «да» на обеих локалях', () => {
  assert.equal(judgeTask(TASK_EN_OK).ok, true);
  assert.equal(judgeTask(TASK_RU_OK).ok, true);
});

test('задача: отключена — «нет» с именем беды; отсутствует — «нет» с установкой', () => {
  const dis = judgeTask(TASK_DISABLED);
  assert.equal(dis.ok, false);
  assert.match(dis.detail, /отключена/u);
  const miss = judgeTask(TASK_MISSING);
  assert.equal(miss.ok, false);
  assert.match(miss.detail, /нет/u);
  assert.match(miss.fix, /firebat-service-install/u);
});

test('итог: три «да» — готов; одно «нет» — не готов, и названо которое', () => {
  const ok = judge({ sleep: { standby: PC_EN_0, hibernate: PC_EN_0 }, autologon: REG_ON, task: TASK_RU_OK });
  assert.equal(ok.ready, true);
  assert.equal(ok.checks.filter((c) => c.ok).length, 3);
  const no = judge({ sleep: { standby: PC_EN_0, hibernate: PC_EN_0 }, autologon: REG_OFF, task: TASK_EN_OK });
  assert.equal(no.ready, false);
  assert.deepEqual(no.checks.filter((c) => !c.ok).map((c) => c.name), ['автовход есть']);
});
