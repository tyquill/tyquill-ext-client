/**
 * Folder Service
 *
 * @description Service for managing folders and organizing content
 */

import { globalApiClient } from './globalApiClient';

/**
 * Folder response DTO
 */
export interface FolderResponse {
  folderId: number;
  name: string;
  color?: string;
  parentId?: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  children?: FolderResponse[];
}

/**
 * Create folder DTO
 */
export interface CreateFolderDto {
  name: string;
  color?: string;
  parentId?: number;
}

/**
 * Update folder DTO
 */
export interface UpdateFolderDto {
  name?: string;
  color?: string;
  parentId?: number;
}

/**
 * Folder contents response
 */
export interface FolderContentsResponse {
  folders: FolderResponse[];
  items: Array<{
    itemId: number;
    contentType: 'SCRAP' | 'ARTICLE';
    contentId: number;
    createdAt: string;
  }>;
  total: number;
}

/**
 * Add items to folder DTO - matches backend MoveFolderItemsDto
 */
export interface AddItemsToFolderDto {
  scrapIds?: number[];
  articleIds?: number[];
  targetFolderId?: string | null;
}

export class FolderService {
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
   * Get all folders (hierarchical tree structure)
   */
  async getFolders(): Promise<FolderResponse[]> {
    try {
      const response = await this.apiRequest<FolderResponse[]>('/folders', {
        method: 'GET',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single folder by ID
   */
  async getFolderById(folderId: number): Promise<FolderResponse> {
    try {
      const response = await this.apiRequest<FolderResponse>(`/folders/${folderId}`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new folder
   */
  async createFolder(data: CreateFolderDto): Promise<FolderResponse> {
    try {
      const response = await this.apiRequest<FolderResponse>('/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a folder
   */
  async updateFolder(folderId: number, data: UpdateFolderDto): Promise<FolderResponse> {
    try {
      const response = await this.apiRequest<FolderResponse>(`/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolder(folderId: number): Promise<void> {
    try {
      await this.apiRequest<void>(`/folders/${folderId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get folder contents (scraps and articles)
   */
  async getFolderContents(folderId: number): Promise<FolderContentsResponse> {
    try {
      const response = await this.apiRequest<FolderContentsResponse>(`/folders/${folderId}/contents`, {
        method: 'GET',
      });
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add items to folder
   */
  async addItemsToFolder(folderId: number, data: AddItemsToFolderDto): Promise<void> {
    try {
      await this.apiRequest<void>(`/folders/${folderId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove item from folder
   * Note: Uses addItemsToFolder with targetFolderId: null to match backend API
   */
  async removeItemFromFolder(
    folderId: number,
    contentType: 'SCRAP' | 'ARTICLE',
    contentId: number
  ): Promise<void> {
    try {
      const payload: AddItemsToFolderDto = {
        targetFolderId: null,
      };

      if (contentType === 'SCRAP') {
        payload.scrapIds = [contentId];
      } else if (contentType === 'ARTICLE') {
        payload.articleIds = [contentId];
      }

      await this.addItemsToFolder(folderId, payload);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Move folder to another parent
   */
  async moveFolder(folderId: number, newParentId: number | null): Promise<FolderResponse> {
    try {
      return await this.updateFolder(folderId, { parentId: newParentId || undefined });
    } catch (error) {
      throw error;
    }
  }
}

// Global folder service instance
export const folderService = new FolderService();
