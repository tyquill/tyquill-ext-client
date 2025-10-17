/**
 * Scrap Types
 *
 * 스크랩 관련 타입 정의
 */

/**
 * 플랫폼 인젝터에서 추출한 스크랩 데이터
 * LinkedIn, X, Reddit, Threads, YouTube 등 모든 플랫폼에서 사용
 */
export interface ScrapExtractedData {
  /** 스크랩된 콘텐츠 (마크다운 형식) */
  content: string;

  /** 스크랩 제목 */
  title?: string;

  /** 스크랩된 페이지 URL */
  url?: string;

  /** 파비콘 URL */
  faviconUrl?: string;

  /** 플랫폼 이름 (예: 'LinkedIn', 'X', 'Reddit') */
  siteName?: string;
}
