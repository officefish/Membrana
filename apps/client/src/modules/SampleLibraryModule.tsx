import React, { useCallback, useEffect, useState } from 'react';
import { ModuleProps, useMembranaStore } from '@membrana/agenda';
import { useShallow } from 'zustand/react/shallow';
import {
  BUFFER_COLLECTION_ID,
  SYSTEM_BENCHMARK_COLLECTION_ID,
  isQuotaFull,
  useMediaLibrary,
  type Collection,
  type MediaSample,
} from '@membrana/media-library-service';

import { MediaLibraryQuotaBanner } from '../components/MediaLibraryQuotaBanner';
import { SamplePlaybackBar } from '../components/sample-playback/SamplePlaybackBar';
import { downloadBlob, extensionFromMime } from '../lib/downloadBlob';
import {
  bindSamplePlaybackBlobReader,
  disposeSamplePlayback,
  selectSample,
  togglePlayPause,
} from '../lib/sampleLibraryPlaybackHub';
import { useSamplePlayback } from '../lib/useSamplePlayback';
import {
  SAMPLE_LIBRARY_PLAYER_PLUGIN_ID,
  SampleLibraryPlayerPanel,
} from '../plugins/sample-library-player';

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

  useEffect(() => {
    bindSamplePlaybackBlobReader((sampleId) => service.getSampleBlob(sampleId));
    return () => {
      void disposeSamplePlayback();
    };
  }, [service]);

  const samples = snapshot.samplesByCollection[selectedId] ?? [];
  const selected = snapshot.collections.find((c) => c.id === selectedId);
  const quotaBlocked = isQuotaFull(snapshot.quota);

  const moveTargets = snapshot.collections.filter(
    (c) => c.id !== selectedId && c.kind !== 'buffer',
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
    async (file: File) => {
      if (!selected) return;
      setError(null);
      try {
        await service.importBlob(selected.id, file, {
          title: file.name,
          class: config.defaultImportClass || 'unlabeled',
          label: 'unlabeled',
          source: 'disk-import',
          durationSec: 0,
          sampleRate: 48000,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [config.defaultImportClass, selected, service],
  );

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
    setError(null);
    try {
      await service.clearBuffer();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [service]);

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
              className="btn btn-sm btn-ghost"
              onClick={() => void handleClearBuffer()}
            >
              Очистить буфер
            </button>
          ) : null}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{selected?.name ?? '—'}</h2>
            {selected?.kind === 'system' ? (
              <span className="badge badge-neutral badge-sm">системная</span>
            ) : null}
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
                className="hidden"
                disabled={quotaBlocked}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

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
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-base-content/50">
                      {selectedId === SYSTEM_BENCHMARK_COLLECTION_ID
                        ? 'Системная коллекция может быть пустой.'
                        : 'Нет сэмплов.'}
                    </td>
                  </tr>
                ) : (
                  samples.map((s: MediaSample) => (
                    <tr
                      key={s.id}
                      className={
                        playback.selectedSampleId === s.id ? 'bg-primary/10' : undefined
                      }
                      onClick={() => void handleSelectSample(s)}
                    >
                      <td className="max-w-[12rem] truncate cursor-pointer">{s.title}</td>
                      <td>{s.class}</td>
                      <td>{s.label}</td>
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
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => void handleRemove(s.id)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
