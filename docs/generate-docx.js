const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents } = require('docx');

// 공통 스타일
const FONT = '맑은 고딕';
const FONT_EN = 'Arial';
const COLOR_PRIMARY = '1B3A5C';
const COLOR_HEADER = '2C5F8A';
const COLOR_LIGHT = 'E8F0F8';
const COLOR_WHITE = 'FFFFFF';
const COLOR_BLACK = '000000';
const COLOR_GRAY = '666666';
const COLOR_ACCENT = 'D4380D';
const COLOR_WARNING = 'FFF3CD';
const COLOR_SUCCESS = 'D4EDDA';

const tBorder = { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' };
const cellBorders = { top: tBorder, bottom: tBorder, left: tBorder, right: tBorder };
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

// 헬퍼: 테이블 셀
function cell(text, opts = {}) {
  const { bold, width, shading, align, font, size, colSpan, rowSpan, color } = opts;
  return new TableCell({
    borders: cellBorders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: colSpan,
    rowSpan: rowSpan,
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({
        text: text,
        bold: bold || false,
        font: font || FONT,
        size: size || 20,
        color: color || COLOR_BLACK,
      })]
    })]
  });
}

// 헤더 셀 (흰 텍스트)
function hCellW(text, opts = {}) {
  const { width, colSpan, rowSpan } = opts;
  return new TableCell({
    borders: cellBorders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: { fill: COLOR_HEADER, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: colSpan,
    rowSpan: rowSpan,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({
        text: text,
        bold: true,
        font: FONT,
        size: 20,
        color: COLOR_WHITE,
      })]
    })]
  });
}

// 빈 단락
function spacer(h = 100) {
  return new Paragraph({ spacing: { before: h, after: h }, children: [] });
}

// 본문 텍스트
function p(text, opts = {}) {
  const { bold, indent, size, color, spacing } = opts;
  return new Paragraph({
    spacing: { after: spacing || 120 },
    indent: indent ? { left: indent } : undefined,
    children: [new TextRun({ text, font: FONT, size: size || 22, bold: bold || false, color: color || COLOR_BLACK })]
  });
}

// 불릿 텍스트
function bullet(text, level = 0) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 + (level * 360) },
    children: [new TextRun({ text: `  ${level > 0 ? '◦' : '•'} ${text}`, font: FONT, size: 22 })]
  });
}

// 제목
function heading(level, text) {
  const headingMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  const spacingMap = { 1: { before: 360, after: 200 }, 2: { before: 240, after: 120 }, 3: { before: 200, after: 100 } };
  return new Paragraph({
    heading: headingMap[level],
    spacing: spacingMap[level],
    children: [new TextRun({ text, font: FONT })]
  });
}

// ===== 표지 섹션 =====
const coverSection = {
  properties: {
    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
  },
  children: [
    spacer(3000),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Kiyeno 벽체 관리 시스템', font: FONT, size: 52, bold: true, color: COLOR_PRIMARY })]
    }),
    spacer(200),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: '엑셀 단가표 관리 기능 설명서', font: FONT, size: 36, color: COLOR_HEADER })]
    }),
    spacer(100),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: '(단가표 · 벽체타입 · Revit 벽체 생성 · 단가비교표)', font: FONT, size: 24, color: COLOR_GRAY })]
    }),
    spacer(600),
    new Table({
      columnWidths: [2400, 4000],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '문서 버전', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    2.0', font: FONT, size: 22 })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '작성일', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    2026년 02월 13일', font: FONT, size: 22 })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '작성자', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    (주)키예노', font: FONT, size: 22 })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '문서 분류', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    기능 설명서 (납품용)', font: FONT, size: 22 })] })] }),
        ]}),
      ]
    }),
    spacer(2000),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'CONFIDENTIAL', font: FONT_EN, size: 20, color: COLOR_GRAY, italics: true })]
    }),
  ]
};

// ===== 본문 =====
const body = [];

// 목차
body.push(
  new TableOfContents('목차', { hyperlink: true, headingStyleRange: '1-3' }),
  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 1. 개요
// ============================================================
body.push(
  heading(1, '1. 개요'),

  heading(2, '1.1 문서 목적'),
  p('본 문서는 Kiyeno 벽체 관리 시스템의 엑셀 단가표 관리 모듈에 대한 기능을 설명합니다. 엑셀 단가표 관리, 벽체타입 관리, Revit 벽체 생성, 단가비교표의 전체 기능 흐름과 상세 동작 방식을 다룹니다.'),

  heading(2, '1.2 시스템 개요'),
  p('Kiyeno 벽체 관리 시스템은 건설업계를 위한 종합 벽체 관리 솔루션으로, 엑셀 단가표를 기반으로 벽체타입을 관리하고 Autodesk Revit과 연동하여 벽체 타입을 자동 생성할 수 있습니다. 일위대가 기반의 자재 관리 체계와 엑셀 기반의 외부 단가표를 통합하여 운영합니다.'),

  heading(2, '1.3 대상 사용자'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('대상', { width: 2500 }), hCellW('설명', { width: 6500 })] }),
      new TableRow({ children: [cell('건설업계 실무자', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('경량벽체 시공 현장에서 자재 수량 및 비용을 관리하는 담당자', { width: 6500 })] }),
      new TableRow({ children: [cell('건축 설계사무소', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('벽체 구성을 설계하고 Revit 모델에 반영하는 설계자', { width: 6500 })] }),
      new TableRow({ children: [cell('시공사 견적 담당자', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('단가비교표를 작성하고 견적서를 생성하는 담당자', { width: 6500 })] }),
      new TableRow({ children: [cell('Revit 사용 설계자', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('Revit에서 복합마감 벽체타입을 자동 생성하여 활용하는 설계자', { width: 6500 })] }),
    ]
  }),

  heading(2, '1.4 사전 조건'),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2000 }), hCellW('조건', { width: 7000 })] }),
      new TableRow({ children: [cell('웹 브라우저', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('Chrome, Edge 등 ES6 모듈 및 IndexedDB를 지원하는 최신 브라우저', { width: 7000 })] }),
      new TableRow({ children: [cell('서버 실행', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('Node.js Express 서버가 실행 중인 상태 (기본 포트 3000)', { width: 7000 })] }),
      new TableRow({ children: [cell('Revit 연결', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('벽체 생성 기능 사용 시 Revit C# 애드인이 WebSocket으로 연결된 상태', { width: 7000 })] }),
      new TableRow({ children: [cell('엑셀 단가표', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('자재 품명, 규격, 단가 등이 포함된 .xlsx 파일 (불러오기 시 필요)', { width: 7000 })] }),
    ]
  }),

  heading(2, '1.5 전체 기능 흐름'),
  p('엑셀 단가표 모듈의 전체 기능 흐름은 다음과 같습니다:'),
  spacer(50),
  p('① 엑셀 단가표 불러오기 — 외부 엑셀 파일에서 자재 단가 데이터를 가져옴'),
  p('② 벽체타입 구성 — 12개 고정 레이어 + 동적 컬럼으로 벽체 구조를 정의'),
  p('③ 자재 할당 — 각 레이어에 단가표의 자재를 선택하여 할당'),
  p('④ Revit 벽체 생성 — 구성된 벽체타입을 Revit에서 복합마감 벽체로 자동 생성'),
  p('⑤ 벽체 계산 — Revit에서 동기화된 벽체를 기준으로 수량/비용 계산'),
  p('⑥ 단가비교표 — 계산 결과를 기반으로 자재별/노무비별 비교표 생성'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 2. 엑셀 단가표 관리
// ============================================================
body.push(
  heading(1, '2. 엑셀 단가표 관리'),

  heading(2, '2.1 기능 목록'),
  p('엑셀 단가표 관리 탭에서 제공하는 전체 기능 목록입니다:'),
);

const funcA = [
  ['A-1', '엑셀 파일 불러오기', '.xlsx/.xls 파일을 선택하여 단가표 데이터를 불러옵니다. 헤더를 자동 인식하며(최대 10행 탐색), 기존 데이터와 중복 시 자동으로 업데이트합니다.'],
  ['A-2', '엑셀 파일 내보내기', "전체 단가표 데이터를 '엑셀단가표_날짜_시간.xlsx' 형식의 파일로 다운로드합니다."],
  ['A-3', '행 추가', '빈 행을 생성하고, 품명 셀에 자동으로 포커스하여 즉시 편집할 수 있습니다.'],
  ['A-4', '행 삭제', '개별 행을 삭제합니다. 확인 팝업이 표시됩니다.'],
  ['A-5', '전체 삭제', '모든 단가 데이터를 삭제합니다. 확인 팝업이 표시되며, 되돌리기가 불가합니다.'],
  ['A-6', '인라인 셀 편집', '셀을 클릭하면 입력 필드가 표시되며, Enter 또는 포커스 해제 시 저장, Esc 키로 취소할 수 있습니다.'],
  ['A-7', '합계 자동 계산', '자재비 또는 노무비 수정 시 합계(자재비+노무비)가 자동으로 재계산됩니다.'],
  ['A-8', '중복 검사', '품명 또는 규격 변경 시 동일한 키(품명+규격)의 존재 여부를 확인하여, 중복이면 변경을 취소합니다.'],
  ['A-9', '검색', '품명과 규격을 대상으로 실시간 부분 매칭 검색을 수행합니다.'],
  ['A-10', '2단 그룹핑 표시', '부위별, 품명별로 자동 그룹핑하여 표시하며, 부위 정렬 순서가 적용됩니다.'],
  ['A-11', '상태 표시줄', '총 항목 수, 검색 결과 수, 마지막 업데이트 시간을 표시합니다.'],
];

const funcARows = [
  new TableRow({ children: [hCellW('번호', { width: 900 }), hCellW('기능명', { width: 2200 }), hCellW('설명', { width: 6260 })] })
];
funcA.forEach(([no, name, desc]) => {
  funcARows.push(new TableRow({ children: [
    cell(no, { width: 900, align: AlignmentType.CENTER }),
    cell(name, { width: 2200, bold: true }),
    cell(desc, { width: 6260 }),
  ]}));
});
body.push(new Table({ columnWidths: [900, 2200, 6260], rows: funcARows }));

// 2.2 테이블 컬럼 구성
body.push(
  spacer(200),
  heading(2, '2.2 테이블 컬럼 구성'),
  p('단가표 테이블은 12개의 컬럼으로 구성되며, 각 컬럼의 편집 가능 여부와 용도는 다음과 같습니다:'),
);

const colA = [
  ['NO', '불가', '자동 번호 (행 순서에 따라 자동 부여)'],
  ['부위', '가능', '가설벽, 벽 등 자재 분류 (그룹핑에 사용)'],
  ['품명', '가능', '자재 이름 (필수 항목, 중복 검사 대상)'],
  ['규격', '가능', '자재 규격 (필수 항목, 중복 검사 대상)'],
  ['단위', '가능', '기본값 M2 (자재별 단위 지정)'],
  ['두께', '가능', 'mm 단위, 소수점 유지 (벽체 두께 계산에 사용)'],
  ['수량', '가능', '기본값 1 (소요량 산정에 사용)'],
  ['자재비', '가능', '원 단위 (자재 구입 비용)'],
  ['노무비', '가능', '원 단위 (시공 인건비)'],
  ['합계', '불가', '자재비 + 노무비 자동 계산'],
  ['자재공종', '가능', '경량, 도장, 방수 등 자재 공종 분류'],
  ['노무공종', '가능', '경량, 도장, 방수 등 노무 공종 분류'],
];

const colARows = [
  new TableRow({ children: [hCellW('컬럼명', { width: 2000 }), hCellW('편집', { width: 1500 }), hCellW('설명', { width: 5860 })] })
];
colA.forEach(([col, edit, desc]) => {
  const shading = edit === '불가' ? 'F0F0F0' : undefined;
  colARows.push(new TableRow({ children: [
    cell(col, { width: 2000, bold: true, align: AlignmentType.CENTER, shading }),
    cell(edit, { width: 1500, align: AlignmentType.CENTER, shading }),
    cell(desc, { width: 5860, shading }),
  ]}));
});
body.push(new Table({ columnWidths: [2000, 1500, 5860], rows: colARows }));

// 2.3 엑셀 파일 불러오기
body.push(
  spacer(200),
  heading(2, '2.3 엑셀 파일 불러오기 상세'),

  heading(3, '2.3.1 헤더 자동 인식'),
  p('엑셀 파일 불러오기 시 헤더 행을 자동으로 탐색합니다. 첫 번째 행부터 최대 10번째 행까지 순회하며, "품명" 또는 "규격" 텍스트가 포함된 행을 헤더로 인식합니다.'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('내용', { width: 6000 })] }),
      new TableRow({ children: [cell('탐색 범위', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('1행 ~ 10행 (순차 탐색)', { width: 6000 })] }),
      new TableRow({ children: [cell('인식 키워드', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('"품명", "규격" 중 하나 이상 포함된 행', { width: 6000 })] }),
      new TableRow({ children: [cell('컬럼 매핑', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('헤더 텍스트를 기반으로 각 컬럼에 자동 매핑', { width: 6000 })] }),
      new TableRow({ children: [cell('데이터 시작', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('헤더 행 다음 행부터 데이터로 처리', { width: 6000 })] }),
    ]
  }),

  heading(3, '2.3.2 중복 데이터 처리'),
  p('불러온 데이터 중 기존 데이터와 동일한 키(품명+규격)가 있는 경우, 기존 데이터를 자동으로 업데이트합니다. 신규 데이터는 새로 추가됩니다.'),
  bullet('동일 키(품명+규격) 존재 시: 기존 레코드를 덮어씁니다'),
  bullet('신규 데이터: 새 레코드로 추가됩니다'),
  bullet('불러오기 완료 후: 토스트 메시지로 결과를 알립니다'),

  heading(3, '2.3.3 라이브러리'),
  p('엑셀 파일 읽기에는 SheetJS(XLSX) 라이브러리를 사용합니다. .xlsx 및 .xls 형식을 모두 지원합니다.'),
);

// 2.4 엑셀 파일 내보내기
body.push(
  spacer(200),
  heading(2, '2.4 엑셀 파일 내보내기 상세'),
  p('현재 단가표의 전체 데이터를 엑셀 파일로 내보냅니다.'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('내용', { width: 6000 })] }),
      new TableRow({ children: [cell('파일명 형식', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('엑셀단가표_YYYYMMDD_HHMMSS.xlsx', { width: 6000 })] }),
      new TableRow({ children: [cell('시트명', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('"단가표"', { width: 6000 })] }),
      new TableRow({ children: [cell('포함 컬럼', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('부위, 품명, 규격, 단위, 두께, 수량, 자재비, 노무비, 합계, 자재공종, 노무공종', { width: 6000 })] }),
      new TableRow({ children: [cell('라이브러리', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('SheetJS (XLSX) — Blob 다운로드 방식', { width: 6000 })] }),
    ]
  }),
);

// 2.5 인라인 셀 편집
body.push(
  spacer(200),
  heading(2, '2.5 인라인 셀 편집'),
  p('테이블의 각 셀을 클릭하면 해당 셀이 입력 필드로 변환되어 직접 편집할 수 있습니다.'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('조작', { width: 2500 }), hCellW('동작', { width: 6500 })] }),
      new TableRow({ children: [cell('셀 클릭', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('해당 셀이 input/select 필드로 변환됩니다', { width: 6500 })] }),
      new TableRow({ children: [cell('Enter 키', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('편집 내용을 저장하고 편집 모드를 종료합니다', { width: 6500 })] }),
      new TableRow({ children: [cell('Esc 키', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('변경 내용을 취소하고 원래 값으로 복원합니다', { width: 6500 })] }),
      new TableRow({ children: [cell('포커스 해제', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('편집 내용을 저장합니다 (Enter와 동일)', { width: 6500 })] }),
    ]
  }),
  spacer(80),
  p('자재비 또는 노무비를 수정하면 합계(자재비+노무비)가 즉시 자동 재계산됩니다. 품명 또는 규격 변경 시에는 동일한 키(품명+규격) 조합이 이미 존재하는지 검사하여, 중복이면 변경을 취소하고 알림을 표시합니다.'),
);

// 2.6 검색 및 그룹핑
body.push(
  spacer(200),
  heading(2, '2.6 검색 및 2단 그룹핑'),

  heading(3, '2.6.1 실시간 검색'),
  p('검색창에 텍스트를 입력하면 품명과 규격을 대상으로 실시간 부분 매칭 검색이 수행됩니다. 검색어가 품명 또는 규격에 포함되어 있으면 해당 행이 표시됩니다.'),

  heading(3, '2.6.2 2단 그룹핑 표시'),
  p('데이터는 "부위" → "품명" 순서의 2단 그룹핑으로 자동 정렬되어 표시됩니다.'),
  bullet('1단 그룹: 부위별 분류 (가설벽, 벽 등)'),
  bullet('2단 그룹: 품명별 분류 (동일 품명의 규격 변형 묶음)'),
  bullet('부위 정렬: 사전 정의된 우선순위에 따라 정렬'),

  heading(3, '2.6.3 상태 표시줄'),
  p('테이블 하단에 다음 정보가 표시됩니다:'),
  bullet('총 항목 수 — 등록된 전체 자재 개수'),
  bullet('검색 결과 수 — 현재 필터링된 결과 개수'),
  bullet('마지막 업데이트 시간 — 가장 최근 데이터 변경 시각'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 3. 엑셀 벽체타입 관리
// ============================================================
body.push(
  heading(1, '3. 엑셀 벽체타입 관리'),

  heading(2, '3.1 기능 목록'),
  p('벽체타입 관리 탭에서 제공하는 전체 기능 목록입니다:'),
);

const funcB = [
  ['B-1', '새 벽체타입 추가', '빈 벽체타입을 생성합니다. 기본 이름은 WallType_N 형식이며, 모든 레이어가 비어있는 상태로 시작합니다.'],
  ['B-2', '선택 삭제', '체크박스로 선택된 벽체타입을 일괄 삭제합니다. 확인 팝업이 표시됩니다.'],
  ['B-3', '벽체타입명 편집', 'WallType 셀을 클릭하여 이름을 수정할 수 있습니다. 동일한 이름이 이미 존재하면 변경이 차단됩니다.'],
  ['B-4', '레이어 자재 선택', '레이어 셀을 좌클릭하면 일위대가 선택 모달이 열리며, 단가표에서 자재를 할당할 수 있습니다.'],
  ['B-5', '레이어 자재 해제', '레이어 셀을 우클릭하면 할당된 자재를 제거합니다.'],
  ['B-6', '두께 자동 계산', '레이어 변경 시 모든 레이어의 두께를 합산하여 소수점 1자리로 표시합니다.'],
  ['B-7', '비용 자동 계산', '레이어 변경 시 자재비, 노무비, 합계가 자동으로 재계산됩니다.'],
  ['B-8', '컬럼 추가', '5개 위치(좌측마감 뒤, 구조체 뒤, 단열재 뒤, 우측마감 뒤, 옵션 뒤) 중 선택하여 동적 컬럼을 추가합니다.'],
  ['B-9', '컬럼 삭제', '추가된 동적 컬럼을 삭제합니다. 확인 팝업이 표시됩니다.'],
  ['B-10', '드래그 드롭 정렬', '행을 드래그하여 벽체타입 순서를 변경할 수 있습니다.'],
  ['B-11', '전체 선택/해제', '헤더 체크박스로 전체 선택을 토글합니다.'],
  ['B-12', '엑셀 내보내기', '벽체타입 데이터를 메타 정보와 함께 .xlsx 파일로 다운로드합니다.'],
  ['B-13', '엑셀 불러오기', '.xlsx 파일에서 벽체타입 데이터를 가져옵니다. 병합/교체 모드 선택이 가능합니다.'],
  ['B-14', 'JSON 내보내기', '전체 벽체타입 데이터를 .json 파일로 다운로드합니다.'],
  ['B-15', 'JSON 불러오기', '.json 파일에서 벽체타입 데이터를 복원합니다.'],
  ['B-16', 'Revit 벽체 생성', '선택된 벽체타입을 미리보기한 후, WebSocket을 통해 Revit에서 복합마감 벽체를 생성합니다.'],
];

const funcBRows = [
  new TableRow({ children: [hCellW('번호', { width: 900 }), hCellW('기능명', { width: 2600 }), hCellW('설명', { width: 5860 })] })
];
funcB.forEach(([no, name, desc]) => {
  funcBRows.push(new TableRow({ children: [
    cell(no, { width: 900, align: AlignmentType.CENTER }),
    cell(name, { width: 2600, bold: true }),
    cell(desc, { width: 5860 }),
  ]}));
});
body.push(new Table({ columnWidths: [900, 2600, 5860], rows: funcBRows }));

// 3.2 테이블 컬럼 구조
body.push(
  spacer(200),
  heading(2, '3.2 테이블 컬럼 구조'),
  p('벽체타입 테이블은 12개의 고정 레이어 컬럼과 사용자가 추가할 수 있는 동적 컬럼, 그리고 합계 컬럼으로 구성됩니다.'),
);

const colB = [
  ['고정', '체크박스, No, WallType', '기본 정보 (선택, 번호, 이름)'],
  ['좌측마감', 'Layer3 → Layer2 → Layer1', '외부에서 내부 방향 순서'],
  ['중앙', '구조체(Column), 단열재(Infill)', '벽체 핵심 구조'],
  ['우측마감', 'Layer1 → Layer2 → Layer3', '내부에서 외부 방향 순서'],
  ['옵션', 'Column2, Channel, Runner, 철판', '추가 자재 (4개)'],
  ['동적 컬럼', '사용자 추가 컬럼', '5개 위치에 삽입 가능'],
  ['합계', '두께, 자재비, 노무비, 합계', '자동 계산 (편집 불가)'],
];

const colBRows = [
  new TableRow({ children: [hCellW('그룹', { width: 2000 }), hCellW('컬럼', { width: 4000 }), hCellW('설명', { width: 3360 })] })
];
colB.forEach(([grp, cols, desc]) => {
  colBRows.push(new TableRow({ children: [
    cell(grp, { width: 2000, bold: true, align: AlignmentType.CENTER }),
    cell(cols, { width: 4000 }),
    cell(desc, { width: 3360 }),
  ]}));
});
body.push(new Table({ columnWidths: [2000, 4000, 3360], rows: colBRows }));

// 3.3 레이어 자재 선택
body.push(
  spacer(200),
  heading(2, '3.3 레이어 자재 선택'),
  p('각 레이어 셀에 자재를 할당하는 과정입니다:'),

  heading(3, '3.3.1 자재 선택 방법'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('조작', { width: 2500 }), hCellW('동작', { width: 6500 })] }),
      new TableRow({ children: [cell('좌클릭', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('일위대가 선택 모달이 열리며, 단가표에 등록된 자재 목록이 표시됩니다', { width: 6500 })] }),
      new TableRow({ children: [cell('우클릭', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('할당된 자재를 제거하고 셀을 비웁니다', { width: 6500 })] }),
    ]
  }),

  heading(3, '3.3.2 일위대가 선택 모달'),
  p('레이어 셀을 좌클릭하면 표시되는 모달에서 자재를 선택합니다:'),
  bullet('단가표에 등록된 전체 자재 목록이 표시됩니다'),
  bullet('품명, 규격으로 검색하여 원하는 자재를 찾을 수 있습니다'),
  bullet('자재를 클릭하면 해당 레이어에 즉시 할당됩니다'),
  bullet('할당 후 두께, 자재비, 노무비, 합계가 자동 재계산됩니다'),

  heading(3, '3.3.3 셀 표시'),
  p('레이어 셀은 상태에 따라 다음과 같이 표시됩니다:'),
  bullet('비어있음: "클릭" 텍스트가 회색으로 표시됩니다'),
  bullet('자재 할당됨: 품명과 규격이 함께 표시됩니다 (예: "방수석고 취부 12.5T*1P")'),
  bullet('마우스 호버 시: 툴팁에 자재 정보와 조작 방법이 표시됩니다'),
);

// 3.4 동적 컬럼 관리
body.push(
  spacer(200),
  heading(2, '3.4 동적 컬럼 관리'),
  p('기본 12개 레이어 외에 추가 레이어가 필요한 경우, 동적 컬럼을 추가할 수 있습니다.'),

  heading(3, '3.4.1 삽입 가능 위치'),
  new Table({
    columnWidths: [3000, 3000, 3000],
    rows: [
      new TableRow({ children: [hCellW('위치 옵션', { width: 3000 }), hCellW('삽입 위치', { width: 3000 }), hCellW('자동 생성 라벨', { width: 3000 })] }),
      new TableRow({ children: [cell('좌측마감 뒤', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('Layer3 앞 (외부 방향)', { width: 3000 }), cell('좌측마감추가1, 추가2...', { width: 3000 })] }),
      new TableRow({ children: [cell('구조체 뒤', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('구조체(Column) 뒤', { width: 3000 }), cell('구조체추가1, 추가2...', { width: 3000 })] }),
      new TableRow({ children: [cell('단열재 뒤', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('단열재(Infill) 뒤', { width: 3000 }), cell('단열재추가1, 추가2...', { width: 3000 })] }),
      new TableRow({ children: [cell('우측마감 뒤', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('Layer3 뒤 (외부 방향)', { width: 3000 }), cell('우측마감추가1, 추가2...', { width: 3000 })] }),
      new TableRow({ children: [cell('옵션 뒤', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('철판(SteelPlate) 뒤', { width: 3000 }), cell('옵션추가1, 추가2...', { width: 3000 })] }),
    ]
  }),

  heading(3, '3.4.2 컬럼 삭제'),
  p('추가된 동적 컬럼을 삭제하면 모든 벽체타입에서 해당 컬럼의 자재 할당이 제거됩니다. 삭제 전 영향받는 벽체타입 목록을 확인하는 2단계 확인 대화상자가 표시됩니다.'),
);

// 3.5 벽체타입명 중복 검사
body.push(
  spacer(200),
  heading(2, '3.5 벽체타입명 중복 검사'),
  p('벽체타입 이름은 고유해야 합니다. Revit에서 동일한 이름의 벽체타입을 생성할 수 없기 때문에, 시스템에서 중복을 원천 차단합니다.'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('상황', { width: 3000 }), hCellW('처리', { width: 6000 })] }),
      new TableRow({ children: [cell('인라인 편집 시', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('동일한 이름이 존재하면 알림 표시 후 이름 변경을 차단합니다', { width: 6000 })] }),
      new TableRow({ children: [cell('엑셀 불러오기 시', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('중복 이름의 벽체타입은 기존 데이터를 덮어쓰며, 상세 내역을 표시합니다', { width: 6000 })] }),
    ]
  }),
  spacer(80),
  p('※ Revit에서 동일한 WallType 이름으로 벽체를 생성하면 오류가 발생하므로, 이름 고유성은 필수 요건입니다.', { color: COLOR_ACCENT }),
);

// 3.6 엑셀 내보내기 상세
body.push(
  spacer(200),
  heading(2, '3.6 엑셀 내보내기 상세'),
  p('벽체타입 데이터를 ExcelJS 라이브러리를 사용하여 2개 시트로 구성된 엑셀 파일로 내보냅니다.'),

  heading(3, '3.6.1 시트 1: 벽체타입'),
  p('벽체타입의 전체 데이터를 포함하는 작업 시트입니다.'),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [hCellW('행', { width: 2000 }), hCellW('내용', { width: 7000 })] }),
      new TableRow({ children: [cell('1행 (숨김)', { bold: true, width: 2000, align: AlignmentType.CENTER, shading: COLOR_LIGHT }), cell('필드 식별자 메타데이터 — 시스템이 컬럼을 식별하는 데 사용 (사용자에게 보이지 않음)', { width: 7000, shading: COLOR_LIGHT })] }),
      new TableRow({ children: [cell('2행 (헤더)', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('사람이 읽는 컬럼 이름 — "WallType", "좌-Layer3", "구조체" 등', { width: 7000 })] }),
      new TableRow({ children: [cell('3행 이후', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('벽체타입 데이터 — 레이어는 "품명 규격" 텍스트, 합계는 숫자', { width: 7000 })] }),
    ]
  }),
  spacer(80),
  p('1행의 필드 식별자는 다음과 같은 형식을 사용합니다:'),
  bullet('고정 컬럼: _wallTypeName, layer3_1, layer2_1, layer1_1, column1, infill, ...'),
  bullet('동적 컬럼: extra_0|label:좌측마감추가1,insertAfter:layer1_1'),
  bullet('합계 컬럼: _thickness, _materialPrice, _laborPrice, _totalPrice'),

  heading(3, '3.6.2 시트 2: 자재목록'),
  p('단가표에 등록된 전체 자재를 참조용으로 출력합니다. 사용자가 벽체타입을 수동으로 작성할 때, 이 시트에서 "품명 규격" 값을 확인하여 복사할 수 있습니다.'),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [hCellW('컬럼', { width: 2000 }), hCellW('설명', { width: 7000 })] }),
      new TableRow({ children: [cell('품명 규격', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('품명과 규격을 결합한 텍스트 (시트1의 레이어 셀에 그대로 붙여넣기 가능)', { width: 7000 })] }),
      new TableRow({ children: [cell('품명', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('자재 이름', { width: 7000 })] }),
      new TableRow({ children: [cell('규격', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('자재 규격', { width: 7000 })] }),
      new TableRow({ children: [cell('단위', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('M2, EA 등', { width: 7000 })] }),
      new TableRow({ children: [cell('두께', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('mm 단위', { width: 7000 })] }),
      new TableRow({ children: [cell('자재비 / 노무비', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('각각 원 단위 금액', { width: 7000 })] }),
      new TableRow({ children: [cell('합계', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('자재비 + 노무비', { width: 7000 })] }),
      new TableRow({ children: [cell('공종', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('자재공종, 노무공종 분류', { width: 7000 })] }),
    ]
  }),

  heading(3, '3.6.3 파일 정보'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('내용', { width: 6000 })] }),
      new TableRow({ children: [cell('파일명 형식', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('엑셀벽체타입_YYYYMMDD_HHMMSS.xlsx', { width: 6000 })] }),
      new TableRow({ children: [cell('라이브러리', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('ExcelJS v4.4.0 (행 숨기기 기능 지원)', { width: 6000 })] }),
      new TableRow({ children: [cell('숫자 포맷', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('#,##0 (천 단위 구분)', { width: 6000 })] }),
      new TableRow({ children: [cell('테두리', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('모든 데이터 셀에 적용', { width: 6000 })] }),
    ]
  }),
);

// 3.7 엑셀 불러오기 상세
body.push(
  spacer(200),
  heading(2, '3.7 엑셀 불러오기 상세'),
  p('외부 엑셀 파일에서 벽체타입 데이터를 가져옵니다. 메타 행 자동 감지, 3단계 텍스트 매칭, 병합/교체 모드를 지원합니다.'),

  heading(3, '3.7.1 메타 행 자동 감지'),
  p('불러오는 엑셀 파일에 숨겨진 1행(메타데이터)이 있는지 자동으로 감지합니다.'),
  new Table({
    columnWidths: [3500, 5500],
    rows: [
      new TableRow({ children: [hCellW('파일 유형', { width: 3500 }), hCellW('처리 방식', { width: 5500 })] }),
      new TableRow({ children: [cell('시스템 내보내기 파일', { bold: true, width: 3500, align: AlignmentType.CENTER }), cell('1행이 _wallTypeName으로 시작 → 필드 식별자로 컬럼 매핑', { width: 5500 })] }),
      new TableRow({ children: [cell('사용자 직접 작성 파일', { bold: true, width: 3500, align: AlignmentType.CENTER }), cell('1행이 일반 헤더 텍스트 → 헤더 텍스트 기반 컬럼 매핑', { width: 5500 })] }),
    ]
  }),

  heading(3, '3.7.2 자재 텍스트 매칭 (3단계)'),
  p('엑셀 셀의 "품명 규격" 텍스트를 단가표의 자재와 매칭하는 과정은 3단계로 수행됩니다:'),
  new Table({
    columnWidths: [1500, 3000, 4500],
    rows: [
      new TableRow({ children: [hCellW('단계', { width: 1500 }), hCellW('매칭 방식', { width: 3000 }), hCellW('예시', { width: 4500 })] }),
      new TableRow({ children: [cell('1차', { bold: true, width: 1500, align: AlignmentType.CENTER }), cell('정확한 텍스트 매칭', { width: 3000 }), cell('"방수석고 취부 12.5T*1P" = "방수석고 취부 12.5T*1P"', { width: 4500 })] }),
      new TableRow({ children: [cell('2차', { bold: true, width: 1500, align: AlignmentType.CENTER }), cell('공백 정규화 후 매칭', { width: 3000 }), cell('"방수석고  취부" → "방수석고 취부" (연속 공백 → 단일 공백)', { width: 4500 })] }),
      new TableRow({ children: [cell('3차', { bold: true, width: 1500, align: AlignmentType.CENTER }), cell('공백 전체 제거 후 매칭', { width: 3000 }), cell('"방수석고 취부" → "방수석고취부" (모든 공백 제거)', { width: 4500 })] }),
    ]
  }),
  spacer(80),
  p('3단계 모두 매칭에 실패한 자재는 목록으로 수집하여 불러오기 완료 후 상세 알림을 표시합니다.'),

  heading(3, '3.7.3 불러오기 모드 선택'),
  p('불러오기 시 기존 데이터를 어떻게 처리할지 선택할 수 있습니다:'),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [hCellW('모드', { width: 2000 }), hCellW('동작', { width: 7000 })] }),
      new TableRow({ children: [cell('병합 (Merge)', { bold: true, width: 2000, align: AlignmentType.CENTER, shading: COLOR_SUCCESS }), cell('기존 벽체타입을 유지하면서 엑셀 데이터를 추가/업데이트합니다. 동일 이름의 벽체타입은 덮어쓰고, 새 이름은 신규 생성합니다.', { width: 7000, shading: COLOR_SUCCESS })] }),
      new TableRow({ children: [cell('전체 교체', { bold: true, width: 2000, align: AlignmentType.CENTER, shading: COLOR_WARNING }), cell('기존 벽체타입을 모두 삭제하고, 엑셀 데이터로 전체를 새로 생성합니다.', { width: 7000, shading: COLOR_WARNING })] }),
    ]
  }),
  spacer(80),
  p('병합 모드에서는 덮어쓰기/신규 생성 대상 벽체타입의 상세 목록이 표시되어 사용자가 확인 후 진행할 수 있습니다.'),

  heading(3, '3.7.4 불러오기 결과 보고'),
  p('불러오기 완료 후 다음 정보가 표시됩니다:'),
  bullet('업데이트된 벽체타입 수 — 기존 데이터가 덮어쓰여진 개수'),
  bullet('신규 생성된 벽체타입 수 — 새로 추가된 개수'),
  bullet('매칭 실패 자재 — DB에 없는 자재명 목록 (상세 알림)'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 4. Revit 벽체 생성 프로세스
// ============================================================
body.push(
  heading(1, '4. Revit 벽체 생성 프로세스'),

  heading(2, '4.1 개요'),
  p('엑셀 벽체타입 관리에서 구성한 벽체타입을 Autodesk Revit에서 복합마감(Compound Wall) 벽체 타입으로 자동 생성하는 기능입니다. WebSocket을 통해 웹앱과 Revit C# 애드인이 통신하며, 레이어 구조를 전송하여 벽체를 생성합니다.'),

  heading(2, '4.2 생성 절차'),
  p('벽체 생성은 다음 단계를 순서대로 수행합니다:'),
);

const steps = [
  ['1', '벽체타입 선택', '체크박스로 생성할 벽체타입을 선택합니다. 최소 1개 이상 선택해야 합니다.'],
  ['2', '버튼 클릭', '"벽체타입 생성" 버튼을 클릭합니다.'],
  ['3', '레이어 구조 분석', '각 벽체타입의 레이어를 순회하며 두께, 자재명, 규격을 추출합니다.'],
  ['4', '오류 검사', '두께 추출 실패, 자재 미등록, 삭제된 자재 참조 등을 검사합니다.'],
  ['5', '비정상 레이어 필터링', '두께가 0, 빈칸, "-" 등 비정상 값인 레이어는 Revit 전송 대상에서 제외합니다.'],
  ['6', '미리보기 모달 표시', '레이어별 두께, 자재명, 총 두께를 미리보기로 표시합니다.'],
  ['7', '오류 표시', '오류가 있는 벽체타입은 빨간색으로 표시되며, "생성" 버튼이 비활성화됩니다.'],
  ['8', 'Revit 전송', '"Revit에서 생성하기" 클릭 시 WebSocket으로 C# 애드인에 데이터를 전송합니다.'],
];

const stepRows = [
  new TableRow({ children: [hCellW('단계', { width: 900 }), hCellW('작업', { width: 2200 }), hCellW('설명', { width: 6260 })] })
];
steps.forEach(([no, task, desc]) => {
  const shading = no === '5' ? COLOR_WARNING : undefined;
  stepRows.push(new TableRow({ children: [
    cell(no, { width: 900, align: AlignmentType.CENTER, bold: true, shading }),
    cell(task, { width: 2200, bold: true, shading }),
    cell(desc, { width: 6260, shading }),
  ]}));
});
body.push(new Table({ columnWidths: [900, 2200, 6260], rows: stepRows }));

// 4.3 레이어 구조 분석
body.push(
  spacer(200),
  heading(2, '4.3 레이어 구조 분석'),
  p('각 벽체타입의 레이어를 분석하여 Revit에 전송할 데이터를 구성합니다.'),

  heading(3, '4.3.1 분석 대상'),
  p('12개의 고정 레이어와 사용자가 추가한 동적 레이어를 모두 분석합니다.'),
  new Table({
    columnWidths: [3000, 3000, 3000],
    rows: [
      new TableRow({ children: [hCellW('레이어 그룹', { width: 3000 }), hCellW('컬럼 수', { width: 3000 }), hCellW('분석 항목', { width: 3000 })] }),
      new TableRow({ children: [cell('좌측마감', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('3개 (Layer3, Layer2, Layer1)', { width: 3000 }), cell('자재명, 규격, 두께', { width: 3000 })] }),
      new TableRow({ children: [cell('중앙', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('2개 (구조체, 단열재)', { width: 3000 }), cell('자재명, 규격, 두께', { width: 3000 })] }),
      new TableRow({ children: [cell('우측마감', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('3개 (Layer1, Layer2, Layer3)', { width: 3000 }), cell('자재명, 규격, 두께', { width: 3000 })] }),
      new TableRow({ children: [cell('옵션', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('4개 (Column2 ~ 철판)', { width: 3000 }), cell('자재명, 규격, 두께', { width: 3000 })] }),
      new TableRow({ children: [cell('동적 레이어', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('가변 (사용자 추가)', { width: 3000 }), cell('자재명, 규격, 두께', { width: 3000 })] }),
    ]
  }),

  heading(3, '4.3.2 두께 추출'),
  p('자재의 규격 텍스트에서 두께 값을 추출합니다. 규격에서 숫자와 소수점으로 구성된 첫 번째 패턴을 두께로 인식합니다.'),
  bullet('예: "12.5T*1PLY" → 12.5mm'),
  bullet('예: "9.5T*2PLY" → 9.5mm'),
  bullet('두께 추출 실패 시 오류로 표시됩니다'),

  heading(3, '4.3.3 분석 결과'),
  p('분석이 완료되면 각 벽체타입에 대해 다음 정보가 생성됩니다:'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('내용', { width: 6000 })] }),
      new TableRow({ children: [cell('wallTypeName', { bold: true, width: 3000 }), cell('벽체타입 이름', { width: 6000 })] }),
      new TableRow({ children: [cell('layers[]', { bold: true, width: 3000 }), cell('레이어 배열 (위치, 자재명, 규격, 두께)', { width: 6000 })] }),
      new TableRow({ children: [cell('totalThickness', { bold: true, width: 3000 }), cell('전체 레이어 두께 합산값 (mm)', { width: 6000 })] }),
      new TableRow({ children: [cell('errors[]', { bold: true, width: 3000 }), cell('오류 목록 (두께 추출 실패, 삭제된 자재 참조 등)', { width: 6000 })] }),
      new TableRow({ children: [cell('hasErrors', { bold: true, width: 3000 }), cell('오류 존재 여부 (true/false)', { width: 6000 })] }),
    ]
  }),
);

// 4.4 미리보기 모달
body.push(
  spacer(200),
  heading(2, '4.4 미리보기 모달'),
  p('Revit에 전송하기 전, 사용자에게 생성될 벽체의 레이어 구조를 미리 보여줍니다.'),

  heading(3, '4.4.1 정상 벽체타입 표시'),
  p('오류가 없는 벽체타입은 다음과 같이 표시됩니다:'),
  bullet('녹색 체크 아이콘과 벽체타입 이름'),
  bullet('레이어 테이블: 위치, 자재명, 규격, 두께(mm)'),
  bullet('하단에 총 두께 합산값 표시'),

  heading(3, '4.4.2 오류 벽체타입 표시'),
  p('오류가 있는 벽체타입은 다음과 같이 표시됩니다:'),
  bullet('빨간색 X 아이콘과 벽체타입 이름'),
  bullet('오류 항목별 불릿 목록 (예: "Layer1 - 두께를 추출할 수 없습니다")'),
  p('오류가 있는 벽체타입이 하나라도 존재하면 경고 메시지가 표시됩니다. 다만, 정상 벽체타입만 선택적으로 생성할 수 있습니다.', { color: COLOR_ACCENT }),

  heading(3, '4.4.3 요약 정보'),
  p('미리보기 모달 하단에 생성 가능/불가 벽체 수를 요약합니다:'),
  bullet('녹색 텍스트: "생성 가능: N개"'),
  bullet('빨간색 텍스트: "오류: M개" (해당 시에만 표시)'),
);

// 4.5 두께 검증 (2단계 방어)
body.push(
  spacer(200),
  heading(2, '4.5 두께 검증 (2단계 방어)'),
  p('비정상적인 두께 값을 가진 레이어가 Revit에 전송되지 않도록 2단계에 걸쳐 검증합니다.'),
  new Table({
    columnWidths: [2800, 2800, 3760],
    rows: [
      new TableRow({ children: [hCellW('검증 위치', { width: 2800 }), hCellW('조건', { width: 2800 }), hCellW('처리', { width: 3760 })] }),
      new TableRow({ children: [cell('웹앱 (JavaScript)', { bold: true, width: 2800, align: AlignmentType.CENTER }), cell('NaN, 0 이하, null, "-"', { width: 2800, align: AlignmentType.CENTER }), cell('해당 레이어를 제외하고 오류로 표시합니다.', { width: 3760 })] }),
      new TableRow({ children: [cell('C# Revit 애드인', { bold: true, width: 2800, align: AlignmentType.CENTER }), cell('Thickness <= 0', { width: 2800, align: AlignmentType.CENTER }), cell('해당 레이어를 건너뛰고 생성하지 않습니다.', { width: 3760 })] }),
    ]
  }),
);

// 4.6 WebSocket 전송 데이터 구조
body.push(
  spacer(200),
  heading(2, '4.6 WebSocket 전송 데이터 구조'),
  p('벽체 생성 명령은 WebSocket을 통해 Revit C# 애드인으로 전송됩니다.'),

  heading(3, '4.6.1 통신 프로토콜'),
  p('전체 통신 경로는 다음과 같습니다:'),
  spacer(50),
  p('① 웹앱 — "Revit에서 생성하기" 클릭'),
  p('② Socket.IO — 웹앱 → Node.js 서버 (포트 3000)'),
  p('③ WebSocket — Node.js 서버 → Revit C# 애드인 (포트 3001)'),
  p('④ Revit API — CompoundStructure를 사용하여 복합마감 벽체 생성'),

  heading(3, '4.6.2 전송 명령'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('내용', { width: 6000 })] }),
      new TableRow({ children: [cell('명령 이름', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('CREATE_WALL_TYPES', { width: 6000 })] }),
      new TableRow({ children: [cell('전송 형식', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('JSON (PascalCase 프로퍼티, Revit API 규격에 맞춤)', { width: 6000 })] }),
    ]
  }),

  heading(3, '4.6.3 전송 데이터 구조'),
  p('각 벽체타입별로 다음 구조의 데이터가 전송됩니다:'),
  new Table({
    columnWidths: [2500, 2000, 4500],
    rows: [
      new TableRow({ children: [hCellW('필드', { width: 2500 }), hCellW('타입', { width: 2000 }), hCellW('설명', { width: 4500 })] }),
      new TableRow({ children: [cell('WallTypeName', { bold: true, width: 2500 }), cell('string', { width: 2000, align: AlignmentType.CENTER }), cell('벽체타입 이름 (Revit WallType 이름이 됨)', { width: 4500 })] }),
      new TableRow({ children: [cell('TotalThickness', { bold: true, width: 2500 }), cell('number', { width: 2000, align: AlignmentType.CENTER }), cell('전체 두께 합산값 (mm)', { width: 4500 })] }),
      new TableRow({ children: [cell('Layers[]', { bold: true, width: 2500 }), cell('array', { width: 2000, align: AlignmentType.CENTER }), cell('레이어 배열 (아래 상세)', { width: 4500 })] }),
    ]
  }),
  spacer(80),
  p('각 레이어의 상세 구조:'),
  new Table({
    columnWidths: [2500, 2000, 4500],
    rows: [
      new TableRow({ children: [hCellW('필드', { width: 2500 }), hCellW('타입', { width: 2000 }), hCellW('설명', { width: 4500 })] }),
      new TableRow({ children: [cell('Position', { bold: true, width: 2500 }), cell('string', { width: 2000, align: AlignmentType.CENTER }), cell('레이어 위치 (예: "좌측마감 - Layer3")', { width: 4500 })] }),
      new TableRow({ children: [cell('MaterialName', { bold: true, width: 2500 }), cell('string', { width: 2000, align: AlignmentType.CENTER }), cell('자재 품명', { width: 4500 })] }),
      new TableRow({ children: [cell('Specification', { bold: true, width: 2500 }), cell('string', { width: 2000, align: AlignmentType.CENTER }), cell('자재 규격', { width: 4500 })] }),
      new TableRow({ children: [cell('Thickness', { bold: true, width: 2500 }), cell('number', { width: 2000, align: AlignmentType.CENTER }), cell('레이어 두께 (mm)', { width: 4500 })] }),
      new TableRow({ children: [cell('IsUnitPrice', { bold: true, width: 2500 }), cell('boolean', { width: 2000, align: AlignmentType.CENTER }), cell('일위대가 기반 자재 여부', { width: 4500 })] }),
      new TableRow({ children: [cell('MaterialId', { bold: true, width: 2500 }), cell('string', { width: 2000, align: AlignmentType.CENTER }), cell('자재 고유 ID (DB 참조용)', { width: 4500 })] }),
    ]
  }),
);

// 4.7 Revit C# 애드인 처리
body.push(
  spacer(200),
  heading(2, '4.7 Revit C# 애드인 처리'),
  p('Revit C# 애드인에서 수신한 벽체 생성 명령을 처리하는 과정입니다.'),

  heading(3, '4.7.1 처리 프로세스'),
  p('수신된 각 벽체타입에 대해 다음을 수행합니다:'),
  bullet('동일 이름의 WallType이 존재하는지 확인'),
  bullet('존재하면 기존 WallType의 CompoundStructure를 수정'),
  bullet('존재하지 않으면 새 WallType을 생성'),
  bullet('레이어 배열을 순회하며 CompoundStructureLayer를 추가'),
  bullet('Thickness <= 0인 레이어는 자동으로 건너뜀 (2단계 방어)'),

  heading(3, '4.7.2 연결 상태 확인'),
  p('벽체 생성 전 다음 연결 상태를 순차적으로 확인합니다:'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('확인 항목', { width: 3000 }), hCellW('실패 시 메시지', { width: 6000 })] }),
      new TableRow({ children: [cell('서버 연결', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('"서버에 연결되어 있지 않습니다. 페이지를 새로고침 해주세요."', { width: 6000 })] }),
      new TableRow({ children: [cell('Revit 연결', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('"Revit이 연결되어 있지 않습니다. Revit 애드인을 확인해주세요."', { width: 6000 })] }),
    ]
  }),

  heading(3, '4.7.3 상태 표시줄'),
  p('벽체타입 관리 하단에 Revit 연결 상태가 실시간으로 표시됩니다:'),
  bullet('녹색 점: Revit 연결됨'),
  bullet('회색 점: Revit 미연결'),
  bullet('총 벽체타입 수 및 사용 가능한 일위대가 수 표시'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 5. 단가 비교표
// ============================================================
body.push(
  heading(1, '5. 단가 비교표'),

  heading(2, '5.1 개요'),
  p('단가비교표는 벽체 계산 결과를 기반으로 자재비와 노무비를 항목별로 집계하여 비교하는 기능입니다. 계약 도급, 진행 도급, 발주 단가, 그리고 최대 3개 업체의 견적을 병렬로 비교할 수 있습니다.'),

  heading(2, '5.2 테이블 구조'),
  p('단가비교표는 다음과 같은 행 구조로 구성됩니다:'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('행 유형', { width: 2500 }), hCellW('설명', { width: 6500 })] }),
      new TableRow({ children: [cell('경량공사 (요약)', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('전체 공사 총액을 한 행으로 요약 (계약도급, 진행도급, 발주단가, 업체별)', { width: 6500 })] }),
      new TableRow({ children: [cell('공과잡비', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('요약 금액 대비 비율(%)로 자동 계산되는 부대 비용', { width: 6500 })] }),
      new TableRow({ children: [cell('단수정리', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('수동 입력 — 합계의 끝자리 정리 금액', { width: 6500 })] }),
      new TableRow({ children: [cell('합계', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('경량공사 + 공과잡비 + 단수정리의 소계', { width: 6500 })] }),
      new TableRow({ children: [cell('자재비 상세', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('품목별 자재비 내역 (품명, 규격, 수량, 단가, 금액)', { width: 6500 })] }),
      new TableRow({ children: [cell('노무비 상세', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('품목별 노무비 내역 (품명, 규격, 수량, 단가, 금액)', { width: 6500 })] }),
      new TableRow({ children: [cell('계 (최종합계)', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('자재비 + 노무비 상세 합산 — 요약행과 교차 검증', { width: 6500 })] }),
    ]
  }),

  heading(2, '5.3 컬럼 구성 (24개 컬럼)'),
  new Table({
    columnWidths: [2500, 3000, 3500],
    rows: [
      new TableRow({ children: [hCellW('그룹', { width: 2500 }), hCellW('컬럼', { width: 3000 }), hCellW('설명', { width: 3500 })] }),
      new TableRow({ children: [cell('기본 정보', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('NO, 품명, 규격, 단위', { width: 3000 }), cell('품목 식별 정보', { width: 3500 })] }),
      new TableRow({ children: [cell('계약도급', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('수량, 단가, 금액', { width: 3000 }), cell('발주처 계약 기준 단가', { width: 3500 })] }),
      new TableRow({ children: [cell('진행도급', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('단가, 금액', { width: 3000 }), cell('실제 진행 기준 단가', { width: 3500 })] }),
      new TableRow({ children: [cell('발주단가', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('수량, 단가, 금액', { width: 3000 }), cell('발주 기준 단가', { width: 3500 })] }),
      new TableRow({ children: [cell('업체 1~3', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('수량, 단가, 금액 (×3)', { width: 3000 }), cell('최대 3개 업체 견적', { width: 3500 })] }),
    ]
  }),

  heading(2, '5.4 계산 결과 연동'),
  p('벽체 계산이 완료되면 계산 결과를 단가비교표의 상세 섹션으로 자동 변환합니다.'),

  heading(3, '5.4.1 일위대가 방식 연동'),
  p('일위대가 방식으로 계산된 결과는 layerPricing 데이터에서 자재명과 규격을 추출하여 품목별로 집계합니다.'),
  bullet('각 벽체의 레이어별 자재를 순회'),
  bullet('동일 자재(품명+규격)의 수량을 합산'),
  bullet('자재비/노무비를 각각 분리하여 집계'),

  heading(3, '5.4.2 엑셀 방식 연동'),
  p('엑셀 방식으로 계산된 결과는 12개 고정 레이어 + 동적 레이어에서 unitPriceId를 추출하여 집계합니다.'),
  bullet('unitPriceMap에서 자재비/노무비 조회'),
  bullet('동일 자재(품명+규격)의 수량을 합산'),
  bullet('originalUnitPriceIds 배열을 수집하여 Revit 가시성 기능에 활용'),

  heading(2, '5.5 Excel 내보내기'),
  p('단가비교표를 ExcelJS 라이브러리로 엑셀 파일로 내보냅니다.'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('내용', { width: 6000 })] }),
      new TableRow({ children: [cell('시트명', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('"단가비교표"', { width: 6000 })] }),
      new TableRow({ children: [cell('헤더', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('4행 구조 — 제목, 현장명, 병합 헤더 (rowspan/colspan)', { width: 6000 })] }),
      new TableRow({ children: [cell('수식', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('공과잡비 비율 계산, 합계 SUM 수식, 금액 = 수량 × 단가', { width: 6000 })] }),
      new TableRow({ children: [cell('서식', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('숫자 #,##0 포맷, 헤더 회색 배경, 전체 테두리', { width: 6000 })] }),
    ]
  }),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 6. 데이터 저장 구조
// ============================================================
body.push(
  heading(1, '6. 데이터 저장 구조'),

  heading(2, '6.1 저장소 구성'),
  p('엑셀 단가표 모듈은 3개의 저장소를 사용하여 데이터를 관리합니다.'),
  new Table({
    columnWidths: [2200, 3000, 2000, 2160],
    rows: [
      new TableRow({ children: [hCellW('대상', { width: 2200 }), hCellW('저장소', { width: 3000 }), hCellW('키/테이블명', { width: 2000 }), hCellW('용도', { width: 2160 })] }),
      new TableRow({ children: [cell('단가표 데이터', { bold: true, width: 2200 }), cell('IndexedDB (KiyenoExcelDB)', { width: 3000 }), cell('importedUnitPrices', { width: 2000 }), cell('영구 저장', { width: 2160 })] }),
      new TableRow({ children: [cell('벽체타입 데이터', { bold: true, width: 2200 }), cell('IndexedDB (KiyenoExcelDB)', { width: 3000 }), cell('excelWallTypes', { width: 2000 }), cell('영구 저장', { width: 2160 })] }),
      new TableRow({ children: [cell('벽체타입 캐시', { bold: true, width: 2200 }), cell('LocalStorage', { width: 3000 }), cell('kiyeno_revit_wall_types', { width: 2000 }), cell('빠른 접근', { width: 2160 })] }),
      new TableRow({ children: [cell('자재 색상 기록', { bold: true, width: 2200 }), cell('LocalStorage', { width: 3000 }), cell('kiyeno_material_color_history', { width: 2000 }), cell('가시성 색상', { width: 2160 })] }),
    ]
  }),

  heading(2, '6.2 데이터 동기화'),
  p('IndexedDB와 메모리 캐시 간의 동기화 방식입니다:'),
  bullet('모달 열기 시: IndexedDB에서 전체 데이터를 읽어 메모리 캐시에 로드'),
  bullet('데이터 변경 시: 메모리 캐시와 IndexedDB를 동시에 업데이트'),
  bullet('빠른 조회: unitPriceMap 객체로 O(1) 시간복잡도의 자재 검색 지원'),

  heading(2, '6.3 데이터 안전성'),
  bullet('기본 데이터는 하드코딩으로 항상 보장됩니다 (55개 경량자재 + 49개 석고보드)'),
  bullet('사용자 데이터는 IndexedDB에 실시간 저장됩니다'),
  bullet('JSON/엑셀 파일을 통한 완전한 데이터 백업 및 복원이 가능합니다'),
  bullet('오프라인 환경에서도 모든 기능이 정상 동작합니다'),
  bullet('메타데이터가 포함된 엑셀 파일로 다른 PC로 데이터 이동이 가능합니다'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 7. 운영 시나리오
// ============================================================
body.push(
  heading(1, '7. 운영 시나리오'),

  heading(2, '7.1 기본 워크플로우'),

  heading(3, '시나리오 A: 새 프로젝트 시작'),
  p('목적: 외부 엑셀 단가표를 불러와서 벽체타입을 구성하고 Revit에서 생성'),
  bullet('엑셀 단가표 관리 탭에서 "불러오기"로 단가 파일을 로드'),
  bullet('벽체타입 관리 탭에서 "새 벽체타입 추가"로 벽체 구조를 정의'),
  bullet('각 레이어에 자재를 선택하여 할당 (좌클릭 → 일위대가 선택)'),
  bullet('완성된 벽체타입을 체크하고 "벽체타입 생성"으로 Revit에 전송'),
  bullet('Revit에서 복합마감 벽체가 자동 생성됨'),

  heading(3, '시나리오 B: 기존 벽체타입 수정'),
  p('목적: 기존에 구성한 벽체타입의 자재를 변경'),
  bullet('변경할 레이어 셀을 좌클릭하여 새 자재를 선택'),
  bullet('두께, 자재비, 노무비, 합계가 자동 재계산됨'),
  bullet('수정된 벽체타입을 Revit에 다시 전송하면 기존 WallType이 업데이트됨'),

  heading(3, '시나리오 C: 엑셀로 벽체타입 공유'),
  p('목적: 다른 PC나 사용자에게 벽체타입 데이터를 전달'),
  bullet('"엑셀 내보내기"로 벽체타입 파일을 다운로드'),
  bullet('상대방에게 엑셀 파일과 단가표 파일을 전달'),
  bullet('상대방은 단가표를 먼저 불러온 후, 벽체타입 파일을 "엑셀 불러오기"로 로드'),
  bullet('시트2(자재목록)의 자재가 상대방 단가표에 존재하면 자동 매칭됨'),

  heading(3, '시나리오 D: 엑셀에서 직접 벽체타입 작성'),
  p('목적: 시스템을 거치지 않고 엑셀에서 벽체타입을 직접 작성하여 불러오기'),
  bullet('시스템에서 한 번 "엑셀 내보내기"를 실행하여 템플릿을 확보'),
  bullet('시트2(자재목록)에서 원하는 자재의 "품명 규격" 텍스트를 복사'),
  bullet('시트1(벽체타입)의 레이어 셀에 붙여넣기'),
  bullet('"엑셀 불러오기"로 작성한 파일을 로드 → 3단계 매칭으로 자재 자동 인식'),

  heading(2, '7.2 단가비교표 활용'),

  heading(3, '시나리오 E: 업체 견적 비교'),
  p('목적: 3개 업체의 자재 견적을 비교하여 최적 업체 선정'),
  bullet('벽체 계산 완료 후 단가비교표 탭으로 이동'),
  bullet('계산 결과가 자동으로 자재비/노무비 상세 섹션에 반영됨'),
  bullet('업체별 단가를 수동 입력하여 비교'),
  bullet('"Excel 내보내기"로 비교표를 다운로드하여 보고서 작성'),

  heading(3, '시나리오 F: 자재별 벽체 위치 확인'),
  p('목적: 특정 자재가 어떤 벽체에 사용되었는지 Revit 3D 뷰에서 시각적으로 확인'),
  bullet('단가비교표의 품목 옆 가시성 버튼 클릭'),
  bullet('색상 선택 후 "적용" → Revit에서 해당 벽체가 색상으로 표시됨'),
  bullet('※ 별도 문서 "품목별 Revit 가시성 활성화 기능 설명서" 참조'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 8. 기술 사양
// ============================================================
body.push(
  heading(1, '8. 기술 사양'),

  heading(2, '8.1 시스템 아키텍처'),
  p('엑셀 단가표 모듈의 전체 데이터 흐름은 다음과 같습니다:'),
  spacer(50),
  p('① 엑셀 파일 (.xlsx) — SheetJS로 읽기, ExcelJS로 쓰기'),
  p('② 웹앱 (IndexedDB) — 단가표 + 벽체타입 영구 저장'),
  p('③ 메모리 캐시 — unitPriceMap으로 빠른 자재 검색'),
  p('④ Socket.IO — 웹앱 → Node.js 서버 (포트 3000)'),
  p('⑤ WebSocket — Node.js 서버 → Revit C# 애드인 (포트 3001)'),
  p('⑥ Revit API — CompoundStructure 기반 벽체 타입 생성'),

  heading(2, '8.2 주요 모듈'),
  new Table({
    columnWidths: [3500, 2000, 3500],
    rows: [
      new TableRow({ children: [hCellW('모듈', { width: 3500 }), hCellW('위치', { width: 2000 }), hCellW('역할', { width: 3500 })] }),
      new TableRow({ children: [cell('excelWallTypeManager.js', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('단가표 관리 + 벽체타입 관리 + Revit 생성', { width: 3500 })] }),
      new TableRow({ children: [cell('priceComparisonManager.js', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('단가비교표 렌더링 + Excel 내보내기', { width: 3500 })] }),
      new TableRow({ children: [cell('socketService.js', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('WebSocket 통신 관리', { width: 3500 })] }),
      new TableRow({ children: [cell('QTOForm.cs', { width: 3500 }), cell('Revit 애드인', { width: 2000, align: AlignmentType.CENTER }), cell('벽체 생성 + 색상 오버라이드 + 제도 뷰', { width: 3500 })] }),
    ]
  }),

  heading(2, '8.3 사용 라이브러리'),
  new Table({
    columnWidths: [2500, 2000, 4500],
    rows: [
      new TableRow({ children: [hCellW('라이브러리', { width: 2500 }), hCellW('버전', { width: 2000 }), hCellW('용도', { width: 4500 })] }),
      new TableRow({ children: [cell('SheetJS (XLSX)', { bold: true, width: 2500 }), cell('0.18.5', { width: 2000, align: AlignmentType.CENTER }), cell('엑셀 파일 읽기 (불러오기)', { width: 4500 })] }),
      new TableRow({ children: [cell('ExcelJS', { bold: true, width: 2500 }), cell('4.4.0', { width: 2000, align: AlignmentType.CENTER }), cell('엑셀 파일 쓰기 (내보내기) — 행 숨기기, 수식, 서식 지원', { width: 4500 })] }),
      new TableRow({ children: [cell('Dexie.js', { bold: true, width: 2500 }), cell('latest', { width: 2000, align: AlignmentType.CENTER }), cell('IndexedDB 래퍼 (단가표/벽체타입 영구 저장)', { width: 4500 })] }),
      new TableRow({ children: [cell('Socket.IO', { bold: true, width: 2500 }), cell('4.7.4', { width: 2000, align: AlignmentType.CENTER }), cell('WebSocket 통신 (Revit 연동)', { width: 4500 })] }),
    ]
  }),

  heading(2, '8.4 오류 처리'),
  new Table({
    columnWidths: [4000, 5000],
    rows: [
      new TableRow({ children: [hCellW('상황', { width: 4000 }), hCellW('처리', { width: 5000 })] }),
      new TableRow({ children: [cell('엑셀 파일 형식 오류', { width: 4000 }), cell('알림: "유효한 엑셀 파일이 아닙니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('헤더 인식 실패', { width: 4000 }), cell('알림: "헤더를 찾을 수 없습니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('중복 품명+규격', { width: 4000 }), cell('알림: "이미 존재하는 자재입니다" + 변경 취소', { width: 5000 })] }),
      new TableRow({ children: [cell('중복 벽체타입명', { width: 4000 }), cell('알림: "동일한 이름이 이미 존재합니다" + 변경 차단', { width: 5000 })] }),
      new TableRow({ children: [cell('자재 매칭 실패', { width: 4000 }), cell('알림: 매칭 실패 자재 목록 표시 + 정상 자재는 처리 계속', { width: 5000 })] }),
      new TableRow({ children: [cell('두께 추출 실패', { width: 4000 }), cell('미리보기에서 오류 표시 + 해당 레이어 생성 제외', { width: 5000 })] }),
      new TableRow({ children: [cell('Revit 미연결', { width: 4000 }), cell('알림: "Revit이 연결되어 있지 않습니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('서버 미연결', { width: 4000 }), cell('알림: "서버에 연결되어 있지 않습니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('삭제된 자재 참조', { width: 4000 }), cell('레이어 분석 시 오류 목록에 추가 + 미리보기에 표시', { width: 5000 })] }),
    ]
  }),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 9. 제약 사항 및 참고
// ============================================================
body.push(
  heading(1, '9. 제약 사항 및 참고'),

  heading(2, '9.1 제약 사항'),
  bullet('엑셀 단가표는 브라우저 IndexedDB에 저장되므로, 브라우저별로 독립적입니다'),
  bullet('다른 PC로 데이터를 이동하려면 엑셀/JSON 파일 내보내기 후 가져오기가 필요합니다'),
  bullet('벽체타입 이름은 고유해야 하며, 중복 이름은 차단됩니다 (Revit 제약)'),
  bullet('Revit 벽체 생성 기능은 Revit C# 애드인이 WebSocket으로 연결된 상태에서만 사용 가능합니다'),
  bullet('두께가 0이거나 추출할 수 없는 레이어는 Revit 벽체에 포함되지 않습니다'),
  bullet('자재 매칭은 "품명 규격" 텍스트 기반이므로, 단가표에 등록되지 않은 자재는 매칭되지 않습니다'),
  bullet('단가비교표의 데이터는 메모리에만 존재하며, 새로고침 시 재계산이 필요합니다'),

  heading(2, '9.2 참고 사항'),
  bullet('엑셀 내보내기 파일의 1행(메타데이터)은 ExcelJS의 행 숨기기 기능으로 숨겨져 있습니다'),
  bullet('사용자가 직접 작성한 엑셀 파일도 헤더 텍스트 기반으로 불러오기가 가능합니다'),
  bullet('시트2(자재목록)의 "품명 규격" 컬럼을 복사하여 시트1의 레이어 셀에 붙여넣을 수 있습니다'),
  bullet('3단계 텍스트 매칭으로 공백 차이로 인한 매칭 실패를 최소화합니다'),
  bullet('병합 모드와 전체 교체 모드를 선택하여 기존 데이터 보존 여부를 결정할 수 있습니다'),
  bullet('Revit 벽체 생성 시 동일 이름의 WallType이 존재하면 기존 구조를 수정합니다'),
  bullet('품목별 Revit 가시성 활성화 기능에 대해서는 별도 문서를 참조하시기 바랍니다'),

  heading(2, '9.3 관련 문서'),
  new Table({
    columnWidths: [4500, 4500],
    rows: [
      new TableRow({ children: [hCellW('문서명', { width: 4500 }), hCellW('설명', { width: 4500 })] }),
      new TableRow({ children: [cell('품목별 Revit 가시성 활성화 기능 설명서', { bold: true, width: 4500 }), cell('단가비교표에서 자재별 Revit 3D 뷰 색상 적용 기능', { width: 4500 })] }),
    ]
  }),
);

// 문서 끝
body.push(
  spacer(400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 },
    children: [new TextRun({ text: '- 이하 여백 -', font: FONT, size: 20, color: COLOR_GRAY, italics: true })]
  }),
);

// ===== 본문 섹션 =====
const bodySection = {
  properties: {
    page: {
      margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
      pageNumbers: { start: 1 },
    }
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'Kiyeno — 엑셀 단가표 관리 기능 설명서', font: FONT, size: 16, color: COLOR_GRAY, italics: true })]
      })]
    })
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: '— ', font: FONT, size: 16, color: COLOR_GRAY }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: COLOR_GRAY }),
          new TextRun({ text: ' / ', font: FONT, size: 16, color: COLOR_GRAY }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: COLOR_GRAY }),
          new TextRun({ text: ' —', font: FONT, size: 16, color: COLOR_GRAY }),
        ]
      })]
    })
  },
  children: body,
};

// ===== 문서 생성 =====
const doc = new Document({
  sections: [coverSection, bodySection],
  styles: {
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 32, bold: true, color: COLOR_PRIMARY }, paragraph: { spacing: { before: 360, after: 200 } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 26, bold: true, color: COLOR_HEADER }, paragraph: { spacing: { before: 240, after: 120 } } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 22, bold: true, color: COLOR_BLACK }, paragraph: { spacing: { before: 200, after: 100 } } },
    ]
  }
});

// 파일 저장
Packer.toBuffer(doc).then(buffer => {
  const outPath = __dirname + '/엑셀단가표_기능설명서.docx';
  fs.writeFileSync(outPath, buffer);
  console.log('✅ 문서 생성 완료:', outPath);
}).catch(err => {
  console.error('❌ 문서 생성 실패:', err);
});
