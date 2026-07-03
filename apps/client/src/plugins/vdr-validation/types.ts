/**
 * Плагин «VDR-валидация» (vdr-hg2, эпик vdr-hard-gate).
 * Требование владельца 2026-07-03: эксперименты валидации детекции
 * представлены в продукте как плагин модуля «Микрофон».
 */
export const VDR_VALIDATION_PLUGIN_ID = 'vdr-validation';

/** Метка истины из манифеста пилота (ставит оператор, DATASET_CURATION). */
export type VdrTruthLabel = 'drone' | 'not-drone' | 'unlabeled';

export interface VdrManifestSample {
  readonly id: string;
  readonly label: VdrTruthLabel;
  readonly path?: string;
}

export interface VdrCorpusRow {
  readonly id: string;
  readonly fileName: string;
  readonly truth: VdrTruthLabel;
  readonly predIsDrone: boolean;
  readonly confidence: number;
  readonly templateId: string | null;
  readonly match: boolean | null; // null при truth=unlabeled
  readonly error: string | null;
}

export interface VdrGateMetrics {
  readonly compared: number;
  readonly unlabeled: number;
  readonly tp: number;
  readonly fp: number;
  readonly tn: number;
  readonly fn: number;
  readonly precision: number | null;
  readonly recall: number | null;
  readonly f1: number | null;
  readonly accuracy: number | null;
  /** hard: F1≥85%; soft: 80–85%; fail: <80% (консилиум vdr-validation-scope). */
  readonly gate: 'hard' | 'soft' | 'fail' | null;
}

export interface VdrLiveVerdict {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly templateId: string | null;
  readonly at: number;
}

export const VDR_GATE_HARD_F1 = 0.85;
export const VDR_GATE_SOFT_F1 = 0.8;
export const VDR_LIVE_WINDOW_SEC = 5;
