import { useMemo } from 'react';
import { MembranaProvider, Dashboard } from '@membrana/agenda';
import { DeviceBoardModeProvider, DeviceBoardShell, useDeviceBoardMode } from '@membrana/device-board';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { NodeConnectionShell } from './components/NodeConnectionShell';
import { renderPluginSidebarDetails } from './pluginSidebarDetails';
import { createScenarioRuntimeHost } from './modules/device-board/createScenarioRuntimeHost';
import { useDeviceBoardPersistAdapter } from './modules/device-board/useDeviceBoardPersistAdapter';
import { useDeviceLive } from './modules/device-board/useDeviceLive';
import { useNodeConnectionStore } from './stores/nodeConnectionStore';

function AppContentInner() {
  const { isBoardMode } = useDeviceBoardMode();
  const runtimeHost = useMemo(() => createScenarioRuntimeHost(), []);
  const persistAdapter = useDeviceBoardPersistAdapter();
  const connectionMode = useNodeConnectionStore((s) => s.mode);
  const deviceLive = useDeviceLive();

  return (
    <>
      <NodeConnectionShell />
      {isBoardMode ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-base-100">
          <div className="min-h-0 flex-1">
            <DeviceBoardShell
              runtimeHost={runtimeHost}
              persistAdapter={persistAdapter}
              deviceLive={connectionMode === 'paired' ? deviceLive : undefined}
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
