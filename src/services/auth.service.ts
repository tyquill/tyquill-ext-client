/**
 * Chrome Extension Authentication Service
 * 
 * @description Chrome Identity API를 사용한 Google OAuth 인증 서비스
 * tyquill-ext-server와 JWT 토큰 기반 인증 연동
 */

import { getServerUrl, getApiUrl, getOAuthCallbackUrl, logEnvironmentInfo } from '../config/environment';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  provider: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
}

class AuthService {
  private readonly SERVER_URL: string;
  private readonly API_URL: string;
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: false,
  };

  constructor() {
    this.SERVER_URL = getServerUrl();
    this.API_URL = getApiUrl();
    
    // 환경 정보 로그
    logEnvironmentInfo();
  }

  /**
   * 일반 OAuth 방식으로 Google 인증 처리
   */
  private async performOAuthFlow(): Promise<string> {
    // 1. 서버에서 OAuth URL 생성
    const oauthConfig = await this.getOAuthConfig();
    
    // 2. 새 탭에서 Google OAuth 페이지 열기
    const authTab = await this.openOAuthTab(oauthConfig.url);
    
    // 3. 콜백 URL에서 인증 코드 추출
    const authCode = await this.waitForAuthCode(authTab);
    
    // 4. 탭 닫기
    chrome.tabs.remove(authTab.id!);
    
    return authCode;
  }

  /**
   * 서버에서 OAuth URL 설정 가져오기
   */
  private async getOAuthConfig(): Promise<{ url: string }> {
    // 서버의 redirect URI를 사용 (Google에 등록된 URI)
    const redirectUri = getOAuthCallbackUrl();
    const response = await fetch(`${this.API_URL}/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}`);
    
    if (!response.ok) {
      throw new Error('Failed to get OAuth URL');
    }
    
    return response.json();
  }

  /**
   * OAuth 탭 열기
   */
  private async openOAuthTab(url: string): Promise<chrome.tabs.Tab> {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url }, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!tab) {
          reject(new Error('Failed to create OAuth tab'));
          return;
        }
        resolve(tab);
      });
    });
  }

  /**
   * 인증 코드 대기 및 추출
   */
  private async waitForAuthCode(tab: chrome.tabs.Tab): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('OAuth timeout'));
      }, 300000); // 5분 타임아웃

      const onUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.url) {
          const url = new URL(changeInfo.url);
          
          // 서버 콜백 URL 확인
          const callbackUrl = new URL(getOAuthCallbackUrl());
          if (url.origin === callbackUrl.origin && url.pathname === callbackUrl.pathname) {
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            if (error) {
              cleanup();
              reject(new Error(`OAuth error: ${error}`));
              return;
            }
            
            if (code) {
              cleanup();
              resolve(code);
              return;
            }
          }
        }
      };

      const onRemoved = (tabId: number) => {
        if (tabId === tab.id) {
          cleanup();
          reject(new Error('OAuth tab was closed'));
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        chrome.tabs.onRemoved.removeListener(onRemoved);
      };

      chrome.tabs.onUpdated.addListener(onUpdated);
      chrome.tabs.onRemoved.addListener(onRemoved);
    });
  }


  /**
   * Google OAuth 코드로 서버 인증
   */
  private async authenticateWithServer(authCode: string): Promise<AuthResponse> {
    // 서버에 등록된 redirect URI를 사용
    const redirectUri = getOAuthCallbackUrl();
    
    const response = await fetch(`${this.API_URL}/auth/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: authCode,
        redirectUri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Server authentication failed');
    }

    return response.json();
  }

  /**
   * 전체 로그인 플로우 실행
   */
  async login(): Promise<AuthResponse> {
    try {
      this.authState.isLoading = true;
      this.notifyStateChange();

      // 1. 일반 OAuth 플로우로 인증 코드 획득
      console.log('🔐 Starting OAuth flow...');
      const authCode = await this.performOAuthFlow();
      
      // 2. 서버에서 JWT 토큰 발급
      console.log('🔐 Authenticating with server...');
      const authResponse = await this.authenticateWithServer(authCode);
      
      // 3. 인증 상태 업데이트
      this.authState = {
        isAuthenticated: true,
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        isLoading: false,
      };

      // 4. 로컬 스토리지에 저장
      await this.saveAuthState();
      this.notifyStateChange();

      console.log('✅ Authentication successful:', authResponse.user.email);
      return authResponse;
    } catch (error) {
      this.authState.isLoading = false;
      this.notifyStateChange();
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    try {
      // 1. 서버에 로그아웃 요청
      if (this.authState.accessToken) {
        await fetch(`${this.API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authState.accessToken}`,
          },
        });
      }

      // 2. 로컬 토큰 정리 (일반 OAuth는 별도 토큰 제거 불필요)
      console.log('🔐 Clearing local tokens...');

      // 3. 로컬 상태 초기화
      this.authState = {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      };

      // 4. 로컬 스토리지 정리
      await this.clearAuthState();
      this.notifyStateChange();

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshToken(): Promise<AuthResponse> {
    if (!this.authState.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.authState.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const authResponse: AuthResponse = await response.json();
      
      // 상태 업데이트
      this.authState.accessToken = authResponse.accessToken;
      this.authState.refreshToken = authResponse.refreshToken;
      this.authState.user = authResponse.user;

      await this.saveAuthState();
      this.notifyStateChange();

      return authResponse;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      // 갱신 실패시 로그아웃 처리
      await this.logout();
      throw error;
    }
  }

  /**
   * 현재 인증 상태 반환
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * 인증된 API 요청을 위한 헤더 반환
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.authState.accessToken) {
      throw new Error('No access token available');
    }

    return {
      'Authorization': `Bearer ${this.authState.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 로컬 스토리지에서 인증 상태 복원
   */
  async restoreAuthState(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['authState']);
      if (result.authState) {
        this.authState = result.authState;
        this.notifyStateChange();
        
        // 토큰 만료 검사
        if (this.isTokenExpired()) {
          console.log('🔐 Token expired, attempting refresh...');
          await this.refreshToken();
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to restore auth state:', error);
      return false;
    }
  }

  /**
   * 로컬 스토리지에 인증 상태 저장
   */
  private async saveAuthState(): Promise<void> {
    await chrome.storage.local.set({ authState: this.authState });
  }

  /**
   * 로컬 스토리지에서 인증 상태 제거
   */
  private async clearAuthState(): Promise<void> {
    await chrome.storage.local.remove(['authState']);
  }

  /**
   * 토큰 만료 검사
   */
  private isTokenExpired(): boolean {
    if (!this.authState.accessToken) return true;
    
    try {
      const payload = JSON.parse(
        atob(this.authState.accessToken.split('.')[1])
      );
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * 상태 변경 리스너들
   */
  private listeners: Array<(state: AuthState) => void> = [];

  /**
   * 인증 상태 변경 리스너 등록
   */
  onAuthStateChange(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 상태 변경 알림
   */
  private notifyStateChange(): void {
    this.listeners.forEach(listener => listener(this.getAuthState()));
  }
}

// 싱글톤 인스턴스 export
export const authService = new AuthService();