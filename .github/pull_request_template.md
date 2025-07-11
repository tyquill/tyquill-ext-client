## 🔗 연관 이슈
<!-- Linear 이슈를 링크해주세요 -->
Closes: [CHI-XXX](https://linear.app/chill-mato/issue/CHI-XXX/)

## 📋 변경사항 요약
<!-- 이 PR에서 무엇을 변경했는지 간단히 설명해주세요 -->

### 주요 변경사항
- [ ] 새로운 기능 추가
- [ ] 버그 수정
- [ ] UI/UX 개선
- [ ] 성능 최적화
- [ ] 리팩토링
- [ ] 타입 개선
- [ ] 설정 변경

## 🛠 구현 내용

### Chrome Extension 구조
- [ ] **Content Script** (`src/content/`)
  - [ ] DOM 조작 로직
  - [ ] 페이지 데이터 추출
  - [ ] 사이트별 스크래핑 로직

- [ ] **Background Script** (`src/background/`)
  - [ ] 백그라운드 작업 처리
  - [ ] API 통신 로직
  - [ ] 알림/이벤트 처리

- [ ] **Popup** (`src/popup/`)
  - [ ] 팝업 UI 컴포넌트
  - [ ] 사용자 인터랙션 처리
  - [ ] 상태 관리

- [ ] **Components** (`src/components/`)
  - [ ] React 컴포넌트 추가/수정
  - [ ] AI 연동 컴포넌트
  - [ ] 로그인/인증 컴포넌트

### 기술 스택
- [ ] **TypeScript**: 타입 안전성 개선
- [ ] **React**: 컴포넌트 기반 UI
- [ ] **Tailwind CSS**: 스타일링
- [ ] **Chrome Extension API**: 브라우저 기능 활용
- [ ] **Webpack**: 번들링 설정

### API 연동
- [ ] **Maily API**: 뉴스레터 서비스 연동
- [ ] **Tyquill Backend**: 스크랩 데이터 관리
- [ ] **Newsletter AI**: AI 기능 연동

## 🎨 UI/UX 변경사항
### 새로운 컴포넌트
- [ ] 스크랩 목록 UI
- [ ] AI 콘텐츠 생성 인터페이스
- [ ] 로그인/인증 화면
- [ ] 설정 페이지

### 개선된 UX
- [ ] 반응형 디자인
- [ ] 접근성 개선
- [ ] 로딩 상태 표시
- [ ] 에러 처리 UI

## 🧪 테스트
### 확장 프로그램 테스트
- [ ] **Chrome DevTools**: 콘솔 에러 없음
- [ ] **Extension 설치**: 정상 설치/활성화
- [ ] **Permissions**: 필요한 권한만 요청
- [ ] **Cross-browser**: Chrome/Edge 호환성

### 기능 테스트
- [ ] **Content Script**: 페이지에서 정상 동작
- [ ] **Background Script**: 백그라운드 작업 정상
- [ ] **Popup**: 팝업 UI 정상 동작
- [ ] **API 통신**: 백엔드와 정상 연동

### 수동 테스트 체크리스트
- [ ] 다양한 웹사이트에서 스크래핑 테스트
- [ ] 로그인 플로우 정상 동작
- [ ] AI 기능 정상 작동
- [ ] 데이터 저장/불러오기 정상

## 📸 스크린샷/데모
<!-- 새로운 UI나 기능이 있다면 스크린샷을 첨부해주세요 -->
### Before/After
<!-- 기존 UI와 비교 스크린샷 -->

### 새로운 기능 데모
<!-- GIF나 스크린샷으로 기능 시연 -->

## 📦 빌드 & 배포
### 빌드 확인
- [ ] `npm run build` 성공
- [ ] `dist/` 폴더 정상 생성
- [ ] 번들 크기 적정 수준
- [ ] TypeScript 컴파일 에러 없음

### 확장 프로그램 패키징
- [ ] `manifest.json` 유효성 검사
- [ ] 필요한 파일들 모두 포함
- [ ] 개발자 모드에서 로드 테스트

## 📝 추가 정보
### Breaking Changes
- [ ] Breaking change 없음
- [ ] Breaking change 있음 (아래에 설명)

<!-- Breaking change가 있다면 설명해주세요 -->

### Chrome Store 배포 관련
- [ ] Store 정책 준수
- [ ] 개인정보 처리 정책 반영
- [ ] 새로운 권한 요청 시 사유 설명

### TODO
<!-- 향후 작업이 필요한 부분이 있다면 -->

## 👀 리뷰 포인트
<!-- 리뷰어가 특별히 봐줬으면 하는 부분이 있다면 -->
1. **보안**: Content Script 보안 이슈 없는지
2. **성능**: 메모리 누수나 과도한 리소스 사용 없는지
3. **UX**: 사용자 경험이 직관적인지
4. **호환성**: 다양한 웹사이트에서 정상 동작하는지

## 📚 참고 자료
<!-- 관련 문서나 참고한 자료가 있다면 -->
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)

---
### 리뷰어 체크리스트
- [ ] TypeScript 타입 안전성 확보
- [ ] Chrome Extension 보안 가이드라인 준수
- [ ] 성능 최적화 (메모리, 번들 크기)
- [ ] 접근성 고려 (a11y)
- [ ] 코드 스타일 가이드 준수 