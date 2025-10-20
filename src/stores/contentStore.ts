/**
 * Content Store
 *
 * @description Zustand store for managing unified content and folders
 */

import { create } from 'zustand';
import { FolderResponse, folderService } from '../services/folderService';
import {
  UnifiedContentItem,
  UnifiedContentQuery,
  unifiedContentService,
} from '../services/unifiedContentService';
import { logger } from '../utils/logger';

interface ContentState {
  // Folders
  folders: FolderResponse[];
  selectedFolderId: number | null;
  foldersLoading: boolean;
  foldersError: string | null;

  // Unified Content
  items: UnifiedContentItem[];
  itemsTotal: number;
  itemsHasMore: boolean;
  itemsPage: number;
  itemsLoading: boolean;
  itemsError: string | null;

  // Filters
  contentTypeFilter: 'all' | 'scrap' | 'article';
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortOrder: 'ASC' | 'DESC';

  // UI State
  isFolderSidebarCollapsed: boolean;
  isCreateFolderModalOpen: boolean;
  isMoveFolderModalOpen: boolean;
  selectedItemsForMove: Array<{ type: 'SCRAP' | 'ARTICLE'; id: number }>;

  // Actions - Folders
  loadFolders: () => Promise<void>;
  selectFolder: (folderId: number | null) => void;
  createFolder: (name: string, color?: string, parentId?: number) => Promise<void>;
  updateFolder: (folderId: number, name?: string, color?: string) => Promise<void>;
  deleteFolder: (folderId: number) => Promise<void>;

  // Actions - Content
  loadContent: (append?: boolean) => Promise<void>;
  loadMoreContent: () => Promise<void>;
  refreshContent: () => Promise<void>;

  // Actions - Filters
  setContentTypeFilter: (filter: 'all' | 'scrap' | 'article') => void;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSorting: (sortBy: 'createdAt' | 'updatedAt' | 'title', sortOrder: 'ASC' | 'DESC') => void;

  // Actions - UI
  toggleFolderSidebar: () => void;
  openCreateFolderModal: () => void;
  closeCreateFolderModal: () => void;
  openMoveFolderModal: (items: Array<{ type: 'SCRAP' | 'ARTICLE'; id: number }>) => void;
  closeMoveFolderModal: () => void;
  moveItemsToFolder: (folderId: number) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  // Initial state - Folders
  folders: [],
  selectedFolderId: null,
  foldersLoading: false,
  foldersError: null,

  // Initial state - Content
  items: [],
  itemsTotal: 0,
  itemsHasMore: true,
  itemsPage: 1,
  itemsLoading: false,
  itemsError: null,

  // Initial state - Filters
  contentTypeFilter: 'all',
  searchQuery: '',
  selectedTags: [],
  sortBy: 'createdAt',
  sortOrder: 'DESC',

  // Initial state - UI
  isFolderSidebarCollapsed: false,
  isCreateFolderModalOpen: false,
  isMoveFolderModalOpen: false,
  selectedItemsForMove: [],

  // Actions - Folders
  loadFolders: async () => {
    set({ foldersLoading: true, foldersError: null });
    try {
      const folders = await folderService.getFolders();
      set({ folders, foldersLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load folders';
      logger.error('Failed to load folders:', error);
      set({ foldersError: errorMessage, foldersLoading: false });
    }
  },

  selectFolder: (folderId) => {
    set({ selectedFolderId: folderId });
    // Reset pagination and reload content
    set({ itemsPage: 1, items: [], itemsHasMore: true });
    get().loadContent();
  },

  createFolder: async (name, color, parentId) => {
    try {
      await folderService.createFolder({ name, color, parentId });
      // Reload folders
      await get().loadFolders();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
      logger.error('Failed to create folder:', error);
      throw new Error(errorMessage);
    }
  },

  updateFolder: async (folderId, name, color) => {
    try {
      await folderService.updateFolder(folderId, { name, color });
      // Reload folders
      await get().loadFolders();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update folder';
      logger.error('Failed to update folder:', error);
      throw new Error(errorMessage);
    }
  },

  deleteFolder: async (folderId) => {
    try {
      await folderService.deleteFolder(folderId);
      // If deleted folder was selected, clear selection
      if (get().selectedFolderId === folderId) {
        set({ selectedFolderId: null });
      }
      // Reload folders
      await get().loadFolders();
      // Reload content
      await get().refreshContent();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete folder';
      logger.error('Failed to delete folder:', error);
      throw new Error(errorMessage);
    }
  },

  // Actions - Content
  loadContent: async (append = false) => {
    const state = get();
    set({ itemsLoading: true, itemsError: null });

    try {
      const query: UnifiedContentQuery = {
        page: append ? state.itemsPage : 1,
        limit: 20,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        type: state.contentTypeFilter,
        search: state.searchQuery || undefined,
        tags: state.selectedTags.length > 0 ? state.selectedTags : undefined,
        // When selectedFolderId is null, pass 'null' string to show uncategorized items
        folderId: state.selectedFolderId !== null ? state.selectedFolderId.toString() : 'null',
      };

      const response = await unifiedContentService.getUnifiedContent(query);

      const newItems = append ? [...state.items, ...response.items] : response.items;

      set({
        items: newItems,
        itemsTotal: response.total,
        itemsHasMore: response.hasMore,
        itemsPage: response.page,
        itemsLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load content';
      logger.error('❌ contentStore: Error loading content:', error);
      set({
        itemsError: errorMessage,
        itemsLoading: false,
      });
    }
  },

  loadMoreContent: async () => {
    const state = get();
    if (!state.itemsHasMore || state.itemsLoading) return;

    set({ itemsPage: state.itemsPage + 1 });
    await get().loadContent(true);
  },

  refreshContent: async () => {
    set({ itemsPage: 1, items: [], itemsHasMore: true });
    await get().loadContent();
  },

  // Actions - Filters
  setContentTypeFilter: (filter) => {
    set({ contentTypeFilter: filter, itemsPage: 1, items: [], itemsHasMore: true });
    get().loadContent();
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query, itemsPage: 1, items: [], itemsHasMore: true });
    // Debounce would be ideal here, but for simplicity we'll load immediately
    get().loadContent();
  },

  setSelectedTags: (tags) => {
    set({ selectedTags: tags, itemsPage: 1, items: [], itemsHasMore: true });
    get().loadContent();
  },

  setSorting: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder, itemsPage: 1, items: [], itemsHasMore: true });
    get().loadContent();
  },

  // Actions - UI
  toggleFolderSidebar: () => {
    set({ isFolderSidebarCollapsed: !get().isFolderSidebarCollapsed });
  },

  openCreateFolderModal: () => {
    set({ isCreateFolderModalOpen: true });
  },

  closeCreateFolderModal: () => {
    set({ isCreateFolderModalOpen: false });
  },

  openMoveFolderModal: (items) => {
    set({ isMoveFolderModalOpen: true, selectedItemsForMove: items });
  },

  closeMoveFolderModal: () => {
    set({ isMoveFolderModalOpen: false, selectedItemsForMove: [] });
  },

  moveItemsToFolder: async (folderId) => {
    const { selectedItemsForMove } = get();
    try {
      // Separate scraps and articles
      const scrapIds = selectedItemsForMove
        .filter(item => item.type === 'SCRAP')
        .map(item => item.id);
      const articleIds = selectedItemsForMove
        .filter(item => item.type === 'ARTICLE')
        .map(item => item.id);

      // Call API with backend-compatible format
      await folderService.addItemsToFolder(folderId, {
        scrapIds: scrapIds.length > 0 ? scrapIds : undefined,
        articleIds: articleIds.length > 0 ? articleIds : undefined,
      });

      // Close modal and refresh content
      set({ isMoveFolderModalOpen: false, selectedItemsForMove: [] });
      await get().refreshContent();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to move items to folder';
      logger.error('Failed to move items to folder:', error);
      throw new Error(errorMessage);
    }
  },
}));
