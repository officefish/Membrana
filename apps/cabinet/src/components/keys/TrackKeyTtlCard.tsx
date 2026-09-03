/**
 * Блок «Срок ссылок на треки» — мембранный выключатель (#2271, вердикт M3).
 *
 * ОТДЕЛЬНЫМ КОМПОНЕНТОМ, А НЕ ВСТАВКОЙ В `KeysPage`: страница ключей и так несёт два блока
 * своей темы (ключи доступа и ключи узла), а этот — про третью сущность, ключ-предъявитель.
 * Смешать их значило бы получить страницу, где «ключ» означает три разных предмета.
 *
 * ТРИ СОСТОЯНИЯ ВИДНЫ ЧЕЛОВЕКУ, а не два. `default` — «как принято», `seconds` — заданный срок,
 * «снят» — бессрочно. Третье существует затем, чтобы «не трогали» и «сознательно сняли» не
 * сливались: бессрочность НАЗНАЧАЕТСЯ словом, а не получается из пустого поля.
 *
 * СЛОВАРЬ ДЛИТЕЛЬНОСТЕЙ УЗЛОВЫХ КЛЮЧЕЙ (4 часа – 3 месяца) СЮДА НЕ ПЕРЕНЕСЁН намеренно: эпик
 * назвал эти разряды не того порядка для ключа-предъявителя. У узлового ключа длинный срок
 * оплачен поштучным отзывом; у предъявителя поштучного отзыва нет по конструкции, и окно риска
 * равно сроку.
 *
 * ЦЕНА НАЗВАНА НА ЭКРАНЕ, А НЕ ТОЛЬКО В ДОКУМЕНТЕ: выключатель мембранный, и приёмный лоток
 * под него попадает. Сняв срок ради разобранных наборов, человек снимает его и с записей двора.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  fetchTrackKeyTtl,
  writeTrackKeyTtl,
  type TrackKeyTtlMode,
  type TrackKeyTtlView,
} from '@/api/sampleLibrary';

interface TrackKeyTtlCardProps {
  /** Прибор, через который кабинет достаёт мембрану. Мембрану выводит media, не мы. */
  readonly deviceId: string | null;
  /** Кто снимает срок — подпись движения. Без неё media отвергнет снятие, и это правильно. */
  readonly actor: string;
}

/**
 * Разряды предъявителя: минуты и часы, не месяцы. Подписи человеческие — «15 минут», а не
 * «900», потому что читает их человек, а не машина.
 */
const PRESETS: ReadonlyArray<{ readonly seconds: number; readonly label: string }> = [
  { seconds: 5 * 60, label: '5 минут' },
  { seconds: 15 * 60, label: '15 минут' },
  { seconds: 60 * 60, label: 'час' },
  { seconds: 12 * 60 * 60, label: '12 часов' },
  { seconds: 24 * 60 * 60, label: 'сутки' },
];

export function TrackKeyTtlCard({ deviceId, actor }: TrackKeyTtlCardProps) {
  const [view, setView] = useState<TrackKeyTtlView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState<number>(15 * 60);

  const load = useCallback(async () => {
    if (!deviceId) {
      setView(null);
      return;
    }
    setError(null);
    try {
      setView(await fetchTrackKeyTtl(deviceId));
    } catch (e) {
      // Отказ показывается СЛОВАМИ. «Прибор не привязан к мембране» — законное состояние, и
      // человек должен прочитать именно его, а не увидеть пустой блок.
      setError(e instanceof Error ? e.message : String(e));
      setView(null);
    }
  }, [deviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = useCallback(
    async (mode: TrackKeyTtlMode) => {
      if (!deviceId) return;
      setBusy(true);
      setError(null);
      try {
        setView(
          await writeTrackKeyTtl(deviceId, {
            mode,
            ...(mode === 'seconds' ? { seconds } : {}),
            ...(mode === 'lifted' ? { liftedBy: actor } : {}),
          }),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [actor, deviceId, seconds],
  );

  if (!deviceId) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h2 className="card-title text-lg">Срок ссылок на треки</h2>
          <p className="text-base-content/60">Выберите узел — срок задаётся для его мембраны.</p>
        </div>
      </div>
    );
  }

  const effective = view?.effective;

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-lg">Срок ссылок на треки</h2>

        <p className="text-sm text-base-content/70">
          Ссылка на трек — <strong>ключ-предъявитель</strong>: поштучно отозвать её нельзя, гасит
          только смена ключа мембраны, разом все ссылки. Поэтому окно риска равно сроку.
        </p>
        <p className="text-sm text-warning">
          Выключатель мембранный: одно движение меняет срок для всех наборов и всех треков.
          Приёмный лоток под него <strong>попадает</strong>.
        </p>

        {error ? (
          <div className="alert alert-error py-2 text-sm" role="alert">
            {error}
          </div>
        ) : null}

        {effective ? (
          <p className="text-sm" role="status">
            Сейчас:{' '}
            <strong>
              {effective.seconds === null ? 'срок снят — ссылки бессрочные' : `${effective.seconds} с`}
            </strong>{' '}
            <span className="text-base-content/60">(источник: {effective.source})</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <label className="form-control">
            <span className="label-text text-xs">Срок</span>
            <select
              className="select select-bordered select-sm"
              value={seconds}
              disabled={busy}
              onChange={(e) => setSeconds(Number(e.target.value))}
            >
              {PRESETS.map((p) => (
                <option key={p.seconds} value={p.seconds}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => void apply('seconds')}
          >
            Задать
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() => void apply('default')}
          >
            Вернуть умолчание
          </button>
          <button
            type="button"
            className="btn btn-outline btn-warning btn-sm"
            disabled={busy}
            onClick={() => void apply('lifted')}
          >
            Снять срок
          </button>
        </div>

        {view?.scopeCaveat ? (
          // Оговорку показываем человеку, а не только держим в ответе: вердикт M3 требует
          // мембранного масштаба, а настройка пока узловая. Умолчать значило бы выдать
          // объявленное за сделанное.
          <p className="text-xs text-base-content/60">⚠ {view.scopeCaveat}</p>
        ) : null}
      </div>
    </div>
  );
}
