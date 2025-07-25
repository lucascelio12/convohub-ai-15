import { useAuth } from '@/contexts/AuthContext';
import { Login } from '@/pages/Login';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('AuthGuard - loading:', loading, 'user:', user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('AuthGuard - No user, showing login');
    return <Login />;
  }

  console.log('AuthGuard - User authenticated, showing app');
  return <>{children}</>;
};