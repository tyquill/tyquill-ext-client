/**
 * Environment Configuration
 * 
 * @description 개발/배포 환경에 따른 설정 관리
 */

export interface Environment {
  production: boolean;
  serverUrl: string;
  apiUrl: string;
  oauthCallbackPath: string;
}

const development: Environment = {
  production: false,
  serverUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3000/api',
  oauthCallbackPath: '/api/auth/callback',
};

const production: Environment = {
  production: true,
  serverUrl: 'https://yvpd29knkq.ap-northeast-1.awsapprunner.com', // 배포용 서버 URL (도메인 설정 아직 안함)
  apiUrl: 'https://yvpd29knkq.ap-northeast-1.awsapprunner.com/api',
  oauthCallbackPath: '/api/auth/callback',
};

// 빌드 환경 확인 (webpack에서 주입)
const isDevelopment = process.env.NODE_ENV !== 'production';

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
 * OAuth 콜백 URL 생성
 */
export const getOAuthCallbackUrl = (): string => {
  return `${environment.serverUrl}${environment.oauthCallbackPath}`;
};

/**
 * 현재 환경 정보 로그
 */
export const logEnvironmentInfo = (): void => {
  console.log('🌍 Environment Configuration:', {
    production: environment.production,
    serverUrl: environment.serverUrl,
    apiUrl: environment.apiUrl,
  });
};