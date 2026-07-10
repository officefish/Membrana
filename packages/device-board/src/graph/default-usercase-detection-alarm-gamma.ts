import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioCommentGroup,
  type ScenarioGraphEdge,
  type ScenarioGraphNode,
  type ScenarioNodeKind,
  type ScenarioSubgraph,
  type SocketType,
} from '@membrana/core';

/**
 * Team Gamma · Competition Sprint `comp-detection-alarm-2026-07-10`.
 *
 * «Прозрачный сценарий»: полный детекционный UserCase (combined + alarm-loop)
 * как плакат ①–⑥ — ПЛОСКИЙ граф без user-функций, каждый поворотный момент
 * (старт, окно, решение двух детекторов, трек, async-отчёт, тревога) виден на
 * канвасе и печатается в журнал.
 *
 * Топология (см. team-gamma/CONCEPT.md):
 * - main: поток → окно (collect 3 c) → gate 5 c → Sequence (latent):
 *   then-0 — trends + ensemble → fusion → branch; detected: print③ → stop →
 *   MakeTrack → StartAsyncJob(track-upload); not-detected: stop (тихий);
 *   then-1 — рестарт записи. Детачед-хвост: OnAsyncResolved → print④ →
 *   MakeCombinedReport → PublishReport → print⑤ (не блокирует main loop).
 * - alarm: MakeProximityTrend → print⑥ → is-valid(ProximityRef):
 *   true → loop-repeat (тревога живёт), false = lost → print → выход.
 *
 * Async-канал — `track-upload` (единственный jobKind, поддержанный host-мостом
 * клиента); combined-отчёт собирается детачед после загрузки трека, публикация
 * лёгкая (sync), тяжесть — в job. `report-build` канал появится с host-мостом.
 *
 * `bundledGraphVersion: 'v2.0-async'` — guard migrate-on-load: без него плоский
 * make-recording-policy в main ложно триггерит `needsBundledV09FunctionsMigration`
 * и системный preview подменялся бы bundled MVP.
 */

/** Catalog id (brief: `usercase-detection-alarm-<team>`). */
export const DETECTION_ALARM_GAMMA_USER_CASE_ID = 'usercase-detection-alarm-gamma';

/** Document-scope переменная журнала. */
export const DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID = 'var-journal1';

/** Читаемые id ключевых узлов (плакат ①–⑥) — используются тестами. */
export const DETECTION_ALARM_GAMMA_NODE_IDS = {
  // main: окно наблюдения
  guard: 'g-guard',
  sample: 'g-sample',
  fftFrame: 'g-fft',
  collectFft: 'g-collect-fft',
  collectSamples: 'g-collect-samples',
  gate: 'g-gate',
  sequence: 'g-seq',
  mainLoopRepeat: 'main-infinity',
  // main: два детектора → слияние → решение
  flush: 'g-flush',
  trends: 'g-trends',
  ensemble: 'g-ensemble',
  fusion: 'g-fusion',
  branch: 'g-branch',
  printDetected: 'g-print-detected',
  // main: detected — трек и async-загрузка
  stopRecording: 'g-stoprec',
  stopRecordingQuiet: 'g-stoprec-quiet',
  makeTrack: 'g-track',
  uploadJob: 'g-upload',
  restartRecording: 'g-restartrec',
  // main: детачед async-хвост
  asyncResolved: 'g-resolved',
  printTrack: 'g-print-track',
  combinedReport: 'g-combined',
  publishReport: 'g-publish',
  printReport: 'g-print-report',
  // провайдеры данных main
  reporter: 'g-reporter',
  journalVar: 'g-journal-var',
  // alarm
  proximity: 'g-prox',
  printProximity: 'g-print-prox',
  alarmIsValid: 'g-alarm-isvalid',
  alarmLoopRepeat: 'alarm-infinity',
  printProximityLost: 'g-print-prox-lost',
} as const;

const COLLECTOR_CONFIG = {
  windowSec: 3,
  bufferSize: 2048,
  queueCapacity: 10,
  smoothingTimeConstant: 0.75,
} as const;

const RECORDING_POLICY = { windowSec: 5, captureFormat: 'wav' } as const;

const FFT_TRENDS_POLICY = {
  minRms: 0.02,
  intervalMs: 500,
  detectionMode: 'auto',
  minConfidence: 0.55,
  measurementsCount: 20,
  enabledTemplateKeys: ['DRONE_TIGHT', 'WIND', 'QUIET', 'TRAFFIC', 'BIRDS', 'VOICE'],
} as const;

type NodeExtra = Omit<Partial<ScenarioGraphNode>, 'id' | 'nodeKind' | 'label' | 'position' | 'blockKind'>;

function n(
  id: string,
  nodeKind: ScenarioNodeKind,
  label: string,
  x: number,
  y: number,
  extra: NodeExtra = {},
): ScenarioGraphNode {
  return { id, blockKind: 'custom', nodeKind, label, position: { x, y }, ...extra };
}

function exec(
  source: string,
  target: string,
  sourceHandle = 'exec-out',
  targetHandle = 'exec-in',
): ScenarioGraphEdge {
  return { kind: 'exec', source, sourceHandle, target, targetHandle };
}

/** Event-ребро детачед-диспатча (OnAsyncResolved → exec-цепочка). */
function evt(source: string, target: string): ScenarioGraphEdge {
  return { kind: 'event', source, sourceHandle: 'event-out', target, targetHandle: 'exec-in' };
}

function data(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  dataType: SocketType,
): ScenarioGraphEdge {
  return { kind: 'data', source, sourceHandle, target, targetHandle, dataType };
}

const NODE_BOX_WIDTH = 280;
const NODE_BOX_HEIGHT = 190;
const GROUP_PADDING = 60;

/** Рамка группы по bounding-box узлов — плакат без ручных прямоугольников. */
function groupRect(
  nodes: readonly ScenarioGraphNode[],
  nodeIds: readonly string[],
): ScenarioCommentGroup['rect'] {
  const members = nodes.filter((node) => nodeIds.includes(node.id));
  if (members.length === 0) {
    return { x: 0, y: 0, width: NODE_BOX_WIDTH, height: NODE_BOX_HEIGHT };
  }
  const xs = members.map((node) => node.position.x);
  const ys = members.map((node) => node.position.y);
  const minX = Math.min(...xs) - GROUP_PADDING;
  const minY = Math.min(...ys) - GROUP_PADDING;
  const maxX = Math.max(...xs) + NODE_BOX_WIDTH + GROUP_PADDING;
  const maxY = Math.max(...ys) + NODE_BOX_HEIGHT + GROUP_PADDING;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function buildInitialSubgraph(): ScenarioSubgraph {
  const nodes: ScenarioGraphNode[] = [
    n('initial-event', 'event', 'On start', -220, 160, { system: true, eventVariant: 'handler' }),
    n('g-init-mic', 'get-microphone', 'GetMicrophone', 120, 160),
    n('g-init-stream', 'start-streaming', 'StartStreaming', 460, 160),
    n('g-init-startrec', 'start-recording', 'StartRecording', 800, 160),
    n('g-init-print', 'print', '① Печать: поток запущен', 1140, 160),
    n('g-init-recorder', 'get-recorder', 'GetRecorder', 120, 480),
    n('g-init-recpolicy', 'make-recording-policy', 'MakeRecordingPolicy (5 c, wav)', 460, 480, {
      pure: true,
      recordingPolicy: RECORDING_POLICY,
    }),
  ];
  const edges: ScenarioGraphEdge[] = [
    exec('initial-event', 'g-init-mic'),
    exec('g-init-mic', 'g-init-stream'),
    exec('g-init-stream', 'g-init-startrec'),
    exec('g-init-startrec', 'g-init-print'),
    data('initial-event', 'device', 'g-init-mic', 'device', 'DeviceRef'),
    data('initial-event', 'device', 'g-init-recorder', 'device', 'DeviceRef'),
    data('g-init-mic', 'microphone', 'g-init-stream', 'microphone', 'MicrophoneRef'),
    data('g-init-recorder', 'recorder', 'g-init-startrec', 'recorder', 'RecorderRef'),
    data('g-init-stream', 'stream', 'g-init-startrec', 'stream', 'AudioStreamRef'),
    data('g-init-recpolicy', 'policy', 'g-init-startrec', 'policy', 'RecordingPolicy'),
    data('g-init-stream', 'stream', 'g-init-print', 'value', 'AudioStreamRef'),
  ];
  return { entry: 'initial-event', nodes, edges };
}

function buildOnConnectSubgraph(): ScenarioSubgraph {
  const journalVariableId = DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID;
  const nodes: ScenarioGraphNode[] = [
    n('on-connect-event', 'event', 'On connect', -220, 160, { system: true, eventVariant: 'handler' }),
    n('g-conn-isvalid', 'is-valid', 'isValid: сервер на связи?', 120, 160),
    n('g-conn-set-server', 'variable-set', 'journal1', 460, 20, { variableId: journalVariableId }),
    n('g-conn-set-device', 'variable-set', 'journal1', 460, 300, { variableId: journalVariableId }),
    n('g-conn-journal-server', 'get-journal', 'GetJournal (server)', 120, 480),
    n('g-conn-journal-device', 'get-journal', 'GetJournal (device)', 460, 480),
  ];
  const edges: ScenarioGraphEdge[] = [
    exec('on-connect-event', 'g-conn-isvalid'),
    exec('g-conn-isvalid', 'g-conn-set-server', 'exec-true-out'),
    exec('g-conn-isvalid', 'g-conn-set-device', 'exec-false-out'),
    data('on-connect-event', 'server', 'g-conn-isvalid', 'value', 'ServerRef'),
    data('on-connect-event', 'server', 'g-conn-journal-server', 'server', 'ServerRef'),
    data('g-conn-journal-server', 'journal', 'g-conn-set-server', 'value', 'JournalRef'),
    data('on-connect-event', 'device', 'g-conn-journal-device', 'device', 'DeviceRef'),
    data('g-conn-journal-device', 'journal', 'g-conn-set-device', 'value', 'JournalRef'),
  ];
  return { entry: 'on-connect-event', nodes, edges };
}

function buildMainSubgraph(): ScenarioSubgraph {
  const async = { supportsAsync: true as const };
  const nodes: ScenarioGraphNode[] = [
    // Магистраль наблюдения (②)
    n('main-on-tick', 'event', 'onTick', -220, 160, { system: true, eventVariant: 'loopTick' }),
    n('g-guard', 'is-valid', 'isValid: поток жив?', 120, 160),
    n('g-print-lost-stream', 'print', 'Печать: поток потерян', 120, -160),
    n('g-stopruntime', 'stop-runtime', 'StopRuntime', 460, -160),
    n('g-sample', 'get-sample', 'GetSample', 460, 160),
    n('g-fft', 'get-fft-frame', 'GetFFTFrame', 800, 160),
    n('g-collect-fft', 'collect-fft-frames', 'CollectFftFrames (3 c)', 1140, 160, {
      collectorConfig: COLLECTOR_CONFIG,
    }),
    n('g-collect-samples', 'collect-samples', 'CollectSamples (3 c)', 1480, 160, {
      collectorConfig: COLLECTOR_CONFIG,
    }),
    n('g-gate', 'is-recording-window-full', 'IsRecordingWindowFull (5 c)', 1820, 160, {
      recordingPolicy: RECORDING_POLICY,
    }),
    n('g-seq', 'sequence', 'Sequence: окно готово', 2160, 160, {
      sequenceConfig: { thenCount: 1, parallelAsync: false, latentThen: true },
    }),
    n('main-infinity', 'loop-repeat', '∞', 2500, 160, { system: true }),
    // Два детектора → слияние → решение (③)
    n('g-flush', 'flush-spectral-analyser', 'FlushSpectralAnalyser', 2500, -120, async),
    n('g-trends', 'make-fft-trends-analysis', 'MakeFftTrendsAnalysis · детектор 1', 2840, -120, async),
    n('g-ensemble', 'make-ensemble-analysis', 'MakeEnsembleAnalysis · детектор 2', 3180, -120, async),
    n('g-fusion', 'make-detection-fusion', 'MakeDetectionFusion (2 входа)', 3520, -120, {
      ...async,
      detectionFusionInputCount: 2,
    }),
    n('g-branch', 'branch-on-detection', 'BranchOnDetection (порог 0.5)', 3860, -120, {
      ...async,
      detectionThreshold: 0.5,
    }),
    // Detected: трек → async-загрузка (④)
    n('g-print-detected', 'print', '③ Печать: детекция (score)', 4200, -320, async),
    n('g-stoprec', 'stop-recording', 'StopRecording', 4540, -320, async),
    n('g-track', 'make-track', 'MakeTrack', 4880, -320, async),
    n('g-upload', 'start-async-job', 'StartAsyncJob: track-upload', 5220, -320, {
      ...async,
      asyncJobConfig: { jobKind: 'track-upload' },
    }),
    n('g-stoprec-quiet', 'stop-recording', 'StopRecording (тихое окно)', 4200, 40, async),
    // Рестарт окна записи — хвост ОБЕИХ веток решения. Нельзя запускать его
    // latent-веткой then-N: он успевает отработать no-op'ом, пока запись ещё
    // идёт, а затем StopRecording убивает её навсегда — сценарий детектирует
    // ровно один раз (live-тест 2026-07-10, run bf0a3922).
    n('g-restartrec', 'start-recording', 'StartRecording: рестарт окна', 2500, 400, async),
    // Детачед async-хвост: отчёт после загрузки трека (⑤)
    n('g-resolved', 'on-async-resolved', 'OnAsyncResolved: трек загружен', 5560, -560, async),
    n('g-print-track', 'print', '④ Печать: трек в библиотеке', 5900, -560, async),
    n('g-combined', 'make-combined-report', 'MakeCombinedReport', 6240, -560, async),
    n('g-publish', 'publish-report', 'PublishReport', 6580, -560, async),
    n('g-print-report', 'print', '⑤ Печать: combined-отчёт опубликован', 6920, -560, async),
    // Провайдеры данных (нижний ряд)
    n('g-device', 'device-global', 'GetDevice', -220, 640),
    n('g-mic', 'get-microphone', 'GetMicrophone', 120, 640),
    n('g-stream', 'get-audio-stream', 'GetAudioStream', 460, 640),
    n('g-recorder', 'get-recorder', 'GetRecorder', 800, 640),
    n('g-analyser', 'get-spectral-analyser', 'GetSpectralAnalyser', 1140, 640),
    n('g-journal-var', 'variable-get', 'journal1', 1480, 640, {
      variableId: DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID,
    }),
    n('g-reporter', 'get-reporter', 'GetReporter', 1820, 640),
    n('g-fftpolicy', 'make-fft-trends-policy', 'MakeFftTrendsPolicy', 2160, 640, {
      pure: true,
      fftTrendsPolicy: FFT_TRENDS_POLICY,
    }),
    n('g-recpolicy', 'make-recording-policy', 'MakeRecordingPolicy (5 c, wav)', 2500, 640, {
      pure: true,
      recordingPolicy: RECORDING_POLICY,
    }),
  ];

  const edges: ScenarioGraphEdge[] = [
    // Exec-магистраль
    exec('main-on-tick', 'g-guard'),
    exec('g-guard', 'g-sample', 'exec-true-out'),
    exec('g-guard', 'g-print-lost-stream', 'exec-false-out'),
    exec('g-print-lost-stream', 'g-stopruntime'),
    exec('g-sample', 'g-fft'),
    exec('g-fft', 'g-collect-fft'),
    exec('g-collect-fft', 'g-collect-samples'),
    exec('g-collect-samples', 'g-gate'),
    exec('g-gate', 'main-infinity', 'exec-false-out'),
    exec('g-gate', 'g-seq', 'exec-true-out'),
    // then-0: детекция и решение
    exec('g-seq', 'g-flush', 'then-0'),
    exec('g-flush', 'g-trends'),
    exec('g-trends', 'g-ensemble'),
    exec('g-ensemble', 'g-fusion'),
    exec('g-fusion', 'g-branch'),
    exec('g-branch', 'g-print-detected', 'detected'),
    exec('g-print-detected', 'g-stoprec'),
    exec('g-stoprec', 'g-track'),
    exec('g-track', 'g-upload'),
    exec('g-branch', 'g-stoprec-quiet', 'not-detected'),
    // Рестарт записи — после стопов, из хвоста каждой ветки решения
    exec('g-upload', 'g-restartrec'),
    exec('g-stoprec-quiet', 'g-restartrec'),
    exec('g-seq', 'main-infinity', 'exec-out'),
    // Детачед-хвост: отчёт после resolve загрузки
    evt('g-resolved', 'g-print-track'),
    exec('g-print-track', 'g-combined'),
    exec('g-combined', 'g-publish'),
    exec('g-publish', 'g-print-report'),
    // Данные: провайдеры
    data('g-device', 'device', 'g-mic', 'device', 'DeviceRef'),
    data('g-mic', 'microphone', 'g-stream', 'microphone', 'MicrophoneRef'),
    data('g-device', 'device', 'g-recorder', 'device', 'DeviceRef'),
    data('g-device', 'device', 'g-analyser', 'device', 'DeviceRef'),
    data('g-device', 'device', 'g-stopruntime', 'device', 'DeviceRef'),
    data('g-journal-var', 'value', 'g-reporter', 'journal', 'JournalRef'),
    // Данные: окно наблюдения
    data('g-stream', 'stream', 'g-guard', 'value', 'AudioStreamRef'),
    data('g-stream', 'stream', 'g-print-lost-stream', 'value', 'AudioStreamRef'),
    data('g-stream', 'stream', 'g-sample', 'stream', 'AudioStreamRef'),
    data('g-sample', 'sample', 'g-fft', 'sample', 'AudioSampleRef'),
    data('g-fft', 'frame', 'g-collect-fft', 'frame', 'FftFrameRef'),
    data('g-analyser', 'analyser', 'g-collect-fft', 'analyser', 'SpectralAnalyserRef'),
    data('g-recorder', 'recorder', 'g-collect-samples', 'recorder', 'RecorderRef'),
    data('g-sample', 'sample', 'g-collect-samples', 'sample', 'AudioSampleRef'),
    data('g-recorder', 'recorder', 'g-gate', 'recorder', 'RecorderRef'),
    // Данные: детекторы и слияние
    data('g-analyser', 'analyser', 'g-flush', 'analyser', 'SpectralAnalyserRef'),
    data('g-flush', 'frames', 'g-trends', 'frames', 'FftFrameRefList'),
    data('g-analyser', 'analyser', 'g-trends', 'analyser', 'SpectralAnalyserRef'),
    data('g-fftpolicy', 'policy', 'g-trends', 'policy', 'FftTrendsPolicy'),
    data('g-collect-samples', 'batches', 'g-ensemble', 'samples', 'AudioSampleRefList'),
    data('g-trends', 'analysis', 'g-fusion', 'analysis-1', 'DetectionAnalysisRef'),
    data('g-ensemble', 'analysis', 'g-fusion', 'analysis-2', 'DetectionAnalysisRef'),
    data('g-fusion', 'fusion', 'g-branch', 'fusion', 'DetectionFusion'),
    data('g-fusion', 'fusion', 'g-print-detected', 'value', 'DetectionFusion'),
    // Данные: трек
    data('g-recorder', 'recorder', 'g-stoprec', 'recorder', 'RecorderRef'),
    data('g-recorder', 'recorder', 'g-stoprec-quiet', 'recorder', 'RecorderRef'),
    data('g-recorder', 'recorder', 'g-track', 'recorder', 'RecorderRef'),
    data('g-stoprec', 'slice', 'g-track', 'slice', 'RecordingSliceRef'),
    data('g-collect-samples', 'batches', 'g-track', 'samples', 'AudioSampleRefList'),
    data('g-track', 'track', 'g-upload', 'track', 'TrackRef'),
    data('g-upload', 'promise', 'g-resolved', 'promise', 'PromiseRef'),
    // Данные: детачед-отчёт
    data('g-track', 'track', 'g-print-track', 'value', 'TrackRef'),
    data('g-reporter', 'reporter', 'g-combined', 'reporter', 'ReporterRef'),
    data('g-trends', 'analysis', 'g-combined', 'analysis-1', 'DetectionAnalysisRef'),
    data('g-ensemble', 'analysis', 'g-combined', 'analysis-2', 'DetectionAnalysisRef'),
    data('g-track', 'track', 'g-combined', 'track', 'TrackRef'),
    data('g-journal-var', 'value', 'g-publish', 'journal', 'JournalRef'),
    data('g-combined', 'report', 'g-publish', 'report', 'ReportRef'),
    data('g-combined', 'report', 'g-print-report', 'value', 'ReportRef'),
    // Данные: рестарт записи
    data('g-recorder', 'recorder', 'g-restartrec', 'recorder', 'RecorderRef'),
    data('g-stream', 'stream', 'g-restartrec', 'stream', 'AudioStreamRef'),
    data('g-recpolicy', 'policy', 'g-restartrec', 'policy', 'RecordingPolicy'),
  ];

  return { entry: 'main-on-tick', nodes, edges };
}

function buildAlarmSubgraph(): ScenarioSubgraph {
  const nodes: ScenarioGraphNode[] = [
    n('alarm-on-tick', 'event', 'onTick', -220, 160, { system: true, eventVariant: 'loopTick' }),
    n('g-prox', 'make-proximity-trend', 'MakeProximityTrend', 120, 160),
    n('g-print-prox', 'print', '⑥ Печать: тренд дистанции', 460, 160),
    n('g-alarm-isvalid', 'is-valid', 'isValid: цель на связи?', 800, 160),
    n('alarm-infinity', 'loop-repeat', '∞', 1140, 20, { system: true }),
    n('g-print-prox-lost', 'print', 'Печать: дистанция потеряна — выход', 1140, 320),
  ];
  const edges: ScenarioGraphEdge[] = [
    exec('alarm-on-tick', 'g-prox'),
    exec('g-prox', 'g-print-prox'),
    exec('g-print-prox', 'g-alarm-isvalid'),
    exec('g-alarm-isvalid', 'alarm-infinity', 'exec-true-out'),
    exec('g-alarm-isvalid', 'g-print-prox-lost', 'exec-false-out'),
    data('g-prox', 'proximity', 'g-print-prox', 'value', 'ProximityRef'),
    data('g-prox', 'proximity', 'g-alarm-isvalid', 'value', 'ProximityRef'),
    data('g-prox', 'proximity', 'g-print-prox-lost', 'value', 'ProximityRef'),
  ];
  return { entry: 'alarm-on-tick', nodes, edges };
}

function buildOnStopSubgraph(): ScenarioSubgraph {
  const nodes: ScenarioGraphNode[] = [
    n('on-stop-event', 'event', 'On stop', -220, 160, { system: true, eventVariant: 'handler' }),
    n('g-stop-isvalid', 'is-valid', 'isValid: микрофон?', 120, 160),
    n('g-stop-streaming', 'stop-streaming', 'StopStreaming', 460, 160),
    n('g-stop-cancel', 'cancel-async-jobs', 'CancelAsyncJobs: track-upload', 800, 160, {
      asyncJobConfig: { jobKind: 'track-upload' },
    }),
    n('g-stop-device', 'device-global', 'GetDevice', -220, 480),
    n('g-stop-mic', 'get-microphone', 'GetMicrophone', 120, 480),
  ];
  const edges: ScenarioGraphEdge[] = [
    exec('on-stop-event', 'g-stop-isvalid'),
    exec('g-stop-isvalid', 'g-stop-streaming', 'exec-true-out'),
    exec('g-stop-streaming', 'g-stop-cancel'),
    data('g-stop-device', 'device', 'g-stop-mic', 'device', 'DeviceRef'),
    data('g-stop-mic', 'microphone', 'g-stop-isvalid', 'value', 'MicrophoneRef'),
    data('g-stop-mic', 'microphone', 'g-stop-streaming', 'microphone', 'MicrophoneRef'),
  ];
  return { entry: 'on-stop-event', nodes, edges };
}

function buildOnDisconnectSubgraph(): ScenarioSubgraph {
  const nodes: ScenarioGraphNode[] = [
    n('on-disconnect-event', 'event', 'On disconnect', -220, 160, {
      system: true,
      eventVariant: 'handler',
    }),
    n('g-disc-set-journal', 'variable-set', 'journal1', 120, 160, {
      variableId: DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID,
    }),
    n('g-disc-device', 'device-global', 'GetDevice', -220, 480),
    n('g-disc-journal', 'get-journal', 'GetJournal (device)', 120, 480),
  ];
  const edges: ScenarioGraphEdge[] = [
    exec('on-disconnect-event', 'g-disc-set-journal'),
    data('g-disc-device', 'device', 'g-disc-journal', 'device', 'DeviceRef'),
    data('g-disc-journal', 'journal', 'g-disc-set-journal', 'value', 'JournalRef'),
  ];
  return { entry: 'on-disconnect-event', nodes, edges };
}

function buildCommentGroups(
  initial: ScenarioSubgraph,
  main: ScenarioSubgraph,
  alarm: ScenarioSubgraph,
): readonly ScenarioCommentGroup[] {
  const ids = DETECTION_ALARM_GAMMA_NODE_IDS;
  const group = (
    id: string,
    branch: ScenarioCommentGroup['branch'],
    title: string,
    description: string,
    subgraph: ScenarioSubgraph,
    nodeIds: readonly string[],
  ): ScenarioCommentGroup => ({
    id,
    branch,
    title,
    description,
    frameColor: { preset: 'accent' },
    rect: groupRect(subgraph.nodes, nodeIds),
    nodeIds,
  });
  return [
    group(
      'gcg-1',
      'initial',
      '① Старт: микрофон → поток → запись',
      'Разовый бутстрап: открываем поток и катим окно записи 5 с.',
      initial,
      ['g-init-mic', 'g-init-stream', 'g-init-startrec', 'g-init-print'],
    ),
    group(
      'gcg-2',
      'main',
      '② Окно наблюдения (3 с)',
      'Каждый тик: сэмпл + FFT в коллекторы; гейт ждёт полного окна записи.',
      main,
      [ids.sample, ids.fftFrame, ids.collectFft, ids.collectSamples, ids.gate],
    ),
    group(
      'gcg-3',
      'main',
      '③ Два детектора → слияние → решение',
      'Trends + DSP-ансамбль → fusion (combinedScore) → branch по порогу 0.5.',
      main,
      [ids.flush, ids.trends, ids.ensemble, ids.fusion, ids.branch, ids.printDetected],
    ),
    group(
      'gcg-4',
      'main',
      '④ Детекция: трек → async-загрузка',
      'Только на detected: стоп записи, MakeTrack, загрузка job-ом (не блокирует цикл).',
      main,
      [ids.stopRecording, ids.makeTrack, ids.uploadJob],
    ),
    group(
      'gcg-5',
      'main',
      '⑤ Async-хвост: combined-отчёт',
      'После загрузки трека: единый отчёт двух детекторов → публикация в журнал.',
      main,
      [ids.asyncResolved, ids.printTrack, ids.combinedReport, ids.publishReport, ids.printReport],
    ),
    group(
      'gcg-6',
      'alarm',
      '⑥ Тревога: ближе/дальше до потери',
      'ProximityRef живёт — loop-repeat; lost → invalid → is-valid false = выход.',
      alarm,
      [ids.proximity, ids.printProximity, ids.alarmIsValid, ids.printProximityLost],
    ),
  ];
}

/** Собирает документ Team Gamma (без парсинга — для тестов структуры). */
export function buildDetectionAlarmGammaDocument(): DeviceScenarioDocument {
  const initial = buildInitialSubgraph();
  const main = buildMainSubgraph();
  const alarm = buildAlarmSubgraph();
  return {
    version: 2,
    kind: 'device-scenario',
    deviceKind: 'microphone',
    meta: {
      title: 'Gamma · Detection + Alarm — прозрачный сценарий',
      // Guard migrate-on-load (см. doc-комментарий модуля).
      bundledGraphVersion: 'v2.0-async',
    },
    signalGraph: {
      nodes: [
        { id: 'signal-capture', pluginId: 'microphone', position: { x: 80, y: 140 } },
        { id: 'signal-analyzer', pluginId: 'fft-analyzer', position: { x: 340, y: 140 } },
      ],
      edges: [
        {
          source: 'signal-capture',
          target: 'signal-analyzer',
          sourceHandle: 'audio-out',
          targetHandle: 'audio-in',
        },
      ],
    },
    scenario: {
      initial,
      onConnect: buildOnConnectSubgraph(),
      loops: { main, alarm },
      triggers: {
        onStop: buildOnStopSubgraph(),
        onDisconnect: buildOnDisconnectSubgraph(),
        custom: [],
      },
      functions: [],
      scheduled: [],
      commentGroups: buildCommentGroups(initial, main, alarm),
      variables: [
        {
          id: DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID,
          name: 'journal1',
          type: 'JournalRef',
          value: null,
        },
      ],
    },
  };
}

let cachedDocument: DeviceScenarioDocument | null = null;

/** Полный документ UserCase Gamma (parse fail-fast + cache, как у bundled MVP). */
export function getDetectionAlarmGammaDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(buildDetectionAlarmGammaDocument());
  if (!parsed.ok) {
    throw new Error(`detection-alarm gamma document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}
