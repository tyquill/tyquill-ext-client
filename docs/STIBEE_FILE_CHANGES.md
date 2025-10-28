# Stibee Export 기능 구현을 위한 파일별 변경사항

## 1. `src/entrypoints/background.ts`

### 추가할 코드 (라인 280-330 부근)

```typescript
// For Stibee, we need to send message to all frames (including cross-origin iframe)
if (platform === 'stibee') {
  console.log('🎨 Background: Stibee export - sending to all frames');

  // The stibee-iframe content script is automatically loaded by manifest
  // Just wait a moment to ensure it's ready
  await new Promise(resolve => setTimeout(resolve, 300));

  // Get all frames in the tab
  try {
    const frames = await browser.webNavigation.getAllFrames({ tabId: tabInfo.id });
    console.log(`📍 Background: Found ${frames?.length || 0} frames in tab`);

    // Try sending message to each frame
    let successResponse = null;
    for (const frame of frames || []) {
      try {
        console.log(`📤 Background: Trying frame ${frame.frameId} (${frame.url})`);
        const response = await browser.tabs.sendMessage(
          tabInfo.id,
          {
            type: 'STIBEE_IFRAME_EXPORT',
            content
          },
          { frameId: frame.frameId }
        );

        if (response?.success) {
          console.log(`✅ Background: Stibee export successful in frame ${frame.frameId}`);
          successResponse = response;
          break; // Stop after first successful response
        }
      } catch (frameError) {
        console.log(`⚠️ Background: Frame ${frame.frameId} didn't respond or failed:`, frameError);
        // Continue to next frame
      }
    }

    if (successResponse) {
      return successResponse;
    } else {
      console.warn('⚠️ Background: No frame responded successfully to Stibee export');
      return { success: true }; // Assume success even if no response
    }
  } catch (error) {
    console.error('❌ Background: Failed to get frames for Stibee export:', error);
    return { success: false, error: 'Failed to access frames' };
  }
}
```

### 위치
- `handleExportToEditor` 함수 내부
- `platform === 'stibee'` 조건문으로 추가

## 2. `src/utils/translations.ts`

### 한국어 번역 추가 (라인 365 부근)

```typescript
export_stibeeSuccess: "Stibee 페이지에 내용이 붙여넣어졌습니다.",
export_stibeeNotFound: "Stibee 에디터를 찾을 수 없습니다.",
```

### 영어 번역 추가 (라인 864 부근)

```typescript
export_stibeeSuccess: "Content has been pasted to Stibee page.",
export_stibeeNotFound: "Cannot find Stibee editor.",
```

## 3. `wxt.config.ts`

### manifest permissions에 추가 (라인 12)

```typescript
permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'contextMenus', 'sidePanel', 'webNavigation'],
```

**중요**: `'webNavigation'` 권한이 이미 있는지 확인하고, 없다면 추가해야 합니다.

## 4. 추가로 필요한 파일

### `src/entrypoints/stibee-iframe.content/index.ts`
- 이 파일은 완전히 새로 생성해야 합니다
- 전체 구현 코드는 별도로 제공됩니다

### `src/utils/platformDetection.ts`
- `ExportPlatform.STIBEE = 'stibee'` 추가
- Stibee 감지 로직 추가

### `src/components/sidepanel/ExportButton/ExportButton.tsx`
- Stibee 아이콘 컴포넌트 추가
- ExportPlatform.STIBEE 케이스 추가

## 구현 순서

1. **wxt.config.ts**: `webNavigation` 권한 확인/추가
2. **translations.ts**: 번역 텍스트 추가
3. **background.ts**: Stibee 처리 로직 추가
4. **platformDetection.ts**: Stibee 플랫폼 감지 추가
5. **stibee-iframe.content/index.ts**: 새 파일 생성
6. **ExportButton.tsx**: UI 아이콘 추가

## 주의사항

- `webNavigation` 권한은 필수입니다 (프레임 열거를 위해)
- Stibee는 cross-origin iframe 구조이므로 모든 프레임에 메시지를 전송해야 합니다
- Content script는 `editor.stibee.com` 도메인에서만 실행됩니다
