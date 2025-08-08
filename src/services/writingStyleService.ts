/**
 * Writing Style Service
 * 
 * @description 문체 관리 서비스 - 백엔드 API 연동
 */

import { globalApiClient } from './globalApiClient';

export interface WritingStyleExample {
  id: number;
  content: string;
  order: number;
  createdAt: string;
}

export interface WritingStyle {
  id: number;
  name: string;
  user: {
    id: number;
  };
  examples: WritingStyleExample[];
  createdAt: string;
  updatedAt: string;
}

export interface ScrapedExample {
  title: string;
  content: string; // 마크다운 형식
  url: string;
}

export interface CreateWritingStyleRequest {
  name: string;
  examples: ScrapedExample[]; // 스크랩된 내용 배열
}

export class WritingStyleService {
  private readonly baseUrl = '/api/v1/writing-styles';

  /**
   * 모든 문체 스타일 조회
   */
  async getWritingStyles(): Promise<WritingStyle[]> {
    try {
      const response = await globalApiClient.get<WritingStyle[]>(this.baseUrl);
      return response;
    } catch (error) {
      console.error('Failed to fetch writing styles:', error);
      throw new Error('문체 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 특정 문체 스타일 조회
   */
  async getWritingStyle(id: number): Promise<WritingStyle> {
    try {
      const response = await globalApiClient.get<WritingStyle>(`${this.baseUrl}/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch writing style ${id}:`, error);
      throw new Error('문체를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 새로운 문체 스타일 생성 (클라이언트 스크랩 방식)
   */
  async addWritingStyle(name: string, scrapedExamples: ScrapedExample[]): Promise<WritingStyle> {
    try {
      const requestData: CreateWritingStyleRequest = {
        name,
        examples: scrapedExamples,
      };

      const response = await globalApiClient.post<WritingStyle>(
        this.baseUrl,
        requestData
      );
      return response;
    } catch (error) {
      console.error('Failed to create writing style:', error);
      throw new Error('문체 생성에 실패했습니다.');
    }
  }

  /**
   * URL에서 직접 스크랩하여 문체 스타일 생성
   */
  async addWritingStyleFromUrls(name: string, urls: string[]): Promise<WritingStyle> {
    try {
      // 각 URL을 스크랩하여 ScrapedExample 배열 생성
      const scrapedExamples: ScrapedExample[] = [];
      
      for (const url of urls) {
        try {
          // 새 탭에서 URL 열기 (실제로는 content script에서 스크랩)
          const scrapedData = await this.scrapeUrl(url);
          scrapedExamples.push(scrapedData);
        } catch (error) {
          console.error(`Failed to scrape URL: ${url}`, error);
          // 스크랩 실패 시 빈 예시로 추가
          scrapedExamples.push({
            title: `Failed to scrape: ${url}`,
            content: `스크랩에 실패한 URL: ${url}`,
            url: url,
          });
        }
      }

      return this.addWritingStyle(name, scrapedExamples);
    } catch (error) {
      console.error('Failed to create writing style from URLs:', error);
      throw new Error('문체 생성에 실패했습니다.');
    }
  }

  /**
   * URL 스크랩 (실제로는 content script에서 호출됨)
   */
  private async scrapeUrl(url: string): Promise<ScrapedExample> {
    // 이 메서드는 실제로는 content script에서 호출되어야 함
    // 현재는 임시 구현
    throw new Error('URL 스크랩은 content script에서 처리되어야 합니다.');
  }

  /**
   * 문체 스타일 삭제
   */
  async deleteWritingStyle(id: number): Promise<void> {
    try {
      await globalApiClient.delete<void>(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Failed to delete writing style ${id}:`, error);
      throw new Error('문체 삭제에 실패했습니다.');
    }
  }
}

export const writingStyleService = new WritingStyleService();
