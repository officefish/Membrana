/**
 * Пять операционных величин работы команды — вердикт M3
 * (team-execution-contour-m3-measurement-2026-07-19) с поправкой владельца.
 *
 * computeTeamMetrics(prevSnapshot, currSnapshot, closureArtifacts, window)
 *   → TeamMetricsReport
 *
 * Чистая функция: тот же вход → тот же выход бит-в-бит. Без сети, без git-blame,
 * без Date.now() внутри предикатов — только timestamps из данных. Вход — два
 * МАТЕРИАЛИЗОВАННЫХ снимка реестра с honest-провенансом + артефакты закрытия.
 * Единица счёта — по словарю docs/tasks/UNITS_DICTIONARY.md (центральная задача
 * = GitHub-issue; wip — движущаяся под-задача через биекцию; двойного счёта нет).
 *
 * Шестая величина «доля переделок» — риторическая, живёт ТОЛЬКО в аудите дня:
 * см. measure-rework-rhetoric.mjs, в этот батч не входит.
 */

const MOVING_STATUSES = new Set(['open', 'in-progress']);
export const UNATTRIBUTED = '(без персоны)';

/**
 * @typedef {import('./measure-fixtures.mjs').RegistrySnapshot} RegistrySnapshot
 * @typedef {import('./measure-fixtures.mjs').ClosureArtifact} ClosureArtifact
 *
 * @typedef {object} MetricsWindow
 * @property {string} from ISO, включительно — ревизия среза t−1
 * @property {string} to ISO, исключительно — ревизия среза t
 */

/** Снимок без honest-провенанса — не вход, а догадка: жёсткий отказ. */
export function assertSnapshot(snapshot, label) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error(`${label}: снимок отсутствует`);
  const { header, cards } = snapshot;
  if (!header?.capturedAt || !header?.sourceRevision) {
    throw new Error(`${label}: снимок без honest-провенанса (capturedAt, sourceRevision) — входом не является`);
  }
  if (!Array.isArray(cards)) throw new Error(`${label}: cards должен быть массивом`);
}

/**
 * Окно вычисления window = [срез(t−1), срез(t)) — владелец времени: снимки.
 * @returns {MetricsWindow}
 */
export function windowFromSnapshots(prevSnapshot, currSnapshot) {
  return { from: prevSnapshot.header.capturedAt, to: currSnapshot.header.capturedAt };
}

function inWindow(iso, window) {
  return typeof iso === 'string' && iso >= window.from && iso < window.to;
}

function personaOf(card) {
  const p = typeof card?.leadPersona === 'string' ? card.leadPersona.trim() : card?.leadPersona;
  return p || null;
}

/**
 * @param {RegistrySnapshot} prevSnapshot
 * @param {RegistrySnapshot} currSnapshot
 * @param {ClosureArtifact[]} closureArtifacts
 * @param {MetricsWindow} [window] по умолчанию — из capturedAt снимков
 */
export function computeTeamMetrics(prevSnapshot, currSnapshot, closureArtifacts, window) {
  assertSnapshot(prevSnapshot, 'prevSnapshot');
  assertSnapshot(currSnapshot, 'currSnapshot');
  if (!Array.isArray(closureArtifacts)) throw new Error('closureArtifacts должен быть массивом');
  const win = window ?? windowFromSnapshots(prevSnapshot, currSnapshot);
  if (!win.from || !win.to || win.from >= win.to) {
    throw new Error(`Окно вырождено: [${win.from}, ${win.to}) — снимки перепутаны местами?`);
  }

  const currById = new Map(currSnapshot.cards.map((c) => [c.id, c]));
  const prevById = new Map(prevSnapshot.cards.map((c) => [c.id, c]));

  // Артефакты закрытия окна — множество учтённых артефактов для honest-шапки.
  const windowArtifacts = closureArtifacts
    .filter((a) => inWindow(a.closedAt, win))
    .sort((a, b) => (a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0));

  // leadTime = closedAt − createdAt, по закрытым в окне единицам (карточка + артефакт).
  const leadTimeMs = [];
  for (const artifact of windowArtifacts) {
    const card = currById.get(artifact.taskId) ?? prevById.get(artifact.taskId);
    if (!card?.createdAt) continue; // без карточки величина честно не считается, не домысливается
    leadTimeMs.push({ taskId: artifact.taskId, ms: Date.parse(artifact.closedAt) - Date.parse(card.createdAt) });
  }

  // ownerlessRate = доля leadPersona = ∅ на текущем срезе. Ограничитель, норма 0%.
  const total = currSnapshot.cards.length;
  const ownerless = currSnapshot.cards.filter((c) => personaOf(c) === null).length;
  const ownerlessRate = total === 0 ? 0 : ownerless / total;

  // wip(p) = число движущихся единиц персоны на текущем срезе. Очередь намерений.
  /** @type {Record<string, number>} */
  const wip = {};
  for (const card of currSnapshot.cards) {
    if (!MOVING_STATUSES.has(card.status)) continue;
    const key = personaOf(card) ?? UNATTRIBUTED;
    wip[key] = (wip[key] ?? 0) + 1;
  }

  // throughput(p, w) = закрытых единиц персоны за окно, атрибуция по leadPersona карточки.
  /** @type {Record<string, number>} */
  const throughput = {};
  for (const artifact of windowArtifacts) {
    const card = currById.get(artifact.taskId) ?? prevById.get(artifact.taskId);
    const key = (card && personaOf(card)) ?? UNATTRIBUTED;
    throughput[key] = (throughput[key] ?? 0) + 1;
  }

  // escalationRate = доля единиц со сменой leadPersona между срезами
  // или переприсвоением приёмки (>1 различного acceptedBy в истории артефакта).
  const bothIds = [...prevById.keys()].filter((id) => currById.has(id));
  const reassignedByArtifact = new Set(
    windowArtifacts
      .filter((a) => {
        const names = new Set((a.acceptanceHistory ?? []).map((h) => h.acceptedBy).filter(Boolean));
        return names.size > 1;
      })
      .map((a) => a.taskId),
  );
  const escalated = bothIds.filter((id) => {
    const changed =
      personaOf(prevById.get(id)) !== personaOf(currById.get(id)) &&
      (personaOf(prevById.get(id)) !== null || personaOf(currById.get(id)) !== null);
    return changed || reassignedByArtifact.has(id);
  });
  const escalationRate = bothIds.length === 0 ? 0 : escalated.length / bothIds.length;

  return {
    header: {
      window: win,
      prevRevision: prevSnapshot.header.sourceRevision,
      currRevision: currSnapshot.header.sourceRevision,
      prevCapturedAt: prevSnapshot.header.capturedAt,
      currCapturedAt: currSnapshot.header.capturedAt,
      artifactsCounted: windowArtifacts.map((a) => a.taskId),
    },
    metrics: {
      leadTime: { values: leadTimeMs, pair: 'reworkRate (риторическая, аудит дня)' },
      ownerlessRate: { value: ownerlessRate, ownerless, total, pair: 'ограничитель, норма 0%' },
      wip: { byPersona: sortRecord(wip), note: 'очередь намерений, не производительность', pair: 'throughput' },
      throughput: { byPersona: sortRecord(throughput), window: win, pair: 'reworkRate (риторическая, аудит дня) + wip' },
      escalationRate: { value: escalationRate, escalatedIds: escalated.sort(), of: bothIds.length, pair: 'ограничитель, направление вниз' },
    },
  };
}

/** Детерминированный порядок ключей — отчёт бит-в-бит. */
function sortRecord(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
