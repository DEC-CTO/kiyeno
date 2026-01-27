/**
 * 엑셀 단가표 관리 모달 모듈
 * - 엑셀 업로드 / 재업로드 (upsert)
 * - 인라인 셀 편집 (엑셀 스타일)
 * - 엑셀 내보내기
 * - 검색, 삭제, 전체 삭제
 */

(function () {
  'use strict';

  // ========================================
  // 상태 변수
  // ========================================
  let currentModal = null;
  let allUnitPrices = [];       // 전체 데이터 캐시
  let filteredUnitPrices = [];  // 필터링된 데이터
  let isEditingCell = false;    // 셀 편집 중 플래그
  let searchDebounceTimer = null;

  // 편집 가능 필드 정의
  const EDITABLE_FIELDS = {
    location:         { label: '부위',     type: 'text' },
    item:             { label: '품명',     type: 'text' },
    spec:             { label: '규격',     type: 'text' },
    unit:             { label: '단위',     type: 'text' },
    thickness:        { label: '두께',     type: 'number' },
    quantity:         { label: '수량',     type: 'number' },
    materialPrice:    { label: '자재비',   type: 'number' },
    laborPrice:       { label: '노무비',   type: 'number' },
    materialWorkType: { label: '자재공종', type: 'text' },
    laborWorkType:    { label: '노무공종', type: 'text' }
  };

  // ========================================
  // 메인 모달 열기
  // ========================================

  /**
   * 엑셀 단가표 관리 모달 열기
   */
  async function openExcelUnitPriceModal() {
    try {
      // DB 초기화 보장
      await ExcelUnitPriceImporter.initDB();

      // 데이터 로드
      allUnitPrices = await ExcelUnitPriceImporter.getAllImportedUnitPrices();
      filteredUnitPrices = [...allUnitPrices];

      const modalHTML = buildModalHTML();

      currentModal = createSubModal('', modalHTML, [], {
        disableBackgroundClick: true,
        disableEscapeKey: true,
        width: '95vw'
      });

      // 이벤트 바인딩
      bindModalEvents();

      // X 닫기 버튼 이벤트
      const btnCloseModal = document.getElementById('btnCloseExcelModal');
      if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
          if (currentModal) {
            closeSubModal(currentModal);
            currentModal = null;
          }
        });
      }
      updateStatusBar();

    } catch (error) {
      console.error('❌ 엑셀 단가표 모달 열기 실패:', error);
      showToast('엑셀 단가표 관리를 열 수 없습니다: ' + error.message, 'error');
    }
  }

  // ========================================
  // 모달 HTML 생성
  // ========================================

  function buildModalHTML() {
    return `
      <div style="display: flex; flex-direction: column; height: 75vh; padding: 0;">
        <!-- 모달 헤더 (제목 + X 닫기) -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #334155; flex-shrink: 0;">
          <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: white;">
            <i class="fas fa-file-excel"></i> 엑셀 단가표 관리
          </h3>
          <button id="btnCloseExcelModal" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; line-height: 1;"
                  onmouseover="this.style.color='white'; this.style.background='#475569'"
                  onmouseout="this.style.color='#94a3b8'; this.style.background='none'"
                  title="닫기">&times;</button>
        </div>

        <!-- 상단 툴바 -->
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; flex-wrap: wrap;">
          <!-- 파일 업로드 -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <input type="file" id="excelFileInput" accept=".xlsx,.xls" style="display: none;" />
            <button id="btnSelectFile" class="btn btn-sm" style="padding: 5px 10px; background: #475569; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
              <i class="fas fa-folder-open"></i> 파일 선택
            </button>
            <span id="selectedFileName" style="font-size: 11px; color: #6b7280;">선택된 파일 없음</span>
            <button id="btnUploadExcel" class="btn btn-sm" style="padding: 5px 10px; background: #475569; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" disabled>
              <i class="fas fa-upload"></i> 업로드
            </button>
          </div>

          <div style="border-left: 1px solid #d1d5db; height: 20px;"></div>

          <!-- 엑셀 내보내기 -->
          <button id="btnExportExcel" class="btn btn-sm" style="padding: 5px 10px; background: #475569; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            <i class="fas fa-file-export"></i> 엑셀 내보내기
          </button>

          <div style="border-left: 1px solid #d1d5db; height: 20px;"></div>

          <!-- 행 추가 -->
          <button id="btnAddRow" class="btn btn-sm" style="padding: 5px 10px; background: #475569; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            <i class="fas fa-plus"></i> 행 추가
          </button>

          <div style="border-left: 1px solid #d1d5db; height: 20px;"></div>

          <!-- 전체 삭제 -->
          <button id="btnDeleteAll" class="btn btn-sm" style="padding: 5px 10px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            <i class="fas fa-trash-alt"></i> 전체 삭제
          </button>

          <!-- 검색 (우측 정렬) -->
          <div style="margin-left: auto; display: flex; align-items: center; gap: 6px;">
            <input type="text" id="excelSearchInput" placeholder="품명 또는 규격 검색..." style="padding: 5px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; width: 200px;" />
          </div>
        </div>

        <!-- 테이블 영역 -->
        <div style="flex: 1; overflow: auto; position: relative;">
          <table id="excelUnitPriceTable" style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr style="background: #f1f5f9; color: #334155;">
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 36px; text-align: center; background: #e2e8f0; color: #64748b;">NO</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 70px; text-align: center;">부위</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center;">품명</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 100px; text-align: center;">규격</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 50px; text-align: center;">단위</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 55px; text-align: center;">두께</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 45px; text-align: center;">수량</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center;">자재비</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center;">노무비</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; background: #e2e8f0; color: #64748b;">합계</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center;">자재공종</th>
                <th style="padding: 8px 6px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center;">노무공종</th>
              </tr>
            </thead>
            <tbody id="excelUnitPriceTableBody">
              ${buildTableRows(filteredUnitPrices)}
            </tbody>
          </table>
        </div>

        <!-- 상태 표시줄 -->
        <div id="excelStatusBar" style="padding: 8px 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; flex-shrink: 0;">
          총 0개 항목
        </div>
      </div>
    `;
  }

  // ========================================
  // 테이블 행 생성 (부위 → 품명 2단계 그룹핑)
  // ========================================

  // 1차 그룹: 부위 정렬 순서 (가설벽 → 벽 → 나머지 가나다순)
  const LOCATION_ORDER = ['가설벽', '벽'];

  function getLocationSortKey(location) {
    const loc = (location || '').trim();
    const idx = LOCATION_ORDER.indexOf(loc);
    return idx >= 0 ? idx : LOCATION_ORDER.length;
  }

  /**
   * 2단계 그룹핑: 부위(1차) → 품명(2차)
   * 반환: [{ location, subGroups: [{ itemName, items: [...] }] }]
   */
  function groupItems(items) {
    // 1차: 부위별 그룹
    const locGroups = {};
    items.forEach(item => {
      const loc = (item.location || '').trim() || '(미지정)';
      if (!locGroups[loc]) locGroups[loc] = [];
      locGroups[loc].push(item);
    });

    // 부위 정렬
    const sortedLocs = Object.keys(locGroups).sort((a, b) => {
      const ka = getLocationSortKey(a);
      const kb = getLocationSortKey(b);
      if (ka !== kb) return ka - kb;
      return a.localeCompare(b, 'ko');
    });

    return sortedLocs.map(loc => {
      // 2차: 품명별 서브그룹
      const subMap = {};
      locGroups[loc].forEach(item => {
        const name = (item.item || '').trim() || '(미지정)';
        if (!subMap[name]) subMap[name] = [];
        subMap[name].push(item);
      });

      // 품명 가나다순 정렬
      const sortedNames = Object.keys(subMap).sort((a, b) => a.localeCompare(b, 'ko'));
      const subGroups = sortedNames.map(name => ({ itemName: name, items: subMap[name] }));

      return { location: loc, subGroups };
    });
  }

  function buildTableRows(items) {
    if (!items || items.length === 0) {
      return `<tr><td colspan="12" style="padding: 40px; text-align: center; color: #9ca3af; font-size: 14px;">
        데이터가 없습니다. 엑셀 파일을 업로드해주세요.
      </td></tr>`;
    }

    const grouped = groupItems(items);
    let html = '';
    let rowNum = 0;

    grouped.forEach(locGroup => {
      const locTotal = locGroup.subGroups.reduce((sum, sg) => sum + sg.items.length, 0);

      // 1차 그룹 헤더 (부위)
      html += `
        <tr class="group-header-row">
          <td colspan="12" style="padding: 6px 12px; background: #cbd5e1; font-weight: 700; font-size: 12px; color: #1e293b; border: 1px solid #94a3b8;">
            ${escapeHtml(locGroup.location)} (${locTotal})
          </td>
        </tr>`;

      locGroup.subGroups.forEach(subGroup => {
        // 2차 그룹 헤더 (품명)
        html += `
          <tr class="sub-group-header-row">
            <td colspan="12" style="padding: 4px 12px 4px 28px; background: #f1f5f9; font-weight: 600; font-size: 11px; color: #475569; border: 1px solid #e2e8f0;">
              ${escapeHtml(subGroup.itemName)} (${subGroup.items.length})
            </td>
          </tr>`;

        // 데이터 행
        subGroup.items.forEach(item => {
          rowNum++;
          html += buildDataRow(item, rowNum);
        });
      });
    });

    return html;
  }

  function buildDataRow(item, rowNum) {
    return `
      <tr data-id="${escapeHtml(item.id)}" style="border-bottom: 1px solid #f3f4f6;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
        <td class="no-cell" data-id="${escapeHtml(item.id)}" style="padding: 5px 4px; border: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px; background: #f8fafc; cursor: default; position: relative; min-width: 36px;">
          <span class="row-num">${rowNum}</span><span class="row-delete" style="display:none; color: #ef4444; font-weight: 700; cursor: pointer; font-size: 14px;" title="삭제">&times;</span>
        </td>
        ${buildCell(item, 'location', item.location, 'text')}
        ${buildCell(item, 'item', item.item, 'text')}
        ${buildCell(item, 'spec', item.spec, 'text')}
        ${buildCell(item, 'unit', item.unit, 'text')}
        ${buildCell(item, 'thickness', item.thickness, 'number')}
        ${buildCell(item, 'quantity', item.quantity, 'number')}
        ${buildCell(item, 'materialPrice', item.materialPrice, 'number')}
        ${buildCell(item, 'laborPrice', item.laborPrice, 'number')}
        <td style="padding: 5px 6px; border: 1px solid #e2e8f0; text-align: right; color: #334155; font-weight: 600; background: #f8fafc;" data-field="totalPrice" data-id="${escapeHtml(item.id)}">
          ${formatNumber(item.totalPrice)}
        </td>
        ${buildCell(item, 'materialWorkType', item.materialWorkType, 'text')}
        ${buildCell(item, 'laborWorkType', item.laborWorkType, 'text')}
      </tr>
    `;
  }

  /**
   * 편집 가능한 셀 생성
   */
  // 자재비/노무비만 우측 정렬, 나머지 모두 중앙 정렬
  const RIGHT_ALIGN_FIELDS = ['materialPrice', 'laborPrice'];

  function buildCell(item, field, value, type) {
    const displayValue = type === 'number' ? formatNumber(value) : escapeHtml(String(value || ''));
    const alignStyle = RIGHT_ALIGN_FIELDS.includes(field) ? 'text-align: right;' : 'text-align: center;';

    return `<td class="editable-cell" data-field="${field}" data-id="${escapeHtml(item.id)}" data-type="${type}"
      style="padding: 5px 6px; border: 1px solid #e2e8f0; ${alignStyle} cursor: pointer;"
      title="클릭하여 편집">${displayValue}</td>`;
  }

  // ========================================
  // 인라인 셀 편집
  // ========================================

  /**
   * 셀 클릭 시 인라인 편집 시작
   */
  function startCellEdit(cell) {
    if (isEditingCell) return;

    const field = cell.getAttribute('data-field');
    const itemId = cell.getAttribute('data-id');
    const type = cell.getAttribute('data-type');

    if (!field || !itemId || !EDITABLE_FIELDS[field]) return;

    isEditingCell = true;

    // 현재 값 가져오기
    const item = allUnitPrices.find(u => u.id === itemId);
    if (!item) {
      isEditingCell = false;
      return;
    }

    const currentValue = item[field];
    const originalText = cell.textContent;
    const originalPadding = cell.style.padding;

    // 셀 크기 고정 (편집 시 셀 크기 변동 방지)
    const cellRect = cell.getBoundingClientRect();
    cell.style.width = cellRect.width + 'px';
    cell.style.height = cellRect.height + 'px';
    cell.style.padding = '0';
    cell.style.overflow = 'hidden';

    // input 생성 — 셀 내부에 꽉 차게
    const inputType = type === 'number' ? 'number' : 'text';
    const inputValue = type === 'number' ? (currentValue || 0) : (currentValue || '');
    const alignStyle = RIGHT_ALIGN_FIELDS.includes(field) ? 'right' : 'center';

    const input = document.createElement('input');
    input.type = inputType;
    input.value = inputValue;
    input.style.cssText = `width: 100%; height: 100%; padding: 0 4px; border: 2px solid #94a3b8; border-radius: 0; font-size: 12px; box-sizing: border-box; outline: none; text-align: ${alignStyle}; background: #fffff0;`;
    if (type === 'number') {
      input.step = 'any';
    }

    cell.textContent = '';
    cell.appendChild(input);
    cell._originalPadding = originalPadding;
    input.focus();
    input.select();

    // blur → 저장
    const handleBlur = () => {
      finishCellEdit(cell, input, itemId, field, type, originalText);
    };

    // keydown → Enter 저장, Escape 취소
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.removeEventListener('blur', handleBlur);
        finishCellEdit(cell, input, itemId, field, type, originalText);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.removeEventListener('blur', handleBlur);
        cancelCellEdit(cell, originalText);
      }
    };

    input.addEventListener('blur', handleBlur);
    input.addEventListener('keydown', handleKeyDown);
  }

  /**
   * 셀 편집 완료 → DB 업데이트
   */
  async function finishCellEdit(cell, input, itemId, field, type, originalText) {
    const rawValue = input.value.trim();
    let newValue;

    if (type === 'number') {
      const parsed = rawValue === '' ? 0 : Number(rawValue);
      newValue = isNaN(parsed) ? 0 : (field === 'thickness' ? parsed : Math.round(parsed));
    } else {
      newValue = rawValue;
    }

    // 원본 아이템 찾기
    const item = allUnitPrices.find(u => u.id === itemId);
    if (!item) {
      cancelCellEdit(cell, originalText);
      return;
    }

    const oldValue = item[field];

    // 값이 변경되지 않았으면 그냥 복원
    if (String(newValue) === String(oldValue)) {
      restoreCellDisplay(cell, field, type, newValue);
      isEditingCell = false;
      return;
    }

    try {
      // DB 업데이트
      const updateData = { [field]: newValue };
      const updated = await ExcelUnitPriceImporter.updateImportedUnitPrice(itemId, updateData);

      // 로컬 캐시 업데이트
      const idx = allUnitPrices.findIndex(u => u.id === itemId);
      if (idx >= 0) {
        allUnitPrices[idx] = updated;
      }
      const fIdx = filteredUnitPrices.findIndex(u => u.id === itemId);
      if (fIdx >= 0) {
        filteredUnitPrices[fIdx] = updated;
      }

      // 품명/규격/부위 변경 시 그룹핑이 변하므로 테이블 전체 리렌더링
      if (field === 'item' || field === 'spec' || field === 'location') {
        // 검색 필터도 반영하여 리렌더링
        const searchInput = document.getElementById('excelSearchInput');
        const query = searchInput ? searchInput.value.trim() : '';
        if (query) {
          handleSearch(query);
        } else {
          filteredUnitPrices = [...allUnitPrices];
          renderTableBody();
        }
      } else {
        // 셀 표시 복원 (부분 갱신)
        restoreCellDisplay(cell, field, type, newValue);

        // 자재비/노무비 변경 시 합계 컬럼도 업데이트
        if (field === 'materialPrice' || field === 'laborPrice') {
          updateTotalPriceCell(itemId, updated.totalPrice);
        }
      }

    } catch (error) {
      console.error('❌ 셀 업데이트 실패:', error);
      showToast('저장 실패: ' + error.message, 'error');
      cancelCellEdit(cell, originalText);
      return;
    }

    isEditingCell = false;
  }

  /**
   * 셀 편집 취소
   */
  function cancelCellEdit(cell, originalText) {
    cell.textContent = originalText;
    restoreCellSize(cell);
    isEditingCell = false;
  }

  /**
   * 셀 표시 복원 (편집 완료 후)
   */
  function restoreCellDisplay(cell, field, type, value) {
    if (type === 'number') {
      cell.textContent = formatNumber(value);
    } else {
      cell.textContent = value || '';
    }
    restoreCellSize(cell);
  }

  /**
   * 편집 후 셀 크기/패딩 복원
   */
  function restoreCellSize(cell) {
    cell.style.width = '';
    cell.style.height = '';
    cell.style.padding = cell._originalPadding || '5px 6px';
    cell.style.overflow = '';
    delete cell._originalPadding;
  }

  /**
   * 합계 셀 업데이트
   */
  function updateTotalPriceCell(itemId, totalPrice) {
    const totalCell = document.querySelector(`td[data-field="totalPrice"][data-id="${itemId}"]`);
    if (totalCell) {
      totalCell.textContent = formatNumber(totalPrice);
    }
  }

  // ========================================
  // 이벤트 바인딩
  // ========================================

  function bindModalEvents() {
    // 파일 선택 버튼
    const btnSelectFile = document.getElementById('btnSelectFile');
    const fileInput = document.getElementById('excelFileInput');
    const btnUpload = document.getElementById('btnUploadExcel');

    if (btnSelectFile && fileInput) {
      btnSelectFile.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        const nameSpan = document.getElementById('selectedFileName');
        if (file) {
          nameSpan.textContent = file.name;
          nameSpan.style.color = '#334155';
          btnUpload.disabled = false;
        } else {
          nameSpan.textContent = '선택된 파일 없음';
          nameSpan.style.color = '#6b7280';
          btnUpload.disabled = true;
        }
      });
    }

    // 업로드 버튼
    if (btnUpload) {
      btnUpload.addEventListener('click', handleUpload);
    }

    // 엑셀 내보내기
    const btnExport = document.getElementById('btnExportExcel');
    if (btnExport) {
      btnExport.addEventListener('click', handleExportExcel);
    }

    // 행 추가
    const btnAddRow = document.getElementById('btnAddRow');
    if (btnAddRow) {
      btnAddRow.addEventListener('click', handleAddRow);
    }

    // 전체 삭제
    const btnDeleteAll = document.getElementById('btnDeleteAll');
    if (btnDeleteAll) {
      btnDeleteAll.addEventListener('click', handleDeleteAll);
    }

    // 검색
    const searchInput = document.getElementById('excelSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          handleSearch(searchInput.value.trim());
        }, 300);
      });
    }

    // 테이블 클릭 이벤트 위임 (인라인 편집 + NO 셀 삭제)
    const tableBody = document.getElementById('excelUnitPriceTableBody');
    if (tableBody) {
      // 클릭: NO 셀 × 삭제 + 인라인 편집
      tableBody.addEventListener('click', (e) => {
        // NO 셀 × 삭제 버튼
        const deleteSpan = e.target.closest('.row-delete');
        if (deleteSpan) {
          const noCell = deleteSpan.closest('.no-cell');
          if (noCell) {
            const id = noCell.getAttribute('data-id');
            handleDeleteRow(id);
          }
          return;
        }

        // 편집 가능 셀
        const cell = e.target.closest('.editable-cell');
        if (cell && !isEditingCell) {
          startCellEdit(cell);
        }
      });

      // 호버: NO 셀에 마우스 올리면 × 표시, 나가면 번호 복원
      tableBody.addEventListener('mouseover', (e) => {
        const noCell = e.target.closest('.no-cell');
        if (noCell) {
          const numSpan = noCell.querySelector('.row-num');
          const delSpan = noCell.querySelector('.row-delete');
          if (numSpan) numSpan.style.display = 'none';
          if (delSpan) delSpan.style.display = 'inline';
        }
      });

      tableBody.addEventListener('mouseout', (e) => {
        const noCell = e.target.closest('.no-cell');
        if (noCell) {
          const numSpan = noCell.querySelector('.row-num');
          const delSpan = noCell.querySelector('.row-delete');
          if (numSpan) numSpan.style.display = 'inline';
          if (delSpan) delSpan.style.display = 'none';
        }
      });
    }
  }

  // ========================================
  // 행 추가 처리
  // ========================================

  async function handleAddRow() {
    try {
      const now = new Date().toISOString();
      const newItem = {
        id: 'imp_' + Date.now() + '_new',
        key: '(새 항목)_(규격)',
        location: '',
        item: '(새 항목)',
        spec: '(규격)',
        unit: 'M2',
        thickness: 0,
        quantity: 1,
        materialPrice: 0,
        laborPrice: 0,
        totalPrice: 0,
        materialWorkType: '',
        laborWorkType: '',
        importedAt: now,
        updatedAt: now
      };

      // DB 저장 (saveImportedUnitPrices는 배열을 받음)
      const result = await ExcelUnitPriceImporter.saveImportedUnitPrices([newItem]);

      // 테이블 새로고침
      await refreshTable();
      updateStatusBar();

      showToast('새 행이 추가되었습니다. 품명을 수정해주세요.', 'success');

      // 새로 추가된 항목의 품명 셀에 자동 포커스
      setTimeout(() => {
        const newItemInCache = allUnitPrices.find(u =>
          u.item === '(새 항목)' && u.spec === '(규격)'
        );
        if (newItemInCache) {
          const itemCell = document.querySelector(
            `td.editable-cell[data-field="item"][data-id="${newItemInCache.id}"]`
          );
          if (itemCell) {
            itemCell.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setTimeout(() => startCellEdit(itemCell), 200);
          }
        }
      }, 100);

    } catch (error) {
      console.error('❌ 행 추가 실패:', error);
      showToast('행 추가 실패: ' + error.message, 'error');
    }
  }

  // ========================================
  // 업로드 처리
  // ========================================

  async function handleUpload() {
    const fileInput = document.getElementById('excelFileInput');
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
      showToast('파일을 선택해주세요.', 'error');
      return;
    }

    const btnUpload = document.getElementById('btnUploadExcel');
    const originalText = btnUpload.innerHTML;
    btnUpload.disabled = true;
    btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';

    try {
      // 파싱
      const parsedItems = await ExcelUnitPriceImporter.parseUnitPriceExcel(file);

      // DB 저장 (upsert)
      const result = await ExcelUnitPriceImporter.saveImportedUnitPrices(parsedItems);

      showToast(`업로드 완료: 신규 ${result.inserted}개, 업데이트 ${result.updated}개`, 'success');

      // 데이터 새로고침
      await refreshTable();

      // 파일 입력 초기화
      fileInput.value = '';
      document.getElementById('selectedFileName').textContent = '선택된 파일 없음';
      document.getElementById('selectedFileName').style.color = '#6b7280';

    } catch (error) {
      console.error('❌ 업로드 실패:', error);
      showToast('업로드 실패: ' + error.message, 'error');
    } finally {
      btnUpload.disabled = false;
      btnUpload.innerHTML = originalText;
    }
  }

  // ========================================
  // 엑셀 내보내기
  // ========================================

  async function handleExportExcel() {
    try {
      if (allUnitPrices.length === 0) {
        showToast('내보낼 데이터가 없습니다.', 'error');
        return;
      }

      // 헤더
      const headers = ['부위', '품명', '규격', '단위', '두께', '수량', '자재비', '노무비', '단가', '자재공종', '노무공종'];

      // 데이터 행
      const rows = allUnitPrices.map(item => [
        item.location || '',
        item.item || '',
        item.spec || '',
        item.unit || '',
        item.thickness || 0,
        item.quantity || 1,
        item.materialPrice || 0,
        item.laborPrice || 0,
        item.totalPrice || 0,
        item.materialWorkType || '',
        item.laborWorkType || ''
      ]);

      // SheetJS로 워크북 생성
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // 컬럼 너비 설정
      ws['!cols'] = [
        { wch: 10 },  // 부위
        { wch: 20 },  // 품명
        { wch: 15 },  // 규격
        { wch: 8 },   // 단위
        { wch: 8 },   // 두께
        { wch: 8 },   // 수량
        { wch: 12 },  // 자재비
        { wch: 12 },  // 노무비
        { wch: 12 },  // 단가
        { wch: 12 },  // 자재공종
        { wch: 12 }   // 노무공종
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '단가표');

      // 파일명 생성
      const now = new Date();
      const dateStr = now.getFullYear()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0')
        + '_'
        + String(now.getHours()).padStart(2, '0')
        + String(now.getMinutes()).padStart(2, '0')
        + String(now.getSeconds()).padStart(2, '0');
      const fileName = `엑셀단가표_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      showToast(`엑셀 내보내기 완료: ${fileName}`, 'success');

    } catch (error) {
      console.error('❌ 엑셀 내보내기 실패:', error);
      showToast('엑셀 내보내기 실패: ' + error.message, 'error');
    }
  }

  // ========================================
  // 삭제 처리
  // ========================================

  async function handleDeleteRow(id) {
    const item = allUnitPrices.find(u => u.id === id);
    if (!item) return;

    const confirmed = confirm(`"${item.item} ${item.spec}"을(를) 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await ExcelUnitPriceImporter.deleteImportedUnitPrice(id);

      // 로컬 캐시에서 제거
      allUnitPrices = allUnitPrices.filter(u => u.id !== id);
      filteredUnitPrices = filteredUnitPrices.filter(u => u.id !== id);

      // 행 제거 (전체 리렌더 대신 해당 행만 제거)
      const row = document.querySelector(`tr[data-id="${id}"]`);
      if (row) row.remove();

      // 행 번호 재정렬
      renumberRows();
      updateStatusBar();

      showToast('삭제되었습니다.', 'success');
    } catch (error) {
      console.error('❌ 삭제 실패:', error);
      showToast('삭제 실패: ' + error.message, 'error');
    }
  }

  async function handleDeleteAll() {
    if (allUnitPrices.length === 0) {
      showToast('삭제할 데이터가 없습니다.', 'error');
      return;
    }

    const confirmed = confirm('정말 모든 엑셀 일위대가를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;

    try {
      await ExcelUnitPriceImporter.clearAllImportedUnitPrices();
      allUnitPrices = [];
      filteredUnitPrices = [];
      renderTableBody();
      updateStatusBar();
      showToast('모든 데이터가 삭제되었습니다.', 'success');
    } catch (error) {
      console.error('❌ 전체 삭제 실패:', error);
      showToast('전체 삭제 실패: ' + error.message, 'error');
    }
  }

  // ========================================
  // 검색
  // ========================================

  function handleSearch(query) {
    if (!query) {
      filteredUnitPrices = [...allUnitPrices];
    } else {
      const lowerQuery = query.toLowerCase();
      filteredUnitPrices = allUnitPrices.filter(item =>
        (item.item || '').toLowerCase().includes(lowerQuery) ||
        (item.spec || '').toLowerCase().includes(lowerQuery)
      );
    }

    renderTableBody();
    updateStatusBar(query);
  }

  // ========================================
  // 테이블 갱신
  // ========================================

  async function refreshTable() {
    allUnitPrices = await ExcelUnitPriceImporter.getAllImportedUnitPrices();

    // 검색 필터 유지
    const searchInput = document.getElementById('excelSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    if (query) {
      handleSearch(query);
    } else {
      filteredUnitPrices = [...allUnitPrices];
      renderTableBody();
      updateStatusBar();
    }
  }

  function renderTableBody() {
    const tableBody = document.getElementById('excelUnitPriceTableBody');
    if (tableBody) {
      tableBody.innerHTML = buildTableRows(filteredUnitPrices);
    }
  }

  function renumberRows() {
    const tableBody = document.getElementById('excelUnitPriceTableBody');
    if (!tableBody) return;
    // data-id가 있는 행만 (그룹 헤더 제외)
    const dataRows = tableBody.querySelectorAll('tr[data-id]');
    dataRows.forEach((row, index) => {
      const numSpan = row.querySelector('.row-num');
      if (numSpan) numSpan.textContent = index + 1;
    });
  }

  // ========================================
  // 상태 표시줄
  // ========================================

  function updateStatusBar(searchQuery) {
    const statusBar = document.getElementById('excelStatusBar');
    if (!statusBar) return;

    const totalCount = allUnitPrices.length;
    let statusText = `총 ${totalCount}개 항목`;

    if (searchQuery) {
      statusText += ` | 검색 결과: ${filteredUnitPrices.length}개`;
    }

    // 마지막 업로드 시간
    if (totalCount > 0) {
      const latest = allUnitPrices.reduce((max, item) => {
        const t = item.updatedAt || item.importedAt || '';
        return t > max ? t : max;
      }, '');

      if (latest) {
        try {
          const d = new Date(latest);
          const dateStr = d.getFullYear() + '-'
            + String(d.getMonth() + 1).padStart(2, '0') + '-'
            + String(d.getDate()).padStart(2, '0') + ' '
            + String(d.getHours()).padStart(2, '0') + ':'
            + String(d.getMinutes()).padStart(2, '0');
          statusText += ` | 마지막 업데이트: ${dateStr}`;
        } catch (e) {
          // 날짜 파싱 실패 시 무시
        }
      }
    }

    statusBar.textContent = statusText;
  }

  // ========================================
  // 유틸리티
  // ========================================

  function formatNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toLocaleString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========================================
  // 전역 노출
  // ========================================
  window.openExcelUnitPriceModal = openExcelUnitPriceModal;

})();
