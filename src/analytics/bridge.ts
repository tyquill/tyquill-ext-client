import { analytics } from '#analytics'

// PostHog EVENT_NAMES를 GA4 이벤트로 매핑
const EVENT_NAMES = {
  ACQUISITION_SIGNUP_COMPLETED: 'sign_up',
  ACTIVITY_SCRAP_CREATED: 'scrap_created',
  ACTIVITY_AI_DRAFT_COMPLETED: 'ai_draft_completed',
  AUTH_LOGIN: 'login',
  ACTIVITY_TAG_ADDED: 'tag_added',
  ACTIVITY_TAG_REMOVED: 'tag_removed',
  ACTIVITY_SIDEPANEL_OPENED: 'sidepanel_opened',
  ACTIVITY_SIDEPANEL_CLOSED: 'sidepanel_closed',
  // Article Generation Events
  ARTICLE_TOPIC_SET: 'article_topic_set',
  ARTICLE_KEY_MESSAGE_SET: 'article_key_message_set',
  ARTICLE_STYLE_SELECTED: 'article_style_selected',
  ARTICLE_STYLE_CREATE_CLICKED: 'article_style_create_clicked',
  ARTICLE_SECTION_ADDED: 'article_section_added',
  ARTICLE_SECTION_REMOVED: 'article_section_removed',
  ARTICLE_SECTION_ANALYZE_CLICKED: 'article_section_analyze_clicked',
  ARTICLE_REFERENCE_ADDED: 'article_reference_added',
  ARTICLE_REFERENCE_REMOVED: 'article_reference_removed',
  ARTICLE_REFERENCE_MODAL_OPENED: 'article_reference_modal_opened',
  ARTICLE_GENERATION_STARTED: 'article_generation_started',
  // PDF Upload Events
  PDF_UPLOAD_MODAL_OPENED: 'pdf_upload_modal_opened',
  PDF_UPLOAD_SUCCESS: 'pdf_upload_success',
  PDF_UPLOAD_FAILED: 'pdf_upload_failed',
  // Archive Detail Events
  ARCHIVE_CONTENT_COPIED: 'archive_content_copied',
  ARCHIVE_EXPORTED: 'archive_exported',
  ARCHIVE_EDIT_STARTED: 'archive_edit_started',
  ARCHIVE_EDIT_SAVED: 'archive_edit_saved',
  ARCHIVE_EDIT_CANCELLED: 'archive_edit_cancelled',
  ARCHIVE_FULLSCREEN_EDITOR_OPENED: 'archive_fullscreen_editor_opened',
  ARCHIVE_VERSION_CHANGED: 'archive_version_changed',
} as const

export async function captureInBackground(event: string, properties?: Record<string, any>): Promise<void> {
  try {
    await analytics.track(event, properties)
  } catch (error) {
    console.warn('GA4 track failed:', error)
  }
}

export async function trackAiDraftCompletedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_AI_DRAFT_COMPLETED, properties)
}

export async function trackLoginBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.AUTH_LOGIN, properties)
}

export async function trackScrapCreatedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_SCRAP_CREATED, properties)
}

export async function trackTagAddedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_TAG_ADDED, properties)
}

export async function trackTagRemovedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_TAG_REMOVED, properties)
}

export async function trackSidepanelOpenedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_SIDEPANEL_OPENED, properties)
}

export async function trackSidepanelClosedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ACTIVITY_SIDEPANEL_CLOSED, properties)
}

// Article Generation Event Tracking Functions
export async function trackArticleTopicSetBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_TOPIC_SET, properties)
}

export async function trackArticleKeyMessageSetBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_KEY_MESSAGE_SET, properties)
}

export async function trackArticleStyleSelectedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_STYLE_SELECTED, properties)
}

export async function trackArticleStyleCreateClickedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_STYLE_CREATE_CLICKED, properties)
}

export async function trackArticleSectionAddedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_SECTION_ADDED, properties)
}

export async function trackArticleSectionRemovedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_SECTION_REMOVED, properties)
}

export async function trackArticleSectionAnalyzeClickedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_SECTION_ANALYZE_CLICKED, properties)
}

export async function trackArticleReferenceAddedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_REFERENCE_ADDED, properties)
}

export async function trackArticleReferenceRemovedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_REFERENCE_REMOVED, properties)
}

export async function trackArticleReferenceModalOpenedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_REFERENCE_MODAL_OPENED, properties)
}

export async function trackArticleGenerationStartedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARTICLE_GENERATION_STARTED, properties)
}

// PDF Upload Event Tracking Functions
export async function trackPDFUploadModalOpenedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.PDF_UPLOAD_MODAL_OPENED, properties)
}

export async function trackPDFUploadSuccessBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.PDF_UPLOAD_SUCCESS, properties)
}

export async function trackPDFUploadFailedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.PDF_UPLOAD_FAILED, properties)
}

// Archive Detail Event Tracking Functions
export async function trackArchiveContentCopiedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_CONTENT_COPIED, properties)
}

export async function trackArchiveExportedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_EXPORTED, properties)
}

export async function trackArchiveEditStartedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_EDIT_STARTED, properties)
}

export async function trackArchiveEditSavedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_EDIT_SAVED, properties)
}

export async function trackArchiveEditCancelledBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_EDIT_CANCELLED, properties)
}

export async function trackArchiveFullscreenEditorOpenedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_FULLSCREEN_EDITOR_OPENED, properties)
}

export async function trackArchiveVersionChangedBridge(properties?: Record<string, any>): Promise<void> {
  return captureInBackground(EVENT_NAMES.ARCHIVE_VERSION_CHANGED, properties)
}

