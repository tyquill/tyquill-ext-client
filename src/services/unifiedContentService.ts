/**
 * Unified Content Service
 *
 * @description Service for fetching scraps and articles in a unified view
 */

import { globalApiClient, ApiRequestOptions } from './globalApiClient';
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

/**
 * Raw API item from backend (flat structure)
 */
interface RawApiContentItem {
  id: string;
  type: 'scrap' | 'article';
  title: string;
  contentPreview?: string;
  url?: string;
  scrapType?: string;
  heroImageUrl?: string;
  faviconUrl?: string;
  tags?: (string | { tagId: number; name: string })[];
  topic?: string;
  keyInsight?: string;
  generationStatus?: string;
  createdAt: string;
  updatedAt: string;
  folderId?: number;
}

/**
 * Raw API response from backend
 */
interface RawApiResponse {
  items: RawApiContentItem[];
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
    options: ApiRequestOptions = {},
    version: 'v1' = 'v1'
  ): Promise<T> {
    const versionedEndpoint = `/${version}${endpoint}`;
    return globalApiClient.request<T>(versionedEndpoint, options);
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

      const apiResponse = await this.apiRequest<RawApiResponse>(endpoint, {
        method: 'GET',
      });

      // Transform flat API response to nested structure expected by frontend
      const transformedItems: UnifiedContentItem[] = apiResponse.items
        .map((item: RawApiContentItem): UnifiedContentItem | null => {
          if (item.type === 'scrap') {
            return {
              type: 'SCRAP' as const,
              data: {
                scrapId: parseInt(item.id, 10),
                title: item.title,
                content: item.contentPreview || '',
                htmlContent: '', // Not provided in unified API response
                url: item.url || '',
                type: item.scrapType, // Map scrapType from API to type field
                scrapType: item.scrapType, // Keep scrapType for backward compatibility
                faviconUrl: item.faviconUrl, // Map faviconUrl from API
                heroImageUrl: item.heroImageUrl, // Map heroImageUrl from API
                // Tags can be either string array or object array from API
                tags: (item.tags || []).map((tag: any) => {
                  if (typeof tag === 'string') {
                    return {
                      tagId: 0,
                      name: tag,
                      createdAt: item.createdAt,
                      updatedAt: item.updatedAt,
                    };
                  }
                  // If it's already an object, use it as is
                  return tag;
                }),
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                contentInfo: {
                  text: item.contentPreview,
                },
              },
            };
          } else if (item.type === 'article') {
            return {
              type: 'ARTICLE' as const,
              data: {
                articleId: parseInt(item.id, 10),
                title: item.title || '',
                content: item.contentPreview || '',
                topic: item.topic || '',
                keyInsight: item.keyInsight || '',
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                // Note: generationStatus and folderId are not part of ArticleResponse
              },
            };
          }
          return null;
        })
        .filter((item): item is UnifiedContentItem => item !== null);

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
