/**
 * Favicon Extraction Utility
 *
 * 웹 페이지에서 favicon URL을 추출하는 공통 유틸리티
 * 모든 플랫폼 injector에서 사용됨
 */

// 캐시 변수
let cachedFavicon: string | null = null;
let cachedOrigin: string | null = null;

/**
 * URL이 유효한 favicon URL인지 검증
 * @param url 검증할 URL
 * @returns 유효한 favicon URL이면 true
 */
function isValidFaviconUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // data URI인 경우 크기 제한 (50KB)
    if (parsed.protocol === 'data:') {
      return url.length < 50000;
    }

    // http, https만 허용
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 현재 페이지에서 favicon URL을 추출
 *
 * 우선순위:
 * 1. 32x32 크기의 icon
 * 2. PNG 타입의 icon
 * 3. 일반 icon
 * 4. shortcut icon
 * 5. apple-touch-icon
 * 6. 폴백: /favicon.ico
 *
 * @returns favicon URL (항상 유효한 문자열 반환)
 */
export function extractFavicon(): string {
  try {
    // origin이 변경되면 캐시 초기화 (SPA 네비게이션 대응)
    if (cachedOrigin !== window.location.origin) {
      cachedFavicon = null;
      cachedOrigin = window.location.origin;
    }

    // 캐시된 결과가 있으면 반환
    if (cachedFavicon) {
      return cachedFavicon;
    }

    // 우선순위에 따라 favicon 검색
    const selectors = [
      'link[rel="icon"][sizes="32x32"]',
      'link[rel="icon"][type="image/png"]',
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]'
    ];

    for (const selector of selectors) {
      const iconLink = document.querySelector(selector) as HTMLLinkElement | null;
      if (iconLink?.href && isValidFaviconUrl(iconLink.href)) {
        cachedFavicon = iconLink.href;
        return cachedFavicon;
      }
    }
  } catch (error) {
    console.warn('Failed to extract favicon:', error);
  }

  // 폴백: /favicon.ico
  const fallback = `${window.location.origin}/favicon.ico`;
  cachedFavicon = fallback;
  return fallback;
}

/**
 * 캐시 초기화 (테스트용)
 */
export function resetFaviconCache(): void {
  cachedFavicon = null;
  cachedOrigin = null;
}
