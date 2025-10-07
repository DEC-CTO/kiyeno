// =============================================================================
// Kiyeno 벽체 관리 시스템 - UI 모듈
// 모든 사용자 인터페이스 렌더링 및 상호작용
// =============================================================================

// =============================================================================
// 전역 변수
// =============================================================================
let isEditingCell = false;
let sortConfig = { field: null, direction: 'asc' };

// =============================================================================
// 메인 테이블 렌더링
// =============================================================================

function renderTable() {
    const tableBody = document.getElementById('wallTableBody');
    if (!tableBody) {
        console.warn('테이블 body 요소를 찾을 수 없습니다.');
        return;
    }

    const wallData = window.Kiyeno?.Data?.wallData || [];
    
    if (wallData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="17" style="text-align: center; padding: 40px; color: #6c757d;">벽체 데이터가 없습니다. "+" 버튼을 클릭하여 새 벽체를 추가하세요.</td></tr>';
        updateSelectionInfo();
        return;
    }

    const filteredData = getFilteredData(wallData);
    const sortedData = getSortedData(filteredData);
    
    tableBody.innerHTML = sortedData.map(wall => createWallRow(wall)).join('');
    updateSelectionInfo();
}

function createWallRow(wall) {
    const isSelected = Kiyeno.Data.selectedRows.has(wall.id);
    const rowClass = isSelected ? 'selected' : '';
    
    return `
        <tr class="${rowClass}" onclick="handleRowClick(event, ${wall.id})" data-wall-id="${wall.id}">
            <td class="select-cell">
                <input type="checkbox" 
                       class="row-checkbox" 
                       ${isSelected ? 'checked' : ''} 
                       onclick="toggleRowSelection(event, ${wall.id})" />
                <span class="row-number">${wall.no}</span>
            </td>
            <td class="action-cell">
                <div class="action-buttons">
                    <button class="btn-detail" onclick="showWallDetailBreakdown(${wall.id})" title="상세 내역 보기">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <button class="btn-edit" onclick="editWallRow(${wall.id})" title="벽체 편집">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteWallRow(${wall.id})" title="벽체 삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
            ${createEditableCell(wall.id, 'wallType', wall.wallType, 'text')}
            ${createEditableCell(wall.id, 'area', wall.area, 'number')}
            ${createMaterialCell(wall.id, 'layer3_1', wall.layer3_1)}
            ${createMaterialCell(wall.id, 'column1', wall.column1)}
            ${createMaterialCell(wall.id, 'infill', wall.infill)}
            ${createMaterialCell(wall.id, 'layer3_2', wall.layer3_2)}
            ${createMaterialCell(wall.id, 'column2', wall.column2)}
            ${createMaterialCell(wall.id, 'channel', wall.channel)}
            ${createMaterialCell(wall.id, 'runner', wall.runner)}
            ${createMaterialCell(wall.id, 'steelPlate', wall.steelPlate)}
            ${createEditableCell(wall.id, 'thickness', wall.thickness, 'number')}
            ${createEditableCell(wall.id, 'fire', wall.fire, 'text')}
        </tr>
    `;
}

function createEditableCell(wallId, field, value, type) {
    const displayValue = value || '';
    return `
        <td class="editable-cell" 
            ondblclick="startCellEdit(this, ${wallId}, '${field}', '${type}')"
            data-field="${field}">
            ${displayValue}
        </td>
    `;
}

function createMaterialCell(wallId, field, value) {
    const displayValue = value || '';
    const hasValue = value && value.trim() !== '';
    const cellClass = hasValue ? 'material-cell material-cell-completed' : 'material-cell';
    
    return `
        <td class="${cellClass}" 
            ondblclick="startMaterialCellEdit(this, ${wallId}, '${field}')"
            data-field="${field}">
            ${displayValue}
        </td>
    `;
}

// =============================================================================
// 셀 편집 기능
// =============================================================================

function startCellEdit(cell, wallId, field, type) {
    if (isEditingCell) return;
    
    isEditingCell = true;
    disableRowDragging();
    
    const currentValue = cell.textContent.trim();
    const inputType = type === 'number' ? 'number' : 'text';
    
    cell.innerHTML = `
        <input type="${inputType}" 
               value="${currentValue}" 
               onblur="finishCellEdit(this, ${wallId}, '${field}')"
               onkeypress="handleCellEditKeypress(event, this, ${wallId}, '${field}')"
               style="width: 100%; border: none; background: transparent; font-size: inherit;"
               autofocus />
    `;
    
    const input = cell.querySelector('input');
    input.focus();
    input.select();
}

function finishCellEdit(input, wallId, field) {
    if (!isEditingCell) return;
    
    const newValue = input.value.trim();
    const cell = input.parentElement;
    
    // 값 업데이트
    updateWallFieldSilent(wallId, field, newValue);
    
    // 셀 내용 복원
    cell.textContent = newValue;
    cell.classList.remove('editing');
    
    // 편집 상태 해제
    isEditingCell = false;
    enableRowDragging();
}

function handleCellEditKeypress(event, input, wallId, field) {
    if (event.key === 'Enter') {
        finishCellEdit(input, wallId, field);
    } else if (event.key === 'Escape') {
        // 취소
        const cell = input.parentElement;
        const originalValue = cell.dataset.originalValue || '';
        cell.textContent = originalValue;
        cell.classList.remove('editing');
        isEditingCell = false;
        enableRowDragging();
    }
}

// =============================================================================
// 자재 셀 편집 (콤보박스)
// =============================================================================

function startMaterialCellEdit(cell, wallId, field) {
    if (isEditingCell) return;
    
    isEditingCell = true;
    disableRowDragging();
    
    const currentValue = cell.textContent.trim();
    
    cell.classList.add('cell-editing', 'material-cell-editing');
    cell.dataset.originalValue = currentValue;
    
    // 자재 선택 UI 표시
    showMaterialSelector(cell, wallId, field, currentValue);
}

function showMaterialSelector(container, wallId, field, currentValue) {
    // ID 기반 자재 선택 콤보박스 시스템 사용
    const materialFields = [
        'layer3_1', 'layer2_1', 'layer1_1', 'column1', 'infill', 
        'layer1_2', 'layer2_2', 'layer3_2', 'column2', 'channel', 
        'runner', 'steelPlate'
    ];

    if (!materialFields.includes(field)) {
        // 자재 필드가 아닌 경우 일반 텍스트 입력 유지
        container.innerHTML = `
            <input type="text" 
                   value="${currentValue}" 
                   onblur="finishMaterialCellEdit(this, ${wallId}, '${field}', '${currentValue}')"
                   onkeypress="handleMaterialCellEditKeypress(event, this, ${wallId}, '${field}', '${currentValue}')"
                   style="width: 100%; border: none; background: transparent; font-size: inherit;"
                   placeholder="자재명 입력"
                   autofocus />
        `;
        
        const input = container.querySelector('input');
        input.focus();
        input.select();
        return;
    }

    // 자재 선택 콤보박스 HTML 생성
    container.innerHTML = `
        <div class="material-selector-container" style="position: relative; width: 100%;">
            <select class="material-selector" style="width: 100%; padding: 4px; border: 2px solid #007bff; font-size: inherit; font-family: inherit;">
                <option value="">자재를 선택하세요...</option>
                <option value="LOAD_MATERIALS" data-loading="true">📋 자재 목록 로딩...</option>
            </select>
            <input type="hidden" class="material-id-input" value="">
            <input type="text" class="custom-material-input" style="display: none; width: 100%; padding: 4px; border: 2px solid #28a745; font-size: inherit; font-family: inherit;" placeholder="새 자재명을 입력하세요...">
        </div>
    `;
    
    const selectElement = container.querySelector('.material-selector');
    const hiddenInput = container.querySelector('.material-id-input');
    const customInput = container.querySelector('.custom-material-input');
    
    // 자재 옵션 로드
    loadMaterialOptions(selectElement, currentValue);
    
    // 이벤트 리스너 설정
    setupMaterialSelectorEvents(selectElement, hiddenInput, customInput, wallId, field, currentValue);
}

// 자재 옵션 로드 함수
async function loadMaterialOptions(selectElement, currentValue = '') {
    try {
        // 로딩 상태 표시
        selectElement.innerHTML = '<option value="">📋 자재 로딩 중...</option>';
        
        // priceDatabase.js에서 자재 데이터 로드
        let materials = [];
        
        if (window.priceDB) {
            const lightweightComponents = window.priceDB.getLightweightComponents();
            const gypsumBoards = window.priceDB.getGypsumBoards();
            
            // 경량부품 변환
            lightweightComponents.items.forEach(item => {
                materials.push({
                    id: item.id,
                    name: item.name,
                    category: lightweightComponents.categories[item.category]?.name || item.category,
                    subcategory: item.spec || 'default',
                    unit: item.unit,
                    materialPrice: item.price,
                    spec: item.spec
                });
            });
            
            // 석고보드 변환
            gypsumBoards.items.forEach(item => {
                const price = item.priceChanged || item.priceOriginal;
                materials.push({
                    id: item.id,
                    name: `${item.name} ${item.w}x${item.h}x${item.t}`,
                    category: gypsumBoards.categories[item.category]?.name || item.category,
                    subcategory: `${item.w}x${item.h}x${item.t}`,
                    unit: item.unit,
                    materialPrice: price,
                    dimensions: `${item.w}x${item.h}x${item.t}`
                });
            });
        } else {
            throw new Error('priceDatabase.js를 찾을 수 없습니다.');
        }
        const grouped = groupMaterialsByCategory(materials);

        // 옵션 HTML 생성
        let optionsHTML = '<option value="">자재를 선택하세요...</option>';
        optionsHTML += '<option value="CUSTOM_INPUT" data-custom="true" style="background-color: #e8f5e8; font-weight: bold;">✏️ 직접 입력하기</option>';
        optionsHTML += '<option disabled>──────────────────</option>';

        Object.keys(grouped).forEach(categoryKey => {
            const categoryInfo = getMaterialCategoryInfo(categoryKey);
            const subcategories = grouped[categoryKey];

            // 카테고리 그룹 시작
            optionsHTML += `<optgroup label="${categoryInfo.name}">`;

            Object.keys(subcategories).forEach(subcategoryKey => {
                const subcategoryMaterials = subcategories[subcategoryKey];

                // 서브카테고리별 자재 추가
                subcategoryMaterials.forEach(material => {
                    const isSelected = material.name === currentValue ? 'selected' : '';
                    optionsHTML += `
                        <option value="${material.name}" 
                                data-id="${material.id}" 
                                data-price="${material.materialPrice || 0}"
                                data-unit="${material.unit || ''}"
                                title="${material.spec || material.dimensions || material.name}"
                                ${isSelected}>
                            ${material.name} (${material.materialPrice?.toLocaleString() || 0}원/${material.unit || '단위'})
                        </option>
                    `;
                });
            });

            optionsHTML += '</optgroup>';
        });

        selectElement.innerHTML = optionsHTML;
        console.log(`✅ 콤보박스에 ${materials.length}개 자재 옵션 추가 완료 (priceDatabase.js 사용)`);

    } catch (error) {
        console.error('❌ 자재 옵션 생성 실패:', error);
        selectElement.innerHTML = '<option value="">❌ 자재 로딩 실패</option>';
    }
}

// 자재 카테고리별 그룹화
function groupMaterialsByCategory(materials) {
    const grouped = {};
    
    materials.forEach(material => {
        const category = material.category || 'other';
        const subcategory = material.subcategory || 'default';
        
        if (!grouped[category]) {
            grouped[category] = {};
        }
        if (!grouped[category][subcategory]) {
            grouped[category][subcategory] = [];
        }
        
        grouped[category][subcategory].push(material);
    });

    return grouped;
}

// 자재 카테고리 정보 반환
function getMaterialCategoryInfo(categoryKey) {
    const categories = {
        'board': {
            name: '보드류',
            subcategories: {
                'gypsum': '석고보드',
                'calcium-silicate': '규산칼슘보드', 
                'cement': '시멘트보드',
                'fiber-cement': '섬유시멘트보드'
            }
        },
        'stud': {
            name: '스터드',
            subcategories: {
                'metal': '금속스터드',
                'wood': '목재스터드'
            }
        },
        'insulation': {
            name: '단열재',
            subcategories: {
                'glasswool': '글라스울',
                'rockwool': '암면'
            }
        },
        'frame': {
            name: '프레임',
            subcategories: {
                'runner': '러너',
                'channel': '채널',
                'support': '가로받침'
            }
        },
        'steel': {
            name: '철강재',
            subcategories: {
                'galvanized': '아연도금강판',
                'structural': '구조용강재'
            }
        }
    };
    
    return categories[categoryKey] || { name: categoryKey };
}

// 자재 선택 이벤트 설정
function setupMaterialSelectorEvents(selectElement, hiddenInput, customInput, wallId, field, originalValue) {
    // 선택 변경 이벤트
    selectElement.addEventListener('change', (event) => {
        const selectedOption = event.target.selectedOptions[0];
        
        if (selectedOption && selectedOption.value) {
            // 직접 입력 옵션 선택 시
            if (selectedOption.value === 'CUSTOM_INPUT') {
                showCustomMaterialInput(selectElement, customInput, wallId, field, originalValue);
                return;
            }

            const materialId = selectedOption.dataset.id;
            const materialName = selectedOption.value;
            
            // ID 설정
            if (hiddenInput) {
                hiddenInput.value = materialId || '';
            }

            // 자재 선택 완료
            finishMaterialSelection(selectElement.closest('.material-selector-container'), wallId, field, materialName, materialId);
            
            console.log(`🔗 자재 선택: ${materialName} (ID: ${materialId})`);
        }
    });

    // 포커스 아웃 이벤트
    selectElement.addEventListener('blur', () => {
        const selectedValue = selectElement.value;
        if (selectedValue && selectedValue !== 'CUSTOM_INPUT') {
            const selectedOption = selectElement.selectedOptions[0];
            const materialId = selectedOption?.dataset.id || '';
            finishMaterialSelection(selectElement.closest('.material-selector-container'), wallId, field, selectedValue, materialId);
        }
    });

    // 키보드 이벤트 (Enter, Escape)
    selectElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const selectedValue = selectElement.value;
            if (selectedValue && selectedValue !== 'CUSTOM_INPUT') {
                const selectedOption = selectElement.selectedOptions[0];
                const materialId = selectedOption?.dataset.id || '';
                finishMaterialSelection(selectElement.closest('.material-selector-container'), wallId, field, selectedValue, materialId);
            }
            event.preventDefault();
        } else if (event.key === 'Escape') {
            // 편집 취소
            cancelMaterialSelection(selectElement.closest('.material-selector-container'), originalValue);
            event.preventDefault();
        }
    });
}

// 직접 입력 모드 표시
function showCustomMaterialInput(selectElement, customInput, wallId, field, originalValue) {
    if (!customInput) return;

    // 콤보박스 숨기고 텍스트 입력 표시
    selectElement.style.display = 'none';
    customInput.style.display = 'block';
    customInput.focus();

    // 기존 이벤트 리스너 제거
    const newCustomInput = customInput.cloneNode(true);
    customInput.parentNode.replaceChild(newCustomInput, customInput);

    // 텍스트 입력 이벤트 핸들러
    const handleCustomInput = (isCancel = false) => {
        if (isCancel) {
            // 취소 - 콤보박스로 돌아가기
            cancelMaterialSelection(selectElement.closest('.material-selector-container'), originalValue);
            return;
        }

        const customName = newCustomInput.value.trim();
        if (customName) {
            // 사용자 지정 이름으로 완료
            finishMaterialSelection(selectElement.closest('.material-selector-container'), wallId, field, customName, null);
            console.log(`✏️ 사용자 지정 자재: ${customName}`);
        } else {
            // 빈 값이면 취소로 처리
            handleCustomInput(true);
        }
    };

    // Enter 키로 완료
    newCustomInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCustomInput(false);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCustomInput(true);
        }
    });

    // 포커스 아웃으로 완료
    newCustomInput.addEventListener('blur', () => {
        handleCustomInput(false);
    });

    console.log('✏️ 직접 입력 모드 활성화');
}

// 자재 선택 완료
function finishMaterialSelection(container, wallId, field, materialName, materialId) {
    const parentCell = container.closest('.material-cell');
    
    // 벽체 데이터 업데이트 (토스트 메시지 없이)
    updateWallFieldSilent(wallId, field, materialName);
    
    // 자재 ID도 별도로 저장 (향후 확장용)
    if (materialId) {
        // 자재 ID 매핑 저장 로직 추가 가능
        console.log(`저장된 자재 ID: ${field} -> ${materialId}`);
    }
    
    // 셀 내용 복원
    parentCell.textContent = materialName;
    parentCell.classList.remove('cell-editing', 'material-cell-editing');
    
    // 자재가 선택되었음을 표시
    if (materialName.trim()) {
        parentCell.classList.add('material-cell-completed');
    } else {
        parentCell.classList.remove('material-cell-completed');
    }
    
    // 편집 상태 해제
    isEditingCell = false;
    enableRowDragging();
}

// 자재 선택 취소
function cancelMaterialSelection(container, originalValue) {
    const parentCell = container.closest('.material-cell');
    
    // 원래 값으로 복원
    parentCell.textContent = originalValue;
    parentCell.classList.remove('cell-editing', 'material-cell-editing');
    
    // 편집 상태 해제
    isEditingCell = false;
    enableRowDragging();
}

function finishMaterialCellEdit(input, wallId, field, originalValue) {
    if (!isEditingCell) return;
    
    const container = input.parentElement;
    const newValue = input.value.trim();
    
    // 벽체 데이터 업데이트 (토스트 메시지 없이)
    updateWallFieldSilent(wallId, field, newValue);
    
    // 셀 스타일 업데이트
    const hasValue = newValue && newValue.trim() !== '';
    container.classList.remove('cell-editing', 'material-cell-editing');
    
    if (hasValue) {
        container.classList.add('material-cell-completed');
        container.classList.remove('material-cell-custom');
    } else {
        container.classList.remove('material-cell-completed', 'material-cell-custom');
    }
    
    // 셀 내용 복원
    container.textContent = newValue;
    
    // 편집 종료
    isEditingCell = false;
    enableRowDragging();
    
    // 즉시 테이블 렌더링
    if (typeof renderTable === 'function') {
        renderTable();
    }
    
    // 성공 메시지
    if (typeof showToast === 'function' && newValue !== originalValue) {
        showToast(`자재 정보가 업데이트되었습니다: ${newValue}`, 'success');
    }
}

function handleMaterialCellEditKeypress(event, input, wallId, field, originalValue) {
    if (event.key === 'Enter') {
        finishMaterialCellEdit(input, wallId, field, originalValue);
    } else if (event.key === 'Escape') {
        // 취소
        const container = input.parentElement;
        container.textContent = originalValue;
        container.classList.remove('cell-editing', 'material-cell-editing');
        isEditingCell = false;
        enableRowDragging();
    }
}

// =============================================================================
// 벽체 행 편집/삭제 기능
// =============================================================================

async function editWallRow(wallId) {
    try {
        // API에서 벽체 데이터 조회
        const wall = await window.priceDB.getWallById(wallId);
        if (!wall) {
            console.error('벽체를 찾을 수 없습니다:', wallId);
            showToast('벽체를 찾을 수 없습니다.', 'error');
            return;
        }

        // 벽체 편집 모달 표시
        showWallEditModal(wall);
    } catch (error) {
        console.error('벽체 조회 오류:', error);
        showToast('벽체 조회 중 오류가 발생했습니다.', 'error');
    }
}

async function deleteWallRow(wallId) {
    try {
        // API에서 벽체 데이터 조회
        const wall = await window.priceDB.getWallById(wallId);
        if (!wall) {
            console.error('벽체를 찾을 수 없습니다:', wallId);
            showToast('벽체를 찾을 수 없습니다.', 'error');
            return;
        }

        // 삭제 확인 모달 표시
        const content = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; color: #dc2626; margin-bottom: 16px;">
                    ⚠️
                </div>
                <h3 style="margin-bottom: 16px; color: #1f2937;">벽체 삭제 확인</h3>
                <p style="margin-bottom: 8px; color: #4b5563;">다음 벽체를 삭제하시겠습니까?</p>
                <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
                    <strong style="color: #1f2937;">${wall.wallType || wall.name}</strong>
                    <br>
                    <span style="color: #6b7280; font-size: 14px;">면적: ${wall.area || 0}m²</span>
            </div>
            <p style="color: #dc2626; font-size: 14px; margin-top: 16px;">
                <strong>주의:</strong> 삭제된 데이터는 복구할 수 없습니다.
            </p>
        </div>
    `;

    createModal('벽체 삭제', content, [
        { 
            text: '취소', 
            class: 'btn-secondary', 
            onClick: (modal) => modal.remove() 
        },
        { 
            text: '삭제', 
            class: 'btn-danger', 
            onClick: async (modal) => {
                await performWallDeletion(wallId);
                modal.remove();
            }
        }
    ]);
    } catch (error) {
        console.error('벽체 삭제 모달 표시 오류:', error);
        showToast('벽체 삭제 준비 중 오류가 발생했습니다.', 'error');
    }
}

async function performWallDeletion(wallId) {
    try {
        // API에서 벽체 삭제
        await window.priceDB.deleteWall(wallId);
        
        // 로컬 데이터에서도 제거 (UI 동기화)
        Kiyeno.Data.selectedRows.delete(wallId);
        
        // 벽체 데이터에서 제거
        const index = Kiyeno.Data.wallData.findIndex(w => w.id === wallId);
        if (index !== -1) {
            const deletedWall = Kiyeno.Data.wallData.splice(index, 1)[0];
            
            // 번호 재정렬
            Kiyeno.Data.wallData.forEach((wall, i) => {
                wall.no = i + 1;
            });
            
            // UI 렌더링
            renderTable();
            updateSelectionInfo();
            
            // 성공 메시지
            if (typeof showToast === 'function') {
                showToast(`벽체가 삭제되었습니다: ${deletedWall.wallType || deletedWall.name}`, 'success');
            }
            
            console.log(`✅ 벽체 삭제 완료: ${deletedWall.wallType || deletedWall.name} (ID: ${wallId})`);
        }
    } catch (error) {
        console.error('❌ 벽체 삭제 실패:', error);
        if (typeof showToast === 'function') {
            showToast('벽체 삭제에 실패했습니다.', 'error');
        }
    }
}

function showWallEditModal(wall) {
    const content = `
        <div class="wall-edit-form" style="max-width: 600px;">
            <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600;">벽체 타입</label>
                    <input type="text" id="editWallType" value="${wall.wallType}" 
                           style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600;">면적 (m²)</label>
                    <input type="number" id="editArea" value="${wall.area}" step="0.01"
                           style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600;">두께 (mm)</label>
                    <input type="number" id="editThickness" value="${wall.thickness || ''}" 
                           style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 600;">내화구조</label>
                    <input type="text" id="editFire" value="${wall.fire || ''}" 
                           style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                </div>
            </div>
            
            <h4 style="margin: 24px 0 12px 0; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
                🔧 자재 구성
            </h4>
            <div class="materials-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Layer3_1</label>
                    <input type="text" id="editLayer3_1" value="${wall.layer3_1 || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Column1</label>
                    <input type="text" id="editColumn1" value="${wall.column1 || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Infill</label>
                    <input type="text" id="editInfill" value="${wall.infill || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Layer3_2</label>
                    <input type="text" id="editLayer3_2" value="${wall.layer3_2 || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Column2</label>
                    <input type="text" id="editColumn2" value="${wall.column2 || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Channel</label>
                    <input type="text" id="editChannel" value="${wall.channel || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Runner</label>
                    <input type="text" id="editRunner" value="${wall.runner || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Steel Plate</label>
                    <input type="text" id="editSteelPlate" value="${wall.steelPlate || ''}" 
                           style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px;">
                </div>
            </div>
        </div>
    `;

    createModal('벽체 편집', content, [
        { 
            text: '취소', 
            class: 'btn-secondary', 
            onClick: (modal) => modal.remove() 
        },
        { 
            text: '저장', 
            class: 'btn-primary', 
            onClick: (modal) => {
                saveWallEdit(wall.id);
                modal.remove();
            }
        }
    ]);
}

function saveWallEdit(wallId) {
    try {
        const wall = Kiyeno.Data.wallData.find(w => w.id === wallId);
        if (!wall) {
            throw new Error('벽체를 찾을 수 없습니다.');
        }

        // 폼 데이터 수집
        const formData = {
            wallType: document.getElementById('editWallType')?.value.trim() || '',
            area: parseFloat(document.getElementById('editArea')?.value) || 0,
            thickness: parseFloat(document.getElementById('editThickness')?.value) || null,
            fire: document.getElementById('editFire')?.value.trim() || '',
            layer3_1: document.getElementById('editLayer3_1')?.value.trim() || '',
            column1: document.getElementById('editColumn1')?.value.trim() || '',
            infill: document.getElementById('editInfill')?.value.trim() || '',
            layer3_2: document.getElementById('editLayer3_2')?.value.trim() || '',
            column2: document.getElementById('editColumn2')?.value.trim() || '',
            channel: document.getElementById('editChannel')?.value.trim() || '',
            runner: document.getElementById('editRunner')?.value.trim() || '',
            steelPlate: document.getElementById('editSteelPlate')?.value.trim() || ''
        };

        // 필수 필드 검증
        if (!formData.wallType) {
            throw new Error('벽체 타입을 입력해주세요.');
        }
        if (!formData.area || formData.area <= 0) {
            throw new Error('올바른 면적을 입력해주세요.');
        }

        // 데이터 업데이트
        Object.assign(wall, formData);
        wall.lastModified = new Date().toISOString();

        // 저장 및 렌더링
        saveWallData();
        renderTable();

        // 성공 메시지
        if (typeof showToast === 'function') {
            showToast(`벽체 정보가 수정되었습니다: ${wall.wallType}`, 'success');
        }

        console.log(`✅ 벽체 편집 완료: ${wall.wallType} (ID: ${wallId})`);

    } catch (error) {
        console.error('❌ 벽체 편집 실패:', error);
        if (typeof showToast === 'function') {
            showToast(`편집 실패: ${error.message}`, 'error');
        }
    }
}

// =============================================================================
// 행 선택 관리
// =============================================================================

function toggleRowSelection(event, wallId) {
    event.stopPropagation();
    
    if (Kiyeno.Data.selectedRows.has(wallId)) {
        Kiyeno.Data.selectedRows.delete(wallId);
    } else {
        Kiyeno.Data.selectedRows.add(wallId);
    }
    
    updateRowSelection(wallId);
    updateSelectionInfo();
}

function handleRowClick(event, wallId) {
    if (event.target.type === 'checkbox' || event.target.closest('.btn-detail')) {
        return;
    }
    
    toggleRowSelection(event, wallId);
}

function updateRowSelection(wallId) {
    const row = document.querySelector(`tr[data-wall-id="${wallId}"]`);
    const checkbox = row?.querySelector('.row-checkbox');
    
    if (row && checkbox) {
        const isSelected = Kiyeno.Data.selectedRows.has(wallId);
        checkbox.checked = isSelected;
        
        if (isSelected) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    }
}

function updateSelectionInfo() {
    const selectedCount = Kiyeno.Data.selectedRows.size;
    const totalCount = Kiyeno.Data.wallData.length;
    const selectedWalls = Kiyeno.Data.getSelectedWalls();
    
    // 선택된 벽체 타입들
    const wallTypes = new Set(selectedWalls.map(wall => wall.wallType));
    const typeCount = wallTypes.size;
    
    // 총 면적 계산
    const totalArea = selectedWalls.reduce((sum, wall) => {
        return sum + (parseFloat(wall.area) || 0);
    }, 0);
    
    const infoElement = document.getElementById('selectionInfo');
    if (infoElement) {
        if (selectedCount === 0) {
            infoElement.textContent = `총 ${totalCount}개 벽체`;
        } else {
            infoElement.textContent = `${selectedCount}개 선택 | ${typeCount}개 타입 | 총 면적: ${totalArea.toFixed(3)}m²`;
        }
    }
}

// =============================================================================
// 필터링 및 정렬
// =============================================================================

function getFilteredData(data) {
    // 필터링 기능 제거 - 모든 데이터 반환
    return data;
}

function getSortedData(data) {
    if (!sortConfig.field) return data;
    
    return [...data].sort((a, b) => {
        let aVal = a[sortConfig.field] || '';
        let bVal = b[sortConfig.field] || '';
        
        // 숫자 필드인 경우 숫자로 비교
        if (['no', 'area', 'thickness'].includes(sortConfig.field)) {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        }
        
        let result = 0;
        if (aVal < bVal) result = -1;
        if (aVal > bVal) result = 1;
        
        return sortConfig.direction === 'desc' ? -result : result;
    });
}

// =============================================================================
// 드래그 앤 드롭 (행 재정렬)
// =============================================================================

function enableRowDragging() {
    // 간단한 구현 - 필요시 확장
    console.log('드래그 기능 활성화');
}

function disableRowDragging() {
    // 간단한 구현 - 필요시 확장
    console.log('드래그 기능 비활성화');
}

// =============================================================================
// 토스트 메시지
// =============================================================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =============================================================================
// 모달 창 생성
// =============================================================================

function createModal(title, content, buttons = []) {
    // 기존 모달 제거
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999999 !important;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        position: relative;
    `;
    
    const modalHeader = document.createElement('div');
    modalHeader.innerHTML = `
        <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">${title}</h3>
    `;
    
    const modalContent = document.createElement('div');
    modalContent.innerHTML = content;
    
    const modalFooter = document.createElement('div');
    modalFooter.style.cssText = 'margin-top: 20px; display: flex; gap: 8px; justify-content: flex-end;';
    
    // 기본 닫기 버튼이 없으면 추가
    if (buttons.length === 0) {
        buttons.push({
            text: '닫기',
            class: 'btn-secondary',
            onClick: (modal) => modal.remove()
        });
    }
    
    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.textContent = button.text;
        btn.className = button.class || 'btn-primary';
        btn.style.cssText = `
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            ${button.class === 'btn-secondary' ? 
                'background: #6b7280; color: white;' : 
                'background: #3b82f6; color: white;'}
        `;
        btn.onclick = () => button.onClick(modalOverlay);
        modalFooter.appendChild(btn);
    });
    
    modal.appendChild(modalHeader);
    modal.appendChild(modalContent);
    modal.appendChild(modalFooter);
    modalOverlay.appendChild(modal);
    
    // 클릭 외부 영역 클릭 시 닫기
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    };
    
    document.body.appendChild(modalOverlay);
    return modalOverlay;
}

// =============================================================================
// 서브 모달 (자재 관리 내부에서 사용)
// =============================================================================

function createSubModal(title, content, buttons = [], options = {}) {
    // 기존 자재 관리 모달을 비활성화 처리 (blur 대신 투명도 조절)
    const materialModal = document.querySelector('.modal-overlay .modal');
    if (materialModal) {
        materialModal.style.opacity = '0.3';
        materialModal.style.pointerEvents = 'none';
        // stacking context 문제를 방지하기 위해 blur 효과 제거
        const modalOverlay = materialModal.closest('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.zIndex = '8000';
        }
    }
    
    // 서브 모달 오버레이 생성
    const subModalOverlay = document.createElement('div');
    subModalOverlay.className = 'sub-modal-overlay';
    subModalOverlay.style.cssText = `
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999999 !important;
    `;
    
    // 서브 모달 생성
    const subModal = document.createElement('div');
    subModal.className = 'sub-modal';
    subModal.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 90vw;
        max-height: 90vh;
        overflow: auto;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        border: 2px solid #007bff;
    `;
    
    // 제목 추가
    if (title) {
        const titleElement = document.createElement('h3');
        titleElement.style.cssText = `
            margin: 0 0 16px 0;
            color: #333;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 12px;
        `;
        titleElement.textContent = title;
        subModal.appendChild(titleElement);
    }
    
    // 내용 추가
    const contentElement = document.createElement('div');
    contentElement.className = 'sub-modal-content';
    contentElement.innerHTML = content;
    subModal.appendChild(contentElement);
    
    // 버튼 컨테이너 추가
    if (buttons.length > 0) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #eee;
        `;
        
        buttons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.innerHTML = buttonConfig.text; // textContent → innerHTML 변경
            button.className = `btn ${buttonConfig.class || 'btn-primary'}`;
            button.style.cssText = `
                padding: 8px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            `;

            if (buttonConfig.onClick) {
                button.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    buttonConfig.onClick(subModalOverlay);
                });
            }

            buttonContainer.appendChild(button);
        });
        
        subModal.appendChild(buttonContainer);
    }
    
    subModalOverlay.appendChild(subModal);
    
    // 옵션에 따라 외부 클릭으로 닫기 설정
    if (!options.disableBackgroundClick) {
        subModalOverlay.addEventListener('click', (e) => {
            if (e.target === subModalOverlay) {
                closeSubModal(subModalOverlay);
            }
        });
    }
    
    // 옵션에 따라 ESC 키로 닫기 설정
    if (!options.disableEscapeKey) {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeSubModal(subModalOverlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }
    
    document.body.appendChild(subModalOverlay);
    
    return subModalOverlay;
}

// createSubModal 함수를 전역에 노출
window.createSubModal = createSubModal;

// 서브 모달 닫기 (배경 모달 복원)
function closeSubModal(subModalOverlay) {
    // 배경 자재 관리 모달 복원
    const materialModal = document.querySelector('.modal-overlay .modal');
    if (materialModal) {
        materialModal.style.opacity = '1';
        materialModal.style.pointerEvents = 'auto';
        // z-index도 원래대로 복원
        const modalOverlay = materialModal.closest('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.style.zIndex = '9999999';
        }
    }
    
    // 서브 모달 제거
    if (subModalOverlay && subModalOverlay.parentNode) {
        subModalOverlay.remove();
    }
}

// closeSubModal 함수를 전역에 노출
window.closeSubModal = closeSubModal;

// =============================================================================
// 상세내역 모달
// =============================================================================

function showWallDetailBreakdown(wallId) {
    try {
        const wall = Kiyeno.Data.wallData.find(w => w.id === wallId);
        if (!wall) {
            showToast('벽체를 찾을 수 없습니다.', 'error');
            return;
        }

        console.log(`🔍 벽체 상세내역 요청: ID ${wallId}`);
        console.log(`✅ 벽체 발견:`, wall);

        // 계산기 확인
        let calculator = null;
        if (window.Kiyeno && window.Kiyeno.Calculator) {
            calculator = window.Kiyeno.Calculator;
        } else if (window.calculateWallBreakdown) {
            // 전역 함수 사용
            const result = window.calculateWallBreakdown(wall);
            if (result && result.then) {
                result.then(data => showBreakdownModal(wall, data))
                      .catch(error => showErrorBreakdownModal(wall, error));
                return;
            }
        }

        if (!calculator) {
            showToast('상세내역 계산기를 사용할 수 없습니다.', 'error');
            return;
        }

        console.log(`🧮 상세내역 계산 시작...`);
        
        calculator.calculateWallBreakdown(wall).then(result => {
            console.log(`✅ 계산 완료:`, result);
            showBreakdownModal(wall, result);
        }).catch(error => {
            console.error('❌ 상세내역 계산 실패:', error);
            showErrorBreakdownModal(wall, error);
        });

    } catch (error) {
        console.error('❌ showWallDetailBreakdown 오류:', error);
        showToast('상세내역을 표시할 수 없습니다.', 'error');
    }
}

function showBreakdownModal(wall, result) {
    const totals = result.totals || {};
    const components = result.components || [];
    
    const materialCost = totals.materialCost || 0;
    const laborCost = totals.laborCost || 0;
    const expenseCost = totals.expenseCost || 0;
    const totalCost = totals.totalCost || 0;
    
    console.log('모달 표시 데이터:', { wall, result, totals, components });
    
    let componentTable = '<p style="color: #6c757d; text-align: center; padding: 20px;">구성요소 정보가 없습니다.</p>';
    
    if (components && components.length > 0) {
        const tableRows = components.map((comp, index) => {
            const compName = comp.componentName || `구성요소 ${index + 1}`;
            const quantity = comp.quantity || 0;
            const unit = comp.unit || 'EA';
            const materialPrice = comp.unitMaterialPrice || 0;
            const laborPrice = comp.unitLaborPrice || 0;
            const expensePrice = comp.unitExpensePrice || 0;
            const matCost = comp.totalMaterialCost || 0;
            const labCost = comp.totalLaborCost || 0;
            const expCost = comp.totalExpenseCost || 0;
            const subtotal = matCost + labCost + expCost;
            
            return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px; font-weight: 500;">${compName}</td>
                    <td style="padding: 12px; text-align: center;">${quantity.toFixed(3)}</td>
                    <td style="padding: 12px; text-align: center;">${unit}</td>
                    <td style="padding: 12px; text-align: right;">₩${materialPrice.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600;">₩${matCost.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right;">₩${laborPrice.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600;">₩${labCost.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right;">₩${expensePrice.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600;">₩${expCost.toLocaleString()}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #dc2626;">₩${subtotal.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
        
        componentTable = `
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <thead>
                    <tr style="background: #f3f4f6;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">구성요소명</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d1d5db;">수량</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d1d5db;">단위</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">자재단가</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">자재금액</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">노무단가</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">노무금액</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">경비단가</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">경비금액</th>
                        <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">소계</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
                <tfoot>
                    <tr style="background: #f9fafb; border-top: 2px solid #3b82f6; font-weight: 600;">
                        <td colspan="4" style="padding: 12px; font-weight: 600;">총계</td>
                        <td style="padding: 12px; text-align: right; color: #dc2626;">₩${materialCost.toLocaleString()}</td>
                        <td style="padding: 12px; text-align: right;">-</td>
                        <td style="padding: 12px; text-align: right; color: #dc2626;">₩${laborCost.toLocaleString()}</td>
                        <td style="padding: 12px; text-align: right;">-</td>
                        <td style="padding: 12px; text-align: right; color: #dc2626;">₩${expenseCost.toLocaleString()}</td>
                        <td style="padding: 12px; text-align: right; font-weight: 700; color: #1e40af; font-size: 16px;">₩${totalCost.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }
    
    const content = `
        <div class="breakdown-modal-container" data-wall-id="${wall.id}">
            <h3>📋 ${wall.wallType} 상세내역</h3>
            <div style="margin: 16px 0;">
                <p><strong>면적:</strong> ${wall.area}m²</p>
            </div>
            <div>
                <h4>🔧 구성요소 상세내역</h4>
                ${componentTable}
            </div>
        </div>
    `;
    
    createModal('상세내역', content);
}

function showErrorBreakdownModal(wall, error) {
    const content = `
        <div>
            <h3>📋 ${wall.wallType} 상세내역</h3>
            <div style="color: #dc2626; margin: 16px 0;">
                <p><strong>오류:</strong> 상세내역을 계산할 수 없습니다.</p>
                <p style="font-size: 14px; color: #6b7280;">${error.message || '알 수 없는 오류'}</p>
            </div>
        </div>
    `;
    
    createModal('계산 오류', content, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => modal.remove() },
        { text: '다시 시도', class: 'btn-primary', onClick: (modal) => {
            modal.remove();
            showWallDetailBreakdown(wall.id);
        }}
    ]);
}

// =============================================================================
// 이벤트 리스너 설정
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 UI 모듈 초기화 시작...');
    
    // 필터 이벤트 설정 제거됨 (필터 기능 삭제로 인해)
    
    // 전체 선택 체크박스
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            Kiyeno.Data.selectedRows.clear();
            
            if (isChecked) {
                Kiyeno.Data.wallData.forEach(wall => {
                    Kiyeno.Data.selectedRows.add(wall.id);
                });
            }
            
            renderTable();
        });
    }
    
    console.log('✅ UI 모듈 초기화 완료');
});

// =============================================================================
// 드롭다운 메뉴 관리
// =============================================================================

function toggleDropdown(dropdownId) {
    const dropdownMenu = document.getElementById(dropdownId);
    if (!dropdownMenu) return;
    
    // 모든 드롭다운 부모 요소에서 open 클래스 제거
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
    });
    
    // 현재 드롭다운의 부모 요소에 open 클래스 토글
    const parentDropdown = dropdownMenu.closest('.dropdown');
    if (parentDropdown) {
        parentDropdown.classList.add('open');
    }
}

// 문서 클릭 시 드롭다운 닫기
document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
});

// =============================================================================
// 기본 작업 함수들
// =============================================================================

function addWallType() {
    if (typeof Kiyeno.Core.Wall.addWallType === 'function') {
        Kiyeno.Core.Wall.addWallType();
    } else {
        console.error('addWallType 함수를 찾을 수 없습니다.');
        showToast('벽체 추가 기능을 사용할 수 없습니다.', 'error');
    }
    
    // 드롭다운 닫기
    document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
}

function duplicateWall() {
    if (typeof Kiyeno.Core.Wall.duplicateSelectedWalls === 'function') {
        const count = Kiyeno.Core.Wall.duplicateSelectedWalls();
        if (count === 0) {
            showToast('복사할 벽체를 선택해주세요.', 'warning');
        }
    } else {
        console.error('duplicateSelectedWalls 함수를 찾을 수 없습니다.');
        showToast('벽체 복사 기능을 사용할 수 없습니다.', 'error');
    }
    
    // 드롭다운 닫기
    document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
}

function deleteSelected() {
    if (Kiyeno.Data.selectedRows.size === 0) {
        showToast('삭제할 벽체를 선택해주세요.', 'warning');
        document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
        return;
    }
    
    if (confirm(`선택된 ${Kiyeno.Data.selectedRows.size}개 벽체를 삭제하시겠습니까?`)) {
        if (typeof Kiyeno.Core.Wall.deleteSelectedWalls === 'function') {
            Kiyeno.Core.Wall.deleteSelectedWalls();
        } else {
            console.error('deleteSelectedWalls 함수를 찾을 수 없습니다.');
            showToast('벽체 삭제 기능을 사용할 수 없습니다.', 'error');
        }
    }
    
    // 드롭다운 닫기
    document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
}

function clearCalculatedAreas() {
    if (confirm('모든 벽체의 계산된 면적을 초기화하시겠습니까?')) {
        // 면적 초기화 로직
        Kiyeno.Data.wallData.forEach(wall => {
            if (wall.area && !isNaN(wall.area)) {
                wall.area = '';
            }
        });
        
        Kiyeno.Data.markAsModified();
        renderTable();
        showToast('계산된 면적이 초기화되었습니다.', 'info');
    }
    
    // 드롭다운 닫기
    document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
}

function undo() {
    showToast('실행 취소 기능은 개발 중입니다.', 'info');
    document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
}

function resetToInitialData() {
    if (confirm('모든 데이터를 초기 상태로 되돌리시겠습니까?\n현재 작업 중인 데이터는 모두 삭제됩니다.')) {
        Kiyeno.Storage.clearAllData();
        showToast('데이터가 초기 상태로 되돌려졌습니다.', 'info');
    }
    document.getElementById('basicActions')?.closest('.dropdown')?.classList.remove('open');
}

function importData() {
    showDataManagementModal();
    document.getElementById('dataManagement')?.closest('.dropdown')?.classList.remove('open');
}

function showMaterialManageModal() {
    // app-services.js의 showMaterialManagementModal 함수 호출
    console.log('🔍 자재 관리 모달 호출 시도, 함수 타입:', typeof window.showMaterialManagementModal);
    console.log('🔍 window 객체의 해당 함수:', window.showMaterialManagementModal);
    
    if (typeof window.showMaterialManagementModal === 'function') {
        console.log('✅ showMaterialManagementModal 함수 발견, 호출 시작');
        window.showMaterialManagementModal();
    } else {
        console.error('❌ showMaterialManagementModal 함수를 찾을 수 없습니다.');
        console.error('💡 가능한 해결 방법: 페이지를 새로고침하여 스크립트를 다시 로드해주세요.');
    }
}

function showRevitDialog() {
    showRevitIntegrationModal();
}

// =============================================================================
// 전역 함수 등록
// =============================================================================

// 드롭다운 함수들
window.toggleDropdown = toggleDropdown;
window.addWallType = addWallType;
window.duplicateWall = duplicateWall;
window.deleteSelected = deleteSelected;
window.clearCalculatedAreas = clearCalculatedAreas;
window.undo = undo;
window.resetToInitialData = resetToInitialData;
window.importData = importData;
window.showMaterialManageModal = showMaterialManageModal;
window.showRevitDialog = showRevitDialog;

// UI 함수들
window.renderTable = renderTable;
window.showToast = showToast;
window.createModal = createModal;
window.showWallDetailBreakdown = showWallDetailBreakdown;
window.toggleRowSelection = toggleRowSelection;
window.handleRowClick = handleRowClick;
window.startCellEdit = startCellEdit;
window.finishCellEdit = finishCellEdit;
window.handleCellEditKeypress = handleCellEditKeypress;
window.startMaterialCellEdit = startMaterialCellEdit;
window.finishMaterialCellEdit = finishMaterialCellEdit;
window.handleMaterialCellEditKeypress = handleMaterialCellEditKeypress;

console.log('🚀 UI 모듈 로드 완료');