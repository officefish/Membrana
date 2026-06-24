import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ModuleProps } from '@membrana/agenda';
import {
  useDeviceBoardMode,
  type DeviceBoardSession,
  type DeviceBoardWorkspaceListItem,
} from '@membrana/device-board';

import { useDeviceBoardClientBindings } from './useDeviceBoardClientBindings.js';
import { formatWorkspaceQuotaMessage } from './workspace-tariff.js';
import { isWorkspacePersistConflictError } from './workspace-persist-conflict.js';
import { isWorkspacePersistError } from './workspace-persist-error.js';
import { isWorkspaceQuotaExceededError } from './workspace-quota-error.js';
import { useDeviceBoardUserCaseSettings } from './useDeviceBoardUserCaseSettings.js';
import {
  normalizeDeviceBoardModuleConfig,
  type DeviceBoardModuleConfig,
} from './device-board-module-config.js';
import {
  entitlementBadgeClass,
  entitlementBadgeLabel,
} from './user-case-settings-gate.js';
import type { UserCaseCatalogCard } from '@membrana/usercase-catalog-service';

type LauncherSelection =
  | { readonly kind: 'user-edit'; readonly workspaceId: string; readonly title: string }
  | { readonly kind: 'system-preview'; readonly userCaseId: string; readonly title: string };

function useLauncherAsyncLock(): {
  readonly busyLabel: string | null;
  readonly isBusy: boolean;
  readonly run: <T>(message: string, action: () => Promise<T>) => Promise<T>;
} {
  const depthRef = useRef(0);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const run = useCallback(async <T,>(message: string, action: () => Promise<T>): Promise<T> => {
    depthRef.current += 1;
    setBusyLabel(message);
    try {
      return await action();
    } finally {
      depthRef.current -= 1;
      if (depthRef.current === 0) {
        setBusyLabel(null);
      }
    }
  }, []);

  return { busyLabel, isBusy: busyLabel !== null, run };
}

/** Launcher сценариев над доской: системные RO + мои слоты (U10 W2-module). */
export const DeviceBoardLauncher: React.FC<{
  readonly config: DeviceBoardModuleConfig;
  readonly onUpdateConfig: ModuleProps<DeviceBoardModuleConfig>['onUpdateConfig'];
}> = ({ config, onUpdateConfig }) => {
  const { enterBoardMode, isBoardMode } = useDeviceBoardMode();
  const { workspaceHost, pairSessionKey } = useDeviceBoardClientBindings();
  const { catalogEnabled, catalogService } = useDeviceBoardUserCaseSettings();
  const normalized = normalizeDeviceBoardModuleConfig(config);

  const [workspaces, setWorkspaces] = useState<readonly DeviceBoardWorkspaceListItem[]>([]);
  const [selection, setSelection] = useState<LauncherSelection | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const { busyLabel, isBusy, run } = useLauncherAsyncLock();

  const catalogCards = useMemo(
    () => (catalogEnabled ? catalogService.listCards('microphone') : []),
    [catalogEnabled, catalogService],
  );

  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    const list = await workspaceHost.listWorkspaces();
    setWorkspaces(list);
  }, [workspaceHost]);

  const refreshWorkspacesSilent = useCallback(async (): Promise<void> => {
    try {
      await refreshWorkspaces();
    } catch {
      // Фоновое обновление при возврате на вкладку — без блокировки UI.
    }
  }, [refreshWorkspaces]);

  useEffect(() => {
    void run('Загружаем сценарии…', refreshWorkspaces);
  }, [pairSessionKey, refreshWorkspaces, run]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') {
        void refreshWorkspacesSilent();
      }
    };
    const onFocus = (): void => {
      void refreshWorkspacesSilent();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshWorkspacesSilent]);

  const maxSlots = workspaceHost.maxUserWorkspaces;
  const atQuota = workspaces.length >= maxSlots;

  const openBoard = useCallback(
    async (target: LauncherSelection): Promise<void> => {
      await run('Открываем доску…', async () => {
        setActionError(null);
        try {
          if (target.kind === 'user-edit') {
            await workspaceHost.setActiveWorkspaceId(target.workspaceId);
            const session: DeviceBoardSession = {
              kind: 'user-edit',
              workspaceId: target.workspaceId,
              title: target.title,
            };
            enterBoardMode(session);
            return;
          }
          const session: DeviceBoardSession = {
            kind: 'system-preview',
            userCaseId: target.userCaseId,
            title: target.title,
          };
          enterBoardMode(session);
        } catch (error: unknown) {
          setActionError(error instanceof Error ? error.message : 'Не удалось открыть доску');
        }
      });
    },
    [enterBoardMode, run, workspaceHost],
  );

  const handleCreateWorkspace = useCallback(async (): Promise<void> => {
    await run('Создаём сценарий…', async () => {
      setActionError(null);
      try {
        const used = await workspaceHost.countWorkspaces();
        if (used >= maxSlots) {
          setActionError(formatWorkspaceQuotaMessage(used, maxSlots));
          return;
        }
        const created = await workspaceHost.createWorkspace(
          newWorkspaceTitle.trim() || `Сценарий ${used + 1}`,
        );
        if (created === null) {
          setActionError('Не удалось создать сценарий. Обновите список и проверьте связь с media.');
          return;
        }
        await workspaceHost.setActiveWorkspaceId(created.workspaceId);
        await refreshWorkspaces();
        setNewWorkspaceTitle('');
        const next: LauncherSelection = {
          kind: 'user-edit',
          workspaceId: created.workspaceId,
          title: created.document.meta?.title ?? `Сценарий ${used + 1}`,
        };
        setSelection(next);
      } catch (error: unknown) {
        if (isWorkspaceQuotaExceededError(error)) {
          setActionError(error.message);
          await refreshWorkspaces();
          return;
        }
        if (isWorkspacePersistConflictError(error)) {
          setActionError(error.message);
          return;
        }
        if (isWorkspacePersistError(error)) {
          setActionError(error.message);
          return;
        }
        setActionError(error instanceof Error ? error.message : 'Не удалось создать сценарий');
      }
    });
  }, [maxSlots, newWorkspaceTitle, refreshWorkspaces, run, workspaceHost]);

  const handleRename = useCallback(async (): Promise<void> => {
    if (renameId === null) {
      return;
    }
    await run('Сохраняем название…', async () => {
      setActionError(null);
      const ok = await workspaceHost.renameWorkspace(renameId, renameDraft);
      if (!ok) {
        setActionError('Не удалось переименовать');
        return;
      }
      await refreshWorkspaces();
      if (selection?.kind === 'user-edit' && selection.workspaceId === renameId) {
        setSelection({ ...selection, title: renameDraft.trim() });
      }
      setRenameId(null);
      setRenameDraft('');
    });
  }, [renameDraft, renameId, refreshWorkspaces, run, selection, workspaceHost]);

  const handleDelete = useCallback(
    async (workspaceId: string): Promise<void> => {
      await run('Удаляем сценарий…', async () => {
        setActionError(null);
        const ok = await workspaceHost.deleteWorkspace(workspaceId);
        if (!ok) {
          setActionError('Сценарий не найден');
          return;
        }
        await refreshWorkspaces();
        if (selection?.kind === 'user-edit' && selection.workspaceId === workspaceId) {
          setSelection(null);
        }
      });
    },
    [refreshWorkspaces, run, selection, workspaceHost],
  );

  const handleOpenBoardClick = useCallback((): void => {
    if (selection === null) {
      return;
    }
    void openBoard(selection);
  }, [openBoard, selection]);

  const selectSystemCard = useCallback((card: UserCaseCatalogCard): void => {
    if (!card.canApply) {
      return;
    }
    setSelection({
      kind: 'system-preview',
      userCaseId: card.id,
      title: card.title,
    });
  }, []);

  const selectUserWorkspace = useCallback((item: DeviceBoardWorkspaceListItem): void => {
    setSelection({
      kind: 'user-edit',
      workspaceId: item.workspaceId,
      title: item.title,
    });
  }, []);

  const handleCloneFromUserCase = useCallback(
    async (card: UserCaseCatalogCard): Promise<void> => {
      if (!card.canApply) {
        return;
      }
      if (atQuota) {
        setActionError(formatWorkspaceQuotaMessage(workspaces.length, maxSlots));
        return;
      }
      await run('Клонируем сценарий…', async () => {
        setActionError(null);
        try {
          const source = catalogService.loadDocumentIfEntitled(card.id, 'microphone');
          if (source === null) {
            setActionError('Нет доступа к шаблону');
            return;
          }
          const used = await workspaceHost.countWorkspaces();
          if (used >= maxSlots) {
            setActionError(formatWorkspaceQuotaMessage(used, maxSlots));
            return;
          }
          const created = await workspaceHost.cloneWorkspaceFromUserCase({
            sourceDocument: source,
            userCaseId: card.id,
            title: `${card.title} (копия)`,
          });
          if (created === null) {
            setActionError('Не удалось клонировать сценарий. Проверьте связь с media.');
            return;
          }
          await workspaceHost.setActiveWorkspaceId(created.workspaceId);
          await refreshWorkspaces();
          const next: LauncherSelection = {
            kind: 'user-edit',
            workspaceId: created.workspaceId,
            title: created.document.meta?.title ?? `${card.title} (копия)`,
          };
          setSelection(next);
          await openBoard(next);
        } catch (error: unknown) {
          if (isWorkspaceQuotaExceededError(error)) {
            setActionError(error.message);
            await refreshWorkspaces();
            return;
          }
          if (isWorkspacePersistConflictError(error) || isWorkspacePersistError(error)) {
            setActionError(error.message);
          } else {
            setActionError(error instanceof Error ? error.message : 'Не удалось клонировать');
          }
        }
      });
    },
    [atQuota, catalogService, maxSlots, openBoard, refreshWorkspaces, run, workspaceHost, workspaces.length],
  );

  if (isBoardMode) {
    return (
      <p className="text-sm text-base-content/60">
        Режим доски активен. Закройте его кнопкой «Выйти из доски» в верхней панели редактора.
      </p>
    );
  }

  return (
    <div
      className="relative flex max-w-2xl flex-col gap-5"
      aria-busy={isBusy}
      data-testid="device-board-launcher"
    >
      {isBusy ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-box bg-base-100/85 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          data-testid="device-board-launcher-busy"
        >
          <span className="loading loading-spinner loading-md text-primary" aria-hidden />
          <p className="text-sm text-base-content/70">{busyLabel}</p>
        </div>
      ) : null}

      <div className={isBusy ? 'pointer-events-none select-none opacity-60' : undefined}>
      <p className="text-sm leading-relaxed text-base-content/70">
        Выберите системный шаблон (просмотр и прогон) или свой редактируемый сценарий, затем откройте
        доску. Переключение между сценариями — здесь, не на доске.
      </p>

      {actionError !== null ? (
        <p className="text-xs text-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-base-content">Системные UserCases</h3>
          <label className="label cursor-pointer gap-2 py-0">
            <input
              type="checkbox"
              className="toggle toggle-primary toggle-xs"
              checked={normalized.userCasesCatalogEnabled}
              disabled={isBusy}
              onChange={(event) =>
                onUpdateConfig({ userCasesCatalogEnabled: event.target.checked })
              }
              aria-label="Показывать каталог UserCases"
            />
            <span className="label-text text-xs">Каталог</span>
          </label>
        </div>
        {!catalogEnabled ? (
          <p className="text-xs text-base-content/55">Включите каталог, чтобы выбрать системный шаблон.</p>
        ) : (
          <ul className="space-y-2">
            {catalogCards.map((card) => {
              const isSelected =
                selection?.kind === 'system-preview' && selection.userCaseId === card.id;
              return (
                <li
                  key={card.id}
                  className={`flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-start sm:justify-between ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-base-300/80 bg-base-100'
                  } ${card.entitlement === 'locked' ? 'opacity-60' : ''}`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={!card.canApply || isBusy}
                    data-testid={`device-board-launcher-system-${card.id}`}
                    onClick={() => selectSystemCard(card)}
                  >
                    <p className="text-sm font-medium truncate">{card.title}</p>
                    <p className="text-xs text-base-content/55 mt-0.5">
                      {card.branchCount} веток · только просмотр
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline btn-primary btn-xs"
                      data-testid={`device-board-launcher-clone-${card.id}`}
                      disabled={!card.canApply || atQuota || isBusy}
                      onClick={() => void handleCloneFromUserCase(card)}
                    >
                      Клонировать в мой сценарий
                    </button>
                    <span className={entitlementBadgeClass(card.entitlement)}>
                      {entitlementBadgeLabel(card.entitlement)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-box border border-base-300 bg-base-200/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-base-content">Мои сценарии</h3>
          <span className="badge badge-primary badge-sm">
            {workspaces.length}/{maxSlots}
          </span>
        </div>

        <ul className="space-y-2">
          {workspaces.length === 0 ? (
            <li className="rounded-lg border border-dashed border-base-300 px-3 py-4 text-xs text-base-content/55">
              Пока нет сохранённых сценариев. Создайте пустой ниже или клонируйте системный шаблон.
            </li>
          ) : (
            workspaces.map((item) => {
              const isSelected =
                selection?.kind === 'user-edit' && selection.workspaceId === item.workspaceId;
              const isRenaming = renameId === item.workspaceId;
              return (
                <li
                  key={item.workspaceId}
                  className={`rounded-lg border px-3 py-2 ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-base-300/80 bg-base-100'
                  }`}
                >
                  {isRenaming ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        className="input input-bordered input-xs w-full"
                        value={renameDraft}
                        disabled={isBusy}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        aria-label="Новое название"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          disabled={isBusy}
                          onClick={() => void handleRename()}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={isBusy}
                          onClick={() => {
                            setRenameId(null);
                            setRenameDraft('');
                          }}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        disabled={isBusy}
                        data-testid={`device-board-launcher-workspace-${item.workspaceId}`}
                        onClick={() => selectUserWorkspace(item)}
                      >
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-[10px] text-base-content/50 mt-0.5">
                          {new Date(item.updatedAt).toLocaleString()}
                        </p>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          disabled={isBusy}
                          aria-label={`Переименовать «${item.title}»`}
                          onClick={() => {
                            setRenameId(item.workspaceId);
                            setRenameDraft(item.title);
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          disabled={isBusy}
                          aria-label={`Удалить «${item.title}»`}
                          onClick={() => void handleDelete(item.workspaceId)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>

        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered input-sm min-w-0 flex-1"
            placeholder={`Сценарий ${workspaces.length + 1}`}
            value={newWorkspaceTitle}
            disabled={atQuota || isBusy}
            onChange={(event) => setNewWorkspaceTitle(event.target.value)}
            aria-label="Название нового сценария"
          />
          <button
            type="button"
            className="btn btn-outline btn-primary btn-sm shrink-0"
            data-testid="device-board-launcher-create-workspace"
            disabled={atQuota || isBusy}
            onClick={() => void handleCreateWorkspace()}
          >
            Создать пустой
          </button>
        </div>
        {atQuota ? (
          <p className="text-[10px] text-warning">
            Лимит {maxSlots}/{maxSlots}. Удалите слот, чтобы создать новый.
          </p>
        ) : null}
      </section>

      <button
        type="button"
        className="btn btn-primary w-fit"
        data-testid="device-board-open-board"
        disabled={selection === null || isBusy}
        onClick={handleOpenBoardClick}
      >
        Открыть доску
      </button>
      {selection !== null ? (
        <p className="text-xs text-base-content/55">
          Выбрано: <span className="font-medium text-base-content">{selection.title}</span>
          {selection.kind === 'system-preview' ? ' · только просмотр' : ' · редактирование'}
        </p>
      ) : (
        <p className="text-xs text-base-content/45">Сначала выберите сценарий выше.</p>
      )}
      </div>
    </div>
  );
};
