import type { ScenarioCommentGroup, ScenarioCommentGroupBranch } from '@membrana/core';

/** Spec для semantic comment frame (U9 L1 + competition profiles). */
export interface MainCommentGroupSpec {
  readonly id: string;
  readonly branch?: ScenarioCommentGroupBranch;
  readonly title: string;
  readonly description?: string;
  readonly frameColor: ScenarioCommentGroup['frameColor'];
  readonly nodeKinds?: readonly string[];
  /** Subgraph blocks (`blockKind: subgraph`) по functionId. */
  readonly functionIds?: readonly string[];
}

/** Semantic frames для MVP main (U9 L1). */
export const MVP_MAIN_COMMENT_GROUP_SPECS: readonly MainCommentGroupSpec[] = [
  {
    id: 'ucg-main-policy',
    title: 'Policy constructors',
    description: 'MakeRecordingPolicy и MakeFftTrendsPolicy',
    frameColor: { preset: 'primary' },
    nodeKinds: ['make-recording-policy', 'make-fft-trends-policy'],
  },
  {
    id: 'ucg-main-recording-gate',
    title: 'Recording gate',
    description: 'Start/stop recording, window gate, MakeTrack',
    frameColor: { preset: 'warning' },
    nodeKinds: [
      'start-recording',
      'stop-recording',
      'is-recording-window-full',
      'make-track',
      'get-recorder',
    ],
  },
  {
    id: 'ucg-main-trends-fft',
    title: 'Trends FFT',
    description: 'Spectral analyser, FFT frames, analysis',
    frameColor: { preset: 'info' },
    nodeKinds: [
      'get-spectral-analyser',
      'collect-fft-frames',
      'flush-spectral-analyser',
      'get-fft-frame',
      'get-sample',
      'make-fft-trends-analysis',
    ],
  },
  {
    id: 'ucg-main-journal',
    title: 'Journal',
    description: 'Reporter, track report, publish',
    frameColor: { preset: 'accent' },
    nodeKinds: [
      'get-journal',
      'get-reporter',
      'make-report-from-track',
      'make-report-from-analysis',
      'publish-report',
    ],
  },
];

export type UserCaseCommentGroupProfileId = 'mvp' | 'alpha' | 'beta' | 'gamma';

export const USERCASE_COMMENT_GROUP_PROFILES: Readonly<
  Record<UserCaseCommentGroupProfileId, readonly MainCommentGroupSpec[]>
> = {
  mvp: MVP_MAIN_COMMENT_GROUP_SPECS,
  alpha: [
    {
      id: 'ucg-alpha-main-policy',
      title: 'Акт II · Политики',
      description: 'Окно записи 5 s WAV и шаблоны FFT trends (48 kHz stream)',
      frameColor: { preset: 'primary' },
      nodeKinds: ['make-recording-policy', 'make-fft-trends-policy'],
    },
    {
      id: 'ucg-alpha-main-gate',
      title: 'Акт II · Окно записи',
      description: 'Latent Sequence gate: bootstrap → window full → MakeTrack',
      frameColor: { preset: 'warning' },
      functionIds: ['fn-alpha-recording-gate'],
      nodeKinds: [
        'sequence',
        'start-recording',
        'stop-recording',
        'is-recording-window-full',
        'make-track',
      ],
    },
    {
      id: 'ucg-alpha-main-trends',
      title: 'Акт II · Наблюдение',
      description: 'FFT, классификация, отчёт trends-fft/v0.1',
      frameColor: { preset: 'info' },
      functionIds: ['fn-alpha-observation-tick'],
    },
    {
      id: 'ucg-alpha-main-journal',
      title: 'Акт II · Журнал',
      description: 'Reporter и публикация на сервер',
      frameColor: { preset: 'accent' },
      nodeKinds: ['get-journal', 'get-reporter'],
    },
    {
      id: 'ucg-alpha-async-iib-upload',
      title: 'Акт IIb · Отправка в фоне',
      description: 'StartAsyncJob track-upload — не блокирует main tick',
      frameColor: { preset: 'warning' },
      nodeKinds: ['start-async-job'],
    },
    {
      id: 'ucg-alpha-async-iib-detached',
      title: 'Акт IIb · Отчёт дрон',
      description: 'Detached on-async-resolved → MakeReportFromTrack → PublishReport',
      frameColor: { preset: 'accent' },
      nodeKinds: ['on-async-resolved', 'make-report-from-track', 'publish-report'],
    },
  ],
  beta: [
    {
      id: 'ucg-beta-main-orchestrator',
      title: 'Orchestrator spine',
      description: 'Main tick → policy → functions → ∞',
      frameColor: { preset: 'primary' },
      nodeKinds: [
        'make-recording-policy',
        'make-fft-trends-policy',
        'get-audio-stream',
        'get-microphone',
        'device-global',
      ],
    },
    {
      id: 'ucg-beta-fn-gate',
      title: 'Function: recording gate',
      description: '5 s window, MakeTrack, restart recording',
      frameColor: { preset: 'warning' },
      functionIds: ['fn-beta-recording-gate'],
      nodeKinds: ['start-recording', 'stop-recording', 'is-recording-window-full', 'make-track'],
    },
    {
      id: 'ucg-beta-fn-trends',
      title: 'Function: trends publish',
      description: 'Spectral → FFT → classify → PublishReport',
      frameColor: { preset: 'info' },
      functionIds: ['fn-beta-trends-publish'],
      nodeKinds: ['get-sample', 'get-fft-frame', 'get-spectral-analyser', 'collect-fft-frames'],
    },
    {
      id: 'ucg-beta-fn-policy',
      title: 'Function: policy build',
      description: 'MakeRecordingPolicy + MakeFftTrendsPolicy',
      frameColor: { preset: 'neutral' },
      nodeKinds: ['make-recording-policy', 'make-fft-trends-policy'],
    },
    {
      id: 'ucg-beta-async-upload',
      title: '⑤ Отправка в фоне',
      description: 'StartAsyncJob track-upload — не блокирует main tick',
      frameColor: { preset: 'info' },
      functionIds: ['fn-beta-async-upload-pipeline'],
      nodeKinds: ['sequence'],
    },
    {
      id: 'ucg-beta-async-detached',
      title: '⑥ Отчёт дрон (detached)',
      description: 'Detached on-async-resolved → MakeReportFromTrack → PublishReport',
      frameColor: { preset: 'accent' },
      functionIds: ['fn-beta-async-upload-pipeline'],
    },
  ],
  gamma: [
    {
      id: 'ucg-gamma-01-policy',
      title: '① Политики записи и FFT',
      description: 'Задают длительность окна и шаблоны trends',
      frameColor: { preset: 'primary' },
      nodeKinds: ['make-recording-policy', 'make-fft-trends-policy'],
    },
    {
      id: 'ucg-gamma-02-gate',
      title: '② Окно записи',
      description: '5 s WAV при заполнении буфера',
      frameColor: { preset: 'warning' },
      functionIds: ['fn-gamma-recording-gate'],
    },
    {
      id: 'ucg-gamma-03-fft',
      title: '③ Спектр и накопление',
      description: 'Кадры FFT для классификации',
      frameColor: { preset: 'info' },
      nodeKinds: ['get-sample', 'get-fft-frame', 'get-spectral-analyser', 'collect-fft-frames'],
    },
    {
      id: 'ucg-gamma-04-trends',
      title: '④ Классификация',
      description: 'DRONE_TIGHT, журнал и каталог шаблонов',
      frameColor: { preset: 'info' },
      functionIds: ['fn-gamma-trends-publish'],
      nodeKinds: ['get-journal'],
    },
    {
      id: 'ucg-gamma-05-async-upload',
      title: '⑤ Отправка в фоне',
      description: 'StartAsyncJob — upload не блокирует tick',
      frameColor: { preset: 'info' },
      functionIds: ['fn-gamma-async-live-bundle'],
      nodeKinds: ['sequence'],
    },
    {
      id: 'ucg-gamma-06-async-detached',
      title: '⑥ Отчёт дрон (detached)',
      description: 'on-async-resolved → publish',
      frameColor: { preset: 'accent' },
      nodeKinds: ['on-async-resolved', 'make-report-from-track', 'publish-report'],
    },
  ],
};

/** Comment frames на initial / onConnect (competition Act I / Подготовка). */
export interface AuxiliaryCommentGroupProfile {
  readonly onConnect?: readonly MainCommentGroupSpec[];
  readonly initial?: readonly MainCommentGroupSpec[];
}

export const USERCASE_AUXILIARY_COMMENT_GROUP_PROFILES: Readonly<
  Partial<Record<UserCaseCommentGroupProfileId, AuxiliaryCommentGroupProfile>>
> = {
  alpha: {
    onConnect: [
      {
        id: 'ucg-alpha-onconnect',
        branch: 'onConnect',
        title: 'Акт I · Подключение',
        description: 'Server → journal1 ref (48 kHz stream готовится на initial)',
        frameColor: { preset: 'primary' },
        nodeKinds: ['get-journal', 'variable-set', 'is-valid'],
        functionIds: ['fn-alpha-bootstrap'],
      },
    ],
    initial: [
      {
        id: 'ucg-alpha-initial',
        branch: 'initial',
        title: 'Акт I · Старт',
        description: 'GetMicrophone → StartStreaming → journal bootstrap',
        frameColor: { preset: 'primary' },
        nodeKinds: ['get-microphone', 'start-streaming', 'print', 'get-journal', 'variable-set'],
      },
    ],
  },
  gamma: {
    onConnect: [
      {
        id: 'ucg-gamma-onconnect',
        branch: 'onConnect',
        title: 'Подготовка · onConnect',
        description: 'Привязка journal1 к устройству',
        frameColor: { preset: 'neutral' },
        nodeKinds: ['get-journal', 'variable-set', 'is-valid'],
      },
    ],
    initial: [
      {
        id: 'ucg-gamma-initial',
        branch: 'initial',
        title: 'Подготовка · onStart',
        description: 'Микрофон и поток перед main loop',
        frameColor: { preset: 'neutral' },
        nodeKinds: ['get-microphone', 'start-streaming', 'print'],
      },
    ],
  },
};
