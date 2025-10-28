# Stibee 에디터 내보내기 기능 구현 가이드

## 개요
Tyquill 익스텐션에서 Stibee 에디터로 콘텐츠를 내보내는 기능 구현 문서입니다.

## 기술적 배경

### Stibee 에디터 구조
- **에디터**: TinyMCE 5.10.9 (Rich Text Editor)
- **입력 데이터 형식**: Tyquill JSON (Tyquill 내부 저장 형식)
- **출력 형식**: HTML (TinyMCE에서 렌더링)
- **iframe 구조**:
  - 메인 페이지: `https://stibee.com/email/{id}/edit/step05`
  - 에디터 iframe: `https://editor.stibee.com/editor/{id}/?timestemp={timestamp}` (cross-origin)
  - 각 텍스트 블록 내부에 TinyMCE iframe 존재

### Cross-Origin 문제
- Stibee 에디터는 cross-origin iframe이므로 메인 페이지에서 직접 접근 불가
- 해결: 에디터 iframe 내부에서 실행되는 별도 content script 사용

## 구현 단계

### 1. 플랫폼 감지 추가

**파일**: `src/utils/platformDetection.ts`

```typescript
export enum ExportPlatform {
  MAILY = 'maily',
  SUBSTACK = 'substack',
  GHOST = 'ghost',
  LINKEDIN = 'linkedin',
  STIBEE = 'stibee',  // 추가
  UNKNOWN = 'unknown'
}

// detectPlatform 함수에 Stibee 감지 로직 추가
if (url.includes('stibee.com') && url.includes('/email/') && url.includes('/edit/')) {
  return {
    platform: ExportPlatform.STIBEE,
    isEditorPage: true,
    editorSelectors: {
      content: 'iframe'
    }
  };
}
```

### 2. iframe용 Content Script 생성

**파일**: `src/entrypoints/stibee-iframe.content/index.ts`

WXT 프레임워크에서는 디렉토리 구조가 중요합니다: `stibee-iframe.content/index.ts` 형식으로 생성해야 합니다.

#### 주요 기능
- Cross-origin iframe 내부에서 실행
- **대화형 사용자 인터페이스** 제공
- 복수 텍스트 블록에 문단별 수동 삽입
- 각 블록을 자동으로 클릭하여 활성화
- **이어붙이기/대치/건너뛰기** 기능 지원

#### 핵심 로직
```typescript
export default defineContentScript({
  matches: ['*://editor.stibee.com/*'], // 메인 프레임 제외
  allFrames: true, // iframe 내부 실행 필수

  main() {
    browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      if (request.type === 'STIBEE_IFRAME_EXPORT') {
        (async () => {
          try {
            // 1. 에디터 프레임 확인 및 락 획득
            const isEditorFrame = location.hostname.includes('editor.stibee.com');
            if (!isEditorFrame) return;
            
            if (!tryAcquireExportLock()) return;

            // 2. JSON 파싱 및 문단 추출
            const { content } = request;
            const jsonData = JSON.parse(content);
            const paragraphs = jsonData.content.map(convertNodeToHtml);

            // 3. 텍스트 블록 찾기 (다중 전략)
            const textEditBlocks = document.querySelectorAll('.text-edit');
            const iframeBlocks = document.querySelectorAll('iframe[src*="tinymce"]');
            const clickableBlocks = document.querySelectorAll('[class*="text"], [class*="content"]');
            
            // 4. 2단 레이아웃 필터링
            allTextBlocks = allTextBlocks.filter((el) => !el.closest('.content-outer.col2'));

            // 5. 대화형 UI 생성 및 사용자 제어
            const prompt = createInteractivePrompt();
            // 사용자가 각 문단마다 액션 선택 (이어붙이기/대치/건너뛰기)
            
            // 6. 문단별 처리
            for (const paragraph of paragraphs) {
              if (isSkippableParagraph(paragraph)) continue; // HR/빈 문단 스킵
              
              // 블록 활성화
              block.click();
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // 사용자 액션 대기
              const action = await waitForUserAction();
              
              if (action === 'append') {
                // 기존 내용에 이어붙이기
                iframeBody.innerHTML = existingContent + paragraph;
              } else if (action === 'replace') {
                // 내용 대치
                iframeBody.innerHTML = paragraph;
              } else if (action === 'next-block') {
                // 다음 블록으로 이동
                blockIndex++;
                continue;
              }
            }

            sendResponse({ success: true, blocksProcessed: successCount });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        })();
        return true; // 비동기 응답
      }
    });
  }
});
```

### 3. 대화형 사용자 인터페이스

#### 프롬프트 UI 구성
- **위치**: 화면 우상단 고정
- **구성요소**:
  - 미리보기 영역: 현재 문단 내용 표시
  - 위치 정보: "현재 선택된 블록: X번째 (총 Y개)"
  - 상태 메시지: 현재 진행 상황
  - 액션 버튼들

#### 사용자 액션 버튼
1. **현재 블록에 이어붙이기** (파란색)
   - 기존 내용에 새 문단 추가
   - 문단 인덱스만 증가

2. **현재 블록 내용 대치** (초록색)
   - 기존 내용을 새 문단으로 교체
   - 문단 인덱스만 증가

3. **다음 블록으로 넘어가기** (회색)
   - 현재 문단 유지
   - 블록 인덱스만 증가

#### 스킵 기능
- **자동 스킵**: `<hr>` 태그나 빈 문단은 자동으로 건너뜀
- **수동 스킵**: 사용자가 원하지 않는 문단/블록 건너뛰기 가능

### 4. Tyquill JSON → HTML 변환 함수

**같은 파일 내 추가**:

Tyquill의 내부 JSON 형식을 TinyMCE용 HTML로 변환합니다.

```typescript
/**
 * Convert Tyquill JSON structure to HTML for TinyMCE
 */
function convertTyquillJsonToHtml(json: any): string {
  if (!json || typeof json !== 'object') {
    return '';
  }

  // Handle root document
  if (json.type === 'doc' && json.content) {
    return json.content.map((node: any) => convertNodeToHtml(node)).join('');
  }

  // Handle single node
  return convertNodeToHtml(json);
}

/**
 * Convert a single Tyquill JSON node to HTML
 */
function convertNodeToHtml(node: any): string {
  if (!node || !node.type) {
    return '';
  }

  switch (node.type) {
    case 'paragraph':
      return `<p>${convertContentArray(node.content)}</p>`;

    case 'heading':
      const level = node.attrs?.level || 1;
      return `<h${level}>${convertContentArray(node.content)}</h${level}>`;

    case 'text':
      return applyMarks(node.text || '', node.marks);

    case 'horizontalRule':
      return '<hr>';

    case 'bulletList':
      return `<ul>${convertContentArray(node.content)}</ul>`;

    case 'orderedList':
      return `<ol>${convertContentArray(node.content)}</ol>`;

    case 'listItem':
      return `<li>${convertContentArray(node.content)}</li>`;

    case 'blockquote':
      return `<blockquote>${convertContentArray(node.content)}</blockquote>`;

    case 'codeBlock':
      return `<pre><code>${convertContentArray(node.content)}</code></pre>`;

    case 'hardBreak':
      return '<br>';

    default:
      console.warn('Unknown node type:', node.type);
      return convertContentArray(node.content);
  }
}

/**
 * Convert content array to HTML
 */
function convertContentArray(content: any): string {
  if (!content || !Array.isArray(content)) {
    return '';
  }
  return content.map((node: any) => convertNodeToHtml(node)).join('');
}

/**
 * Apply text marks (bold, italic, etc.)
 */
function applyMarks(text: string, marks: any[]): string {
  if (!marks || marks.length === 0) {
    return escapeHtml(text);
  }

  let result = escapeHtml(text);

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `<strong>${result}</strong>`;
        break;
      case 'italic':
        result = `<em>${result}</em>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'strike':
        result = `<s>${result}</s>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
      case 'link':
        const href = mark.attrs?.href || '#';
        result = `<a href="${escapeHtml(href)}">${result}</a>`;
        break;
    }
  }

  return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
```

### 5. Background Script 수정

**파일**: `src/entrypoints/background.ts`

모든 iframe에 메시지를 브로드캐스트하여 Stibee 에디터 iframe과 통신합니다.

```typescript
async function handleExportToEditor(request: any) {
  const { content, platform } = request;

  if (platform === 'stibee') {
    const tabInfo = await handleGetActiveTabInfo();
    await new Promise(resolve => setTimeout(resolve, 300)); // content script 로딩 대기

    // 모든 프레임 가져오기
    const frames = await browser.webNavigation.getAllFrames({ tabId: tabInfo.id });

    // 각 프레임에 메시지 전송
    for (const frame of frames || []) {
      try {
        const response = await browser.tabs.sendMessage(
          tabInfo.id,
          { type: 'STIBEE_IFRAME_EXPORT', content },
          { frameId: frame.frameId }
        );

        if (response?.success) {
          return response;
        }
      } catch (frameError) {
        // 프레임이 응답하지 않으면 다음 프레임 시도
      }
    }

    return { success: true };
  }

  // 다른 플랫폼 처리...
}
```

### 6. Manifest 권한 추가

**파일**: `wxt.config.ts`

```typescript
manifest: {
  permissions: [
    // ...
    'webNavigation'  // 프레임 열거를 위해 필수
  ]
}
```

### 7. Export Helper 함수 추가

**파일**: `src/utils/exportHelper.ts`

```typescript
export const exportToStibee = async (title: string, content: string): Promise<ExportResult> => {
  const cleanedContent = content.replace(/\n{3,}/g, '\n\n').trim();
  await new Promise(resolve => setTimeout(resolve, 100));
  return { success: true };
};
```

### 8. 번역 추가

**파일**: `src/utils/translations.ts`

```typescript
// 한국어
export_stibeeSuccess: "Stibee 페이지에 내용이 붙여넣어졌습니다.",
export_stibeeNotFound: "Stibee 에디터를 찾을 수 없습니다.",

// English
export_stibeeSuccess: "Content pasted into Stibee editor.",
export_stibeeNotFound: "Stibee editor not found.",
```

### 9. UI 아이콘 추가

**파일**: `src/components/sidepanel/ExportButton/ExportButton.tsx`

```typescript
function StibeeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
  );
}

case ExportPlatform.STIBEE:
  return <StibeeIcon className="w-5 h-5" />;
```

## 사용 방법

1. Stibee 에디터 페이지 열기 (`https://stibee.com/email/{id}/edit/step05`)
2. **충분한 텍스트 블록을 미리 추가** (문단 수만큼)
3. 사이드패널에서 내보내기 버튼 클릭
4. **대화형 UI에서 각 문단마다 액션 선택**:
   - 이어붙이기: 기존 내용에 추가
   - 대치: 기존 내용 교체
   - 다음 블록으로 이동: 현재 문단 유지하고 다음 블록으로

### 작동 방식
- Tyquill 문서의 각 문단(paragraph, heading 등)이 Stibee의 각 텍스트 블록에 1:1 매핑
- 각 블록을 자동으로 클릭하여 활성화
- 사용자가 각 문단마다 원하는 액션을 선택
- `<hr>` 태그나 빈 문단은 자동으로 건너뜀
- 2단 레이아웃(`.content-outer.col2`)은 자동으로 필터링

## 기술 상세

### 성능 최적화
- **딜레이 최적화**: 총 대기 시간 약 0.7초 (기존 1.2초에서 단축)
  - 스크롤 대기: 150ms
  - 에디터 로딩: 200ms
  - 저장 대기: 150ms
- **타임아웃**: 2분 (사용자 입력 대기)
- **크로스 프레임 락**: 중복 실행 방지

### 안전성 기능
- **프레임 필터링**: 에디터 프레임에서만 실행
- **에러 핸들링**: 각 단계별 try-catch
- **폴백 전략**: TinyMCE API 실패 시 직접 DOM 조작

### Tyquill JSON 구조

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "일반 텍스트"},
        {"type": "text", "marks": [{"type": "bold"}], "text": "굵은 텍스트"}
      ]
    },
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "제목"}]
    }
  ]
}
```

### 지원되는 노드 타입
- `paragraph` → `<p>`
- `heading` (level 1-6) → `<h1>`-`<h6>`
- `bulletList` → `<ul>`, `orderedList` → `<ol>`, `listItem` → `<li>`
- `blockquote` → `<blockquote>`
- `codeBlock` → `<pre><code>`
- `horizontalRule` → `<hr>`
- `hardBreak` → `<br>`

### 지원되는 Marks
- `bold` → `<strong>`
- `italic` → `<em>`
- `underline` → `<u>`
- `strike` → `<s>`
- `code` → `<code>`
- `link` → `<a>`

## 구현된 파일 목록

1. `src/utils/platformDetection.ts` - Stibee 감지
2. `src/entrypoints/stibee-iframe.content/index.ts` - iframe content script
3. `src/entrypoints/background.ts` - 프레임 통신
4. `wxt.config.ts` - webNavigation 권한
5. `src/utils/exportHelper.ts` - exportToStibee 함수
6. `src/utils/translations.ts` - 번역
7. `src/components/sidepanel/ExportButton/ExportButton.tsx` - UI 아이콘

## 구현 완료 기능

- ✅ Cross-origin iframe 통신
- ✅ **대화형 사용자 인터페이스**
- ✅ **이어붙이기/대치/건너뛰기 기능**
- ✅ 복수 텍스트 블록에 문단별 수동 삽입
- ✅ 자동 클릭으로 블록 활성화
- ✅ Elements 순회하며 HTML 주입
- ✅ Tyquill JSON → HTML 변환
- ✅ 다양한 노드 타입 및 마크 지원
- ✅ **자동 스킵 기능** (HR/빈 문단)
- ✅ **2단 레이아웃 필터링**
- ✅ **성능 최적화** (딜레이 단축)
- ✅ **타임아웃 및 에러 처리**
- ✅ **크로스 프레임 락**