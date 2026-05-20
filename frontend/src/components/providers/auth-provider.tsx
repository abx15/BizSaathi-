'use client';

import { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { LoadingScreen } from '@/components/common/loading-screen';

const AuthContext = createContext({});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { accessToken, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (accessToken) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setAuth({
              user: res.data.user,
              tenant: res.data.tenant,
              accessToken,
              refreshToken: useAuthStore.getState().refreshToken || "",
            });
          } else {
            logout();
          }
        } catch {
          // Silent failure is okay: handles network drops without instant logouts.
          // In case of explicit 401s, Axios interceptors trigger logouts.
        }
      }
      setLoading(false);
    }
    
    // Defer check to allow client hydration to read from localStorage
    const timeout = setTimeout(() => {
      verifySession();
    }, 100);

    return () => clearTimeout(timeout);
  }, [accessToken, setAuth, logout]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
