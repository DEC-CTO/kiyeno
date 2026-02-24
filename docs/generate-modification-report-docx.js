const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents } = require('docx');

// ─── 색상 상수 ───
const BLUE = "003366";
const LIGHT_BLUE = "D6E4F0";
const LIGHT_GRAY = "F2F2F2";
const WHITE = "FFFFFF";
const BLACK = "000000";

// ─── 테두리 스타일 ───
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ─── 셀 생성 헬퍼 ───
function headerCell(text, width, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.columnSpan,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, bold: true, color: WHITE, size: 20, font: "맑은 고딕" })]
    })]
  });
}

function dataCell(text, width, opts = {}) {
  const children = [];
  if (Array.isArray(text)) {
    text.forEach((line, i) => {
      if (i > 0) children.push(new TextRun({ text: "", break: 1 }));
      children.push(new TextRun({
        text: line,
        size: opts.size || 19,
        font: "맑은 고딕",
        bold: opts.bold || false,
        color: opts.color || BLACK
      }));
    });
  } else {
    children.push(new TextRun({
      text: text || "",
      size: opts.size || 19,
      font: "맑은 고딕",
      bold: opts.bold || false,
      color: opts.color || BLACK
    }));
  }

  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.columnSpan,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 30, after: 30 },
      indent: opts.indent ? { left: opts.indent } : undefined,
      children
    })]
  });
}

// ─── 분류별 색상 매핑 ───
function getCategoryColor(cat) {
  if (cat.includes("버그")) return "E2EFDA";     // 연두
  if (cat.includes("안정")) return "D6E4F0";     // 연파랑
  if (cat.includes("기능 추가")) return "FCE4D6"; // 연주황
  if (cat.includes("기능 개선")) return "FFF2CC"; // 연노랑
  if (cat.includes("UI")) return "E2D9F3";       // 연보라
  return WHITE;
}

// ─── 33개 항목 데이터 ───
const items = [
  {
    no: 1,
    title: "신규자재 추가 시 사이즈 입력값 저장 안 됨",
    category: "버그 수정",
    files: "priceDatabase.js, app-services.js",
    symptom: "경량부품 추가 화면에서 사이즈 필드에 값을 입력하고 저장해도 해당 값이 저장되지 않는 문제",
    cause: "addLightweightComponent() 함수에서 새로운 자재 객체를 생성할 때 size 필드가 누락되어 있었음. 입력 단계에서는 사이즈 값을 정상적으로 수집하고 있었으나, 저장 단계에서 해당 필드를 객체에 포함하지 않아 값이 소실됨",
    fix: [
      "addLightweightComponent() 함수 내 자재 객체 생성부에 size: materialData.size || '' 항목 추가",
      "공종1/공종2/부위 필드의 하드코딩 기본값('경량', '벽체') 제거 → 사용자 입력값 존중하도록 변경"
    ]
  },
  {
    no: 2,
    title: "자재관리 초기화 해도 기본 데이터베이스가 안 지워짐",
    category: "기능 개선",
    files: "app-services.js, priceDatabase.js, app-ui.js",
    symptom: "자재 관리 화면에서 초기화 기능을 실행해도 기본 데이터베이스(하드코딩된 경량자재/석고보드)가 삭제되지 않는 문제",
    cause: "기존 초기화 기능이 사용자 추가 데이터만 제거하고, 하드코딩된 기본 데이터(55개 경량자재 + 49개 석고보드)는 항상 복구하는 구조였음",
    fix: [
      "초기화 옵션을 2가지로 분리하여 드롭다운 메뉴에 제공",
      "  - 원본으로 초기화: 모든 수정사항을 삭제하고 기본 데이터로 복구 (기존 동작)",
      "  - 완전초기화: 기본 데이터 포함 모든 자재 데이터를 삭제하여 빈 테이블 상태로 만듦",
      "_isFullReset 플래그 및 localStorage 상태 관리를 추가하여, 완전초기화 후 페이지 새로고침 시에도 기본 데이터가 자동 복구되지 않도록 처리",
      "resetToOriginal(), fullResetToEmpty() 함수 및 확인 경고 모달 추가"
    ]
  },
  {
    no: 3,
    title: "월타입 신규 작성시 시간별 저장만 가능, 분류 정렬이 안됨",
    category: "기능 추가",
    files: "excelWallTypeManager.js, revitTypeMatching.js, unitPriceManager.js",
    symptom: "벽체 타입 목록에서 순서를 변경할 수 없고, 시간순(저장순)으로만 표시됨. 사용자가 원하는 순서로 분류/정렬하는 기능이 없음",
    cause: "벽체 타입 목록에 순서 정보(sortOrder) 필드가 없어 저장 시간순으로만 표시되었음",
    fix: [
      "3개 모듈에 드래그 드랍 순서 변경 기능 추가",
      "  - excelWallTypeManager.js: Excel 일위대가 벽체타입 목록에 드래그 드랍 구현",
      "  - revitTypeMatching.js: Revit 벽체 타입 매칭 목록에 드래그 드랍 구현",
      "  - unitPriceManager.js: 일위대가 구성품 행에 드래그 드랍 구현",
      "No(번호) 컬럼을 드래그 핸들로 지정 (cursor: grab, 툴팁 표시)",
      "드래그 시 시각적 피드백 제공 (투명도 변경, 파란 테두리 표시)"
    ]
  },
  {
    no: 4,
    title: "키비스에서 레빗 연동시 잦은 오류 발생",
    category: "안정성 개선",
    files: "unitPriceManager.js, app-ui.js, app-services.js, revitTypeMatching.js, wall-cost-calculator.js, app-core.js, main.js",
    symptom: "레빗 연동 중 오류 발생 시 페이지가 먹통이 되어 Ctrl+F5(강제 새로고침)를 해야만 복구됨. 장시간 사용(30분~3시간) 후 버튼이 먹통이 되는 현상 발생",
    cause: "SPA 구조에서 자주 발생하는 메모리 누수 문제로, 9개의 이벤트 리스너 메모리 누수 발견. 자동 저장 타이머(30초 간격)가 페이지 닫아도 계속 실행됨. 전역 에러 핸들러 부재로 처리되지 않은 에러가 앱 전체를 중단시킴",
    fix: [
      "메모리 누수 방지: 9개 이벤트 리스너 중복 제거",
      "자동 저장 타이머 정리: beforeunload 이벤트에서 clearInterval 처리",
      "전역 에러 핸들러 추가: window.error, unhandledrejection 처리",
      "try-catch 블록 96% 이상 커버리지 확보",
      "계산 실패 시 토스트 알림으로 사용자 피드백 제공",
      "1분마다 메모리 사용량 체크, 90% 이상 시 경고",
      "1시간마다 장시간 사용 감지, 2시간 이상 사용 시 새로고침 권장"
    ]
  },
  {
    no: 5,
    title: "노무비 입력 및 저장 문제",
    category: "버그 수정",
    files: "unitPriceManager.js",
    symptom: "경량부품 편집 시 노무비를 100단위로 기입해야만 저장 가능하고, 경고 메시지가 없어 원인 파악 불가. 노무비를 수기로 직접 입력하는 기능이 없음",
    cause: "기존 노무비 처리 로직이 일반 자재와 동일한 방식(단가 × 수량 = 금액)으로 계산되어, 노무비 금액을 단가 필드에 입력하는 구조로 되어 있어 의도하지 않은 값이 산출됨",
    fix: [
      "노무비 계산 방식 변경: 금액을 직접 입력하고 단가는 금액÷수량으로 자동 계산되도록 변경",
      "isLaborCost() 함수 추가로 노무비/인건비/시공비 등 키워드 기반 자동 판별",
      "노무비 수기 입력 지원: 자재 선택 시 노무비 데이터가 있으면 금액 컬럼에 직접 값 설정",
      "단가 컬럼에는 계산된 단가, 금액 컬럼에는 입력된 금액이 올바르게 표시되도록 수정"
    ]
  },
  {
    no: 6,
    title: "벽체관리에서 자재삽입 순서 변경 기능 요청",
    category: "기능 추가",
    files: "unitPriceManager.js",
    symptom: "세부 아이템 수정 화면에서 구성품(자재) 행의 순서가 잘못 삽입된 경우 순서를 변경할 수 없음. 삭제 후 다시 추가해야 하는 불편함",
    cause: "구성품 행에 순서 변경 기능이 구현되어 있지 않았음",
    fix: [
      "세부 아이템 수정 화면의 구성품 행에 드래그 드랍 순서 변경 기능 추가",
      "No(번호) 컬럼을 드래그 핸들로 지정 (grab 커서, 툴팁)",
      "드래그 시 시각적 피드백 제공 (불투명도 변경, 대상 행 위에 파란색 테두리)",
      "드롭 후 calculateGrandTotal() 호출로 재료비/노무비 합계 자동 재계산"
    ]
  },
  {
    no: 7,
    title: "벽체 타입 관리 테이블 두께 컬럼 위치 이동",
    category: "UI 개선",
    files: "excelWallTypeManager.js, revitTypeMatching.js, revit-wall-handler.js, app-ui.js",
    symptom: "\"두께(mm)\" 컬럼이 테이블 맨 뒤에 위치하여 WallType과의 연관성을 한눈에 파악하기 어려움",
    cause: "초기 테이블 설계 시 두께 컬럼이 마감/구조체/단열재 컬럼 뒤에 배치되어 있었음",
    fix: [
      "\"두께(mm)\" 컬럼을 WallType 컬럼 바로 뒤로 위치 이동",
      "변경 전: 체크박스 → No → WallType → 좌측마감 → 구조체 → 단열재 → 우측마감 → 옵션 → 두께 → ...",
      "변경 후: 체크박스 → No → WallType → 두께 → 좌측마감 → 구조체 → 단열재 → 우측마감 → 옵션 → ...",
      "벽체 타입 관리와 Revit 타입 매칭 양쪽 테이블 모두 동일하게 적용"
    ]
  },
  {
    no: 8,
    title: "일위대가 C-50형 아이템 적용 시 석고보드 450 표시 오류",
    category: "버그 수정",
    files: "revitTypeMatching.js, unitPriceManager.js, excelWallTypeManager.js",
    symptom: "벽체 타입 관리의 구조체 컬럼에 일위대가를 적용했을 때 원본 ID가 그대로 표시되고 C-50형인데 석고보드 450으로 잘못 표시되는 문제",
    cause: "일위대가 ID를 표시명으로 변환하는 getUnitPriceDisplayName() 함수에서 캐시 조회 실패 시 원본 ID를 그대로 반환. 일위대가 데이터를 메모리 배열, localStorage, IndexedDB 3가지 방식으로 혼용하여 캐시 동기화 문제 발생",
    fix: [
      "단일 데이터 소스 도입: getAllUnitPricesForExternal() 단일 함수로 통일",
      "DB 직접 조회: 메모리 캐시 의존 대신 IndexedDB에서 직접 조회하도록 변경",
      "두께 자동 재계산: 일위대가 적용 직후 recalcWallThickness() 호출로 자동 재계산"
    ]
  },
  {
    no: 9,
    title: "벽체 타입 작성 시 레이어 컬럼 자유 추가/삭제 기능",
    category: "기능 추가",
    files: "excelWallTypeManager.js, revitTypeMatching.js",
    symptom: "기본 제공되는 레이어 컬럼 외에 추가 레이어가 필요한 경우 대응할 수 없음",
    cause: "벽체 타입 테이블의 컬럼이 고정 12개로만 구성되어 있어 동적 확장이 불가능했음",
    fix: [
      "\"컬럼 추가\" 버튼 클릭 시 5개 위치(좌측마감 뒤, 구조체 뒤, 단열재 뒤, 우측마감 뒤, 옵션 뒤) 중 선택하여 추가",
      "추가된 컬럼 헤더의 \"×\" 버튼으로 삭제 가능",
      "벽체타입 객체에 extraLayers 배열을 추가하여 동적 컬럼 데이터 관리",
      "기본 12개 컬럼 + 추가 컬럼 모두 포함하여 자재비, 노무비, 두께 자동 합산",
      "Excel 메타행(숨김) 포함으로 내보내기/불러오기 시 추가 컬럼 구조 보존"
    ]
  },
  {
    no: 10,
    title: "일위대가 관리에서 검색 기능 및 컬럼 순서 변경",
    category: "기능 추가",
    files: "unitPriceManager.js, revitTypeMatching.js, excelWallTypeManager.js",
    symptom: "일위대가 목록이 많아질수록 원하는 항목을 찾기 어려움. 월타입에서 일위대가 선택 시에도 검색 기능이 없어 불편. SIZE 컬럼 위치 부적절",
    cause: "일위대가 목록에 검색/필터 기능이 구현되어 있지 않았음. 테이블 컬럼 순서가 사용 편의성을 고려하지 않고 배치",
    fix: [
      "컬럼 순서 변경: 아이템→SIZE→간격→높이→부위→공종1→공종2→단위→재료비→노무비→경비→총계 순으로 통일",
      "월타입 일위대가 선택 시 검색 기능 추가: \"품명 또는 규격 검색\" 입력 필드, 200ms 디바운스 적용"
    ]
  },
  {
    no: 11,
    title: "월 타입 전송 시 CompoundStructure 오류 발생",
    category: "버그 수정",
    files: "WallTypeCreate.cs, QTOForm.cs (C#)",
    symptom: "Revit으로 벽체 타입 전송 시 다수 벽체에서 \"CompoundStructure is not valid\" 에러 발생. 성공 17개, 실패 12개",
    cause: "SetStructuralCore() 메서드에서 SetNumberOfShellLayers() API 호출 시, 계산된 외부/내부 쉘 레이어 개수가 실제 레이어 구조와 맞지 않아 검증 실패",
    fix: [
      "SetStructuralCore 호출 비활성화: SetStructuralCore() 메서드 호출을 주석 처리하여 오류 해결",
      "트랜잭션 개별 처리: 벽체 타입별 개별 트랜잭션으로 변경하여 실패 격리",
      "결과 요약 표시: 성공/실패 개수 및 실패 벽체별 상세 오류 메시지를 TaskDialog로 표시",
      "WebSocket 메시지 처리 개선: StringBuilder로 분할 메시지 누적 후 완전한 메시지 수신 처리"
    ]
  },
  {
    no: 12,
    title: "CAD 벽체 시공색 Revit 적용 및 벽체별 색상 구분 기능",
    category: "기능 추가",
    files: "revit-wall-handler.js, styles.css, index.html, QTOForm.cs, priceComparisonManager.js",
    symptom: "CAD 파일에서 불러온 벽체의 시공색이 Revit에 자동 적용되지 않음. 벽체 타입별 시각적 구분이 어려워 작업 효율 저하",
    cause: "Revit 색상 오버라이드 기능이 구현되어 있지 않았음. 웹 테이블 및 Revit 3D 뷰에서 벽체별 색상 구분 기능이 없었음",
    fix: [
      "웹 테이블 벽체 색상 구분: HSL 컬러 스페이스 기반 자동 색상 생성 (25% 투명도 + 좌측 4px 색상 바)",
      "Revit 3D 뷰 색상 오버라이드: ApplyWallColors() 함수에서 표면(Surface)과 절단면(Cut) 모두에 색상 적용",
      "색상표(범례) 생성: Drafting View로 색상표 자동 생성",
      "색상 초기화 기능 및 자재별 벽체 색상 하이라이트 기능 추가",
      "드롭다운 메뉴에 \"벽체 색상 반영\", \"색상표 생성\", \"색상 초기화\" 버튼 추가"
    ]
  },
  {
    no: 13,
    title: "자재편집에서 노무비 직접 입력 가능하도록 변경",
    category: "기능 개선",
    files: "app-services.js, priceDatabase.js",
    symptom: "경량부품 편집 화면에서 자재비, 노무비 필드가 하드코딩되어 사용자가 직접 수정할 수 없음. 노무비, 기준 노무비 필드가 0으로 고정",
    cause: "기본 자재 데이터(하드코딩)의 자재비, 노무비 값이 읽기 전용으로 처리되어 사용자 편집이 불가능한 구조였음",
    fix: [
      "자재비(원), 노무비(원), 기준 노무비(원) 필드를 직접 입력 가능한 구조로 변경",
      "노무비 계산 섹션(기준 노무비 설정, 생산성 및 보할 설정)도 편집 가능하도록 개방",
      "사용자가 입력한 노무비 데이터가 IndexedDB에 정상 저장되도록 저장 로직 수정"
    ]
  },
  {
    no: 14,
    title: "구성품 삭제 시 경고창 추가",
    category: "UI 개선",
    files: "unitPriceManager.js",
    symptom: "세부 아이템 수정 화면에서 구성품 행의 삭제 버튼 클릭 시 확인 없이 즉시 삭제됨. 실수로 클릭할 경우 데이터 복구 불가능",
    cause: "removeComponentRow() 함수에서 삭제 확인 절차 없이 row.remove()를 바로 실행하는 구조였음",
    fix: [
      "구성품 삭제 시 confirm() 확인 대화상자 추가하여 사용자 동의 후에만 삭제 실행",
      "삭제 대상 품명을 자동 추출하여 확인 메시지에 표시 (예: '스터드 65×45을(를) 삭제하시겠습니까?')",
      "품명 추출 시 select 드롭다운 → 텍스트 내용 → '이 구성품' 순서로 폴백 처리"
    ]
  },
  {
    no: 15,
    title: "자재 추가 기능 구현",
    category: "버그 수정",
    files: "priceDatabase.js, app-services.js",
    symptom: "신규 경량부품 추가 시 \"추가\" 버튼을 클릭해도 자재가 저장되지 않음. 사이즈 입력값 누락, 공종1/공종2/부위 필드가 하드코딩 기본값으로 덮어써짐",
    cause: "addLightweightComponent() 함수에서 size 필드 누락, workType1/workType2/location 필드가 하드코딩. IndexedDB 저장 로직이 비동기 처리되지 않아 저장 완료 전 함수 종료",
    fix: [
      "addLightweightComponent() 함수에 size 필드 추가하여 사이즈 입력값 정상 저장",
      "하드코딩 제거, 사용자 입력값(materialData)을 그대로 저장하도록 변경",
      "addLightweightComponent() 및 addLightweightMaterial() 함수를 async로 변경하여 IndexedDB 저장 완료 보장",
      "저장 성공 후 모달 자동 닫힘 처리, 실패 시 토스트 알림 + alert"
    ]
  },
  {
    no: 16,
    title: "자재 관리 필터 기능 구현 및 수정",
    category: "기능 추가",
    files: "app-services.js",
    symptom: "자재 관리 테이블에서 원하는 자재를 검색할 수 있는 필터 기능이 없음. 65개 이상의 경량부품 목록에서 특정 자재를 찾기 어려움",
    cause: "자재 관리 모달의 경량부품 테이블에 필터 입력 기능이 구현되어 있지 않았음",
    fix: [
      "테이블 헤더 아래에 품목, 자재명, 규격 3개 필드에 대한 인라인 필터 입력란 추가",
      "onkeyup 이벤트로 키 입력 시 실시간 필터링 적용 (대소문자 무시, 부분 일치 검색)",
      "3개 필터 조건을 AND 로직으로 동시 적용",
      "관리 컬럼에 \"초기화\" 버튼 배치, 하단 상태 표시줄에 필터링 결과 카운트 표시"
    ]
  },
  {
    no: 17,
    title: "자재 편집 '작업' 필드를 '비고'로 변경",
    category: "UI 개선",
    files: "app-services.js",
    symptom: "자재 편집 화면의 '작업' 필드가 어떤 용도로 사용되는지 불명확하여 사용자 혼란",
    cause: "필드 레이블이 '작업'으로 되어 있어 필드의 실제 용도(비고/참고사항)와 맞지 않았음",
    fix: [
      "자재 편집 모달의 필드 레이블을 '작업'에서 '비고'로 변경",
      "경량부품 테이블의 컬럼 헤더도 '작업'에서 '비고'로 변경",
      "내부 데이터 필드명(work)은 유지하여 기존 데이터 호환성 보장 (UI 레이블만 변경)"
    ]
  },
  {
    no: 18,
    title: "벽체타입 생성 미리보기 시 두께 추출 실패 오류",
    category: "버그 수정",
    files: "revitTypeMatching.js",
    symptom: "벽체타입 생성 미리보기 시 \"구조체: C-STUD 두께 추출 실패\", \"마감 Layer: 일반석고보드 두께 추출 실패\" 등 오류 발생. 총 두께가 0mm로 표시됨",
    cause: "자재 정보가 IndexedDB에 저장되지 않은 상태에서 미리보기를 실행하면, 두께 추출 함수가 자재 데이터를 찾지 못해 null을 반환. 자재 정보를 먼저 저장하면 정상 작동",
    fix: [
      "미리보기 시 비동기(async/await)로 IndexedDB에서 자재 데이터를 조회하여 두께 추출",
      "두께 추출 실패 시 구체적인 오류 메시지 표시 (어떤 레이어의 어떤 자재에서 실패했는지 명시)",
      "오류가 있는 벽체 타입은 빨간색 박스로 강조 표시, \"Revit에서 생성하기\" 버튼 비활성화"
    ]
  },
  {
    no: 19,
    title: "벽체 색상 반영 시 평면도/단면도에 적용 안 됨",
    category: "버그 수정",
    files: "QTOForm.cs (C#)",
    symptom: "\"벽체 색상 반영\" 기능 실행 시 3D 뷰와 입면도에서는 색상이 정상 표시되나, 평면도 및 단면도에서는 색상이 적용되지 않음",
    cause: "Revit에서 평면도와 단면도는 벽체의 절단면(Cut) 표현을 사용하는데, 기존 구현에서 표면(Surface) 패턴 색상만 설정하고 절단면(Cut) 패턴 색상은 설정하지 않았음",
    fix: [
      "ApplyWallColors() 함수에서 절단면(Cut) 색상 설정 코드 추가",
      "SetCutForegroundPatternColor(), SetCutBackgroundPatternColor(): 절단면 색상 적용",
      "SetCutForegroundPatternId(), SetCutBackgroundPatternId(): 절단면에 솔리드 채우기 패턴 적용",
      "3D 뷰, 입면도, 평면도, 단면도 모든 뷰 타입에서 벽체 색상 표시"
    ]
  },
  {
    no: 20,
    title: "벽체 색상 반영/초기화 시 선택 및 필터 동작 개선",
    category: "기능 개선",
    files: "revit-wall-handler.js",
    symptom: "체크박스로 벽체를 선택하지 않아도 전체 벽체에 색상이 반영됨. 필터 적용 후 체크박스로 선택한 객체만 색상을 반영할 수 없음. 필터 적용/초기화 시 색상 초기화가 안 됨",
    cause: "applyWallColors() 함수가 체크박스 선택 상태를 확인하지 않고 필터된 전체 벽체에 색상을 적용하는 구조. 필터 적용/초기화 시 테이블 재렌더링으로 색상 정보 유실",
    fix: [
      "선택한 벽체만 색상 반영: .revit-row-checkbox:checked 체크박스 상태 확인",
      "필터 후에도 체크박스 선택 기반으로 동작하도록 변경",
      "reapplyColorsToTable() 함수 추가: 필터 적용/초기화 후 wallColorMap 기반 색상 재적용",
      "clearWallColors() 함수도 체크박스 선택된 벽체만 초기화, 미선택 벽체 색상 유지"
    ]
  },
  {
    no: 21,
    title: "자재 관리 테이블 싸이즈 정보 수정",
    category: "UI 개선",
    files: "app-services.js, priceDatabase.js",
    symptom: "자재 관리 테이블에서 규격과 싸이즈 정보가 명확히 구분되지 않아 사용자 혼란 발생",
    cause: "규격(spec)과 싸이즈(size) 데이터가 테이블에서 명확히 분리 표시되지 않았음",
    fix: [
      "규격과 싸이즈 컬럼을 분리하여 표시",
      "  - 규격 컬럼: 자재 규격 표시 (예: '50형', '60형') — item.spec 필드",
      "  - 싸이즈 컬럼: 물리적 치수 표시 (예: '0.8T*50*45') — item.size 필드",
      "각 컬럼에 툴팁 추가하여 컬럼 용도 명확화"
    ]
  },
  {
    no: 22,
    title: "모달 닫기 버튼 위치 통일",
    category: "UI 개선",
    files: "app-ui.js, app-services.js, unitPriceManager.js, styles.css",
    symptom: "자재 관리, 벽체 타입 관리, 일위대가 관리 등 각 모달의 닫기 버튼 위치가 제각각 (하단 우측, 상단 우측, 하단 중앙)",
    cause: "모달 생성 함수들이 개별적으로 구현되어 닫기 버튼의 위치와 스타일이 통일되지 않았음",
    fix: [
      "모든 모달의 닫기 버튼을 우측 상단 X 버튼으로 통일",
      "createModal() 함수에서 모달 헤더에 flexbox 레이아웃 적용 (타이틀 좌측, X 버튼 우측)",
      "X 버튼 스타일: 32×32px, × 심볼, 호버 시 회색 배경 효과",
      "하단 텍스트 '닫기' 버튼 제거"
    ]
  },
  {
    no: 23,
    title: "자재 추가 화면 '규격 자동 추출' 안내 문구 삭제",
    category: "UI 개선",
    files: "app-services.js",
    symptom: "자재 추가/편집 화면 하단에 '규격은 자재명에서 자동 추출됩니다.' 안내 문구가 표시되어 있으나, 실제로는 자동 추출되지 않아 잘못된 안내",
    cause: "초기 설계 시 자재명에서 규격을 자동 추출하는 기능을 계획했으나, 실제 운영에서는 자재명 형식이 다양하여 자동 추출이 불가능한 경우가 많아 사용자 직접 입력으로 변경",
    fix: [
      "자재 추가/편집 모달 하단의 안내 문구 삭제",
      "규격 필드를 사용자가 직접 입력하는 방식으로 변경 확정"
    ]
  },
  {
    no: 24,
    title: "Revit 선택 객체 체크박스 연동 및 선택 항목만 보기",
    category: "기능 추가",
    files: "revit-wall-handler.js, socketService.js, QTOForm.cs, index.html",
    symptom: "Revit에서 벽체를 선택하면 노란색 하이라이트가 표시되지만 10초 후 사라져 선택 정보 유실. 선택된 벽체만 필터링하여 볼 수 없음",
    cause: "하이라이트 효과만 적용되고 체크박스 상태에는 반영되지 않아 하이라이트 해제 후 선택 정보가 유실됨",
    fix: [
      "체크박스 자동 체크: Revit에서 벽체 선택 시 해당 행의 체크박스를 자동 체크 (하이라이트 해제 후에도 유지)",
      "\"선택 항목만\" 버튼 추가: filterCheckedOnly() 함수로 체크된 벽체만 테이블에 표시",
      "\"선택 필터 해제\" 버튼으로 전체 목록 복원",
      "통신 흐름: Revit 객체 선택 → WebSocket(revit:elementSelected) → 서버 중계 → 웹 테이블 체크박스 자동 체크"
    ]
  },
  {
    no: 25,
    title: "차트 재료비/노무비 색상 통일",
    category: "UI 개선",
    files: "wall-cost-calculator.js",
    symptom: "벽체 타입별 비교, 실별 비용 분포, 레벨별 비용 분포 3개 차트에서 재료비와 노무비의 색상이 각각 다르게 표시되어 혼란",
    cause: "각 차트 렌더링 함수에서 색상을 개별적으로 지정하여 일관성이 없었음",
    fix: [
      "3개 차트 모두 동일한 색상으로 통일: 재료비 #4CAF50(초록), 노무비 #FF9800(주황)",
      "실별 비용 분포: 파랑/노랑 → 초록/주황으로 변경",
      "레벨별 비용 분포: 보라/빨강 → 초록/주황으로 변경"
    ]
  },
  {
    no: 26,
    title: "생성된 벽체가 구조벽으로 설정되는 문제",
    category: "버그 수정",
    files: "CADLineWallData.cs (C#)",
    symptom: "Kiyeno에서 Revit으로 벽체를 생성하면 \"구조\" 체크박스가 활성화되어 구조벽으로 생성됨. 경량벽체는 건축벽이어야 하므로 매번 수동 변경 필요",
    cause: "C# Revit 애드인에서 벽체 생성 시 STRUCTURAL_ANALYTICAL_MODEL 파라미터가 설정되지 않아 Revit 기본값인 구조벽으로 생성됨",
    fix: [
      "벽체 생성 함수에서 STRUCTURAL_ANALYTICAL_MODEL 파라미터를 0으로 설정하여 건축벽으로 생성",
      "  - 0 = 건축벽 (구조 체크박스 해제)",
      "  - 1 = 구조벽 (구조 체크박스 활성화)"
    ]
  },
  {
    no: 27,
    title: "데이터 지우기 시 선택한 벽체만 삭제되도록 변경",
    category: "기능 개선",
    files: "revit-wall-handler.js",
    symptom: "\"데이터 지우기\" 버튼 클릭 시 전체 Revit 벽체 데이터가 일괄 삭제됨. 특정 벽체만 선택적으로 삭제할 수 없음",
    cause: "clearRevitData() 함수가 revitWallData = []로 전체 배열을 초기화하는 구조여서 선택적 삭제가 불가능했음",
    fix: [
      "체크박스 선택 기반 삭제로 변경: .revit-row-checkbox:checked로 선택된 행만 대상으로 삭제",
      "선택된 벽체의 ElementId를 Set으로 수집 후, Array.filter()로 해당 항목만 제거",
      "확인 메시지도 선택된 개수 기반으로 변경",
      "미선택 시 \"삭제할 벽체를 선택하세요\" 안내 표시"
    ]
  },
  {
    no: 28,
    title: "색상범례(색상표) 생성 기능 추가",
    category: "기능 추가",
    files: "revit-wall-handler.js, QTOForm.cs, index.html",
    symptom: "\"벽체 색상 반영\" 후 어떤 색상이 어떤 벽체 타입을 의미하는지 확인할 수 있는 범례가 없음",
    cause: "색상과 벽체 타입의 대응 관계를 시각적으로 표시하는 범례 생성 기능이 구현되어 있지 않았음",
    fix: [
      "웹 측: \"색상표 생성\" 버튼 추가, wallColorMap의 색상 데이터를 LegendItem 배열로 변환하여 Revit으로 WebSocket 전송",
      "Revit 측: Drafting View(제도뷰)를 1:50 스케일로 생성",
      "  - FilledRegion으로 색상 박스 생성 (각 벽체 타입별 RGB 색상 적용)",
      "  - TextNote로 벽체 타입명 + 개수 레이블 표시",
      "  - 색상별 FilledRegionType을 QTO_Color_R_G_B 이름으로 자동 생성",
      "기존 동일 이름의 범례뷰가 있으면 삭제 후 재생성"
    ]
  },
  {
    no: 29,
    title: "생성된 벽체 기본 색상을 회색으로 변경",
    category: "UI 개선",
    files: "WallTypeCreate.cs (C#)",
    symptom: "Kiyeno에서 Revit으로 벽체 타입을 생성하면 벽체가 검은색으로 표시됨. 평면도와 3D 뷰 모두에서 시각적으로 구분이 어려움",
    cause: "벽체 타입 생성 시 새로 만들어지는 재료(Material)에 색상이 지정되지 않아 Revit 기본값인 검은색으로 표시됨",
    fix: [
      "GetOrCreateMaterial() 함수에서 새 재료 생성 시 기본 색상을 회색 RGB(128, 128, 128)으로 명시적 설정",
      "벽체 타입의 모든 레이어(석고보드, 경량자재 등) 재료에 동일하게 적용"
    ]
  },
  {
    no: 30,
    title: "CAD 벽체 생성 시 시계방향 정방향 적용 (벽 중심선 기준)",
    category: "버그 수정",
    files: "CADLineWallData.cs (C#)",
    symptom: "CAD 도면에서 Revit으로 벽체를 생성할 때 벽의 위치 기준선이 일관되지 않아 벽체가 의도한 위치에 정확히 생성되지 않음",
    cause: "벽체 생성 시 위치 기준선(Location Line) 파라미터가 벽 중심선 기준으로 설정되지 않아 벽의 생성 방향과 위치가 CAD 원본과 불일치",
    fix: [
      "C# Revit 애드인에서 벽 생성 시 WALL_KEY_REF_PARAM 파라미터를 벽 중심선(Wall Centerline) 기준으로 설정",
      "CAD 라인의 중심을 기준으로 벽체가 생성되어 시계방향 정방향이 Revit과 동일하게 적용"
    ]
  },
  {
    no: 31,
    title: "Kiyeno 시스템창 최소화 버튼 추가",
    category: "UI 개선",
    files: "QTOForm.cs (C#)",
    symptom: "Revit 애드인의 Kiyeno System 창이 별도 윈도우로 항상 표시되어 작업 화면을 가림. 창을 닫으면 연결이 끊기고, 그대로 두면 작업 공간이 줄어들어 불편",
    cause: "Kiyeno System 창(QTOForm)에 최소화 버튼이 없어서 창을 숨길 수 있는 방법이 없었음",
    fix: [
      "Kiyeno System 창에 최소화 버튼을 추가하여 필요시 작업표시줄로 최소화 가능",
      "최소화 상태에서도 WebSocket 연결은 유지되어 웹↔Revit 통신이 정상 작동"
    ]
  },
  {
    no: 32,
    title: "벽체 타입 일괄 생성 구조로 변경 (엑셀 기반)",
    category: "기능 추가",
    files: "excelWallTypeManager.js(신규), excelUnitPriceImporter.js, index.html",
    symptom: "벽체 타입을 하나씩만 개별 생성할 수 있어 다수의 벽체 타입을 등록할 때 비효율적",
    cause: "기존 벽체 타입 관리가 개별 폼 입력 방식으로만 구현되어 일괄 처리가 불가능한 구조였음",
    fix: [
      "테이블 기반 일괄 관리 UI: 스프레드시트 형태의 테이블로 전면 재설계",
      "엑셀 내보내기: ExcelJS로 현재 벽체 타입 데이터를 .xlsx 파일로 내보내기 (메타데이터 행 포함)",
      "엑셀 불러오기(일괄 생성): 엑셀 파일에서 다수의 벽체 타입을 한 번에 가져오기",
      "병합/대체 모드: 기존 데이터에 추가(병합) 또는 전체 대체 선택 가능",
      "인라인 편집: 테이블 셀 클릭으로 자재 선택, 우클릭으로 초기화, 드래그로 순서 변경",
      "자동 계산: 레이어별 두께, 자재비, 노무비, 합계 자동 집계",
      "IndexedDB 저장: excelWallTypes 스토어에 데이터 영구 저장"
    ]
  },
  {
    no: 33,
    title: "Revit에 동일한 벽체 타입 존재 시 중복 생성 방지",
    category: "안정성 개선",
    files: "WallTypeCreate.cs (C#)",
    symptom: "Revit에 이미 동일한 이름의 벽체 타입이 존재할 때 중복 생성될 수 있음. 두께가 다르더라도 같은 이름의 타입이 생성되어 혼란 발생 가능",
    cause: "벽체 타입 생성 시 Revit에 동일 이름의 기존 타입이 있는지 확인하는 중복 검사 로직이 없었음",
    fix: [
      "Revit에서 벽체 타입 생성 전 동일 이름의 WallType이 이미 존재하는지 확인하는 중복 검사 추가",
      "동일한 타입이 존재하면 생성을 중단하고 경고창(TaskDialog)으로 사용자에게 알림",
      "두께가 다르더라도 이름이 같으면 중복으로 판단하여 생성 방지"
    ]
  }
];

// ─── 분류별 통계 계산 ───
const categoryCount = {};
items.forEach(item => {
  categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
});

// ─── 문서 콘텐츠 빌드 ───
const children = [];

// ═══════════════════════════════
// 표지 (Cover Page)
// ═══════════════════════════════
children.push(new Paragraph({ spacing: { before: 2000 }, children: [] }));

children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 1200, after: 200 },
  children: [new TextRun({ text: "기능개발", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
  children: [new TextRun({ text: "수정사항 보고서", size: 52, bold: true, color: BLUE, font: "맑은 고딕" })]
}));

// 구분선
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BLUE, space: 8 } },
  children: []
}));

// 프로젝트 정보
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text: "Kiyeno 벽체 관리 시스템", size: 32, color: "555555", font: "맑은 고딕" })]
}));

children.push(new Paragraph({ spacing: { after: 600 }, children: [] }));

// 표지 정보 테이블
const coverInfoData = [
  ["작성일", "2026-02-22"],
  ["대상 프로젝트", "Kiyeno 벽체 관리 시스템 (웹 + Revit 애드인)"],
  ["총 수정 건수", `${items.length}건`],
  ["대상 사용자", "대만 T3 프로젝트 팀"]
];

const coverColWidths = [2400, 5600];
children.push(new Table({
  columnWidths: coverColWidths,
  rows: coverInfoData.map(([label, value]) => new TableRow({
    children: [
      dataCell(label, coverColWidths[0], { bold: true, center: true, shading: LIGHT_BLUE, size: 22 }),
      dataCell(value, coverColWidths[1], { size: 22, indent: 120 })
    ]
  }))
}));

children.push(new Paragraph({ spacing: { after: 400 }, children: [] }));

// 분류별 통계 (표지)
const statsOrder = ["버그 수정", "기능 추가", "기능 개선", "UI 개선", "안정성 개선"];
const statColWidths2 = [2400, 1600];
children.push(new Table({
  columnWidths: statColWidths2,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("분류", statColWidths2[0]),
        headerCell("건수", statColWidths2[1])
      ]
    }),
    ...statsOrder.filter(cat => categoryCount[cat]).map(cat => new TableRow({
      children: [
        dataCell(cat, statColWidths2[0], { shading: getCategoryColor(cat), size: 21 }),
        dataCell(`${categoryCount[cat]}건`, statColWidths2[1], { center: true, size: 21 })
      ]
    })),
    new TableRow({
      children: [
        dataCell("합계", statColWidths2[0], { bold: true, center: true, shading: LIGHT_GRAY, size: 21 }),
        dataCell(`${items.length}건`, statColWidths2[1], { bold: true, center: true, shading: LIGHT_GRAY, size: 21 })
      ]
    })
  ]
}));

// ═══════════════════════════════
// 페이지 브레이크 → 목차
// ═══════════════════════════════
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 300 },
  children: [new TextRun({ text: "목차", size: 32, bold: true, color: BLUE, font: "맑은 고딕" })]
}));

// 수동 목차 (docx 라이브러리의 TOC는 Word에서 업데이트 필요하므로 수동 작성)
children.push(new Paragraph({
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text: "1.  수정 요약 ··························· 3", size: 22, font: "맑은 고딕", color: "333333" })]
}));
children.push(new Paragraph({
  spacing: { after: 100 },
  children: [new TextRun({ text: "2.  세부 수정 내용 ······················· 4", size: 22, font: "맑은 고딕", color: "333333" })]
}));

items.forEach(item => {
  const dots = "·".repeat(Math.max(3, 50 - item.title.length));
  children.push(new Paragraph({
    spacing: { after: 40 },
    indent: { left: 480 },
    children: [new TextRun({
      text: `2.${item.no}  ${item.title} ${dots}`,
      size: 19, font: "맑은 고딕", color: "555555"
    })]
  }));
});

children.push(new Paragraph({
  spacing: { before: 100, after: 100 },
  children: [new TextRun({ text: "3.  수정 파일 목록 ······················· ", size: 22, font: "맑은 고딕", color: "333333" })]
}));

// ═══════════════════════════════
// 페이지 브레이크 → 섹션 1: 수정 요약
// ═══════════════════════════════
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 200 },
  children: [new TextRun({ text: "1.  수정 요약", size: 28, bold: true, color: BLUE, font: "맑은 고딕" })]
}));

// 요약 테이블
const summaryColWidths = [500, 5000, 1600, 1700];
const summaryRows = [
  new TableRow({
    tableHeader: true,
    children: [
      headerCell("#", summaryColWidths[0]),
      headerCell("수정 내용", summaryColWidths[1]),
      headerCell("분류", summaryColWidths[2]),
      headerCell("수정 파일", summaryColWidths[3])
    ]
  }),
  ...items.map((item, i) => new TableRow({
    children: [
      dataCell(String(item.no), summaryColWidths[0], { center: true, shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
      dataCell(item.title, summaryColWidths[1], { shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
      dataCell(item.category, summaryColWidths[2], { center: true, shading: getCategoryColor(item.category) }),
      dataCell(item.files.split(",")[0].trim(), summaryColWidths[3], { shading: i % 2 === 1 ? LIGHT_GRAY : undefined, size: 17 })
    ]
  }))
];

children.push(new Table({
  columnWidths: summaryColWidths,
  rows: summaryRows
}));

// ═══════════════════════════════
// 페이지 브레이크 → 섹션 2: 세부 수정 내용
// ═══════════════════════════════
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 200 },
  children: [new TextRun({ text: "2.  세부 수정 내용", size: 28, bold: true, color: BLUE, font: "맑은 고딕" })]
}));

items.forEach((item) => {
  // 항목 제목
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC", space: 4 } },
    children: [new TextRun({
      text: `2.${item.no}  ${item.title}`,
      size: 24, bold: true, color: BLUE, font: "맑은 고딕"
    })]
  }));

  // 파일 + 분류
  children.push(new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: "파일:  ", bold: true, size: 19, font: "맑은 고딕", color: "555555" }),
      new TextRun({ text: item.files, size: 19, font: "맑은 고딕", color: "555555" }),
      new TextRun({ text: "    |    ", size: 19, font: "맑은 고딕", color: "CCCCCC" }),
      new TextRun({ text: "분류:  ", bold: true, size: 19, font: "맑은 고딕", color: "555555" }),
      new TextRun({ text: item.category, size: 19, font: "맑은 고딕", color: "555555" })
    ]
  }));

  // 증상
  children.push(new Paragraph({
    spacing: { before: 140, after: 40 },
    children: [new TextRun({ text: "▶ 증상", bold: true, size: 20, font: "맑은 고딕", color: "CC3333" })]
  }));
  children.push(new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text: item.symptom, size: 19, font: "맑은 고딕" })]
  }));

  // 원인
  children.push(new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [new TextRun({ text: "▶ 원인", bold: true, size: 20, font: "맑은 고딕", color: "996600" })]
  }));
  children.push(new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text: item.cause, size: 19, font: "맑은 고딕" })]
  }));

  // 수정 내용
  children.push(new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [new TextRun({ text: "▶ 수정 내용", bold: true, size: 20, font: "맑은 고딕", color: "336699" })]
  }));
  item.fix.forEach(line => {
    const isSubItem = line.startsWith("  ");
    children.push(new Paragraph({
      spacing: { after: 30 },
      indent: { left: isSubItem ? 720 : 360 },
      children: [new TextRun({
        text: isSubItem ? line.trim() : `• ${line}`,
        size: 19, font: "맑은 고딕"
      })]
    }));
  });
});

// ═══════════════════════════════
// 페이지 브레이크 → 섹션 3: 수정 파일 목록
// ═══════════════════════════════
children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 300, after: 200 },
  children: [new TextRun({ text: "3.  수정 파일 목록", size: 28, bold: true, color: BLUE, font: "맑은 고딕" })]
}));

// 파일별 수정 건수 집계
const fileMap = {};
items.forEach(item => {
  const files = item.files.split(",").map(f => f.trim());
  files.forEach(f => {
    if (!fileMap[f]) fileMap[f] = [];
    fileMap[f].push(item.no);
  });
});

const fileColWidths = [4400, 1600, 2800];
children.push(new Table({
  columnWidths: fileColWidths,
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        headerCell("파일", fileColWidths[0]),
        headerCell("수정 건수", fileColWidths[1]),
        headerCell("관련 항목", fileColWidths[2])
      ]
    }),
    ...Object.entries(fileMap)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([file, nos], i) => new TableRow({
        children: [
          dataCell(file, fileColWidths[0], { shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(`${nos.length}건`, fileColWidths[1], { center: true, shading: i % 2 === 1 ? LIGHT_GRAY : undefined }),
          dataCell(`#${nos.join(", #")}`, fileColWidths[2], { shading: i % 2 === 1 ? LIGHT_GRAY : undefined, size: 17 })
        ]
      }))
  ]
}));

// ═══════════════════════════════
// 문서 생성
// ═══════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: "맑은 고딕", size: 22 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: BLUE, font: "맑은 고딕" },
        paragraph: { spacing: { before: 300, after: 200 }, outlineLevel: 0 }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: BLUE, font: "맑은 고딕" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1200, right: 1000, bottom: 1200, left: 1000 },
        size: {}
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            text: "Kiyeno 기능개발 수정사항 보고서",
            size: 16, color: "999999", font: "맑은 고딕", italics: true
          })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "- ", size: 16, color: "999999", font: "맑은 고딕" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999", font: "맑은 고딕" }),
            new TextRun({ text: " / ", size: 16, color: "999999", font: "맑은 고딕" }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "999999", font: "맑은 고딕" }),
            new TextRun({ text: " -", size: 16, color: "999999", font: "맑은 고딕" })
          ]
        })]
      })
    },
    children
  }]
});

// ═══════════════════════════════
// 파일 출력
// ═══════════════════════════════
const outputPath = "C:\\ClaudeProject\\ReReKiyeno\\docs\\기능개발_수정사항_보고서.docx";

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ 보고서 생성 완료: ${outputPath}`);
  console.log(`   총 ${items.length}건 수정사항 포함`);
  console.log(`   분류별: ${statsOrder.filter(cat => categoryCount[cat]).map(cat => `${cat} ${categoryCount[cat]}건`).join(", ")}`);
}).catch(err => {
  console.error("❌ 보고서 생성 실패:", err);
});
