/**
 * Scrap Service
 * 
 * @description 스크랩 데이터를 백엔드 API와 통신하는 서비스
 * 웹 페이지 콘텐츠를 백엔드로 전송하여 저장
 */

import { ScrapResult } from '../utils/webClipper';
import { globalApiClient } from './globalApiClient';

/**
 * 스크랩 생성 요청 DTO (기존 서버 엔티티에 맞춤)
 */
export interface CreateScrapDto {
  url: string;
  title: string;
  content: string; // markdown content
  htmlContent: string; // 원본 HTML (선택사항)
  userComment?: string;
  tags?: string[];
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
    options: RequestInit = {}
  ): Promise<T> {
    return globalApiClient.request<T>(endpoint, options as any);
  }

  /**
   * 웹 페이지 콘텐츠를 스크랩으로 저장
   */
  async createScrap(scrapData: CreateScrapDto): Promise<ScrapResponse> {
    try {
      // console.log('📝 Creating scrap:', {
      //   url: scrapData.url,
      //   title: scrapData.title,
      //   contentLength: scrapData.content.length,
      // });

      const response = await this.apiRequest<ScrapResponse>('/v1/scraps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scrapData),
      });

      // console.log('✅ Scrap created successfully:', {
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
    return {
      url: scrapResult.metadata.url,
      title: scrapResult.metadata.title,
      content: scrapResult.content, // markdown content
      htmlContent: '', // 일단 빈 문자열 (필요시 원본 HTML 저장)
      userComment,
      tags: tags || [],
    };
  }

  /**
   * 스크랩 목록 조회
   */
  async getScraps(): Promise<ScrapResponse[]> {
    try {
      // console.log('📋 Fetching scraps list');

      const response = await this.apiRequest<ScrapResponse[]>('/v1/scraps', {
        method: 'GET',
      });

      // console.log('✅ Scraps fetched successfully:', {
      //   count: response.length,
      // });

      return response;
    } catch (error) {
      // console.error('❌ Failed to fetch scraps:', error);
      throw error;
    }
  }

  /**
   * 스크랩 삭제
   */
  async deleteScrap(scrapId: number): Promise<void> {
    try {
      // console.log('🗑️ Deleting scrap:', scrapId);

      await this.apiRequest<void>(`/v1/scraps/${scrapId}`, {
        method: 'DELETE',
      });

      // console.log('✅ Scrap deleted successfully:', scrapId);
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
      // console.log('🏷️ Adding tag to scrap:', { scrapId, tagName });

      const response = await this.apiRequest<TagResponse>(`/v1/scraps/${scrapId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ name: tagName }),
      });

      // console.log('✅ Tag added successfully:', {
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
      // console.log('🏷️ Fetching scrap tags:', scrapId);

      const response = await this.apiRequest<TagResponse[]>(`/v1/scraps/${scrapId}/tags`, {
        method: 'GET',
      });

      // console.log('✅ Scrap tags fetched successfully:', {
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
      // console.log('🗑️ Removing tag from scrap:', { scrapId, tagId });

      await this.apiRequest<void>(`/v1/scraps/${scrapId}/tags/${tagId}`, {
        method: 'DELETE',
      });

      // console.log('✅ Tag removed successfully from scrap:', { scrapId, tagId });
    } catch (error) {
      // console.error('❌ Failed to remove tag from scrap:', error);
      throw error;
    }
  }
}

// 전역 스크랩 서비스 인스턴스
export const scrapService = new ScrapService();