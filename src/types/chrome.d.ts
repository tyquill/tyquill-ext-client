declare namespace chrome {
  namespace runtime {
    interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      tlsChannelId?: string;
    }

    const onInstalled: {
      addListener: (callback: () => void) => void;
    };

    const onMessage: {
      addListener: (
        callback: (
          request: any,
          sender: MessageSender,
          sendResponse: (response?: any) => void
        ) => void
      ) => void;
    };
  }

  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      openerTabId?: number;
      selected: boolean;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      audible?: boolean;
      discarded: boolean;
      autoDiscardable: boolean;
      mutedInfo?: MutedInfo;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
    }

    interface MutedInfo {
      muted: boolean;
      reason?: string;
      extensionId?: string;
    }
  }

  namespace action {
    const onClicked: {
      addListener: (callback: (tab: chrome.tabs.Tab) => void) => void;
    };
  }

  namespace sidePanel {
    interface OpenOptions {
      tabId?: number;
      windowId?: number;
    }

    const open: (options: OpenOptions) => Promise<void>;
  }

  namespace identity {
    interface UserInfo {
      email: string;
      id: string;
    }

    const getProfileUserInfo: (options?: { accountStatus?: string }) => Promise<UserInfo>;
  }
} 