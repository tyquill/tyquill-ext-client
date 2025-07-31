/**
 * Tag Service
 * 
 * @description 태그 관리 서비스 - 백엔드 tags controller와 연동
 */

import { globalApiClient } from './globalApiClient';

/**
 * 태그 생성 DTO
 */
export interface CreateTagDto {
    name: string;
    color?: string;
    description?: string;
}

/**
 * 태그 업데이트 DTO
 */
export interface UpdateTagDto {
    name?: string;
    color?: string;
    description?: string;
}

/**
 * 태그 응답 타입
 */
export interface TagResponse {
    tagId: number;
    name: string;
    color?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export class TagService {
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
     * 태그 생성
     * POST /api/v1/tags
     */
    async createTag(tagData: CreateTagDto, scrapId?: number): Promise<TagResponse> {
        const endpoint = scrapId ? `/v1/tags?scrapId=${scrapId}` : '/v1/tags';
        return this.apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(tagData),
        });
    }

    /**
     * 현재 사용자의 태그 목록 조회
     * GET /api/v1/tags
     */
    async getTags(name?: string, scrapId?: number): Promise<TagResponse[]> {
        let endpoint = '/v1/tags';
        const params = new URLSearchParams();
        
        if (name) params.append('name', name);
        if (scrapId) params.append('scrapId', scrapId.toString());
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }

        return this.apiRequest(endpoint, {
            method: 'GET',
        });
    }

    /**
     * 특정 태그 조회
     * GET /api/v1/tags/:tagId
     */
    async getTag(tagId: number): Promise<TagResponse> {
        return this.apiRequest(`/v1/tags/${tagId}`, {
            method: 'GET',
        });
    }

    /**
     * 태그 업데이트
     * PUT /api/v1/tags/:tagId
     */
    async updateTag(tagId: number, updateData: UpdateTagDto): Promise<TagResponse> {
        return this.apiRequest(`/v1/tags/${tagId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
    }

    /**
     * 태그 삭제
     * DELETE /api/v1/tags/:tagId
     */
    async deleteTag(tagId: number): Promise<void> {
        return this.apiRequest(`/v1/tags/${tagId}`, {
            method: 'DELETE',
        });
    }

    /**
     * 현재 사용자의 고유 태그명 목록
     * GET /api/v1/tags/names
     */
    async getTagNames(): Promise<string[]> {
        return this.apiRequest('/v1/tags/names', {
            method: 'GET',
        });
    }

    /**
     * 특정 스크랩의 태그 목록
     * GET /api/v1/tags/scrap/:scrapId
     */
    async getScrapTags(scrapId: number): Promise<TagResponse[]> {
        return this.apiRequest(`/v1/tags/scrap/${scrapId}`, {
            method: 'GET',
        });
    }
}

// 전역 태그 서비스 인스턴스
export const tagService = new TagService();