import { MembranaProvider, Dashboard } from '@membrana/agenda';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { NodeConnectionShell } from './components/NodeConnectionShell';
import { renderPluginSidebarDetails } from './pluginSidebarDetails';

function AppContent() {
  return (
    <>
      <NodeConnectionShell />
      <Dashboard
        header={<AppHeader />}
        footer={<AppFooter />}
        renderPluginSidebarDetails={renderPluginSidebarDetails}
      />
    </>
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
