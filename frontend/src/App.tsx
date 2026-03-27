import React, { useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { refreshToken as apiRefreshToken } from './services/api';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import JoinRoom from './pages/JoinRoom';
import ResetPassword from './pages/ResetPassword';
import Toast from './components/Toast';

// Decode JWT payload untuk mendapatkan expiry time
const getTokenExpiry = (token: string): number | null => {
  try {
    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null; // convert ke milliseconds
  } catch {
    return null;
  }
};

// Refresh 2 menit sebelum token expired
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  if (token) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};

function App() {
  const { token, user, logoutState } = useAuthStore();
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  const doRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;
    try {
      const newToken = await apiRefreshToken();
      if (newToken) {
        return true;
      }
      logoutState();
      return false;
    } catch (error) {
      logoutState();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [logoutState]);

  const scheduleNextRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    const currentToken = useAuthStore.getState().token;
    if (!currentToken) return;

    const expiry = getTokenExpiry(currentToken);
    if (!expiry) {
      // Kalau nggak bisa baca expiry, fallback ke 13 menit
      refreshTimeoutRef.current = window.setTimeout(async () => {
        const ok = await doRefresh();
        if (ok) scheduleNextRefresh();
      }, 13 * 60 * 1000) as unknown as number;
      return;
    }

    const msUntilExpiry = expiry - Date.now();
    const msUntilRefresh = msUntilExpiry - REFRESH_BUFFER_MS;

    if (msUntilRefresh <= 0) {
      doRefresh().then(ok => { if (ok) scheduleNextRefresh(); });
      return;
    }

    refreshTimeoutRef.current = window.setTimeout(async () => {
      const ok = await doRefresh();
      if (ok) scheduleNextRefresh();
    }, msUntilRefresh) as unknown as number;
  }, [doRefresh]);

  useEffect(() => {
    if (token && user) {
      scheduleNextRefresh();
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [token, user, scheduleNextRefresh]);

  // Apply theme on app mount
  useEffect(() => {
    useThemeStore.getState().applyTheme();
  }, []);

  return (
    <Router>
      <Toast />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Invite / Join Route – accessible without auth */}
        <Route path="/join/:roomId" element={<JoinRoom />} />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
