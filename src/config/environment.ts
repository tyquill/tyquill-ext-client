/**
 * Environment Configuration
 * 
 * @description 개발/배포 환경에 따른 설정 관리
 */

export interface Environment {
  serverUrl: string;
  apiUrl: string;
  oauthCallbackPath: string;
  webClientUrl: string;
}

const development: Environment = {
  serverUrl: 'https://tyquill-server-production.up.railway.app',
  apiUrl: 'http://localhost:3001/api',
  oauthCallbackPath: '/api/auth/callback',
  webClientUrl: 'http://localhost:5173',
};

const production: Environment = {
  serverUrl: 'https://tyquill-server-production.up.railway.app',
  apiUrl: 'https://tyquill-server-production.up.railway.app/api',
  oauthCallbackPath: '/api/auth/callback',
  webClientUrl: 'https://app.tyquill.ai',
};

// 빌드 환경 확인 (webpack에서 주입)
declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

// webpack DefinePlugin으로 주입된 NODE_ENV 직접 확인
// console.log('🔍 Environment detection:', {
//   nodeEnv: process.env.NODE_ENV,
//   selectedEnv: process.env.NODE_ENV === 'development' ? 'development' : 'production'
// });

export const environment: Environment = process.env.NODE_ENV === 'development' ? development : production;

/**
 * 환경별 서버 URL 반환
 */
export const getServerUrl = (): string => {
  return environment.serverUrl;
};

/**
 * 환경별 API URL 반환
 */
export const getApiUrl = (): string => {
  return environment.apiUrl;
};

/**
 * API Base URL (scrapService에서 사용)
 */
export const API_BASE_URL = environment.apiUrl;

/**
 * OAuth 콜백 URL 생성
 */
export const getOAuthCallbackUrl = (): string => {
  return `${environment.serverUrl}${environment.oauthCallbackPath}`;
};

/**
 * 웹 클라이언트 URL 반환
 */
export const getWebClientUrl = (): string => {
  return environment.webClientUrl;
};

/**
 * 현재 환경 정보 로그
 */
export const logEnvironmentInfo = (): void => {
  // console.log('🌍 Environment Configuration:', {
  //   isProduction: process.env.NODE_ENV === 'production',
  //   serverUrl: environment.serverUrl,
  //   apiUrl: environment.apiUrl,
  // });
};