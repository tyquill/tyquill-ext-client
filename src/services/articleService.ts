/**
 * Article Service
 * 
 * @description 아티클 관리 서비스 - 백엔드 articles controller와 연동
 */

import { getAuthToken } from '../utils/auth/tokenUtil';
import { API_BASE_URL } from '../config/environment';

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
}

/**
 * 아티클 업데이트 DTO
 */
export interface UpdateArticleDto {
    title?: string;
    content?: string;
    summary?: string;
    tags?: string[];
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
 * 아카이브 응답 타입
 */
export interface ArchiveResponse {
    archiveId: number;
    title: string;
    content: string;
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
    private apiUrl: string;

    constructor() {
        this.apiUrl = API_BASE_URL;
    }
    
    private async apiRequest<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = await getAuthToken();

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

        // console.log('🌐 API Request:', { url, method: config.method || 'GET' });

        const response = await fetch(url, config);

        if (!response.ok) {
            const errorText = await response.text();
            // console.error('❌ API Error:', {
            //     status: response.status,
            //     statusText: response.statusText,
            //     error: errorText,
            // });

            if (response.status === 401) {
                throw new Error('Authentication failed');
            }

            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        // console.log('✅ API Response:', data);
        
        return data;
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
        return this.apiRequest('/v1/articles/generate', {
            method: 'POST',
            body: JSON.stringify(generateData),
        });
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
}

// 전역 아티클 서비스 인스턴스
export const articleService = new ArticleService();