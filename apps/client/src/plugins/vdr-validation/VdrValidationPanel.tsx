import { useMembranaStore } from '@membrana/agenda';

import { analyzeVdrFile, parseVdrManifest, sampleIdFromFileName } from './analyzeVdrAudio';
import {
  getVdrLiveController,
  useVdrValidationSnapshot,
  vdrValidationState,
} from './vdrValidationState';
import { VDR_VALIDATION_PLUGIN_ID, type VdrTruthLabel } from './types';

function truthBadge(truth: VdrTruthLabel) {
  if (truth === 'drone') return <span className="badge badge-warning badge-sm">Дрон</span>;
  if (truth === 'not-drone') return <span className="badge badge-ghost badge-sm">Не дрон</span>;
  return <span className="badge badge-neutral badge-sm">Не размечено</span>;
}

function predBadge(isDrone: boolean) {
  return isDrone ? (
    <span className="badge badge-warning badge-sm">Дрон</span>
  ) : (
    <span className="badge badge-ghost badge-sm">Не дрон</span>
  );
}

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`;
}

async function runCorpus(files: FileList): Promise<void> {
  const snapshot = vdrValidationState.getSnapshot();
  const truthById = new Map(snapshot.manifestSamples.map((s) => [s.id, s.label]));
  const wavFiles = [...files].filter((f) => /\.wav$/i.test(f.name));
  vdrValidationState.beginRun(wavFiles.length);
  for (const file of wavFiles) {
    const id = sampleIdFromFileName(file.name);
    const truth = truthById.get(id) ?? 'unlabeled';
    try {
      const verdict = await analyzeVdrFile(file);
      vdrValidationState.pushRow({
        id,
        fileName: file.name,
        truth,
        predIsDrone: verdict.isDrone,
        confidence: verdict.confidence,
        templateId: verdict.templateId,
        match: truth === 'unlabeled' ? null : verdict.isDrone === (truth === 'drone'),
        error: null,
      });
    } catch (e) {
      vdrValidationState.pushRow({
        id,
        fileName: file.name,
        truth,
        predIsDrone: false,
        confidence: 0,
        templateId: null,
        match: null,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  vdrValidationState.finishRun();
}

async function loadManifest(file: File): Promise<void> {
  try {
    const samples = parseVdrManifest(JSON.parse(await file.text()));
    vdrValidationState.setManifest(file.name, samples);
  } catch (e) {
    vdrValidationState.failRun(e instanceof Error ? e.message : String(e));
  }
}

/**
 * Панель «VDR-валидация» (vdr-hg2): продуктовая поверхность эксперимента
 * hard-gate — манифест + WAV пилотного корпуса → pred-vs-truth → P/R/F1
 * и вердикт gate; live-окно trends 5 с (требование владельца 2026-07-03).
 */
export function VdrValidationPanel({ moduleId }: { readonly moduleId: string }) {
  const snapshot = useVdrValidationSnapshot();
  const pluginActive = useMembranaStore(
    (s) => s.getPlugin(moduleId, VDR_VALIDATION_PLUGIN_ID)?.active === true,
  );
  if (!pluginActive) return null;

  const gateBadge =
    snapshot.metrics?.gate === 'hard' ? (
      <span className="badge badge-success">Hard-gate ≥85% — пройден</span>
    ) : snapshot.metrics?.gate === 'soft' ? (
      <span className="badge badge-info">Мягкий gate 80–85%</span>
    ) : snapshot.metrics?.gate === 'fail' ? (
      <span className="badge badge-error">&lt;80% — team-разбор</span>
    ) : null;

  return (
    <section className="card bg-base-200" aria-label="VDR-валидация">
      <div className="card-body gap-3 p-4">
        <h3 className="card-title text-sm">VDR-валидация (пилот hard-gate)</h3>

        <div className="flex flex-wrap items-end gap-3">
          <label className="form-control">
            <span className="label-text text-xs">manifest.json пилота</span>
            <input
              type="file"
              accept="application/json,.json"
              className="file-input file-input-bordered file-input-xs"
              aria-label="Загрузить манифест пилотного корпуса"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadManifest(file);
              }}
            />
          </label>
          <label className="form-control">
            <span className="label-text text-xs">WAV-файлы корпуса</span>
            <input
              type="file"
              accept="audio/wav,.wav"
              multiple
              className="file-input file-input-bordered file-input-xs"
              aria-label="Выбрать WAV-файлы пилотного корпуса и запустить прогон"
              disabled={snapshot.running}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) void runCorpus(e.target.files);
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-xs btn-outline"
            disabled={snapshot.liveCollecting || snapshot.running}
            title="Собрать 5 секунд с микрофона и получить trends-вердикт"
            onClick={() => getVdrLiveController()?.startLiveWindow()}
          >
            {snapshot.liveCollecting ? 'Слушаю 5 с…' : 'Live-окно 5 с'}
          </button>
        </div>

        {snapshot.manifestName ? (
          <p className="text-xs text-base-content/60">
            Манифест: {snapshot.manifestName} · сэмплов {snapshot.manifestSamples.length}
          </p>
        ) : (
          <p className="text-xs text-base-content/60">
            Истина берётся из manifest.json (метки оператора, DATASET_CURATION §«Пилот hard-gate»);
            без манифеста строки идут как «не размечено».
          </p>
        )}

        {snapshot.error ? (
          <div className="alert alert-error py-2 text-xs" role="alert">
            <span>{snapshot.error}</span>
          </div>
        ) : null}

        {snapshot.running ? (
          <progress
            className="progress progress-info"
            value={snapshot.progressDone}
            max={snapshot.progressTotal}
            aria-label={`Прогон корпуса: ${snapshot.progressDone} из ${snapshot.progressTotal}`}
          />
        ) : null}

        {snapshot.liveVerdict ? (
          <p className="text-xs" role="status" aria-live="polite">
            Live: {snapshot.liveVerdict.isDrone ? 'Дрон' : 'Не дрон'} · confidence{' '}
            {(snapshot.liveVerdict.confidence * 100).toFixed(0)}%
            {snapshot.liveVerdict.templateId ? ` · ${snapshot.liveVerdict.templateId}` : ''}
          </p>
        ) : null}

        {snapshot.metrics ? (
          <div className="flex flex-wrap items-center gap-2 text-xs" role="status" aria-live="polite">
            {gateBadge}
            <span className="font-mono tabular-nums">
              P {percent(snapshot.metrics.precision)} · R {percent(snapshot.metrics.recall)} · F1{' '}
              {percent(snapshot.metrics.f1)} · acc {percent(snapshot.metrics.accuracy)}
            </span>
            <span className="text-base-content/60">
              сравнено {snapshot.metrics.compared}
              {snapshot.metrics.unlabeled > 0 ? ` · без метки ${snapshot.metrics.unlabeled}` : ''}
            </span>
          </div>
        ) : null}

        {snapshot.rows.length > 0 ? (
          <div className="max-h-72 overflow-x-auto overflow-y-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Сэмпл</th>
                  <th>Истина</th>
                  <th>Вердикт</th>
                  <th className="text-right">Conf.</th>
                  <th>Совпадение</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map((row) => (
                  <tr key={row.id} className={row.match === false ? 'bg-error/10' : undefined}>
                    <td className="font-mono text-xs">{row.id}</td>
                    <td>{truthBadge(row.truth)}</td>
                    <td>{row.error ? <span className="text-error">{row.error}</span> : predBadge(row.predIsDrone)}</td>
                    <td className="text-right font-mono tabular-nums">
                      {row.error ? '—' : `${(row.confidence * 100).toFixed(0)}%`}
                    </td>
                    <td aria-label={row.match === null ? 'вне метрик' : row.match ? 'совпало' : 'ошибка'}>
                      {row.match === null ? '·' : row.match ? '✓' : '✗'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
