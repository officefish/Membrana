import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeletionConfirmDialog } from '@/components/DeletionConfirmDialog';
import {
  MoveAllToCollectionDialog,
  canOfferMoveAll,
  isMoveAllSourceBuffer,
  type MoveAllPort,
} from '@/components/MoveAllToCollectionDialog';
import { readPersistedPairedCredentials } from '@/lib/resolveMediaLibraryBackend';
import { ModuleProps, useMembranaStore } from '@membrana/agenda';
import { useShallow } from 'zustand/react/shallow';
import {
  BUFFER_COLLECTION_ID,
  DEFAULT_SAMPLES_PAGE_SIZE,
  isReadOnlyCollection,
  buildLabelManifest,
  readLabelManifest,
  TARIFF_DATASET_SYSTEM_KEY,
  isQuotaFull,
  resolveSamplesPageWindow,
  useMediaLibrary,
  type Collection,
  type MediaSample,
  type MediaPluginState,
  type SampleLabel,
  type UpdateSampleLabelNotes,
} from '@membrana/media-library-service';

import { SampleLibraryPagination } from '../components/sample-library/SampleLibraryPagination';
import { SampleLibraryTable } from '../components/sample-library/SampleLibraryTable';
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
  SampleLibraryChartListPanel,
} from '../plugins/sample-library-chart-list';
import {
  SampleLibrarySessionDigestPanel,
} from '../plugins/sample-library-session-digest';
import {
  SampleLibraryDuplicatesPanel,
} from '../plugins/sample-library-duplicates';
import {
  TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
  TrendsFftSampleAnalyzerPanel,
} from '../plugins/trends-fft-sample-analyzer';
import {
  NEURAL_DRONE_ANALYZER_PLUGIN_ID,
  NeuralDroneAnalyzerPanel,
} from '../plugins/neural-drone-analyzer';

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

const MEDIA_HOME_CHART_LIST_PLUGIN_ID = 'membrana.showcase.library-chart-list';
const MEDIA_HOME_SESSION_DIGEST_PLUGIN_ID = 'membrana.report.session-digest';
const MEDIA_HOME_DUPLICATES_PLUGIN_ID = 'membrana.showcase.library-duplicates';

const MEDIA_HOME_PANEL_PLUGIN_IDS = new Set<string>([
  MEDIA_HOME_CHART_LIST_PLUGIN_ID,
  MEDIA_HOME_SESSION_DIGEST_PLUGIN_ID,
  MEDIA_HOME_DUPLICATES_PLUGIN_ID,
]);

export function enabledMediaPluginIdsFromHome(states: readonly MediaPluginState[]): readonly string[] {
  return states
    .filter((state) => MEDIA_HOME_PANEL_PLUGIN_IDS.has(state.manifest.id) && state.enabled)
    .map((state) => state.manifest.id);
}

export const SampleLibraryModule: React.FC<ModuleProps<SampleLibraryConfig>> = ({
  module,
}) => {
  const config = module.config as SampleLibraryConfig;
  const { snapshot, service } = useMediaLibrary();
  const playback = useSamplePlayback();
  const localActivePluginIds = useMembranaStore(
    useShallow((state) => state.getModule(module.id)?.activePlugins ?? []),
  );
  const [selectedId, setSelectedId] = useState<string>(BUFFER_COLLECTION_ID);
  const [mediaPluginStates, setMediaPluginStates] = useState<readonly MediaPluginState[]>([]);
  const [pluginStateError, setPluginStateError] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  /**
   * Свёрнут ли основной список (#2177, требование 4). Виджеты плагинов при этом ОСТАЮТСЯ:
   * сворачивают список, чтобы работать с выборкой, а не чтобы спрятать всё разом.
   */
  const [mainCollapsed, setMainCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Перенос буфер→набор: что едет и куда — видно словом, а не молчанием (#2110). */
  const [moveState, setMoveState] = useState<{ state: 'moving' | 'done'; sampleId: string; targetName: string } | null>(null);
  /** Именованные состояния сохранения подписи — по каждой пробе (#2110). */
  const [labelStates, setLabelStates] = useState<Record<string, { state: 'idle' | 'saving' | 'saved' | 'error'; detail?: string }>>({});
  const [labelFilter, setLabelFilter] = useState<'all' | SampleLabel>('all');
  /** Текущая страница списка проб (#2505). Приводится к живому диапазону в `resolveSamplesPageWindow`. */
  const [samplesPage, setSamplesPage] = useState(1);
  const { busy: clearingBuffer, run: runRemoteMutation } = useRemoteMutation();

  /**
   * Смена набора и смена фильтра сбрасывают страницу СРАЗУ, в том же движении, а не эффектом
   * после отрисовки — тот же класс, что #2181 закрыл для отчёта плагина: «прежний номер больше
   * не про этот список». Оставь номер, и человек попадёт на страницу 27 списка из 40 записей:
   * пусто, а счётчик уверяет, что где-то есть 27-я страница.
   *
   * Одного сброса мало: набор умеет ужиматься БЕЗ участия человека (удалили пробы, очистили
   * буфер) — там сбрасывать некому, и номер приводит к диапазону сам `resolveSamplesPageWindow`.
   */
  const selectCollection = useCallback((collectionId: string) => {
    setSelectedId(collectionId);
    setSamplesPage(1);
  }, []);

  const chooseLabelFilter = useCallback((next: 'all' | SampleLabel) => {
    setLabelFilter(next);
    setSamplesPage(1);
  }, []);

  /**
   * Сверка с сервером при открытии библиотеки (#2569): сервис инициализирован мостом при старте,
   * и `init()` из хука здесь пуст — без сверки имя и состав базового набора менялись только
   * перезапуском Studio. Один раз на монтирование модуля; лёгкая (ensure-reserved + коллекции +
   * квота), пробы буфера не читаются. Здесь, а не в `useMediaLibrary`: хук зовут и панели плагинов.
   */
  useEffect(() => {
    service.reconcileOnOpen().catch((err: unknown) => {
      console.error('[SampleLibraryModule] reconcile on open failed', err);
    });
  }, [service]);

  useEffect(() => {
    bindSamplePlaybackBlobReader((sampleId: string) => service.getSampleBlob(sampleId));
    return () => {
      void disposeSamplePlayback();
    };
  }, [service]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (snapshot.quota.backend !== 'server') {
        setMediaPluginStates([]);
        setPluginStateError(null);
        return;
      }
      try {
        const states = await service.listCollectionPlugins(selectedId);
        if (!alive) return;
        setMediaPluginStates(states);
        setPluginStateError(null);
      } catch (e) {
        if (!alive) return;
        setMediaPluginStates([]);
        setPluginStateError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [service, selectedId, snapshot.quota.backend]);

  const mediaActivePluginIds = useMemo(
    () => enabledMediaPluginIdsFromHome(mediaPluginStates),
    [mediaPluginStates],
  );

  const samples = useMemo(
    // Свежие СВЕРХУ (#2110): главный инструмент — разборка ночных проб, и человек начинает с
    // последнего записанного, а не листает к нему через тысячу старых. Сортировка на копии —
    // снапшот сервиса не переворачивается на месте.
    () =>
      [...(snapshot.samplesByCollection[selectedId] ?? [])].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [snapshot.samplesByCollection, selectedId],
  );
  const selected = snapshot.collections.find((c) => c.id === selectedId);
  // NB3: фильтр по метке + прогресс разметки (HG1-UX).
  const filteredSamples =
    labelFilter === 'all' ? samples : samples.filter((s) => s.label === labelFilter);
  /**
   * ЛИСТАЕТСЯ ОТРИСОВКА, А НЕ ЗАГРУЗКА (#2505). Дом по-прежнему держит набор целиком — поэтому
   * фильтр по метке, экспорт/импорт разметки, счётчик размеченных и поиск пробы по id для панелей
   * работают по ВСЕМУ набору, как и раньше. На экран уходит окно страницы: 1057 строк разом не
   * рисуются больше никогда.
   *
   * Почему не страницы двери, как в кабинете: снапшот сервиса всё равно загружает набор целиком
   * (`refresh` → `listSamples` обходит все страницы), и переход дома на страницы двери НЕ убрал бы
   * ни одного запроса, зато отнял бы у фильтра и у разметки полный набор — то есть купил бы
   * дешёвую отрисовку ценой тех самых частичных данных, за которые дом уже краснел (#2237).
   */
  const pageView = resolveSamplesPageWindow(filteredSamples, samplesPage, DEFAULT_SAMPLES_PAGE_SIZE);
  const labeledCount = samples.filter((s) => s.label !== 'unlabeled').length;
  const quotaBlocked = isQuotaFull(snapshot.quota);
  const isTariffDataset =
    selected?.kind === 'system' && selected.systemKey === TARIFF_DATASET_SYSTEM_KEY;
  const canLabelAnnotate = !isTariffDataset;
  /**
   * Из какого набора вообще можно двигать пробы.
   *
   * Дверь переноса была нарисована ТОЛЬКО в буфере (`selectedId === BUFFER_COLLECTION_ID`),
   * хотя ни `moveTargets`, ни сервер этого не требовали: сервер блокирует лишь тарифный набор
   * и перенос в тот же самый. Разложив улов по наборам, человек больше не мог переложить
   * пробу из набора в набор — не потому, что нельзя, а потому, что органа не нарисовали.
   *
   * Предикат сознательно ТОТ ЖЕ, что у близнеца в кабинете (`readOnlyCollection`,
   * useCabinetSampleLibrary.ts): системный набор только для чтения, тарифный — частный случай
   * системного. Два дома, одно правило; разъедутся — покраснеет зуб сходства.
   */
  // Правило одно и живёт в ядре (#2249): дом его ЗОВЁТ, а не объявляет заново.
  const readOnlyCollection = isReadOnlyCollection(selected);
  const canMoveFrom = Boolean(selected) && !readOnlyCollection;

  const handleUpdateLabelNotes = useCallback(
    async (sampleId: string, patch: UpdateSampleLabelNotes) => {
      // Состояние сохранения — ПО КАЖДОЙ пробе, именованное (#2110): прежде один labelSavingId
      // на весь модуль держал владельца — пока одна подпись едет, следующую не тронуть. Теперь
      // сохранение асинхронное: подписал → перешёл к следующей, а исход (saving → saved | error)
      // виден у той строки, которой принадлежит, и ошибка не теряется в общем баннере.
      setLabelStates((prev) => ({ ...prev, [sampleId]: { state: 'saving' } }));
      try {
        await service.updateSampleLabelNotes(sampleId, patch);
        setLabelStates((prev) => ({ ...prev, [sampleId]: { state: 'saved' } }));
        // «Сохранено» — сигнал, не жилец: через пару секунд строка возвращается к покою.
        window.setTimeout(() => {
          setLabelStates((prev) =>
            prev[sampleId]?.state === 'saved' ? { ...prev, [sampleId]: { state: 'idle' } } : prev,
          );
        }, 2500);
      } catch (e) {
        setLabelStates((prev) => ({
          ...prev,
          [sampleId]: { state: 'error', detail: e instanceof Error ? e.message : String(e) },
        }));
      }
    },
    [service],
  );

  const moveTargets = snapshot.collections.filter(
    (c) => c.id !== selectedId && c.kind !== 'buffer' && c.kind !== 'system',
  );

  /**
   * МАССОВЫЙ перенос — только из буфера (слово владельца 27.09). Правило не объявляется здесь
   * заново: его несёт носитель окна, один на два дома (`canOfferMoveAll`). Построчный перенос
   * остаётся на `canMoveFrom` — он к буферу не привязан (#2249).
   */
  const canMoveAll = canMoveFrom && canOfferMoveAll(selectedId, moveTargets);

  const handleCreateCollection = useCallback(async () => {
    setError(null);
    try {
      const col = await service.createUserCollection(newCollectionName);
      setNewCollectionName('');
      selectCollection(col.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [newCollectionName, selectCollection, service]);

  const handleDeleteCollection = useCallback(async () => {
    if (!selected || selected.kind !== 'user') return;
    setError(null);
    try {
      await service.deleteUserCollection(selected.id);
      selectCollection(BUFFER_COLLECTION_ID);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [selectCollection, selected, service]);

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
    /**
     * Файл объявляет свою полноту САМ (#2237). Прежняя редакция писала
     * `collection: <имя набора>` и разметку из `samples` — то есть из загруженной
     * страницы: выгрузка называла себя разметкой набора, а несла разметку экрана. Файл
     * уходит человеку, правится и возвращается импортом, поэтому неполнота приезжала
     * обратно как достоверные данные. Полное число берём у счётчика набора; не знаем его —
     * файл честно объявляется неполным.
     */
    const payload = buildLabelManifest({
      collectionName: selected.name,
      collectionId: selected.id,
      exported: samples,
      collectionTotal: selected.sampleCount ?? null,
    });
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: 'application/json',
    });
    const safeName = selected.name.toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-');
    downloadBlob(blob, `${safeName || 'collection'}-labels.json`);
  }, [samples, selected]);

  /**
   * ПРИЁМ РАЗМЕТКИ (#2237). Половина круга, которой не было: файл выгружался, правился
   * человеком и возвращался — но возвращался мимо кода, руками. Теперь у возврата есть
   * дверь, и она умеет ОТКАЗЫВАТЬ: неполный файл применять нельзя, иначе записи вне файла
   * останутся со старой разметкой, а человек будет уверен, что применил набор целиком.
   */
  const [labelImport, setLabelImport] = useState<{ kind: 'ok' | 'refused'; text: string } | null>(null);

  const handleImportLabels = useCallback(
    async (file: File) => {
      setLabelImport(null);
      const read = readLabelManifest(await file.text());
      if (!read.ok) {
        // Причина едет человеку словами — он должен знать, ЧТО не так и что делать.
        setLabelImport({ kind: 'refused', text: `Разметка не принята: ${read.why}.` });
        return;
      }
      /**
       * ПРИМЕНЯЕМ ТОЛЬКО К ПОЛНОСТЬЮ ЗАГРУЖЕННОМУ НАБОРУ. Тот же класс, что чинит этот
       * PR, укусил внутри самой починки (ревью #2244): применение шло по загруженной
       * странице, а записи вне неё докладывались как «не найдено в наборе» — хотя они в
       * наборе есть. Полный файл применился бы частично, и человек считал бы, что
       * применил его целиком. Отказ здесь честнее догрузки: он называет числа.
       */
      const inCollection = selected?.sampleCount ?? samples.length;
      if (inCollection > samples.length) {
        setLabelImport({
          kind: 'refused',
          text:
            `Разметка не принята: дом загрузил ${samples.length} из ${inCollection} записей набора. ` +
            'Применение к части набора оставило бы остальные со старой разметкой молча — ' +
            'откройте набор целиком и повторите.',
        });
        return;
      }
      const byTitle = new Map(samples.map((x) => [x.title, x]));
      let applied = 0;
      const missing: string[] = [];
      for (const entry of read.manifest.labels) {
        const target = byTitle.get(entry.fileName);
        if (!target) {
          missing.push(entry.fileName);
          continue;
        }
        try {
          await service.updateSampleLabelNotes(target.id, { label: entry.label, notes: entry.notes });
          applied += 1;
        } catch (e) {
          setLabelImport({
            kind: 'refused',
            text: `Применено ${applied}, дальше отказ на «${entry.fileName}»: ${e instanceof Error ? e.message : String(e)}.`,
          });
          return;
        }
      }
      // Молчаливого пропуска нет и здесь: чего не нашли — называем числом.
      setLabelImport({
        kind: 'ok',
        text:
          `Разметка применена: ${applied} из ${read.manifest.labels.length}` +
          (missing.length > 0 ? ` · нет в наборе: ${missing.length}` : '') + '.',
      });
    },
    // selected в зависимостях обязателен: без него замыкание судит о полноте по ПРОШЛОМУ
    // набору — смена набора оставила бы старое число, и отказ считался бы по чужому.
    // Тот же род, что чинит этот PR: суждение по устаревшему вместо текущего (ревью #2244).
    [samples, selected, service],
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

  /**
   * Удаление по списку (#2250). Один вызов на всю пачку, а не цикл: цикл дал бы N запросов,
   * N возможных полу-исходов и ни одного общего отчёта.
   *
   * ЧАСТИЧНЫЙ ОТКАЗ ГОВОРИТ СЛОВАМИ. Сервер вправе удалить часть и отказать по части — и
   * отказ обязан назвать записи поимённо, а не свестись к «что-то не вышло». Молчание здесь
   * было бы хуже ошибки: человек считал бы удалённым то, что осталось.
   */
  const handleRemoveMany = useCallback(
    async (sampleIds: readonly string[]) => {
      setError(null);
      try {
        const outcome = await service.deleteSamplesByIds(selectedId, sampleIds);
        if (outcome.refused.length > 0) {
          const named = outcome.refused
            .map((r) => `${samples.find((s) => s.id === r.id)?.title ?? r.id} — ${r.why}`)
            .join('; ');
          setError(`Удалено ${outcome.deleted}, отказано ${outcome.refused.length}: ${named}`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [samples, selectedId, service],
  );

  const handleMove = useCallback(
    async (sampleId: string, toId: string) => {
      if (!toId) return;
      setError(null);
      // Перенос больше не молчит (#2110): пока едет — «переносится…», по исходу — «перенесено
      // в <набор>» либо ошибка. Прежде проба просто исчезала из списка, и человек не знал,
      // уехала она или потерялась.
      //
      // Слово было написано для переноса ИЗ БУФЕРА, но написано по адресату, а не по источнику,
      // и потому перенос набор→набор говорит им без единой правки. Это проверено зубом, а не
      // предположено: молчаливое исчезновение из списка — тот же дефект, откуда бы проба ни ехала.
      const targetName = snapshot.collections.find((c) => c.id === toId)?.name ?? toId;
      setMoveState({ state: 'moving', sampleId, targetName });
      try {
        await service.moveSample(sampleId, toId);
        setMoveState({ state: 'done', sampleId, targetName });
        window.setTimeout(() => {
          setMoveState((prev) => (prev?.state === 'done' && prev.sampleId === sampleId ? null : prev));
        }, 3000);
      } catch (e) {
        setMoveState(null);
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [service, snapshot.collections],
  );

  /**
   * ПЕРЕНОС ПАЧКОЙ (заказ владельца 27.09) — окно выбора набора, план, подтверждение.
   *
   * Перечисление идёт ПОЛНЫМ списком набора (`listSamples` бэкенда обходит все страницы), а
   * НЕ по `samples`: список в руках дома — это загруженное, а перенести надо набор. В Studio
   * они сейчас совпадают, в кабинете-близнеце нет, и правило одно на двоих (класс
   * `docs/field/decisions-on-partial-data.md`).
   *
   * Почему через `getBackend()`, а не своим глаголом сервиса: слой доступа к двери приезжает
   * серверной половиной (#2488, арбитраж ведущей 27.09), и второй раз добавлять в тот же
   * пакет ничего нельзя — один шов там уже разошёлся на два контракта. `listSamples` у порта
   * обязательный и публичный, так что новой двери для этого не нужно.
   */
  const [moveAllOpen, setMoveAllOpen] = useState(false);
  const moveAllPort = useMemo<MoveAllPort>(
    () => ({
      enumerate: async () => (await service.getBackend().listSamples(selectedId)).map((s) => s.id),
      run: (sampleIds, toCollectionId, options) =>
        service.moveSamplesBatch(sampleIds, toCollectionId, options),
    }),
    [selectedId, service],
  );

  const handleClearBuffer = useCallback(async () => {
    if (snapshot.quota.backend === 'server' && !snapshot.quota.serverReachable) {
      setError('Media-server недоступен — очистка буфера невозможна.');
      return;
    }
    // Подтверждение живёт в окне удаления (#2218): оно показывает, ЧТО уйдёт и чем это
    // может оказаться. Системный confirm умел только «уверены?».
    setError(null);
    try {
      await runRemoteMutation('Очистка буфера', async () => {
        await requestClearMediaLibraryBuffer();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [runRemoteMutation, snapshot.quota.backend, snapshot.quota.serverReachable]);

  /**
   * ВОРОТА УДАЛЕНИЯ (#2218) — близнец кабинетных. Обе воронки Studio, построчное удаление
   * и очистка буфера, проходят через одно окно со списком и гипотезой ценности.
   */
  const [pendingDeletion, setPendingDeletion] = useState<{
    readonly title: string;
    readonly samples: readonly MediaSample[];
    readonly declaredTotal?: number;
    readonly run: () => void | Promise<void>;
  } | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);

  /**
   * ПРИБОР ДЛЯ ГИПОТЕЗЫ ЦЕНОСТИ. Без него окна вещдоков не применяются, и вердикт
   * «вещдок» падает до «разобрано руками» — то есть второе движение у близнецов
   * получается РАЗНОЙ силы: в кабинете галочка обязательна, в Studio нет (ревью #2232).
   * В связке с узлом прибор известен; в автономном режиме записи местные, и окна
   * узла к ним не относятся — тогда `undefined` честен, а не потерян.
   */
  const pairedDeviceId = useMemo(() => readPersistedPairedCredentials()?.deviceId, []);

  const confirmDeletion = useCallback(async () => {
    if (!pendingDeletion) return;
    setDeletingNow(true);
    try {
      await pendingDeletion.run();
    } finally {
      setDeletingNow(false);
      setPendingDeletion(null);
    }
  }, [pendingDeletion]);

  const removeGated = useCallback(
    async (sampleId: string): Promise<void> => {
      const one = samples.find((x) => x.id === sampleId);
      // Та же оговорка, что в кабинете: вне загруженной страницы пробы нет в руках, но
      // удаление по id состоится — окно обязано знать число, а не молчать «нечего».
      setPendingDeletion({
        title: 'Удалить пробу',
        samples: one ? [one] : [],
        declaredTotal: 1,
        run: () => handleRemove(sampleId),
      });
    },
    [handleRemove, samples],
  );

  /**
   * Удаление ПАЧКОЙ по списку (#2250) — один вызов, одно окно.
   *
   * Число не выдумывается: `declaredTotal` — длина списка, а не длина того, что нашлось в
   * загруженной странице. Пробы вне страницы окно покажет как «разобрано N из M», и это
   * честнее, чем занизить потерю до видимого (класс ревью #2232).
   *
   * Частичный отказ сервера не глотается: `deleteSamplesByIds` называет отказанные записи
   * поимённо, и эти слова едут человеку, а не в лог.
   */
  const removeManyGated = useCallback(
    async (sampleIds: readonly string[]): Promise<void> => {
      if (sampleIds.length === 0) return;
      const known = samples.filter((s) => sampleIds.includes(s.id));
      setPendingDeletion({
        title: `Удалить выбранные (${sampleIds.length})`,
        samples: known,
        declaredTotal: sampleIds.length,
        run: () => handleRemoveMany(sampleIds),
      });
    },
    [handleRemoveMany, samples],
  );

  const clearBufferGated = useCallback(async (): Promise<void> => {
    const declared =
      snapshot.collections.find((c) => c.id === BUFFER_COLLECTION_ID)?.sampleCount ?? samples.length;
    setPendingDeletion({
      title: 'Очистить буфер',
      samples,
      declaredTotal: declared,
      run: () => handleClearBuffer(),
    });
  }, [handleClearBuffer, samples, snapshot.collections]);

  const handleSelectSample = useCallback(async (sample: MediaSample) => {
    setError(null);
    try {
      await selectSample(sample);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  /**
   * Кнопка «играть» у строки: выбрать, если играется другая, и переключить. Порядок тот же, что
   * был в разметке модуля до выноса таблицы (#2505) — прослушивание НЕ зависит от страницы: проба
   * играется по id, и уход на другую страницу его не останавливает.
   */
  const handleTogglePlay = useCallback(
    async (sample: MediaSample) => {
      if (playback.selectedSampleId !== sample.id) {
        await handleSelectSample(sample);
      }
      try {
        await togglePlayPause();
      } catch (e) {
        // Отказ переключения НЕ глотается (ревью #2505, P2). Прежняя разметка звала
        // `togglePlayPause` из `void (async () => …)()`, и отказ уходил в никуда: кнопка
        // «играть» молчала, а человек не знал, что проба не загрузилась.
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [handleSelectSample, playback.selectedSampleId],
  );

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
      {localActivePluginIds.includes(SAMPLE_LIBRARY_PLAYER_PLUGIN_ID) ? (
        <SampleLibraryPlayerPanel moduleId={module.id} />
      ) : null}

      {/*
        Шапка списка — ВНЕ сворачиваемого (#2177, требование 4). Положи кнопку внутрь, и
        свёрнутый список унёс бы её с собой: развернуть стало бы нечем. То же правило, что у
        журнальной области кабинета (`PagePluginArea.mainHeader`) — правило одно на близнецов.
      */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-base-content/60">
          {mainCollapsed ? 'Список свёрнут — виджеты плагинов остались' : 'Список наборов и проб'}
        </span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setMainCollapsed((v) => !v)}>
          {mainCollapsed ? 'Развернуть список' : 'Свернуть список'}
        </button>
      </div>

      {moveState ? (
        <div className={moveState.state === 'moving' ? 'alert alert-info py-1 text-xs' : 'alert alert-success py-1 text-xs'} role="status">
          {moveState.state === 'moving'
            ? `Переносится в «${moveState.targetName}»…`
            : `Перенесено в «${moveState.targetName}»`}
        </div>
      ) : null}

      <MediaLibraryQuotaBanner quota={snapshot.quota} />

      {error ? (
        <div className="alert alert-error text-sm" role="alert">
          {error}
        </div>
      ) : null}

      {pluginStateError ? (
        <div className="alert alert-warning text-xs" role="status">
          {pluginStateError}
        </div>
      ) : null}

      {/* Основной блок списка сворачивается целиком; виджеты плагинов ниже остаются (#2177). */}
      {/* Ряд: слева органы (наборы узла), справа список проб. */}
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
              onClick={() => selectCollection(col.id)}
            >
              {col.name}
              <span className="ml-auto tabular-nums opacity-70">
                {/* Полное число набора, а не длина загруженного массива: кабинет в том же
                    месте берёт sampleCount, и близнецы расходились на ровном месте (#2237). */}
                {col.sampleCount ?? (snapshot.samplesByCollection[col.id] ?? []).length}
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

          {/*
            «Перенести все» стоит рядом с «Очистить буфер» намеренно: обе — операции над
            НАБОРОМ ЦЕЛИКОМ, и у полного буфера это две дороги одного решения — вывезти или
            стереть. И живёт кнопка ТОЛЬКО в буфере (`canMoveAll`, слово владельца 27.09):
            дверь возит пачкой только из буфера, и вне буфера окно могло сказать человеку
            ровно одно — «не поедет ничего». Построчный перенос это не затрагивает: он
            по-прежнему на `canMoveFrom`, из любого набора (#2249).
          */}
          {canMoveAll ? (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setMoveAllOpen(true)}
            >
              Перенести все
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
              onClick={() => void clearBufferGated()}
            >
              {clearingBuffer ? 'Очистка…' : 'Очистить буфер'}
            </button>
          ) : null}
        </aside>

        {/* Сворачивается ТОЛЬКО список проб: органы слева остаются, как остался плеер. */}
        {mainCollapsed ? null : (
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
            {canLabelAnnotate ? (
              <label className="btn btn-sm btn-outline">
                Импорт меток (JSON)
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void handleImportLabels(file);
                  }}
                />
              </label>
            ) : null}
            {labelImport ? (
              <span
                className={`text-xs ${labelImport.kind === 'refused' ? 'text-error' : 'text-success'}`}
                role="status"
              >
                {labelImport.text}
              </span>
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
                    onClick={() => chooseLabelFilter(option.value)}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
              <span className="text-xs text-base-content/60 tabular-nums" aria-live="polite">
                {/* M — полное число набора: доля от страницы показывала «40 из 40»
                    при 1747 в наборе (#2237). Когда загружено не всё, так и сказано.
                    Слово «страница» здесь больше не годится: с #2505 страница есть у ЭКРАНА, а
                    эта оговорка — про ЗАГРУЖЕННОЕ. Оставь прежнюю формулировку, и она стала бы
                    ложью: «на этой странице 1057» при сорока строках перед глазами. */}
                размечено {labeledCount} из {selected?.sampleCount ?? samples.length}
                {(selected?.sampleCount ?? samples.length) > samples.length
                  ? ` (загружено ${samples.length})`
                  : ''}
              </span>
            </div>
          ) : null}

          <SamplePlaybackBar playback={playback} compact />

          <SampleLibraryTable
            rows={pageView.items}
            emptyText={
              samples.length > 0
                ? 'Нет сэмплов с выбранной меткой.'
                : isTariffDataset
                  ? 'Загрузка базового набора… (запустите yarn dataset:sync-free-v1 при dev)'
                  : 'Нет сэмплов.'
            }
            playback={playback}
            labelStates={labelStates}
            canLabelAnnotate={canLabelAnnotate}
            canMoveFrom={canMoveFrom}
            moveTargets={moveTargets}
            isTariffDataset={isTariffDataset}
            onSelectSample={(s) => void handleSelectSample(s)}
            onTogglePlay={(s) => void handleTogglePlay(s)}
            onExportSample={(s) => void handleExportSample(s)}
            onMove={(id, toId) => void handleMove(id, toId)}
            onRemove={(id) => void removeGated(id)}
            onSaveLabelNotes={handleUpdateLabelNotes}
          />

          {/* Органы листания — ПОД таблицей, как у близнеца в кабинете. */}
          <SampleLibraryPagination
            page={pageView.page}
            totalPages={pageView.totalPages}
            total={pageView.total}
            from={pageView.from}
            to={pageView.to}
            onPageChange={setSamplesPage}
          />
        </section>
        )}
      </div>


      {/* Панели плагинов — ПОД основным блоком, по журнальному образцу (пункт 1.2 владельца):
          у журнала кабинета виджет плагина встаёт под лентой, а не над ней. Плеер остаётся
          сверху — он орган управления прослушиванием, а не виджет-результат. */}
      {mediaActivePluginIds.includes(MEDIA_HOME_CHART_LIST_PLUGIN_ID) && selected ? (
        <SampleLibraryChartListPanel
          moduleId={module.id}
          collectionId={selected.id}
          moveTargets={moveTargets}
          canMutate={canMoveFrom && moveTargets.length > 0}
          onMove={(id, toId) => handleMove(id, toId)}
          onExport={(id) => {
            // Скачивание берёт пробу из библиотеки по адресу: у выборки своего блоба нет.
            const s = samples.find((x) => x.id === id);
            if (s) void handleExportSample(s);
          }}
          onRemove={(id) => void removeGated(id)}
          onRemoveMany={(ids) => void removeManyGated(ids)}
        />
      ) : null}

      {mediaActivePluginIds.includes(MEDIA_HOME_SESSION_DIGEST_PLUGIN_ID) && selected ? (
        <SampleLibrarySessionDigestPanel moduleId={module.id} collectionId={selected.id} />
      ) : null}

      {mediaActivePluginIds.includes(MEDIA_HOME_DUPLICATES_PLUGIN_ID) && selected ? (
        <SampleLibraryDuplicatesPanel moduleId={module.id} collectionId={selected.id} />
      ) : null}

      {localActivePluginIds.includes(SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID) ? (
        <SampleLibraryDroneAnalysisPanel moduleId={module.id} />
      ) : null}

      {localActivePluginIds.includes(SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID) ? (
        <SampleLibraryFftThresholdTestPanel moduleId={module.id} />
      ) : null}

      {localActivePluginIds.includes(TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID) ? (
        <TrendsFftSampleAnalyzerPanel moduleId={module.id} />
      ) : null}

      {localActivePluginIds.includes(NEURAL_DRONE_ANALYZER_PLUGIN_ID) ? (
        <NeuralDroneAnalyzerPanel moduleId={module.id} />
      ) : null}

      <MoveAllToCollectionDialog
        open={moveAllOpen}
        source={{ name: selected?.name ?? '—', isBuffer: isMoveAllSourceBuffer(selectedId) }}
        sourceTotal={selected?.sampleCount ?? samples.length}
        collections={snapshot.collections}
        sourceCollectionId={selectedId}
        port={moveAllPort}
        onClose={() => setMoveAllOpen(false)}
      />

      <DeletionConfirmDialog
        open={pendingDeletion !== null}
        title={pendingDeletion?.title ?? ''}
        samples={pendingDeletion?.samples ?? []}
        declaredTotal={pendingDeletion?.declaredTotal}
        collections={snapshot.collections}
        deviceId={pairedDeviceId}
        busy={deletingNow}
        onCancel={() => setPendingDeletion(null)}
        onConfirm={() => void confirmDeletion()}
      />
    </div>
  );
};
