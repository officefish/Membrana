import { PanelAuthProvider, usePanelAuth } from '@/context/PanelAuthContext';
import { SectionShell } from '@/components/SectionShell';
import { WelcomeScreen } from '@/components/WelcomeScreen';

/** Loading-состояние первого /me — честное, не пустой экран (DESIGN.md/OP3). */
function Gate() {
  const { identity, loading } = usePanelAuth();
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center" aria-busy="true">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Загрузка" />
      </main>
    );
  }
  return identity.role === 'public' ? <WelcomeScreen /> : <SectionShell />;
}

export default function App() {
  return (
    <PanelAuthProvider>
      <Gate />
    </PanelAuthProvider>
  );
}
