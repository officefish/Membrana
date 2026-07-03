import React, { Fragment, useCallback, useEffect, useState } from 'react';
import { ModuleProps, useMembranaStore } from '@membrana/agenda';
import { useShallow } from 'zustand/react/shallow';
import {
  BUFFER_COLLECTION_ID,
  TARIFF_DATASET_SYSTEM_KEY,
  isQuotaFull,
  useMediaLibrary,
  type Collection,
  type MediaSample,
  type SampleLabel,
  type UpdateSampleLabelNotes,
} from '@membrana/media-library-service';

import { SampleLabelEditor, SampleNotesEditor } from '../components/sample-library/SampleLabelNotesEditor';
import { MediaLibraryQuotaBanner } from '../components/MediaLibraryQuotaBanner';
import { SamplePlaybackBar } from '../components/sample-playback/SamplePlaybackBar';
import { downloadBlob, extensionFromMime } from '../lib/downloadBlob';
import { requestClearMediaLibraryBuffer } from '../lib/mediaLibraryHubBridge';
import { useRemoteMutation } from '../lib/useRemoteMutation';
import {
  bindSamplePlaybackBlobReader,
  disposeSamplePlayback,
  selectSample,
  togglePlayPause,
  useSamplePlayback,
} from '@membrana/sample-playback-service';
import {
  SAMPLE_LIBRARY_PLAYER_PLUGIN_ID,
  SampleLibraryPlayerPanel,
} from '../plugins/sample-library-player';
import {
  SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID,
  SampleLibraryDroneAnalysisPanel,
} from '../plugins/sample-library-drone-analysis';
import {
  SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID,
  SampleLibraryFftThresholdTestPanel,
} from '../plugins/sample-library-fft-threshold-test';
import {
  TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
  TrendsFftSampleAnalyzerPanel,
} from '../plugins/trends-fft-sample-analyzer';

const CLASS_OPTIONS = [
  'drone-multirotor',
  'bird',
  'wind',
  'traffic',
  'human-speech',
  'silence',
  'unlabeled',
] as const;

export interface SampleLibraryConfig {
  defaultImportClass: (typeof CLASS_OPTIONS)[number];
}

/** NB3 (vdr-label-roundtrip): фильтр таблицы по метке — порт HG1-UX из кабинета. */
const LABEL_FILTER_OPTIONS: ReadonlyArray<{ value: 'all' | SampleLabel; title: string }> = [
  { value: 'all', title: 'Все' },
  { value: 'drone', title: 'Дрон' },
  { value: 'not-drone', title: 'Не дрон' },
  { value: 'unlabeled', title: 'Неразмеченные' },
];

export const SampleLibraryModule: React.FC<ModuleProps<SampleLibraryConfig>> = ({
  module,
}) => {
  const config = module.config as SampleLibraryConfig;
  const { snapshot, service } = useMediaLibrary();
  const playback = useSamplePlayback();
  const activePluginIds = useMembranaStore(
    useShallow((state) => state.getModule(module.id)?.activePlugins ?? []),
  );
  const [selectedId, setSelectedId] = useState<string>(BUFFER_COLLECTION_ID);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [labelSavingId, setLabelSavingId] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState<'all' | SampleLabel>('all');
  const { busy: clearingBuffer, run: runRemoteMutation } = useRemoteMutation();

  useEffect(() => {
    bindSamplePlaybackBlobReader((sampleId: string) => service.getSampleBlob(sampleId));
    return () => {
      void disposeSamplePlayback();
    };
  }, [service]);

  const samples = snapshot.samplesByCollection[selectedId] ?? [];
  const selected = snapshot.collections.find((c) => c.id === selectedId);
  // NB3: фильтр по метке + прогресс разметки (HG1-UX).
  const filteredSamples =
    labelFilter === 'all' ? samples : samples.filter((s) => s.label === labelFilter);
  const labeledCount = samples.filter((s) => s.label !== 'unlabeled').length;
  const quotaBlocked = isQuotaFull(snapshot.quota);
  const isTariffDataset =
    selected?.kind === 'system' && selected.systemKey === TARIFF_DATASET_SYSTEM_KEY;
  const canLabelAnnotate = !isTariffDataset;

  const handleUpdateLabelNotes = useCallback(
    async (sampleId: string, patch: UpdateSampleLabelNotes) => {
      setError(null);
      setLabelSavingId(sampleId);
      try {
        await service.updateSampleLabelNotes(sampleId, patch);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLabelSavingId(null);
      }
    },
    [service],
  );

  const moveTargets = snapshot.collections.filter(
    (c) => c.id !== selectedId && c.kind !== 'buffer' && c.kind !== 'system',
  );

  const handleCreateCollection = useCallback(async () => {
    setError(null);
    try {
      const col = await service.createUserCollection(newCollectionName);
      setNewCollectionName('');
      setSelectedId(col.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [newCollectionName, service]);

  const handleDeleteCollection = useCallback(async () => {
    if (!selected || selected.kind !== 'user') return;
    setError(null);
    try {
      await service.deleteUserCollection(selected.id);
      setSelectedId(BUFFER_COLLECTION_ID);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selected, service]);

  const handleImport = useCallback(
    async (files: readonly File[]) => {
      if (!selected) return;
      setError(null);
      try {
        // Последовательно: квота/refresh не гоняются параллельно (NB1: multi-select
        // для импорта корпуса, например 33 WAV пилота hard-gate).
        for (const file of files) {
          await service.importBlob(selected.id, file, {
            title: file.name,
            class: config.defaultImportClass || 'unlabeled',
            label: 'unlabeled',
            source: 'disk-import',
            durationSec: 0,
            sampleRate: 48000,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [config.defaultImportClass, selected, service],
  );

  /**
   * NB1 (vdr-label-roundtrip): экспорт меток коллекции в JSON — вход для
   * `yarn vdr:labels-merge` (перенос операторской истины в манифест корпуса,
   * например data/detectors-benchmark/vdr-hard-gate-pilot/manifest.json).
   */
  const handleExportLabels = useCallback(() => {
    if (!selected) return;
    const payload = {
      collection: selected.name,
      collectionId: selected.id,
      exportedAt: new Date().toISOString(),
      labels: samples.map((s) => ({
        fileName: s.title,
        label: s.label,
        notes: s.notes ?? null,
      })),
    };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: 'application/json',
    });
    const safeName = selected.name.toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-');
    downloadBlob(blob, `${safeName || 'collection'}-labels.json`);
  }, [samples, selected]);

  const handleRemove = useCallback(
    async (sampleId: string) => {
      setError(null);
      try {
        await service.removeSample(sampleId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [service],
  );

  const handleMove = useCallback(
    async (sampleId: string, toId: string) => {
      if (!toId) return;
      setError(null);
      try {
        await service.moveSample(sampleId, toId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [service],
  );

  const handleClearBuffer = useCallback(async () => {
    if (snapshot.quota.backend === 'server' && !snapshot.quota.serverReachable) {
      setError('Media-server недоступен — очистка буфера невозможна.');
      return;
    }
    if (!window.confirm('Очистить буфер __buffer__? Сэмплы будут удалены без восстановления.')) {
      return;
    }
    setError(null);
    try {
      await runRemoteMutation('Очистка буфера', async () => {
        await requestClearMediaLibraryBuffer();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [runRemoteMutation, snapshot.quota.backend, snapshot.quota.serverReachable]);

  const handleSelectSample = useCallback(async (sample: MediaSample) => {
    setError(null);
    try {
      await selectSample(sample);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleExportSample = useCallback(
    async (sample: MediaSample) => {
      setError(null);
      try {
        const blob = await service.getSampleBlob(sample.id);
        const ext = extensionFromMime(blob.type);
        downloadBlob(blob, `${sample.title}.${ext}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [service],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-2">
      {activePluginIds.includes(SAMPLE_LIBRARY_PLAYER_PLUGIN_ID) ? (
        <SampleLibraryPlayerPanel moduleId={module.id} />
      ) : null}

      {activePluginIds.includes(SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID) ? (
        <SampleLibraryDroneAnalysisPanel moduleId={module.id} />
      ) : null}

      {activePluginIds.includes(SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID) ? (
        <SampleLibraryFftThresholdTestPanel moduleId={module.id} />
      ) : null}

      {activePluginIds.includes(TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID) ? (
        <TrendsFftSampleAnalyzerPanel moduleId={module.id} />
      ) : null}

      <MediaLibraryQuotaBanner quota={snapshot.quota} />

      {error ? (
        <div className="alert alert-error text-sm" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="flex w-52 shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border border-base-300 bg-base-200/40 p-2">
          <span className="text-[10px] uppercase tracking-wide text-base-content/50">
            Коллекции
          </span>
          {snapshot.collections.map((col: Collection) => (
            <button
              key={col.id}
              type="button"
              className={`btn btn-sm justify-start truncate ${
                col.id === selectedId ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => setSelectedId(col.id)}
            >
              {col.name}
              <span className="ml-auto tabular-nums opacity-70">
                {(snapshot.samplesByCollection[col.id] ?? []).length}
              </span>
            </button>
          ))}

          <div className="divider my-0" />

          <div className="flex flex-col gap-1">
            <input
              type="text"
              className="input input-bordered input-sm"
              placeholder="Новая коллекция"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={!newCollectionName.trim()}
              onClick={() => void handleCreateCollection()}
            >
              Создать
            </button>
          </div>

          {selected?.kind === 'user' ? (
            <button
              type="button"
              className="btn btn-sm btn-error btn-outline"
              onClick={() => void handleDeleteCollection()}
            >
              Удалить коллекцию
            </button>
          ) : null}

          {selectedId === BUFFER_COLLECTION_ID ? (
            <button
              type="button"
              className="btn btn-sm btn-error btn-outline"
              disabled={
                clearingBuffer ||
                (snapshot.quota.backend === 'server' && !snapshot.quota.serverReachable)
              }
              onClick={() => void handleClearBuffer()}
            >
              {clearingBuffer ? 'Очистка…' : 'Очистить буфер'}
            </button>
          ) : null}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{selected?.name ?? '—'}</h2>
            {selected?.kind === 'system' ? (
              <span className="badge badge-neutral badge-sm">системный датасет</span>
            ) : null}
            {!isTariffDataset ? (
            <label
              className={`btn btn-sm btn-primary ml-auto cursor-pointer ${
                quotaBlocked ? 'btn-disabled pointer-events-none opacity-50' : ''
              }`}
              title={
                quotaBlocked
                  ? 'Квота исчерпана — удалите сэмплы или подключите media-server'
                  : undefined
              }
            >
              Импорт WAV
              <input
                type="file"
                accept="audio/*,.wav"
                multiple
                className="hidden"
                disabled={quotaBlocked}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length > 0) void handleImport(files);
                  e.target.value = '';
                }}
              />
            </label>
            ) : (
              <span className="ml-auto text-sm text-base-content/60">Только чтение</span>
            )}
            {canLabelAnnotate && samples.length > 0 ? (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleExportLabels}
              >
                Экспорт меток (JSON)
              </button>
            ) : null}
          </div>

          {canLabelAnnotate && samples.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="join" role="group" aria-label="Фильтр по метке">
                {LABEL_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`btn btn-xs join-item ${
                      labelFilter === option.value ? 'btn-primary' : 'btn-ghost'
                    }`}
                    aria-pressed={labelFilter === option.value}
                    onClick={() => setLabelFilter(option.value)}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
              <span className="text-xs text-base-content/60 tabular-nums" aria-live="polite">
                размечено {labeledCount} из {samples.length}
              </span>
            </div>
          ) : null}

          <SamplePlaybackBar playback={playback} compact />

          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>class</th>
                  <th>label</th>
                  <th>источник</th>
                  <th className="text-right">размер</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-base-content/50">
                      {samples.length > 0
                        ? 'Нет сэмплов с выбранной меткой.'
                        : isTariffDataset
                          ? 'Загрузка базового набора… (запустите yarn dataset:sync-free-v1 при dev)'
                          : 'Нет сэмплов.'}
                    </td>
                  </tr>
                ) : (
                  filteredSamples.map((s: MediaSample) => {
                    const isSelected = playback.selectedSampleId === s.id;
                    const saving = labelSavingId === s.id;
                    return (
                    <Fragment key={s.id}>
                    <tr
                      className={isSelected ? 'bg-primary/10' : undefined}
                      onClick={() => void handleSelectSample(s)}
                    >
                      <td className="max-w-[12rem] align-top">
                        <p className="truncate cursor-pointer font-medium">{s.title}</p>
                      </td>
                      <td>{s.class}</td>
                      <td className="align-top">
                        <SampleLabelEditor
                          sampleId={s.id}
                          label={s.label}
                          editable={canLabelAnnotate}
                          saving={saving}
                          onSave={handleUpdateLabelNotes}
                        />
                      </td>
                      <td>{s.source}</td>
                      <td className="text-right tabular-nums">
                        {(s.sizeBytes / 1024).toFixed(0)} KB
                      </td>
                      <td className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          aria-label={
                            playback.selectedSampleId === s.id && playback.status === 'playing'
                              ? 'Пауза'
                              : 'Воспроизвести'
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            void (async () => {
                              if (playback.selectedSampleId !== s.id) {
                                await handleSelectSample(s);
                              }
                              await togglePlayPause();
                            })();
                          }}
                        >
                          {playback.selectedSampleId === s.id && playback.status === 'playing'
                            ? '⏸'
                            : '▶'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          aria-label="Экспорт"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleExportSample(s);
                          }}
                        >
                          ↓
                        </button>
                        {selectedId === BUFFER_COLLECTION_ID && moveTargets.length > 0 ? (
                          <select
                            className="select select-bordered select-xs max-w-[8rem]"
                            defaultValue=""
                            onChange={(e) => {
                              void handleMove(s.id, e.target.value);
                              e.target.value = '';
                            }}
                          >
                            <option value="" disabled>
                              Перенести…
                            </option>
                            {moveTargets.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        {!isTariffDataset ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => void handleRemove(s.id)}
                        >
                          Удалить
                        </button>
                        ) : null}
                      </td>
                    </tr>
                    {isSelected && canLabelAnnotate ? (
                      <tr className="bg-primary/10">
                        <td colSpan={6} className="pt-0">
                          <div
                            className="py-2"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <SampleNotesEditor
                              sampleId={s.id}
                              notes={s.notes}
                              editable
                              saving={saving}
                              onSave={handleUpdateLabelNotes}
                            />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
