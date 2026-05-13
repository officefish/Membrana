import { MembranaProvider, Dashboard } from '@membrana/agenda';
import { AppHeader } from './components/AppHeader';
import { AppFooter } from './components/AppFooter';
import { renderPluginSidebarDetails } from './pluginSidebarDetails';

function AppContent() {
  return (
    <Dashboard
      header={<AppHeader />}
      footer={<AppFooter />}
      renderPluginSidebarDetails={renderPluginSidebarDetails}
    />
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
