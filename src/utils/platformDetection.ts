/**
 * Platform detection utilities for export functionality
 */

export enum ExportPlatform {
  MAILY = 'maily',
  SUBSTACK = 'substack',
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
  return platform === ExportPlatform.MAILY || platform === ExportPlatform.SUBSTACK;
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
    default:
      return 'Unknown';
  }
};