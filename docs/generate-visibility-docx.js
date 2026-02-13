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
      children: [new TextRun({ text: '품목별 Revit 가시성 활성화 기능 설명서', font: FONT, size: 36, color: COLOR_HEADER })]
    }),
    spacer(100),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: '(단가비교표 Color Override 기능)', font: FONT, size: 24, color: COLOR_GRAY })]
    }),
    spacer(600),
    new Table({
      columnWidths: [2400, 4000],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: 2400, type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: '문서 버전', font: FONT, size: 22, color: COLOR_GRAY })] })] }),
          new TableCell({ borders: noBorders, width: { size: 4000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: '    1.0', font: FONT, size: 22 })] })] }),
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
  p('본 문서는 Kiyeno 벽체 관리 시스템의 "품목별 Revit 가시성 활성화" 기능에 대해 설명합니다. 이 기능은 단가비교표에서 특정 자재가 포함된 벽체를 Revit 3D 뷰에서 색상으로 구분하여 시각화하는 기능입니다.'),

  heading(2, '1.2 기능 개요'),
  p('단가비교표의 각 품목 옆에 위치한 가시성 버튼을 클릭하면, 해당 자재가 사용된 모든 벽체를 Revit에서 사용자가 지정한 색상으로 하이라이트합니다. 동시에 색상 범례(Legend)를 제도 뷰(Drafting View)로 자동 생성합니다.'),

  heading(2, '1.3 적용 범위'),
  p('본 기능은 두 가지 계산 방식 모두에 적용됩니다:'),
  bullet('일위대가 방식 — 기존 일위대가 데이터베이스 기반 벽체 계산'),
  bullet('엑셀 방식 — 엑셀 단가표에서 가져온 일위대가 기반 벽체 계산'),

  heading(2, '1.4 사전 조건'),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2000 }), hCellW('조건', { width: 7000 })] }),
      new TableRow({ children: [cell('Revit 연결', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('Kiyeno 웹앱과 Revit C# 애드인이 WebSocket으로 연결된 상태', { width: 7000 })] }),
      new TableRow({ children: [cell('활성 뷰', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('Revit에서 3D 뷰가 활성화된 상태 (최초 실행 시 3D 뷰를 복제하여 생성)', { width: 7000 })] }),
      new TableRow({ children: [cell('벽체 데이터', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('Revit에 동기화된 벽체 데이터가 존재 (ElementId 매핑 필요)', { width: 7000 })] }),
      new TableRow({ children: [cell('계산 완료', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('벽체별 합계 또는 벽체별 상세 탭에서 계산이 완료된 상태', { width: 7000 })] }),
    ]
  }),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 2. 사용자 인터페이스
// ============================================================
body.push(
  heading(1, '2. 사용자 인터페이스'),

  heading(2, '2.1 가시성 버튼 위치'),
  p('단가비교표 탭의 품목 목록에서 각 품명 옆에 파란색 큐브 아이콘(🧊) 버튼이 표시됩니다.'),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2000 }), hCellW('설명', { width: 7000 })] }),
      new TableRow({ children: [cell('위치', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('단가비교표 > 자재비/노무비 섹션 > 각 품목 행의 품명 옆', { width: 7000 })] }),
      new TableRow({ children: [cell('아이콘', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('파란색 큐브 아이콘 (fas fa-cube)', { width: 7000 })] }),
      new TableRow({ children: [cell('툴팁', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('"이 자재가 사용된 벽체를 Revit 3D 뷰에서 색상으로 표시"', { width: 7000 })] }),
      new TableRow({ children: [cell('표시 조건', { bold: true, width: 2000, align: AlignmentType.CENTER }), cell('자재비 섹션과 노무비 섹션의 모든 품목에 표시', { width: 7000 })] }),
    ]
  }),

  heading(2, '2.2 색상 선택 모달'),
  p('가시성 버튼 클릭 시 색상 선택 모달이 표시됩니다:'),
  bullet('품명 및 규격 표시 (예: "C-STUD 65형")'),
  bullet('적용 대상 벽체 수 표시 (예: "21개 벽체에 색상 적용")'),
  bullet('색상 선택기 (Color Picker) — HTML5 네이티브 컬러 입력'),
  bullet('적용 버튼 — 선택한 색상으로 Revit에 명령 전송'),
  bullet('닫기 버튼 — 취소 후 모달 닫기'),

  heading(2, '2.3 색상 저장'),
  p('사용자가 선택한 색상은 브라우저 localStorage에 자동 저장됩니다. 동일한 품목에 대해 다시 가시성 버튼을 클릭하면 이전에 선택한 색상이 기본값으로 표시됩니다.'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2500 }), hCellW('내용', { width: 6500 })] }),
      new TableRow({ children: [cell('저장 키', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('kiyeno_material_color_history', { width: 6500 })] }),
      new TableRow({ children: [cell('저장 형식', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('JSON 객체 — { "품명 규격": "#hex색상코드" }', { width: 6500 })] }),
      new TableRow({ children: [cell('기본 색상', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('#ff6b6b (빨간색 계열)', { width: 6500 })] }),
    ]
  }),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 3. 벽체 검색 로직
// ============================================================
body.push(
  heading(1, '3. 벽체 검색 로직'),

  heading(2, '3.1 개요'),
  p('가시성 버튼 클릭 시 해당 자재가 포함된 벽체를 검색합니다. 검색 방식은 2단계로 구성되며, 계산 방식(일위대가/엑셀)에 따라 검색 대상이 달라집니다.'),

  heading(2, '3.2 검색 방식'),

  heading(3, '3.2.1 정확한 매칭 (Exact Match)'),
  p('단가비교표에서 수집된 originalUnitPriceIds를 사용하여 정확하게 매칭합니다.'),
  bullet('일위대가 방식: 각 레이어의 materialName이 originalUnitPriceIds 배열에 포함되는지 확인'),
  bullet('엑셀 방식: 각 레이어의 unitPriceId가 originalUnitPriceIds 배열에 포함되는지 확인'),
  p('이 방식은 동일한 품명/규격이지만 서로 다른 단가 항목인 경우를 정확히 구분합니다.'),

  heading(3, '3.2.2 폴백 매칭 (Fallback Match)'),
  p('originalUnitPriceIds가 없는 경우 품명과 규격의 텍스트 매칭으로 검색합니다.'),
  bullet('특수문자 제거 및 정규화 처리'),
  bullet('품명 포함 여부 + 규격 포함 여부 조합 검사'),
  bullet('대소문자 무시'),

  heading(2, '3.3 계산 방식별 검색 대상'),
  new Table({
    columnWidths: [2500, 3250, 3250],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2500 }), hCellW('일위대가 방식', { width: 3250 }), hCellW('엑셀 방식', { width: 3250 })] }),
      new TableRow({ children: [cell('검색 대상', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('calculationResults의 layerPricing', { width: 3250 }), cell('excelWallTypes의 12개 레이어 + extraLayers', { width: 3250 })] }),
      new TableRow({ children: [cell('매칭 키', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('layer.materialName (일위대가 ID)', { width: 3250 }), cell('layer.unitPriceId (엑셀 단가 ID)', { width: 3250 })] }),
      new TableRow({ children: [cell('반환값', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('매칭된 벽체의 ElementId 배열', { width: 3250 }), cell('매칭된 벽체의 ElementId 배열', { width: 3250 })] }),
    ]
  }),

  heading(2, '3.4 검색 결과'),
  bullet('검색된 벽체가 없는 경우: "해당 자재가 포함된 벽체가 없습니다" 알림 표시'),
  bullet('검색된 벽체가 있는 경우: 색상 선택 모달 표시 + 벽체 수 안내'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 4. Revit 3D 뷰 생성
// ============================================================
body.push(
  heading(1, '4. Revit 3D 뷰 색상 적용'),

  heading(2, '4.1 통신 프로토콜'),
  p('웹앱에서 Revit으로 WebSocket을 통해 명령을 전송합니다.'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2500 }), hCellW('내용', { width: 6500 })] }),
      new TableRow({ children: [cell('통신 방식', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('Socket.IO → Node.js 서버 → WebSocket → Revit C# 애드인', { width: 6500 })] }),
      new TableRow({ children: [cell('명령 이름', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('DUPLICATE_3D_VIEW_WITH_COLOR', { width: 6500 })] }),
      new TableRow({ children: [cell('전송 데이터', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('viewName (뷰 이름), elementIds (벽체 ID 배열), color (RGB 객체)', { width: 6500 })] }),
    ]
  }),

  heading(2, '4.2 전송 데이터 구조'),
  new Table({
    columnWidths: [2000, 2000, 5000],
    rows: [
      new TableRow({ children: [hCellW('필드', { width: 2000 }), hCellW('타입', { width: 2000 }), hCellW('설명', { width: 5000 })] }),
      new TableRow({ children: [cell('viewName', { bold: true, width: 2000 }), cell('string', { width: 2000, align: AlignmentType.CENTER }), cell('생성될 3D 뷰의 이름 (예: "C-STUD 65형")', { width: 5000 })] }),
      new TableRow({ children: [cell('elementIds', { bold: true, width: 2000 }), cell('string[]', { width: 2000, align: AlignmentType.CENTER }), cell('색상을 적용할 벽체의 Revit ElementId 배열', { width: 5000 })] }),
      new TableRow({ children: [cell('color', { bold: true, width: 2000 }), cell('{ r, g, b }', { width: 2000, align: AlignmentType.CENTER }), cell('RGB 색상값 (0~255), HEX → RGB 자동 변환', { width: 5000 })] }),
    ]
  }),

  heading(2, '4.3 Revit 측 처리 프로세스'),
  p('Revit C# 애드인에서 수신한 명령을 처리하는 순서는 다음과 같습니다:'),

  heading(3, '4.3.1 기존 뷰 확인'),
  p('동일한 이름의 3D 뷰가 이미 존재하는지 검색합니다.'),
  bullet('존재하는 경우: 해당 뷰를 재사용 (새로 복제하지 않음)'),
  bullet('존재하지 않는 경우: 현재 활성 3D 뷰를 복제하여 새 뷰 생성'),
  p('※ 현재 활성 뷰가 3D 뷰가 아닌 경우 "3D 뷰를 활성화한 후 다시 시도하세요" 안내 메시지가 표시됩니다.', { color: COLOR_ACCENT }),

  heading(3, '4.3.2 기존 색상 초기화'),
  p('대상 3D 뷰 내의 모든 벽체에 대해 그래픽 오버라이드를 초기화합니다. 이전에 적용된 색상이 있더라도 깨끗한 상태에서 새 색상을 적용합니다.'),

  heading(3, '4.3.3 색상 오버라이드 적용'),
  p('지정된 ElementId의 벽체에 대해 다음 그래픽 설정을 적용합니다:'),
  new Table({
    columnWidths: [4500, 4500],
    rows: [
      new TableRow({ children: [hCellW('적용 대상', { width: 4500 }), hCellW('설명', { width: 4500 })] }),
      new TableRow({ children: [cell('Surface Foreground Pattern', { width: 4500 }), cell('3D 뷰에서 벽체 표면 전경 색상', { width: 4500 })] }),
      new TableRow({ children: [cell('Surface Background Pattern', { width: 4500 }), cell('3D 뷰에서 벽체 표면 배경 색상', { width: 4500 })] }),
      new TableRow({ children: [cell('Cut Foreground Pattern', { width: 4500 }), cell('단면/평면 뷰에서 벽체 절단면 전경 색상', { width: 4500 })] }),
      new TableRow({ children: [cell('Cut Background Pattern', { width: 4500 }), cell('단면/평면 뷰에서 벽체 절단면 배경 색상', { width: 4500 })] }),
    ]
  }),
  spacer(50),
  p('모든 색상은 Solid Fill 패턴으로 적용되어, 벽체가 단일 색상으로 완전히 채워집니다.'),

  heading(3, '4.3.4 뷰 활성화'),
  p('색상 적용이 완료되면 해당 3D 뷰를 자동으로 활성화하여 사용자가 즉시 결과를 확인할 수 있습니다.'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 5. 제도 뷰(색상표) 자동 생성
// ============================================================
body.push(
  heading(1, '5. 제도 뷰(색상표) 자동 생성'),

  heading(2, '5.1 개요'),
  p('3D 뷰에 색상이 적용된 후, 동일한 이름의 제도 뷰(Drafting View)가 자동으로 생성됩니다. 이 제도 뷰는 색상 범례(Legend) 역할을 하며, 어떤 색상이 어떤 자재를 나타내는지 시각적으로 표시합니다.'),

  heading(2, '5.2 생성 프로세스'),

  heading(3, '5.2.1 기존 제도 뷰 처리'),
  p('동일한 이름의 제도 뷰가 이미 존재하는 경우, 기존 뷰를 삭제하고 새로 생성합니다. 이를 통해 색상 변경 시 항상 최신 색상이 반영됩니다.'),

  heading(3, '5.2.2 제도 뷰 생성'),
  new Table({
    columnWidths: [2500, 6500],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 2500 }), hCellW('내용', { width: 6500 })] }),
      new TableRow({ children: [cell('뷰 이름', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('자재명과 동일 (예: "C-STUD 65형")', { width: 6500 })] }),
      new TableRow({ children: [cell('뷰 축척', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('1:50', { width: 6500 })] }),
      new TableRow({ children: [cell('뷰 유형', { bold: true, width: 2500, align: AlignmentType.CENTER }), cell('ViewDrafting (제도 뷰)', { width: 6500 })] }),
    ]
  }),

  heading(3, '5.2.3 색상 박스 생성'),
  p('FilledRegion을 사용하여 색상 박스를 생성합니다:'),
  new Table({
    columnWidths: [3000, 3000, 3000],
    rows: [
      new TableRow({ children: [hCellW('항목', { width: 3000 }), hCellW('모델 크기', { width: 3000 }), hCellW('출력 크기 (1:50)', { width: 3000 })] }),
      new TableRow({ children: [cell('박스 가로', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('750mm', { width: 3000, align: AlignmentType.CENTER }), cell('15mm', { width: 3000, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cell('박스 세로', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('450mm', { width: 3000, align: AlignmentType.CENTER }), cell('9mm', { width: 3000, align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cell('텍스트 간격', { bold: true, width: 3000, align: AlignmentType.CENTER }), cell('150mm', { width: 3000, align: AlignmentType.CENTER }), cell('3mm', { width: 3000, align: AlignmentType.CENTER })] }),
    ]
  }),

  heading(3, '5.2.4 텍스트 레이블'),
  p('색상 박스 오른쪽에 자재명 텍스트가 표시됩니다. 프로젝트에서 사용 가능한 가장 작은 TextNoteType을 자동 선택합니다.'),

  heading(2, '5.3 범례 레이아웃'),
  p('생성되는 제도 뷰의 레이아웃은 다음과 같습니다:'),
  spacer(50),
  new Table({
    columnWidths: [2000, 7000],
    rows: [
      new TableRow({ children: [
        cell('■ 색상', { bold: true, width: 2000, align: AlignmentType.CENTER, shading: 'FFE0E0' }),
        cell('C-STUD 65형', { width: 7000 }),
      ] }),
    ]
  }),
  spacer(50),
  p('여러 자재에 대해 각각 가시성을 활성화하면, 개별 제도 뷰가 생성됩니다. 이를 시트에 배치하여 종합 색상표를 구성할 수 있습니다.'),

  heading(2, '5.4 FilledRegionType 관리'),
  p('색상별로 고유한 FilledRegionType이 자동 생성됩니다:'),
  bullet('타입 이름 규칙: QTO_Color_{R}_{G}_{B} (예: QTO_Color_255_100_100)'),
  bullet('이미 동일 색상의 타입이 존재하면 재사용'),
  bullet('Solid Fill 패턴으로 전경/배경 모두 적용'),
  bullet('Masking 모드 활성화 (불투명)'),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 6. 운영 시나리오
// ============================================================
body.push(
  heading(1, '6. 운영 시나리오'),

  heading(2, '6.1 기본 사용 시나리오'),

  heading(3, '시나리오 A: 특정 자재 위치 확인'),
  p('목적: "방수석고보드 9.5T*1PLY"가 어디에 사용되었는지 Revit에서 확인'),
  bullet('단가비교표에서 "방수석고보드" 행의 가시성 버튼 클릭'),
  bullet('색상 선택 (예: 분홍색) → 적용 클릭'),
  bullet('Revit에서 해당 자재가 포함된 벽체가 분홍색으로 표시됨'),
  bullet('제도 뷰 "방수석고보드 9.5T*1PLY"가 자동 생성됨'),

  heading(3, '시나리오 B: 복수 자재 비교'),
  p('목적: C-STUD 65형과 C-STUD 50형이 각각 어디에 사용되었는지 비교'),
  bullet('C-STUD 65형 → 빨간색으로 가시성 활성화 → 3D 뷰 "C-STUD 65형" 생성'),
  bullet('C-STUD 50형 → 파란색으로 가시성 활성화 → 3D 뷰 "C-STUD 50형" 생성'),
  bullet('각 3D 뷰를 전환하며 비교 확인'),
  bullet('제도 뷰를 시트에 나란히 배치하여 범례 구성 가능'),

  heading(3, '시나리오 C: 색상 변경'),
  p('목적: 이미 적용한 색상을 다른 색상으로 변경'),
  bullet('동일 자재의 가시성 버튼을 다시 클릭'),
  bullet('이전에 저장된 색상이 기본값으로 표시됨'),
  bullet('새 색상 선택 후 적용 → 기존 뷰의 색상이 업데이트됨'),
  bullet('제도 뷰도 새 색상으로 재생성됨'),

  heading(2, '6.2 뷰 관리'),
  new Table({
    columnWidths: [3000, 6000],
    rows: [
      new TableRow({ children: [hCellW('동작', { width: 3000 }), hCellW('결과', { width: 6000 })] }),
      new TableRow({ children: [cell('최초 실행', { bold: true, width: 3000 }), cell('현재 3D 뷰를 복제하여 새 뷰 생성 + 제도 뷰 생성', { width: 6000 })] }),
      new TableRow({ children: [cell('동일 자재 재실행', { bold: true, width: 3000 }), cell('기존 3D 뷰 재사용 (색상 초기화 후 재적용) + 제도 뷰 재생성', { width: 6000 })] }),
      new TableRow({ children: [cell('다른 자재 실행', { bold: true, width: 3000 }), cell('별도의 3D 뷰 생성 + 별도 제도 뷰 생성', { width: 6000 })] }),
      new TableRow({ children: [cell('뷰 삭제', { bold: true, width: 3000 }), cell('Revit 프로젝트 브라우저에서 수동 삭제', { width: 6000 })] }),
    ]
  }),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 7. 기술 사양
// ============================================================
body.push(
  heading(1, '7. 기술 사양'),

  heading(2, '7.1 시스템 아키텍처'),
  p('기능의 전체 데이터 흐름은 다음과 같습니다:'),
  spacer(50),
  p('① 웹앱 (단가비교표) — 가시성 버튼 클릭, 벽체 검색, 색상 선택'),
  p('② Socket.IO — 웹앱 → Node.js 서버로 명령 전송'),
  p('③ WebSocket — Node.js 서버 → Revit C# 애드인으로 전달'),
  p('④ Revit API — 3D 뷰 복제, 색상 오버라이드 적용, 제도 뷰 생성'),

  heading(2, '7.2 주요 함수'),
  new Table({
    columnWidths: [3500, 2000, 3500],
    rows: [
      new TableRow({ children: [hCellW('함수명', { width: 3500 }), hCellW('위치', { width: 2000 }), hCellW('역할', { width: 3500 })] }),
      new TableRow({ children: [cell('handleViewMaterialWalls()', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('버튼 클릭 핸들러, 연결 확인 및 벽체 검색 호출', { width: 3500 })] }),
      new TableRow({ children: [cell('findWallsByMaterial()', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('자재 기반 벽체 검색 (정확/폴백 매칭)', { width: 3500 })] }),
      new TableRow({ children: [cell('showColorPickerModal()', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('색상 선택 UI 표시 및 명령 전송', { width: 3500 })] }),
      new TableRow({ children: [cell('sendRevitCommand()', { width: 3500 }), cell('웹앱', { width: 2000, align: AlignmentType.CENTER }), cell('WebSocket을 통한 Revit 명령 전송', { width: 3500 })] }),
      new TableRow({ children: [cell('DuplicateViewWithColor()', { width: 3500 }), cell('Revit 애드인', { width: 2000, align: AlignmentType.CENTER }), cell('3D 뷰 복제 및 색상 오버라이드 적용', { width: 3500 })] }),
      new TableRow({ children: [cell('CreateMaterialColorLegend()', { width: 3500 }), cell('Revit 애드인', { width: 2000, align: AlignmentType.CENTER }), cell('제도 뷰(색상표) 자동 생성', { width: 3500 })] }),
      new TableRow({ children: [cell('GetOrCreateFilledRegionType()', { width: 3500 }), cell('Revit 애드인', { width: 2000, align: AlignmentType.CENTER }), cell('색상별 FilledRegionType 생성/재사용', { width: 3500 })] }),
    ]
  }),

  heading(2, '7.3 오류 처리'),
  new Table({
    columnWidths: [4000, 5000],
    rows: [
      new TableRow({ children: [hCellW('상황', { width: 4000 }), hCellW('처리', { width: 5000 })] }),
      new TableRow({ children: [cell('Revit 미연결', { width: 4000 }), cell('알림: "Revit이 연결되어 있지 않습니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('WebSocket 미연결', { width: 4000 }), cell('알림: "서버에 연결되어 있지 않습니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('매칭 벽체 없음', { width: 4000 }), cell('알림: "해당 자재가 포함된 벽체가 없습니다"', { width: 5000 })] }),
      new TableRow({ children: [cell('활성 뷰가 3D가 아님', { width: 4000 }), cell('Revit 측 알림: "3D 뷰를 활성화한 후 다시 시도하세요"', { width: 5000 })] }),
      new TableRow({ children: [cell('3D 뷰 복제 실패', { width: 4000 }), cell('Revit 측 오류 메시지 + 트랜잭션 롤백', { width: 5000 })] }),
      new TableRow({ children: [cell('제도 뷰 생성 실패', { width: 4000 }), cell('상태바에 오류 메시지 표시 (3D 뷰는 정상 유지)', { width: 5000 })] }),
    ]
  }),

  new Paragraph({ children: [new PageBreak()] })
);

// ============================================================
// 8. 제약 사항 및 참고
// ============================================================
body.push(
  heading(1, '8. 제약 사항 및 참고'),

  heading(2, '8.1 제약 사항'),
  bullet('최초 실행 시 Revit에서 3D 뷰가 활성화되어 있어야 합니다 (이후에는 기존 뷰 재사용 가능)'),
  bullet('Revit에 동기화된 벽체만 검색 가능합니다 (ElementId가 있어야 함)'),
  bullet('색상 오버라이드는 뷰 단위로 적용되므로, 다른 뷰에는 영향을 주지 않습니다'),
  bullet('제도 뷰(색상표)는 자재별로 개별 생성됩니다 (통합 범례는 시트에서 수동 배치)'),
  bullet('WebSocket 연결이 끊어진 상태에서는 기능을 사용할 수 없습니다'),

  heading(2, '8.2 참고 사항'),
  bullet('생성된 3D 뷰는 Revit 프로젝트 브라우저의 "3D 뷰" 항목에 표시됩니다'),
  bullet('생성된 제도 뷰는 "제도 뷰(Drafting Views)" 항목에 표시됩니다'),
  bullet('FilledRegionType은 "QTO_Color_R_G_B" 이름으로 프로젝트에 저장됩니다'),
  bullet('색상 변경 시 기존 뷰가 업데이트되므로 뷰가 중복 생성되지 않습니다'),
  bullet('본 기능은 일위대가 방식과 엑셀 방식 모두 동일하게 동작합니다'),
);

// ===== 본문 섹션 =====
const bodySection = {
  properties: {
    page: {
      margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
    }
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: 'Kiyeno — 품목별 Revit 가시성 활성화 기능 설명서', font: FONT, size: 16, color: COLOR_GRAY, italics: true })]
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

Packer.toBuffer(doc).then(buffer => {
  const outPath = __dirname + '/품목별_Revit_가시성_활성화_기능설명서.docx';
  fs.writeFileSync(outPath, buffer);
  console.log('✅ 문서 생성 완료:', outPath);
}).catch(err => {
  console.error('❌ 문서 생성 실패:', err);
});
