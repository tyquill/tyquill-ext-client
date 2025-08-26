/**
 * Environment Configuration
 * 
 * @description 개발/배포 환경에 따른 설정 관리
 */

export interface Environment {
  production: boolean;
  isDevelopment: boolean;
  serverUrl: string;
  apiUrl: string;
  oauthCallbackPath: string;
}

const development: Environment = {
  production: false,
  isDevelopment: true,
  serverUrl: 'https://api.tyquill.ai',
  apiUrl: 'https://api.tyquill.ai/api',
  oauthCallbackPath: '/api/auth/callback',
};

const production: Environment = {
  production: true,
  isDevelopment: false,
  serverUrl: 'https://api.tyquill.ai',
  apiUrl: 'https://api.tyquill.ai/api',
  oauthCallbackPath: '/api/auth/callback',
};

// 빌드 환경 확인 (webpack에서 주입)
declare const process: {
  env: {
    NODE_ENV?: string;
    MIXPANEL_TOKEN?: string;
  };
};

// webpack DefinePlugin으로 주입된 NODE_ENV 직접 확인
const isDevelopment = process.env.NODE_ENV === 'development';

// console.log('🔍 Environment detection:', {
//   nodeEnv: process.env.NODE_ENV,
//   isDevelopment,
//   selectedEnv: isDevelopment ? 'development' : 'production'
// });

export const environment: Environment = isDevelopment ? development : production;

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
 * 현재 환경 정보 로그
 */
export const logEnvironmentInfo = (): void => {
  // console.log('🌍 Environment Configuration:', {
  //   production: environment.production,
  //   serverUrl: environment.serverUrl,
  //   apiUrl: environment.apiUrl,
  // });
};