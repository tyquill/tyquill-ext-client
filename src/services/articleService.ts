/**
 * Article Service
 * 
 * @description 아티클 관리 서비스 - 백엔드 articles controller와 연동
 */

import { globalApiClient } from './globalApiClient';
import { trackAiDraftCompletedBridge } from '../analytics/bridge';

/**
 * 아티클 생성 DTO
 */
export interface CreateArticleDto {
    title: string;
    content: string;
    summary?: string;
    tags?: string[];
}

/**
 * 스크랩별 코멘트 인터페이스
 */
export interface ScrapWithOptionalComment {
    scrapId: number;
    userComment?: string;
}

/**
 * 아티클 생성 (AI 생성) DTO
 */
export interface GenerateArticleDto {
    topic: string;
    keyInsight: string;
    scrapWithOptionalComment?: ScrapWithOptionalComment[];
    generationParams?: string;
    articleStructureTemplate?: TemplateSection[];
    writingStyleId?: number; // writingStyleReferenceUrl에서 변경
}

/**
 * V2 API 아티클 생성 DTO
 */
export interface GenerateArticleV2Dto {
    topic: string;
    keyInsight: string;
    scrapWithOptionalComment?: ScrapWithOptionalComment[];
    generationParams?: string;
    articleStructureTemplate?: TemplateSection[];
    writingStyleId?: number;
}

/**
 * V3 API 아티클 생성 DTO (PDF 지원)
 */
export interface GenerateArticleV3Dto {
    topic: string;
    keyInsight: string;
    scrapWithOptionalComment?: ScrapWithOptionalComment[];
    generationParams?: string;
    articleStructureTemplate?: TemplateSection[];
    writingStyleId?: number;
    uploadWithUsagePrompt?: UploadWithUsagePromptDto[];
}

/**
 * 업로드 파일과 사용 프롬프트 DTO
 */
export interface UploadWithUsagePromptDto {
    uploadedFileId: number;
    usagePrompt: string;
}

/**
 * 아티클 업데이트 DTO
 */
export interface UpdateArticleDto {
    title?: string;
    content?: string;
    contentFormat?: 'markdown' | 'tiptap-json';
    summary?: string;
    tags?: string[];
}

/**
 * 템플릿 구조 분석 DTO
 */
export interface AnalyzeContentDto {
    content: string;
}

/**
 * 템플릿 섹션 인터페이스
 */
export interface TemplateSection {
    title: string;
    keyIdea: string;
    children?: TemplateSection[];
    
    id?: string; // 고유 식별자 추가
}

export interface AnalyzeContentResponse {
    sections: TemplateSection[];
}

/**
 * 아티클 생성 응답 타입 (generate API 전용)
 */
export interface GenerateArticleResponse {
    id: number;
    title: string;
    content: string;
    createdAt: string;
    userId: number;
}

/**
 * V2 API 비동기 생성 응답
 */
export interface GenerateArticleV2Response {
    articleId: number;
    status: 'processing' | 'completed' | 'failed';
    message: string;
    createdAt: string;
}

/**
 * V2 API 상태 확인 응답
 */
export interface ArticleStatusV2Response {
    articleId: number;
    status: 'processing' | 'completed' | 'failed';
    title?: string;
    content?: string;
    createdAt: string;
}

/**
 * V3 API 비동기 생성 응답 (PDF 지원)
 */
export type GenerateArticleV3Response = GenerateArticleV2Response;

/**
 * V3 API 상태 확인 응답 (PDF 지원)
 */
export type ArticleStatusV3Response = ArticleStatusV2Response;

/**
 * 아카이브 응답 타입
 */
export interface ArchiveResponse {
    archiveId: number;
    title: string;
    content: string;
    contentFormat?: 'markdown' | 'tiptap-json';
    versionNumber: number;
    createdAt: string;
}

/**
 * 아티클 응답 타입
 */
export interface ArticleResponse {
    articleId: number;
    title: string;
    content: string;
    contentFormat?: 'markdown' | 'tiptap-json';
    topic: string;
    keyInsight: string;
    generationParams?: string;
    summary?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    archives?: ArchiveResponse[];
}

export class ArticleService {
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
     * 아티클 생성
     * POST /api/v1/articles
     */
    async createArticle(articleData: CreateArticleDto): Promise<ArticleResponse> {
        return this.apiRequest('/v1/articles', {
            method: 'POST',
            body: JSON.stringify(articleData),
        });
    }

    /**
     * AI로 아티클 생성
     * POST /api/v1/articles/generate
     */
  async generateArticle(generateData: GenerateArticleDto): Promise<GenerateArticleResponse> {
        try { await trackAiDraftCompletedBridge({ flow: 'v1', trigger: 'request' }) } catch {}
        const res = await this.apiRequest<GenerateArticleResponse>('/v1/articles/generate', {
            method: 'POST',
            body: JSON.stringify(generateData),
        });
        return res;
    }

    /**
     * 현재 사용자의 아티클 목록 조회
     * GET /api/v1/articles
     */
    async getArticles(): Promise<ArticleResponse[]> {
        return this.apiRequest('/v1/articles', {
            method: 'GET',
        });
    }

    /**
     * 특정 아티클 조회
     * GET /api/v1/articles/:id
     */
    async getArticle(articleId: number): Promise<ArticleResponse> {
        return this.apiRequest(`/v1/articles/${articleId}`, {
            method: 'GET',
        });
    }

    /**
     * 아티클 검색
     * GET /api/v1/articles/search?q=검색어
     */
    async searchArticles(query: string): Promise<ArticleResponse[]> {
        return this.apiRequest(`/v1/articles/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
        });
    }

    /**
     * 아티클 업데이트
     * PATCH /api/v1/articles/:id
     */
    async updateArticle(articleId: number, updateData: UpdateArticleDto): Promise<ArticleResponse> {
        return this.apiRequest(`/v1/articles/${articleId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
        });
    }

    /**
     * 아티클 삭제
     * DELETE /api/v1/articles/:id
     */
    async deleteArticle(articleId: number): Promise<void> {
        return this.apiRequest(`/v1/articles/${articleId}`, {
            method: 'DELETE',
        });
    }

    /**
     * 아티클 아카이브
     * POST /api/v1/articles/:id/archive
     */
    async archiveArticle(articleId: number): Promise<void> {
        return this.apiRequest(`/v1/articles/${articleId}/archive`, {
            method: 'POST',
        });
    }

    /**
     * 배치 아티클 삭제
     * DELETE /api/v1/articles/batch
     */
    async deleteBatchArticles(articleIds: number[]): Promise<void> {
        return this.apiRequest('/v1/articles/batch', {
            method: 'DELETE',
            body: JSON.stringify(articleIds),
        });
    }

    /**
     * 콘텐츠 분석하여 템플릿 구조 생성
     * POST /api/v1/articles/analyze-template
     */
    async analyzeContentForTemplate(analyzeData: AnalyzeContentDto): Promise<AnalyzeContentResponse> {
        return await this.apiRequest('/v1/articles/analyze-structure', {
            method: 'POST',
            body: JSON.stringify(analyzeData),
        });
    }

    // ========== V2 API (비동기 생성) ==========

    /**
     * V2: AI로 아티클 비동기 생성
     * POST /api/v2/articles/generate
     */
    async generateArticleV2(generateData: GenerateArticleV2Dto): Promise<GenerateArticleV2Response> {
        try { await trackAiDraftCompletedBridge({ flow: 'v2', trigger: 'request' }) } catch {}
        const res = await this.apiRequest<GenerateArticleV2Response>('/v2/articles/generate', {
            method: 'POST',
            body: JSON.stringify(generateData),
        });
        return res;
    }

    /**
     * V2: 아티클 생성 상태 확인
     * GET /api/v2/articles/:id/status
     */
    async getArticleStatusV2(articleId: number): Promise<ArticleStatusV2Response> {
        return this.apiRequest(`/v2/articles/${articleId}/status`, {
            method: 'GET',
        });
    }

    /**
     * V2: 현재 사용자의 아티클 목록 조회 (상태 정보 포함)
     * GET /api/v2/articles
     */
    async getArticlesV2(): Promise<any[]> {
        return this.apiRequest('/v2/articles', {
            method: 'GET',
        });
    }

    /**
     * V2: 폴링을 통한 아티클 완성 대기
     * @param articleId 대기할 아티클 ID
     * @param maxAttempts 최대 시도 횟수 (기본: 30회)
     * @param interval 폴링 간격 (기본: 5초)
     * @returns 완성된 아티클 정보 또는 타임아웃/에러
     */
  async waitForArticleCompletion(
        articleId: number, 
        maxAttempts: number = 60, 
        interval: number = 5000
    ): Promise<ArticleStatusV2Response> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const status = await this.getArticleStatusV2(articleId);
                
                if (status.status === 'completed' || status.status === 'failed') {
                    return status;
                }

                // 마지막 시도가 아니면 대기
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            } catch (error) {
                console.error(`❌ Status check attempt ${attempt} failed:`, error);
                
                // 마지막 시도가 아니면 계속 시도
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                    continue;
                }
                throw error;
            }
        }

        throw new Error(`Article generation timeout after ${maxAttempts} attempts`);
    }

    // ========== V3 API (PDF 지원) ==========

    /**
     * V3: AI로 아티클 비동기 생성 (PDF 지원)
     * POST /api/v3/articles/generate
     */
    async generateArticleV3(generateData: GenerateArticleV3Dto): Promise<GenerateArticleV3Response> {
        try { await trackAiDraftCompletedBridge({ flow: 'v3', trigger: 'request' }) } catch {}
        const res = await this.apiRequest<GenerateArticleV3Response>('/v3/articles/generate', {
            method: 'POST',
            body: JSON.stringify(generateData),
        });
        return res;
    }

    /**
     * V3: 아티클 생성 상태 확인
     * GET /api/v3/articles/:id/status
     */
    async getArticleStatusV3(articleId: number): Promise<ArticleStatusV3Response> {
        return this.apiRequest(`/v3/articles/${articleId}/status`, {
            method: 'GET',
        });
    }

    /**
     * V3: 현재 사용자의 아티클 목록 조회 (PDF 정보 포함)
     * GET /api/v3/articles
     */
    async getArticlesV3(): Promise<any[]> {
        return this.apiRequest('/v3/articles', {
            method: 'GET',
        });
    }

    /**
     * V3: 폴링을 통한 아티클 완성 대기 (PDF 지원)
     * @param articleId 대기할 아티클 ID
     * @param maxAttempts 최대 시도 횟수 (기본: 30회)
     * @param interval 폴링 간격 (기본: 5초)
     * @returns 완성된 아티클 정보 또는 타임아웃/에러
     */
    async waitForArticleCompletionV3(
        articleId: number, 
        maxAttempts: number = 50, 
        interval: number = 5000
    ): Promise<ArticleStatusV3Response> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const status = await this.getArticleStatusV3(articleId);
                
                if (status.status === 'completed' || status.status === 'failed') {
                    return status;
                }

                // 마지막 시도가 아니면 대기
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            } catch (error) {
                console.error(`❌ V3 Status check attempt ${attempt} failed:`, error);
                
                // 마지막 시도가 아니면 계속 시도
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                    continue;
                }
                throw error;
            }
        }

        throw new Error(`V3 Article generation timeout after ${maxAttempts} attempts`);
    }
}

// 전역 아티클 서비스 인스턴스
export const articleService = new ArticleService();
