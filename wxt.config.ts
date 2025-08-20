import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Tyquill',
    version: '1.2.1',
    description: 'Tyquill은 뉴스레터 작성에 관한 소모성 작업을 줄이고 창작에 열중할 수 있게 돕습니다.',
    permissions: [
      'storage',
      'sidePanel',
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
    side_panel: {
      default_path: 'sidepanel.html'
    },
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
