import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Хвост журнала в DOM; полный буфер (до 10k строк) — через «Копировать»/«Скачать». */
export const JOURNAL_VISIBLE_TAIL_LINES = 500;

/** Порог от нижней кромки, в пределах которого follow-хвост остаётся включённым. */
const FOLLOW_BOTTOM_THRESHOLD_PX = 24;

export interface BoardJournalPanelProps {
  readonly isRuntime: boolean;
  readonly getLines: () => readonly string[];
  readonly subscribe: (listener: () => void) => () => void;
  readonly onCopy: () => Promise<boolean>;
  readonly onDownload: () => void;
  readonly onClear: () => void;
}

/**
 * Вкладка «Журнал» правого сайдбара: живой хвост scenario-trace во время
 * работы лупов; после остановки показывает трассу последнего запуска.
 */
export const BoardJournalPanel: React.FC<BoardJournalPanelProps> = ({
  isRuntime,
  getLines,
  subscribe,
  onCopy,
  onDownload,
  onClear,
}) => {
  const lines = useSyncExternalStore(subscribe, getLines, getLines);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const followTailRef = useRef(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (container !== null && followTailRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    if (copyStatus === null) {
      return;
    }
    const timer = window.setTimeout(() => setCopyStatus(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    const el = event.currentTarget;
    followTailRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= FOLLOW_BOTTOM_THRESHOLD_PX;
  };

  const visibleLines =
    lines.length > JOURNAL_VISIBLE_TAIL_LINES ? lines.slice(-JOURNAL_VISIBLE_TAIL_LINES) : lines;

  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-label="Журнал сценария">
      <div className="flex items-center justify-between gap-2 border-b border-base-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
            Журнал
          </p>
          <h2 className="text-sm font-semibold text-base-content">
            {isRuntime ? 'Сценарий выполняется' : 'Последний запуск'}
          </h2>
        </div>
        <span className="badge badge-sm badge-ghost shrink-0 font-mono" title="Строк в буфере">
          {lines.length}
        </span>
      </div>

      {lines.length === 0 ? (
        <p className="p-4 text-xs leading-relaxed text-base-content/55">
          Журнал пуст. Запустите сценарий — события лупов появятся здесь.
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-base-200/30 px-2 py-1"
          onScroll={handleScroll}
        >
          {lines.length > JOURNAL_VISIBLE_TAIL_LINES ? (
            <p className="px-1 py-0.5 text-[10px] text-base-content/40">
              Показаны последние {JOURNAL_VISIBLE_TAIL_LINES} строк — полный журнал через
              «Копировать» или «Скачать».
            </p>
          ) : null}
          <ol className="flex flex-col font-mono text-[11px] leading-snug text-base-content/80">
            {visibleLines.map((line, index) => (
              <li
                key={`${lines.length - visibleLines.length + index}`}
                className="whitespace-pre-wrap break-all border-b border-base-200/40 px-1 py-0.5"
              >
                {line}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1 border-t border-base-200 p-2">
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={lines.length === 0}
          onClick={() => {
            void onCopy().then((copied) => {
              setCopyStatus(copied ? 'Скопировано' : 'Не удалось скопировать');
            });
          }}
        >
          Копировать
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          disabled={lines.length === 0}
          onClick={onDownload}
        >
          Скачать
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-xs text-error"
          disabled={lines.length === 0}
          onClick={onClear}
        >
          Очистить
        </button>
        {copyStatus !== null ? (
          <span className="ml-auto text-[10px] text-base-content/60">{copyStatus}</span>
        ) : null}
      </div>
    </div>
  );
};
