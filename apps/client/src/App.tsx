import { useMemo } from 'react';
import { MembranaProvider, Dashboard } from '@membrana/agenda';
import {
  DeviceBoardModeProvider,
  DeviceBoardShell,
  useDeviceBoardMode,
} from '@membrana/device-board';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { CaptureAlertToasts } from './components/CaptureAlertToasts';
import { NodeConnectionShell } from './components/NodeConnectionShell';
import { renderPluginSidebarDetails } from './pluginSidebarDetails';
import { createScenarioRuntimeHost } from './modules/device-board/createScenarioRuntimeHost';
import { getDeviceBoardRuntimeController } from './lib/deviceBoardRuntimeController';
import { useDeviceBoardClientBindings } from './modules/device-board/useDeviceBoardClientBindings';
import { useServerFirstFieldUi } from './modules/device-board/useServerFirstBoardState';
import { useDeviceLive } from './modules/device-board/useDeviceLive';
import { useDeviceBoardUserCaseSettings } from './modules/device-board/useDeviceBoardUserCaseSettings';
import { useNodeConnectionStore } from './stores/nodeConnectionStore';

function AppContentInner() {
  const { isBoardMode } = useDeviceBoardMode();
  const runtimeHost = useMemo(() => createScenarioRuntimeHost(), []);
  const { persistAdapter, deviceId } = useDeviceBoardClientBindings();
  const connectionMode = useNodeConnectionStore((s) => s.mode);
  // CSR1: под связью борд делит единый runtime с realtime-мостом (на общем host) —
  // кнопки борда и команды кабинета крутят один инстанс, состояние и журнал
  // двунаправленно синхронизируются с сервером. Без связи — борд создаёт свой.
  const externalRuntime = useMemo(
    () =>
      connectionMode === 'paired'
        ? getDeviceBoardRuntimeController().acquireRuntime(runtimeHost)
        : null,
    [connectionMode, runtimeHost],
  );
  const deviceLive = useDeviceLive();
  const { serverFirstState, showRunControls: serverFirstShowRunControls } =
    useServerFirstFieldUi(connectionMode === 'paired' ? deviceId : null);
  const { catalogEnabled, catalogService } = useDeviceBoardUserCaseSettings();

  const loadUserCaseDocument = useMemo(() => {
    if (!catalogEnabled) {
      return undefined;
    }
    return (id: string) => catalogService.loadDocumentIfEntitled(id, 'microphone');
  }, [catalogEnabled, catalogService]);

  return (
    <>
      <NodeConnectionShell />
      {/* CT5: алерты захвата видимы и в дашборде, и поверх fullscreen-борда (z-60 > z-50). */}
      {connectionMode === 'paired' ? <CaptureAlertToasts /> : null}
      {isBoardMode ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-base-100">
          <div className="min-h-0 flex-1">
            <DeviceBoardShell
              runtimeHost={runtimeHost}
              externalRuntime={externalRuntime}
              persistAdapter={persistAdapter}
              loadUserCaseDocument={loadUserCaseDocument}
              deviceLive={connectionMode === 'paired' ? deviceLive : undefined}
              serverFirstState={connectionMode === 'paired' ? serverFirstState : null}
              showRunControls={connectionMode === 'paired' ? serverFirstShowRunControls : true}
            />
          </div>
        </div>
      ) : (
        <Dashboard
          header={<AppHeader />}
          footer={<AppFooter />}
          renderPluginSidebarDetails={renderPluginSidebarDetails}
        />
      )}
    </>
  );
}

function AppContent() {
  return (
    <DeviceBoardModeProvider>
      <AppContentInner />
    </DeviceBoardModeProvider>
  );
}

function App() {
  return (
    <MembranaProvider initialTheme="dark">
      <AppContent />
    </MembranaProvider>
  );
}

export default App;
