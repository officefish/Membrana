/**
 * net-diag — классификатор сетевого диагноза (чистое ядро) для yarn net:diag.
 *
 * По итогам сессии 2026-07-11 (office-vds): «сервер недоступен» может означать
 * очень разное, и разница критична для тикета. Этот модуль формализует различение:
 *  - unreachable      — TCP-connect не проходит;
 *  - tcp-data-filter  — connect+banner ОК, крупный ICMP ОК, но двусторонний TCP-обмен
 *                       (SSH kex / HTTP) виснет → stateful-фильтр TCP-данных (не потеря/MTU);
 *  - pmtu-blackhole   — маленькие пакеты ОК, крупные DF-пакеты дропаются;
 *  - packet-loss      — высокая потеря ICMP по маршруту;
 *  - ok               — всё проходит.
 */

/**
 * @typedef {Object} NetProbe
 * @property {boolean} tcpConnect         TCP handshake прошёл
 * @property {boolean} bannerReceived     сервер прислал первые байты (напр. SSH-баннер)
 * @property {boolean} smallPing          ICMP echo малый пакет прошёл
 * @property {boolean} largePingDF        ICMP echo крупный (напр. 1400B, DF) прошёл
 * @property {number}  icmpLossPct        потеря ICMP по маршруту, %
 * @property {boolean} fullTcpExchange    полный двусторонний TCP-обмен (SSH kex/HTTP) завершился
 */

/**
 * Чистая классификация. Порядок проверок — от жёсткого к мягкому.
 * @param {NetProbe} p
 * @returns {{ verdict: 'unreachable'|'tcp-data-filter'|'pmtu-blackhole'|'packet-loss'|'ok', reason: string }}
 */
export function classifyNetDiag(p) {
  if (!p.tcpConnect) {
    return { verdict: 'unreachable', reason: 'TCP-connect не проходит (порт закрыт/фильтр SYN/маршрут).' };
  }
  if (p.fullTcpExchange) {
    return { verdict: 'ok', reason: 'Полный TCP-обмен проходит — сеть исправна.' };
  }
  // Дальше: connect есть, но полный обмен не завершается — различаем причину.
  if (p.smallPing && !p.largePingDF) {
    return {
      verdict: 'pmtu-blackhole',
      reason: 'Маленькие пакеты проходят, крупные DF — нет: PMTU/MTU-блэкхол. Понизить MTU/MSS.',
    };
  }
  if (p.icmpLossPct >= 20) {
    return {
      verdict: 'packet-loss',
      reason: `Высокая потеря ICMP по маршруту (${p.icmpLossPct}%). Проблема маршрута/канала.`,
    };
  }
  // Маршрут и ICMP (в т.ч. крупные) чисты, connect и баннер есть, а полный обмен виснет.
  return {
    verdict: 'tcp-data-filter',
    reason:
      'Маршрут/ICMP чисты (крупный DF-пинг проходит), TCP-хендшейк и баннер есть, но двусторонний ' +
      'TCP-обмен (SSH kex/HTTP/TLS) не завершается → stateful-фильтр TCP-данных по источнику ' +
      '(DPI/асимметричная маршрутизация). Настройками сервера не лечится.',
  };
}

/**
 * Человекочитаемая сводка для тикета.
 * @param {{ ip: string, port: number }} target
 * @param {NetProbe} p
 * @param {{ verdict: string, reason: string }} verdict
 * @returns {string}
 */
export function formatNetDiagSummary(target, p, verdict) {
  return [
    `=== net:diag ${target.ip}:${target.port} ===`,
    `Дата: ${new Date().toISOString()}`,
    '',
    `ВЕРДИКТ: ${verdict.verdict}`,
    `  ${verdict.reason}`,
    '',
    'Пробы:',
    `  TCP-connect (:${target.port}):        ${p.tcpConnect ? 'OK' : 'FAIL'}`,
    `  SSH/сервис-баннер:            ${p.bannerReceived ? 'OK' : 'нет'}`,
    `  ICMP малый пакет:             ${p.smallPing ? 'OK' : 'FAIL'}`,
    `  ICMP крупный DF (1400B):      ${p.largePingDF ? 'OK' : 'FAIL'}`,
    `  Потеря ICMP по маршруту:      ${p.icmpLossPct}%`,
    `  Полный TCP-обмен (SSH/HTTP):  ${p.fullTcpExchange ? 'OK' : 'FAIL (виснет)'}`,
    '',
    'Для тикета: приложить вывод tracert/WinMTR и ssh -vvv из этой же папки.',
  ].join('\n');
}
