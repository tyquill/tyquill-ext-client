/**
 * Unified Content Service
 *
 * @description Service for fetching scraps and articles in a unified view
 */

import { globalApiClient } from './globalApiClient';
import { ScrapResponse } from './scrapService';
import { ArticleResponse } from './articleService';

/**
 * Unified content item (discriminated union)
 */
export type UnifiedContentItem =
  | { type: 'SCRAP'; data: ScrapResponse }
  | { type: 'ARTICLE'; data: ArticleResponse };

/**
 * Unified content query parameters
 */
export interface UnifiedContentQuery {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  type?: 'scrap' | 'article' | 'all';
  search?: string;
  tags?: string[];
  folderId?: string;
}

/**
 * Unified content response
 */
export interface UnifiedContentResponse {
  items: UnifiedContentItem[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

export class UnifiedContentService {
  /**
   * API request helper - uses global client
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    version: 'v1' = 'v1'
  ): Promise<T> {
    const versionedEndpoint = `/${version}${endpoint}`;
    return globalApiClient.request<T>(versionedEndpoint, options as any);
  }

  /**
   * Get unified content (scraps + articles)
   */
  async getUnifiedContent(query: UnifiedContentQuery = {}): Promise<UnifiedContentResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (query.page) queryParams.append('page', query.page.toString());
      if (query.limit) queryParams.append('limit', query.limit.toString());
      if (query.sortBy) queryParams.append('sortBy', query.sortBy);
      if (query.sortOrder) queryParams.append('sortOrder', query.sortOrder);
      if (query.type) queryParams.append('type', query.type);
      if (query.search) queryParams.append('search', query.search);
      if (query.folderId) queryParams.append('folderId', query.folderId);
      if (query.tags && query.tags.length > 0) {
        query.tags.forEach(tag => queryParams.append('tags', tag));
      }

      const endpoint = `/content/unified${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const apiResponse = await this.apiRequest<any>(endpoint, {
        method: 'GET',
      });

      console.log('🔍 API Response:', apiResponse);

      // Transform flat API response to nested structure expected by frontend
      const transformedItems: UnifiedContentItem[] = apiResponse.items.map((item: any) => {
        if (item.type === 'scrap') {
          return {
            type: 'SCRAP' as const,
            data: {
              scrapId: parseInt(item.id),
              title: item.title,
              content: item.contentPreview || '',
              htmlContent: '', // Not provided in unified API response
              url: item.url || '',
              type: item.scrapType,
              heroImageUrl: item.heroImageUrl,
              faviconUrl: item.faviconUrl,
              tags: item.tags || [],
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              folderId: item.folderId,
              contentInfo: {
                text: item.contentPreview,
              },
            },
          };
        } else if (item.type === 'article') {
          return {
            type: 'ARTICLE' as const,
            data: {
              articleId: parseInt(item.id),
              title: item.title || '',
              content: item.contentPreview || '',
              topic: item.topic,
              keyInsight: item.keyInsight,
              generationStatus: item.generationStatus,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              folderId: item.folderId,
            },
          };
        }
        return null as any;
      }).filter(Boolean);

      console.log('🔍 Transformed items:', transformedItems);

      return {
        items: transformedItems,
        total: apiResponse.total,
        hasMore: apiResponse.hasMore,
        page: apiResponse.page,
        limit: apiResponse.limit,
      };
    } catch (error) {
      console.error('❌ Error fetching unified content:', error);
      throw error;
    }
  }
}

// Global unified content service instance
export const unifiedContentService = new UnifiedContentService();
