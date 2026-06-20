import React from 'react';

export interface BoardInspectorProps {
  readonly layer: 'signal' | 'scenario';
  readonly selectedNodeId: string | null;
  readonly selectedNodeLabel: string | null;
}

/** Боковая панель настроек выбранной ноды (заглушка H1b). */
export const BoardInspector: React.FC<BoardInspectorProps> = ({
  layer,
  selectedNodeId,
  selectedNodeLabel,
}) => {
  const layerTitle = layer === 'signal' ? 'Сигнал' : 'Сценарий';

  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-l border-base-300 bg-base-100"
      aria-label="Инспектор ноды"
    >
      <div className="border-b border-base-200 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/50">
          Инспектор
        </p>
        <h2 className="text-sm font-semibold text-base-content">{layerTitle}</h2>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 text-sm text-base-content/70">
        {selectedNodeId ? (
          <>
            <p>
              Выбрана нода:{' '}
              <span className="font-medium text-base-content">{selectedNodeLabel ?? selectedNodeId}</span>
            </p>
            <p className="text-xs leading-relaxed text-base-content/55">
              Параметры плагина и сокетов — в H2d+. Настройки остаются в сайдбаре модуля
              (см. MODULE_AND_PLUGIN_UI §3).
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-base-content/55">
            Выберите ноду на канвасе, чтобы увидеть её свойства.
          </p>
        )}

        <div className="mt-auto rounded-lg border border-dashed border-base-300 bg-base-200/50 p-3 text-xs text-base-content/50">
          Run / Stop и валидация графа — эпики H1c и H2b.
        </div>
      </div>
    </aside>
  );
};
