import { BUFFER_COLLECTION_ID } from '@membrana/media-library-service';

import type { MembraneNodeLibrary } from '@/api/sampleLibrary';
import type { CabinetSampleLibraryModel } from '@/lib/useCabinetSampleLibrary';

export type SampleLibrarySidebarProps = Pick<
  CabinetSampleLibraryModel,
  | 'catalog'
  | 'nodes'
  | 'selection'
  | 'setSelection'
  | 'expandedNodes'
  | 'toggleNodeExpanded'
  | 'selectPairedNode'
  | 'selectOfflineNode'
  | 'snapshot'
  | 'active'
  | 'isNodeView'
  | 'isCatalogView'
  | 'newCollectionName'
  | 'setNewCollectionName'
  | 'busy'
  | 'selectedCollection'
  | 'handleCreateCollection'
  | 'handleDeleteCollection'
  | 'handleClearBuffer'
>;

export function SampleLibrarySidebar({
  catalog,
  nodes,
  selection,
  setSelection,
  expandedNodes,
  toggleNodeExpanded,
  selectPairedNode,
  selectOfflineNode,
  snapshot,
  active,
  isNodeView,
  isCatalogView,
  newCollectionName,
  setNewCollectionName,
  busy,
  selectedCollection,
  handleCreateCollection,
  handleDeleteCollection,
  handleClearBuffer,
}: SampleLibrarySidebarProps) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-base-300 bg-base-200/40 p-3 lg:w-56 xl:w-64">
      <div>
        <span className="text-[10px] uppercase tracking-wide text-base-content/50">Мембрана</span>
        <button
          type="button"
          className={`btn btn-sm mt-1 h-auto min-h-0 w-full flex-col items-stretch gap-0.5 py-2 normal-case ${
            isCatalogView ? 'btn-primary' : 'btn-ghost'
          }`}
          onClick={() => setSelection({ kind: 'catalog' })}
        >
          <span className="w-full text-left font-medium leading-tight">Базовый набор</span>
          {catalog ? (
            <span className="w-full truncate text-left font-mono text-[11px] leading-tight opacity-70">
              {catalog.catalogId}
            </span>
          ) : null}
        </button>
        {catalog ? (
          <p className="mt-1 text-xs tabular-nums text-base-content/50">
            {catalog.sampleCount} сэмплов · только чтение
          </p>
        ) : null}
      </div>

      <div className="divider my-0" />

      <div>
        <span className="text-[10px] uppercase tracking-wide text-base-content/50">Узлы</span>
        {nodes.length === 0 ? (
          <p className="mt-2 text-xs text-base-content/50">
            Нет узлов. Создайте узел в разделе «Узлы и ключи».
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {nodes.map((node) => (
              <NodeTreeItem
                key={node.id}
                node={node}
                selection={selection}
                expandedNodes={expandedNodes}
                snapshot={snapshot}
                active={active}
                onSelectPaired={selectPairedNode}
                onSelectOffline={selectOfflineNode}
                onToggleExpanded={toggleNodeExpanded}
                onSelectCollection={(nodeArg, collectionId) => {
                  if (!nodeArg.deviceId) return;
                  setSelection({
                    kind: 'node',
                    nodeId: nodeArg.id,
                    deviceId: nodeArg.deviceId,
                    label: nodeArg.label,
                    collectionId,
                  });
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {isNodeView && active ? (
        <>
          <div className="divider my-0" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-base-content/50">
              Коллекции узла
            </span>
            <input
              type="text"
              className="input input-bordered input-xs"
              placeholder="Новая коллекция"
              value={newCollectionName}
              disabled={busy}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-xs btn-outline"
              disabled={!newCollectionName.trim() || busy}
              onClick={() => void handleCreateCollection()}
            >
              Создать
            </button>
            {selectedCollection?.kind === 'user' ? (
              <button
                type="button"
                className="btn btn-xs btn-error btn-outline"
                disabled={busy}
                onClick={() => void handleDeleteCollection()}
              >
                Удалить коллекцию
              </button>
            ) : null}
            {selection.kind === 'node' && selection.collectionId === BUFFER_COLLECTION_ID ? (
              <button
                type="button"
                className="btn btn-xs btn-error btn-outline"
                disabled={
                  busy ||
                  !active ||
                  (selectedCollection?.sampleCount ??
                    (snapshot.samplesByCollection[BUFFER_COLLECTION_ID] ?? []).length) === 0
                }
                onClick={() => void handleClearBuffer()}
              >
                {busy ? 'Очистка…' : 'Очистить буфер'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </aside>
  );
}

interface NodeTreeItemProps {
  readonly node: MembraneNodeLibrary;
  readonly selection: CabinetSampleLibraryModel['selection'];
  readonly expandedNodes: Set<string>;
  readonly snapshot: CabinetSampleLibraryModel['snapshot'];
  readonly active: boolean;
  readonly onSelectPaired: (node: MembraneNodeLibrary) => void;
  readonly onSelectOffline: (node: MembraneNodeLibrary) => void;
  readonly onToggleExpanded: (nodeId: string) => void;
  readonly onSelectCollection: (node: MembraneNodeLibrary, collectionId: string) => void;
}

function NodeTreeItem({
  node,
  selection,
  expandedNodes,
  snapshot,
  active,
  onSelectPaired,
  onSelectOffline,
  onToggleExpanded,
  onSelectCollection,
}: NodeTreeItemProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isActiveNode = selection.kind !== 'catalog' && selection.nodeId === node.id;
  const nodeCollections =
    isActiveNode && active && selection.kind === 'node' ? snapshot.collections : [];

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={`btn btn-sm min-w-0 flex-1 justify-start ${
            isActiveNode ? 'btn-primary' : 'btn-ghost'
          }`}
          onClick={() => {
            if (node.paired) onSelectPaired(node);
            else onSelectOffline(node);
          }}
        >
          <span className="truncate">{node.label}</span>
          {!node.paired ? (
            <span className="badge badge-ghost badge-xs ml-auto">offline</span>
          ) : null}
        </button>
        {node.paired ? (
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0 px-2"
            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
            onClick={() => {
              onToggleExpanded(node.id);
              if (!isExpanded) onSelectPaired(node);
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : null}
      </div>

      {node.paired && isExpanded && isActiveNode && active ? (
        <ul className="ml-2 mt-1 flex flex-col gap-0.5 border-l border-base-content/10 pl-2">
          {nodeCollections.map((col) => (
            <li key={col.id}>
              <button
                type="button"
                className={`btn btn-xs h-auto min-h-8 w-full justify-between gap-2 py-1.5 normal-case ${
                  selection.kind === 'node' && selection.collectionId === col.id
                    ? 'btn-outline btn-primary'
                    : 'btn-ghost'
                }`}
                onClick={() => onSelectCollection(node, col.id)}
              >
                <span className="min-w-0 truncate text-left">{col.name}</span>
                <span className="badge badge-ghost badge-xs shrink-0 tabular-nums">
                  {col.sampleCount ?? (snapshot.samplesByCollection[col.id] ?? []).length}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
