/**
 * 엑셀 벽체타입 관리 모달 모듈
 * - 엑셀 일위대가 기반 벽체타입 생성/편집/삭제
 * - 12개 기본 레이어 + 동적 추가 컬럼
 * - 레이어 셀 클릭 → importedUnitPrices 선택
 * - 자재비/노무비/두께 자동 합산
 */

(function () {
  'use strict';

  // ========================================
  // 상태 변수
  // ========================================
  let currentModal = null;
  let allWallTypes = [];
  let allUnitPrices = [];     // importedUnitPrices 캐시 (레이어 선택용)
  let unitPriceMap = {};      // id → unitPrice 빠른 조회
  let selectedWallTypes = new Set();  // 체크된 벽체타입 ID

  // 기본 12개 레이어 컬럼 정의
  const LAYER_COLUMNS = [
    { field: 'layer3_1', label: 'Layer3', group: '좌측마감' },
    { field: 'layer2_1', label: 'Layer2', group: '좌측마감' },
    { field: 'layer1_1', label: 'Layer1', group: '좌측마감' },
    { field: 'column1',  label: '구조체', group: '중앙' },
    { field: 'infill',   label: '단열재', group: '중앙' },
    { field: 'layer1_2', label: 'Layer1', group: '우측마감' },
    { field: 'layer2_2', label: 'Layer2', group: '우측마감' },
    { field: 'layer3_2', label: 'Layer3', group: '우측마감' },
    { field: 'column2',  label: '옵션1',  group: '옵션' },
    { field: 'channel',  label: '옵션2',  group: '옵션' },
    { field: 'runner',   label: '옵션3',  group: '옵션' },
    { field: 'steelPlate', label: '옵션4', group: '옵션' }
  ];

  // 컬럼 추가 가능 위치 정의
  const INSERT_POSITIONS = [
    { afterField: 'layer1_1',   label: '좌측마감 뒤' },
    { afterField: 'column1',    label: '구조체 뒤' },
    { afterField: 'infill',     label: '단열재 뒤' },
    { afterField: 'layer3_2',   label: '우측마감 뒤' },
    { afterField: 'steelPlate', label: '옵션 뒤 (맨 끝)' }
  ];

  // ========================================
  // 유틸리티 함수
  // ========================================

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatNumber(val) {
    const n = Number(val);
    if (isNaN(n) || n === 0) return '';
    return n.toLocaleString('ko-KR');
  }

  /**
   * unitPriceId → 표시 텍스트 생성
   */
  function getUnitPriceDisplayText(unitPriceId) {
    if (!unitPriceId) return '';
    const up = unitPriceMap[unitPriceId];
    if (!up) return '(삭제됨)';
    return `${up.item || ''} ${up.spec || ''}`.trim();
  }

  /**
   * unitPriceId → 두께 반환
   */
  function getUnitPriceThickness(unitPriceId) {
    if (!unitPriceId) return 0;
    const up = unitPriceMap[unitPriceId];
    return up ? (up.thickness || 0) : 0;
  }

  // ========================================
  // 벽체타입 합산 계산 (로컬 캐시 사용)
  // ========================================

  function calculateTotalsFromCache(wallType) {
    let totalThickness = 0;
    let totalMaterialPrice = 0;
    let totalLaborPrice = 0;

    // 기본 12개 레이어
    for (const col of LAYER_COLUMNS) {
      const id = wallType[col.field];
      if (id && unitPriceMap[id]) {
        const up = unitPriceMap[id];
        totalThickness += (up.thickness || 0);
        totalMaterialPrice += (up.materialPrice || 0);
        totalLaborPrice += (up.laborPrice || 0);
      }
    }

    // 동적 추가 레이어
    if (Array.isArray(wallType.extraLayers)) {
      for (const extra of wallType.extraLayers) {
        if (extra.unitPriceId && unitPriceMap[extra.unitPriceId]) {
          const up = unitPriceMap[extra.unitPriceId];
          totalThickness += (up.thickness || 0);
          totalMaterialPrice += (up.materialPrice || 0);
          totalLaborPrice += (up.laborPrice || 0);
        }
      }
    }

    return {
      thickness: totalThickness,
      totalMaterialPrice,
      totalLaborPrice,
      totalPrice: totalMaterialPrice + totalLaborPrice
    };
  }

  // ========================================
  // 메인 모달 열기
  // ========================================

  async function openExcelWallTypeModal() {
    try {
      await ExcelUnitPriceImporter.initDB();

      // 데이터 로드
      allWallTypes = await ExcelUnitPriceImporter.getAllExcelWallTypes();
      allWallTypes.sort((a, b) => (a.sortOrder ?? 99999) - (b.sortOrder ?? 99999));
      allUnitPrices = await ExcelUnitPriceImporter.getAllImportedUnitPrices();

      // unitPriceMap 생성
      unitPriceMap = {};
      for (const up of allUnitPrices) {
        unitPriceMap[up.id] = up;
      }

      selectedWallTypes.clear();

      const modalHTML = buildModalHTML();

      currentModal = createSubModal('', modalHTML, [], {
        disableBackgroundClick: true,
        disableEscapeKey: true,
        width: '95vw'
      });

      bindModalEvents();
      renderTableBody();
      updateStatusBar();

    } catch (error) {
      console.error('❌ 엑셀 벽체타입 모달 열기 실패:', error);
      if (typeof showToast === 'function') {
        showToast('엑셀 벽체타입 관리를 열 수 없습니다: ' + error.message, 'error');
      }
    }
  }

  // ========================================
  // 모달 HTML 생성
  // ========================================

  function buildModalHTML() {
    return `
      <div style="display: flex; flex-direction: column; height: 80vh; padding: 0;">
        <!-- 모달 헤더 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #334155; flex-shrink: 0;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: white;">
            <i class="fas fa-th-list"></i> 엑셀 벽체타입 관리
          </h3>
          <button id="btnCloseWallTypeModal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; line-height: 1;"
                  onmouseover="this.style.color='white'; this.style.background='#475569'"
                  onmouseout="this.style.color='#94a3b8'; this.style.background='none'"
                  title="닫기">&times;</button>
        </div>

        <!-- 상단 툴바 -->
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; flex-wrap: wrap;">
          <button id="btnAddWallType" style="padding: 5px 12px; font-size: 12px; border: none; background: #475569; color: white; border-radius: 4px; cursor: pointer; white-space: nowrap;"
                  onmouseover="this.style.background='#334155'"
                  onmouseout="this.style.background='#475569'">
            <i class="fas fa-plus"></i> 새 벽체타입
          </button>
          <button id="btnAddExtraColumn" style="padding: 5px 12px; font-size: 12px; border: none; background: #475569; color: white; border-radius: 4px; cursor: pointer; white-space: nowrap;"
                  onmouseover="this.style.background='#334155'"
                  onmouseout="this.style.background='#475569'">
            <i class="fas fa-columns"></i> 컬럼 추가
          </button>

          <div style="border-left: 1px solid #d1d5db; height: 20px;"></div>

          <button id="btnDeleteSelected" style="padding: 5px 12px; font-size: 12px; border: none; background: #64748b; color: white; border-radius: 4px; cursor: pointer; white-space: nowrap;"
                  onmouseover="this.style.background='#475569'"
                  onmouseout="this.style.background='#64748b'">
            <i class="fas fa-trash-alt"></i> 선택 삭제
          </button>

          <div style="border-left: 1px solid #d1d5db; height: 20px;"></div>

          <button id="btnExportWallTypes" style="padding: 5px 12px; font-size: 12px; border: none; background: #475569; color: white; border-radius: 4px; cursor: pointer; white-space: nowrap;"
                  onmouseover="this.style.background='#334155'"
                  onmouseout="this.style.background='#475569'">
            <i class="fas fa-file-download"></i> 엑셀 내보내기
          </button>
          <button id="btnImportWallTypes" style="padding: 5px 12px; font-size: 12px; border: none; background: #475569; color: white; border-radius: 4px; cursor: pointer; white-space: nowrap;"
                  onmouseover="this.style.background='#334155'"
                  onmouseout="this.style.background='#475569'">
            <i class="fas fa-file-upload"></i> 엑셀 불러오기
          </button>

          <div style="border-left: 1px solid #d1d5db; height: 20px;"></div>

          <button id="btnCreateRevitWallTypes" style="padding: 5px 12px; font-size: 12px; border: none; background: #475569; color: white; border-radius: 4px; cursor: pointer; white-space: nowrap;"
                  onmouseover="this.style.background='#334155'"
                  onmouseout="this.style.background='#475569'">
            <i class="fas fa-cubes"></i> 벽체타입 생성 (Revit)
          </button>
          <div style="flex: 1;"></div>
          <span style="font-size: 11px; color: #94a3b8;">
            좌클릭: 레이어 선택 &nbsp;|&nbsp; 우클릭: 레이어 해제
          </span>
        </div>

        <!-- 테이블 영역 -->
        <div style="flex: 1; overflow: auto; position: relative;">
          <table id="wallTypeTable" style="width: max-content; min-width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead id="wallTypeTableHead" style="position: sticky; top: 0; z-index: 10;">
              ${buildTableHeader()}
            </thead>
            <tbody id="wallTypeTableBody">
            </tbody>
          </table>
        </div>

        <!-- 상태 표시줄 -->
        <div id="wallTypeStatusBar" style="padding: 6px 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; flex-shrink: 0;">
          총 0개 벽체타입
        </div>
      </div>
    `;
  }

  // ========================================
  // 테이블 헤더 생성
  // ========================================

  function buildTableHeader() {
    const extrasMap = getExtrasGroupedByPosition();

    let mainRow = '';
    let subRow = '';

    // 체크박스
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 30px; min-width: 30px;">
      <input type="checkbox" id="selectAllWallTypes" title="전체 선택">
    </th>`;

    // No
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 32px; min-width: 32px;">No</th>`;

    // WallType 이름
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 120px; min-width: 100px;">WallType</th>`;

    // 두께(mm) — WallType 다음에 위치
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 65px; min-width: 55px;">두께<br>(mm)</th>`;

    // 좌측마감 (Layer3, Layer2, Layer1 = 3개)
    mainRow += `<th colspan="3" style="${thStyle()}; background: #cbd5e1;">좌측마감</th>`;
    subRow += `<th style="${thSubStyle()}; background: #cbd5e1;">Layer3</th>`;
    subRow += `<th style="${thSubStyle()}; background: #cbd5e1;">Layer2</th>`;
    subRow += `<th style="${thSubStyle()}; background: #cbd5e1;">Layer1</th>`;

    // 좌측마감 뒤 추가 컬럼
    mainRow += buildExtraHeaderCells(extrasMap, 'layer1_1');

    // 구조체
    mainRow += `<th rowspan="2" style="${thStyle()}; background: #d1d5db;">구조체</th>`;

    // 구조체 뒤 추가 컬럼
    mainRow += buildExtraHeaderCells(extrasMap, 'column1');

    // 단열재
    mainRow += `<th rowspan="2" style="${thStyle()}; background: #d1d5db;">단열재</th>`;

    // 단열재 뒤 추가 컬럼
    mainRow += buildExtraHeaderCells(extrasMap, 'infill');

    // 우측마감 (Layer1, Layer2, Layer3 = 3개)
    mainRow += `<th colspan="3" style="${thStyle()}; background: #cbd5e1;">우측마감</th>`;
    subRow += `<th style="${thSubStyle()}; background: #cbd5e1;">Layer1</th>`;
    subRow += `<th style="${thSubStyle()}; background: #cbd5e1;">Layer2</th>`;
    subRow += `<th style="${thSubStyle()}; background: #cbd5e1;">Layer3</th>`;

    // 우측마감 뒤 추가 컬럼
    mainRow += buildExtraHeaderCells(extrasMap, 'layer3_2');

    // 옵션1~4
    mainRow += `<th colspan="4" style="${thStyle()}; background: #e5e7eb;">옵션</th>`;
    subRow += `<th style="${thSubStyle()}; background: #e5e7eb;">옵션1</th>`;
    subRow += `<th style="${thSubStyle()}; background: #e5e7eb;">옵션2</th>`;
    subRow += `<th style="${thSubStyle()}; background: #e5e7eb;">옵션3</th>`;
    subRow += `<th style="${thSubStyle()}; background: #e5e7eb;">옵션4</th>`;

    // 옵션 뒤 추가 컬럼 (맨 끝)
    mainRow += buildExtraHeaderCells(extrasMap, 'steelPlate');

    // 자재비
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 75px; min-width: 65px;">자재비</th>`;

    // 노무비
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 75px; min-width: 65px;">노무비</th>`;

    // 합계
    mainRow += `<th rowspan="2" style="${thStyle()}; width: 80px; min-width: 70px;">합계</th>`;

    return `
      <tr class="header-main-row">${mainRow}</tr>
      <tr class="header-sub-row">${subRow}</tr>
    `;
  }

  function thStyle() {
    return 'padding: 6px 4px; text-align: center; font-size: 11px; font-weight: 600; color: #334155; background: #e2e8f0; border: 1px solid #94a3b8; white-space: nowrap;';
  }

  function thSubStyle() {
    return 'padding: 4px 3px; text-align: center; font-size: 10px; font-weight: 500; color: #475569; border: 1px solid #94a3b8; white-space: nowrap;';
  }

  function getMaxExtraLayers() {
    let max = 0;
    for (const wt of allWallTypes) {
      if (Array.isArray(wt.extraLayers) && wt.extraLayers.length > max) {
        max = wt.extraLayers.length;
      }
    }
    return max;
  }

  /**
   * extraLayers를 insertAfter 위치별로 그룹핑
   */
  function getExtrasGroupedByPosition() {
    const map = {};
    const maxExtra = getMaxExtraLayers();

    for (let i = 0; i < maxExtra; i++) {
      let insertAfter = null;
      let label = null;
      for (const wt of allWallTypes) {
        if (Array.isArray(wt.extraLayers) && wt.extraLayers[i]) {
          if (!insertAfter && wt.extraLayers[i].insertAfter) {
            insertAfter = wt.extraLayers[i].insertAfter;
          }
          if (!label && wt.extraLayers[i].label) {
            label = wt.extraLayers[i].label;
          }
          if (insertAfter && label) break;
        }
      }
      if (!insertAfter) insertAfter = 'steelPlate'; // 하위 호환
      if (!label) label = `추가${i + 1}`;

      if (!map[insertAfter]) map[insertAfter] = [];
      map[insertAfter].push({ extraIndex: i, label });
    }

    return map;
  }

  /**
   * 렌더링 순서대로 정렬된 컬럼 목록 반환
   */
  function getOrderedColumnList() {
    const extrasMap = getExtrasGroupedByPosition();
    const result = [];

    for (const col of LAYER_COLUMNS) {
      result.push({ type: 'fixed', field: col.field, label: col.label, group: col.group });
      if (extrasMap[col.field]) {
        for (const extra of extrasMap[col.field]) {
          result.push({ type: 'extra', extraIndex: extra.extraIndex, label: extra.label });
        }
      }
    }

    return result;
  }

  /**
   * 추가 컬럼 헤더 셀 HTML 생성
   */
  function buildExtraHeaderCells(extrasMap, afterField) {
    let html = '';
    if (extrasMap[afterField]) {
      for (const extra of extrasMap[afterField]) {
        html += `<th rowspan="2" style="${thStyle()}; background: #d4d4d8; min-width: 90px;">
          ${escapeHtml(extra.label)}
          <span class="extra-col-delete" data-extra-index="${extra.extraIndex}" style="color: #94a3b8; cursor: pointer; margin-left: 4px; font-weight: 700;" title="컬럼 삭제">&times;</span>
        </th>`;
      }
    }
    return html;
  }

  /**
   * 테이블 헤더 + 바디 전체 재렌더
   */
  function rebuildTable() {
    const thead = document.getElementById('wallTypeTableHead');
    if (thead) {
      thead.innerHTML = buildTableHeader();
      // 이벤트 리스너는 bindModalEvents()에서 thead에 한 번만 등록됨
      // innerHTML 교체해도 thead 자체의 이벤트 위임은 유지됨
    }
    renderTableBody();
  }

  // ========================================
  // 테이블 바디 렌더링
  // ========================================

  function renderTableBody() {
    const tbody = document.getElementById('wallTypeTableBody');
    if (!tbody) return;

    const orderedColumns = getOrderedColumnList();

    if (allWallTypes.length === 0) {
      const totalCols = 3 + orderedColumns.length + 4; // 체크+No+Name + 레이어(기본+추가) + 두께+자재비+노무비+합계
      tbody.innerHTML = `<tr><td colspan="${totalCols}" style="padding: 40px; text-align: center; color: #94a3b8; font-size: 13px;">
        등록된 벽체타입이 없습니다. [새 벽체타입] 버튼을 눌러 추가하세요.
      </td></tr>`;
      return;
    }

    let html = '';

    allWallTypes.forEach((wt, index) => {
      const totals = calculateTotalsFromCache(wt);
      const isChecked = selectedWallTypes.has(wt.id);

      html += `<tr data-wt-id="${escapeHtml(wt.id)}" draggable="true">`;

      // 체크박스
      html += `<td style="padding: 4px; text-align: center; border: 1px solid #cbd5e1;">
        <input type="checkbox" class="wt-checkbox" data-id="${escapeHtml(wt.id)}" ${isChecked ? 'checked' : ''}>
      </td>`;

      // No (드래그 핸들)
      html += `<td style="padding: 4px; text-align: center; border: 1px solid #cbd5e1; color: #94a3b8; font-size: 11px; cursor: grab;" title="드래그하여 순서 변경">${index + 1}</td>`;

      // WallType 이름 (인라인 편집, 중앙정렬)
      html += `<td class="wt-name-cell" data-id="${escapeHtml(wt.id)}" style="padding: 4px 6px; text-align: center; border: 1px solid #cbd5e1; cursor: text; font-weight: 600; color: #1e293b; min-width: 100px;">
        ${escapeHtml(wt.name || '(이름 없음)')}
      </td>`;

      // 두께 (WallType 다음)
      html += `<td style="padding: 4px; text-align: center; border: 1px solid #cbd5e1; font-size: 11px; color: #475569;">${totals.thickness || ''}</td>`;

      // 순서대로 레이어 셀 렌더링 (기본 + 추가 인터리빙)
      for (const col of orderedColumns) {
        if (col.type === 'fixed') {
          const unitPriceId = wt[col.field] || '';
          const displayText = getUnitPriceDisplayText(unitPriceId);
          const bgColor = unitPriceId ? '#f1f5f9' : '#fff';
          const textColor = unitPriceId ? '#1e293b' : '#cbd5e1';
          const text = unitPriceId ? escapeHtml(displayText) : '클릭';

          html += `<td class="layer-cell" data-id="${escapeHtml(wt.id)}" data-field="${col.field}" style="padding: 3px 4px; text-align: center; border: 1px solid #cbd5e1; cursor: pointer; font-size: 11px; min-width: 90px; background: ${bgColor}; color: ${textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;" title="${unitPriceId ? escapeHtml(displayText) : '클릭하여 선택 / 우클릭 해제'}">
            ${text}
          </td>`;
        } else {
          // 추가 레이어 (위치 기반)
          const extras = Array.isArray(wt.extraLayers) ? wt.extraLayers : [];
          const extraItem = extras[col.extraIndex] || {};
          const unitPriceId = extraItem.unitPriceId || '';
          const displayText = getUnitPriceDisplayText(unitPriceId);
          const bgColor = unitPriceId ? '#f1f5f9' : '#fff';
          const textColor = unitPriceId ? '#1e293b' : '#cbd5e1';
          const text = unitPriceId ? escapeHtml(displayText) : '클릭';

          html += `<td class="layer-cell extra-layer-cell" data-id="${escapeHtml(wt.id)}" data-extra-index="${col.extraIndex}" style="padding: 3px 4px; text-align: center; border: 1px solid #cbd5e1; cursor: pointer; font-size: 11px; min-width: 90px; background: ${bgColor}; color: ${textColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;" title="${unitPriceId ? escapeHtml(displayText) : '클릭하여 선택 / 우클릭 해제'}">
            ${text}
          </td>`;
        }
      }

      // 자재비
      html += `<td style="padding: 4px; text-align: right; border: 1px solid #cbd5e1; font-size: 11px; color: #334155;">${formatNumber(totals.totalMaterialPrice)}</td>`;

      // 노무비
      html += `<td style="padding: 4px; text-align: right; border: 1px solid #cbd5e1; font-size: 11px; color: #334155;">${formatNumber(totals.totalLaborPrice)}</td>`;

      // 합계
      html += `<td style="padding: 4px; text-align: right; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 600; color: #1e293b;">${formatNumber(totals.totalPrice)}</td>`;

      html += `</tr>`;
    });

    tbody.innerHTML = html;

    // 드래그 드롭 이벤트 바인딩
    let dragWtId = null;
    tbody.querySelectorAll('tr[data-wt-id]').forEach(tr => {
      tr.addEventListener('dragstart', (e) => {
        dragWtId = tr.dataset.wtId;
        e.dataTransfer.effectAllowed = 'move';
        tr.style.opacity = '0.4';
      });
      tr.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        tr.style.borderTop = '2px solid #3b82f6';
      });
      tr.addEventListener('dragleave', () => {
        tr.style.borderTop = '';
      });
      tr.addEventListener('drop', async (e) => {
        e.preventDefault();
        tr.style.borderTop = '';
        const targetId = tr.dataset.wtId;
        if (!dragWtId || dragWtId === targetId) return;

        const fromIdx = allWallTypes.findIndex(w => w.id === dragWtId);
        const toIdx = allWallTypes.findIndex(w => w.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = allWallTypes.splice(fromIdx, 1);
        allWallTypes.splice(toIdx, 0, moved);

        // sortOrder 할당 + DB 저장
        for (let i = 0; i < allWallTypes.length; i++) {
          allWallTypes[i].sortOrder = i;
          await ExcelUnitPriceImporter.updateExcelWallType(allWallTypes[i].id, { sortOrder: i });
        }
        renderTableBody();
        dragWtId = null;
      });
      tr.addEventListener('dragend', () => {
        tr.style.opacity = '';
        tr.style.borderTop = '';
        dragWtId = null;
        tbody.querySelectorAll('tr').forEach(r => { r.style.borderTop = ''; });
      });
    });
  }

  // ========================================
  // 이벤트 바인딩
  // ========================================

  function bindModalEvents() {
    // X 닫기 버튼
    const btnClose = document.getElementById('btnCloseWallTypeModal');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (currentModal) {
          closeSubModal(currentModal);
          currentModal = null;
        }
      });
    }

    // 새 벽체타입 추가
    const btnAdd = document.getElementById('btnAddWallType');
    if (btnAdd) {
      btnAdd.addEventListener('click', handleAddWallType);
    }

    // 컬럼 추가
    const btnAddCol = document.getElementById('btnAddExtraColumn');
    if (btnAddCol) {
      btnAddCol.addEventListener('click', handleAddExtraColumn);
    }

    // 선택 삭제
    const btnDel = document.getElementById('btnDeleteSelected');
    if (btnDel) {
      btnDel.addEventListener('click', handleDeleteSelected);
    }

    // 엑셀 내보내기
    const btnExport = document.getElementById('btnExportWallTypes');
    if (btnExport) {
      btnExport.addEventListener('click', handleExportWallTypes);
    }

    // 엑셀 불러오기
    const btnImport = document.getElementById('btnImportWallTypes');
    if (btnImport) {
      btnImport.addEventListener('click', handleImportWallTypes);
    }

    // Revit 벽체타입 생성
    const btnRevit = document.getElementById('btnCreateRevitWallTypes');
    if (btnRevit) {
      btnRevit.addEventListener('click', handleCreateRevitWallTypes);
    }

    // 전체 선택 체크박스
    const selectAll = document.getElementById('selectAllWallTypes');
    if (selectAll) {
      selectAll.addEventListener('change', () => {
        if (selectAll.checked) {
          allWallTypes.forEach(wt => selectedWallTypes.add(wt.id));
        } else {
          selectedWallTypes.clear();
        }
        renderTableBody();
        updateStatusBar();
      });
    }

    // 테이블 이벤트 위임
    const tbody = document.getElementById('wallTypeTableBody');
    if (tbody) {
      // 체크박스 변경
      tbody.addEventListener('change', (e) => {
        if (e.target.classList.contains('wt-checkbox')) {
          const id = e.target.dataset.id;
          if (e.target.checked) {
            selectedWallTypes.add(id);
          } else {
            selectedWallTypes.delete(id);
          }
          // 전체 선택 체크박스 상태 동기화
          const selectAll = document.getElementById('selectAllWallTypes');
          if (selectAll) {
            selectAll.checked = selectedWallTypes.size === allWallTypes.length && allWallTypes.length > 0;
          }
          updateStatusBar();
        }
      });

      // 레이어 셀 좌클릭 → 선택 모달
      tbody.addEventListener('click', (e) => {
        const layerCell = e.target.closest('.layer-cell');
        if (layerCell) {
          const wtId = layerCell.dataset.id;
          const field = layerCell.dataset.field;
          const extraIndex = layerCell.dataset.extraIndex;
          if (field) {
            openLayerSelectionModal(wtId, field, null);
          } else if (extraIndex !== undefined) {
            openLayerSelectionModal(wtId, null, parseInt(extraIndex));
          }
          return;
        }

        // WallType 이름 셀 클릭 → 인라인 편집
        const nameCell = e.target.closest('.wt-name-cell');
        if (nameCell) {
          startNameEdit(nameCell);
          return;
        }
      });

      // 레이어 셀 우클릭 → 해제
      tbody.addEventListener('contextmenu', (e) => {
        const layerCell = e.target.closest('.layer-cell');
        if (layerCell) {
          e.preventDefault();
          const wtId = layerCell.dataset.id;
          const field = layerCell.dataset.field;
          const extraIndex = layerCell.dataset.extraIndex;
          clearLayer(wtId, field, extraIndex !== undefined ? parseInt(extraIndex) : null);
        }
      });
    }

    // 테이블 헤더 이벤트 위임 (추가 컬럼 삭제)
    const thead = document.getElementById('wallTypeTableHead');
    if (thead) {
      thead.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.extra-col-delete');
        if (delBtn) {
          const idx = parseInt(delBtn.dataset.extraIndex);
          handleDeleteExtraColumn(idx);
        }
      });
    }
  }

  // ========================================
  // WallType 이름 인라인 편집
  // ========================================

  function startNameEdit(cell) {
    if (cell.querySelector('input')) return; // 이미 편집 중

    const wtId = cell.dataset.id;
    const wt = allWallTypes.find(w => w.id === wtId);
    if (!wt) return;

    const currentName = wt.name || '';
    const cellRect = cell.getBoundingClientRect();
    cell.style.width = cellRect.width + 'px';
    cell.style.height = cellRect.height + 'px';
    cell.style.padding = '0';
    cell.style.overflow = 'hidden';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.style.cssText = 'width: 100%; height: 100%; border: 2px solid #94a3b8; outline: none; padding: 4px 6px; font-size: 12px; font-weight: 600; background: #fffff0; box-sizing: border-box; border-radius: 0;';

    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    const finishEdit = async () => {
      const newName = input.value.trim();
      cell.style.padding = '4px 6px';
      cell.style.width = '';
      cell.style.height = '';
      cell.style.overflow = '';

      if (newName && newName !== currentName) {
        try {
          await ExcelUnitPriceImporter.updateExcelWallType(wtId, { name: newName });
          wt.name = newName;
          cell.textContent = newName;
          if (typeof showToast === 'function') {
            showToast(`벽체타입명 변경: ${newName}`, 'success');
          }
        } catch (err) {
          console.error('❌ 이름 수정 실패:', err);
          cell.textContent = currentName;
          if (typeof showToast === 'function') {
            showToast('이름 수정 실패: ' + err.message, 'error');
          }
        }
      } else {
        cell.textContent = currentName || '(이름 없음)';
      }
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cell.style.padding = '4px 6px';
        cell.style.width = '';
        cell.style.height = '';
        cell.style.overflow = '';
        cell.textContent = currentName || '(이름 없음)';
      }
    });
  }

  // ========================================
  // 레이어 선택 모달
  // ========================================

  function openLayerSelectionModal(wtId, field, extraIndex) {
    const wt = allWallTypes.find(w => w.id === wtId);
    if (!wt) return;

    // 현재 선택된 unitPriceId
    let currentUnitPriceId = '';
    if (field) {
      currentUnitPriceId = wt[field] || '';
    } else if (extraIndex !== null && Array.isArray(wt.extraLayers) && wt.extraLayers[extraIndex]) {
      currentUnitPriceId = wt.extraLayers[extraIndex].unitPriceId || '';
    }

    // 레이어 라벨
    let layerLabel = '';
    if (field) {
      const col = LAYER_COLUMNS.find(c => c.field === field);
      layerLabel = col ? `${col.group} - ${col.label}` : field;
    } else {
      layerLabel = `추가 ${extraIndex + 1}`;
    }

    const selectionHTML = buildLayerSelectionHTML(layerLabel, currentUnitPriceId);

    const selectionModal = createSubModal('', selectionHTML, [], {
      disableBackgroundClick: true,
      disableEscapeKey: false,
      width: '600px'
    });

    // 이벤트 바인딩
    setTimeout(() => {
      // 닫기 버튼
      const btnCloseSelection = document.getElementById('btnCloseLayerSelection');
      if (btnCloseSelection) {
        btnCloseSelection.addEventListener('click', () => {
          closeSubModal(selectionModal);
        });
      }

      // 검색
      const searchInput = document.getElementById('layerSearchInput');
      if (searchInput) {
        let debounce = null;
        searchInput.addEventListener('input', () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            filterLayerSelectionList(searchInput.value);
          }, 200);
        });
        searchInput.focus();
      }

      // 항목 클릭 → 선택
      const listContainer = document.getElementById('layerSelectionList');
      if (listContainer) {
        listContainer.addEventListener('click', async (e) => {
          const item = e.target.closest('.layer-selection-item');
          if (!item) return;

          const selectedId = item.dataset.unitPriceId;
          if (selectedId === 'CLEAR') {
            await applyLayerSelection(wtId, field, extraIndex, '');
          } else {
            await applyLayerSelection(wtId, field, extraIndex, selectedId);
          }
          closeSubModal(selectionModal);
        });
      }
    }, 100);
  }

  function buildLayerSelectionHTML(layerLabel, currentUnitPriceId) {
    // 부위별 그룹핑
    const grouped = {};
    for (const up of allUnitPrices) {
      const loc = up.location || '(미분류)';
      if (!grouped[loc]) grouped[loc] = [];
      grouped[loc].push(up);
    }

    // 그룹 정렬
    const sortedLocations = Object.keys(grouped).sort((a, b) => {
      if (a === '가설벽') return -1;
      if (b === '가설벽') return 1;
      if (a === '벽') return -1;
      if (b === '벽') return 1;
      return a.localeCompare(b, 'ko');
    });

    let listHTML = '';

    // 선택 해제 항목
    listHTML += `<div class="layer-selection-item" data-unit-price-id="CLEAR" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f1f5f9; color: #ef4444; font-size: 12px;"
                      onmouseover="this.style.background='#fef2f2'"
                      onmouseout="this.style.background='white'">
      <i class="fas fa-times"></i> 선택 해제
    </div>`;

    for (const loc of sortedLocations) {
      // 그룹 헤더
      listHTML += `<div class="layer-group-header" style="padding: 6px 12px; background: #f1f5f9; font-size: 11px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;">
        ${escapeHtml(loc)}
      </div>`;

      // 항목들
      const items = grouped[loc].sort((a, b) => (a.item || '').localeCompare(b.item || '', 'ko'));
      for (const up of items) {
        const isSelected = up.id === currentUnitPriceId;
        const selectedStyle = isSelected ? 'background: #dbeafe; border-left: 3px solid #3b82f6;' : '';
        const selectedIcon = isSelected ? '<i class="fas fa-check" style="color: #3b82f6; margin-right: 4px;"></i>' : '';

        listHTML += `<div class="layer-selection-item" data-unit-price-id="${escapeHtml(up.id)}" data-item="${escapeHtml(up.item || '')}" data-spec="${escapeHtml(up.spec || '')}" data-location="${escapeHtml(up.location || '')}" style="padding: 7px 12px; cursor: pointer; border-bottom: 1px solid #f8fafc; font-size: 12px; display: flex; align-items: center; justify-content: space-between; ${selectedStyle}"
                          onmouseover="this.style.background='${isSelected ? '#dbeafe' : '#f0f9ff'}'"
                          onmouseout="this.style.background='${isSelected ? '#dbeafe' : 'white'}'">
          <span>${selectedIcon}${escapeHtml(up.item || '')} ${escapeHtml(up.spec || '')}</span>
          <span style="color: #64748b; font-size: 10px;">
            자재 ${formatNumber(up.materialPrice)} / 노무 ${formatNumber(up.laborPrice)}
          </span>
        </div>`;
      }
    }

    return `
      <div style="display: flex; flex-direction: column; height: 60vh; padding: 0;">
        <!-- 헤더 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #334155; flex-shrink: 0;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: white;">
            <i class="fas fa-search"></i> 레이어 선택: ${escapeHtml(layerLabel)}
          </h3>
          <button id="btnCloseLayerSelection" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; line-height: 1;"
                  onmouseover="this.style.color='white'; this.style.background='#475569'"
                  onmouseout="this.style.color='#94a3b8'; this.style.background='none'"
                  title="닫기">&times;</button>
        </div>

        <!-- 검색 -->
        <div style="padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
          <input id="layerSearchInput" type="text" placeholder="품명 또는 규격 검색..." style="width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <!-- 항목 목록 -->
        <div id="layerSelectionList" style="flex: 1; overflow-y: auto;">
          ${listHTML}
        </div>

        <!-- 하단 안내 -->
        <div style="padding: 6px 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; flex-shrink: 0;">
          총 ${allUnitPrices.length}개 항목 | ESC로 닫기
        </div>
      </div>
    `;
  }

  function filterLayerSelectionList(query) {
    const listContainer = document.getElementById('layerSelectionList');
    if (!listContainer) return;

    const q = (query || '').toLowerCase().trim();
    const items = listContainer.querySelectorAll('.layer-selection-item');
    const headers = listContainer.querySelectorAll('.layer-group-header');

    // 검색어 없으면 전체 표시
    if (!q) {
      items.forEach(el => el.style.display = '');
      headers.forEach(el => el.style.display = '');
      return;
    }

    // 그룹별 표시 여부 추적
    const visibleLocations = new Set();

    items.forEach(el => {
      const item = (el.dataset.item || '').toLowerCase();
      const spec = (el.dataset.spec || '').toLowerCase();
      const loc = (el.dataset.location || '').toLowerCase();
      const id = el.dataset.unitPriceId;

      if (id === 'CLEAR') {
        el.style.display = '';
        return;
      }

      if (item.includes(q) || spec.includes(q) || loc.includes(q)) {
        el.style.display = '';
        visibleLocations.add(el.dataset.location || '(미분류)');
      } else {
        el.style.display = 'none';
      }
    });

    // 그룹 헤더 표시/숨김
    headers.forEach(el => {
      const headerText = el.textContent.trim();
      el.style.display = visibleLocations.has(headerText) ? '' : 'none';
    });
  }

  // ========================================
  // 레이어 선택 적용
  // ========================================

  async function applyLayerSelection(wtId, field, extraIndex, unitPriceId) {
    const wt = allWallTypes.find(w => w.id === wtId);
    if (!wt) return;

    try {
      const updateData = {};

      if (field) {
        // 기본 12개 레이어
        updateData[field] = unitPriceId;
      } else if (extraIndex !== null) {
        // 동적 추가 레이어
        const extras = Array.isArray(wt.extraLayers) ? [...wt.extraLayers] : [];
        while (extras.length <= extraIndex) {
          extras.push({ unitPriceId: '', label: `추가${extras.length + 1}` });
        }
        extras[extraIndex].unitPriceId = unitPriceId;
        updateData.extraLayers = extras;
      }

      // 합계 재계산을 위해 임시 적용
      const tempWt = { ...wt, ...updateData };
      if (updateData.extraLayers) tempWt.extraLayers = updateData.extraLayers;
      const totals = calculateTotalsFromCache(tempWt);

      updateData.thickness = totals.thickness;
      updateData.totalMaterialPrice = totals.totalMaterialPrice;
      updateData.totalLaborPrice = totals.totalLaborPrice;
      updateData.totalPrice = totals.totalPrice;

      // DB 업데이트
      const updated = await ExcelUnitPriceImporter.updateExcelWallType(wtId, updateData);

      // 로컬 캐시 업데이트
      const idx = allWallTypes.findIndex(w => w.id === wtId);
      if (idx >= 0) {
        allWallTypes[idx] = updated;
      }

      renderTableBody();

    } catch (err) {
      console.error('❌ 레이어 선택 저장 실패:', err);
      if (typeof showToast === 'function') {
        showToast('레이어 저장 실패: ' + err.message, 'error');
      }
    }
  }

  // ========================================
  // 레이어 해제 (우클릭)
  // ========================================

  async function clearLayer(wtId, field, extraIndex) {
    await applyLayerSelection(wtId, field, extraIndex, '');
  }

  // ========================================
  // 새 벽체타입 추가
  // ========================================

  async function handleAddWallType() {
    try {
      // 기본 이름 생성 (W-01, W-02, ...)
      const existingNames = allWallTypes.map(w => w.name);
      let num = 1;
      let newName = '';
      do {
        newName = 'W-' + String(num).padStart(2, '0');
        num++;
      } while (existingNames.includes(newName));

      const newWt = ExcelUnitPriceImporter.createEmptyExcelWallType(newName);

      // extraLayers 맞추기 (기존 벽체타입에 추가 컬럼이 있는 경우, 위치 정보 복사)
      const maxExtra = getMaxExtraLayers();
      if (maxExtra > 0) {
        newWt.extraLayers = [];
        const refWt = allWallTypes.length > 0 ? allWallTypes[0] : null;
        for (let i = 0; i < maxExtra; i++) {
          const refExtra = refWt?.extraLayers?.[i] || {};
          newWt.extraLayers.push({
            unitPriceId: '',
            label: refExtra.label || `추가${i + 1}`,
            insertAfter: refExtra.insertAfter || 'steelPlate'
          });
        }
      }

      await ExcelUnitPriceImporter.saveExcelWallType(newWt);
      allWallTypes.push(newWt);

      renderTableBody();
      updateStatusBar();

      if (typeof showToast === 'function') {
        showToast(`새 벽체타입 추가: ${newName}`, 'success');
      }

      // 추가된 행의 이름 셀 자동 포커스
      setTimeout(() => {
        const nameCell = document.querySelector(`.wt-name-cell[data-id="${newWt.id}"]`);
        if (nameCell) {
          nameCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
          startNameEdit(nameCell);
        }
      }, 100);

    } catch (err) {
      console.error('❌ 벽체타입 추가 실패:', err);
      if (typeof showToast === 'function') {
        showToast('추가 실패: ' + err.message, 'error');
      }
    }
  }

  // ========================================
  // 컬럼 추가 (extraLayers)
  // ========================================

  async function handleAddExtraColumn() {
    // 위치 선택 모달 표시
    const positionHTML = buildPositionSelectionHTML();

    const posModal = createSubModal('', positionHTML, [], {
      disableBackgroundClick: false,
      disableEscapeKey: false,
      width: '360px'
    });

    setTimeout(() => {
      const btnClose = document.getElementById('btnClosePositionModal');
      if (btnClose) {
        btnClose.addEventListener('click', () => closeSubModal(posModal));
      }

      const container = document.getElementById('positionSelectionList');
      if (container) {
        container.addEventListener('click', async (e) => {
          const option = e.target.closest('.position-option');
          if (!option) return;
          const afterField = option.dataset.afterField;
          closeSubModal(posModal);
          await addExtraColumnAt(afterField);
        });
      }
    }, 100);
  }

  function buildPositionSelectionHTML() {
    let listHTML = '';
    for (const pos of INSERT_POSITIONS) {
      listHTML += `<div class="position-option" data-after-field="${pos.afterField}"
        style="padding: 10px 16px; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 13px; display: flex; justify-content: space-between; align-items: center;"
        onmouseover="this.style.background='#f0f9ff'"
        onmouseout="this.style.background='white'">
        <span style="font-weight: 500; color: #1e293b;">${pos.label}</span>
        <i class="fas fa-plus" style="color: #94a3b8; font-size: 11px;"></i>
      </div>`;
    }

    return `
      <div style="display: flex; flex-direction: column; padding: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #334155; flex-shrink: 0;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: white;">
            <i class="fas fa-columns"></i> 컬럼 추가 위치 선택
          </h3>
          <button id="btnClosePositionModal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; line-height: 1;"
                  onmouseover="this.style.color='white'; this.style.background='#475569'"
                  onmouseout="this.style.color='#94a3b8'; this.style.background='none'"
                  title="닫기">&times;</button>
        </div>
        <div id="positionSelectionList">
          ${listHTML}
        </div>
        <div style="padding: 8px 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;">
          추가된 컬럼은 선택한 위치 뒤에 배치됩니다
        </div>
      </div>
    `;
  }

  function getPositionDefaultLabel(insertAfter) {
    const labelMap = {
      'column1': '구조체',
      'infill': '단열재'
    };
    const base = labelMap[insertAfter];
    if (base) {
      // 동일 위치 기존 추가 컬럼 수 확인
      const extrasMap = getExtrasGroupedByPosition();
      const count = (extrasMap[insertAfter] || []).length;
      return `${base}${count + 2}`; // 구조체2, 구조체3, ...
    }
    // 기타 위치
    const posInfo = INSERT_POSITIONS.find(p => p.afterField === insertAfter);
    const extrasMap = getExtrasGroupedByPosition();
    const count = (extrasMap[insertAfter] || []).length;
    const posName = posInfo ? posInfo.label.replace(' (맨 끝)', '').replace(' 뒤', '') : '추가';
    return count > 0 ? `${posName}추가${count + 1}` : `${posName}추가`;
  }

  async function addExtraColumnAt(insertAfter) {
    try {
      const newLabel = getPositionDefaultLabel(insertAfter);

      // 모든 벽체타입에 extraLayers 확장
      for (const wt of allWallTypes) {
        const extras = Array.isArray(wt.extraLayers) ? [...wt.extraLayers] : [];
        extras.push({ unitPriceId: '', label: newLabel, insertAfter: insertAfter });
        wt.extraLayers = extras;
        await ExcelUnitPriceImporter.updateExcelWallType(wt.id, { extraLayers: extras });
      }

      rebuildTable();

      const posLabel = INSERT_POSITIONS.find(p => p.afterField === insertAfter)?.label || '맨 끝';
      if (typeof showToast === 'function') {
        showToast(`컬럼 "${newLabel}" 추가 (${posLabel})`, 'success');
      }
    } catch (err) {
      console.error('❌ 컬럼 추가 실패:', err);
      if (typeof showToast === 'function') {
        showToast('컬럼 추가 실패: ' + err.message, 'error');
      }
    }
  }

  // ========================================
  // 추가 컬럼 삭제
  // ========================================

  async function handleDeleteExtraColumn(extraIndex) {
    // 삭제할 컬럼의 라벨 가져오기
    let colLabel = `추가${extraIndex + 1}`;
    for (const wt of allWallTypes) {
      if (Array.isArray(wt.extraLayers) && wt.extraLayers[extraIndex] && wt.extraLayers[extraIndex].label) {
        colLabel = wt.extraLayers[extraIndex].label;
        break;
      }
    }

    if (!confirm(`"${colLabel}" 컬럼을 삭제하시겠습니까?\n모든 벽체타입에서 해당 컬럼 데이터가 삭제됩니다.`)) return;

    try {
      for (const wt of allWallTypes) {
        const extras = Array.isArray(wt.extraLayers) ? [...wt.extraLayers] : [];
        if (extras.length > extraIndex) {
          extras.splice(extraIndex, 1);
        }
        wt.extraLayers = extras;

        // 합계 재계산
        const totals = calculateTotalsFromCache(wt);
        await ExcelUnitPriceImporter.updateExcelWallType(wt.id, {
          extraLayers: extras,
          thickness: totals.thickness,
          totalMaterialPrice: totals.totalMaterialPrice,
          totalLaborPrice: totals.totalLaborPrice,
          totalPrice: totals.totalPrice
        });
      }

      rebuildTable();

      if (typeof showToast === 'function') {
        showToast(`"${colLabel}" 컬럼 삭제 완료`, 'success');
      }
    } catch (err) {
      console.error('❌ 컬럼 삭제 실패:', err);
      if (typeof showToast === 'function') {
        showToast('컬럼 삭제 실패: ' + err.message, 'error');
      }
    }
  }

  // ========================================
  // 선택 삭제
  // ========================================

  async function handleDeleteSelected() {
    if (selectedWallTypes.size === 0) {
      if (typeof showToast === 'function') {
        showToast('삭제할 벽체타입을 선택해주세요.', 'warning');
      }
      return;
    }

    if (!confirm(`선택된 ${selectedWallTypes.size}개 벽체타입을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      const idsToDelete = [...selectedWallTypes];
      for (const id of idsToDelete) {
        await ExcelUnitPriceImporter.deleteExcelWallType(id);
      }

      allWallTypes = allWallTypes.filter(wt => !selectedWallTypes.has(wt.id));
      selectedWallTypes.clear();

      // 전체 선택 체크박스 해제
      const selectAll = document.getElementById('selectAllWallTypes');
      if (selectAll) selectAll.checked = false;

      renderTableBody();
      updateStatusBar();

      if (typeof showToast === 'function') {
        showToast(`${idsToDelete.length}개 벽체타입 삭제 완료`, 'success');
      }
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      if (typeof showToast === 'function') {
        showToast('삭제 실패: ' + err.message, 'error');
      }
    }
  }

  // ========================================
  // 상태 표시줄 업데이트
  // ========================================

  function updateStatusBar() {
    const bar = document.getElementById('wallTypeStatusBar');
    if (!bar) return;

    const totalCount = allWallTypes.length;
    const unitPriceCount = allUnitPrices.length;
    const selectionCount = selectedWallTypes.size;

    // Revit 연결 상태
    const revitConnected = window.socketService?.revitConnected;
    const revitStatus = revitConnected
      ? '<span style="color:#22c55e">● Revit 연결됨</span>'
      : '<span style="color:#9ca3af">○ Revit 미연결</span>';

    const selectionText = selectionCount > 0 ? `선택: ${selectionCount}개 | ` : '';

    bar.innerHTML = `${revitStatus} | ${selectionText}총 ${totalCount}개 벽체타입 | 사용 가능한 일위대가: ${unitPriceCount}개`;
  }

  // ========================================
  // 엑셀 내보내기 (2시트: 사용자용 + 매핑데이터)
  // ========================================

  /**
   * 시트1 헤더용 컬럼 라벨 생성
   */
  function getColumnHeaderLabel(col) {
    if (col.type === 'fixed') {
      const groupPrefix = {
        '좌측마감': '좌-',
        '우측마감': '우-',
        '옵션': '',
        '중앙': ''
      };
      const prefix = groupPrefix[col.group] || '';
      return prefix + col.label;
    }
    return col.label;
  }

  /**
   * unitPriceId → unitPriceKey 반환
   */
  function getUnitPriceKey(unitPriceId) {
    if (!unitPriceId) return '';
    const up = unitPriceMap[unitPriceId];
    if (!up) return '';
    return up.key || '';
  }

  /**
   * 시트1 데이터 생성 (사용자용 — "품명 규격" 텍스트)
   */
  function buildExportSheet1(orderedColumns) {
    // 헤더
    const headers = ['WallType'];
    for (const col of orderedColumns) {
      headers.push(getColumnHeaderLabel(col));
    }
    headers.push('두께', '자재비', '노무비', '합계');

    // 데이터 행
    const rows = [];
    for (const wt of allWallTypes) {
      const row = [wt.name || ''];
      const totals = calculateTotalsFromCache(wt);

      for (const col of orderedColumns) {
        let unitPriceId = '';
        if (col.type === 'fixed') {
          unitPriceId = wt[col.field] || '';
        } else {
          const extras = Array.isArray(wt.extraLayers) ? wt.extraLayers : [];
          unitPriceId = (extras[col.extraIndex] || {}).unitPriceId || '';
        }
        row.push(getUnitPriceDisplayText(unitPriceId));
      }

      row.push(totals.thickness || 0);
      row.push(totals.totalMaterialPrice || 0);
      row.push(totals.totalLaborPrice || 0);
      row.push(totals.totalPrice || 0);

      rows.push(row);
    }

    return [headers, ...rows];
  }

  /**
   * 시트2 데이터 생성 (매핑용 — 필드명 + unitPriceKey)
   */
  function buildExportSheet2(orderedColumns) {
    // 1행: 컬럼 식별자 (필드명 또는 extra_N)
    const metaRow1 = ['_wallTypeName'];
    for (const col of orderedColumns) {
      if (col.type === 'fixed') {
        metaRow1.push(col.field);
      } else {
        metaRow1.push('extra_' + col.extraIndex);
      }
    }
    metaRow1.push('_thickness', '_materialPrice', '_laborPrice', '_totalPrice');

    // 2행: 추가 컬럼 메타데이터
    const metaRow2 = ['_extraMeta'];
    for (const col of orderedColumns) {
      if (col.type === 'extra') {
        // 추가 컬럼의 label, insertAfter 정보 추출
        let label = col.label;
        let insertAfter = '';
        for (const wt of allWallTypes) {
          const extras = Array.isArray(wt.extraLayers) ? wt.extraLayers : [];
          if (extras[col.extraIndex]) {
            if (!insertAfter && extras[col.extraIndex].insertAfter) {
              insertAfter = extras[col.extraIndex].insertAfter;
            }
            if (extras[col.extraIndex].label) {
              label = extras[col.extraIndex].label;
            }
            if (insertAfter) break;
          }
        }
        metaRow2.push(`label:${label},insertAfter:${insertAfter}`);
      } else {
        metaRow2.push('');
      }
    }
    metaRow2.push('', '', '', '');

    // 3행~: 벽체타입별 데이터 (unitPriceKey 기반)
    const dataRows = [];
    for (const wt of allWallTypes) {
      const row = [wt.name || ''];

      for (const col of orderedColumns) {
        let unitPriceId = '';
        if (col.type === 'fixed') {
          unitPriceId = wt[col.field] || '';
        } else {
          const extras = Array.isArray(wt.extraLayers) ? wt.extraLayers : [];
          unitPriceId = (extras[col.extraIndex] || {}).unitPriceId || '';
        }
        row.push(getUnitPriceKey(unitPriceId));
      }

      // 두께/자재비/노무비/합계 — 빈 셀 (불러오기 시 자동 재계산)
      row.push('', '', '', '');

      dataRows.push(row);
    }

    return [metaRow1, metaRow2, ...dataRows];
  }

  /**
   * 엑셀 내보내기 메인 함수
   */
  async function handleExportWallTypes() {
    try {
      if (allWallTypes.length === 0) {
        if (typeof showToast === 'function') {
          showToast('내보낼 벽체타입이 없습니다.', 'warning');
        }
        return;
      }

      if (typeof XLSX === 'undefined') {
        if (typeof showToast === 'function') {
          showToast('SheetJS(XLSX) 라이브러리를 찾을 수 없습니다.', 'error');
        }
        return;
      }

      const orderedColumns = getOrderedColumnList();

      // 시트1: 사용자용
      const sheet1Data = buildExportSheet1(orderedColumns);
      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

      // 시트1 컬럼 너비
      const colWidths1 = [{ wch: 15 }]; // WallType
      for (let i = 0; i < orderedColumns.length; i++) {
        colWidths1.push({ wch: 16 });
      }
      colWidths1.push({ wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }); // 두께, 자재비, 노무비, 합계
      ws1['!cols'] = colWidths1;

      // 시트2: 매핑데이터
      const sheet2Data = buildExportSheet2(orderedColumns);
      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

      // 시트2 컬럼 너비
      const colWidths2 = [{ wch: 15 }];
      for (let i = 0; i < orderedColumns.length; i++) {
        colWidths2.push({ wch: 20 });
      }
      colWidths2.push({ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 });
      ws2['!cols'] = colWidths2;

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, '벽체타입');
      XLSX.utils.book_append_sheet(wb, ws2, '매핑데이터');

      // 파일명 생성
      const now = new Date();
      const dateStr = now.getFullYear()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0')
        + '_'
        + String(now.getHours()).padStart(2, '0')
        + String(now.getMinutes()).padStart(2, '0')
        + String(now.getSeconds()).padStart(2, '0');
      const fileName = `엑셀벽체타입_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);

      if (typeof showToast === 'function') {
        showToast(`엑셀 내보내기 완료: ${fileName}`, 'success');
      }
    } catch (err) {
      console.error('❌ 엑셀 내보내기 실패:', err);
      if (typeof showToast === 'function') {
        showToast('엑셀 내보내기 실패: ' + err.message, 'error');
      }
    }
  }

  // ========================================
  // 엑셀 불러오기 (2시트 방식)
  // ========================================

  /**
   * key로 importedUnitPrice 매칭 (캐시 우선, DB 폴백)
   */
  async function matchUnitPriceByKey(key) {
    if (!key) return null;

    // 로컬 캐시에서 먼저 검색
    for (const up of allUnitPrices) {
      if (up.key === key) return up;
    }

    // DB에서 검색
    try {
      return await ExcelUnitPriceImporter.getImportedUnitPriceByKey(key);
    } catch (err) {
      console.warn('key 매칭 실패:', key, err);
      return null;
    }
  }

  /**
   * 시트2 파싱 — 메타데이터 + 데이터 행 추출
   */
  function parseImportSheet2(ws) {
    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (data.length < 3) {
      throw new Error('매핑데이터 시트에 최소 3행이 필요합니다 (메타 2행 + 데이터 1행 이상).');
    }

    const metaRow1 = data[0]; // 컬럼 식별자
    const metaRow2 = data[1]; // 추가 컬럼 메타데이터

    // 첫 번째 셀이 _wallTypeName인지 확인
    if (metaRow1[0] !== '_wallTypeName') {
      throw new Error('매핑데이터 시트 형식이 올바르지 않습니다. (첫 셀이 _wallTypeName이어야 합니다)');
    }

    // 컬럼 매핑 파싱
    const columns = [];
    for (let c = 1; c < metaRow1.length; c++) {
      const identifier = String(metaRow1[c] || '').trim();

      // 후미 합계 컬럼 스킵
      if (identifier.startsWith('_')) continue;

      if (identifier.startsWith('extra_')) {
        // 추가 컬럼
        const extraIndex = parseInt(identifier.replace('extra_', ''));
        // 메타데이터 파싱 (label:xxx,insertAfter:yyy)
        const metaStr = String(metaRow2[c] || '');
        const metaParts = {};
        if (metaStr) {
          metaStr.split(',').forEach(part => {
            const [k, v] = part.split(':');
            if (k && v !== undefined) {
              metaParts[k.trim()] = v.trim();
            }
          });
        }

        columns.push({
          colIndex: c,
          type: 'extra',
          extraIndex,
          label: metaParts.label || `추가${extraIndex + 1}`,
          insertAfter: metaParts.insertAfter || 'steelPlate'
        });
      } else {
        // 기본 레이어 컬럼
        columns.push({
          colIndex: c,
          type: 'fixed',
          field: identifier
        });
      }
    }

    // 데이터 행 파싱
    const wallTypeRows = [];
    for (let r = 2; r < data.length; r++) {
      const row = data[r];
      const name = String(row[0] || '').trim();
      if (!name) continue;

      const layers = [];
      for (const col of columns) {
        const cellValue = String(row[col.colIndex] || '').trim();
        layers.push({
          ...col,
          key: cellValue
        });
      }

      wallTypeRows.push({ name, layers });
    }

    // 추가 컬럼 정보 수집
    const extraColumnDefs = columns
      .filter(c => c.type === 'extra')
      .map(c => ({
        extraIndex: c.extraIndex,
        label: c.label,
        insertAfter: c.insertAfter
      }));

    return { columns, wallTypeRows, extraColumnDefs };
  }

  /**
   * 엑셀 불러오기 메인 함수
   */
  async function handleImportWallTypes() {
    try {
      if (typeof XLSX === 'undefined') {
        if (typeof showToast === 'function') {
          showToast('SheetJS(XLSX) 라이브러리를 찾을 수 없습니다.', 'error');
        }
        return;
      }

      // 파일 선택 다이얼로그
      const file = await selectFileForImport('.xlsx');
      if (!file) return;

      // 파일 읽기
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      // 시트2 "매핑데이터" 확인
      const ws2 = wb.Sheets['매핑데이터'];
      if (!ws2) {
        if (typeof showToast === 'function') {
          showToast('Excel 파일에 "매핑데이터" 시트가 없습니다.', 'error');
        }
        return;
      }

      // 시트2 파싱
      const parsed = parseImportSheet2(ws2);
      const { wallTypeRows, extraColumnDefs } = parsed;

      if (wallTypeRows.length === 0) {
        if (typeof showToast === 'function') {
          showToast('불러올 벽체타입 데이터가 없습니다.', 'warning');
        }
        return;
      }

      // 결과 통계
      let updatedCount = 0;
      let createdCount = 0;
      const failedMatches = []; // { wallTypeName, layerLabel, key }

      // 기존 추가 컬럼과 Excel 추가 컬럼 병합 결정
      const currentMaxExtra = getMaxExtraLayers();
      const importExtraCount = extraColumnDefs.length;
      const needExtraExpansion = importExtraCount > currentMaxExtra;

      // Excel에 있고 DB에 없는 추가 컬럼 → 모든 기존 벽체타입에 확장
      if (needExtraExpansion) {
        for (const wt of allWallTypes) {
          const extras = Array.isArray(wt.extraLayers) ? [...wt.extraLayers] : [];
          while (extras.length < importExtraCount) {
            const idx = extras.length;
            const def = extraColumnDefs[idx] || {};
            extras.push({
              unitPriceId: '',
              label: def.label || `추가${idx + 1}`,
              insertAfter: def.insertAfter || 'steelPlate'
            });
          }
          wt.extraLayers = extras;
          await ExcelUnitPriceImporter.updateExcelWallType(wt.id, { extraLayers: extras });
        }
      }

      // 벽체타입 upsert
      for (const wtRow of wallTypeRows) {
        // 이름으로 기존 벽체타입 찾기
        let existingWt = allWallTypes.find(w => w.name === wtRow.name);
        const isNew = !existingWt;

        if (isNew) {
          // 새 벽체타입 생성
          existingWt = ExcelUnitPriceImporter.createEmptyExcelWallType(wtRow.name);
          // 추가 컬럼 구조 초기화
          if (importExtraCount > 0) {
            existingWt.extraLayers = [];
            for (let i = 0; i < importExtraCount; i++) {
              const def = extraColumnDefs[i] || {};
              existingWt.extraLayers.push({
                unitPriceId: '',
                label: def.label || `추가${i + 1}`,
                insertAfter: def.insertAfter || 'steelPlate'
              });
            }
          } else if (currentMaxExtra > 0) {
            // 기존 추가 컬럼 구조 복사
            const refWt = allWallTypes.length > 0 ? allWallTypes[0] : null;
            existingWt.extraLayers = [];
            for (let i = 0; i < currentMaxExtra; i++) {
              const refExtra = refWt?.extraLayers?.[i] || {};
              existingWt.extraLayers.push({
                unitPriceId: '',
                label: refExtra.label || `추가${i + 1}`,
                insertAfter: refExtra.insertAfter || 'steelPlate'
              });
            }
          }
        }

        // 레이어 매칭
        const updateData = {};
        const extras = Array.isArray(existingWt.extraLayers) ? [...existingWt.extraLayers] : [];

        for (const layer of wtRow.layers) {
          if (!layer.key) {
            // 빈 값 → 레이어 비우기
            if (layer.type === 'fixed') {
              updateData[layer.field] = '';
            } else if (layer.type === 'extra') {
              while (extras.length <= layer.extraIndex) {
                const def = extraColumnDefs[extras.length] || {};
                extras.push({
                  unitPriceId: '',
                  label: def.label || `추가${extras.length + 1}`,
                  insertAfter: def.insertAfter || 'steelPlate'
                });
              }
              extras[layer.extraIndex].unitPriceId = '';
            }
            continue;
          }

          // key로 unitPrice 매칭
          const matchedUp = await matchUnitPriceByKey(layer.key);

          if (matchedUp) {
            if (layer.type === 'fixed') {
              updateData[layer.field] = matchedUp.id;
            } else if (layer.type === 'extra') {
              while (extras.length <= layer.extraIndex) {
                const def = extraColumnDefs[extras.length] || {};
                extras.push({
                  unitPriceId: '',
                  label: def.label || `추가${extras.length + 1}`,
                  insertAfter: def.insertAfter || 'steelPlate'
                });
              }
              extras[layer.extraIndex].unitPriceId = matchedUp.id;
            }
          } else {
            // 매칭 실패
            const layerLabel = layer.type === 'fixed'
              ? (LAYER_COLUMNS.find(c => c.field === layer.field)?.label || layer.field)
              : (layer.label || `추가${layer.extraIndex + 1}`);
            failedMatches.push({
              wallTypeName: wtRow.name,
              layerLabel,
              key: layer.key
            });

            // 실패 시 빈 값으로 설정
            if (layer.type === 'fixed') {
              updateData[layer.field] = '';
            } else if (layer.type === 'extra') {
              while (extras.length <= layer.extraIndex) {
                const def = extraColumnDefs[extras.length] || {};
                extras.push({
                  unitPriceId: '',
                  label: def.label || `추가${extras.length + 1}`,
                  insertAfter: def.insertAfter || 'steelPlate'
                });
              }
              extras[layer.extraIndex].unitPriceId = '';
            }
          }
        }

        updateData.extraLayers = extras;

        // 임시 벽체타입으로 합계 재계산
        const tempWt = { ...existingWt, ...updateData, extraLayers: extras };
        const totals = calculateTotalsFromCache(tempWt);
        updateData.thickness = totals.thickness;
        updateData.totalMaterialPrice = totals.totalMaterialPrice;
        updateData.totalLaborPrice = totals.totalLaborPrice;
        updateData.totalPrice = totals.totalPrice;

        if (isNew) {
          // 새 벽체타입 저장
          Object.assign(existingWt, updateData);
          await ExcelUnitPriceImporter.saveExcelWallType(existingWt);
          allWallTypes.push(existingWt);
          createdCount++;
        } else {
          // 기존 벽체타입 업데이트
          const updated = await ExcelUnitPriceImporter.updateExcelWallType(existingWt.id, updateData);
          const idx = allWallTypes.findIndex(w => w.id === existingWt.id);
          if (idx >= 0) {
            allWallTypes[idx] = updated;
          }
          updatedCount++;
        }
      }

      // 테이블 리빌드
      rebuildTable();
      updateStatusBar();

      // 결과 리포트
      let resultMsg = `불러오기 완료: 업데이트 ${updatedCount}개, 신규 생성 ${createdCount}개`;
      if (failedMatches.length > 0) {
        resultMsg += `, 매칭 실패 ${failedMatches.length}개`;
        console.warn('⚠️ 매칭 실패 목록:', failedMatches);
      }

      if (typeof showToast === 'function') {
        if (failedMatches.length > 0) {
          showToast(resultMsg + ' — 콘솔에서 상세 확인', 'warning');
        } else {
          showToast(resultMsg, 'success');
        }
      }
    } catch (err) {
      console.error('❌ 엑셀 불러오기 실패:', err);
      if (typeof showToast === 'function') {
        showToast('엑셀 불러오기 실패: ' + err.message, 'error');
      }
    }
  }

  /**
   * 파일 선택 다이얼로그 (Promise 래퍼)
   */
  function selectFileForImport(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || '.xlsx';
      input.style.display = 'none';

      input.addEventListener('change', () => {
        const file = input.files?.[0] || null;
        document.body.removeChild(input);
        resolve(file);
      });

      // 취소 시 처리
      input.addEventListener('cancel', () => {
        document.body.removeChild(input);
        resolve(null);
      });

      document.body.appendChild(input);
      input.click();
    });
  }

  // ========================================
  // Phase 9: Revit 벽체타입 생성 기능
  // ========================================

  /**
   * 벽체타입 → Revit 레이어 구조 변환 (동기, unitPriceMap 캐시 사용)
   * @param {Object} wallType - excelWallType 객체
   * @returns {{ wallTypeName: string, layers: Array, totalThickness: number, errors: Array, hasErrors: boolean }}
   */
  function getExcelLayerStructure(wallType) {
    const layers = [];
    const errors = [];
    let totalThickness = 0;

    // LAYER_COLUMNS의 field → group 매핑 (extra 컬럼의 group 결정에도 사용)
    const fieldToGroup = {};
    for (const col of LAYER_COLUMNS) {
      fieldToGroup[col.field] = col.group;
    }

    const orderedColumns = getOrderedColumnList();

    for (const col of orderedColumns) {
      let unitPriceId = null;
      let positionLabel = '';

      if (col.type === 'fixed') {
        unitPriceId = wallType[col.field];
        positionLabel = `${col.group} - ${col.label}`;
      } else if (col.type === 'extra') {
        // extra 컬럼: extraLayers 배열에서 unitPriceId 추출
        const extraEntry = Array.isArray(wallType.extraLayers) ? wallType.extraLayers[col.extraIndex] : null;
        unitPriceId = extraEntry?.unitPriceId || null;
        // insertAfter 필드를 통해 소속 그룹 결정
        const parentGroup = extraEntry?.insertAfter ? (fieldToGroup[extraEntry.insertAfter] || '옵션') : '옵션';
        positionLabel = `${parentGroup} - ${col.label}`;
      }

      // 비어있는 레이어 건너뛰기
      if (!unitPriceId) continue;

      const up = unitPriceMap[unitPriceId];
      if (!up) {
        // 삭제된 단가 참조
        errors.push({ position: positionLabel, message: '단가 데이터 없음' });
        continue;
      }

      const thickness = up.thickness || 0;
      totalThickness += thickness;

      layers.push({
        position: positionLabel,
        materialName: up.item || '',
        spec: up.spec || '',
        thickness: thickness,
        isUnitPrice: true
      });
    }

    return {
      wallTypeName: wallType.name || '',
      layers,
      totalThickness,
      errors,
      hasErrors: errors.length > 0
    };
  }

  /**
   * 미리보기 모달 HTML 생성
   * @param {Array} wallTypesData - getExcelLayerStructure() 결과 배열
   * @returns {{ html: string, validCount: number, errorCount: number, validWallTypes: Array }}
   */
  function buildExcelLayerPreviewHTML(wallTypesData) {
    const validWallTypes = wallTypesData.filter(d => !d.hasErrors);
    const errorWallTypes = wallTypesData.filter(d => d.hasErrors);
    let html = '<div style="max-height: 500px; overflow-y: auto; padding: 10px;">';

    // 유효한 벽체타입
    for (const wt of validWallTypes) {
      html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: 600; color: #16a34a; margin-bottom: 6px;">
          &#10003; ${escapeHtml(wt.wallTypeName)} (두께: ${wt.totalThickness}mm, 레이어: ${wt.layers.length}개)
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-left: 10px;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #e2e8f0; padding: 4px 8px; text-align: left;">위치</th>
              <th style="border: 1px solid #e2e8f0; padding: 4px 8px; text-align: left;">품명/규격</th>
              <th style="border: 1px solid #e2e8f0; padding: 4px 8px; text-align: right;">두께</th>
            </tr>
          </thead>
          <tbody>`;
      for (const layer of wt.layers) {
        html += `<tr>
              <td style="border: 1px solid #e2e8f0; padding: 3px 8px;">${escapeHtml(layer.position)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 3px 8px;">${escapeHtml(layer.materialName)} ${escapeHtml(layer.spec)}</td>
              <td style="border: 1px solid #e2e8f0; padding: 3px 8px; text-align: right;">${layer.thickness}mm</td>
            </tr>`;
      }
      html += `</tbody></table></div>`;
    }

    // 오류 있는 벽체타입
    for (const wt of errorWallTypes) {
      html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: 600; color: #dc2626; margin-bottom: 6px;">
          &#10007; ${escapeHtml(wt.wallTypeName)} (오류: 삭제된 단가 ${wt.errors.length}개)
        </div>
        <ul style="margin: 0 0 0 20px; padding: 0; font-size: 12px; color: #6b7280;">`;
      for (const err of wt.errors) {
        html += `<li>${escapeHtml(err.position)}: ${escapeHtml(err.message)}</li>`;
      }
      html += `</ul></div>`;
    }

    // 요약
    html += `<div style="border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; font-size: 13px; color: #475569;">
      총 ${wallTypesData.length}개 중 <strong style="color: #16a34a;">${validWallTypes.length}개 생성 가능</strong>`;
    if (errorWallTypes.length > 0) {
      html += `, <strong style="color: #dc2626;">${errorWallTypes.length}개 오류</strong>`;
    }
    html += `</div></div>`;

    return { html, validCount: validWallTypes.length, errorCount: errorWallTypes.length, validWallTypes };
  }

  /**
   * [Revit 생성] 버튼 클릭 핸들러 — 메인 진입점
   */
  function handleCreateRevitWallTypes() {
    // 선택된 벽체 확인
    if (selectedWallTypes.size === 0) {
      alert('벽체타입을 선택해 주세요.');
      return;
    }

    // 선택된 벽체타입에 대해 레이어 구조 변환
    const wallTypesData = [];
    for (const wtId of selectedWallTypes) {
      const wt = allWallTypes.find(w => w.id === wtId);
      if (!wt) continue;
      wallTypesData.push(getExcelLayerStructure(wt));
    }

    if (wallTypesData.length === 0) {
      alert('선택된 벽체타입을 찾을 수 없습니다.');
      return;
    }

    // 미리보기 HTML 생성
    const preview = buildExcelLayerPreviewHTML(wallTypesData);

    // 버튼 구성
    const buttons = [
      {
        text: '취소',
        className: 'btn-secondary',
        onClick: (subModalOverlay) => {
          if (subModalOverlay && subModalOverlay.parentNode) {
            subModalOverlay.parentNode.removeChild(subModalOverlay);
          }
        }
      }
    ];

    if (preview.validCount > 0) {
      buttons.push({
        text: `생성하기 (${preview.validCount}개)`,
        className: 'btn-blue',
        onClick: (subModalOverlay) => {
          sendExcelWallTypesToRevit(preview.validWallTypes, wallTypesData.length);
          if (subModalOverlay && subModalOverlay.parentNode) {
            subModalOverlay.parentNode.removeChild(subModalOverlay);
          }
        }
      });
    }

    // 미리보기 모달 표시
    createSubModal('Revit 벽체타입 생성', preview.html, buttons, { width: '700px' });
  }

  /**
   * Revit으로 벽체타입 데이터 전송
   * @param {Array} validWallTypes - getExcelLayerStructure() 결과 중 오류 없는 것들
   * @param {number} totalCount - 전체 선택 수 (로그용)
   */
  function sendExcelWallTypesToRevit(validWallTypes, totalCount) {
    // 서버 연결 확인
    if (!window.socketService?.isConnected) {
      alert('서버에 연결되어 있지 않습니다.');
      return;
    }

    // Revit 연결 확인
    if (!window.socketService?.revitConnected) {
      alert('Revit이 연결되어 있지 않습니다.');
      return;
    }

    // PascalCase JSON 변환 (revitTypeMatching.js 형식과 동일)
    const revitData = validWallTypes.map(wallData => ({
      WallTypeName: wallData.wallTypeName,
      TotalThickness: wallData.totalThickness,
      Layers: wallData.layers.map(layer => ({
        Position: layer.position,
        MaterialId: '',
        MaterialName: layer.materialName,
        Specification: layer.spec,
        Thickness: layer.thickness,
        IsUnitPrice: true
      }))
    }));

    // WebSocket 전송
    window.socketService.sendRevitCommand('CREATE_WALL_TYPES', revitData);

    // 토스트 알림
    if (typeof showToast === 'function') {
      showToast(`Revit으로 ${validWallTypes.length}개 벽체타입 전송 중...`, 'info');
    }

    console.log(`[ExcelWallType] Revit 전송: ${validWallTypes.length}/${totalCount}개`, revitData);
  }

  // ========================================
  // 전역 노출
  // ========================================
  window.openExcelWallTypeModal = openExcelWallTypeModal;

})();
