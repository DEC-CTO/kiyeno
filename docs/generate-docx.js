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

const tBorder = { style: BorderStyle.SINGLE, size: 1, color: 'BBBBBB' };
const cellBorders = { top: tBorder, bottom: tBorder, left: tBorder, right: tBorder };
const noBorders = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

// 헬퍼: 테이블 셀
function cell(text, opts = {}) {
  const { bold, width, shading, align, font, size, colSpan, rowSpan } = opts;
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
        color: COLOR_BLACK,
      })]
    })]
  });
}

// 헬퍼: 헤더 셀
function hCell(text, opts = {}) {
  return cell(text, { bold: true, shading: COLOR_HEADER, align: AlignmentType.CENTER, font: FONT, size: 20, ...opts, });
}

// 헤더 셀 텍스트 색상 흰색
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

// ===== 표지 섹션 =====
const coverSection = {
  properties: {
    page: {
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    }
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
    spacer(600),
    // 문서 정보 테이블
    new Table({
      columnWidths: [2400, 4000],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '문서 버전', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    1.0', font: FONT, size: 22 })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '작성일', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    2026년 02월 12일', font: FONT, size: 22 })] })] }),
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

// ===== 본문 섹션 =====
const bodyChildren = [];

// 목차
bodyChildren.push(
  new TableOfContents('목차', { hyperlink: true, headingStyleRange: '1-3' }),
  new Paragraph({ children: [new PageBreak()] })
);

// 1. 개요
bodyChildren.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: '1. 개요', font: FONT })] }),

  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: '1.1 문서 목적', font: FONT })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '본 문서는 Kiyeno 벽체 관리 시스템의 엑셀 단가표 관리 모듈에 대한 기능을 설명합니다.', font: FONT, size: 22 })] }),

  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: '1.2 시스템 개요', font: FONT })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Kiyeno 벽체 관리 시스템은 건설업계를 위한 종합 벽체 관리 솔루션으로, 엑셀 단가표를 기반으로 벽체타입을 관리하고 Autodesk Revit과 연동하여 벽체 타입을 자동 생성할 수 있습니다.', font: FONT, size: 22 })] }),

  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: '1.3 대상 사용자', font: FONT })] }),
);

const users = ['건설업계 실무자', '건축 설계사무소', '시공사 견적 담당자', 'Revit 사용 설계자'];
users.forEach(u => {
  bodyChildren.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 360 }, children: [new TextRun({ text: `  - ${u}`, font: FONT, size: 22 })] }));
});

bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));

// 2. 엑셀 단가표 관리
bodyChildren.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: '2. 엑셀 단가표 관리', font: FONT })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '2.1 기능 목록', font: FONT })] }),
);

// 기능 목록 테이블
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
  new TableRow({ children: [
    hCellW('번호', { width: 900 }),
    hCellW('기능명', { width: 2200 }),
    hCellW('설명', { width: 6260 }),
  ]})
];
funcA.forEach(([no, name, desc]) => {
  funcARows.push(new TableRow({ children: [
    cell(no, { width: 900, align: AlignmentType.CENTER }),
    cell(name, { width: 2200, bold: true }),
    cell(desc, { width: 6260 }),
  ]}));
});
bodyChildren.push(new Table({ columnWidths: [900, 2200, 6260], rows: funcARows }));

// 2.2 테이블 컬럼 구성
bodyChildren.push(
  spacer(200),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '2.2 테이블 컬럼 구성', font: FONT })] }),
);

const colA = [
  ['NO', '불가', '자동 번호'],
  ['부위', '가능', '가설벽, 벽 등 분류'],
  ['품명', '가능', '자재 이름 (필수 항목)'],
  ['규격', '가능', '자재 규격 (필수 항목)'],
  ['단위', '가능', '기본값 M2'],
  ['두께', '가능', 'mm 단위, 소수점 유지'],
  ['수량', '가능', '기본값 1'],
  ['자재비', '가능', '원 단위'],
  ['노무비', '가능', '원 단위'],
  ['합계', '불가', '자재비+노무비 자동 계산'],
  ['자재공종', '가능', '경량, 도장 등'],
  ['노무공종', '가능', '경량, 도장 등'],
];

const colARows = [
  new TableRow({ children: [
    hCellW('컬럼명', { width: 2000 }),
    hCellW('편집', { width: 1500 }),
    hCellW('설명', { width: 5860 }),
  ]})
];
colA.forEach(([col, edit, desc]) => {
  const shading = edit === '불가' ? 'F0F0F0' : undefined;
  colARows.push(new TableRow({ children: [
    cell(col, { width: 2000, bold: true, align: AlignmentType.CENTER, shading }),
    cell(edit, { width: 1500, align: AlignmentType.CENTER, shading }),
    cell(desc, { width: 5860, shading }),
  ]}));
});
bodyChildren.push(new Table({ columnWidths: [2000, 1500, 5860], rows: colARows }));

bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));

// 3. 엑셀 벽체타입 관리
bodyChildren.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: '3. 엑셀 벽체타입 관리', font: FONT })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '3.1 기능 목록', font: FONT })] }),
);

const funcB = [
  ['B-1', '새 벽체타입 추가', '빈 벽체타입을 생성합니다. 기본 이름은 WallType_N 형식입니다.'],
  ['B-2', '선택 삭제', '체크박스로 선택된 벽체타입을 일괄 삭제합니다.'],
  ['B-3', '벽체타입명 편집', 'WallType 셀을 더블클릭하여 이름을 수정할 수 있습니다.'],
  ['B-4', '레이어 자재 선택', '레이어 셀을 좌클릭하면 일위대가 선택 모달이 열리며, 자재를 할당할 수 있습니다.'],
  ['B-5', '레이어 자재 해제', '레이어 셀을 우클릭하면 할당된 자재를 제거합니다.'],
  ['B-6', '두께 자동 계산', '레이어 변경 시 모든 레이어의 두께를 합산하여 소수점 1자리로 표시합니다.'],
  ['B-7', '컬럼 추가', '5개 위치(좌측마감 뒤, 구조체 뒤, 단열재 뒤, 우측마감 뒤, 옵션 뒤) 중 선택하여 동적 컬럼을 추가합니다.'],
  ['B-8', '컬럼 삭제', '추가된 동적 컬럼을 삭제합니다.'],
  ['B-9', '드래그 드롭 순서 변경', '행을 드래그하여 벽체타입 순서를 변경할 수 있습니다.'],
  ['B-10', '전체 선택/해제', '헤더 체크박스로 전체 선택을 토글합니다.'],
  ['B-11', 'JSON 내보내기', '전체 벽체타입 데이터를 .json 파일로 다운로드합니다.'],
  ['B-12', 'JSON 불러오기', '.json 파일에서 벽체타입 데이터를 복원합니다.'],
  ['B-13', 'Revit 벽체 생성', '선택된 벽체타입의 레이어 구조를 미리보기한 후, WebSocket을 통해 Revit에서 벽체 타입을 생성합니다.'],
];

const funcBRows = [
  new TableRow({ children: [
    hCellW('번호', { width: 900 }),
    hCellW('기능명', { width: 2600 }),
    hCellW('설명', { width: 5860 }),
  ]})
];
funcB.forEach(([no, name, desc]) => {
  funcBRows.push(new TableRow({ children: [
    cell(no, { width: 900, align: AlignmentType.CENTER }),
    cell(name, { width: 2600, bold: true }),
    cell(desc, { width: 5860 }),
  ]}));
});
bodyChildren.push(new Table({ columnWidths: [900, 2600, 5860], rows: funcBRows }));

// 3.2 테이블 컬럼 구조
bodyChildren.push(
  spacer(200),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '3.2 테이블 컬럼 구조', font: FONT })] }),
);

const colB = [
  ['고정', '체크박스, No, WallType, 두께(mm)', '기본 정보'],
  ['좌측마감', 'Layer3, Layer2, Layer1', '좌측 마감재'],
  ['중앙', '구조체, 단열재', '벽체 구조'],
  ['우측마감', 'Layer1, Layer2, Layer3', '우측 마감재'],
  ['옵션', '옵션1 ~ 옵션4', '추가 자재'],
  ['동적', '사용자 추가 컬럼', '5개 위치에 삽입 가능'],
];

const colBRows = [
  new TableRow({ children: [
    hCellW('그룹', { width: 2000 }),
    hCellW('컬럼', { width: 4000 }),
    hCellW('설명', { width: 3360 }),
  ]})
];
colB.forEach(([grp, cols, desc]) => {
  colBRows.push(new TableRow({ children: [
    cell(grp, { width: 2000, bold: true, align: AlignmentType.CENTER }),
    cell(cols, { width: 4000 }),
    cell(desc, { width: 3360 }),
  ]}));
});
bodyChildren.push(new Table({ columnWidths: [2000, 4000, 3360], rows: colBRows }));

bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Revit 벽체 생성 프로세스
bodyChildren.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: '4. Revit 벽체 생성 프로세스', font: FONT })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '4.1 생성 절차', font: FONT })] }),
);

const steps = [
  ['1', '체크박스로 생성할 벽체타입을 선택합니다.'],
  ['2', '"벽체타입 생성" 버튼을 클릭합니다.'],
  ['3', '각 벽체의 레이어 구조를 분석합니다. (두께 추출, 자재명, 규격)'],
  ['4', '오류 검사를 수행합니다. (두께 추출 실패, 자재 미등록 등)'],
  ['5', '두께가 0, 빈칸, "-" 등 비정상 값인 레이어는 건너뛰고 Revit 복합마감 레이어를 생성하지 않습니다.'],
  ['6', '미리보기 모달을 표시합니다. (레이어별 두께, 총 두께)'],
  ['7', '오류가 있으면 "생성" 버튼이 비활성화되며 경고가 표시됩니다.'],
  ['8', '"Revit에서 생성하기" 클릭 시 WebSocket을 통해 C# 애드인으로 데이터를 전송합니다.'],
];

const stepRows = [
  new TableRow({ children: [
    hCellW('단계', { width: 1000 }),
    hCellW('설명', { width: 8360 }),
  ]})
];
steps.forEach(([no, desc]) => {
  const shading = no === '5' ? 'FFF3CD' : undefined;
  stepRows.push(new TableRow({ children: [
    cell(no, { width: 1000, align: AlignmentType.CENTER, bold: true, shading }),
    cell(desc, { width: 8360, shading }),
  ]}));
});
bodyChildren.push(new Table({ columnWidths: [1000, 8360], rows: stepRows }));

// 4.2 두께 검증
bodyChildren.push(
  spacer(200),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '4.2 두께 검증 (2단계 방어)', font: FONT })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: '비정상적인 두께 값을 가진 레이어가 Revit에 전송되지 않도록 2단계에 걸쳐 검증합니다.', font: FONT, size: 22 })] }),
);

const validRows = [
  new TableRow({ children: [
    hCellW('검증 위치', { width: 2800 }),
    hCellW('조건', { width: 2800 }),
    hCellW('처리', { width: 3760 }),
  ]}),
  new TableRow({ children: [
    cell('웹앱 (JavaScript)', { width: 2800, bold: true, align: AlignmentType.CENTER }),
    cell('NaN, 0 이하, null', { width: 2800, align: AlignmentType.CENTER }),
    cell('해당 레이어를 제외하고 오류로 표시합니다.', { width: 3760 }),
  ]}),
  new TableRow({ children: [
    cell('C# Revit 애드인', { width: 2800, bold: true, align: AlignmentType.CENTER }),
    cell('Thickness <= 0', { width: 2800, align: AlignmentType.CENTER }),
    cell('해당 레이어를 건너뛰고 생성하지 않습니다.', { width: 3760 }),
  ]}),
];
bodyChildren.push(new Table({ columnWidths: [2800, 2800, 3760], rows: validRows }));

bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));

// 5. 데이터 저장 구조
bodyChildren.push(
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: '5. 데이터 저장 구조', font: FONT })] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '5.1 저장소 구성', font: FONT })] }),
);

const storeRows = [
  new TableRow({ children: [
    hCellW('대상', { width: 2600 }),
    hCellW('저장소', { width: 3600 }),
    hCellW('키 / 테이블명', { width: 3160 }),
  ]}),
  new TableRow({ children: [
    cell('단가표 데이터', { width: 2600, bold: true }),
    cell('IndexedDB (KiyenoExcelDB)', { width: 3600 }),
    cell('importedUnitPrices', { width: 3160 }),
  ]}),
  new TableRow({ children: [
    cell('벽체타입 데이터', { width: 2600, bold: true }),
    cell('IndexedDB (KiyenoExcelDB)', { width: 3600 }),
    cell('excelWallTypes', { width: 3160 }),
  ]}),
  new TableRow({ children: [
    cell('벽체타입 (빠른 접근)', { width: 2600, bold: true }),
    cell('LocalStorage', { width: 3600 }),
    cell('kiyeno_revit_wall_types', { width: 3160 }),
  ]}),
];
bodyChildren.push(new Table({ columnWidths: [2600, 3600, 3160], rows: storeRows }));

// 5.2 데이터 안전성
bodyChildren.push(
  spacer(200),
  new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: '5.2 데이터 안전성', font: FONT })] }),
);

const safetyItems = [
  '기본 데이터는 하드코딩으로 항상 보장됩니다.',
  '사용자 데이터는 IndexedDB에 실시간 저장됩니다.',
  'JSON 파일을 통한 완전한 데이터 백업 및 복원이 가능합니다.',
  '오프라인 환경에서도 모든 기능이 정상 동작합니다.',
];
safetyItems.forEach(item => {
  bodyChildren.push(new Paragraph({
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [new TextRun({ text: `  - ${item}`, font: FONT, size: 22 })]
  }));
});

// 문서 끝 구분선
bodyChildren.push(
  spacer(400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 },
    children: [new TextRun({ text: '- 이하 여백 -', font: FONT, size: 20, color: COLOR_GRAY, italics: true })]
  }),
);

// ===== 문서 생성 =====
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } }
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: COLOR_PRIMARY, font: FONT },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: COLOR_HEADER, font: FONT },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: '333333', font: FONT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    coverSection,
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 },
          pageNumbers: { start: 1 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'Kiyeno 벽체 관리 시스템 ', font: FONT, size: 16, color: COLOR_GRAY }),
              new TextRun({ text: '|  엑셀 단가표 관리 기능 설명서', font: FONT, size: 16, color: COLOR_GRAY }),
            ]
          })]
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '- ', font: FONT, size: 18, color: COLOR_GRAY }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: COLOR_GRAY }),
              new TextRun({ text: ' / ', font: FONT, size: 18, color: COLOR_GRAY }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: COLOR_GRAY }),
              new TextRun({ text: ' -', font: FONT, size: 18, color: COLOR_GRAY }),
            ]
          })]
        }),
      },
      children: bodyChildren,
    }
  ],
});

// 파일 저장
const OUTPUT = 'c:\\ClaudeProject\\ReReKiyeno\\docs\\엑셀단가표_기능설명서.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log('문서 생성 완료:', OUTPUT);
}).catch(err => {
  console.error('문서 생성 실패:', err);
});
