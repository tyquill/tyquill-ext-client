/**
 * Global API Client
 * 
 * @description 모든 API 서비스에서 공통으로 사용하는 글로벌 API 클라이언트
 * 토큰 만료 시 자동으로 refresh token을 사용하여 access token을 갱신
 */

import { authService } from './auth.service';
import { API_BASE_URL } from '../config/environment';

export interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
  skipAuth?: boolean; // 인증이 필요 없는 요청을 위한 플래그
}

export interface ApiError {
  status: number;
  statusText: string;
  message: string;
}

export class GlobalApiClient {
  private apiUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  /**
   * Access Token 갱신
   */
  private async refreshAccessToken(): Promise<string> {
    // 이미 갱신 중인 경우 기존 Promise 반환
    if (this.isRefreshing && this.refreshPromise) {
      await this.refreshPromise;
      const authState = authService.getAuthState();
      return authState.accessToken!;
    }

    // 갱신 시작
    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
      const authState = authService.getAuthState();
      if (!authState.accessToken) {
        throw new Error('Token refresh failed - no access token received');
      }
      return authState.accessToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * 실제 토큰 갱신 수행
   */
  private async performTokenRefresh(): Promise<void> {
    try {
      await authService.refreshToken();
      console.log('✅ Token refreshed successfully');
    } catch (error) {
      // 갱신 실패시 로그아웃 처리
      await authService.logout();
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 글로벌 API 요청 메서드
   */
  async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, ...requestOptions } = options;

    try {
      // 인증이 필요한 경우 토큰 가져오기
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...requestOptions.headers,
      };

      if (!skipAuth) {
        const authState = authService.getAuthState();
        if (!authState.accessToken) {
          throw new Error('No access token available');
        }
        headers['Authorization'] = `Bearer ${authState.accessToken}`;
      }

      const url = `${this.apiUrl}${endpoint}`;
      const config: RequestInit = {
        ...requestOptions,
        headers,
      };

      const response = await fetch(url, config);

      if (!response.ok) {
        // 401 에러 시 토큰 갱신 후 재시도
        if (response.status === 401 && !skipAuth) {
          try {
            console.log('🔄 401 error detected, refreshing token...');
            const newToken = await this.refreshAccessToken();
            headers['Authorization'] = `Bearer ${newToken}`;
            
            const retryResponse = await fetch(url, { ...config, headers });
            
            if (!retryResponse.ok) {
              throw new Error(`API Error: ${retryResponse.status} ${retryResponse.statusText}`);
            }
            
            console.log('✅ Request retried successfully with new token');
            return await retryResponse.json();
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            // 토큰 갱신 실패시 로그아웃
            await authService.logout();
            throw new Error('Authentication failed');
          }
        }

        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown API error');
    }
  }

  /**
   * GET 요청 헬퍼
   */
  async get<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 요청 헬퍼
   */
  async post<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT 요청 헬퍼
   */
  async put<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH 요청 헬퍼
   */
  async patch<T>(endpoint: string, data?: any, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE 요청 헬퍼
   */
  async delete<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// 글로벌 API 클라이언트 인스턴스
export const globalApiClient = new GlobalApiClient(); 