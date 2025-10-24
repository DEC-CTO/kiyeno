# CLAUDE.md - Kiyeno 벽체 관리 시스템

이 파일은 Claude Code (claude.ai/code)가 이 저장소의 코드를 작업할 때 지침을 제공합니다.

**모든 설명은 한글로 제공됩니다.**

## 프로젝트 개요

**Kiyeno 벽체 관리 시스템**은 한국 건설업계를 위한 종합적인 벽체 관리 솔루션입니다. Node.js Express 서버를 기반으로 하며, 다음과 같은 핵심 기능을 제공합니다:

### 🏗️ 주요 기능

- **벽체 타입 관리**: 다양한 벽체 유형별 자재 소요량 계산
- **Revit 연동**: Autodesk Revit과 양방향 데이터 교환 (WebSocket + HTTP)
- **자재 데이터베이스**: 55개 경량자재 + 49개 석고보드 기본 데이터 + 사용자 커스터마이징
- **일위대가 관리**: 세부 아이템별 구성품 관리 및 소요량 계산
- **실시간 계산**: 6가지 자재 동시 소요량 계산 (스터드, 런너, 피스, 타정총알, 용접봉, 석고피스)
- **견적서 생성**: 갑지(표지) + 을지(내역서) Excel 내보내기, 수식 지원, 1000단위 절사
- **데이터 백업/복원**: Excel/JSON 파일 내보내기/가져오기
- **디스플레이 시스템**: 4가지 보기 모드 (기본값보기, 타입별보기, 재료별보기, 공종별보기)

### 🎯 대상 사용자

- 한국 건설업계 실무자
- 건축 설계사무소
- 시공사 견적 담당자
- Revit 사용 설계자

## 🛠️ 기술 스택

### Backend

- **런타임**: Node.js 16.0.0+
- **프레임워크**: Express.js 4.18.2
- **WebSocket**: Socket.IO 4.8.1, WS 8.18.3
- **데이터**: JSON 파일 기반 저장
- **유틸리티**: fs-extra 11.1.1, UUID 9.0.0
- **개발도구**: nodemon 3.0.1

### Frontend

- **코어**: Vanilla JavaScript (ES6 모듈)
- **UI**: Font Awesome 6.4.0
- **데이터**: IndexedDB (Dexie.js latest)
- **통신**: Socket.IO Client 4.7.4
- **파일처리**: SheetJS 0.18.5, ExcelJS 4.4.0
- **스타일**: CSS3 (Grid, Flexbox)

### Revit 연동

- **프로토콜**: WebSocket (포트 3001)
- **데이터 형식**: JSON
- **C# 애드인**: Autodesk Revit API 호환

## 시스템 아키텍처

### 🖥️ 서버 계층 (Backend)

#### 메인 서버 (`server.js`)

- **플랫폼**: Node.js Express
- **포트**: 3000 (기본값, 환경변수 PORT로 변경 가능)
- **미들웨어**: CORS, Body Parser, Static File Serving
- **WebSocket**: Socket.IO 서버 (Revit 연동용)
- **로깅**: 타임스탬프 포함 HTTP 요청 로깅

#### API 계층 (`api/`)

```
api/
├── index.js           # API 라우트 통합 관리 및 문서화
├── walls.js           # 벽체 데이터 CRUD API
├── materials.js       # 자재 데이터 관리 API
└── revit.js          # Revit 연동 API (동기화, 타입매칭, 객체선택)
```

#### 서비스 계층 (`services/`)

```
services/
├── dataService.js     # 파일 기반 데이터 관리 (JSON 저장/로드, 백업)
├── wallService.js     # 벽체 비즈니스 로직
├── materialService.js # 자재 관리 로직
└── revitService.js   # Revit 연동 로직 (WebSocket 통신)
```

### 🌐 클라이언트 계층 (Frontend)

#### 핵심 HTML (`public/index.html`)

- **프레임워크**: Vanilla JavaScript (ES6 모듈)
- **외부 라이브러리**:
  - Font Awesome 6.4.0 (아이콘)
  - SheetJS 0.18.5 (Excel 파일 읽기/쓰기)
  - ExcelJS 4.4.0 (Excel 파일 생성 및 수식 지원)
  - Dexie.js (IndexedDB)
  - Socket.IO 4.7.4 (WebSocket)

#### JavaScript 모듈 구조 (`public/js/`)

**🎯 진입점 및 핵심**

```
├── main.js                  # ES6 모듈 시스템 진입점, KiyenoApp 클래스
├── app-core.js             # 핵심 애플리케이션 로직
├── app-calculator.js       # 계산 엔진 (소요량 계산)
├── app-services.js         # 서비스 계층 (석고보드 관리 등)
├── app-ui.js              # UI 렌더링 및 상호작용
├── bridge.js              # 기존 시스템과 새 시스템 연결
├── debug.js               # 디버깅 및 로그 관리
├── display-system.js      # 4가지 보기 모드 시스템
├── revit-wall-handler.js  # Revit 벽체 데이터 처리 및 객체 선택
└── wall-cost-calculator.js # 견적서 생성 및 Excel 내보내기 (15000+ 라인)
```

**📦 모듈 (`modules/`)**

```
modules/
├── priceDatabase.js          # IndexedDB 기반 가격 데이터베이스
├── materialManager.js        # 자재 관리 모듈
├── unitPriceManager.js       # 일위대가 관리 (핵심 모듈, 3400+ 라인)
├── priceComparisonManager.js # 가격 비교 관리
├── revitManager.js           # Revit 연동 관리
├── revitTypeMatching.js      # Revit 타입 매칭
└── revitUtilities.js         # Revit 유틸리티 함수
```

**🔧 서비스 (`services/`)**

```
services/
├── apiService.js          # REST API 통신
├── materialService.js     # 자재 데이터 서비스
├── wallService.js         # 벽체 데이터 서비스
├── revitService.js        # Revit 연동 서비스
└── socketService.js       # WebSocket 통신 관리
```

**🛠️ 유틸리티 (`utils/`)**

```
utils/
├── constants.js           # 상수 정의
├── helpers.js            # 도우미 함수
└── validators.js         # 유효성 검사
```

#### CSS 스타일시트 (`public/css/`)

```
css/
├── styles.css                 # 메인 스타일시트
├── breakdown-styles.css       # 내역서 스타일
├── display-system.css         # 디스플레이 시스템 스타일
├── logger-styles.css         # 로그 표시 스타일
├── material-management.css    # 자재 관리 모달 스타일
├── material-selector.css     # 자재 선택기 스타일
└── revit-responsive.css      # Revit 탭 반응형 스타일
```

## 📊 데이터 시스템 구조

### 3계층 하이브리드 데이터 관리

현재 시스템은 로컬/오프라인 환경에 최적화된 **3계층 하이브리드 구조**를 사용합니다:

#### 1️⃣ 기본 데이터 계층 (하드코딩)

- **파일**: `priceDatabase.js`
- **내용**: 55개 경량자재 + 49개 석고보드 기본 데이터
- **특징**: 브라우저 설치 즉시 사용 가능, 절대 소실되지 않음
- **카테고리**:
  - **경량자재**: STUD_KS, RUNNER_KS, STUD_BS, RUNNER_BS, CH_STUD_J_RUNNER, BEADS, FASTENERS
  - **석고보드**: STANDARD, MOISTURE, FIRE, FIRE_MOISTURE, SOUND, ANTIBACTERIAL, INSULATION

#### 2️⃣ 사용자 데이터 계층 (IndexedDB)

- **저장소**: 브라우저 내장 IndexedDB (Dexie.js)
- **내용**: 사용자가 추가/수정한 자재 데이터, 벽체 데이터, 일위대가 데이터
- **특징**: 실시간 저장, 빠른 접근, 브라우저별 독립 관리
- **위치**: `C:\Users\[사용자]\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\`

#### 3️⃣ 백업/복원 계층 (파일 시스템)

- **기능**: Excel/JSON 파일 내보내기/가져오기
- **용도**: 데이터 이동성, 백업, 브라우저 간 데이터 전송
- **지원 형식**: .xlsx (Excel), .json (JSON)
- **구현**: `revit-wall-handler.js`의 드롭다운 메뉴

### 🔄 WebSocket 통신 구조

```
웹 클라이언트 (Socket.IO)
        ↕
Node.js 서버 (Socket.IO, 포트 3000)
        ↕
Revit C# 애드인 (WebSocket, 포트 3001)
```

**통신 프로토콜**:

- **웹 ↔ 서버**: Socket.IO (HTTP Long Polling + WebSocket)
- **서버 ↔ Revit**: 순수 WebSocket (JSON 메시지)

### 🗂️ 서버 데이터 저장

- **위치**: `data/` 디렉토리
- **형식**: JSON 파일
- **백업**: `data/backups/` 자동 백업
- **캐싱**: 메모리 캐시 + 파일 수정시간 추적

## ⚙️ 핵심 기능 모듈

### 🏗️ 일위대가 관리 시스템 (`unitPriceManager.js`)

**위치**: `public/js/modules/unitPriceManager.js` (3400+ 라인)

**주요 기능**:

- **세부아이템 생성/편집**: 복잡한 모달 UI with 동적 구성품 관리
- **6가지 소요량 계산**: 스터드, 런너, 피스, 타정총알, 용접봉, 석고피스
- **노무비 처리**: 금액칸 입력 + 단가 자동계산 (금액÷수량)
- **자재 선택기**: IndexedDB 기반 실시간 검색
- **Excel 내보내기**: 내역서 Excel 파일 생성

**계산 공식**:

```javascript
// 스터드: 1 ÷ 간격값 × 할증률
stud = (1 / spacing) * premiumRate;

// 런너: 일반(0.34×2), 더블(0.34×4)
runner = 0.34 * (type === '더블' ? 4 : 2);

// 피스: @450=12, @400=1.125×12(버림), @500=12×0.9(버림)
piece =
  spacing === 400
    ? Math.floor(1.125 * 12)
    : spacing === 500
    ? Math.floor(12 * 0.9)
    : 12;

// 석고피스: 복잡한 테이블 계산 (3×6, 4×8 등)
gypsumPiece = calculateGypsumPiece(width, height);
```

### 🔗 Revit 연동 시스템

**파일들**: `revitService.js`, `revit-wall-handler.js`, `socketService.js`

**기능**:

- **양방향 데이터 동기화**: Revit ↔ 웹앱
- **객체 선택**: 체크박스 → ElementID 수집 → Revit 선택
- **타입 매칭**: Revit WallType ↔ 시스템 벽체타입
- **Excel/JSON 관리**: 드롭다운 메뉴로 데이터 백업/복원

### 🎨 디스플레이 시스템 (`display-system.js`)

**4가지 보기 모드**:

- **기본값보기**: 전체 내역서 형태
- **타입별보기**: 벽체 타입별 그룹핑 + 소계
- **재료별보기**: 자재별 집계 + 발주수량
- **공종별보기**: 공종별 분류 + 소계

### 📦 자재 관리 시스템

**구성**: `materialManager.js`, `priceDatabase.js`, `materialService.js`

**기능**:

- **하이브리드 데이터**: 기본 104개 + 사용자 추가
- **실시간 검색**: 품명, 규격, 카테고리 필터링
- **가격 관리**: 재료비단가, 노무비단가 별도 관리
- **카테고리 관리**: 경량자재 7종, 석고보드 7종

### 📄 견적서 생성 시스템 (`wall-cost-calculator.js`)

**위치**: `public/js/wall-cost-calculator.js` (15000+ 라인)

**주요 기능**:

- **갑지(표지) 생성**: `createEstimateCoverSheet()` 함수
  - 프로젝트 정보, 발주처, 시공사 정보
  - 총 견적 금액 (1000단위 절사)
  - 한글 금액 표기 (일금 ~ 원정)
- **을지(내역서) 생성**: `createEstimateDetailSheet()` 함수
  - 3단 헤더 (도급내역서 + 발주단가내역서)
  - 직접공사비 (A~I 항목 + 하위 세부 항목)
  - 간접공사비 (산재보험료, 안전관리비 등)
  - 단수정리 및 총합계
- **Excel 수식 지원**:
  - 일반 항목: `금액 = 수량 × 단가`
  - SUB TOTAL: 섹션별 SUM 수식
  - A~I 항목: 각 SUB TOTAL 참조
  - IFERROR로 오류 처리
- **금액 계산**:
  - `calculateDirectCosts()`: 직접공사비 합산
  - `calculateEstimateGrandTotal()`: 간접공사비 포함 총액
  - `updateEstimateTotalAmount()`: 1000단위 절사 적용
- **내보내기**: ExcelJS 라이브러리로 .xlsx 파일 생성

## 개발 명령어

### 서버 시작

```bash
npm start          # 프로덕션 모드
npm run dev        # 개발 모드 (nodemon 사용)
```

### 기본 설정

- 서버 포트: 3000 (기본값)
- URL: http://localhost:3000
- 메인 페이지: `public/index.html` (Express 표준 구조)
- 자동 디렉토리 생성: data/, logs/, public/
- Revit WebSocket: ws://localhost:3001/websocket

### 디버깅 및 모니터링

- ak
- 서버 로그는 콘솔에 출력
- 각 HTTP 요청이 타임스탬프와 함께 로깅
- WebSocket 연결 상태 실시간 모니터링
- 우아한 서버 종료 지원 (SIGTERM, SIGINT)

## 최근 추가된 주요 기능

### 1. 일위대가 관리 버튼 추가 ✅

- **위치**: 메인 페이지, 벽체 타입 관리와 Revit 연동 사이
- **기능**: 일위대가 관리 모달창 열기
- **구현**: `index.html`에 버튼 추가, `openUnitPriceManagement()` 함수 연결

### 2. 석고보드 테이블 구조 개선 ✅

- **변경사항**:
  - 18개 컬럼에서 19개 컬럼으로 확장
  - "작업" 컬럼에 실제 데이터 값 표시 (기존 수정/삭제 버튼 대신)
  - "관리" 컬럼을 별도 추가하여 수정/삭제 버튼 배치
- **위치**: `app-services.js` 2060라인 ~ showGypsumBoards() 함수

### 3. 석고보드 필터 기능 개선 ✅

- **필터 대상**: 품목, 품명, 규격 3개 필드만 필터링
- **초기화 버튼**: 관리 컬럼 아래로 이동 (18번째 위치)
- **실시간 검색**: 키 입력 시 즉시 필터링 적용
- **구현**: `filterGypsumBoards()` 및 `clearGypsumFilters()` 함수 완전 재작성

### 4. Excel/JSON 데이터 관리 기능 ✅

- **위치**: Revit 벽체 데이터 확인 탭
- **기능**:
  - Excel (.xlsx) 파일 내보내기 (SheetJS 라이브러리 사용)
  - JSON 파일 내보내기
  - Excel/JSON 파일 가져오기
  - 드롭다운 메뉴 인터페이스
- **구현 파일**: `revit-wall-handler.js`

### 5. Revit 객체 선택 기능 ✅

- **위치**: 필터 초기화 버튼 옆
- **기능**:
  - 체크박스로 선택된 벽체들의 ElementID 수집
  - WebSocket을 통해 Revit으로 전송
  - Revit에서 해당 객체들 자동 선택
- **통신 흐름**:
  ```
  웹 체크박스 → ElementID 수집 → WebSocket 전송 → C# 애드인 → Revit 선택
  ```
- **구현 파일**:
  - `revit-wall-handler.js`: 웹 클라이언트
  - `socketService.js`: WebSocket 통신
  - `revitService.js`: 서비스 계층

### 6. 면적 계산 기능 제거 ✅

- **제거된 기능**:
  - 선택 목록 면적 계산 버튼
  - Revit 면적요약 기능
  - 관련 UI 컴포넌트
- **목적**: 인터페이스 단순화 및 데이터 관리 기능으로 대체

### 7. 6가지 소요량 일괄 계산 시스템 ✅

- **위치**: 세부아이템 수정 → 구성품 추가 버튼 옆
- **기능**:
  - 6개 자재 동시 계산 (스터드, 런너, 피스, 타정총알, 용접봉, 석고피스)
  - 개별 할증률 적용 가능
  - 가로형 모달 레이아웃
  - 계산 결과 자동 적용
- **계산 공식**:
  - 스터드: `1 ÷ 간격값 × 할증률` (@400=0.4, @450=0.45, @500=0.5)
  - 런너: 일반 `0.34×2`, 더블 `0.34×4`
  - 피스: @450 기본값 12, @400는 `1.125×12` (버림), @500은 `12×0.9` (버림)
  - 타정총알: 할증률 기본값 1, 단위 SET
  - 용접봉: 피스와 동일하지만 기본값 0.08, 단위 KG, 셋째자리 버림
  - 석고피스: 복잡한 테이블 계산 (3×6, 4×8 등)
- **구현**: `unitPriceManager.js` 3038-3451라인

### 8. 노무비 처리 로직 개선 ✅ (2025-01-20 수정)

- **문제**: 자재 선택 시 노무비가 단가칸에 잘못 입력되는 문제
- **수정 내용**:
  - 노무비 금액이 **금액칸**에 정확히 입력됨
  - 단가는 **금액÷수량**으로 자동 계산됨
- **위치**: `unitPriceManager.js` 2473-2508라인
- **구현**: `fillComponentRowWithMaterial` 함수 내 노무비 처리 로직 완전 재작성
- **테스트**: 세부아이템 수정에서 노무비 포함 구성품 추가 시 정상 작동

### 9. Excel 견적서 수식 지원 기능 ✅ (2025-01-24 추가)

- **위치**: `wall-cost-calculator.js` 14885-15220라인 (`createEstimateDetailSheet` 함수)
- **기능**: Excel 견적서 내보내기 시 모든 계산을 수식으로 적용
- **구현 내용**:
  - **일반 항목**: 금액 = 수량 × 단가 수식
    - 자재비 금액(G열): `=IFERROR(E×F,0)`
    - 노무비 금액(I열): `=IFERROR(E×H,0)`
    - 경비 금액(K열): `=IFERROR(E×J,0)`
    - 합계 단가(L열): `=IFERROR(F+H+J,0)`
    - 합계 금액(M열): `=IFERROR(G+I+K,0)`
  - **SUB TOTAL 행**: 섹션별 SUM 수식
    - 단가와 금액 모두 합산: `=IFERROR(SUM(범위),0)`
  - **A~I 항목** (직접공사비 아래 9개 대분류):
    - 단가 열: 빈칸
    - 금액 열: 각 항목의 SUB TOTAL 참조 (예: `=IFERROR(G50,0)`)
  - **발주단가내역서**: 도급내역서와 동일한 로직 적용
  - **오류 처리**: IFERROR로 #VALUE! 오류 방지, 0으로 표시
  - **천단위 구분**: 모든 숫자 컬럼에 `#,##0` 포맷 적용
  - **정렬**: D열(단위) 중앙정렬
- **효과**: Excel에서 단가/수량 수정 시 금액 자동 재계산, 하위 섹션 변경 시 상위 항목 자동 업데이트

### 10. 1000단위 절사 기능 ✅ (2025-01-24 추가)

- **위치**: `wall-cost-calculator.js` 5951-5963라인 (`updateEstimateTotalAmount` 함수)
- **기능**: 견적서 갑지에 표시되는 총 금액을 1000단위로 절사 (버림)
- **구현**:
  ```javascript
  const roundedTotal = Math.floor(grandTotal / 1000) * 1000;
  ```
- **예시**: 2,112,567원 → 2,112,000원
- **적용 범위**: 갑지(표지) 금액 표시 및 한글 금액 표기
- **계산 출처**: `calculateEstimateGrandTotal()` 함수에서 직접공사비 + 간접공사비 합산

## 📡 API 엔드포인트

### 벽체 관리 API (`/api/walls`)

- `GET /api/walls` - 모든 벽체 조회
- `GET /api/walls/:id` - 특정 벽체 조회
- `POST /api/walls` - 새 벽체 생성
- `PUT /api/walls/:id` - 벽체 수정
- `DELETE /api/walls/:id` - 벽체 삭제
- `POST /api/walls/reorder` - 벽체 순서 변경
- `GET /api/walls/search/:query` - 벽체 검색

### 자재 관리 API (`/api/materials`)

- `GET /api/materials` - 모든 자재 조회
- `GET /api/materials/:id` - 특정 자재 조회
- `GET /api/materials/category/:category` - 카테고리별 자재 조회
- `GET /api/materials/categories/list` - 모든 카테고리 조회
- `POST /api/materials` - 새 자재 생성
- `PUT /api/materials/:id` - 자재 수정
- `DELETE /api/materials/:id` - 자재 삭제
- `GET /api/materials/search/:query` - 자재 검색
- `POST /api/materials/prices/update` - 가격 업데이트

### Revit 연동 API (`/api/revit`)

- `POST /api/revit/sync` - Revit 데이터 동기화
- `GET /api/revit/types` - Revit 타입 매핑 조회
- `POST /api/revit/types` - Revit 타입 매핑 저장
- `POST /api/revit/export` - Revit 데이터 내보내기
- `POST /api/revit/import` - Revit 데이터 가져오기
- `GET /api/revit/status` - Revit 연결 상태 확인
- `POST /api/revit/selectElements` - Revit 객체 선택 (ElementID 배열 전송)

### WebSocket 이벤트

#### 클라이언트 → 서버

- `revit:command`: Revit 명령 전송
- `revit:checkConnection`: Revit 연결 상태 확인

#### 서버 → 클라이언트

- `revit:connectionStatus`: Revit 연결 상태 응답
- `revit:response`: Revit 명령 실행 결과

#### Revit 명령 유형

- `selectWall`: 단일 벽체 선택
- `selectMultipleWalls`: 다중 벽체 선택
- **`selectElements`**: 지정된 ElementID 배열 객체 선택 (새로 추가)
- `CREATE_WALL_TYPES`: 벽체 타입 생성

## 테스트

현재 자동화된 테스트가 구성되어 있지 않습니다. 수동 테스트 방법:

1. 서버 시작: `npm start`
2. 브라우저에서 http://localhost:3000 접속 (`public/index.html` 로드)
3. 기능 테스트:
   - **일위대가 관리**: "일위대가 관리" 버튼 클릭 시 모달창 정상 표시
   - **자재 관리**: "자재 관리" 버튼 클릭 시 모달창 정상 표시
   - **타입 매칭**: "Revit 타입 매칭" 버튼 클릭 시 모달창 정상 표시
   - **디스플레이 시스템**: "기본값보기" 드롭다운 메뉴 정상 작동
   - **벽체 관리**: 벽체 생성, 편집, 삭제 테스트
   - **석고보드 필터링**: 품목/품명/규격 필드별 검색 및 초기화 테스트
   - **Excel/JSON 관리**: 드롭다운에서 내보내기/가져오기 테스트
   - **Revit 객체 선택**: 체크박스 선택 후 "Revit 객체 선택" 버튼 테스트
   - **견적서 내보내기**:
     - "Excel 내보내기" 버튼 클릭 시 .xlsx 파일 다운로드
     - Excel에서 갑지(표지) 금액 1000단위 절사 확인
     - Excel에서 을지(내역서) 수식 작동 확인 (셀 클릭 시 수식 표시)
     - 단가/수량 수정 시 금액 자동 재계산 확인
     - 모든 숫자에 천단위 구분(,) 적용 확인
4. Revit 연동 확인 (Revit 환경 필요)
5. 자재 계산 및 내보내기 검증

## 주요 개발 작업

### 새로운 벽체 유형 추가

1. `services/wallService.js`에서 벽체 타입 로직 추가
2. `public/js/app-core.js`에서 클라이언트 로직 업데이트
3. API 엔드포인트 테스트

### Revit 연동 확장

1. `services/revitService.js`에서 작업
2. `api/revit.js`에서 새로운 엔드포인트 추가
3. 클라이언트 사이드 연동 코드 업데이트
4. WebSocket 명령 추가

### 자재 데이터베이스 변경

1. `services/materialService.js`에서 로직 업데이트
2. 데이터 마이그레이션 스크립트 작성 (필요시)
3. API 엔드포인트 테스트

## 중요 사항

- **한국어**: 모든 UI 텍스트와 주석이 한국어로 작성됨
- **Revit 의존성**: 전체 기능 사용을 위해 Revit + C# 애드인 환경 필요
- **WebSocket 통신**: HTTP/WebSocket 기반 (WebView2 아님)
- **자재 시스템**: 하이브리드 데이터 관리 (하드코딩 기본 데이터 + IndexedDB 사용자 데이터)
- **데이터 안전성**: 기본 데이터 항상 보장 + 백업/복원 시스템
- **오프라인 지원**: 인터넷 연결 없이 완전한 기능 제공
- **데이터 초기화**: 서버 시작 시 필요한 디렉토리 자동 생성
- **오류 처리**: 포괄적인 로깅 시스템과 오류 추적
- **CORS 설정**: 로컬 개발 및 클라우드 배포 지원
- **보안**: 10MB 제한의 요청 파싱, 오류 정보 노출 방지
- **ES6 모듈 시스템**: 클라이언트 사이드에서 모듈 시스템 사용
- **전역 함수 노출**: `window.priceDB`, `window.openRevitTypeMatching`, `window.selectInRevit` 등
- **외부 라이브러리**:
  - SheetJS 0.18.5 (Excel 파일 읽기/쓰기)
  - ExcelJS 4.4.0 (Excel 파일 생성 및 수식 지원)
  - Socket.IO 4.7.4 (WebSocket 통신)
  - Dexie.js (IndexedDB 래퍼)
  - Font Awesome 6.4.0 (아이콘)

## 브라우저 호환성

- ES6+ 기능을 위한 최신 브라우저 필요
- WebSocket 지원 브라우저
- Dexie.js (IndexedDB) 지원 브라우저
- 로컬 서버 환경에서 실행 (http://localhost:3000)
- 클라우드 배포 시 Mixed Content 정책 고려 필요

## 보안 고려사항

- 로컬 서버 환경에서 개발
- CORS 설정으로 허용된 도메인만 접근
- 요청 크기 제한 (10MB)
- 민감한 오류 정보 노출 방지
- 클라우드 배포 시 HTTPS 필수
- Revit 애드인은 항상 로컬 실행

## 배포 및 운영

### 개발 환경

- `npm run dev` (nodemon 사용)
- localhost:3000 (웹 서버)
- localhost:3001 (Revit WebSocket)

### 프로덕션 환경 (권장: Render)

- `npm start`
- 포트 설정: 환경변수 PORT 또는 기본값 3000
- 환경변수 설정:
  ```
  NODE_ENV=production
  PORT=10000
  ```
- 로그 파일: logs/ 디렉토리에 저장
- 데이터 파일: data/ 디렉토리에 저장

### 클라우드 배포 고려사항

- **웹 앱**: 클라우드 플랫폼 (Render, Railway 등)
- **Revit 애드인**: 항상 로컬 PC에서 실행
- **통신**: 클라우드 웹앱 ↔ 로컬 Revit 애드인
- **CORS**: 클라우드 도메인 허용 설정 필요

## 파일 정리 상태

### 프로젝트 구조 정리 내역

- ✅ 중복 파일 삭제: 루트 `css/`, `js/`, `index.html` 제거
- ✅ Express 표준 구조 적용: `public/` 폴더만 정적 파일 서빙
- ✅ 서버 설정 수정: `public/index.html` 사용
- ✅ 자재 관리 및 타입 매칭 기능 정상 작동 확인
- ✅ Excel/JSON 데이터 관리 기능 추가
- ✅ Revit 객체 선택 기능 추가
- ✅ 면적 계산 기능 제거
- ✅ 일위대가 관리 버튼 추가
- ✅ 석고보드 테이블 19개 컬럼 구조로 개선
- ✅ 석고보드 필터 기능 개선 (품목/품명/규격만 필터링)
- ✅ 초기화 버튼 위치 조정 (관리 컬럼 아래)
- ✅ Excel 견적서 수식 지원 추가 (2025-01-24)
- ✅ 1000단위 절사 기능 추가 (2025-01-24)

### 불필요한 파일

- `QTOForm.cs`: 루트 디렉토리에 있는 C# 파일 (이동 필요)
- `server.log`, `server.pid`: 런타임 생성 파일 (.gitignore 추가 권장)

## 데이터 시스템 구조

### 하이브리드 데이터 관리 시스템

현재 시스템은 로컬/오프라인 환경에 최적화된 **3계층 하이브리드 구조**를 사용합니다:

#### 1계층: 기본 데이터 (하드코딩)

- **파일**: `public/js/modules/priceDatabase.js`
- **내용**: 55개 경량자재 + 49개 석고보드 기본 데이터
- **특징**: 브라우저 설치 즉시 사용 가능, 절대 소실되지 않음
- **카테고리**:
  - 경량자재: STUD_KS, RUNNER_KS, STUD_BS, RUNNER_BS, CH_STUD_J_RUNNER, BEADS, FASTENERS
  - 석고보드: STANDARD, MOISTURE, FIRE, FIRE_MOISTURE, SOUND, ANTIBACTERIAL, INSULATION

#### 2계층: 사용자 데이터 (IndexedDB)

- **저장소**: 브라우저 내장 IndexedDB
- **내용**: 사용자가 추가/수정한 자재 데이터, 벽체 데이터
- **특징**: 실시간 저장, 빠른 접근, 브라우저별 독립 관리
- **위치**: `C:\Users\[사용자]\AppData\Local\Google\Chrome\User Data\Default\IndexedDB\`

#### 3계층: 백업/복원 (파일 시스템)

- **기능**: Excel/JSON 파일 내보내기/가져오기
- **용도**: 데이터 이동성, 백업, 브라우저 간 데이터 전송
- **지원 형식**: .xlsx (Excel), .json (JSON)
- **구현**: `revit-wall-handler.js`의 드롭다운 메뉴

### 데이터 안전성 보장

1. **기본 데이터 항상 보장**: 하드코딩으로 기본 자재 데이터 항상 사용 가능
2. **사용자 데이터 보호**: IndexedDB + 파일 백업으로 이중 보장
3. **복구 시스템**: JSON 파일을 통한 완전한 데이터 복원 가능
4. **오프라인 지원**: 인터넷 연결 없이 모든 기능 완전 동작

### 배포 및 운영 장점

- ✅ **즉시 사용**: 설치 후 바로 기본 데이터로 작업 가능
- ✅ **데이터 소실 방지**: 기본 데이터는 절대 사라지지 않음
- ✅ **사용자 커스터마이징**: 개별 사용자 환경에 맞는 데이터 추가/수정
- ✅ **이식성**: JSON 파일로 다른 PC나 브라우저로 데이터 이동
- ✅ **유지보수성**: 기본 데이터는 코드로, 사용자 데이터는 파일로 관리

# important-instruction-reminders

Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (\*.md) or README files. Only create documentation files if explicitly requested by the User.
