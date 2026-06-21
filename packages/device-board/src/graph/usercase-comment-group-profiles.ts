import type { ScenarioCommentGroup } from '@membrana/core';

/** Spec для semantic comment frame на main (U9 L1 + competition profiles). */
export interface MainCommentGroupSpec {
  readonly id: string;
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
      description: 'Gate: bootstrap → window full → MakeTrack → upload',
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
      id: 'ucg-alpha-main-trends',
      title: 'Акт II · Наблюдение',
      description: 'FFT, классификация, отчёт trends-fft/v0.1',
      frameColor: { preset: 'info' },
      functionIds: ['fn-alpha-observation-tick'],
      nodeKinds: [
        'get-spectral-analyser',
        'collect-fft-frames',
        'get-fft-frame',
        'get-sample',
      ],
    },
    {
      id: 'ucg-alpha-main-journal',
      title: 'Акт II · Журнал',
      description: 'Reporter и публикация на сервер',
      frameColor: { preset: 'accent' },
      nodeKinds: ['get-journal', 'get-reporter'],
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
      nodeKinds: [
        'get-sample',
        'get-fft-frame',
        'get-spectral-analyser',
        'collect-fft-frames',
        'flush-spectral-analyser',
        'make-fft-trends-analysis',
        'make-report-from-analysis',
        'publish-report',
      ],
    },
    {
      id: 'ucg-beta-fn-policy',
      title: 'Journal refs',
      description: 'GetJournal / GetReporter wiring',
      frameColor: { preset: 'neutral' },
      nodeKinds: ['get-journal', 'get-reporter'],
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
      description: 'DRONE_TIGHT и каталог шаблонов',
      frameColor: { preset: 'info' },
      functionIds: ['fn-gamma-trends-publish'],
    },
    {
      id: 'ucg-gamma-05-journal',
      title: '⑤ Отчёт на сервер',
      description: 'Track + trends-fft/v0.1',
      frameColor: { preset: 'accent' },
      nodeKinds: ['get-journal'],
    },
  ],
};
