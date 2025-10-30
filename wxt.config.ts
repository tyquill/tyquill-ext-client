import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/analytics/module'],
  manifest: {
    name: 'Tyquill',
    version: '1.4.5',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // webNavigation: Stibee cross-origin iframe 통신을 위한 getAllFrames() 호출에 필요
    permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'contextMenus', 'sidePanel', 'webNavigation'],
    host_permissions: ['https://maily.so/*', '<all_urls>'],
    icons: {
      16: '/icon16.png',
      32: '/icon32.png',
      48: '/icon48.png',
      128: '/icon128.png',
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; base-uri 'self'; connect-src 'self' https://api.tyquill.ai http://localhost:* ws://localhost:* https://www.google-analytics.com https://analytics.google.com https://*.amazonaws.com",
    },
    web_accessible_resources: [
      {
        resources: ['webviewer.html', 'editor.html', 'pdf.worker.min.js'],
        matches: ['<all_urls>'],
      },
    ],
    action: {
      default_title: 'Open Tyquill Sidebar',
      default_icon: {
        16: '/icon16.png',
        32: '/icon32.png',
        48: '/icon48.png',
        128: '/icon128.png',
      },
    },
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
  webExt: {
    disabled: true, // 개발 시 자동으로 브라우저 열지 않도록 설정
  },
});
