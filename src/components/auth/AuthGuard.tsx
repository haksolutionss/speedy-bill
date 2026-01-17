import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth', '/onboarding'];

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, [checkAuth, loadSettings]);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

    if (!isAuthenticated && !isPublicRoute) {
      // Redirect to auth if not authenticated
      navigate('/auth', { replace: true });
    } else if (isAuthenticated && location.pathname === '/auth') {
      // Redirect away from auth if already authenticated
      if (!settings.onboardingComplete) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else if (isAuthenticated && settings.onboardingComplete && location.pathname === '/onboarding') {
      // Redirect away from onboarding if already completed
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate, settings.onboardingComplete]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
