/**
 * Base API Service Interface
 * 
 * @description 모든 API 서비스의 기본 인터페이스
 */

export interface ApiService {
  apiUrl: string;
  apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T>;
}

/**
 * API 요청 옵션 타입
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * 공통 API 에러 타입
 */
export interface ApiError {
  status: number;
  statusText: string;
  message: string;
}