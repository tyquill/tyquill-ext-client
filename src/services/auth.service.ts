/**
 * Chrome Extension Authentication Service
 * 
 * @description Chrome Identity API를 사용한 Google OAuth 인증 서비스
 * tyquill-ext-server와 JWT 토큰 기반 인증 연동
 */

import { getServerUrl, getApiUrl, getOAuthCallbackUrl, logEnvironmentInfo } from '../config/environment';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { analytics } from '#analytics';
import { trackLoginBridge } from '../analytics/bridge';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  provider: string;
  role?: string;
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
    // Content script에서는 OAuth flow를 직접 실행할 수 없음
    if (this.isContentScriptContext()) {
      throw new Error('OAuth flow must be initiated from background script context. Please use the extension popup or background script.');
    }

    // 1. 서버에서 OAuth URL 생성
    const oauthConfig = await this.getOAuthConfig();

    // 2. 새 탭에서 Google OAuth 페이지 열기
    const authTab = await this.openOAuthTab(oauthConfig.url);

    // 3. 콜백 URL에서 인증 코드 추출
    const authCode = await this.waitForAuthCode(authTab);

    // 4. 탭 닫기
    browser.tabs.remove(authTab.id!);

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
  private async openOAuthTab(url: string): Promise<Browser.tabs.Tab> {
    return new Promise((resolve, reject) => {
      browser.tabs.create({ url }, (tab) => {
        if (browser.runtime.lastError) {
          reject(new Error(browser.runtime.lastError.message));
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
  private async waitForAuthCode(tab: Browser.tabs.Tab): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('OAuth timeout'));
      }, 300000); // 5분 타임아웃

      const onUpdated = (tabId: number, changeInfo: any) => {
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
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.tabs.onRemoved.removeListener(onRemoved);
      };

      browser.tabs.onUpdated.addListener(onUpdated);
      browser.tabs.onRemoved.addListener(onRemoved);
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
   * 웹 클라이언트에서 인증 정보 동기화 (외부에서 호출 가능)
   */
  async syncAuthFromWebClient(): Promise<boolean> {
    try {
      // Content script 컨텍스트에서는 동기화할 수 없음
      if (this.isContentScriptContext()) {
        // console.log('🔐 Skipping web client auth sync in content script context');
        return false;
      }

      // 이미 인증되고 토큰이 유효한 경우에만 스킵
      if (this.authState.isAuthenticated && this.authState.accessToken && !this.isTokenExpired()) {
        return false;
      }

      const webAuth = await this.tryGetAuthFromWebClient();
      if (webAuth) {
        // 웹 클라이언트의 인증 정보 사용
        this.authState = {
          isAuthenticated: true,
          user: webAuth.user,
          accessToken: webAuth.accessToken,
          refreshToken: webAuth.refreshToken,
          isLoading: false,
        };

        // Extension 로컬 스토리지에 저장
        await this.saveAuthState();
        this.notifyStateChange();

        // console.log('✅ Authentication synced from web client:', webAuth.user.email);

        // Analytics
        try {
          await analytics.identify(webAuth.user.id, {
            email: webAuth.user.email,
            full_name: webAuth.user.fullName,
            provider: webAuth.user.provider,
          });
        } catch {}

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to sync auth from web client:', error);
      return false;
    }
  }

  /**
   * 실행 컨텍스트 확인 (content script vs background script)
   */
  private isContentScriptContext(): boolean {
    try {
      // content script에서는 tabs API에 접근할 수 없음
      return !browser.tabs || typeof browser.tabs.query !== 'function';
    } catch {
      return true;
    }
  }

  /**
   * 웹 클라이언트에서 인증 정보 가져오기 시도
   */
  private async tryGetAuthFromWebClient(): Promise<AuthResponse | null> {
    try {
      // Content script 컨텍스트에서는 tabs API를 사용할 수 없으므로 건너뜀
      if (this.isContentScriptContext()) {
        // console.log('🔐 Skipping web client auth check in content script context');
        return null;
      }

      // 웹 클라이언트 탭 찾기
      const tabs = await browser.tabs.query({
        url: ['http://localhost:5173/*', 'https://app.tyquill.ai/*']
      });

      if (tabs.length === 0) {
        return null;
      }

      // 각 탭에서 인증 정보 요청
      for (const tab of tabs) {
        if (tab.id) {
          try {
            // 탭에 스크립트 주입하여 localStorage 읽기
            const [result] = await browser.scripting.executeScript({
              target: { tabId: tab.id },
              world: 'MAIN',
              func: () => {
                const authState = localStorage.getItem('authState');
                if (authState) {
                  return JSON.parse(authState);
                }
                return null;
              },
            });

            if (result?.result?.accessToken) {
              // console.log('🔐 Found auth from web client');
              const authData = result.result;

              // AuthResponse 형식으로 변환
              return {
                accessToken: authData.accessToken,
                refreshToken: authData.refreshToken,
                user: authData.user,
                expiresAt: Date.now() + 3600000, // 1시간
              };
            }
          } catch (error) {
            // console.log('Failed to get auth from tab:', error);
          }
        }
      }
    } catch (error) {
      // console.log('Failed to query tabs:', error);
    }

    return null;
  }

  /**
   * 전체 로그인 플로우 실행
   */
  async login(): Promise<AuthResponse> {
    try {
      this.authState.isLoading = true;
      this.notifyStateChange();

      // 0. 먼저 웹 클라이언트에서 인증 정보 확인 (background script에서만)
      const webAuth = await this.tryGetAuthFromWebClient();
      if (webAuth) {
        // 웹 클라이언트의 인증 정보 사용
        this.authState = {
          isAuthenticated: true,
          user: webAuth.user,
          accessToken: webAuth.accessToken,
          refreshToken: webAuth.refreshToken,
          isLoading: false,
        };

        // Extension 로컬 스토리지에 저장
        await this.saveAuthState();
        this.notifyStateChange();

        // console.log('✅ Authentication synced from web client:', webAuth.user.email);

        // Analytics
        try {
          await analytics.identify(webAuth.user.id, {
            email: webAuth.user.email,
            full_name: webAuth.user.fullName,
            provider: webAuth.user.provider,
          });
        } catch {}

        return webAuth;
      }

      // 1. Content script에서는 background script에 OAuth 요청
      if (this.isContentScriptContext()) {
        // console.log('🔐 Requesting OAuth from background script...');
        const response = await browser.runtime.sendMessage({ action: 'performOAuth' });
        if (!response.success) {
          throw new Error(response.error || 'OAuth failed');
        }
        const authResponse = response.data;

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

        // Analytics 처리는 동일
        try {
          await analytics.identify(authResponse.user.id, {
            email: authResponse.user.email,
            full_name: authResponse.user.fullName,
            provider: authResponse.user.provider,
          });
          try {
            await trackLoginBridge({
              provider: authResponse.user.provider || 'google',
              method: 'oauth',
            })
          } catch {}
          await analytics.track('sign_up', {
            method: authResponse.user.provider || 'google',
          });
        } catch {}

        return authResponse;
      }

      // 1. 일반 OAuth 플로우로 인증 코드 획득 (background script에서만)
      // console.log('🔐 Starting OAuth flow...');
      const authCode = await this.performOAuthFlow();

      // 2. 서버에서 JWT 토큰 발급
      // console.log('🔐 Authenticating with server...');
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

      // console.log('✅ Authentication successful:', authResponse.user.email);

      // Analytics: identify and track signup (once per user)
      try {
        await analytics.identify(authResponse.user.id, {
          email: authResponse.user.email,
          full_name: authResponse.user.fullName,
          provider: authResponse.user.provider,
        });
        // Login event (every login)
        try {
          await trackLoginBridge({
            provider: authResponse.user.provider || 'google',
            method: 'oauth',
          })
        } catch {}

        // Track signup completion (GA4 sign_up event)
        await analytics.track('sign_up', {
          method: authResponse.user.provider || 'google',
        });
      } catch {}

      return authResponse;
    } catch (error) {
      this.authState.isLoading = false;
      this.notifyStateChange();
      // console.error('❌ Authentication failed:', error);
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
      // console.log('🔐 Clearing local tokens...');

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

      // 5. 웹 클라이언트에 로그아웃 알림
      await this.notifyWebClientLogout();

      // console.log('✅ Logout successful');
    } catch (error) {
      // console.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * 웹 클라이언트에 로그아웃 알림
   */
  private async notifyWebClientLogout(): Promise<void> {
    try {
      // Content script 컨텍스트에서는 tabs API를 사용할 수 없음
      if (this.isContentScriptContext()) {
        // console.log('🔐 Skipping web client logout notification in content script context');
        return;
      }

      // 웹 클라이언트 탭 찾기
      const tabs = await browser.tabs.query({
        url: ['http://localhost:5173/*', 'https://app.tyquill.ai/*']
      });

      // 각 탭에 로그아웃 메시지 전송
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await browser.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                // postMessage로 로그아웃 알림 전송
                window.postMessage({
                  type: 'TYQUILL_EXTENSION_LOGOUT',
                  source: 'tyquill-extension'
                }, window.location.origin);
              },
            });
            // console.log('✅ Notified web client of logout');
          } catch (error) {
            // console.log('Failed to notify tab of logout:', error);
          }
        }
      }
    } catch (error) {
      // console.log('Failed to notify web client of logout:', error);
    }
  }

  /**
   * 토큰 갱신
   */
  async refreshToken(): Promise<AuthResponse> {
    if (!this.authState.refreshToken) {
      const restored = await this.restoreAuthState();
      if (!restored) {
        throw new Error('No refresh token available');
      }
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
      // console.error('❌ Token refresh failed:', error);
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
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.authState.accessToken) {
      const refreshAccessToken = await this.refreshToken();
      this.authState.accessToken = refreshAccessToken.accessToken;
      if (!this.authState.accessToken) {
        throw new Error('No access token available');
      }
    }

    // 기본적으로 Authorization만 설정하고, Content-Type은 요청 본문 유형에 맞게 호출부에서 결정
    return {
      'Authorization': `Bearer ${this.authState.accessToken}`,
    };
  }

  /**
   * 로컬 스토리지에서 인증 상태 복원
   */
  async restoreAuthState(): Promise<boolean> {
    try {
      const result = await browser.storage.local.get(['authState']);
      if (result.authState) {
        this.authState = result.authState;
        this.notifyStateChange();
        
        // 토큰 만료 검사
        if (this.isTokenExpired()) {
          // console.log('🔐 Token expired, attempting refresh...');
          await this.refreshToken();
        }

        // Analytics: identify existing user on startup for proper attribution
        try {
          if (this.authState.isAuthenticated && this.authState.user?.id) {
            await analytics.identify(this.authState.user.id, {
              email: this.authState.user.email,
              full_name: this.authState.user.fullName,
              provider: this.authState.user.provider,
            });
          }
        } catch {}
        
        return true;
      }
      return false;
    } catch (error) {
      // console.error('❌ Failed to restore auth state:', error);
      return false;
    }
  }

  /**
   * 로컬 스토리지에 인증 상태 저장
   */
  private async saveAuthState(): Promise<void> {
    await browser.storage.local.set({ authState: this.authState });
  }

  /**
   * 로컬 스토리지에서 인증 상태 제거
   */
  private async clearAuthState(): Promise<void> {
    await browser.storage.local.remove(['authState']);
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
