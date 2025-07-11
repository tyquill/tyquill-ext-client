# Tyquill Extension - 리뷰 가이드라인

## 📋 커밋 메시지 규칙

간단하고 명확하게 작성합니다:

```
[영역] 변경사항 요약
```

### 영역 구분
- `sidepanel`: 사이드 패널 관련
- `background`: 백그라운드 스크립트 관련
- `content`: 컨텐츠 스크립트 관련
- `manifest`: manifest.json 관련
- `build`: 빌드 설정 관련
- `docs`: 문서 수정

### 예시
```bash
[sidepanel] 사용자 인증 폼 추가
[background] 스토리지 권한 오류 수정
[build] webpack 설정 업데이트
[docs] 설치 방법 업데이트
```

## 🔍 Pull Request 리뷰 가이드

### PR 제목
커밋 메시지와 동일한 형식을 사용합니다.

### PR 설명 필수 항목
1. **무엇을 변경했나요?**
   - 변경사항 요약
   - 주요 기능 설명

2. **왜 변경했나요?**
   - 변경 이유
   - 해결하려는 문제

3. **어떻게 테스트했나요?**
   - 테스트 방법
   - 확인한 시나리오

4. **스크린샷 (UI 변경 시)**
   - 변경 전/후 비교
   - 주요 화면 캡처

### 리뷰어 체크리스트
- [ ] 코드가 의도한 대로 동작하는가?
- [ ] 빌드가 성공하는가?
- [ ] Chrome Extension에서 정상 동작하는가?
- [ ] 코드 품질이 적절한가?
- [ ] 보안 이슈가 없는가?

## 🏗️ 개발 & 리뷰 워크플로우

1. **기능 개발**
   ```bash
   git checkout -b feature/기능명
   npm run dev  # 개발 서버 실행
   ```

2. **테스트**
   ```bash
   npm run build  # 빌드 확인
   # Chrome Extension 로드 후 기능 테스트
   ```

3. **PR 생성**
   - 변경사항 설명
   - 테스트 방법 명시
   - 스크린샷 첨부 (필요시)

4. **리뷰 요청**
   - 검토자 지정
   - 리뷰 완료 후 머지

## 🚀 Extension 테스트 가이드

### 로컬 테스트
1. `npm run build` 실행
2. `chrome://extensions/` 접속
3. 개발자 모드 활성화
4. "압축해제된 확장 프로그램 로드" 클릭
5. `dist` 폴더 선택

### 디버깅 방법
- **Background Script**: `chrome://extensions/` → Service Worker 클릭
- **Side Panel**: 사이드 패널에서 우클릭 → 검사
- **Content Script**: 웹페이지에서 F12 → Console

### 주의사항
- 코드 변경 후 반드시 확장 프로그램 새로고침
- 권한 변경 시 확장 프로그램 재로드 필요
- 디버깅 시 개발자 도구 콘솔 확인 