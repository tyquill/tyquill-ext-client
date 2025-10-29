/**
 * Scrap Service
 * 
 * @description 스크랩 데이터를 백엔드 API와 통신하는 서비스
 * 웹 페이지 콘텐츠를 백엔드로 전송하여 저장
 */

import { ScrapResult } from '../utils/webClipper';
import { globalApiClient } from './globalApiClient';
import { trackScrapCreatedBridge, trackTagAddedBridge, trackTagRemovedBridge } from '../analytics/bridge';
import { logger } from '../utils/logger';

/**
 * 웹페이지 사이트 정보
 */
export interface WebpageSiteInfo {
  host?: string;
  favicon_url?: string;
  name?: string;
}

/**
 * 웹페이지 메타데이터
 */
export interface WebpageMetadata {
  url: string;
  site?: WebpageSiteInfo;
  title: string;
  description?: string;
}

/**
 * 콘텐츠 정보
 */
export interface ContentInfo {
  raw?: string; // Raw HTML content (태그 포함)
  plain?: string; // Markdown 형식
  text?: string; // 순수 텍스트만 (태그 제거)
  language?: string;
  format?: string; // reader-html, markdown, etc.
}

/**
 * 작성자 정보
 */
export interface AuthorInfo {
  name?: string;
  picture?: string;
}

/**
 * 스크랩 생성 요청 DTO (확장된 버전)
 */
export interface CreateScrapDto {
  // 기본 필드
  url: string;
  title: string;
  content: string; // markdown content
  htmlContent: string; // 원본 HTML
  userComment?: string;
  tags?: string[];

  // 추가 메타데이터 필드
  webpage?: WebpageMetadata;
  hero_image_url?: string;
  published_at?: string;
  author_names?: string[];
  author_pictures?: string[];
  content_info?: ContentInfo;
  type?: string; // article, video, etc.
  authors?: AuthorInfo[];
  board_id?: string;
  from?: string; // webpage, extension, etc.
}

/**
 * 스크랩 응답 DTO
 */
export interface ScrapResponse {
  scrapId: number;
  url: string;
  title: string;
  content: string;
  htmlContent: string;
  userComment?: string;
  createdAt: string;
  updatedAt: string;
  tags?: TagResponse[];
  contentInfo?: {
    raw?: string;
    plain?: string;
    text?: string;
    language?: string;
    format?: string;
  };
  webpage?: {
    url?: string;
    title?: string;
    description?: string;
    site?: {
      host?: string;
      favicon_url?: string;
      name?: string;
    };
  };
  heroImageUrl?: string;
  publishedAt?: string;
  authors?: Array<{
    name?: string;
    picture?: string;
  }>;
  type?: string;
  scrapType?: string; // 'webclip' or 'upload' - for unified content API
  faviconUrl?: string; // Favicon URL - for unified content API
  from?: string;
  mimeType?: string; // PDF 등 업로드 파일의 MIME 타입
  fileName?: string; // 업로드 파일명
}

/**
 * 태그 생성 DTO
 */
export interface CreateTagDto {
  name: string;
  scrapId?: number;
}

/**
 * 태그 응답 DTO
 */
export interface TagResponse {
  tagId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export class ScrapService {
  /**
   * API 요청 헬퍼 - 글로벌 클라이언트 사용
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    version: 'v1' | 'v2' | 'v3' = 'v1'
  ): Promise<T> {
    const versionedEndpoint = `/${version}${endpoint}`;
    return globalApiClient.request<T>(versionedEndpoint, options as any);
  }

  /**
   * 웹 페이지 콘텐츠를 스크랩으로 저장
   */
  async createScrap(scrapData: CreateScrapDto): Promise<ScrapResponse> {
    try {
      // logger.debug('📝 Creating scrap:', {
      //   url: scrapData.url,
      //   title: scrapData.title,
      //   contentLength: scrapData.content.length,
      // });
      try {
        // Avoid double send when running in background service worker
        if (typeof document !== 'undefined') {
          await trackScrapCreatedBridge({ source: 'extension' })
        }
      } catch {}

      // Use Version 2 API for enhanced metadata
      const response = await this.apiRequest<ScrapResponse>('/scraps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scrapData),
      }, 'v2');

      // logger.debug('✅ Scrap created successfully:', {
      //   scrapId: response.scrapId,
      //   title: response.title,
      // });

      return response;
    } catch (error) {
      // console.error('❌ Failed to create scrap:', error);
      throw error;
    }
  }

  /**
   * ScrapResult를 CreateScrapDto로 변환
   */
  scrapResultToDto(
    scrapResult: ScrapResult,
    userComment?: string,
    tags?: string[]
  ): CreateScrapDto {
    const { metadata } = scrapResult;

    // 웹페이지 메타데이터 구성
    const webpage: WebpageMetadata = {
      url: metadata.url,
      title: metadata.title,
      description: metadata.description,
      site: {
        host: metadata.host || metadata.siteName,
        favicon_url: metadata.favicon,
        name: metadata.siteName,
      },
    };

    // 콘텐츠 정보 구성
    const content_info: ContentInfo = {
      raw: scrapResult.htmlContent, // Raw HTML (태그 포함)
      plain: scrapResult.content, // Markdown 형식
      text: scrapResult.plainText, // 순수 텍스트만
      language: metadata.language,
      format: scrapResult.contentFormat || 'reader-html',
    };

    // 작성자 정보 구성
    const authors: AuthorInfo[] = [];
    if (metadata.authorNames && metadata.authorNames.length > 0) {
      metadata.authorNames.forEach((name, index) => {
        authors.push({
          name,
          picture: metadata.authorPictures?.[index],
        });
      });
    } else if (metadata.author) {
      authors.push({ name: metadata.author });
    }

    return {
      // 기본 필드
      url: metadata.url,
      title: metadata.title,
      content: scrapResult.content, // markdown content
      htmlContent: scrapResult.htmlContent || '', // 원본 HTML
      userComment,
      tags: tags || [],

      // 추가 메타데이터
      webpage,
      hero_image_url: metadata.heroImageUrl || metadata.ogImage,
      published_at: metadata.publishedDate,
      author_names: metadata.authorNames,
      author_pictures: metadata.authorPictures,
      content_info,
      type: 'webclip',
      authors: authors.length > 0 ? authors : undefined,
      from: 'extension',
    };
  }

  /**
   * 스크랩 목록 조회
   */
  async getScraps(): Promise<ScrapResponse[]> {
    try {
      // logger.debug('📋 Fetching scraps list');

      // Use Version 2 API to get enhanced metadata
      const response = await this.apiRequest<ScrapResponse[]>('/scraps', {
        method: 'GET',
      }, 'v2');

      // logger.debug('✅ Scraps fetched successfully:', {
      //   count: response.length,
      // });

      return response;
    } catch (error) {
      // console.error('❌ Failed to fetch scraps:', error);
      throw error;
    }
  }

  /**
   * 스크랩 목록 조회 (v3 - 무한스크롤 지원)
   */
  async getScrapsV3(params: {
    type?: 'webclip' | 'upload';
    page?: number;
    limit?: number;
    sortBy?: 'created_at' | 'updated_at' | 'title';
    sortOrder?: 'ASC' | 'DESC';
  } = {}): Promise<{
    scraps: ScrapResponse[];
    total: number;
    hasMore: boolean;
    page: number;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const endpoint = `/scraps${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await this.apiRequest<{
        scraps: ScrapResponse[];
        total: number;
        hasMore: boolean;
        page: number;
        limit: number;
      }>(endpoint, {
        method: 'GET',
      }, 'v3');

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 스크랩 단건 조회
   */
  async getScrapById(scrapId: number): Promise<ScrapResponse> {
    try {
      // Use Version 2 API for enhanced metadata
      const response = await this.apiRequest<ScrapResponse>(`/scraps/${scrapId}`, {
        method: 'GET',
      }, 'v2');
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 스크랩 삭제
   */
  async deleteScrap(scrapId: number): Promise<void> {
    try {
      // logger.debug('🗑️ Deleting scrap:', scrapId);

      await this.apiRequest<void>(`/scraps/${scrapId}`, {
        method: 'DELETE',
      }, 'v1');

      // logger.debug('✅ Scrap deleted successfully:', scrapId);
    } catch (error) {
      // console.error('❌ Failed to delete scrap:', error);
      throw error;
    }
  }

  /**
   * 빠른 스크랩 (웹 클리퍼에서 직접 사용)
   */
  async quickScrap(
    scrapResult: ScrapResult,
    userComment?: string,
    tags?: string[]
  ): Promise<ScrapResponse> {
    const scrapDto = this.scrapResultToDto(scrapResult, userComment, tags);
    return this.createScrap(scrapDto);
  }

  /**
   * 스크랩에 태그 추가
   */
  async addTagToScrap(scrapId: number, tagName: string): Promise<TagResponse> {
    try {
      // logger.debug('🏷️ Adding tag to scrap:', { scrapId, tagName });

      const response = await this.apiRequest<TagResponse>(`/scraps/${scrapId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ name: tagName }),
      }, 'v1');

      try {
        if (typeof document !== 'undefined') {
          await trackTagAddedBridge({
            scrapId,
            tagName,
            source: 'extension'
          })
        }
      } catch {}

      // logger.debug('✅ Tag added successfully:', {
      //   tagId: response.tagId,
      //   name: response.name,
      //   scrapId,
      // });

      return response;
    } catch (error) {
      // console.error('❌ Failed to add tag to scrap:', error);
      throw error;
    }
  }

  /**
   * 스크랩의 태그 목록 조회
   */
  async getScrapTags(scrapId: number): Promise<TagResponse[]> {
    try {
      // logger.debug('🏷️ Fetching scrap tags:', scrapId);

      const response = await this.apiRequest<TagResponse[]>(`/scraps/${scrapId}/tags`, {
        method: 'GET',
      }, 'v1');

      // logger.debug('✅ Scrap tags fetched successfully:', {
      //   scrapId,
      //   count: response.length,
      // });

      return response;
    } catch (error) {
      // console.error('❌ Failed to fetch scrap tags:', error);
      throw error;
    }
  }

  /**
   * 스크랩에서 태그 제거
   */
  async removeTagFromScrap(scrapId: number, tagId: number): Promise<void> {
    try {
      // logger.debug('🗑️ Removing tag from scrap:', { scrapId, tagId });

      await this.apiRequest<void>(`/scraps/${scrapId}/tags/${tagId}`, {
        method: 'DELETE',
      }, 'v1');

      try {
        if (typeof document !== 'undefined') {
          await trackTagRemovedBridge({
            scrapId,
            tagId,
            source: 'extension'
          })
        }
      } catch {}

      // logger.debug('✅ Tag removed successfully from scrap:', { scrapId, tagId });
    } catch (error) {
      // console.error('❌ Failed to remove tag from scrap:', error);
      throw error;
    }
  }
}

// 전역 스크랩 서비스 인스턴스
export const scrapService = new ScrapService();
