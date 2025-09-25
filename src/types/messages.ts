/**
 * TypeScript interfaces for Chrome extension message passing
 * Ensures type safety between background script, content script, and sidebar
 */

export interface BaseMessage {
  type?: string;
  action?: string;
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
}

export interface SidebarToggleMessage extends BaseMessage {
  action: 'toggleSidebar';
}

export interface SidebarOpenMessage extends BaseMessage {
  action: 'openSidebar';
}

export interface SidebarCloseMessage extends BaseMessage {
  action: 'closeSidebar';
}

export interface SidebarStateQueryMessage extends BaseMessage {
  action: 'getSidePanelState';
}

export interface SidebarStateResponse {
  success: boolean;
  isOpen: boolean;
}

export interface SidebarClosedNotification extends BaseMessage {
  action: 'sidePanelClosed';
}

export interface SidebarOpenedNotification extends BaseMessage {
  action: 'sidebarOpened';
}

export interface SidebarClosedMessage extends BaseMessage {
  action: 'sidebarClosed';
}

export interface ClipPageMessage extends BaseMessage {
  type: 'CLIP_PAGE';
  options?: {
    includeMetadata?: boolean;
  };
}

export interface SettingsChangedMessage extends BaseMessage {
  type: 'SETTINGS_CHANGED';
  settings: {
    floatingButtonVisible?: boolean;
  };
}

export interface AuthStateMessage extends BaseMessage {
  action: 'getAuthState';
}

export interface ScrapExtractedMessage extends BaseMessage {
  action: 'scrapExtracted';
  data: {
    content: string;
    title?: string;
    url?: string;
  };
}

export interface ClipAndScrapMessage extends BaseMessage {
  action: 'clipAndScrapCurrentPage';
}

export interface ClipForStyleMessage extends BaseMessage {
  action: 'clipCurrentPageForStyle';
}

export interface OpenSidePanelMessage extends BaseMessage {
  action: 'openSidePanel';
}

export interface LogoutMessage extends BaseMessage {
  action: 'logoutFromWebClient';
}

export interface AnalyticsCaptureMessage extends BaseMessage {
  action: 'analytics:capture';
  event: string;
  properties?: Record<string, any>;
}

// Union type for all possible message types
export type ExtensionMessage =
  | PingMessage
  | SidebarToggleMessage
  | SidebarOpenMessage
  | SidebarCloseMessage
  | SidebarStateQueryMessage
  | SidebarClosedNotification
  | SidebarOpenedNotification
  | SidebarClosedMessage
  | ClipPageMessage
  | SettingsChangedMessage
  | AuthStateMessage
  | ScrapExtractedMessage
  | ClipAndScrapMessage
  | ClipForStyleMessage
  | OpenSidePanelMessage
  | LogoutMessage
  | AnalyticsCaptureMessage;

// Response types
export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  authState?: any;
  isOpen?: boolean;
}

// Sidebar state interface
export interface SidebarState {
  isOpen: boolean;
  tabId?: number;
}

// Custom event types for sidebar communication
export interface SidebarStateChangeEvent extends CustomEvent {
  detail: {
    isOpen: boolean;
  };
}

export interface TyquillCustomEvents {
  'tyquill-open-sidebar': CustomEvent;
  'tyquill-close-sidebar': CustomEvent;
  'tyquill-sidebar-state-changed': SidebarStateChangeEvent;
}

declare global {
  interface WindowEventMap extends TyquillCustomEvents {}
}