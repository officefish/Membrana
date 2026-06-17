import { useMemo } from 'react';
import { MembranaProvider, Dashboard } from '@membrana/agenda';
import { DeviceBoardModeProvider, DeviceBoardShell, useDeviceBoardMode } from '@membrana/device-board';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { NodeConnectionShell } from './components/NodeConnectionShell';
import { renderPluginSidebarDetails } from './pluginSidebarDetails';
import { createScenarioRuntimeHost } from './modules/device-board/createScenarioRuntimeHost';
import { useDeviceBoardPersistAdapter } from './modules/device-board/useDeviceBoardPersistAdapter';

function AppContentInner() {
  const { isBoardMode } = useDeviceBoardMode();
  const runtimeHost = useMemo(() => createScenarioRuntimeHost(), []);
  const persistAdapter = useDeviceBoardPersistAdapter();

  return (
    <>
      <NodeConnectionShell />
      {isBoardMode ? (
        <DeviceBoardShell runtimeHost={runtimeHost} persistAdapter={persistAdapter} />
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
