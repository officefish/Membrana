import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioCollectorConfig,
  type ScenarioFftTrendsPolicy,
  type ScenarioRecordingPolicy,
} from '@membrana/core';

/**
 * Team Alpha · Competition Sprint `comp-detection-alarm-2026-07-10` (#336).
 *
 * UserCase «Детекция + тревога (DSP-ансамбль)»: полный детекционный сценарий на
 * basn-палитре (#323) — окно наблюдения → два детектора (trends + ensemble) →
 * fusion (combinedScore) → branch; detected: трек → единый combined-отчёт →
 * async report-build/track-upload → publish; alarm: proximity → is-valid
 * (false = lost = выход) → loop-repeat.
 *
 * Изюминка Структурщика: ПЛОСКИЙ граф (functionCount = 0), одна exec-магистраль
 * слева направо на каждой вкладке, шесть пронумерованных comment-групп-«актов» —
 * оператор читает сценарий без документации. Обоснование топологии и policy:
 * docs/competition-sprint/comp-detection-alarm-2026-07-10/team-alpha/CONCEPT.md
 *
 * A3 (ADR-lite): в alarm-ветке живёт mirror-узел `alpha-main-fusion` (тот же id,
 * что fusion в main; прецедент — `fn-1-block` в initial+main bundled MVP).
 * Он dataflow-only (без exec): pull-резолюция отдаёт proximity-хосту
 * combinedScore последнего main-тика, а оператор видит источник score-гейта.
 */

const RECORDING_POLICY_5S_WAV: ScenarioRecordingPolicy = {
  windowSec: 5,
  captureFormat: 'wav',
};

const COLLECTOR_WINDOW_3S: ScenarioCollectorConfig = {
  windowSec: 3,
  bufferSize: 2048,
  queueCapacity: 10,
  smoothingTimeConstant: 0.75,
};

/** Канон trends-policy bundled MVP; minConfidence выравнен с порогом branch (A7). */
const TRENDS_POLICY_CANON: ScenarioFftTrendsPolicy = {
  minRms: 0.02,
  intervalMs: 500,
  detectionMode: 'auto',
  minConfidence: 0.55,
  measurementsCount: 20,
  enabledTemplateKeys: ['DRONE_TIGHT', 'WIND', 'QUIET', 'TRAFFIC', 'BIRDS', 'VOICE'],
};

/** Порог combinedScore решения BranchOnDetection (= minConfidence trends, A7). */
export const DETECTION_ALARM_ALPHA_THRESHOLD = 0.55;

/** id переменной журнала (onConnect → main publish / onDisconnect rebind). */
export const DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID = 'var-alpha-journal';

/**
 * Сырой документ (hand-authored, типизирован контрактами core — не codegen).
 * Node-id схема: `alpha-<ветка>-<роль>`; исключение — mirror `alpha-main-fusion`
 * в alarm (см. A3 выше).
 */
export const USERCASE_DETECTION_ALARM_ALPHA_DOCUMENT: DeviceScenarioDocument = {
  version: 2,
  kind: 'device-scenario',
  deviceKind: 'microphone',
  meta: {
    title: 'Alpha · Детекция + тревога (DSP-ансамбль)',
    exportedAt: '2026-07-10T09:00:00.000Z',
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
    // ── onStart: микрофон → поток → запись 5 c (bootstrap) ────────────────
    initial: {
      entry: 'initial-event',
      nodes: [
        {
          id: 'initial-event',
          label: 'On start',
          system: true,
          nodeKind: 'event',
          eventVariant: 'handler',
          blockKind: 'custom',
          position: { x: -1600, y: -40 },
        },
        {
          id: 'alpha-init-mic',
          label: 'GetMicrophone',
          nodeKind: 'get-microphone',
          blockKind: 'custom',
          position: { x: -1280, y: -80 },
        },
        {
          id: 'alpha-init-stream',
          label: 'StartStreaming',
          nodeKind: 'start-streaming',
          blockKind: 'custom',
          position: { x: -960, y: -80 },
        },
        {
          id: 'alpha-init-recorder',
          label: 'GetRecorder',
          nodeKind: 'get-recorder',
          blockKind: 'custom',
          position: { x: -640, y: -80 },
        },
        {
          id: 'alpha-init-rec-policy',
          label: 'MakeRecordingPolicy',
          nodeKind: 'make-recording-policy',
          blockKind: 'custom',
          pure: true,
          recordingPolicy: RECORDING_POLICY_5S_WAV,
          position: { x: -640, y: 160 },
        },
        {
          id: 'alpha-init-start-rec',
          label: 'StartRecording',
          nodeKind: 'start-recording',
          blockKind: 'custom',
          recordingPolicy: RECORDING_POLICY_5S_WAV,
          position: { x: -320, y: -80 },
        },
      ],
      edges: [
        { kind: 'exec', source: 'initial-event', sourceHandle: 'exec-out', target: 'alpha-init-mic', targetHandle: 'exec-in' },
        { kind: 'data', source: 'initial-event', sourceHandle: 'device', target: 'alpha-init-mic', targetHandle: 'device', dataType: 'DeviceRef' },
        { kind: 'exec', source: 'alpha-init-mic', sourceHandle: 'exec-out', target: 'alpha-init-stream', targetHandle: 'exec-in' },
        { kind: 'data', source: 'alpha-init-mic', sourceHandle: 'microphone', target: 'alpha-init-stream', targetHandle: 'microphone', dataType: 'MicrophoneRef' },
        { kind: 'exec', source: 'alpha-init-stream', sourceHandle: 'exec-out', target: 'alpha-init-recorder', targetHandle: 'exec-in' },
        { kind: 'data', source: 'initial-event', sourceHandle: 'device', target: 'alpha-init-recorder', targetHandle: 'device', dataType: 'DeviceRef' },
        { kind: 'exec', source: 'alpha-init-recorder', sourceHandle: 'exec-out', target: 'alpha-init-start-rec', targetHandle: 'exec-in' },
        { kind: 'data', source: 'alpha-init-recorder', sourceHandle: 'recorder', target: 'alpha-init-start-rec', targetHandle: 'recorder', dataType: 'RecorderRef' },
        { kind: 'data', source: 'alpha-init-stream', sourceHandle: 'stream', target: 'alpha-init-start-rec', targetHandle: 'stream', dataType: 'AudioStreamRef' },
        { kind: 'data', source: 'alpha-init-rec-policy', sourceHandle: 'policy', target: 'alpha-init-start-rec', targetHandle: 'policy', dataType: 'RecordingPolicy' },
      ],
    },
    // ── onConnect: журнал — сервер или локально ───────────────────────────
    onConnect: {
      entry: 'on-connect-event',
      nodes: [
        {
          id: 'on-connect-event',
          label: 'On connect',
          system: true,
          nodeKind: 'event',
          eventVariant: 'handler',
          blockKind: 'custom',
          position: { x: -160, y: -80 },
        },
        {
          id: 'alpha-conn-server-valid',
          label: 'isValid',
          nodeKind: 'is-valid',
          blockKind: 'custom',
          position: { x: 240, y: -120 },
        },
        {
          id: 'alpha-conn-journal-server',
          label: 'GetJournal (server)',
          nodeKind: 'get-journal',
          blockKind: 'custom',
          position: { x: 240, y: 120 },
        },
        {
          id: 'alpha-conn-set-journal-server',
          label: 'journal1',
          nodeKind: 'variable-set',
          variableId: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
          blockKind: 'custom',
          position: { x: 640, y: -160 },
        },
        {
          id: 'alpha-conn-journal-device',
          label: 'GetJournal (device)',
          nodeKind: 'get-journal',
          blockKind: 'custom',
          position: { x: 240, y: 320 },
        },
        {
          id: 'alpha-conn-set-journal-device',
          label: 'journal1',
          nodeKind: 'variable-set',
          variableId: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
          blockKind: 'custom',
          position: { x: 640, y: 40 },
        },
      ],
      edges: [
        { kind: 'exec', source: 'on-connect-event', sourceHandle: 'exec-out', target: 'alpha-conn-server-valid', targetHandle: 'exec-in' },
        { kind: 'data', source: 'on-connect-event', sourceHandle: 'server', target: 'alpha-conn-server-valid', targetHandle: 'value', dataType: 'ServerRef' },
        { kind: 'data', source: 'on-connect-event', sourceHandle: 'server', target: 'alpha-conn-journal-server', targetHandle: 'server', dataType: 'ServerRef' },
        { kind: 'exec', source: 'alpha-conn-server-valid', sourceHandle: 'exec-true-out', target: 'alpha-conn-set-journal-server', targetHandle: 'exec-in' },
        { kind: 'data', source: 'alpha-conn-journal-server', sourceHandle: 'journal', target: 'alpha-conn-set-journal-server', targetHandle: 'value', dataType: 'JournalRef' },
        { kind: 'data', source: 'on-connect-event', sourceHandle: 'device', target: 'alpha-conn-journal-device', targetHandle: 'device', dataType: 'DeviceRef' },
        { kind: 'exec', source: 'alpha-conn-server-valid', sourceHandle: 'exec-false-out', target: 'alpha-conn-set-journal-device', targetHandle: 'exec-in' },
        { kind: 'data', source: 'alpha-conn-journal-device', sourceHandle: 'journal', target: 'alpha-conn-set-journal-device', targetHandle: 'value', dataType: 'JournalRef' },
      ],
    },
    loops: {
      // ── main: акты ①–⑥, одна exec-магистраль слева направо ──────────────
      main: {
        entry: 'main-on-tick',
        nodes: [
          {
            id: 'main-on-tick',
            label: 'onTick',
            system: true,
            nodeKind: 'event',
            eventVariant: 'loopTick',
            blockKind: 'custom',
            position: { x: -2560, y: -640 },
          },
          {
            id: 'alpha-main-device',
            label: 'GetDevice',
            nodeKind: 'device-global',
            blockKind: 'custom',
            position: { x: -2560, y: -320 },
          },
          // ① Окно наблюдения (3 с)
          {
            id: 'alpha-main-mic',
            label: 'GetMicrophone',
            nodeKind: 'get-microphone',
            blockKind: 'custom',
            position: { x: -2240, y: -680 },
          },
          {
            id: 'alpha-main-stream',
            label: 'GetAudioStream',
            nodeKind: 'get-audio-stream',
            blockKind: 'custom',
            position: { x: -1920, y: -680 },
          },
          {
            id: 'alpha-main-sample',
            label: 'GetSample',
            nodeKind: 'get-sample',
            blockKind: 'custom',
            position: { x: -1600, y: -680 },
          },
          {
            id: 'alpha-main-fft',
            label: 'GetFFTFrame',
            nodeKind: 'get-fft-frame',
            blockKind: 'custom',
            position: { x: -1280, y: -680 },
          },
          {
            id: 'alpha-main-collect-fft',
            label: 'CollectFftFrames',
            nodeKind: 'collect-fft-frames',
            blockKind: 'custom',
            collectorConfig: COLLECTOR_WINDOW_3S,
            position: { x: -960, y: -680 },
          },
          {
            id: 'alpha-main-collect-samples',
            label: 'CollectSamples',
            nodeKind: 'collect-samples',
            blockKind: 'custom',
            collectorConfig: COLLECTOR_WINDOW_3S,
            position: { x: -640, y: -680 },
          },
          {
            id: 'alpha-main-analyser',
            label: 'GetSpectralAnalyser',
            nodeKind: 'get-spectral-analyser',
            blockKind: 'custom',
            position: { x: -1280, y: -320 },
          },
          {
            id: 'alpha-main-recorder',
            label: 'GetRecorder',
            nodeKind: 'get-recorder',
            blockKind: 'custom',
            position: { x: -960, y: -320 },
          },
          // ② Гейт записи 5 с
          {
            id: 'alpha-main-window-full',
            label: 'IsRecordingWindowFull',
            nodeKind: 'is-recording-window-full',
            blockKind: 'custom',
            recordingPolicy: RECORDING_POLICY_5S_WAV,
            position: { x: -320, y: -680 },
          },
          {
            id: 'alpha-main-infinity',
            label: '∞',
            system: true,
            nodeKind: 'loop-repeat',
            blockKind: 'custom',
            position: { x: 3520, y: -640 },
          },
          // ③ Трек + два детектора
          {
            id: 'alpha-main-stop-rec',
            label: 'StopRecording',
            nodeKind: 'stop-recording',
            blockKind: 'custom',
            position: { x: 0, y: -680 },
          },
          {
            id: 'alpha-main-track',
            label: 'MakeTrack',
            nodeKind: 'make-track',
            blockKind: 'custom',
            position: { x: 320, y: -680 },
          },
          {
            id: 'alpha-main-flush',
            label: 'FlushSpectralAnalyser',
            nodeKind: 'flush-spectral-analyser',
            blockKind: 'custom',
            position: { x: 640, y: -680 },
          },
          {
            id: 'alpha-main-trends',
            label: 'MakeFftTrendsAnalysis',
            nodeKind: 'make-fft-trends-analysis',
            blockKind: 'custom',
            position: { x: 960, y: -680 },
          },
          {
            id: 'alpha-main-trends-policy',
            label: 'MakeFftTrendsPolicy',
            nodeKind: 'make-fft-trends-policy',
            blockKind: 'custom',
            pure: true,
            fftTrendsPolicy: TRENDS_POLICY_CANON,
            position: { x: 960, y: -400 },
          },
          {
            id: 'alpha-main-ensemble',
            label: 'MakeEnsembleAnalysis',
            nodeKind: 'make-ensemble-analysis',
            blockKind: 'custom',
            position: { x: 1280, y: -680 },
          },
          // ④ Слияние и решение
          {
            id: 'alpha-main-fusion',
            label: 'MakeDetectionFusion',
            nodeKind: 'make-detection-fusion',
            blockKind: 'custom',
            detectionFusionInputCount: 2,
            position: { x: 1600, y: -680 },
          },
          {
            id: 'alpha-main-branch',
            label: 'BranchOnDetection',
            nodeKind: 'branch-on-detection',
            blockKind: 'custom',
            detectionThreshold: DETECTION_ALARM_ALPHA_THRESHOLD,
            position: { x: 1920, y: -680 },
          },
          // ⑤ Combined-отчёт + async (detached, main не блокируется)
          {
            id: 'alpha-main-var-journal',
            label: 'journal1',
            nodeKind: 'variable-get',
            variableId: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
            blockKind: 'custom',
            pure: true,
            position: { x: 1600, y: -1120 },
          },
          {
            id: 'alpha-main-reporter',
            label: 'GetReporter',
            nodeKind: 'get-reporter',
            blockKind: 'custom',
            position: { x: 1920, y: -1080 },
          },
          {
            id: 'alpha-main-report',
            label: 'MakeCombinedReport',
            nodeKind: 'make-combined-report',
            blockKind: 'custom',
            position: { x: 2240, y: -880 },
          },
          {
            id: 'alpha-main-seq',
            label: 'Sequence',
            nodeKind: 'sequence',
            blockKind: 'custom',
            sequenceConfig: { thenCount: 2, parallelAsync: false, latentThen: true },
            position: { x: 2560, y: -880 },
          },
          {
            id: 'alpha-main-job-report',
            label: 'StartAsyncJob (report-build)',
            nodeKind: 'start-async-job',
            blockKind: 'custom',
            asyncJobConfig: { jobKind: 'report-build' },
            supportsAsync: true,
            position: { x: 2880, y: -1120 },
          },
          {
            id: 'alpha-main-on-report-built',
            label: 'OnAsyncResolved',
            nodeKind: 'on-async-resolved',
            blockKind: 'custom',
            position: { x: 3200, y: -1120 },
          },
          {
            id: 'alpha-main-publish',
            label: 'PublishReport',
            nodeKind: 'publish-report',
            blockKind: 'custom',
            supportsAsync: true,
            position: { x: 3520, y: -1120 },
          },
          {
            id: 'alpha-main-var-journal-2',
            label: 'journal1',
            nodeKind: 'variable-get',
            variableId: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
            blockKind: 'custom',
            pure: true,
            position: { x: 3200, y: -1320 },
          },
          {
            id: 'alpha-main-job-upload',
            label: 'StartAsyncJob (track-upload)',
            nodeKind: 'start-async-job',
            blockKind: 'custom',
            asyncJobConfig: { jobKind: 'track-upload' },
            supportsAsync: true,
            position: { x: 2880, y: -760 },
          },
          // ⑥ Перезапуск записи (сходятся detected и not-detected)
          {
            id: 'alpha-main-rec-policy',
            label: 'MakeRecordingPolicy',
            nodeKind: 'make-recording-policy',
            blockKind: 'custom',
            pure: true,
            recordingPolicy: RECORDING_POLICY_5S_WAV,
            position: { x: 2560, y: -400 },
          },
          {
            id: 'alpha-main-restart-rec',
            label: 'StartRecording (рестарт)',
            nodeKind: 'start-recording',
            blockKind: 'custom',
            recordingPolicy: RECORDING_POLICY_5S_WAV,
            position: { x: 2880, y: -520 },
          },
        ],
        edges: [
          // exec-магистраль ①
          { kind: 'exec', source: 'main-on-tick', sourceHandle: 'exec-out', target: 'alpha-main-mic', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-mic', sourceHandle: 'exec-out', target: 'alpha-main-stream', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-stream', sourceHandle: 'exec-out', target: 'alpha-main-sample', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-sample', sourceHandle: 'exec-out', target: 'alpha-main-fft', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-fft', sourceHandle: 'exec-out', target: 'alpha-main-collect-fft', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-collect-fft', sourceHandle: 'exec-out', target: 'alpha-main-collect-samples', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-collect-samples', sourceHandle: 'exec-out', target: 'alpha-main-window-full', targetHandle: 'exec-in' },
          // ② гейт: окно не полно → следующая итерация
          { kind: 'exec', source: 'alpha-main-window-full', sourceHandle: 'exec-false-out', target: 'alpha-main-infinity', targetHandle: 'exec-in' },
          // ②→③ окно полно → трек + детекторы
          { kind: 'exec', source: 'alpha-main-window-full', sourceHandle: 'exec-true-out', target: 'alpha-main-stop-rec', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-stop-rec', sourceHandle: 'exec-out', target: 'alpha-main-track', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-track', sourceHandle: 'exec-out', target: 'alpha-main-flush', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-flush', sourceHandle: 'exec-out', target: 'alpha-main-trends', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-trends', sourceHandle: 'exec-out', target: 'alpha-main-ensemble', targetHandle: 'exec-in' },
          // ④ слияние → решение
          { kind: 'exec', source: 'alpha-main-ensemble', sourceHandle: 'exec-out', target: 'alpha-main-fusion', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-fusion', sourceHandle: 'exec-out', target: 'alpha-main-branch', targetHandle: 'exec-in' },
          // ⑤ detected → combined-отчёт → async-детач
          { kind: 'exec', source: 'alpha-main-branch', sourceHandle: 'detected', target: 'alpha-main-report', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-report', sourceHandle: 'exec-out', target: 'alpha-main-seq', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-seq', sourceHandle: 'then-0', target: 'alpha-main-job-report', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-seq', sourceHandle: 'then-1', target: 'alpha-main-job-upload', targetHandle: 'exec-in' },
          { kind: 'event', source: 'alpha-main-on-report-built', sourceHandle: 'event-out', target: 'alpha-main-publish', targetHandle: 'exec-in' },
          // ⑥ рестарт записи: сходятся оба исхода решения
          { kind: 'exec', source: 'alpha-main-seq', sourceHandle: 'exec-out', target: 'alpha-main-restart-rec', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-branch', sourceHandle: 'not-detected', target: 'alpha-main-restart-rec', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-main-restart-rec', sourceHandle: 'exec-out', target: 'alpha-main-infinity', targetHandle: 'exec-in' },
          // data ① — окно наблюдения
          { kind: 'data', source: 'alpha-main-device', sourceHandle: 'device', target: 'alpha-main-mic', targetHandle: 'device', dataType: 'DeviceRef' },
          { kind: 'data', source: 'alpha-main-mic', sourceHandle: 'microphone', target: 'alpha-main-stream', targetHandle: 'microphone', dataType: 'MicrophoneRef' },
          { kind: 'data', source: 'alpha-main-stream', sourceHandle: 'stream', target: 'alpha-main-sample', targetHandle: 'stream', dataType: 'AudioStreamRef' },
          { kind: 'data', source: 'alpha-main-sample', sourceHandle: 'sample', target: 'alpha-main-fft', targetHandle: 'sample', dataType: 'AudioSampleRef' },
          { kind: 'data', source: 'alpha-main-fft', sourceHandle: 'frame', target: 'alpha-main-collect-fft', targetHandle: 'frame', dataType: 'FftFrameRef' },
          { kind: 'data', source: 'alpha-main-analyser', sourceHandle: 'analyser', target: 'alpha-main-collect-fft', targetHandle: 'analyser', dataType: 'SpectralAnalyserRef' },
          { kind: 'data', source: 'alpha-main-device', sourceHandle: 'device', target: 'alpha-main-analyser', targetHandle: 'device', dataType: 'DeviceRef' },
          { kind: 'data', source: 'alpha-main-sample', sourceHandle: 'sample', target: 'alpha-main-collect-samples', targetHandle: 'sample', dataType: 'AudioSampleRef' },
          { kind: 'data', source: 'alpha-main-recorder', sourceHandle: 'recorder', target: 'alpha-main-collect-samples', targetHandle: 'recorder', dataType: 'RecorderRef' },
          { kind: 'data', source: 'alpha-main-device', sourceHandle: 'device', target: 'alpha-main-recorder', targetHandle: 'device', dataType: 'DeviceRef' },
          // data ② — гейт
          { kind: 'data', source: 'alpha-main-recorder', sourceHandle: 'recorder', target: 'alpha-main-window-full', targetHandle: 'recorder', dataType: 'RecorderRef' },
          // data ③ — трек + детекторы
          { kind: 'data', source: 'alpha-main-recorder', sourceHandle: 'recorder', target: 'alpha-main-stop-rec', targetHandle: 'recorder', dataType: 'RecorderRef' },
          { kind: 'data', source: 'alpha-main-stop-rec', sourceHandle: 'slice', target: 'alpha-main-track', targetHandle: 'slice', dataType: 'RecordingSliceRef' },
          { kind: 'data', source: 'alpha-main-collect-samples', sourceHandle: 'batches', target: 'alpha-main-track', targetHandle: 'samples', dataType: 'AudioSampleRefList' },
          { kind: 'data', source: 'alpha-main-recorder', sourceHandle: 'recorder', target: 'alpha-main-track', targetHandle: 'recorder', dataType: 'RecorderRef' },
          { kind: 'data', source: 'alpha-main-analyser', sourceHandle: 'analyser', target: 'alpha-main-flush', targetHandle: 'analyser', dataType: 'SpectralAnalyserRef' },
          { kind: 'data', source: 'alpha-main-flush', sourceHandle: 'frames', target: 'alpha-main-trends', targetHandle: 'frames', dataType: 'FftFrameRefList' },
          { kind: 'data', source: 'alpha-main-analyser', sourceHandle: 'analyser', target: 'alpha-main-trends', targetHandle: 'analyser', dataType: 'SpectralAnalyserRef' },
          { kind: 'data', source: 'alpha-main-trends-policy', sourceHandle: 'policy', target: 'alpha-main-trends', targetHandle: 'policy', dataType: 'FftTrendsPolicy' },
          { kind: 'data', source: 'alpha-main-collect-samples', sourceHandle: 'batches', target: 'alpha-main-ensemble', targetHandle: 'samples', dataType: 'AudioSampleRefList' },
          // data ④ — слияние (2 детектора, вариадика fusion min)
          { kind: 'data', source: 'alpha-main-trends', sourceHandle: 'analysis', target: 'alpha-main-fusion', targetHandle: 'analysis-1', dataType: 'DetectionAnalysisRef' },
          { kind: 'data', source: 'alpha-main-ensemble', sourceHandle: 'analysis', target: 'alpha-main-fusion', targetHandle: 'analysis-2', dataType: 'DetectionAnalysisRef' },
          { kind: 'data', source: 'alpha-main-fusion', sourceHandle: 'fusion', target: 'alpha-main-branch', targetHandle: 'fusion', dataType: 'DetectionFusion' },
          // data ⑤ — единый отчёт (оба анализа + трек) и публикация
          { kind: 'data', source: 'alpha-main-var-journal', sourceHandle: 'value', target: 'alpha-main-reporter', targetHandle: 'journal', dataType: 'JournalRef' },
          { kind: 'data', source: 'alpha-main-reporter', sourceHandle: 'reporter', target: 'alpha-main-report', targetHandle: 'reporter', dataType: 'ReporterRef' },
          { kind: 'data', source: 'alpha-main-trends', sourceHandle: 'analysis', target: 'alpha-main-report', targetHandle: 'analysis-1', dataType: 'DetectionAnalysisRef' },
          { kind: 'data', source: 'alpha-main-ensemble', sourceHandle: 'analysis', target: 'alpha-main-report', targetHandle: 'analysis-2', dataType: 'DetectionAnalysisRef' },
          { kind: 'data', source: 'alpha-main-track', sourceHandle: 'track', target: 'alpha-main-report', targetHandle: 'track', dataType: 'TrackRef' },
          { kind: 'data', source: 'alpha-main-track', sourceHandle: 'track', target: 'alpha-main-job-upload', targetHandle: 'track', dataType: 'TrackRef' },
          { kind: 'data', source: 'alpha-main-job-report', sourceHandle: 'promise', target: 'alpha-main-on-report-built', targetHandle: 'promise', dataType: 'PromiseRef' },
          { kind: 'data', source: 'alpha-main-report', sourceHandle: 'report', target: 'alpha-main-publish', targetHandle: 'report', dataType: 'ReportRef' },
          { kind: 'data', source: 'alpha-main-var-journal-2', sourceHandle: 'value', target: 'alpha-main-publish', targetHandle: 'journal', dataType: 'JournalRef' },
          // data ⑥ — рестарт
          { kind: 'data', source: 'alpha-main-rec-policy', sourceHandle: 'policy', target: 'alpha-main-restart-rec', targetHandle: 'policy', dataType: 'RecordingPolicy' },
          { kind: 'data', source: 'alpha-main-recorder', sourceHandle: 'recorder', target: 'alpha-main-restart-rec', targetHandle: 'recorder', dataType: 'RecorderRef' },
          { kind: 'data', source: 'alpha-main-stream', sourceHandle: 'stream', target: 'alpha-main-restart-rec', targetHandle: 'stream', dataType: 'AudioStreamRef' },
        ],
      },
      // ── alarm: proximity → is-valid (false = lost = выход) → loop-repeat ─
      alarm: {
        entry: 'alarm-on-tick',
        nodes: [
          {
            id: 'alarm-on-tick',
            label: 'onTick',
            system: true,
            nodeKind: 'event',
            eventVariant: 'loopTick',
            blockKind: 'custom',
            position: { x: -320, y: -80 },
          },
          {
            // A3: mirror fusion из main (тот же id) — dataflow-only score-гейт.
            id: 'alpha-main-fusion',
            label: 'Fusion (из main)',
            nodeKind: 'make-detection-fusion',
            blockKind: 'custom',
            detectionFusionInputCount: 2,
            position: { x: -320, y: 160 },
          },
          {
            id: 'alpha-alarm-prox',
            label: 'MakeProximityTrend',
            nodeKind: 'make-proximity-trend',
            blockKind: 'custom',
            position: { x: 0, y: -80 },
          },
          {
            id: 'alpha-alarm-valid',
            label: 'isValid',
            nodeKind: 'is-valid',
            blockKind: 'custom',
            position: { x: 320, y: -80 },
          },
          {
            id: 'alpha-alarm-print-near',
            label: 'Цель рядом — слежение',
            nodeKind: 'print',
            blockKind: 'custom',
            position: { x: 640, y: -200 },
          },
          {
            id: 'alpha-alarm-print-lost',
            label: 'Дистанция потеряна — возврат в наблюдение',
            nodeKind: 'print',
            blockKind: 'custom',
            position: { x: 640, y: 80 },
          },
          {
            id: 'alpha-alarm-infinity',
            label: '∞',
            system: true,
            nodeKind: 'loop-repeat',
            blockKind: 'custom',
            position: { x: 960, y: -200 },
          },
        ],
        edges: [
          { kind: 'exec', source: 'alarm-on-tick', sourceHandle: 'exec-out', target: 'alpha-alarm-prox', targetHandle: 'exec-in' },
          { kind: 'data', source: 'alpha-main-fusion', sourceHandle: 'fusion', target: 'alpha-alarm-prox', targetHandle: 'fusion', dataType: 'DetectionFusion' },
          { kind: 'exec', source: 'alpha-alarm-prox', sourceHandle: 'exec-out', target: 'alpha-alarm-valid', targetHandle: 'exec-in' },
          { kind: 'data', source: 'alpha-alarm-prox', sourceHandle: 'proximity', target: 'alpha-alarm-valid', targetHandle: 'value', dataType: 'ProximityRef' },
          { kind: 'exec', source: 'alpha-alarm-valid', sourceHandle: 'exec-true-out', target: 'alpha-alarm-print-near', targetHandle: 'exec-in' },
          { kind: 'exec', source: 'alpha-alarm-print-near', sourceHandle: 'exec-out', target: 'alpha-alarm-infinity', targetHandle: 'exec-in' },
          // false = lost = выход: НЕ ведёт в loop-repeat (композиция брифа, A6).
          { kind: 'exec', source: 'alpha-alarm-valid', sourceHandle: 'exec-false-out', target: 'alpha-alarm-print-lost', targetHandle: 'exec-in' },
        ],
      },
    },
    triggers: {
      // ── onStop: гасим поток ───────────────────────────────────────────────
      onStop: {
        entry: 'on-stop-event',
        nodes: [
          {
            id: 'on-stop-event',
            label: 'On stop',
            system: true,
            nodeKind: 'event',
            eventVariant: 'handler',
            blockKind: 'custom',
            position: { x: -160, y: 0 },
          },
          {
            id: 'alpha-stop-mic',
            label: 'GetMicrophone',
            nodeKind: 'get-microphone',
            blockKind: 'custom',
            position: { x: 160, y: -40 },
          },
          {
            id: 'alpha-stop-streaming',
            label: 'StopStreaming',
            nodeKind: 'stop-streaming',
            blockKind: 'custom',
            position: { x: 480, y: -40 },
          },
        ],
        edges: [
          { kind: 'exec', source: 'on-stop-event', sourceHandle: 'exec-out', target: 'alpha-stop-mic', targetHandle: 'exec-in' },
          { kind: 'data', source: 'on-stop-event', sourceHandle: 'device', target: 'alpha-stop-mic', targetHandle: 'device', dataType: 'DeviceRef' },
          { kind: 'exec', source: 'alpha-stop-mic', sourceHandle: 'exec-out', target: 'alpha-stop-streaming', targetHandle: 'exec-in' },
          { kind: 'data', source: 'alpha-stop-mic', sourceHandle: 'microphone', target: 'alpha-stop-streaming', targetHandle: 'microphone', dataType: 'MicrophoneRef' },
        ],
      },
      // ── onDisconnect: журнал → локальный ─────────────────────────────────
      onDisconnect: {
        entry: 'on-disconnect-event',
        nodes: [
          {
            id: 'on-disconnect-event',
            label: 'On disconnect',
            system: true,
            nodeKind: 'event',
            eventVariant: 'handler',
            blockKind: 'custom',
            position: { x: -160, y: -80 },
          },
          {
            id: 'alpha-disc-journal',
            label: 'GetJournal (device)',
            nodeKind: 'get-journal',
            blockKind: 'custom',
            position: { x: 160, y: 100 },
          },
          {
            id: 'alpha-disc-set-journal',
            label: 'journal1',
            nodeKind: 'variable-set',
            variableId: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
            blockKind: 'custom',
            position: { x: 480, y: -80 },
          },
        ],
        edges: [
          { kind: 'exec', source: 'on-disconnect-event', sourceHandle: 'exec-out', target: 'alpha-disc-set-journal', targetHandle: 'exec-in' },
          { kind: 'data', source: 'on-disconnect-event', sourceHandle: 'device', target: 'alpha-disc-journal', targetHandle: 'device', dataType: 'DeviceRef' },
          { kind: 'data', source: 'alpha-disc-journal', sourceHandle: 'journal', target: 'alpha-disc-set-journal', targetHandle: 'value', dataType: 'JournalRef' },
        ],
      },
      custom: [],
    },
    functions: [],
    scheduled: [],
    commentGroups: [
      {
        id: 'g-alpha-init',
        branch: 'initial',
        title: 'Старт: микрофон → поток → запись 5 с',
        description: 'Bootstrap: включаем микрофон и поток, запускаем rolling-запись (5 с WAV).',
        rect: { x: -1320, y: -140, width: 1250, height: 420 },
        nodeIds: [
          'alpha-init-mic',
          'alpha-init-stream',
          'alpha-init-recorder',
          'alpha-init-rec-policy',
          'alpha-init-start-rec',
        ],
        frameColor: { preset: 'accent' },
      },
      {
        id: 'g-alpha-journal',
        branch: 'onConnect',
        title: 'Журнал: сервер или локально',
        description: 'Сервер доступен → серверный журнал, иначе журнал устройства.',
        rect: { x: 200, y: -220, width: 700, height: 660 },
        nodeIds: [
          'alpha-conn-server-valid',
          'alpha-conn-journal-server',
          'alpha-conn-set-journal-server',
          'alpha-conn-journal-device',
          'alpha-conn-set-journal-device',
        ],
        frameColor: { preset: 'accent' },
      },
      {
        id: 'g-alpha-act1',
        branch: 'main',
        title: '① Окно наблюдения (3 с)',
        description: 'Каждый тик: сэмпл и FFT-кадр уходят в накопители окна.',
        rect: { x: -2280, y: -730, width: 1990, height: 190 },
        nodeIds: [
          'alpha-main-mic',
          'alpha-main-stream',
          'alpha-main-sample',
          'alpha-main-fft',
          'alpha-main-collect-fft',
          'alpha-main-collect-samples',
        ],
        frameColor: { preset: 'warning' },
      },
      {
        id: 'g-alpha-act2',
        branch: 'main',
        title: '② Гейт записи 5 с',
        description: 'Окно записи не полно → копим дальше (∞); полно → детекция.',
        rect: { x: -360, y: -730, width: 340, height: 200 },
        nodeIds: ['alpha-main-window-full'],
        frameColor: { preset: 'warning' },
      },
      {
        id: 'g-alpha-act3',
        branch: 'main',
        title: '③ Трек + два детектора',
        description:
          'Останавливаем запись → трек-доказательство; окно слушают два независимых детектора: trends-FFT и DSP-ансамбль.',
        rect: { x: -40, y: -730, width: 1560, height: 450 },
        nodeIds: [
          'alpha-main-stop-rec',
          'alpha-main-track',
          'alpha-main-flush',
          'alpha-main-trends',
          'alpha-main-trends-policy',
          'alpha-main-ensemble',
        ],
        frameColor: { preset: 'accent' },
      },
      {
        id: 'g-alpha-act4',
        branch: 'main',
        title: '④ Слияние и решение',
        description: 'Fusion усредняет согласие детекторов → combinedScore ≥ 0.55 = детекция.',
        rect: { x: 1560, y: -730, width: 660, height: 200 },
        nodeIds: ['alpha-main-fusion', 'alpha-main-branch'],
        frameColor: { preset: 'accent' },
      },
      {
        id: 'g-alpha-act5',
        branch: 'main',
        title: '⑤ Combined-отчёт + async',
        description:
          'Единый отчёт (оба детектора + трек) один раз на детекцию; упаковка (report-build) и выгрузка трека — detached jobs, магистраль не ждёт.',
        rect: { x: 1560, y: -1370, width: 2290, height: 680 },
        nodeIds: [
          'alpha-main-var-journal',
          'alpha-main-reporter',
          'alpha-main-report',
          'alpha-main-seq',
          'alpha-main-job-report',
          'alpha-main-on-report-built',
          'alpha-main-publish',
          'alpha-main-var-journal-2',
          'alpha-main-job-upload',
        ],
        frameColor: { preset: 'secondary' },
      },
      {
        id: 'g-alpha-act6',
        branch: 'main',
        title: '⑥ Перезапуск записи',
        description: 'Оба исхода решения сходятся сюда: новое окно записи → ∞.',
        rect: { x: 2520, y: -560, width: 680, height: 270 },
        nodeIds: ['alpha-main-rec-policy', 'alpha-main-restart-rec'],
        frameColor: { preset: 'accent' },
      },
      {
        id: 'g-alpha-alarm',
        branch: 'alarm',
        title: 'Слежение за дистанцией: lost = выход',
        description:
          'Проксимити-тренд по score-гейту из main; ref невалиден (lost) → false-ветка isValid обрывает луп.',
        rect: { x: -360, y: -250, width: 1130, height: 490 },
        nodeIds: [
          'alpha-main-fusion',
          'alpha-alarm-prox',
          'alpha-alarm-valid',
          'alpha-alarm-print-near',
          'alpha-alarm-print-lost',
        ],
        frameColor: { preset: 'warning' },
      },
    ],
    variables: [
      {
        id: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
        name: 'journal1',
        type: 'JournalRef',
        value: null,
      },
    ],
  },
};

let cachedDocument: DeviceScenarioDocument | null = null;

/** Разбирает embedded документ Team Alpha (fail-fast при рассинхроне контрактов). */
export function resolveDetectionAlarmAlphaDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(USERCASE_DETECTION_ALARM_ALPHA_DOCUMENT);
  if (!parsed.ok) {
    throw new Error(`usercase-detection-alarm-alpha document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}

/** Полный `device-scenario` UserCase Team Alpha для каталога / apply. */
export function getDetectionAlarmAlphaDocument(): DeviceScenarioDocument {
  return resolveDetectionAlarmAlphaDocument();
}
