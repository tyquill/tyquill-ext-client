import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Tyquill',
    version: '1.3.1',
    description: 'Tyquill은 뉴스레터 작성에 관한 소모성 작업을 줄이고 창작에 열중할 수 있게 돕습니다.',
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
        "script-src 'self'; object-src 'self'; base-uri 'self'; connect-src 'self' http://localhost:* ws://localhost:* https://us.i.posthog.com https://*.i.posthog.com https://app.posthog.com https://*.posthog.com",
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
