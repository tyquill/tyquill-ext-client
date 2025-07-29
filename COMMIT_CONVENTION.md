# 커밋 메시지 컨벤션 가이드

## 📝 커밋 메시지 형식

```
<타입>: <제목>

<설명 (선택사항)>

<이슈 연동 (선택사항)>
```

### 예시
```
feat: 스크랩 목록 조회 API 구현

페이징 지원과 함께 스크랩 목록을 조회할 수 있는 REST API를 추가했습니다.
향후 태그 필터링과 검색 기능 확장이 가능하도록 구조를 설계했습니다.

Closes CHI-23
```

## 🏷️ 커밋 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: 스크랩 생성 API 추가` |
| `fix` | 버그 수정 | `fix: 스크랩 삭제 시 404 오류 수정` |
| `docs` | 문서만 변경 | `docs: API 문서 업데이트` |
| `style` | 코드 포맷팅, 세미콜론 누락 등 | `style: 코드 포맷팅 정리` |
| `refactor` | 코드 리팩토링 | `refactor: ScrapService 메소드 분리` |
| `test` | 테스트 추가/수정 | `test: ScrapController 단위 테스트 추가` |
| `chore` | 빌드/도구 변경 | `chore: webpack 설정 업데이트` |
| `perf` | 성능 개선 | `perf: 스크랩 조회 쿼리 최적화` |
| `ci` | CI 설정 변경 | `ci: GitHub Actions 워크플로우 추가` |
| `build` | 빌드 시스템 변경 | `build: Gradle 의존성 업데이트` |
| `revert` | 이전 커밋 되돌리기 | `revert: "feat: 잘못된 기능" 커밋 되돌리기` |

## 📋 프로젝트별 특화 가이드

### 🧩 Chrome Extension (`tyquill-ext`)
```bash
# UI/UX 관련
feat: 스크랩 목록 컴포넌트 추가
fix: 팝업 창 레이아웃 깨짐 수정
style: Tailwind CSS 스타일 정리

# 확장 프로그램 기능
feat: content script에서 페이지 데이터 추출 기능 추가
fix: background script 메시지 전달 오류 수정
chore: manifest.json 권한 업데이트

# API 연동
feat: Tyquill 백엔드 API 연동
fix: API 호출 시 CORS 오류 해결
```

### 🚀 Spring Boot Backend (`tyquill-ext-was`)
```bash
# API 관련
feat: 스크랩 CRUD API 구현
fix: 스크랩 조회 시 404 오류 수정
perf: 페이징 쿼리 성능 최적화

# 데이터베이스
feat: Scrap 엔티티 추가
fix: 외래키 제약조건 오류 수정
chore: 데이터베이스 마이그레이션 스크립트 추가

# 보안/인증
feat: JWT 인증 미들웨어 추가
fix: SQL Injection 취약점 수정
```

## 🔗 Linear 이슈 연동

### 이슈 닫기
```
Closes CHI-23
Fixes CHI-24
Resolves CHI-25
```

### 이슈 참조
```
Refs CHI-26
Related to CHI-27
See CHI-28
```

### 여러 이슈 연동
```
feat: 스크랩 관리 기능 완성

기본 CRUD 작업과 페이징을 지원하는 스크랩 관리 API를 구현했습니다.

Closes CHI-23
Refs CHI-24
```

## ✅ 좋은 커밋 메시지 작성법

### ✔️ 좋은 예시
```
feat: 스크랩 목록 조회 API 구현

- 페이징 지원 (size, page 파라미터)
- 기본 정렬: 생성일 내림차순
- TODO: 향후 태그 필터링 추가 예정

Closes CHI-23
```

### ❌ 나쁜 예시
```
수정됨
```
스크랩 기능 추가했습니다.
```
```
fix
```

## 🛠️ 설정 방법

### Git 커밋 템플릿 설정
```bash
# 전역 설정
git config --global commit.template ~/.gitmessage

# 프로젝트별 설정
git config commit.template .gitmessage
```

### VS Code 확장 프로그램
- [Conventional Commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits)
- [Git Commit Template](https://marketplace.visualstudio.com/items?itemName=AndreiVolcov.git-commit-template)

## 📏 길이 제한

- **제목**: 50자 이내
- **설명**: 72자에서 줄바꿈
- **전체**: 간결하고 명확하게

## 🎯 커밋 단위

### ✔️ 적절한 커밋 단위
- 하나의 논리적 변경사항
- 독립적으로 실행 가능한 단위
- 의미있는 작업 단위

### ❌ 피해야 할 커밋
- 여러 기능이 섞인 큰 커밋
- 의미없는 작은 커밋들
- 작동하지 않는 중간 상태 커밋 