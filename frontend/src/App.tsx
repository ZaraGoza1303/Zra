import React, { useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import type { User } from './types/chat';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import JoinRoom from './pages/JoinRoom';
import ResetPassword from './pages/ResetPassword';
import Toast from './components/Toast';

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

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 menit
const TOKEN_REFRESH_URL = '/api/auth/refresh';

function App() {
  const { token, user, lastRefreshed, setAuthData, logoutState } = useAuthStore();
  const refreshTimeoutRef = useRef<number | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;

    const currentToken = token || localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    let currentUser: User | null = user;

    if (!currentUser && savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
      } catch {
        currentUser = null;
      }
    }

    if (!currentToken || !currentUser?.refresh_token) return false;

    isRefreshingRef.current = true;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}${TOKEN_REFRESH_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: currentUser.refresh_token
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Token refresh failed');
      }

      if (data.data) {
        const newToken = data.data.access_token;
        const newRefreshToken = data.data.refresh_token;

        const updatedUser = {
          ...currentUser,
          refresh_token: newRefreshToken
        };

        const now = new Date();
        setAuthData(newToken, updatedUser, now);
        console.log('Token refreshed successfully at', now.toLocaleTimeString());
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      if (error instanceof Error &&
        (error.message.includes('expired') || error.message.includes('invalid'))) {
        logoutState();
      }
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [token, user, logoutState, setAuthData]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (!token || !user) return;

    refreshTimeoutRef.current = window.setTimeout(async () => {
      const success = await refreshToken();
      if (success) scheduleRefresh();
    }, REFRESH_INTERVAL) as unknown as number;
  }, [token, user, refreshToken]);

  useEffect(() => {
    if (token && user) {
      if (lastRefreshed) {
        const timeSinceLastRefresh = Date.now() - lastRefreshed.getTime();
        const timeUntilNextRefresh = REFRESH_INTERVAL - timeSinceLastRefresh;

        if (timeUntilNextRefresh <= 0) {
          refreshToken().then(success => {
            if (success) scheduleRefresh();
          });
        } else {
          refreshTimeoutRef.current = window.setTimeout(async () => {
            const success = await refreshToken();
            if (success) scheduleRefresh();
          }, timeUntilNextRefresh) as unknown as number;
        }
      } else {
        scheduleRefresh();
      }
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [token, user, lastRefreshed, refreshToken, scheduleRefresh]);

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
