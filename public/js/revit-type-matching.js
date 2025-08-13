// =============================================================================
// 벽체 타입 관리 시스템
// =============================================================================

// 전역 변수 (타입매칭 제거)

// 독립적인 벽체 타입 데이터 (외부 메인 테이블과 별도)
let revitWallTypes = [];
let revitWallTypeCounter = 0;
let selectedRevitWalls = new Set();

// =============================================================================
// 메인 모달 열기/닫기
// =============================================================================

function openRevitTypeMatching() {
    console.log('🏗️ 벽체 타입 관리 모달 열기');
    
    try {
        // createSubModal 함수 존재 여부 확인
        if (typeof createSubModal !== 'function') {
            console.error('❌ createSubModal 함수를 찾을 수 없습니다.');
            alert('모달 시스템을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
            return null;
        }
        
        // 모달 HTML 생성
        console.log('📄 모달 HTML 생성 중...');
        const modalHTML = createRevitTypeMappingModal();
        
        // 모달 표시 (배경 클릭 방지 옵션 적용)
        console.log('🔧 createSubModal 호출 중...');
        const modal = createSubModal('🏗️ 벽체 타입 관리', modalHTML, [], {
            disableBackgroundClick: true,
            disableEscapeKey: true
        });
        
        console.log('✅ 모달 생성 완료:', modal ? '성공' : '실패');
        
        // 모달이 DOM에 추가된 후 초기화
        if (modal) {
            // DOM 업데이트를 위해 지연시간과 반복 체크 사용
            let attempts = 0;
            const maxAttempts = 10;
            
            const initWithRetry = () => {
                attempts++;
                console.log(`🚀 초기화 시도 ${attempts}/${maxAttempts}...`);
                
                const success = initializeTypeMappingTabs();
                if (!success && attempts < maxAttempts) {
                    setTimeout(initWithRetry, 300);
                } else if (success) {
                    console.log('✅ 초기화 성공!');
                } else {
                    console.error('❌ 초기화 최대 시도 횟수 초과');
                }
            };
            
            setTimeout(initWithRetry, 100);
        }
        
        return modal;
        
    } catch (error) {
        console.error('❌ 벽체 타입 관리 모달 열기 오류:', error);
        alert('모달을 열 수 없습니다: ' + error.message);
        return null;
    }
}

function closeRevitTypeMatching() {
    console.log('🏗️ 벽체 타입 관리 모달 닫기');
    
    // 현재 활성화된 서브 모달 오버레이 찾기
    const subModalOverlay = document.querySelector('.sub-modal-overlay');
    if (subModalOverlay) {
        closeSubModal(subModalOverlay);
    } else {
        console.warn('⚠️ 서브 모달 오버레이를 찾을 수 없습니다.');
    }
}

// =============================================================================
// 모달 HTML 생성
// =============================================================================

function createRevitTypeMappingModal() {
    return `
        <div class="revit-type-matching-container">
            <!-- 프로젝트 관리 컨텐츠 -->
            <div class="project-content">
                ${createProjectManagementPanel()}
            </div>

            <!-- 하단 버튼들 -->
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeRevitTypeMatching()">
                    <i class="fas fa-times"></i> 닫기
                </button>
                <button class="btn btn-primary" onclick="saveAllChanges()">
                    <i class="fas fa-save"></i> 모든 변경사항 저장
                </button>
            </div>
        </div>
    `;
}

// 자재 관리 모달 내부에서 사용할 컨텐츠만 반환하는 함수
function createRevitTypeMappingModalContent() {
    return `
        <div class="revit-type-matching-container">
            <!-- 프로젝트 관리 컨텐츠 -->
            <div class="project-content">
                ${createProjectManagementPanel()}
            </div>
        </div>
    `;
}

// =============================================================================
// 탭 패널 생성 함수들
// =============================================================================

function createProjectManagementPanel() {
    return `
        <div class="project-panel">
            <h3><i class="fas fa-project-diagram"></i> 벽체 타입 관리</h3>

            <!-- 기본 작업 드롭다운 -->
            <div class="action-section">
                <h4><i class="fas fa-tools"></i> 기본 작업</h4>
                <div class="dropdown-container">
                    <div class="dropdown" style="position: relative;">
                        <button class="btn btn-primary dropdown-toggle" onclick="toggleRevitActionsDropdown()">
                            <i class="fas fa-plus"></i> 벽체 작업
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu" id="revitActionsDropdown" style="display: none;">
                            <div class="dropdown-item" onclick="addRevitWallType()">
                                <i class="fas fa-plus"></i> 새 WallType 생성
                            </div>
                            <div class="dropdown-item" onclick="duplicateRevitWall()">
                                <i class="fas fa-copy"></i> 선택 복사
                            </div>
                            <div class="dropdown-divider"></div>
                            <div class="dropdown-item" onclick="openUnitPriceManagement()">
                                <i class="fas fa-calculator"></i> 일위대가 관리
                            </div>
                            <div class="dropdown-item" onclick="showUnitPriceSummary()">
                                <i class="fas fa-list-alt"></i> 일위대가 연동 현황
                            </div>
                            <div class="dropdown-divider"></div>
                            <div class="dropdown-item" onclick="deleteSelectedRevitWalls()">
                                <i class="fas fa-trash-alt"></i> 선택 삭제
                            </div>
                            <div class="dropdown-item" onclick="clearRevitWallData()">
                                <i class="fas fa-eraser"></i> 전체 초기화
                            </div>
                            <div class="dropdown-divider"></div>
                            <div class="dropdown-item" onclick="exportRevitWallTypesToJSON()">
                                <i class="fas fa-download"></i> JSON 내보내기
                            </div>
                            <div class="dropdown-item" onclick="importRevitWallTypesFromJSON()">
                                <i class="fas fa-upload"></i> JSON 불러오기
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 벽체 타입 데이터 테이블 -->
            <div class="action-section">
                <h4><i class="fas fa-table"></i> 벽체 타입 목록</h4>
                <div class="wall-table-container responsive-wall-table" style="max-height: 500px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <table class="wall-table-small">
                        <thead>
                            <tr class="header-main-row">
                                <th rowspan="2" class="header-main" style="width: 40px;">
                                    <input type="checkbox" id="selectAllRevitWalls" onchange="toggleAllRevitWallSelection()">
                                </th>
                                <th rowspan="2" class="header-main col-no" title="순서 번호">No</th>
                                <th rowspan="2" class="header-main col-walltype" title="벽체 타입명">WallType</th>
                                <th colspan="3" class="header-main" title="석고보드 구조체 레이어">석고보드 구조체</th>
                                <th rowspan="2" class="header-main col-column col-priority-high" title="Column 모듈게이지">Column<br/>모듈게이지</th>
                                <th rowspan="2" class="header-main col-infill col-priority-high" title="충진재">Infill</th>
                                <th colspan="3" class="header-main col-priority-high" title="석고보드 구조체 레이어">석고보드 구조체</th>
                                <th rowspan="2" class="header-main col-column2 col-priority-medium" title="컬럼">Column</th>
                                <th rowspan="2" class="header-main col-channel col-priority-low" title="채널">Channel</th>
                                <th rowspan="2" class="header-main col-runner col-priority-low" title="러너">Runner</th>
                                <th rowspan="2" class="header-main col-steel col-priority-low" title="아연도금 철판">Steel Plate<br/>(Galvanizing)</th>
                                <th rowspan="2" class="header-main col-thickness col-priority-medium" title="벽체 두께 (밀리미터)">두께(mm)</th>
                                <th rowspan="2" class="header-main col-unitprice col-priority-high" title="연결된 일위대가">일위대가</th>
                            </tr>
                            <tr class="header-sub-row">
                                <th class="header-sub col-layer" title="레이어 3">Layer3</th>
                                <th class="header-sub col-layer" title="레이어 2">Layer2</th>
                                <th class="header-sub col-layer" title="레이어 1">Layer1</th>
                                <th class="header-sub col-layer" title="레이어 1">Layer1</th>
                                <th class="header-sub col-layer" title="레이어 2">Layer2</th>
                                <th class="header-sub col-layer" title="레이어 3">Layer3</th>
                            </tr>
                        </thead>
                        <tbody id="revit-wall-table-body">
                            <tr>
                                <td colspan="17" style="text-align: center; padding: 20px; color: #6c757d;">
                                    벽체 타입이 없습니다. "새 WallType 생성" 버튼을 클릭하여 추가하세요.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}



// =============================================================================
// 초기화 함수
// =============================================================================

function initializeTypeMappingTabs() {
    try {
        // 프로젝트 관리 패널 초기화
        updateProjectStatus();
        console.log('✅ 벽체 타입 관리 시스템 초기화 완료');
        return true;
    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        return false;
    }
}

// =============================================================================
// 데이터 관리 함수들
// =============================================================================


function saveAllChanges() {
    console.log('💾 모든 변경사항 저장 중...');
    
    const success = saveRevitWallTypes();
    
    if (success) {
        alert('✅ 모든 변경사항이 저장되었습니다.');
    } else {
        alert('❌ 저장 중 오류가 발생했습니다.');
    }
}

// =============================================================================
// 프로젝트 관리 함수들
// =============================================================================

function updateProjectStatus() {
    try {
        // 독립적인 벽체 타입 데이터 로드
        loadRevitWallTypes();
        
        // 벽체 테이블 업데이트
        updateRevitWallTable();
        
        console.log(`📊 Revit 벽체 타입 업데이트: 총 ${revitWallTypes.length}개`);
        
    } catch (error) {
        console.error('❌ 프로젝트 상태 업데이트 오류:', error);
    }
}

// =============================================================================
// 독립적인 벽체 타입 데이터 관리
// =============================================================================

// 벽체 타입 데이터 로드
function loadRevitWallTypes() {
    try {
        const saved = localStorage.getItem('kiyeno_revit_wall_types');
        if (saved) {
            const data = JSON.parse(saved);
            revitWallTypes = data.wallTypes || [];
            revitWallTypeCounter = data.counter || 0;
        }
        console.log('✅ Revit 벽체 타입 데이터 로드됨:', revitWallTypes.length + '개');
    } catch (error) {
        console.error('❌ 벽체 타입 데이터 로드 실패:', error);
        revitWallTypes = [];
        revitWallTypeCounter = 0;
    }
}

// 벽체 타입 데이터 저장
function saveRevitWallTypes() {
    try {
        const dataToSave = {
            wallTypes: revitWallTypes,
            counter: revitWallTypeCounter,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('kiyeno_revit_wall_types', JSON.stringify(dataToSave));
        console.log('✅ Revit 벽체 타입 데이터 저장됨');
        return true;
    } catch (error) {
        console.error('❌ 벽체 타입 데이터 저장 실패:', error);
        return false;
    }
}

// 벽체 테이블 업데이트 함수
function updateRevitWallTable() {
    const tableBody = document.getElementById('revit-wall-table-body');
    if (!tableBody) return;
    
    if (!revitWallTypes || revitWallTypes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="18" style="text-align: center; padding: 20px; color: #6c757d;">
                    벽체 타입이 없습니다. "새 WallType 생성" 버튼을 클릭하여 추가하세요.
                </td>
            </tr>
        `;
        return;
    }
    
    // 벽체 데이터를 테이블 행으로 변환
    const tableRows = revitWallTypes.map(wall => createRevitWallTableRow(wall)).join('');
    tableBody.innerHTML = tableRows;
}

// 벽체 테이블 행 생성 함수 (클릭 가능한 자재 셀 포함)
function createRevitWallTableRow(wall) {
    const isSelected = selectedRevitWalls.has(wall.id);
    
    return `
        <tr data-wall-id="${wall.id}" class="${isSelected ? 'selected' : ''}">
            <td style="text-align: center;">
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="toggleRevitWallSelection(${wall.id})">
            </td>
            <td style="text-align: center;">${wall.no}</td>
            <td style="text-align: center;" ondblclick="editRevitWallType(${wall.id})">${wall.wallType || ''}</td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'layer3_1')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer3_1')" class="material-cell">
                ${wall.layer3_1 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'layer2_1')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer2_1')" class="material-cell">
                ${wall.layer2_1 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'layer1_1')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer1_1')" class="material-cell">
                ${wall.layer1_1 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'column1')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'column1')" class="material-cell col-column col-priority-high">
                ${wall.column1 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'infill')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'infill')" class="material-cell col-infill col-priority-high">
                ${wall.infill || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'layer1_2')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer1_2')" class="material-cell col-layer col-priority-high">
                ${wall.layer1_2 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'layer2_2')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer2_2')" class="material-cell col-layer col-priority-high">
                ${wall.layer2_2 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'layer3_2')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer3_2')" class="material-cell col-layer col-priority-high">
                ${wall.layer3_2 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'column2')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'column2')" class="material-cell col-column2 col-priority-medium">
                ${wall.column2 || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'channel')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'channel')" class="material-cell col-channel col-priority-low">
                ${wall.channel || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'runner')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'runner')" class="material-cell col-runner col-priority-low">
                ${wall.runner || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center; cursor: pointer;" onclick="selectMaterial(${wall.id}, 'steelPlate')" 
                oncontextmenu="clearMaterial(event, ${wall.id}, 'steelPlate')" class="material-cell col-steel col-priority-low">
                ${wall.steelPlate || '<span style="color: #999;">클릭하여 선택</span>'}
            </td>
            <td style="text-align: center;" ondblclick="editRevitWallThickness(${wall.id})" class="col-thickness col-priority-medium">${wall.thickness || ''}</td>
            <td style="text-align: center;" class="col-unitprice col-priority-high">
                ${createUnitPriceDropdown(wall)}
            </td>
        </tr>
    `;
}

// =============================================================================
// 일위대가 연동 기능
// =============================================================================

// 일위대가 드롭다운 생성
function createUnitPriceDropdown(wall) {
    const unitPriceItems = loadUnitPriceItems();
    const selectedId = wall.unitPriceId || '';
    
    let options = '<option value="">선택하세요</option>';
    
    unitPriceItems.forEach(item => {
        const basic = item.basic;
        const label = `${basic.itemName} - ${basic.spacing} ${basic.height} ${basic.size}`;
        const selected = selectedId === item.id ? 'selected' : '';
        options += `<option value="${item.id}" ${selected}>${label}</option>`;
    });
    
    return `
        <select onchange="assignUnitPriceToWall(${wall.id}, this.value)" 
                style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; background: white;">
            ${options}
        </select>
    `;
}

// 벽체에 일위대가 할당
function assignUnitPriceToWall(wallId, unitPriceId) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        console.error('❌ 벽체를 찾을 수 없음:', wallId);
        return;
    }
    
    // 일위대가 ID 할당
    wall.unitPriceId = unitPriceId || '';
    
    // 저장
    saveRevitWallTypes();
    
    // 로그 출력
    if (unitPriceId) {
        const unitPriceItems = loadUnitPriceItems();
        const selectedItem = unitPriceItems.find(item => item.id === unitPriceId);
        if (selectedItem) {
            const basic = selectedItem.basic;
            console.log(`✅ 벽체 "${wall.wallType}"에 일위대가 "${basic.itemName} - ${basic.spacing} ${basic.height} ${basic.size}" 할당됨`);
        }
    } else {
        console.log(`🗑️ 벽체 "${wall.wallType}"에서 일위대가 할당 해제됨`);
    }
}

// 일위대가 아이템 로드 (기존 함수와 중복 방지)
function loadUnitPriceItems() {
    try {
        const saved = localStorage.getItem('kiyeno_unit_price_items');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (error) {
        console.error('❌ 일위대가 아이템 로드 실패:', error);
    }
    return [];
}

// 일위대가 연동 현황 보기
function showUnitPriceSummary() {
    console.log('📋 일위대가 연동 현황 보기');
    
    const unitPriceItems = loadUnitPriceItems();
    const wallTypesWithUnitPrice = revitWallTypes.filter(wall => wall.unitPriceId);
    
    // 연동 현황 모달 컨텐츠 생성
    const modalContent = createUnitPriceSummaryModal(wallTypesWithUnitPrice, unitPriceItems);
    
    if (typeof createSubModal === 'function') {
        createSubModal('일위대가 연동 현황', modalContent, [
            { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) }
        ]);
    } else {
        alert('모달 시스템을 찾을 수 없습니다.');
    }
}

// 일위대가 연동 현황 모달 컨텐츠 생성
function createUnitPriceSummaryModal(wallTypesWithUnitPrice, unitPriceItems) {
    const totalWalls = revitWallTypes.length;
    const connectedWalls = wallTypesWithUnitPrice.length;
    const connectionRate = totalWalls > 0 ? Math.round((connectedWalls / totalWalls) * 100) : 0;
    
    let tableRows = '';
    
    if (wallTypesWithUnitPrice.length === 0) {
        tableRows = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: #6c757d;">
                    일위대가가 연결된 벽체 타입이 없습니다.
                </td>
            </tr>
        `;
    } else {
        tableRows = wallTypesWithUnitPrice.map(wall => {
            const unitPriceItem = unitPriceItems.find(item => item.id === wall.unitPriceId);
            if (!unitPriceItem) {
                return `
                    <tr>
                        <td>${wall.no}</td>
                        <td>${wall.wallType || '-'}</td>
                        <td colspan="4" style="color: #dc2626;">연결된 일위대가를 찾을 수 없음</td>
                    </tr>
                `;
            }
            
            const basic = unitPriceItem.basic;
            const totalCost = unitPriceItem.totalCosts;
            
            return `
                <tr>
                    <td>${wall.no}</td>
                    <td>${wall.wallType || '-'}</td>
                    <td>${basic.itemName}</td>
                    <td>${basic.spacing} / ${basic.height}</td>
                    <td>${basic.size}</td>
                    <td style="text-align: right; font-weight: 600; color: #1e40af;">
                        ${totalCost ? totalCost.grandTotal.toLocaleString() : '0'}원/${basic.unit}
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    return `
        <div class="unit-price-summary-container">
            <!-- 요약 정보 -->
            <div class="summary-stats" style="display: flex; gap: 20px; margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
                <div class="stat-item">
                    <div style="font-size: 24px; font-weight: bold; color: #1e293b;">${totalWalls}</div>
                    <div style="font-size: 12px; color: #64748b;">총 벽체 타입</div>
                </div>
                <div class="stat-item">
                    <div style="font-size: 24px; font-weight: bold; color: #059669;">${connectedWalls}</div>
                    <div style="font-size: 12px; color: #64748b;">연결된 벽체</div>
                </div>
                <div class="stat-item">
                    <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${totalWalls - connectedWalls}</div>
                    <div style="font-size: 12px; color: #64748b;">미연결 벽체</div>
                </div>
                <div class="stat-item">
                    <div style="font-size: 24px; font-weight: bold; color: #7c3aed;">${connectionRate}%</div>
                    <div style="font-size: 12px; color: #64748b;">연결률</div>
                </div>
            </div>
            
            <!-- 연결된 벽체 목록 -->
            <div class="connected-walls-table" style="max-height: 400px; overflow: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 10px; border: 1px solid #e2e8f0; width: 60px;">No</th>
                            <th style="padding: 10px; border: 1px solid #e2e8f0;">벽체 타입</th>
                            <th style="padding: 10px; border: 1px solid #e2e8f0;">일위대가 아이템</th>
                            <th style="padding: 10px; border: 1px solid #e2e8f0;">간격/높이</th>
                            <th style="padding: 10px; border: 1px solid #e2e8f0;">사이즈</th>
                            <th style="padding: 10px; border: 1px solid #e2e8f0; width: 120px;">단가</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// =============================================================================
// 벽체 타입 관리 작업 함수들
// =============================================================================

// 드롭다운 토글 함수
function toggleRevitActionsDropdown() {
    const dropdown = document.getElementById('revitActionsDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

// 새 벽체 타입 추가
function addRevitWallType() {
    // 벽체 타입 생성 모달 표시
    const modalContent = createWallTypeCreationModal();
    
    if (typeof createSubModal === 'function') {
        createSubModal('새 WallType 생성', modalContent, [
            { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
            { text: '생성', class: 'btn-primary', onClick: (modal) => createNewWallType(modal) }
        ]);
        
        // 모달이 DOM에 추가된 후 이름 입력 필드에 포커스
        setTimeout(() => {
            const nameInput = document.getElementById('newWallTypeName');
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
    } else {
        // 서브 모달을 사용할 수 없는 경우 기존 방식 사용
        createWallTypeWithPrompt();
    }
    
    // 드롭다운 닫기
    toggleRevitActionsDropdown();
}

// 벽체 타입 생성 모달 내용
function createWallTypeCreationModal() {
    const defaultName = `WallType_${revitWallTypeCounter + 1}`;
    
    return `
        <style>
            .responsive-creation-modal {
                width: 90vw;
                max-width: 400px;
                min-width: 280px;
                padding: 20px;
            }
            
            .responsive-creation-input {
                width: 100%;
                padding: 10px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            }
            
            @media (max-width: 480px) {
                .responsive-creation-modal {
                    width: 95vw;
                    padding: 15px;
                }
                
                .responsive-creation-input {
                    padding: 8px;
                    font-size: 16px; /* iOS에서 줌 방지 */
                }
            }
        </style>
        <div class="responsive-creation-modal">
            <h4 style="margin-bottom: 20px; color: #1976d2;">
                <i class="fas fa-plus"></i> 새 벽체 타입 생성
            </h4>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #495057;">
                    <i class="fas fa-tag"></i> WallType 이름 <span style="color: #dc3545;">*</span>
                </label>
                <input type="text" id="newWallTypeName" value="${defaultName}" 
                       class="responsive-creation-input"
                       placeholder="WallType 이름을 입력하세요"
                       onkeydown="handleWallTypeCreationKeydown(event)">
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #495057;">
                    <i class="fas fa-ruler"></i> 두께 (mm)
                </label>
                <input type="text" id="newWallTypeThickness" 
                       class="responsive-creation-input"
                       placeholder="두께를 입력하세요 (예: 150)"
                       onkeydown="handleWallTypeCreationKeydown(event)">
            </div>
            
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 12px; font-size: 13px; color: #6c757d;">
                <i class="fas fa-info-circle"></i> 
                <strong>안내:</strong> 이름은 필수 입력이며, 두께는 선택사항입니다. 나중에 테이블에서 더블클릭하여 편집할 수 있습니다.
            </div>
        </div>
    `;
}

// 새 벽체 타입 생성 실행
function createNewWallType(modal) {
    const nameInput = document.getElementById('newWallTypeName');
    const thicknessInput = document.getElementById('newWallTypeThickness');
    
    if (!nameInput || !thicknessInput) {
        alert('입력 필드를 찾을 수 없습니다.');
        return;
    }
    
    const wallTypeName = nameInput.value.trim();
    const thickness = thicknessInput.value.trim();
    
    // 이름 유효성 검사
    if (!wallTypeName) {
        alert('WallType 이름을 입력해주세요.');
        nameInput.focus();
        return;
    }
    
    // 중복 이름 확인
    const isDuplicate = revitWallTypes.some(wall => wall.wallType === wallTypeName);
    if (isDuplicate) {
        alert('이미 존재하는 WallType 이름입니다. 다른 이름을 입력해주세요.');
        nameInput.focus();
        return;
    }
    
    // 두께 유효성 검사 (입력된 경우만)
    if (thickness && isNaN(thickness)) {
        alert('두께는 숫자로 입력해주세요.');
        thicknessInput.focus();
        return;
    }
    
    // 새 벽체 타입 생성
    revitWallTypeCounter++;
    const newWallType = {
        id: revitWallTypeCounter,
        no: revitWallTypes.length + 1,
        wallType: wallTypeName,
        layer3_1: '',
        layer2_1: '',
        layer1_1: '',
        column1: '',
        infill: '',
        layer1_2: '',
        layer2_2: '',
        layer3_2: '',
        column2: '',
        channel: '',
        runner: '',
        steelPlate: '',
        thickness: thickness,
        created: new Date().toISOString()
    };
    
    revitWallTypes.push(newWallType);
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log('✅ 새 벽체 타입 생성 완료:', newWallType.wallType);
    
    // 모달 닫기
    if (modal) {
        closeSubModal(modal);
    }
}

// 기존 prompt 방식 (서브 모달 사용 불가능한 경우)
function createWallTypeWithPrompt() {
    const wallTypeName = prompt('새 벽체 타입 이름을 입력하세요:', `WallType_${revitWallTypeCounter + 1}`);
    
    if (!wallTypeName || wallTypeName.trim() === '') {
        alert('벽체 타입 이름을 입력해주세요.');
        return;
    }
    
    // 중복 이름 확인
    const isDuplicate = revitWallTypes.some(wall => wall.wallType === wallTypeName.trim());
    if (isDuplicate) {
        alert('이미 존재하는 벽체 타입 이름입니다. 다른 이름을 입력해주세요.');
        return;
    }
    
    revitWallTypeCounter++;
    const newWallType = {
        id: revitWallTypeCounter,
        no: revitWallTypes.length + 1,
        wallType: wallTypeName.trim(),
        layer3_1: '',
        layer2_1: '',
        layer1_1: '',
        column1: '',
        infill: '',
        layer1_2: '',
        layer2_2: '',
        layer3_2: '',
        column2: '',
        channel: '',
        runner: '',
        steelPlate: '',
        thickness: '',
        created: new Date().toISOString()
    };
    
    revitWallTypes.push(newWallType);
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log('✅ 새 벽체 타입 추가:', newWallType.wallType);
}

// 벽체 타입 생성 모달 키보드 이벤트 처리
function handleWallTypeCreationKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        // 현재 열린 모달 찾기
        const modal = document.querySelector('.sub-modal-overlay');
        if (modal) {
            createNewWallType(modal);
        }
    }
}

// 선택된 벽체 복사
function duplicateRevitWall() {
    if (selectedRevitWalls.size === 0) {
        alert('복사할 벽체를 선택해주세요.');
        return;
    }
    
    selectedRevitWalls.forEach(wallId => {
        const originalWall = revitWallTypes.find(w => w.id === wallId);
        if (originalWall) {
            revitWallTypeCounter++;
            const duplicatedWall = {
                ...originalWall,
                id: revitWallTypeCounter,
                no: revitWallTypes.length + 1,
                wallType: `${originalWall.wallType}_복사`,
                created: new Date().toISOString()
            };
            revitWallTypes.push(duplicatedWall);
        }
    });
    
    selectedRevitWalls.clear();
    saveRevitWallTypes();
    updateRevitWallTable();
    toggleRevitActionsDropdown();
    
    console.log('✅ 선택된 벽체 타입 복사 완료');
}

// 선택된 벽체 삭제
function deleteSelectedRevitWalls() {
    if (selectedRevitWalls.size === 0) {
        alert('삭제할 벽체를 선택해주세요.');
        return;
    }
    
    if (!confirm(`선택된 ${selectedRevitWalls.size}개 벽체 타입을 삭제하시겠습니까?`)) {
        return;
    }
    
    // 선택된 벽체들 삭제
    revitWallTypes = revitWallTypes.filter(wall => !selectedRevitWalls.has(wall.id));
    
    // 번호 재정렬
    revitWallTypes.forEach((wall, index) => {
        wall.no = index + 1;
    });
    
    selectedRevitWalls.clear();
    saveRevitWallTypes();
    updateRevitWallTable();
    toggleRevitActionsDropdown();
    
    console.log('✅ 선택된 벽체 타입 삭제 완료');
}

// 전체 데이터 초기화
function clearRevitWallData() {
    if (!confirm('모든 벽체 타입 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    revitWallTypes = [];
    revitWallTypeCounter = 0;
    selectedRevitWalls.clear();
    saveRevitWallTypes();
    updateRevitWallTable();
    toggleRevitActionsDropdown();
    
    console.log('✅ 모든 벽체 타입 데이터 초기화 완료');
}

// 벽체 선택 토글
function toggleRevitWallSelection(wallId) {
    if (selectedRevitWalls.has(wallId)) {
        selectedRevitWalls.delete(wallId);
    } else {
        selectedRevitWalls.add(wallId);
    }
    updateRevitWallTable();
}

// 전체 선택 토글
function toggleAllRevitWallSelection() {
    const checkbox = document.getElementById('selectAllRevitWalls');
    if (checkbox.checked) {
        revitWallTypes.forEach(wall => selectedRevitWalls.add(wall.id));
    } else {
        selectedRevitWalls.clear();
    }
    updateRevitWallTable();
}

// 자재 선택 팝업
function selectMaterial(wallId, fieldName) {
    if (!window.priceDB) {
        alert('자재 데이터베이스를 찾을 수 없습니다.');
        return;
    }
    
    try {
        // 선택 상태 초기화
        selectedMaterialData = null;
        
        // 자재 선택 모달 생성
        const modalContent = createMaterialSelectionModal(wallId, fieldName);
        
        // 높은 z-index로 서브 모달 표시
        if (typeof createSubModal === 'function') {
            createSubModal(`자재 선택 - ${getFieldDisplayName(fieldName)}`, modalContent, [
                { text: '닫기', class: 'btn-secondary', onClick: (modal) => {
                    selectedMaterialData = null;
                    closeSubModal(modal);
                }},
                { text: '없음으로 변경', class: 'btn-warning', onClick: (modal) => clearMaterialFromModal(wallId, fieldName, modal) },
                { text: '적용', class: 'btn-primary', onClick: (modal) => applySelectedMaterial(wallId, fieldName, modal) }
            ]);
        } else {
            alert('모달 시스템을 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('자재 선택 모달 생성 오류:', error);
        alert('자재 선택 모달을 열 수 없습니다: ' + error.message);
    }
}

// 필드 표시명 가져오기
function getFieldDisplayName(fieldName) {
    const fieldNames = {
        'layer3_1': 'Layer3 (좌측)',
        'layer2_1': 'Layer2 (좌측)',
        'layer1_1': 'Layer1 (좌측)',
        'column1': 'Column 모듈게이지',
        'infill': 'Infill',
        'layer1_2': 'Layer1 (우측)',
        'layer2_2': 'Layer2 (우측)',
        'layer3_2': 'Layer3 (우측)',
        'column2': 'Column',
        'channel': 'Channel',
        'runner': 'Runner',
        'steelPlate': 'Steel Plate'
    };
    return fieldNames[fieldName] || fieldName;
}

// 자재 선택 모달 생성 (자재관리와 정확히 동일한 구조)
function createMaterialSelectionModal(wallId, fieldName) {
    // 자재 타입에 따라 적절한 데이터 가져오기
    let materials = [];
    let isGypsumBoard = false;
    
    if (['layer3_1', 'layer2_1', 'layer1_1', 'layer1_2', 'layer2_2', 'layer3_2'].includes(fieldName)) {
        // 석고보드 자재
        const gypsumData = window.priceDB.getGypsumBoards();
        materials = gypsumData.items;
        isGypsumBoard = true;
    } else {
        // 경량 자재
        const lightweightData = window.priceDB.getLightweightComponents();
        materials = lightweightData.items;
        isGypsumBoard = false;
    }
    
    // 테이블 헤더 생성
    let tableHTML = '';
    
    if (isGypsumBoard) {
        // 석고보드 테이블 - 자재관리와 정확히 동일한 구조
        tableHTML = `
            <div class="material-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead style="background: #f8f9fa; position: sticky; top: 0;">
                        <tr>
                            <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 60px; text-align: center;">ID</th>
                            <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 180px; text-align: center;">품명</th>
                            <th colspan="3" style="padding: 8px; border: 1px solid #ddd; background: #e3f2fd; text-align: center;">치수</th>
                            <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">단위</th>
                            <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">수량</th>
                            <th colspan="2" style="padding: 8px; border: 1px solid #ddd; background: #fff3e0; text-align: center;">단가</th>
                            <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">M2 단가</th>
                            <th rowspan="2" style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">비고</th>
                        </tr>
                        <tr>
                            <th style="padding: 4px; border: 1px solid #ddd; min-width: 50px; background: #e3f2fd; text-align: center;">W</th>
                            <th style="padding: 4px; border: 1px solid #ddd; min-width: 50px; background: #e3f2fd; text-align: center;">H</th>
                            <th style="padding: 4px; border: 1px solid #ddd; min-width: 40px; background: #e3f2fd; text-align: center;">T</th>
                            <th style="padding: 4px; border: 1px solid #ddd; min-width: 70px; background: #fff3e0; text-align: center;">당초</th>
                            <th style="padding: 4px; border: 1px solid #ddd; min-width: 70px; background: #fff3e0; text-align: center;">변경</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(item => {
                            // M2 단가 계산: 변경단가 또는 당초단가를 면적으로 나눔
                            const unitPrice = (item.priceChanged || item.priceOriginal || 0);
                            const areaM2 = ((item.w || 0) / 1000) * ((item.h || 0) / 1000);
                            const pricePerM2 = areaM2 > 0 ? Math.round(unitPrice / areaM2) : 0;
                            
                            return `
                                <tr style="cursor: pointer;" onclick="selectMaterialRow(this, '${item.id}', '${item.name}')" 
                                    onmouseover="this.style.backgroundColor='#f0f9ff'" onmouseout="this.style.backgroundColor=''">
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.id}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.name}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.w}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.h}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.t}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${item.unit}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: center;">${(item.qty || 0).toFixed(2)}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${(item.priceOriginal || 0).toLocaleString()}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: right; ${item.priceChanged !== item.priceOriginal ? 'background: #fef3c7; font-weight: bold;' : ''}">₩${(item.priceChanged || 0).toLocaleString()}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; text-align: right;">₩${(pricePerM2 || 0).toLocaleString()}</td>
                                    <td style="padding: 4px; border: 1px solid #ddd; font-size: 10px; text-align: center;">${item.note || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // 경량 자재 테이블 - 새로운 구조
        tableHTML = `
            <div class="material-table-container" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd;">
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead style="background: #f8f9fa; position: sticky; top: 0;">
                        <tr>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 60px; text-align: center;">ID</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 100px; text-align: center;">품목</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 150px; text-align: center;">자재명</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 100px; text-align: center;">규격</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">싸이즈</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 50px; text-align: center;">단위</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">자재비</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">노무비</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 100px; text-align: center;">노무비<br>생산성(기준)</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">노무비<br>보할</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">공종1</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">공종2</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">부위</th>
                            <th style="padding: 8px; border: 1px solid #ddd; min-width: 80px; text-align: center;">작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(item => `
                            <tr style="cursor: pointer;" onclick="selectMaterialRow(this, '${item.id}', '${item.name}')" 
                                onmouseover="this.style.backgroundColor='#f0f9ff'" onmouseout="this.style.backgroundColor=''">
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.id}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.category || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: left; font-size: 10px;">${item.name}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.newSpec || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;" title="${item.spec}">${item.spec}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.unit}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-size: 10px;">₩${(item.price || 0).toLocaleString()}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-size: 10px;">₩${(item.laborCost || 0).toLocaleString()}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.productivity || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-size: 10px;">₩${(item.laborBonus || 0).toLocaleString()}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.workType1 || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.workType2 || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">${item.location || '-'}</td>
                                <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">
                                    <button onclick="event.stopPropagation(); editMaterial('${item.id}')" style="padding: 2px 6px; font-size: 9px; margin-right: 2px; background: #f59e0b; color: white; border: none; border-radius: 3px; cursor: pointer;">수정</button>
                                    <button onclick="event.stopPropagation(); deleteMaterial('${item.id}')" style="padding: 2px 6px; font-size: 9px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer;">삭제</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    return `
        <style>
            .selected-material-row {
                background-color: #bfdbfe !important;
                border: 2px solid #3b82f6 !important;
            }
            .selected-material-row:hover {
                background-color: #93c5fd !important;
            }
            
            /* 반응형 모달 스타일 */
            .responsive-modal-container {
                width: 95vw;
                max-width: 1200px;
                min-width: 320px;
                max-height: 80vh;
            }
            
            .responsive-search-container {
                margin-bottom: 20px;
            }
            
            .responsive-search-input {
                width: 100%;
                max-width: 300px;
                padding: 8px;
                font-size: 14px;
                border: 1px solid #ced4da;
                border-radius: 4px;
            }
            
            /* 테이블 반응형 */
            .responsive-table-container {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
            }
            
            .responsive-table-container table {
                min-width: 800px;
            }
            
            /* 모바일 대응 */
            @media (max-width: 768px) {
                .responsive-modal-container {
                    width: 98vw;
                    max-height: 70vh;
                }
                
                .responsive-search-input {
                    max-width: 100%;
                }
                
                .responsive-table-container {
                    font-size: 11px;
                }
                
                .responsive-table-container table {
                    min-width: 600px;
                }
                
                .responsive-table-container th,
                .responsive-table-container td {
                    padding: 3px !important;
                    font-size: 10px !important;
                }
            }
            
            /* 태블릿 대응 */
            @media (max-width: 1024px) and (min-width: 769px) {
                .responsive-modal-container {
                    width: 96vw;
                }
                
                .responsive-table-container {
                    font-size: 12px;
                }
            }
        </style>
        <div class="responsive-modal-container">
            <div class="responsive-search-container">
                <h5 style="margin-bottom: 10px; color: #1976d2;">
                    <i class="fas fa-search"></i> ${isGypsumBoard ? '석고보드' : '경량 자재'} 선택
                </h5>
                <p style="margin-bottom: 10px; color: #666; font-size: 14px;">
                    자재를 클릭하여 선택한 후 '적용' 버튼을 눌러주세요.<br>
                    또는 '없음으로 변경' 버튼을 클릭하여 현재 자재를 제거할 수 있습니다.
                </p>
                <input type="text" placeholder="자재명 또는 ID로 검색..." 
                       onkeyup="filterMaterialSelectionTable(this.value)" 
                       class="responsive-search-input form-control">
            </div>
            <div class="responsive-table-container">
                ${tableHTML}
            </div>
        </div>
    `;
}

// 자재 선택 모달에서 자재 행 선택 시 호출
let selectedMaterialData = null;

function selectMaterialRow(rowElement, materialId, materialName) {
    // 기존 선택 해제
    const table = rowElement.closest('table');
    const previousSelected = table.querySelector('.selected-material-row');
    if (previousSelected) {
        previousSelected.classList.remove('selected-material-row');
        previousSelected.style.backgroundColor = '';
    }
    
    // 새로운 선택 표시
    rowElement.classList.add('selected-material-row');
    rowElement.style.backgroundColor = '#bfdbfe';
    
    // 선택된 자재 정보 저장
    selectedMaterialData = {
        id: materialId,
        name: materialName
    };
    
    console.log(`📦 자재 선택됨: ${materialName} (${materialId})`);
}

// 선택된 자재를 벽체에 적용
function applySelectedMaterial(wallId, fieldName, modal) {
    if (!selectedMaterialData) {
        alert('먼저 자재를 선택해주세요.');
        return;
    }
    
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (wall) {
        // 자재명만 저장
        wall[fieldName] = selectedMaterialData.name;
        saveRevitWallTypes();
        updateRevitWallTable();
        
        console.log(`✅ 자재 적용 완료: ${selectedMaterialData.name}`);
        
        // 선택 데이터 초기화
        selectedMaterialData = null;
        
        // 모달 닫기
        if (modal) {
            closeSubModal(modal);
        }
    }
}

// 자재 셀 우클릭 시 '없음으로 변경' 기능
function clearMaterial(event, wallId, fieldName) {
    event.preventDefault(); // 기본 우클릭 메뉴 방지
    
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    // 현재 자재가 없으면 아무것도 하지 않음
    if (!wall[fieldName]) {
        return;
    }
    
    // 확인 대화상자 표시
    const fieldDisplayName = getFieldDisplayName(fieldName);
    const currentMaterial = wall[fieldName];
    
    if (confirm(`${fieldDisplayName}의 자재를 없음으로 변경하시겠습니까?\n현재 자재: ${currentMaterial}`)) {
        // 자재 제거
        wall[fieldName] = '';
        saveRevitWallTypes();
        updateRevitWallTable();
        
        console.log(`🗑️ 자재 제거 완료: ${fieldDisplayName} - ${currentMaterial}`);
    }
}

// 자재 선택 모달에서 '없음으로 변경' 버튼 클릭 시 호출
function clearMaterialFromModal(wallId, fieldName, modal) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    const fieldDisplayName = getFieldDisplayName(fieldName);
    const currentMaterial = wall[fieldName];
    
    if (currentMaterial) {
        if (confirm(`${fieldDisplayName}의 자재를 없음으로 변경하시겠습니까?\n현재 자재: ${currentMaterial}`)) {
            // 자재 제거
            wall[fieldName] = '';
            saveRevitWallTypes();
            updateRevitWallTable();
            
            console.log(`🗑️ 자재 제거 완료: ${fieldDisplayName} - ${currentMaterial}`);
            
            // 선택 데이터 초기화
            selectedMaterialData = null;
            
            // 모달 닫기
            if (modal) {
                closeSubModal(modal);
            }
        }
    } else {
        alert('현재 선택된 자재가 없습니다.');
    }
}

// WallType 이름 더블클릭 편집 기능
function editRevitWallType(wallId) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    // 테이블에서 해당 셀 찾기
    const wallRow = document.querySelector(`tr[data-wall-id="${wallId}"]`);
    if (!wallRow) return;
    
    const wallTypeCell = wallRow.children[2]; // WallType 셀 (3번째 셀)
    const currentName = wall.wallType || '';
    
    // 기존 내용을 input으로 대체
    const originalHTML = wallTypeCell.innerHTML;
    wallTypeCell.innerHTML = `
        <input type="text" value="${currentName}" 
               style="width: 100%; padding: 6px; border: 2px solid #3b82f6; border-radius: 4px; text-align: center; font-size: 14px; background: #f0f9ff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);"
               onblur="saveWallTypeName(${wallId}, this.value, this)"
               onkeydown="handleWallTypeNameKeydown(event, ${wallId}, this.value, this)"
               id="wallTypeInput_${wallId}"
               placeholder="WallType 이름">
    `;
    
    // 입력 필드에 포커스 및 텍스트 선택
    const input = document.getElementById(`wallTypeInput_${wallId}`);
    if (input) {
        input.focus();
        input.select();
    }
    
    console.log(`✏️ WallType 이름 편집 모드 활성화: ${currentName}`);
}

// WallType 이름 저장
function saveWallTypeName(wallId, newName, inputElement) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    const trimmedName = newName.trim();
    
    // 빈 이름 체크
    if (!trimmedName) {
        alert('WallType 이름을 입력해주세요.');
        inputElement.focus();
        return;
    }
    
    // 중복 이름 체크 (자신 제외)
    const isDuplicate = revitWallTypes.some(w => w.id !== wallId && w.wallType === trimmedName);
    if (isDuplicate) {
        alert('이미 존재하는 WallType 이름입니다. 다른 이름을 입력해주세요.');
        inputElement.focus();
        return;
    }
    
    // 이름 저장
    const oldName = wall.wallType;
    wall.wallType = trimmedName;
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`✅ WallType 이름 변경 완료: "${oldName}" → "${trimmedName}"`);
}

// WallType 이름 입력 키보드 이벤트 처리
function handleWallTypeNameKeydown(event, wallId, currentValue, inputElement) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveWallTypeName(wallId, currentValue, inputElement);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        // 편집 취소 - 테이블 다시 렌더링
        updateRevitWallTable();
        console.log('✖️ WallType 이름 편집 취소');
    }
}

// WallType 두께 더블클릭 편집 기능
function editRevitWallThickness(wallId) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    // 테이블에서 해당 셀 찾기
    const wallRow = document.querySelector(`tr[data-wall-id="${wallId}"]`);
    if (!wallRow) return;
    
    const thicknessCell = wallRow.children[wallRow.children.length - 1]; // 마지막 셀 (두께 셀)
    const currentThickness = wall.thickness || '';
    
    // 기존 내용을 input으로 대체
    thicknessCell.innerHTML = `
        <input type="text" value="${currentThickness}" 
               style="width: 100%; padding: 6px; border: 2px solid #3b82f6; border-radius: 4px; text-align: center; font-size: 14px; background: #f0f9ff; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);"
               onblur="saveWallThickness(${wallId}, this.value, this)"
               onkeydown="handleWallThicknessKeydown(event, ${wallId}, this.value, this)"
               id="thicknessInput_${wallId}"
               placeholder="두께 입력 (숫자)">
    `;
    
    // 입력 필드에 포커스 및 텍스트 선택
    const input = document.getElementById(`thicknessInput_${wallId}`);
    if (input) {
        input.focus();
        input.select();
    }
    
    console.log(`✏️ WallType 두께 편집 모드 활성화: ${currentThickness}`);
}

// WallType 두께 저장
function saveWallThickness(wallId, newThickness, inputElement) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    const trimmedThickness = newThickness.trim();
    
    // 숫자 유효성 검사 (빈 값은 허용)
    if (trimmedThickness && isNaN(trimmedThickness)) {
        alert('두께는 숫자로 입력해주세요.');
        inputElement.focus();
        return;
    }
    
    // 두께 저장
    const oldThickness = wall.thickness;
    wall.thickness = trimmedThickness;
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`✅ WallType 두께 변경 완료: "${oldThickness}" → "${trimmedThickness}"`);
}

// WallType 두께 입력 키보드 이벤트 처리
function handleWallThicknessKeydown(event, wallId, currentValue, inputElement) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveWallThickness(wallId, currentValue, inputElement);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        // 편집 취소 - 테이블 다시 렌더링
        updateRevitWallTable();
        console.log('✖️ WallType 두께 편집 취소');
    }
}

// 자재 선택 테이블 필터링
function filterMaterialSelectionTable(searchValue) {
    const table = document.getElementById('materialSelectionTable');
    if (!table) return;
    
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    const searchLower = searchValue.toLowerCase();
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        // ID와 자재명 컬럼에서 검색
        if (cells.length > 1) {
            const id = cells[0].textContent.toLowerCase();
            const name = cells[1].textContent.toLowerCase();
            
            if (id.includes(searchLower) || name.includes(searchLower)) {
                found = true;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}


// =============================================================================
// JSON 내보내기 및 불러오기 기능
// =============================================================================

function exportRevitWallTypesToJSON() {
    console.log('📤 벽체 타입 JSON 내보내기 시작');
    
    try {
        // 현재 날짜와 시간으로 파일명 생성
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `revit-wall-types-${timestamp}.json`;
        
        // 내보낼 데이터 구성
        const exportData = {
            exportInfo: {
                timestamp: now.toISOString(),
                version: '1.0',
                description: '벽체 타입 관리 데이터',
                totalWallTypes: revitWallTypes.length
            },
            wallTypes: revitWallTypes
        };
        
        // JSON 문자열로 변환
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // 파일 다운로드
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ JSON 내보내기 완료:', filename);
        alert(`벽체 타입 데이터가 성공적으로 내보내졌습니다.\n파일명: ${filename}\n벽체 타입 수: ${revitWallTypes.length}개`);
        
    } catch (error) {
        console.error('❌ JSON 내보내기 실패:', error);
        alert('JSON 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

function importRevitWallTypesFromJSON() {
    console.log('📥 벽체 타입 JSON 불러오기 시작');
    
    // 파일 입력 요소 생성
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // 데이터 유효성 검사
                if (!importData.wallTypes || !Array.isArray(importData.wallTypes)) {
                    throw new Error('유효하지 않은 JSON 형식입니다. wallTypes 배열이 필요합니다.');
                }
                
                // 가져오기 전 확인
                const importCount = importData.wallTypes.length;
                const currentCount = revitWallTypes.length;
                
                const confirmMessage = `JSON 파일을 불러오시겠습니까?\n\n` +
                    `현재 벽체 타입 수: ${currentCount}개\n` +
                    `가져올 벽체 타입 수: ${importCount}개\n\n` +
                    `기존 데이터는 새로운 데이터로 대체됩니다.`;
                
                if (!confirm(confirmMessage)) {
                    return;
                }
                
                // 데이터 교체
                revitWallTypes = importData.wallTypes;
                revitWallTypeCounter = Math.max(...revitWallTypes.map(w => w.id || 0), 0);
                
                // 데이터 저장
                saveRevitWallTypes();
                
                // UI 업데이트
                updateRevitWallTable();
                
                console.log('✅ JSON 불러오기 완료:', importCount + '개 벽체 타입');
                alert(`벽체 타입 데이터가 성공적으로 불러와졌습니다.\n` +
                    `불러온 벽체 타입 수: ${importCount}개\n` +
                    `파일 정보: ${importData.exportInfo?.description || '정보 없음'}`);
                
            } catch (error) {
                console.error('❌ JSON 불러오기 실패:', error);
                alert('JSON 불러오기 중 오류가 발생했습니다: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}


// =============================================================================
// CSS 스타일 추가
// =============================================================================

function addRevitTypeMappingStyles() {
    const styleId = 'revit-type-matching-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .revit-type-matching-container {
            width: 100%;
            height: 100%;
            min-width: 1400px;
            display: flex;
            flex-direction: column;
        }

        .project-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .panel-description {
            color: #64748b;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .action-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
        }

        .action-section h4 {
            margin: 0 0 15px 0;
            color: #1e293b;
            font-size: 16px;
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .status-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }

        .status-label {
            color: #64748b;
            font-weight: 500;
        }

        .status-value {
            color: #1e293b;
            font-weight: 600;
        }


        .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
        }

        .modal-footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        /* 작은 벽체 테이블 스타일 */
        .wall-table-small {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            background: white;
        }

        .wall-table-small th,
        .wall-table-small td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            text-align: center;
            vertical-align: middle;
        }

        .wall-table-small .header-main {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            font-size: 10px;
        }

        .wall-table-small .header-sub {
            background: #f8fafc;
            color: #4a5568;
            font-weight: 500;
            font-size: 9px;
        }

        .wall-table-small tbody tr:nth-child(even) {
            background: #f8fafc;
        }

        .wall-table-small tbody tr:hover {
            background: #e2e8f0;
        }

        .wall-table-small tbody tr.selected {
            background: #dbeafe;
        }

        /* 자재 셀 스타일 */
        .material-cell {
            background: #f8fafc;
            border: 1px dashed #cbd5e1 !important;
            transition: all 0.2s ease;
        }

        .material-cell:hover {
            background: #e0f2fe;
            border-color: #0ea5e9 !important;
        }

        /* 일위대가 컬럼 스타일 */
        .col-unitprice {
            min-width: 180px;
            width: 180px;
        }

        .col-unitprice select {
            width: 100% !important;
            padding: 2px 4px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            font-size: 11px;
            background: white;
            color: #1e293b;
        }

        .col-unitprice select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        /* 드롭다운 스타일 */
        .dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            z-index: 1000;
            min-width: 200px;
            padding: 8px 0;
            margin: 2px 0 0;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .dropdown-item {
            display: block;
            width: 100%;
            padding: 8px 16px;
            clear: both;
            font-weight: 400;
            color: #1f2937;
            text-decoration: none;
            white-space: nowrap;
            background-color: transparent;
            border: 0;
            cursor: pointer;
            font-size: 14px;
        }

        .dropdown-item:hover {
            background-color: #f3f4f6;
        }

        .dropdown-divider {
            height: 0;
            margin: 8px 0;
            overflow: hidden;
            border-top: 1px solid #e5e7eb;
        }

        /* 일위대가 폼 스타일 */
        .unit-price-basic-form {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
        }

        .form-group label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .form-group .required {
            color: #dc2626;
        }

        .form-group input,
        .form-group select {
            padding: 10px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            font-size: 14px;
            background: white;
            transition: all 0.2s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input::placeholder {
            color: #9ca3af;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
        }

        .modal-actions .btn {
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .modal-actions .btn-secondary {
            background: #6b7280;
            color: white;
        }

        .modal-actions .btn-secondary:hover {
            background: #4b5563;
        }

        .modal-actions .btn-primary {
            background: #3b82f6;
            color: white;
        }

        .modal-actions .btn-primary:hover {
            background: #2563eb;
        }

        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }
        }

        @media (max-width: 480px) {
            .form-grid {
                grid-template-columns: 1fr;
                gap: 10px;
            }
        }

        /* 일위대가 관리 메인 페이지 스타일 */
        .unit-price-management-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .unit-price-header {
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .controls-section {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            justify-content: flex-start;
        }

        .controls-section .btn {
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .controls-section .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        .controls-section .btn-sm {
            padding: 8px 16px;
            font-size: 12px;
            font-weight: 500;
        }

        .controls-section .btn-success {
            background: linear-gradient(45deg, #10b981, #059669);
            color: white;
        }

        .controls-section .btn-info {
            background: linear-gradient(45deg, #3b82f6, #2563eb);
            color: white;
        }

        .controls-section .btn-warning {
            background: linear-gradient(45deg, #f59e0b, #d97706);
            color: white;
        }

        .unit-price-list-container {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
        }

        .unit-price-list-container h4 {
            margin: 0 0 20px 0;
            color: #1f2937;
            font-size: 18px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .unit-price-list-container h4 i {
            color: #667eea;
        }

        /* Excel형 테이블 스타일 */
        .unit-price-table-container {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
        }

        .unit-price-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            line-height: 1.5;
        }

        .unit-price-table thead th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            padding: 12px 8px;
            text-align: center;
            border: 1px solid #5a67d8;
            position: sticky;
            top: 0;
            z-index: 10;
            font-size: 13px;
        }

        .unit-price-table thead th.cost-header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: 1px solid #059669;
        }

        .unit-price-table tbody td {
            padding: 10px 8px;
            border: 1px solid #e5e7eb;
            vertical-align: middle;
        }

        .unit-price-table-row:nth-child(even) {
            background: #f8fafc;
        }

        .unit-price-table-row:hover {
            background: #e0f2fe;
        }

        .text-center {
            text-align: center;
        }

        .item-name {
            font-weight: 600;
            color: #1f2937;
            min-width: 100px;
        }

        .item-specs {
            font-size: 12px;
            color: #6b7280;
            min-width: 120px;
        }

        .cost-cell {
            text-align: right;
            font-weight: 600;
            min-width: 80px;
            font-family: 'Consolas', monospace;
        }

        .cost-cell.material {
            color: #dc2626;
        }

        .cost-cell.labor {
            color: #2563eb;
        }

        .cost-cell.expense {
            color: #7c2d12;
        }

        .cost-cell.total {
            color: #059669;
            background: #f0fdf4;
            font-weight: 700;
        }

        .date-cell {
            font-size: 12px;
            color: #6b7280;
            text-align: center;
            min-width: 80px;
        }

        .action-cell {
            text-align: center;
            white-space: nowrap;
            min-width: 80px;
        }

        .action-cell .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 0 2px;
        }

        .action-cell .btn-edit {
            background: #f59e0b;
            color: white;
        }

        .action-cell .btn-edit:hover {
            background: #d97706;
        }

        .action-cell .btn-delete {
            background: #ef4444;
            color: white;
        }

        .action-cell .btn-delete:hover {
            background: #dc2626;
        }

        /* 합계 행 스타일 */
        .unit-price-table tfoot {
            position: sticky;
            bottom: 0;
            background: white;
            z-index: 5;
        }

        .totals-row {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            font-weight: 700;
        }

        .totals-row td {
            border: 2px solid #374151;
            padding: 12px 8px;
        }

        .totals-label {
            text-align: center;
            font-size: 15px;
            font-weight: 700;
        }

        .totals-cell {
            text-align: right;
            font-family: 'Consolas', monospace;
            font-size: 14px;
            font-weight: 700;
        }

        .totals-cell.material {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
        }

        .totals-cell.labor {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
        }

        .totals-cell.expense {
            background: linear-gradient(135deg, #7c2d12 0%, #92400e 100%);
            color: white;
        }

        .totals-cell.grand-total {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            font-size: 16px;
            border: 2px solid #047857;
        }

        /* 세부아이템 테이블 단가 컬럼 우측 정렬 */
        .unit-price-detail-table .material-price,
        .unit-price-detail-table .labor-price,
        .unit-price-detail-table .expense-price,
        .unit-price-detail-table .quantity {
            text-align: right !important;
        }

        /* 구성품 테이블 규격/단위 컬럼 중앙 정렬 */
        .unit-price-detail-table td:nth-child(2),  /* 규격 */
        .unit-price-detail-table td:nth-child(3)   /* 단위 */ {
            text-align: center !important;
        }

        /* 구성품 테이블 td 요소들의 우측 정렬 */
        .unit-price-detail-table td:nth-child(4),  /* 수량 */
        .unit-price-detail-table td:nth-child(5),  /* 재료비 단가 */
        .unit-price-detail-table td:nth-child(6),  /* 재료비 금액 */
        .unit-price-detail-table td:nth-child(7),  /* 노무비 단가 */
        .unit-price-detail-table td:nth-child(8),  /* 노무비 금액 */
        .unit-price-detail-table td:nth-child(9),  /* 경비 단가 */
        .unit-price-detail-table td:nth-child(10), /* 경비 금액 */
        .unit-price-detail-table td:nth-child(11), /* 합계 단가 */
        .unit-price-detail-table td:nth-child(12)  /* 합계 금액 */ {
            text-align: right !important;
        }

        .unit-price-empty {
            grid-column: 1 / -1;
            text-align: center;
            padding: 60px 20px;
            color: #9ca3af;
            font-size: 16px;
        }

        .unit-price-empty i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #d1d5db;
        }

        @media (max-width: 768px) {
            .unit-price-items-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
            
            .controls-section {
                flex-direction: column;
                align-items: center;
            }
            
            .controls-section .btn {
                width: 100%;
                max-width: 280px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// 스타일 자동 로드
document.addEventListener('DOMContentLoaded', addRevitTypeMappingStyles);

// 전역 함수로 노출
window.openRevitTypeMatching = openRevitTypeMatching;

// =============================================================================
// 일위대가 관리 시스템
// =============================================================================

// 전역 변수
let unitPriceItems = []; // 일위대가 아이템 목록
let currentUnitPriceData = {}; // 현재 편집 중인 일위대가 데이터

// 일위대가 관리 모달 열기
function openUnitPriceManagement() {
    console.log('💰 일위대가 관리 모달 열기');
    
    // createSubModal 함수 존재 여부 확인
    if (typeof createSubModal !== 'function') {
        console.error('❌ createSubModal 함수를 찾을 수 없습니다.');
        alert('모달 시스템을 찾을 수 없습니다. 페이지를 새로고침 해주세요.');
        return;
    }
    
    // 모달 HTML 생성
    const modalHTML = createUnitPriceManagementModal();
    
    // 모달 표시 (닫기 버튼 추가)
    const modal = createSubModal('💰 일위대가 관리', modalHTML, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true
    });
    
    if (modal) {
        // 모달이 DOM에 추가된 후 초기화
        setTimeout(() => {
            loadUnitPriceItems();
            renderUnitPriceItemsList();
        }, 100);
    }
}

// 일위대가 관리 모달 HTML 생성
function createUnitPriceManagementModal() {
    return `
        <div class="unit-price-management-container">
            <!-- 헤더 및 컨트롤 -->
            <div class="unit-price-header">
                <div class="controls-section">
                    <button class="btn btn-success" onclick="openUnitPriceBasicModal()">
                        <i class="fas fa-plus"></i> 새 일위대가 추가
                    </button>
                    <button class="btn btn-info" onclick="exportUnitPriceData()">
                        <i class="fas fa-download"></i> 데이터 내보내기
                    </button>
                    <button class="btn btn-warning" onclick="importUnitPriceData()">
                        <i class="fas fa-upload"></i> 데이터 가져오기
                    </button>
                </div>
            </div>
            
            <!-- 일위대가 목록 -->
            <div class="unit-price-list-container">
                <h4><i class="fas fa-list"></i> 일위대가 목록</h4>
                <div id="unitPriceItemsList" class="unit-price-items-grid">
                    <!-- 동적으로 생성되는 일위대가 아이템들 -->
                </div>
            </div>
        </div>
    `;
}

// 기본 정보 입력 모달 열기
function openUnitPriceBasicModal(editData = null) {
    console.log('📝 일위대가 기본 정보 입력 모달 열기');
    
    const isEdit = editData !== null;
    const modalTitle = isEdit ? '일위대가 수정' : '새 일위대가 추가';
    
    const basicModalHTML = `
        <div class="unit-price-basic-form">
            <div class="form-grid">
                <!-- 아이템명 -->
                <div class="form-group">
                    <label>아이템 <span class="required">*</span></label>
                    <input type="text" id="itemName" placeholder="예: C-STUD" value="${editData?.basic?.itemName || ''}" required>
                </div>
                
                <!-- 간격 드롭다운 -->
                <div class="form-group">
                    <label>간격 <span class="required">*</span></label>
                    <select id="spacing" required>
                        <option value="">선택하세요</option>
                        <option value="@400" ${editData?.basic?.spacing === '@400' ? 'selected' : ''}>@400</option>
                        <option value="@450" ${editData?.basic?.spacing === '@450' ? 'selected' : ''}>@450</option>
                        <option value="@500" ${editData?.basic?.spacing === '@500' ? 'selected' : ''}>@500</option>
                    </select>
                </div>
                
                <!-- 높이 드롭다운 -->
                <div class="form-group">
                    <label>높이 <span class="required">*</span></label>
                    <select id="height" required>
                        <option value="">선택하세요</option>
                        <option value="3600이하" ${editData?.basic?.height === '3600이하' ? 'selected' : ''}>3600이하</option>
                        <option value="3600이상" ${editData?.basic?.height === '3600이상' ? 'selected' : ''}>3600이상</option>
                    </select>
                </div>
                
                <!-- 규격 -->
                <div class="form-group">
                    <label>SIZE <span class="required">*</span></label>
                    <input type="text" id="size" placeholder="예: 50형" value="${editData?.basic?.size || ''}" required>
                </div>
                
                <!-- 부위 -->
                <div class="form-group">
                    <label>부위 <span class="required">*</span></label>
                    <input type="text" id="location" placeholder="예: 벽체" value="${editData?.basic?.location || ''}" required>
                </div>
                
                <!-- 공종 -->
                <div class="form-group">
                    <label>공종 <span class="required">*</span></label>
                    <input type="text" id="workType" placeholder="예: 경량" value="${editData?.basic?.workType || ''}" required>
                </div>
                
                <!-- 단위 드롭다운 -->
                <div class="form-group">
                    <label>UNIT <span class="required">*</span></label>
                    <select id="unit" required>
                        <option value="">선택하세요</option>
                        <option value="M2" ${editData?.basic?.unit === 'M2' ? 'selected' : ''}>M2</option>
                        <option value="M" ${editData?.basic?.unit === 'M' ? 'selected' : ''}>M</option>
                    </select>
                </div>
            </div>
            
            <!-- 버튼들은 createSubModal에서 처리 -->
        </div>
    `;
    
    // 현재 편집 중인 데이터 저장
    if (editData) {
        currentUnitPriceData = JSON.parse(JSON.stringify(editData));
    } else {
        currentUnitPriceData = {};
    }
    
    // 기본 정보 입력 모달 표시 (취소 및 세부 설정 버튼)
    const modal = createSubModal(modalTitle, basicModalHTML, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: isEdit ? '수정 계속' : '세부 설정', class: 'btn-primary', onClick: (modal) => proceedToDetailInput(isEdit) }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true
    });
}

// 기본 정보에서 세부 설정으로 진행
function proceedToDetailInput(isEdit = false) {
    // 입력값 수집
    const basicData = {
        itemName: document.getElementById('itemName').value.trim(),
        spacing: document.getElementById('spacing').value,
        height: document.getElementById('height').value,
        size: document.getElementById('size').value.trim(),
        location: document.getElementById('location').value.trim(),
        workType: document.getElementById('workType').value.trim(),
        unit: document.getElementById('unit').value
    };
    
    // 필수 필드 검증
    const requiredFields = ['itemName', 'spacing', 'height', 'size', 'location', 'workType', 'unit'];
    for (const field of requiredFields) {
        if (!basicData[field]) {
            alert(`${getFieldLabel(field)} 필드를 입력해주세요.`);
            return;
        }
    }
    
    // 현재 데이터에 기본 정보 저장
    currentUnitPriceData.basic = basicData;
    
    // 기존 구성품이 없다면 초기화
    if (!currentUnitPriceData.components) {
        currentUnitPriceData.components = [];
    }
    
    // 현재 모달 닫기
    closeCurrentModal();
    
    // 세부 입력 모달 열기
    setTimeout(() => {
        openUnitPriceDetailModal(isEdit);
    }, 100);
}

// 세부 아이템 입력 모달 열기
function openUnitPriceDetailModal(isEdit = false) {
    console.log('🔧 세부 아이템 입력 모달 열기');
    
    const basic = currentUnitPriceData.basic;
    const itemSummary = `${basic.itemName} ${basic.spacing} ${basic.height} ${basic.size} | ${basic.location} | ${basic.workType} | ${basic.unit}`;
    const modalTitle = isEdit ? '세부 아이템 수정' : '세부 아이템 설정';
    
    const detailModalHTML = `
        <div class="unit-price-detail-form">
            <div class="detail-header">
                <h4><i class="fas fa-info-circle"></i> ${itemSummary}</h4>
            </div>
            
            <div class="controls-section">
                <button class="btn btn-success btn-sm" onclick="addComponentRow()">
                    <i class="fas fa-plus"></i> 구성품 추가
                </button>
            </div>
            
            <!-- 세부 아이템 테이블 (석고보드 스타일) -->
            <div class="unit-price-table-container" style="max-height: 500px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table class="unit-price-detail-table" style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;">
                    <thead style="background: #f8fafc; position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 150px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">품명</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">규격</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">단위</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">수량</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-align: center; font-weight: 600;">재료비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-align: center; font-weight: 600;">노무비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-align: center; font-weight: 600;">경비</th>
                            <th colspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; text-align: center; font-weight: 600;">합계</th>
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">삭제</th>
                        </tr>
                        <tr>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #ecfdf5; color: #065f46; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #ecfdf5; color: #065f46; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #eff6ff; color: #1e40af; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #eff6ff; color: #1e40af; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #fefbeb; color: #92400e; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #fefbeb; color: #92400e; text-align: center; font-weight: 500;">금액</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 80px; background: #fef2f2; color: #b91c1c; text-align: center; font-weight: 500;">단가</th>
                            <th style="padding: 8px; border: 1px solid #e2e8f0; min-width: 90px; background: #fef2f2; color: #b91c1c; text-align: center; font-weight: 500;">금액</th>
                        </tr>
                    </thead>
                    <tbody id="componentsTable">
                        <!-- 동적으로 추가되는 행들 -->
                    </tbody>
                    <!-- 고정 로우들 -->
                    <tbody id="fixedRowsTable">
                        <!-- 자재로스 -->
                        <tr class="fixed-row material-loss-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재로스</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="3" step="0.1" oninput="calculateGrandTotal()" placeholder="3.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 700;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재운반비 및 양중비 -->
                        <tr class="fixed-row transport-cost-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재운반비 및 양중비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="1.5" step="0.1" oninput="calculateGrandTotal()" placeholder="1.5" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 700;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재비 이윤 -->
                        <tr class="fixed-row material-profit-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재비 이윤</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="15" step="0.1" oninput="calculateGrandTotal()" placeholder="15.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 700;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 공구손료 및 기계경비 -->
                        <tr class="fixed-row tool-expense-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">공구손료 및 기계경비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">노무비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="2" step="0.1" oninput="calculateGrandTotal()" placeholder="2.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-expense-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="fixed-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 700;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                    </tbody>
                    <tfoot style="background: #f9fafb; position: sticky; bottom: 0;">
                        <tr class="summary-row">
                            <td colspan="4" style="padding: 12px 8px; border: 1px solid #e2e8f0; font-weight: 700; text-align: center; background: #6366f1; color: white;"><strong>총 합계</strong></td>
                            <td colspan="2" id="totalMaterial" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #ecfdf5; color: #065f46;">0원</td>
                            <td colspan="2" id="totalLabor" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #eff6ff; color: #1e40af;">0원</td>
                            <td colspan="2" id="totalExpense" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #fefbeb; color: #92400e;">0원</td>
                            <td colspan="2" id="grandTotal" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 700; background: #fef2f2; color: #b91c1c; font-size: 14px;">0원</td>
                            <td style="border: 1px solid #e2e8f0; background: #6366f1;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- 버튼들은 createSubModal에서 처리 -->
        </div>
    `;
    
    // 세부 입력 모달 표시 (취소 및 저장 버튼)
    const modal = createSubModal(modalTitle, detailModalHTML, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: isEdit ? '수정 완료' : '저장', class: 'btn-primary', onClick: (modal) => saveUnitPriceItem() }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: true
    });
    
    if (modal) {
        setTimeout(() => {
            // 기존 구성품이 있다면 로드
            if (currentUnitPriceData.components && currentUnitPriceData.components.length > 0) {
                loadExistingComponents();
            } else {
                // 기본 구성품 행 1개 추가
                addComponentRow();
            }
        }, 100);
    }
}

// 필드 라벨 가져오기
function getFieldLabel(field) {
    const labels = {
        itemName: '아이템',
        spacing: '간격',
        height: '높이',
        size: 'SIZE',
        location: '부위',
        workType: '공종',
        unit: 'UNIT'
    };
    return labels[field] || field;
}

// 구성품 행 추가 (고정 로우 위에 삽입)
function addComponentRow(componentData = null) {
    const tbody = document.getElementById('componentsTable');
    if (!tbody) return;
    
    const rowIndex = tbody.children.length;
    const row = document.createElement('tr');
    
    // 기존 데이터가 있으면 사용, 없으면 빈 값
    const data = componentData || {
        name: '',
        spec: '',
        unit: '',
        quantity: '',
        materialPrice: '',
        laborPrice: '',
        expensePrice: ''
    };
    
    row.innerHTML = `
        <td style="padding: 8px; border: 1px solid #e2e8f0;"><input type="text" class="component-name" value="${data.name}" placeholder="품명 입력" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;"><input type="text" class="component-spec" value="${data.spec}" placeholder="규격 입력" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: center;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;"><input type="text" class="component-unit" value="${data.unit}" placeholder="단위" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: center;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;"><input type="number" class="quantity" value="${data.quantity}" step="0.0001" oninput="calculateRowTotal(${rowIndex})" placeholder="0.0000" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;"><input type="text" class="material-price" value="${data.materialPrice ? parseFloat(data.materialPrice).toLocaleString() : ''}" oninput="formatPriceInput(this, ${rowIndex})" placeholder="0" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="material-amount">0원</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;"><input type="text" class="labor-price" value="${data.laborPrice ? parseFloat(data.laborPrice).toLocaleString() : ''}" oninput="formatPriceInput(this, ${rowIndex})" placeholder="0" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;" class="labor-amount">0원</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;"><input type="text" class="expense-price" value="${data.expensePrice ? parseFloat(data.expensePrice).toLocaleString() : ''}" oninput="formatPriceInput(this, ${rowIndex})" placeholder="0" style="width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;"></td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="expense-amount">0원</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="total-price">0원</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 700;" class="total-amount">0원</td>
        <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
            <button onclick="removeComponentRow(this)" style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" title="삭제">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    
    // 기존 데이터가 있으면 계산
    if (componentData && (data.quantity || data.materialPrice || data.laborPrice || data.expensePrice)) {
        setTimeout(() => calculateRowTotal(rowIndex), 100);
    }
}

// 가격 입력 필드 콤마 포맷팅
function formatPriceInput(input, rowIndex) {
    // 숫자만 추출
    let value = input.value.replace(/[^0-9]/g, '');
    
    // 빈 값 처리
    if (value === '') {
        input.value = '';
        calculateRowTotal(rowIndex);
        return;
    }
    
    // 숫자를 콤마 형식으로 변환
    const number = parseInt(value);
    input.value = number.toLocaleString();
    
    // 계산 수행
    calculateRowTotal(rowIndex);
}

// 구성품 행 삭제
function removeComponentRow(button) {
    const row = button.closest('tr');
    row.remove();
    calculateGrandTotal();
}

// 행별 계산
function calculateRowTotal(rowIndex) {
    const rows = document.querySelectorAll('#componentsTable tr');
    if (rowIndex >= rows.length) return;
    
    const row = rows[rowIndex];
    const quantity = parseFloat(row.querySelector('.quantity').value) || 0;
    const materialPrice = parseFloat(row.querySelector('.material-price').value.replace(/[,]/g, '')) || 0;
    const laborPrice = parseFloat(row.querySelector('.labor-price').value.replace(/[,]/g, '')) || 0;
    const expensePrice = parseFloat(row.querySelector('.expense-price').value.replace(/[,]/g, '')) || 0;
    
    // 금액 계산
    const materialAmount = Math.round(quantity * materialPrice);
    const laborAmount = Math.round(quantity * laborPrice);
    const expenseAmount = Math.round(quantity * expensePrice);
    const totalPrice = materialPrice + laborPrice + expensePrice;
    const totalAmount = materialAmount + laborAmount + expenseAmount;
    
    // UI 업데이트
    row.querySelector('.material-amount').textContent = materialAmount.toLocaleString() + '원';
    row.querySelector('.labor-amount').textContent = laborAmount.toLocaleString() + '원';
    row.querySelector('.expense-amount').textContent = expenseAmount.toLocaleString() + '원';
    row.querySelector('.total-price').textContent = totalPrice.toLocaleString() + '원';
    row.querySelector('.total-amount').textContent = totalAmount.toLocaleString() + '원';
    
    // 전체 합계 재계산
    calculateGrandTotal();
}

// 전체 합계 계산 (구성품 + 고정 로우)
function calculateGrandTotal() {
    let totalMaterial = 0, totalLabor = 0, totalExpense = 0, grandTotal = 0;
    
    // 구성품 테이블 계산
    document.querySelectorAll('#componentsTable tr').forEach(row => {
        const materialElement = row.querySelector('.material-amount');
        const laborElement = row.querySelector('.labor-amount');
        const expenseElement = row.querySelector('.expense-amount');
        const totalElement = row.querySelector('.total-amount');
        
        if (materialElement) totalMaterial += parseFloat(materialElement.textContent.replace(/[,원]/g, '') || 0);
        if (laborElement) totalLabor += parseFloat(laborElement.textContent.replace(/[,원]/g, '') || 0);
        if (expenseElement) totalExpense += parseFloat(expenseElement.textContent.replace(/[,원]/g, '') || 0);
        if (totalElement) grandTotal += parseFloat(totalElement.textContent.replace(/[,원]/g, '') || 0);
    });
    
    // 고정 로우 계산 (백분율 기반)
    calculateFixedRows(totalMaterial, totalLabor, totalExpense);
    
    // 고정 로우 금액을 카테고리별로 추가
    // 자재로스, 자재운반비, 자재비이윤 → 재료비에 추가
    const materialLossRow = document.querySelector('.material-loss-row');
    const transportCostRow = document.querySelector('.transport-cost-row');
    const materialProfitRow = document.querySelector('.material-profit-row');
    
    if (materialLossRow) {
        const amount = parseFloat(materialLossRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalMaterial += amount;
        grandTotal += amount;
    }
    if (transportCostRow) {
        const amount = parseFloat(transportCostRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalMaterial += amount;
        grandTotal += amount;
    }
    if (materialProfitRow) {
        const amount = parseFloat(materialProfitRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalMaterial += amount;
        grandTotal += amount;
    }
    
    // 공구손료 및 기계경비 → 경비에 추가
    const toolExpenseRow = document.querySelector('.tool-expense-row');
    if (toolExpenseRow) {
        const amount = parseFloat(toolExpenseRow.querySelector('.fixed-expense-amount')?.textContent.replace(/[,원]/g, '') || 0);
        totalExpense += amount;
        grandTotal += amount;
    }
    
    // UI 업데이트
    const totalMaterialElement = document.getElementById('totalMaterial');
    const totalLaborElement = document.getElementById('totalLabor');
    const totalExpenseElement = document.getElementById('totalExpense');
    const grandTotalElement = document.getElementById('grandTotal');
    
    if (totalMaterialElement) totalMaterialElement.textContent = totalMaterial.toLocaleString() + '원';
    if (totalLaborElement) totalLaborElement.textContent = totalLabor.toLocaleString() + '원';
    if (totalExpenseElement) totalExpenseElement.textContent = totalExpense.toLocaleString() + '원';
    if (grandTotalElement) grandTotalElement.textContent = grandTotal.toLocaleString() + '원';
}

// 고정 로우 계산 (사용자 입력 퍼센트 기반)
function calculateFixedRows(baseMaterial, baseLabor, baseExpense) {
    // 자재로스 - 자재비의 X%
    const materialLossRow = document.querySelector('.material-loss-row');
    if (materialLossRow) {
        const quantityInput = materialLossRow.querySelector('.fixed-quantity');
        const percentage = parseFloat(quantityInput?.value || 3) / 100;
        const materialLoss = Math.round(baseMaterial * percentage);
        materialLossRow.querySelector('.fixed-material-price').textContent = materialLoss.toLocaleString();
        materialLossRow.querySelector('.fixed-material-amount').textContent = materialLoss.toLocaleString() + '원';
        materialLossRow.querySelector('.fixed-total-price').textContent = materialLoss.toLocaleString() + '원';
        materialLossRow.querySelector('.fixed-total-amount').textContent = materialLoss.toLocaleString() + '원';
    }
    
    // 자재운반비 및 양중비 - 자재비의 X%
    const transportCostRow = document.querySelector('.transport-cost-row');
    if (transportCostRow) {
        const quantityInput = transportCostRow.querySelector('.fixed-quantity');
        const percentage = parseFloat(quantityInput?.value || 1.5) / 100;
        const transportCost = Math.round(baseMaterial * percentage);
        transportCostRow.querySelector('.fixed-material-price').textContent = transportCost.toLocaleString();
        transportCostRow.querySelector('.fixed-material-amount').textContent = transportCost.toLocaleString() + '원';
        transportCostRow.querySelector('.fixed-total-price').textContent = transportCost.toLocaleString() + '원';
        transportCostRow.querySelector('.fixed-total-amount').textContent = transportCost.toLocaleString() + '원';
    }
    
    // 자재비 이윤 - 자재비의 X%
    const materialProfitRow = document.querySelector('.material-profit-row');
    if (materialProfitRow) {
        const quantityInput = materialProfitRow.querySelector('.fixed-quantity');
        const percentage = parseFloat(quantityInput?.value || 15) / 100;
        const materialProfit = Math.round(baseMaterial * percentage);
        materialProfitRow.querySelector('.fixed-material-price').textContent = materialProfit.toLocaleString();
        materialProfitRow.querySelector('.fixed-material-amount').textContent = materialProfit.toLocaleString() + '원';
        materialProfitRow.querySelector('.fixed-total-price').textContent = materialProfit.toLocaleString() + '원';
        materialProfitRow.querySelector('.fixed-total-amount').textContent = materialProfit.toLocaleString() + '원';
    }
    
    // 공구손료 및 기계경비 - 노무비의 X%
    const toolExpenseRow = document.querySelector('.tool-expense-row');
    if (toolExpenseRow) {
        const quantityInput = toolExpenseRow.querySelector('.fixed-quantity');
        const percentage = parseFloat(quantityInput?.value || 2) / 100;
        const toolExpense = Math.round(baseLabor * percentage);
        toolExpenseRow.querySelector('.fixed-expense-price').textContent = toolExpense.toLocaleString();
        toolExpenseRow.querySelector('.fixed-expense-amount').textContent = toolExpense.toLocaleString() + '원';
        toolExpenseRow.querySelector('.fixed-total-price').textContent = toolExpense.toLocaleString() + '원';
        toolExpenseRow.querySelector('.fixed-total-amount').textContent = toolExpense.toLocaleString() + '원';
    }
}

// 기존 구성품 로드
function loadExistingComponents() {
    if (!currentUnitPriceData.components) return;
    
    currentUnitPriceData.components.forEach(component => {
        addComponentRow(component);
    });
}


// 현재 구성품 데이터 수집 (고정 로우 제외)
function collectCurrentComponents() {
    const components = [];
    const rows = document.querySelectorAll('#componentsTable tr'); // 고정 로우는 별도 테이블이므로 제외됨
    
    rows.forEach(row => {
        const name = row.querySelector('.component-name')?.value?.trim() || '';
        const spec = row.querySelector('.component-spec')?.value?.trim() || '';
        const unit = row.querySelector('.component-unit')?.value?.trim() || '';
        const quantity = row.querySelector('.quantity')?.value || '';
        const materialPrice = row.querySelector('.material-price')?.value.replace(/[,]/g, '') || '';
        const laborPrice = row.querySelector('.labor-price')?.value.replace(/[,]/g, '') || '';
        const expensePrice = row.querySelector('.expense-price')?.value.replace(/[,]/g, '') || '';
        
        // 빈 행이 아닌 경우만 저장
        if (name || spec || unit || quantity || materialPrice || laborPrice || expensePrice) {
            components.push({
                name, spec, unit, quantity, materialPrice, laborPrice, expensePrice
            });
        }
    });
    
    currentUnitPriceData.components = components;
}

// 일위대가 아이템 저장
function saveUnitPriceItem() {
    // 구성품 데이터 수집
    collectCurrentComponents();
    
    // 유효성 검증
    if (!currentUnitPriceData.basic) {
        alert('기본 정보가 없습니다.');
        return;
    }
    
    if (!currentUnitPriceData.components || currentUnitPriceData.components.length === 0) {
        alert('최소 하나 이상의 구성품을 입력해주세요.');
        return;
    }
    
    // 고유 ID 생성
    const basic = currentUnitPriceData.basic;
    const id = currentUnitPriceData.id || generateUnitPriceId(basic);
    
    // 합계 계산
    const summary = calculateItemSummary();
    
    // 비용 총계 계산 (렌더링에서 사용) 
    const totalCosts = {
        totalMaterial: summary.totalMaterial,  // ✅ 통일된 속성명
        totalLabor: summary.totalLabor,        // ✅ 통일된 속성명  
        totalExpense: summary.totalExpense,    // ✅ 통일된 속성명
        grandTotal: summary.grandTotal
    };
    
    // 완성된 일위대가 아이템 생성
    const unitPriceItem = {
        id: id,
        basic: basic,
        components: currentUnitPriceData.components,
        summary: summary,
        totalCosts: totalCosts,
        createdAt: currentUnitPriceData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // 기존 아이템이면 업데이트, 새 아이템이면 추가
    const existingIndex = unitPriceItems.findIndex(item => item.id === id);
    if (existingIndex >= 0) {
        unitPriceItems[existingIndex] = unitPriceItem;
        console.log('✅ 일위대가 아이템 수정됨:', unitPriceItem);
    } else {
        unitPriceItems.push(unitPriceItem);
        console.log('✅ 새 일위대가 아이템 저장됨:', unitPriceItem);
    }
    
    // 데이터 저장
    saveUnitPriceItems();
    
    // 모달 닫기
    closeCurrentModal();
    
    // 목록 새로고침
    setTimeout(() => {
        renderUnitPriceItemsList();
    }, 100);
    
    alert('일위대가 아이템이 저장되었습니다.');
}

// 일위대가 ID 생성
function generateUnitPriceId(basic) {
    const timestamp = Date.now();
    const shortId = `${basic.itemName}-${basic.spacing}-${basic.height}-${basic.size}`.replace(/[^a-zA-Z0-9가-힣\-]/g, '');
    return `${shortId}-${timestamp}`;
}

// 아이템 합계 계산 (구성품 + 고정 로우)
function calculateItemSummary() {
    let totalMaterial = 0, totalLabor = 0, totalExpense = 0;
    
    // 구성품 테이블 계산 (기본 구성품들)
    const componentRows = document.querySelectorAll('#componentsTable tr');
    console.log('🔍 구성품 테이블 행 수:', componentRows.length);
    
    componentRows.forEach((row, index) => {
        const materialElement = row.querySelector('.material-amount');
        const laborElement = row.querySelector('.labor-amount');
        const expenseElement = row.querySelector('.expense-amount');
        
        const materialValue = materialElement ? parseFloat(materialElement.textContent.replace(/[,원]/g, '') || 0) : 0;
        const laborValue = laborElement ? parseFloat(laborElement.textContent.replace(/[,원]/g, '') || 0) : 0;
        const expenseValue = expenseElement ? parseFloat(expenseElement.textContent.replace(/[,원]/g, '') || 0) : 0;
        
        console.log(`🔍 행 ${index + 1}:`, {
            materialText: materialElement?.textContent,
            laborText: laborElement?.textContent,
            expenseText: expenseElement?.textContent,
            materialValue,
            laborValue,
            expenseValue
        });
        
        totalMaterial += materialValue;
        totalLabor += laborValue;
        totalExpense += expenseValue;
    });
    
    console.log('🔍 기본 구성품 합계:', { totalMaterial, totalLabor, totalExpense });
    
    // 고정 로우 금액을 카테고리별로 추가
    // 자재로스, 자재운반비, 자재비이윤 → 재료비에 추가
    const materialLossRow = document.querySelector('.material-loss-row');
    const transportCostRow = document.querySelector('.transport-cost-row');
    const materialProfitRow = document.querySelector('.material-profit-row');
    
    if (materialLossRow) {
        const amount = parseFloat(materialLossRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        console.log('🔍 자재로스:', amount);
        totalMaterial += amount;
    }
    if (transportCostRow) {
        const amount = parseFloat(transportCostRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        console.log('🔍 자재운반비:', amount);
        totalMaterial += amount;
    }
    if (materialProfitRow) {
        const amount = parseFloat(materialProfitRow.querySelector('.fixed-material-amount')?.textContent.replace(/[,원]/g, '') || 0);
        console.log('🔍 자재비이윤:', amount);
        totalMaterial += amount;
    }
    
    // 공구손료 및 기계경비 → 경비에 추가
    const toolExpenseRow = document.querySelector('.tool-expense-row');
    if (toolExpenseRow) {
        const amount = parseFloat(toolExpenseRow.querySelector('.fixed-expense-amount')?.textContent.replace(/[,원]/g, '') || 0);
        console.log('🔍 공구손료:', amount);
        totalExpense += amount;
    }
    
    // 총계는 모든 카테고리의 합계
    const grandTotal = totalMaterial + totalLabor + totalExpense;
    
    console.log('🔍 최종 합계:', { materialTotal: totalMaterial, laborTotal: totalLabor, expenseTotal: totalExpense, grandTotal });
    
    return {
        totalMaterial: totalMaterial,  // ✅ 통일된 속성명 사용
        totalLabor: totalLabor,        // ✅ 통일된 속성명 사용
        totalExpense: totalExpense,    // ✅ 통일된 속성명 사용
        grandTotal: grandTotal
    };
}

// 일위대가 아이템 목록 로드
function loadUnitPriceItems() {
    try {
        const saved = localStorage.getItem('kiyeno_unitPriceItems');
        if (saved) {
            unitPriceItems = JSON.parse(saved);
            console.log('✅ 일위대가 데이터 로드됨:', unitPriceItems.length + '개 아이템');
        }
    } catch (error) {
        console.error('❌ 일위대가 데이터 로드 실패:', error);
        unitPriceItems = [];
    }
}

// 일위대가 아이템 목록 저장
function saveUnitPriceItems() {
    try {
        localStorage.setItem('kiyeno_unitPriceItems', JSON.stringify(unitPriceItems));
        console.log('✅ 일위대가 데이터 저장됨:', unitPriceItems.length + '개 아이템');
    } catch (error) {
        console.error('❌ 일위대가 데이터 저장 실패:', error);
        alert('데이터 저장에 실패했습니다.');
    }
}

// 일위대가 아이템 목록 렌더링 (Excel형 테이블)
function renderUnitPriceItemsList() {
    const container = document.getElementById('unitPriceItemsList');
    if (!container) return;
    
    if (unitPriceItems.length === 0) {
        container.innerHTML = `
            <div class="unit-price-empty">
                <i class="fas fa-calculator"></i>
                <div>등록된 일위대가 아이템이 없습니다.</div>
                <div style="font-size: 14px; margin-top: 8px;">새 일위대가 추가 버튼을 클릭하여 시작하세요.</div>
            </div>
        `;
        return;
    }
    
    // Excel형 테이블 생성
    const tableHTML = `
        <div class="unit-price-table-container">
            <table class="unit-price-table">
                <thead>
                    <tr>
                        <th rowspan="2">번호</th>
                        <th rowspan="2">아이템명</th>
                        <th rowspan="2">규격<br>(간격/높이/SIZE)</th>
                        <th rowspan="2">부위</th>
                        <th rowspan="2">공종</th>
                        <th rowspan="2">단위</th>
                        <th rowspan="2">구성품수</th>
                        <th colspan="4">금액 (원)</th>
                        <th rowspan="2">생성일</th>
                        <th rowspan="2">수정일</th>
                        <th rowspan="2">작업</th>
                    </tr>
                    <tr>
                        <th class="cost-header material">재료비</th>
                        <th class="cost-header labor">노무비</th>
                        <th class="cost-header expense">경비</th>
                        <th class="cost-header total">총계</th>
                    </tr>
                </thead>
                <tbody>
                    ${unitPriceItems.map((item, index) => {
                        const basic = item.basic;
                        
                        // totalCosts 확인 및 재계산
                        let totalCosts = item.totalCosts;
                        
                        console.log('🔍 아이템 데이터 확인:', item.id, {
                            hasTotalCosts: !!totalCosts,
                            totalCosts: totalCosts,
                            hasSummary: !!item.summary,
                            summary: item.summary
                        });
                        
                        if (!totalCosts || !totalCosts.grandTotal) {
                            // summary 데이터가 있다면 사용
                            if (item.summary) {
                                totalCosts = {
                                    totalMaterial: item.summary.totalMaterial || 0,  // ✅ summary.totalMaterial -> totalCosts.totalMaterial
                                    totalLabor: item.summary.totalLabor || 0,        // ✅ summary.totalLabor -> totalCosts.totalLabor
                                    totalExpense: item.summary.totalExpense || 0,    // ✅ summary.totalExpense -> totalCosts.totalExpense
                                    grandTotal: item.summary.grandTotal || 0
                                };
                                console.log('🔧 summary에서 totalCosts 재생성:', totalCosts);
                                console.log('🔍 원본 summary 데이터:', item.summary);
                            } else {
                                totalCosts = { totalMaterial: 0, totalLabor: 0, totalExpense: 0, grandTotal: 0 };
                                console.log('⚠️ 데이터 없음, 기본값 사용');
                            }
                        }
                        
                        return `
                            <tr class="unit-price-table-row">
                                <td class="text-center">${index + 1}</td>
                                <td class="item-name">${basic.itemName}</td>
                                <td class="item-specs">${basic.spacing} / ${basic.height} / ${basic.size}</td>
                                <td>${basic.location}</td>
                                <td>${basic.workType}</td>
                                <td class="text-center">${basic.unit}</td>
                                <td class="text-center">${item.components ? item.components.length : 0}</td>
                                <td class="cost-cell material">${totalCosts.totalMaterial.toLocaleString()}</td>
                                <td class="cost-cell labor">${totalCosts.totalLabor.toLocaleString()}</td>
                                <td class="cost-cell expense">${totalCosts.totalExpense.toLocaleString()}</td>
                                <td class="cost-cell total">${totalCosts.grandTotal.toLocaleString()}</td>
                                <td class="date-cell">${new Date(item.createdAt).toLocaleDateString()}</td>
                                <td class="date-cell">${new Date(item.updatedAt).toLocaleDateString()}</td>
                                <td class="action-cell">
                                    <button class="btn-edit btn-sm" onclick="editUnitPriceItem('${item.id}')" title="수정">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-delete btn-sm" onclick="deleteUnitPriceItem('${item.id}')" title="삭제">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// 일위대가 아이템 수정
function editUnitPriceItem(id) {
    const item = unitPriceItems.find(item => item.id === id);
    if (!item) {
        alert('해당 아이템을 찾을 수 없습니다.');
        return;
    }
    
    // 현재 일위대가 데이터에 기존 아이템 정보 로드
    currentUnitPriceData = {
        id: item.id,
        basic: item.basic,
        components: item.components || [],
        createdAt: item.createdAt
    };
    
    // 기본 정보 모달 열기 (수정 모드)
    openUnitPriceBasicModal(item);
}

// 일위대가 아이템 삭제
function deleteUnitPriceItem(id) {
    const item = unitPriceItems.find(item => item.id === id);
    if (!item) {
        alert('해당 아이템을 찾을 수 없습니다.');
        return;
    }
    
    const basic = item.basic;
    if (confirm(`"${basic.itemName} ${basic.spacing} ${basic.height} ${basic.size}" 아이템을 삭제하시겠습니까?`)) {
        unitPriceItems = unitPriceItems.filter(item => item.id !== id);
        saveUnitPriceItems();
        renderUnitPriceItemsList();
        console.log('✅ 일위대가 아이템 삭제됨:', id);
    }
}

// 데이터 내보내기
function exportUnitPriceData() {
    if (unitPriceItems.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    const dataStr = JSON.stringify(unitPriceItems, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiyeno_unit_price_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('✅ 일위대가 데이터 내보내기 완료');
}

// 데이터 가져오기
function importUnitPriceData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedData)) {
                    throw new Error('잘못된 데이터 형식입니다.');
                }
                
                // 데이터 검증
                const validItems = importedData.filter(item => {
                    return item.id && item.basic && item.components && Array.isArray(item.components);
                });
                
                if (validItems.length === 0) {
                    alert('가져올 수 있는 유효한 데이터가 없습니다.');
                    return;
                }
                
                // 기존 데이터와 병합 (중복 ID는 덮어쓰기)
                validItems.forEach(newItem => {
                    const existingIndex = unitPriceItems.findIndex(item => item.id === newItem.id);
                    if (existingIndex >= 0) {
                        unitPriceItems[existingIndex] = newItem;
                    } else {
                        unitPriceItems.push(newItem);
                    }
                });
                
                saveUnitPriceItems();
                renderUnitPriceItemsList();
                
                alert(`${validItems.length}개의 일위대가 아이템을 가져왔습니다.`);
                console.log('✅ 일위대가 데이터 가져오기 완료:', validItems.length + '개 아이템');
                
            } catch (error) {
                console.error('❌ 데이터 가져오기 실패:', error);
                alert('파일을 읽을 수 없습니다. JSON 형식을 확인해주세요.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// 현재 모달 닫기 (공통 함수)
function closeCurrentModal() {
    // 서브 모달 우선 확인
    const subModal = document.querySelector('.sub-modal-overlay');
    if (subModal) {
        closeSubModal(subModal);
        return;
    }
    
    // 일반 모달 확인
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 전역 함수로 노출
window.openUnitPriceManagement = openUnitPriceManagement;
window.assignUnitPriceToWall = assignUnitPriceToWall;
window.showUnitPriceSummary = showUnitPriceSummary;
window.closeCurrentModal = closeCurrentModal;

console.log('✅ Revit 타입 매칭 시스템 로드됨');