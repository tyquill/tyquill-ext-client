/**
 * Article Service
 *
 * @description 아티클 관리 서비스 - 백엔드 articles controller와 연동
 */

import { globalApiClient } from './globalApiClient';
import { authService } from './auth.service';
import { API_BASE_URL } from '../config/environment';
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
 * 스트리밍 이벤트 타입
 */
export interface StreamEvent {
    type: 'progress' | 'token' | 'node_start' | 'node_complete' | 'complete' | 'error' | 'heartbeat';
    timestamp: number;
    node?: string;
    message?: string;  // Only for error/complete events
    message_ko?: string;  // Korean message for progress/node_start
    message_en?: string;  // English message for progress/node_start
    progress?: number;  // 0-100
    metadata?: any;
    // Token event (real-time content streaming)
    content?: string;  // Partial or full content
    is_final?: boolean;  // Whether this is the final token for a node
    // Complete event
    title?: string;
    analysis_reason?: string;
    warnings?: string[];
    total_duration?: number;
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
 * 버전 히스토리 아이템 인터페이스
 */
export interface VersionHistoryItem {
    versionNumber: number;
    title: string;
    content: string;
    contentFormat: 'markdown' | 'tiptap-json';
    createdAt: string;
    characterCount?: number;
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
     * 아티클 버전 히스토리 조회
     * GET /v1/articles/:id/versions
     */
    async getArticleVersions(articleId: number): Promise<VersionHistoryItem[]> {
        return this.apiRequest(`/v1/articles/${articleId}/versions`, {
            method: 'GET',
        });
    }

    /**
     * 특정 버전으로 복원
     * POST /v1/articles/:id/restore/:versionNumber
     */
    async restoreVersion(articleId: number, versionNumber: number): Promise<ArticleResponse> {
        return this.apiRequest(`/v1/articles/${articleId}/restore/${versionNumber}`, {
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

    /**
     * V3: 실시간 스트리밍으로 아티클 생성 (SSE)
     * POST /api/v3/articles/generate-stream
     * @param generateData 생성 데이터
     * @param onEvent 이벤트 핸들러 콜백
     * @returns Promise<void>
     */
    async generateArticleV3Stream(
        generateData: GenerateArticleV3Dto,
        onEvent: (event: StreamEvent) => void
    ): Promise<void> {
        try {
            await trackAiDraftCompletedBridge({ flow: 'v3-stream', trigger: 'request' });
        } catch {}

        return new Promise(async (resolve, reject) => {
            let eventSource: EventSource | null = null;

            try {
                // Get auth headers
                const authHeaders = await authService.getAuthHeaders();

                // Use fetch to POST and get a stream response
                const response = await fetch(`${API_BASE_URL}/v3/articles/generate-stream`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream',
                        ...authHeaders,
                    },
                    body: JSON.stringify(generateData),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }

                if (!response.body) {
                    throw new Error('Response body is null');
                }

                // Read the stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) {
                        break;
                    }

                    // Decode chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });

                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();

                            if (!data || data === '[DONE]') {
                                continue;
                            }

                            try {
                                const event = JSON.parse(data) as StreamEvent;
                                onEvent(event);

                                // If complete or error, resolve/reject
                                if (event.type === 'complete') {
                                    resolve();
                                    return;
                                } else if (event.type === 'error') {
                                    reject(new Error(event.message || 'Generation failed'));
                                    return;
                                }
                            } catch (parseError) {
                                console.warn('Failed to parse SSE event:', data, parseError);
                            }
                        }
                    }
                }

                resolve();
            } catch (error) {
                console.error('Streaming error:', error);
                if (eventSource) {
                    eventSource.close();
                }
                reject(error);
            }
        });
    }
}

// 전역 아티클 서비스 인스턴스
export const articleService = new ArticleService();
