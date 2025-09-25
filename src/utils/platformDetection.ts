/**
 * Platform detection utilities for export functionality
 */

export enum ExportPlatform {
  MAILY = 'maily',
  SUBSTACK = 'substack',
  GHOST = 'ghost',
  LINKEDIN = 'linkedin',
  UNKNOWN = 'unknown'
}

export interface PlatformInfo {
  platform: ExportPlatform;
  isEditorPage: boolean;
  editorSelectors: {
    title?: string;
    content?: string;
    subtitle?: string;
  };
}

/**
 * Detect the current platform and editor state from a URL
 * @param url - The current tab URL
 * @returns PlatformInfo object with detection results
 */
export const detectPlatform = (url: string): PlatformInfo => {
  if (!url) {
    return {
      platform: ExportPlatform.UNKNOWN,
      isEditorPage: false,
      editorSelectors: {}
    };
  }

  // Maily.so detection
  if (url.includes('maily.so') &&
      (url.includes('/edit') || url.includes('/new') || url.includes('/drafts'))) {
    return {
      platform: ExportPlatform.MAILY,
      isEditorPage: true,
      editorSelectors: {
        content: '.codex-editor__redactor'
      }
    };
  }

  // Substack detection
  if (url.includes('substack.com') && url.includes('/publish')) {
    return {
      platform: ExportPlatform.SUBSTACK,
      isEditorPage: true,
      editorSelectors: {
        title: 'textarea#post-title',
        content: '.tiptap.ProseMirror',
        subtitle: 'textarea.subtitle'
      }
    };
  }

  // Ghost detection - improved to handle various Ghost URL patterns
  if (url.includes('ghost.io') && (
      url.includes('/ghost/#/editor') ||
      url.includes('/ghost/editor') ||
      url.includes('/#/editor')
    )) {
    return {
      platform: ExportPlatform.GHOST,
      isEditorPage: true,
      editorSelectors: {
        title: 'textarea.gh-editor-title, textarea[data-test-editor-title-input]',
        content: 'div[data-kg="editor"] div.kg-prose[contenteditable="true"], div.kg-prose[contenteditable="true"]'
      }
    };
  }

  // Ghost detection for self-hosted instances
  if ((url.includes('/ghost/#/editor') || url.includes('/admin/#/editor')) &&
      (url.includes('/edit/') || url.includes('/new/'))) {
    return {
      platform: ExportPlatform.GHOST,
      isEditorPage: true,
      editorSelectors: {
        title: 'textarea.gh-editor-title, textarea[data-test-editor-title-input]',
        content: 'div[data-kg="editor"] div.kg-prose[contenteditable="true"], div.kg-prose[contenteditable="true"]'
      }
    };
  }

  // LinkedIn article editor detection - supports both new and edit URLs
  if (url.includes('linkedin.com') &&
      (url.includes('/article/new/') || url.includes('/article/edit/'))) {
    return {
      platform: ExportPlatform.LINKEDIN,
      isEditorPage: true,
      editorSelectors: {
        title: 'textarea#article-editor-headline__textarea',
        content: 'div.ProseMirror[contenteditable="true"][role="textbox"]'
      }
    };
  }

  return {
    platform: ExportPlatform.UNKNOWN,
    isEditorPage: false,
    editorSelectors: {}
  };
};

/**
 * Check if the given platform is supported for export
 * @param platform - The platform to check
 * @returns True if platform is supported
 */
export const isSupportedPlatform = (platform: ExportPlatform): boolean => {
  return platform === ExportPlatform.MAILY || platform === ExportPlatform.SUBSTACK || platform === ExportPlatform.GHOST || platform === ExportPlatform.LINKEDIN;
};

/**
 * Get display name for a platform
 * @param platform - The platform enum value
 * @returns Human-readable platform name
 */
export const getPlatformDisplayName = (platform: ExportPlatform): string => {
  switch (platform) {
    case ExportPlatform.MAILY:
      return 'Maily';
    case ExportPlatform.SUBSTACK:
      return 'Substack';
    case ExportPlatform.GHOST:
      return 'Ghost';
    case ExportPlatform.LINKEDIN:
      return 'LinkedIn';
    default:
      return 'Unknown';
  }
};