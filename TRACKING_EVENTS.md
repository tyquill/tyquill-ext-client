# 추적 이벤트 목록

Tyquill 크롬 확장프로그램에서 구현된 모든 Mixpanel 추적 이벤트를 정리한 문서입니다.

## 핵심 앱 이벤트

### 앱 생명주기
- **App_Opened**: 확장프로그램이 열릴 때 추적
  - `timestamp`: 이벤트 타임스탬프
  - `session_start`: 세션 시작 시간 (ISO 형식)

- **App_Closed**: 확장프로그램이 닫힐 때 추적 (beforeunload를 통해)
  - `timestamp`: 이벤트 타임스탬프

### 인증
- **User_Authenticated**: 사용자 인증이 성공할 때 추적
  - `timestamp`: 이벤트 타임스탬프

- **Landing_Page_Viewed**: 랜딩 페이지가 표시될 때 추적
  - `timestamp`: 이벤트 타임스탬프

- **Login_Attempt**: 사용자가 로그인 버튼을 클릭할 때 추적
  - `timestamp`: 이벤트 타임스탬프

- **Login_Success**: 로그인이 성공적으로 완료될 때 추적
  - `timestamp`: 이벤트 타임스탬프

- **Login_Failed**: 로그인이 실패할 때 추적
  - `error`: 오류 메시지
  - `timestamp`: 이벤트 타임스탬프

- **Navigate_To_Main_After_Login**: 로그인 후 메인 페이지로 이동할 때 추적
  - `timestamp`: 이벤트 타임스탬프

## 네비게이션 이벤트

### 탭/페이지 네비게이션
- **Tab_Switched**: 메인 탭 간 전환 시 추적
  - `from_tab`: 이전 탭 이름
  - `to_tab`: 새로운 탭 이름
  - `timestamp`: 이벤트 타임스탬프

### 페이지 뷰
- **Archive_Page_Viewed**: 보관함 페이지가 로드될 때 추적
  - `timestamp`: 이벤트 타임스탬프

- **Style_Management_Page_Viewed**: 문체 관리 페이지가 로드될 때 추적
  - `timestamp`: 이벤트 타임스탬프

### 아티클 네비게이션
- **Navigate_To_Article_Detail**: 아티클 상세 페이지로 이동할 때 추적
  - `article_id`: 아티클 ID
  - `from_page`: 출발 페이지
  - `timestamp`: 이벤트 타임스탬프

- **Navigate_To_Article_Detail_From_List**: 보관함 목록에서 아티클을 클릭할 때 추적
  - `article_id`: 아티클 ID
  - `timestamp`: 이벤트 타임스탬프

- **Navigate_Back_To_Archive**: 보관함 페이지로 돌아갈 때 추적
  - `from_page`: 출발 페이지
  - `timestamp`: 이벤트 타임스탬프

- **Navigate_To_Style_Management**: 문체 관리로 이동할 때 추적
  - `from_page`: 출발 페이지 (항상 'article-generate')
  - `timestamp`: 이벤트 타임스탬프

## 아티클 생성 이벤트

### 아티클 생성
- **Article_Generated**: 아티클 생성이 성공적으로 완료될 때 추적
  - `scraps_count`: 사용된 스크랩 개수
  - `tags_count`: 선택된 태그 개수
  - `has_template`: 템플릿 구조 사용 여부
  - `writing_style_id`: 선택된 문체 ID (있는 경우)
  - `generation_time_seconds`: 생성에 걸린 시간
  - `timestamp`: 이벤트 타임스탬프

- **Article_Generation_Failed**: 아티클 생성이 실패할 때 추적
  - `error`: 오류 메시지
  - `scraps_count`: 사용된 스크랩 개수
  - `has_template`: 템플릿 구조 사용 여부
  - `timestamp`: 이벤트 타임스탬프

### 템플릿 관리
- **Section_Added**: 템플릿에 새 섹션을 추가할 때 추적
  - `total_sections`: 추가 후 총 섹션 개수
  - `timestamp`: 이벤트 타임스탬프

- **Page_Analysis_Modal_Opened**: 페이지 분석 모달을 열 때 추적
  - `has_existing_template`: 기존 템플릿 존재 여부
  - `timestamp`: 이벤트 타임스탬프

### 문체 선택
- **Writing_Style_Selected**: 문체를 선택할 때 추적
  - `style_id`: 문체 ID
  - `style_name`: 문체 이름
  - `timestamp`: 이벤트 타임스탬프

## 스크랩 관리 이벤트

### 스크랩 생성
- **Scrap_Created**: 새 스크랩이 생성될 때 추적 (ScrapPage.tsx에서)
  - `url`: 스크랩한 URL
  - `tags_count`: 적용된 태그 개수
  - `timestamp`: 이벤트 타임스탬프

### 아티클용 스크랩 선택
- **Scrap_Added_To_Article**: 아티클 생성에 스크랩을 추가할 때 추적
  - `scrap_id`: 스크랩 ID
  - `scrap_title`: 스크랩 제목
  - `total_scraps_count`: 아티클에 선택된 총 스크랩 개수
  - `timestamp`: 이벤트 타임스탬프

- **Scrap_Removed_From_Article**: 아티클 생성에서 스크랩을 제거할 때 추적
  - `scrap_id`: 스크랩 ID
  - `scrap_title`: 스크랩 제목
  - `timestamp`: 이벤트 타임스탬프

- **Scrap_Modal_Opened**: 스크랩 선택 모달을 열 때 추적
  - `current_scraps_count`: 현재 선택된 스크랩 개수
  - `timestamp`: 이벤트 타임스탬프

### 태그 적용
- **Tag_Applied_To_Scrap**: 스크랩에 태그를 적용할 때 추적 (ScrapPage.tsx에서)
  - `tag_name`: 태그 이름
  - `scrap_id`: 스크랩 ID
  - `timestamp`: 이벤트 타임스탬프

## 태그 관리 이벤트

### 태그 필터링
- **Tag_Filter_Added**: 스크랩 목록에서 태그 필터를 추가할 때 추적
  - `tag_name`: 태그 이름
  - `total_selected_tags`: 선택된 필터 태그 총 개수
  - `timestamp`: 이벤트 타임스탬프

- **Tag_Filter_Removed**: 스크랩 목록에서 태그 필터를 제거할 때 추적
  - `tag_name`: 태그 이름
  - `total_selected_tags`: 제거 후 선택된 필터 태그 총 개수
  - `timestamp`: 이벤트 타임스탬프

## 보관함 관리 이벤트

### 아티클 상호작용
- **Article_Clicked**: 보관함에서 아티클을 클릭할 때 추적
  - `article_id`: 아티클 ID
  - `article_title`: 아티클 제목
  - `timestamp`: 이벤트 타임스탬프

- **Article_Deleted**: 아티클을 삭제할 때 추적
  - `article_id`: 아티클 ID
  - `timestamp`: 이벤트 타임스탬프

## 오류 처리

모든 추적 이벤트는 try-catch 블록으로 감싸져 있어 추적 실패가 앱 기능에 영향을 주지 않도록 합니다:

```javascript
try {
  mp.track('Event_Name', {
    property: value,
    timestamp: Date.now()
  });
} catch (error) {
  console.error('Mixpanel tracking error:', error);
}
```

## 구현 세부사항

- **Mixpanel SDK**: `mixpanel-browser` 패키지 사용
- **초기화**: `src/lib/mixpanel.ts`에서 구성
- **환경**: 개발/프로덕션 모드 자동 감지
- **토큰**: 환경변수 `VITE_MIXPANEL_TOKEN` 사용 (폴백 포함)
- **지속성**: localStorage 사용
- **디버그 모드**: 개발 환경에서 활성화
- **API 호스트**: `https://api-js.mixpanel.com`로 설정
- **호스트 권한**: CSP 호환을 위해 `wxt.config.ts`에 추가

## 수정된 파일들

1. `src/lib/mixpanel.ts` - Mixpanel 초기화 및 래퍼
2. `src/sidepanel/App.tsx` - 앱 생명주기 및 네비게이션 추적
3. `src/sidepanel/pages/LandingPage.tsx` - 인증 추적
4. `src/sidepanel/pages/ArchivePage.tsx` - 보관함 상호작용
5. `src/sidepanel/pages/ArticleGeneratePage.tsx` - 아티클 생성 플로우
6. `src/sidepanel/pages/ScrapPage.tsx` - 스크랩 및 태그 관리
7. `src/sidepanel/pages/StyleManagementPage.tsx` - 페이지 뷰 추적
8. `wxt.config.ts` - Mixpanel 도메인 권한 추가

## 사용법

모든 이벤트는 일관된 패턴을 따릅니다:
- 정확한 타이밍을 위해 `timestamp: Date.now()` 포함
- snake_case로 명확한 속성 이름 사용
- 관련 컨텍스트 포함 (ID, 개수, 상태)
- 사용자 경험을 해치지 않도록 오류를 우아하게 처리