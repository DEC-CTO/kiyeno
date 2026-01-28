// =============================================================================
// Kiyeno 벽체 관리 시스템 - 자재 관리 모듈
// 자재 관리, 노무비 계산, 경량부품/석고보드 관리 전담 모듈
// =============================================================================

// =============================================================================
// 석고보드 편집 모달의 노무비 계산 전역 함수들
// =============================================================================

// 노무비 계산 함수
window.calculateGypsumLaborCost = function() {
    const workers = document.querySelectorAll('.worker-item');
    let totalCost = 0;
    let workerCount = workers.length;
    
    workers.forEach(worker => {
        const cost = parseFloat(worker.querySelector('.worker-cost').value.replace(/,/g, '')) || 0;
        totalCost += cost;
    });
    
    const baseLaborCost = workerCount > 0 ? Math.round(totalCost / workerCount) : 0;
    const productivity = parseFloat(document.getElementById('editLaborProductivity')?.value) || 0;
    const compensation = parseFloat(document.getElementById('editLaborCompensation')?.value) || 0;
    const finalCost = (productivity > 0 && compensation > 0) ? Math.round(baseLaborCost / productivity * (compensation / 100)) : 0;
    
    const totalElement = document.getElementById('totalLaborCost');
    const countElement = document.getElementById('workerCount');
    const baseElement = document.getElementById('baseLaborCost');
    const finalElement = document.getElementById('finalLaborCost');
    
    if (totalElement) totalElement.textContent = totalCost.toLocaleString();
    if (countElement) countElement.textContent = workerCount;
    if (baseElement) baseElement.textContent = baseLaborCost.toLocaleString();
    if (finalElement) finalElement.textContent = finalCost.toLocaleString() + '원';
    
    // M2 노무비 필드에 자동 업데이트
    const laborCostM2Element = document.getElementById('editGypsumLaborCostM2');
    const baseLaborCostElement = document.getElementById('editGypsumBaseLaborCost');
    if (laborCostM2Element) {
        laborCostM2Element.value = finalCost.toLocaleString();
    }
    if (baseLaborCostElement) {
        baseLaborCostElement.value = baseLaborCost.toLocaleString();
    }
    
    // 기본 정보 섹션의 노무비생산성과 노무비보할 필드에도 자동 업데이트
    const productivityDisplayElement = document.getElementById('editGypsumLaborProductivity');
    const compensationDisplayElement = document.getElementById('editGypsumLaborCompensation');
    
    if (productivityDisplayElement && productivity !== parseFloat(productivityDisplayElement.value)) {
        productivityDisplayElement.value = productivity;
    }
    if (compensationDisplayElement && compensation !== parseFloat(compensationDisplayElement.value)) {
        compensationDisplayElement.value = compensation;
    }
};

// 작업자 추가 함수
window.addGypsumWorker = function() {
    const workersList = document.getElementById('workersList');
    if (!workersList) return;
    
    const workerHTML = `
        <div class="worker-item" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <select class="worker-type" style="width: 80px; padding: 4px; border: 1px solid #d97706; border-radius: 4px; font-size: 12px;">
                <option value="반장">반장</option>
                <option value="조공" selected>조공</option>
                <option value="특별직">특별직</option>
                <option value="기타">기타</option>
            </select>
            <input type="text" class="worker-cost" value="220,000" 
                   style="flex: 1; padding: 4px; border: 1px solid #d97706; border-radius: 4px; font-size: 12px;" 
                   oninput="this.value = parseInt(this.value.replace(/,/g, '')) ? parseInt(this.value.replace(/,/g, '')).toLocaleString() : ''"
                   onchange="window.calculateGypsumLaborCost()">
            <button type="button" onclick="window.removeGypsumWorker(this)" 
                    style="padding: 4px 8px; background: #dc2626; color: white; border: none; border-radius: 4px; font-size: 11px;">삭제</button>
        </div>
    `;
    workersList.insertAdjacentHTML('beforeend', workerHTML);
    window.calculateGypsumLaborCost();
};

// 작업자 삭제 함수
window.removeGypsumWorker = function(buttonElement) {
    const workerItem = buttonElement.closest('.worker-item');
    if (workerItem) {
        workerItem.remove();
        window.calculateGypsumLaborCost();
    }
};

// 상단 생산성 필드에서 계산기로 동기화
window.syncProductivityToCalculator = function(value) {
    const calculatorProductivityElement = document.getElementById('editLaborProductivity');
    if (calculatorProductivityElement) {
        calculatorProductivityElement.value = value;
        window.calculateGypsumLaborCost();
    }
};

// 상단 보할 필드에서 계산기로 동기화
window.syncCompensationToCalculator = function(value) {
    const calculatorCompensationElement = document.getElementById('editLaborCompensation');
    if (calculatorCompensationElement) {
        calculatorCompensationElement.value = value;
        window.calculateGypsumLaborCost();
    }
};

// ========================================
// 경량자재용 노무비 계산 함수들
// ========================================

// 경량자재 노무비 계산
window.calculateLightweightLaborCost = function() {
    const workers = [];
    document.querySelectorAll('#workersList .worker-item').forEach(workerElement => {
        const type = workerElement.querySelector('.worker-type')?.value || '조공';
        const cost = parseInt(workerElement.querySelector('.worker-cost')?.value.replace(/,/g, '')) || 0;
        if (cost > 0) workers.push({ type, cost });
    });

    const workerCount = workers.length;
    const totalCost = workers.reduce((sum, worker) => sum + worker.cost, 0);
    
    const baseLaborCost = workerCount > 0 ? Math.round(totalCost / workerCount) : 0;
    const productivity = parseFloat(document.getElementById('editLightweightLaborProductivity')?.value) || 0;
    const compensation = parseFloat(document.getElementById('editLightweightLaborCompensation')?.value) || 0;
    const finalCost = (productivity > 0 && compensation > 0) ? Math.round(baseLaborCost / productivity * (compensation / 100)) : 0;
    
    // 경량자재용 표시 업데이트
    const totalElement = document.getElementById('lightweightTotalCost');
    const countElement = document.getElementById('lightweightWorkerCount');
    const baseLaborElement = document.getElementById('lightweightBaseLaborCost');
    const finalElement = document.getElementById('finalLightweightLaborCost');
    
    if (totalElement) totalElement.textContent = totalCost.toLocaleString();
    if (countElement) countElement.textContent = workerCount;
    if (baseLaborElement) baseLaborElement.textContent = baseLaborCost.toLocaleString();
    if (finalElement) finalElement.textContent = `${finalCost.toLocaleString()}원`;

    // 상단 노무비 필드에 자동 입력
    const laborCostElement = document.getElementById('editMaterialLaborCost');
    const baseLaborCostElement = document.getElementById('editMaterialBaseLaborCost');
    if (laborCostElement) {
        laborCostElement.value = finalCost.toLocaleString();
    }
    if (baseLaborCostElement) {
        baseLaborCostElement.value = baseLaborCost.toLocaleString();
    }
    
    // 기본 정보 섹션의 노무비생산성과 노무비보할 필드에도 자동 업데이트
    const productivityDisplayElement = document.getElementById('editMaterialLaborProductivity');
    const compensationDisplayElement = document.getElementById('editMaterialLaborCompensation');
    
    if (productivityDisplayElement && productivity !== parseFloat(productivityDisplayElement.value)) {
        productivityDisplayElement.value = productivity;
    }
    if (compensationDisplayElement && compensation !== parseFloat(compensationDisplayElement.value)) {
        compensationDisplayElement.value = compensation;
    }
};

// 경량자재용 작업자 추가
window.addLightweightWorker = function() {
    const workersList = document.getElementById('workersList');
    if (!workersList) return;
    
    const newWorkerDiv = document.createElement('div');
    newWorkerDiv.className = 'worker-item';
    newWorkerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';
    
    const currentIndex = workersList.children.length;
    newWorkerDiv.setAttribute('data-index', currentIndex);
    
    newWorkerDiv.innerHTML = `
        <select class="worker-type" style="width: 80px; padding: 4px; border: 1px solid #d97706; border-radius: 4px; font-size: 12px;">
            <option value="반장">반장</option>
            <option value="조공" selected>조공</option>
            <option value="특별직">특별직</option>
            <option value="기타">기타</option>
        </select>
        <input type="text" class="worker-cost" value="220,000" 
               style="flex: 1; padding: 4px; border: 1px solid #d97706; border-radius: 4px; font-size: 12px;" 
               oninput="this.value = parseInt(this.value.replace(/,/g, '')) ? parseInt(this.value.replace(/,/g, '')).toLocaleString() : ''"
               onchange="window.calculateLightweightLaborCost()">
        <button type="button" onclick="window.removeLightweightWorker(this)"
                style="padding: 2px 6px; background: #dc2626; color: white; border: none; border-radius: 3px; font-size: 11px; cursor: pointer;">삭제</button>
    `;
    
    workersList.appendChild(newWorkerDiv);
    window.calculateLightweightLaborCost();
};

// 경량자재용 작업자 제거
window.removeLightweightWorker = function(button) {
    const workerItem = button.closest('.worker-item');
    if (workerItem) {
        const workersList = document.getElementById('workersList');
        if (workersList && workersList.children.length > 1) {
            workerItem.remove();
            window.calculateLightweightLaborCost();
        } else {
            alert('최소 1명의 작업자가 필요합니다.');
        }
    }
};

// 경량자재 상단 생산성 필드에서 계산기로 동기화
window.syncProductivityToLightweightCalculator = function(value) {
    const calculatorProductivityElement = document.getElementById('editLightweightLaborProductivity');
    if (calculatorProductivityElement) {
        calculatorProductivityElement.value = value;
        window.calculateLightweightLaborCost();
    }
};

// 경량자재 상단 보할 필드에서 계산기로 동기화
window.syncCompensationToLightweightCalculator = function(value) {
    const calculatorCompensationElement = document.getElementById('editLightweightLaborCompensation');
    if (calculatorCompensationElement) {
        calculatorCompensationElement.value = value;
        window.calculateLightweightLaborCost();
    }
};

// =============================================================================
// 자재 관리 모달 및 메인 함수들
// =============================================================================

function showMaterialManagementModal() {
    // 디버깅을 위한 로그
    console.log('🔍 window.priceDB 상태:', window.priceDB);
    console.log('🔍 window.priceDatabase 상태:', window.priceDatabase);
    
    // priceDB가 초기화되지 않은 경우 대기
    if (!window.priceDB || !window.priceDB.loadSavedState) {
        console.warn('⚠️ priceDB가 아직 초기화되지 않았습니다.');
        
        // 최대 5초 동안 0.1초마다 확인
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkPriceDB = () => {
            attempts++;
            if (window.priceDB && window.priceDB.loadSavedState) {
                console.log('✅ priceDB 초기화 완료, 모달 표시');
                // 재귀 호출 대신 직접 모달 표시 로직 실행
                showMaterialManagementModalDirectly();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(checkPriceDB, 100);
            } else {
                console.error('❌ priceDB 초기화 타임아웃');
                showToast('데이터베이스 초기화에 실패했습니다. 페이지를 새로고침해 주세요.', 'error');
            }
        };
        
        showToast('데이터베이스 초기화 중...', 'info');
        setTimeout(checkPriceDB, 100);
        return;
    }
    
    // 실제 모달 표시 로직 실행
    showMaterialManagementModalDirectly();
}

// 실제 모달 표시 로직 (재귀 호출 방지용 분리 함수)
function showMaterialManagementModalDirectly() {
    // 저장된 상태 불러오기
    try {
        window.priceDB.loadSavedState();
    } catch (error) {
        console.error('loadSavedState 오류:', error);
    }
    
    const dataStatus = window.priceDB.getDataStatus();
    
    const content = `
        <div style="min-width: 1000px; max-height: 80vh;">
            <div class="material-modal-header" style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h4><i class="fas fa-database"></i> 자재 관리</h4>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 15px; color: white; font-weight: 500;">상태: ${dataStatus.status}</span>
                    </div>
                </div>
                
                
                <div style="display: flex; gap: 10px; margin-top: 15px; align-items: center; justify-content: space-between;">
                    <!-- 자재 유형 선택 탭 -->
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <button onclick="showLightweightMaterials()" id="lightweightTab" class="btn btn-gray btn-sm material-tab active">
                            <i class="fas fa-tools"></i> 벽체 경량 자재
                        </button>
                        <button onclick="showGypsumBoards()" id="gypsumTab" class="btn btn-outline-gray btn-sm material-tab">
                            <i class="fas fa-square"></i> 석고보드
                        </button>
                        <div style="margin-left: 15px; display: flex; gap: 5px;">
                            <button onclick="openMaterialEditModal('add')" class="btn btn-gray btn-sm" style="padding: 6px 12px;">
                                <i class="fas fa-plus"></i> 자재 추가
                            </button>
                        </div>
                    </div>
                    
                    <!-- 데이터 관리 드롭다운 -->
                    <div class="dropdown" style="position: relative;">
                        <button class="btn btn-sm btn-secondary dropdown-toggle" onclick="toggleDataManagementDropdown()" style="font-size: 12px;">
                            📊 데이터 관리 ▼
                        </button>
                        <div id="dataManagementDropdown" class="dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; z-index: 1000; background: white; border: 1px solid #ddd; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); min-width: 200px;">
                            <div class="dropdown-item" onclick="saveCurrentState()" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;">
                                💾 현재 상태 저장
                            </div>
                            <div class="dropdown-item" onclick="exportAllData()" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;">
                                📤 전체 데이터 내보내기
                            </div>
                            <div class="dropdown-item" onclick="importAllData()" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 12px;">
                                📥 전체 데이터 가져오기
                            </div>
                            <div class="dropdown-item" onclick="resetToOriginal()" style="padding: 8px 12px; cursor: pointer; color: #dc2626; font-size: 12px;">
                                🔄 원본으로 초기화
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            
            <!-- 자재 목록 테이블 컨테이너 -->
            <div id="materialTableContainer">
                <!-- 여기에 동적으로 테이블이 삽입됩니다 -->
            </div>
            
            <!-- 통계 정보 -->
            <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px;">
                    <span id="materialStats">자재 유형을 선택하세요</span>
                    <span id="materialTypeInfo">표준 자재 데이터베이스 관리</span>
                </div>
            </div>
        </div>
        
        <style>
            .material-tab {
                border: 1px solid #ddd;
                background: #f8f9fa;
                color: #6c757d;
                transition: all 0.2s;
            }
            .material-tab.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            .material-tab:hover {
                background: #e9ecef;
            }
            .material-tab.active:hover {
                background: #2563eb;
            }
        </style>
    `;
    
    createModal('자재 관리', content, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => modal.remove() }
    ]);
    
    // 기본으로 벽체 경량 자재 표시
    showLightweightMaterials();
}

async function loadStandardMaterials() {
    try {
        if (window.priceDB) {
            // priceDatabase.js 데이터가 이미 로드되어 있음을 확인
            const lightweightData = window.priceDB.getLightweightComponents();
            const gypsumData = window.priceDB.getGypsumBoards();
            
            if (lightweightData.items.length > 0 && gypsumData.items.length > 0) {
                showToast(`표준 자재가 이미 로드되어 있습니다. (경량부품: ${lightweightData.items.length}개, 석고보드: ${gypsumData.items.length}개)`, 'success');
                loadMaterialList(); // 자재 목록 새로고침
            } else {
                showToast('priceDatabase.js에서 자재 데이터를 찾을 수 없습니다.', 'error');
            }
        } else {
            showToast('priceDatabase.js가 로드되지 않았습니다.', 'error');
        }
    } catch (error) {
        console.error('표준 자재 확인 실패:', error);
        showToast('표준 자재 확인 실패', 'error');
    }
}

async function loadMaterialList() {
    try {
        // priceDatabase.js에서 모든 자재 데이터 가져오기
        let materials = [];
        
        // 1. priceDatabase.js에서 직접 가져오기 (우선순위)
        if (window.priceDB) {
            const lightweightComponents = window.priceDB.getLightweightComponents();
            const gypsumBoards = window.priceDB.getGypsumBoards();
            
            // 경량부품 변환
            lightweightComponents.items.forEach(item => {
                materials.push({
                    id: item.id,
                    name: item.name,
                    category: lightweightComponents.categories[item.category]?.name || item.category,
                    unit: item.unit,
                    materialPrice: item.price,
                    laborPrice: item.laborCost || 0, // 데이터베이스의 laborCost 사용
                    expensePrice: 0, // 경비는 별도 계산
                    totalPrice: item.price + (item.laborCost || 0),
                    spec: item.spec,
                    note: item.note
                });
            });
            
            // 석고보드 변환
            gypsumBoards.items.forEach(item => {
                const price = item.priceChanged || item.priceOriginal;
                materials.push({
                    id: item.id,
                    name: `${item.name} ${item.w}x${item.h}x${item.t}`,
                    category: gypsumBoards.categories[item.category]?.name || item.category,
                    unit: item.unit,
                    materialPrice: price,
                    laborPrice: Math.round(price * 0.6), // 자재비의 60%
                    expensePrice: Math.round(price * 0.15), // 자재비의 15%
                    totalPrice: price + Math.round(price * 0.6) + Math.round(price * 0.15),
                    dimensions: `${item.w}x${item.h}x${item.t}`,
                    priceM2: item.priceM2,
                    note: item.note
                });
            });
        }
        
        // 기존 IndexedDB 데이터는 사용하지 않음 - priceDatabase.js만 사용
        
        // 표준자재로드에서 테이블 컨테이너 찾기
        const container = document.getElementById('materialTableContainer');
        const tableBody = document.getElementById('materialTableBody');
        const materialStats = document.getElementById('materialStats');
        
        if (container) {
            // 표준자재로드에서는 경량부품과 동일한 테이블 구조 사용
            const tableHTML = `
                <div class="material-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <thead style="background: #f8f9fa; position: sticky; top: 0;">
                            <tr>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">ID</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 200px; text-align: center;">자재명</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 120px; text-align: center;">카테고리</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">단위</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 120px; text-align: center;">규격</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">단가</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">비고</th>
                                <th style="padding: 8px; border: 1px solid #ddd; min-width: 150px; text-align: center;">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${materials.length === 0 ? 
                                `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #6b7280;">자재 데이터를 로드할 수 없습니다. priceDatabase.js를 확인해주세요.</td></tr>` :
                                materials.map(material => `
                                    <tr>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.id || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;" title="${material.spec || material.dimensions || ''}">${material.name || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.category || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.unit || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.spec || material.dimensions || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₩${(material.materialPrice || 0).toLocaleString()}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.note || '-'}</td>
                                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">
                                            <button onclick="editPriceMaterial('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px;" title="가격 편집">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button onclick="viewMaterialDetail('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; background: #059669; color: white;" title="상세 보기">
                                                <i class="fas fa-info"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')
                            }
                        </tbody>
                    </table>
                </div>
            `;
            container.innerHTML = tableHTML;
        } else if (tableBody) {
            // 기존 코드 (컨테이너가 없는 경우)
            if (materials.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="padding: 20px; text-align: center; color: #6b7280;">
                            자재 데이터를 로드할 수 없습니다. priceDatabase.js를 확인해주세요.
                        </td>
                    </tr>
                `;
            } else {
                tableBody.innerHTML = materials.map(material => `
                    <tr>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.id || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;" title="${material.spec || material.dimensions || ''}">${material.name || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.category || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.unit || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.spec || material.dimensions || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₩${(material.materialPrice || 0).toLocaleString()}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${material.note || '-'}</td>
                        <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">
                            <button onclick="editPriceMaterial('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; margin-right: 2px;" title="가격 편집">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="viewMaterialDetail('${material.id}')" class="btn btn-sm" style="padding: 2px 6px; background: #059669; color: white;" title="상세 보기">
                                <i class="fas fa-info"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
        
        if (materialStats) {
            materialStats.textContent = `총 ${materials.length}개 자재 (경량부품: ${materials.filter(m => m.id.startsWith('ST') || m.id.startsWith('RN') || m.id.startsWith('CH') || m.id.startsWith('BD')).length}, 석고보드: ${materials.filter(m => m.id.startsWith('G')).length})`;
        }
        
        console.log(`✅ 자재 목록 로드 완료: ${materials.length}개`);
        
    } catch (error) {
        console.error('자재 목록 로드 실패:', error);
        const tableBody = document.getElementById('materialTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 20px; text-align: center; color: #dc2626;">
                        자재 목록을 로드하는 중 오류가 발생했습니다: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// =============================================================================
// 전역 함수 등록 (materialManager.js)
// =============================================================================

// 자재 관리 메인 함수들
window.showMaterialManagementModal = showMaterialManagementModal;
window.loadStandardMaterials = loadStandardMaterials;
window.loadMaterialList = loadMaterialList;

console.log('✅ materialManager.js 로드 완료 - 노무비 계산, 자재 관리 함수들 및 전역 함수 등록됨');