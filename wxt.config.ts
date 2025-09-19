import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/analytics/module'],
  manifest: {
    name: 'Tyquill',
    version: '1.3.2',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: [
      'storage',
      'sidePanel',
      'tabs',
      'activeTab',
      'scripting',
      'contextMenus'
    ],
    host_permissions: [
      'https://maily.so/*',
      '<all_urls>'
    ],
    icons: {
      16: '/icon16.png',
      32: '/icon32.png',
      48: '/icon48.png',
      128: '/icon128.png'
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'; base-uri 'self'; connect-src 'self' https://api.tyquill.ai http://localhost:* ws://localhost:* https://www.google-analytics.com https://analytics.google.com",
    },
    side_panel: {
      default_path: 'sidepanel.html'
    },
    web_accessible_resources: [
      {
        resources: [
          'webviewer.html',
          'editor.html'
        ],
        matches: ['<all_urls>']
      }
    ],
    action: {
      default_title: 'Open Tyquill Side Panel',
      default_icon: {
        16: '/icon16.png',
        32: '/icon32.png',
        48: '/icon48.png',
        128: '/icon128.png'
      }
    }
  },
  webExt: {
    disabled: true, // 개발 시 자동으로 브라우저 열지 않도록 설정
  },
});
