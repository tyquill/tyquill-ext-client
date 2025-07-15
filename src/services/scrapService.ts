/**
 * Scrap Service
 * 
 * @description 스크랩 데이터를 백엔드 API와 통신하는 서비스
 * 웹 페이지 콘텐츠를 백엔드로 전송하여 저장
 */

import { ScrapResult } from '../utils/webClipper';
import { API_BASE_URL } from '../config/environment';

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
}

export class ScrapService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  /**
   * 인증 토큰 가져오기
   */
  private async getAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['authState'], (result) => {
        const authState = result.authState;
        resolve(authState?.accessToken || null);
      });
    });
  }

  /**
   * API 요청 헬퍼
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const url = `${this.apiUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    console.log('🌐 API Request:', { url, method: config.method || 'GET' });

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      if (response.status === 401) {
        throw new Error('Authentication failed');
      }
      
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Response:', data);
    
    return data;
  }

  /**
   * 웹 페이지 콘텐츠를 스크랩으로 저장
   */
  async createScrap(scrapData: CreateScrapDto): Promise<ScrapResponse> {
    try {
      console.log('📝 Creating scrap:', {
        url: scrapData.url,
        title: scrapData.title,
        contentLength: scrapData.content.length,
      });

      const response = await this.apiRequest<ScrapResponse>('/v1/scraps', {
        method: 'POST',
        body: JSON.stringify(scrapData),
      });

      console.log('✅ Scrap created successfully:', {
        scrapId: response.scrapId,
        title: response.title,
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to create scrap:', error);
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
      console.log('📋 Fetching scraps list');

      const response = await this.apiRequest<ScrapResponse[]>('/v1/scraps', {
        method: 'GET',
      });

      console.log('✅ Scraps fetched successfully:', {
        count: response.length,
      });

      return response;
    } catch (error) {
      console.error('❌ Failed to fetch scraps:', error);
      throw error;
    }
  }

  /**
   * 스크랩 삭제
   */
  async deleteScrap(scrapId: number): Promise<void> {
    try {
      console.log('🗑️ Deleting scrap:', scrapId);

      await this.apiRequest<void>(`/v1/scraps/${scrapId}`, {
        method: 'DELETE',
      });

      console.log('✅ Scrap deleted successfully:', scrapId);
    } catch (error) {
      console.error('❌ Failed to delete scrap:', error);
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
}

// 전역 스크랩 서비스 인스턴스
export const scrapService = new ScrapService();