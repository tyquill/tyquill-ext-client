/**
 * Authentication Hook
 * 
 * @description React 컴포넌트에서 인증 상태를 관리하기 위한 커스텀 훅
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, AuthState, User } from '../services/auth.service';

export interface UseAuthReturn {
  // 인증 상태
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  
  // 인증 액션
  login: () => Promise<void>;
  logout: () => Promise<void>;
  
  // 에러 상태
  error: string | null;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>(authService.getAuthState());
  const [error, setError] = useState<string | null>(null);

  // 인증 상태 변경 리스너 등록
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((newState) => {
      setAuthState(newState);
    });

    // 컴포넌트 마운트시 저장된 인증 상태 복원
    authService.restoreAuthState().catch((err) => {
      // console.error('Failed to restore auth state:', err);
    });

    return unsubscribe;
  }, []);

  // 로그인
  const login = useCallback(async () => {
    try {
      setError(null);
      await authService.login();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    try {
      setError(null);
      await authService.logout();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // 에러 초기화
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    isLoading: authState.isLoading,
    login,
    logout,
    error,
    clearError,
  };
};