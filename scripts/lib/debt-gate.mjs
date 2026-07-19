/**
 * Гейт законности с тремя режимами (Р4, вердикт M4 registry-relocation).
 *
 * Комната M4 задала коды МЯГКОГО (exit 0) и ЖЁСТКОГО (exit ≠ 0) режимов.
 * Код МИГРАЦИОННОГО режима комнатой НЕ назван — он назначен блоком явно
 * (CONCEPT §3.3): `11 = LEGALITY_MIGRATING`, мягкий диапазон 1–19 — различим
 * и от soft-0 (видно, что миграция не закончена), и от hard-≥20 (работа не
 * встаёт — «работа между шагами не встаёт», M4). Кандидат на сведение в единую
 * таблицу exit-кодов на Interface Consilium.
 *
 * Переключение migrating → hard — по предикату `N_illegal = 0`, не по дате.
 * Режим, счётчик и дельта видимы в шапке отчёта — переключение не случается «вдруг».
 */
import { EXIT_CODES } from './snapshot-contract.mjs';

export const GATE_MODES = Object.freeze(['soft', 'migrating', 'hard']);

/**
 * Нарушение законности: ¬wellArchived ∧ ¬legalized.
 * `parked` исключён (M4: не блокирует, из счётчиков долга исключён —
 * иначе жёсткий режим никогда не наступит, пока владелец молчит).
 *
 * @param {{ wellArchived: boolean, legalized: boolean, parked?: boolean }} entry
 */
export function isIllegal(entry) {
  return entry.wellArchived !== true && entry.legalized !== true && entry.parked !== true;
}

/** `N_illegal = |{r : ¬wellArchived(r) ∧ ¬legalized(r)}|` (parked вне счёта). */
export function nIllegal(entries) {
  return entries.filter(isIllegal).length;
}

/** Предикат готовности к жёсткому режиму: незаконных записей ноль. */
export function readyForHard(entries) {
  return nIllegal(entries) === 0;
}

/**
 * Прогон гейта законности.
 *
 * @param {{
 *   mode: 'soft' | 'migrating' | 'hard',
 *   entries: { id: string, debtClass: string, wellArchived: boolean, legalized: boolean, parked?: boolean, parkedSince?: string | null }[],
 *   previousNIllegal?: number | null,
 *   snapshotHeader?: { capturedAt?: string, sourceRevision?: string } | null,
 * }} input
 * @returns {{
 *   exitCode: number,
 *   report: {
 *     mode: string, nIllegal: number, delta: number | null, readyForHard: boolean,
 *     openWork: number, violations: { id: string, debtClass: string }[],
 *     parked: { id: string, since: string | null }[],
 *     provenance: { capturedAt: string | null, sourceRevision: string | null },
 *   },
 * }}
 */
export function runLegalityGate({ mode, entries, previousNIllegal = null, snapshotHeader = null }) {
  if (!GATE_MODES.includes(mode)) {
    throw new Error(`неизвестный режим гейта: ${mode} (ожидается ${GATE_MODES.join('|')})`);
  }
  const violations = entries.filter(isIllegal).map((e) => ({ id: e.id, debtClass: e.debtClass }));
  const count = violations.length;
  const parked = entries
    .filter((e) => e.parked === true)
    .map((e) => ({ id: e.id, since: e.parkedSince ?? null }));

  let exitCode = EXIT_CODES.OK;
  if (count > 0) {
    if (mode === 'soft') {
      exitCode = EXIT_CODES.OK; // комната M4: мягкий = warn, exit 0; работа не встаёт
    } else if (mode === 'migrating') {
      exitCode = EXIT_CODES.LEGALITY_MIGRATING; // код назначен блоком (см. шапку файла)
    } else {
      exitCode = EXIT_CODES.LEGALITY_HARD; // комната M4: жёсткий = exit ≠ 0
    }
  }

  return {
    exitCode,
    report: {
      mode,
      nIllegal: count,
      delta: previousNIllegal === null ? null : count - previousNIllegal,
      readyForHard: count === 0,
      openWork: entries.filter((e) => e.debtClass === 'work' && e.parked !== true).length,
      violations,
      parked,
      provenance: {
        capturedAt: snapshotHeader?.capturedAt ?? null,
        sourceRevision: snapshotHeader?.sourceRevision ?? null,
      },
    },
  };
}

/**
 * Видимая шапка отчёта миграции (M4 DoD: mode, N_illegal, дельта, parked с датами).
 *
 * @param {ReturnType<typeof runLegalityGate>['report']} report
 * @returns {string}
 */
export function formatGateReportHeader(report) {
  const lines = [
    `# Гейт законности — режим: ${report.mode}`,
    '',
    `- N_illegal: ${report.nIllegal}${report.delta === null ? '' : ` (дельта за прогон: ${report.delta >= 0 ? '+' : ''}${report.delta})`}`,
    `- незакрытых работ (только debtClass=work): ${report.openWork}`,
    `- готовность к жёсткому режиму (N_illegal = 0): ${report.readyForHard ? 'да' : 'нет'}`,
    `- снимок: capturedAt=${report.provenance.capturedAt ?? '—'} · sourceRevision=${report.provenance.sourceRevision ?? '—'}`,
  ];
  if (report.parked.length > 0) {
    lines.push(`- parked (ждёт владельца): ${report.parked.map((p) => `${p.id} с ${p.since ?? '?'}`).join(', ')}`);
  }
  return lines.join('\n');
}
