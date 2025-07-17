/**
 * Article Archive Service
 * 
 * @description 아티클 아카이브 관리 서비스 - 백엔드 article-archive controller와 연동
 */

import { API_BASE_URL } from "../config/environment";
import { getAuthToken } from "../utils/auth/tokenUtil";
import { ApiService } from "./apiService";

/**
 * 아티클 아카이브 생성 DTO
 */
export interface CreateArticleArchiveDto {
    title: string;
    content: string;
    summary?: string;
    articleId?: number;
}

/**
 * 아티클 아카이브 업데이트 DTO
 */
export interface UpdateArticleArchiveDto {
    title?: string;
    content?: string;
    summary?: string;
}

/**
 * 아티클 아카이브 응답 타입
 */
export interface ArticleArchiveResponse {
    archiveId: number;
    title: string;
    content: string;
    summary?: string;
    articleId?: number;
    createdAt: string;
    updatedAt: string;
}

export class ArticleArchiveService implements ApiService {
    apiUrl: string;
    
    constructor() {
        this.apiUrl = API_BASE_URL;
    }

    async apiRequest<T>(
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
     * 아티클 아카이브 생성
     * POST /api/v1/article-archive
     */
    async createArchive(archiveData: CreateArticleArchiveDto): Promise<ArticleArchiveResponse> {
        return this.apiRequest('/v1/article-archive', {
            method: 'POST',
            body: JSON.stringify(archiveData),
        });
    }

    /**
     * 아티클 아카이브 목록 조회
     * GET /api/v1/article-archive
     */
    async getArchives(): Promise<ArticleArchiveResponse[]> {
        return this.apiRequest('/v1/article-archive', {
            method: 'GET',
        });
    }

    /**
     * 특정 아티클 아카이브 조회
     * GET /api/v1/article-archive/:id
     */
    async getArchive(archiveId: number): Promise<ArticleArchiveResponse> {
        return this.apiRequest(`/v1/article-archive/${archiveId}`, {
            method: 'GET',
        });
    }

    /**
     * 아티클 아카이브 업데이트
     * PATCH /api/v1/article-archive/:id
     */
    async updateArchive(archiveId: number, updateData: UpdateArticleArchiveDto): Promise<ArticleArchiveResponse> {
        return this.apiRequest(`/v1/article-archive/${archiveId}`, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
        });
    }

    /**
     * 아티클 아카이브 삭제
     * DELETE /api/v1/article-archive/:id
     */
    async deleteArchive(archiveId: number): Promise<void> {
        return this.apiRequest(`/v1/article-archive/${archiveId}`, {
            method: 'DELETE',
        });
    }
}

// 전역 아티클 아카이브 서비스 인스턴스
export const articleArchiveService = new ArticleArchiveService();