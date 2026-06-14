import { useAuth } from '@/context/AuthContext';
import { CabinetShell } from '@/components/CabinetShell';
import { LoginPage } from '@/pages/LoginPage';

export function App() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Загрузка" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <CabinetShell user={user} onLogout={() => void logout()} />;
}
