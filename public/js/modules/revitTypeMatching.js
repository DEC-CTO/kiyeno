// =============================================================================
// Kiyeno 벽체 관리 시스템 - Revit 타입 매칭 모듈
// Revit 벽체 타입 관리, 자재 매핑, 프로젝트 관리 전담 모듈
// =============================================================================

// =============================================================================
// 전역 변수
// =============================================================================
let revitWallTypes = [];
let revitWallTypeCounter = 0;
let selectedRevitWalls = new Set();
let selectedMaterialData = null;

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
        subModalOverlay.remove();
        console.log('✅ 서브 모달 오버레이 제거됨');
    } else {
        console.log('⚠️ 서브 모달 오버레이를 찾을 수 없음');
        
        // 대안으로 모든 모달 찾아서 제거
        const modals = document.querySelectorAll('[class*="modal"]');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.remove();
            }
        });
    }
    
    // body 스크롤 복원
    document.body.style.overflow = '';
}

// =============================================================================
// 모달 HTML 생성
// =============================================================================

function createRevitTypeMappingModal() {
    console.log('🔧 Revit 타입 매칭 모달 HTML 생성');
    
    const content = createRevitTypeMappingModalContent();
    
    // 스타일 추가
    const styles = addRevitTypeMappingStyles();
    
    return content + styles;
}

function createRevitTypeMappingModalContent() {
    return `
        <div class="revit-type-mapping-container" style="width: 95vw; max-width: 1400px; height: 85vh; overflow: hidden;">
            ${createProjectManagementPanel()}
            
            <div style="height: calc(85vh - 120px); overflow: hidden;">
                <div class="tab-container" style="height: 100%; display: flex; flex-direction: column;">
                    <ul class="nav nav-tabs" id="typeMappingTabs" style="flex-shrink: 0;">
                        <li class="nav-item">
                            <a class="nav-link active" data-tab="wall-types" href="#" style="font-size: 14px;">
                                <i class="fas fa-building"></i> Revit 벽체 타입 관리
                            </a>
                        </li>
                    </ul>
                    
                    <div class="tab-content" style="flex: 1; overflow: hidden; border: 1px solid #dee2e6; border-top: none;">
                        <div class="tab-pane active" id="wall-types-content" style="height: 100%; overflow: auto; padding: 20px;">
                            <!-- Revit 벽체 타입 관리 내용 -->
                            <div id="revitWallTypesContainer">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h5><i class="fas fa-building"></i> Revit 벽체 타입</h5>
                                        <small class="text-muted">Revit에서 가져온 벽체 타입들을 관리하고 자재를 매핑합니다</small>
                                    </div>
                                    
                                    <div class="btn-group">
                                        <div class="dropdown">
                                            <button class="btn btn-outline-primary dropdown-toggle" onclick="toggleRevitActionsDropdown()">
                                                <i class="fas fa-plus"></i> 작업 ▼
                                            </button>
                                            <div class="dropdown-menu" id="revitActionsDropdown" style="display: none;">
                                                <div class="dropdown-item" onclick="addRevitWallType()">
                                                    <i class="fas fa-plus"></i> 새 벽체 타입 추가
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
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div id="revitWallTypesTable">
                                    <!-- 벽체 타입 테이블이 동적으로 로드됩니다 -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createProjectManagementPanel() {
    return `
        <div class="project-management-panel" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex align-items-center">
                        <div class="project-icon" style="background: rgba(255,255,255,0.2); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                            <i class="fas fa-building" style="font-size: 24px;"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-weight: 600;">Revit 타입 매칭</h4>
                            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Revit 벽체 타입과 자재 데이터베이스 매핑 관리</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4 text-right">
                    <div class="d-flex justify-content-end gap-2">
                        <button onclick="exportRevitWallTypesToJSON()" class="btn btn-light btn-sm" style="opacity: 0.9;">
                            <i class="fas fa-download"></i> 내보내기
                        </button>
                        <button onclick="importRevitWallTypesFromJSON()" class="btn btn-light btn-sm" style="opacity: 0.9;">
                            <i class="fas fa-upload"></i> 가져오기
                        </button>
                        <button onclick="saveAllChanges()" class="btn btn-warning btn-sm" style="background: #f59e0b; border-color: #f59e0b;">
                            <i class="fas fa-save"></i> 저장
                        </button>
                        <button onclick="closeRevitTypeMatching()" class="btn btn-light btn-sm">
                            <i class="fas fa-times"></i> 닫기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =============================================================================
// 초기화 및 탭 관리
// =============================================================================

function initializeTypeMappingTabs() {
    console.log('🎯 타입 매핑 탭 초기화 시작');
    
    try {
        // 탭 클릭 이벤트 바인딩
        const tabLinks = document.querySelectorAll('#typeMappingTabs .nav-link');
        console.log('📋 탭 링크 개수:', tabLinks.length);
        
        if (tabLinks.length === 0) {
            console.warn('⚠️ 탭 링크를 찾을 수 없음. DOM이 아직 준비되지 않았을 수 있음.');
            return false;
        }
        
        // 기존 이벤트 리스너 제거 후 새로 추가
        tabLinks.forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
        });
        
        // 새 이벤트 리스너 추가
        const newTabLinks = document.querySelectorAll('#typeMappingTabs .nav-link');
        newTabLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const tabId = this.getAttribute('data-tab');
                console.log('🎯 탭 클릭:', tabId);
                
                // 모든 탭 비활성화
                newTabLinks.forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                // 선택된 탭 활성화
                this.classList.add('active');
                const targetPane = document.getElementById(tabId + '-content');
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
        
        // 초기 데이터 로드
        loadRevitWallTypes();
        updateRevitWallTable();
        
        console.log('✅ 타입 매핑 탭 초기화 완료');
        return true;
        
    } catch (error) {
        console.error('❌ 타입 매핑 탭 초기화 실패:', error);
        return false;
    }
}

// =============================================================================
// 저장 및 상태 관리
// =============================================================================

function saveAllChanges() {
    try {
        saveRevitWallTypes();
        updateProjectStatus();
        alert('모든 변경사항이 저장되었습니다.');
        console.log('✅ 모든 변경사항 저장 완료');
    } catch (error) {
        console.error('❌ 저장 실패:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
}

function updateProjectStatus() {
    // 프로젝트 상태 업데이트 로직
    const totalWalls = revitWallTypes.length;
    const mappedWalls = revitWallTypes.filter(wall => 
        wall.fire || wall.sound || wall.thermal || wall.structure || wall.waterproof || wall.finish
    ).length;
    
    console.log(`📊 프로젝트 상태: ${mappedWalls}/${totalWalls} 벽체 매핑됨`);
}

// =============================================================================
// 데이터 관리
// =============================================================================

function loadRevitWallTypes() {
    try {
        const saved = localStorage.getItem('kiyeno_revitWallTypes');
        if (saved) {
            const data = JSON.parse(saved);
            revitWallTypes = data.wallTypes || [];
            revitWallTypeCounter = data.counter || 0;
            console.log(`✅ Revit 벽체 타입 로드됨: ${revitWallTypes.length}개`);
        } else {
            revitWallTypes = [];
            revitWallTypeCounter = 0;
            console.log('📝 새로운 Revit 벽체 타입 목록 생성');
        }
    } catch (error) {
        console.error('❌ Revit 벽체 타입 로드 실패:', error);
        revitWallTypes = [];
        revitWallTypeCounter = 0;
    }
}

function saveRevitWallTypes() {
    try {
        const data = {
            wallTypes: revitWallTypes,
            counter: revitWallTypeCounter,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('kiyeno_revitWallTypes', JSON.stringify(data));
        console.log(`✅ Revit 벽체 타입 저장됨: ${revitWallTypes.length}개`);
    } catch (error) {
        console.error('❌ Revit 벽체 타입 저장 실패:', error);
        throw error;
    }
}

// =============================================================================
// 테이블 업데이트
// =============================================================================

function updateRevitWallTable() {
    const container = document.getElementById('revitWallTypesTable');
    if (!container) {
        console.warn('⚠️ revitWallTypesTable 컨테이너를 찾을 수 없음');
        return;
    }
    
    if (revitWallTypes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #6c757d;">
                <i class="fas fa-building" style="font-size: 48px; opacity: 0.3; margin-bottom: 20px;"></i>
                <h5>Revit 벽체 타입이 없습니다</h5>
                <p>상단의 "작업" 버튼을 클릭하여 새 벽체 타입을 추가하세요.</p>
                <button onclick="addRevitWallType()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> 새 벽체 타입 추가
                </button>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-dark">
                    <tr>
                        <th width="40"><input type="checkbox" onchange="toggleAllRevitWallSelection()"></th>
                        <th width="200">벽체 타입</th>
                        <th width="80">두께</th>
                        <th width="150">방화</th>
                        <th width="150">차음</th>
                        <th width="150">단열</th>
                        <th width="150">구조</th>
                        <th width="150">방수</th>
                        <th width="150">마감</th>
                        <th width="150">일위대가</th>
                        <th width="100">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${revitWallTypes.map(wall => createRevitWallTableRow(wall)).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

function createRevitWallTableRow(wall) {
    const isSelected = selectedRevitWalls.has(wall.id);
    return `
        <tr ${isSelected ? 'style="background-color: #e3f2fd;"' : ''}>
            <td>
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                       onchange="toggleRevitWallSelection(${wall.id})">
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <input type="text" value="${wall.name}" class="form-control form-control-sm" 
                           onblur="saveWallTypeName(${wall.id}, this.value, this)"
                           onkeydown="handleWallTypeNameKeydown(event, ${wall.id}, '${wall.name}', this)"
                           style="min-width: 180px;">
                </div>
            </td>
            <td>
                <input type="number" value="${wall.thickness || ''}" class="form-control form-control-sm" 
                       onblur="saveWallThickness(${wall.id}, this.value, this)"
                       onkeydown="handleWallThicknessKeydown(event, ${wall.id}, '${wall.thickness || ''}', this)"
                       placeholder="mm" style="width: 70px;">
            </td>
            <td>
                <button class="btn btn-sm ${wall.fire ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="selectMaterial(${wall.id}, 'fire')" style="width: 100%; font-size: 11px;">
                    ${wall.fire || '선택'}
                    ${wall.fire ? `<button onclick="clearMaterial(event, ${wall.id}, 'fire')" style="background: none; border: none; color: white; margin-left: 5px;">×</button>` : ''}
                </button>
            </td>
            <td>
                <button class="btn btn-sm ${wall.sound ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="selectMaterial(${wall.id}, 'sound')" style="width: 100%; font-size: 11px;">
                    ${wall.sound || '선택'}
                    ${wall.sound ? `<button onclick="clearMaterial(event, ${wall.id}, 'sound')" style="background: none; border: none; color: white; margin-left: 5px;">×</button>` : ''}
                </button>
            </td>
            <td>
                <button class="btn btn-sm ${wall.thermal ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="selectMaterial(${wall.id}, 'thermal')" style="width: 100%; font-size: 11px;">
                    ${wall.thermal || '선택'}
                    ${wall.thermal ? `<button onclick="clearMaterial(event, ${wall.id}, 'thermal')" style="background: none; border: none; color: white; margin-left: 5px;">×</button>` : ''}
                </button>
            </td>
            <td>
                <button class="btn btn-sm ${wall.structure ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="selectMaterial(${wall.id}, 'structure')" style="width: 100%; font-size: 11px;">
                    ${wall.structure || '선택'}
                    ${wall.structure ? `<button onclick="clearMaterial(event, ${wall.id}, 'structure')" style="background: none; border: none; color: white; margin-left: 5px;">×</button>` : ''}
                </button>
            </td>
            <td>
                <button class="btn btn-sm ${wall.waterproof ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="selectMaterial(${wall.id}, 'waterproof')" style="width: 100%; font-size: 11px;">
                    ${wall.waterproof || '선택'}
                    ${wall.waterproof ? `<button onclick="clearMaterial(event, ${wall.id}, 'waterproof')" style="background: none; border: none; color: white; margin-left: 5px;">×</button>` : ''}
                </button>
            </td>
            <td>
                <button class="btn btn-sm ${wall.finish ? 'btn-success' : 'btn-outline-secondary'}" 
                        onclick="selectMaterial(${wall.id}, 'finish')" style="width: 100%; font-size: 11px;">
                    ${wall.finish || '선택'}
                    ${wall.finish ? `<button onclick="clearMaterial(event, ${wall.id}, 'finish')" style="background: none; border: none; color: white; margin-left: 5px;">×</button>` : ''}
                </button>
            </td>
            <td>
                ${createUnitPriceDropdown(wall)}
            </td>
            <td>
                <button onclick="editRevitWallType(${wall.id})" class="btn btn-sm btn-outline-primary" title="편집">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `;
}

// 일위대가 드롭다운 생성
function createUnitPriceDropdown(wall) {
    const unitPriceItems = loadUnitPriceItems();
    const selectedId = wall.unitPriceId || '';
    
    let options = '<option value="">선택하세요</option>';
    unitPriceItems.forEach(item => {
        const basic = item.basic;
        const displayName = `${basic.itemName} ${basic.spacing} ${basic.height}`;
        const selected = item.id === selectedId ? 'selected' : '';
        options += `<option value="${item.id}" ${selected}>${displayName}</option>`;
    });
    
    return `
        <select onchange="assignUnitPriceToWall(${wall.id}, this.value)" 
                class="form-control form-control-sm" style="font-size: 11px;">
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
    
    wall.unitPriceId = unitPriceId || '';
    
    // 연결된 일위대가 정보 표시
    if (unitPriceId) {
        const unitPriceItems = loadUnitPriceItems();
        const selectedItem = unitPriceItems.find(item => item.id === unitPriceId);
        if (selectedItem) {
            const totalCost = selectedItem.totalCosts?.total || 0;
            console.log(`✅ 벽체 "${wall.name}"에 일위대가 "${selectedItem.basic.itemName}" 연결됨 (${totalCost.toLocaleString()}원)`);
        }
    }
    
    saveRevitWallTypes();
}

// 일위대가 연동 현황 보기
function showUnitPriceSummary() {
    console.log('📋 일위대가 연동 현황 보기');
    
    const unitPriceItems = loadUnitPriceItems();
    const wallTypesWithUnitPrice = revitWallTypes.filter(wall => wall.unitPriceId);
    
    const modalContent = createUnitPriceSummaryModal(wallTypesWithUnitPrice, unitPriceItems);
    
    const modal = createSubModal('📋 일위대가 연동 현황', modalContent, [
        { text: '닫기', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) }
    ]);
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
                <td colspan="5" style="text-align: center; padding: 40px; color: #6c757d;">
                    <i class="fas fa-link" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i>
                    <p>연결된 일위대가가 없습니다.</p>
                </td>
            </tr>
        `;
    } else {
        tableRows = wallTypesWithUnitPrice.map(wall => {
            const unitPriceItem = unitPriceItems.find(item => item.id === wall.unitPriceId);
            if (!unitPriceItem) {
                return `
                    <tr>
                        <td>${wall.name}</td>
                        <td colspan="4" style="color: #dc3545;">❌ 연결된 일위대가를 찾을 수 없음</td>
                    </tr>
                `;
            }
            
            const basic = unitPriceItem.basic;
            const totalCost = unitPriceItem.totalCosts;
            
            return `
                <tr>
                    <td style="font-weight: 500;">${wall.name}</td>
                    <td>${basic.itemName} ${basic.spacing} ${basic.height}</td>
                    <td>${basic.size} | ${basic.location} | ${basic.workType}</td>
                    <td>${basic.unit}</td>
                    <td style="text-align: right; font-weight: 600; color: #dc2626;">
                        ${Math.round(totalCost?.total || 0).toLocaleString()}원
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    return `
        <div class="unit-price-summary-container">
            <div class="summary-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <div class="row">
                    <div class="col-md-8">
                        <h4><i class="fas fa-chart-pie"></i> 일위대가 연동 현황</h4>
                        <p style="margin: 0; opacity: 0.9;">Revit 벽체 타입과 일위대가 연결 상태를 확인합니다</p>
                    </div>
                    <div class="col-md-4 text-right">
                        <div class="connection-rate" style="background: rgba(255,255,255,0.2); padding: 10px 15px; border-radius: 8px; display: inline-block;">
                            <div style="font-size: 24px; font-weight: 700;">${connectionRate}%</div>
                            <div style="font-size: 12px; opacity: 0.8;">${connectedWalls}/${totalWalls} 연결됨</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>벽체 타입</th>
                            <th>일위대가</th>
                            <th>상세정보</th>
                            <th>단위</th>
                            <th style="text-align: right;">총 단가</th>
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
// 벽체 타입 관리 (추가/삭제/복사)
// =============================================================================

function toggleRevitActionsDropdown() {
    const dropdown = document.getElementById('revitActionsDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

function addRevitWallType() {
    console.log('➕ 새 벽체 타입 추가');
    
    const modal = createWallTypeCreationModal();
    if (modal) {
        // 입력 필드에 포커스
        setTimeout(() => {
            const nameInput = document.getElementById('newWallTypeName');
            if (nameInput) {
                nameInput.focus();
            }
        }, 100);
    }
}

function createWallTypeCreationModal() {
    const modalHTML = `
        <div class="wall-type-creation-form">
            <div class="form-group mb-3">
                <label for="newWallTypeName" class="form-label">
                    <i class="fas fa-building"></i> 벽체 타입명 <span class="text-danger">*</span>
                </label>
                <input type="text" id="newWallTypeName" class="form-control" 
                       placeholder="예: 콘크리트 벽 200mm" 
                       onkeydown="handleWallTypeCreationKeydown(event)">
            </div>
            
            <div class="form-group mb-3">
                <label for="newWallThickness" class="form-label">
                    <i class="fas fa-ruler"></i> 벽체 두께 (mm)
                </label>
                <input type="number" id="newWallThickness" class="form-control" 
                       placeholder="200" min="1" max="1000"
                       onkeydown="handleWallTypeCreationKeydown(event)">
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> 
                벽체 타입을 추가한 후 자재 매핑을 설정할 수 있습니다.
            </div>
        </div>
    `;
    
    return createSubModal('➕ 새 벽체 타입 추가', modalHTML, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '추가', class: 'btn-primary', onClick: (modal) => createNewWallType(modal) }
    ], {
        disableBackgroundClick: true,
        disableEscapeKey: false
    });
}

function createNewWallType(modal) {
    const nameInput = document.getElementById('newWallTypeName');
    const thicknessInput = document.getElementById('newWallThickness');
    
    if (!nameInput) {
        alert('입력 필드를 찾을 수 없습니다.');
        return;
    }
    
    const wallName = nameInput.value.trim();
    const wallThickness = parseInt(thicknessInput?.value) || 0;
    
    if (!wallName) {
        alert('벽체 타입명을 입력해주세요.');
        nameInput.focus();
        return;
    }
    
    // 중복 이름 확인
    const isDuplicate = revitWallTypes.some(wall => wall.name.toLowerCase() === wallName.toLowerCase());
    if (isDuplicate) {
        alert('이미 존재하는 벽체 타입명입니다.');
        nameInput.focus();
        return;
    }
    
    // 새 벽체 타입 생성
    const newWallType = {
        id: ++revitWallTypeCounter,
        name: wallName,
        thickness: wallThickness,
        fire: '',
        sound: '',
        thermal: '',
        structure: '',
        waterproof: '',
        finish: '',
        unitPriceId: '',
        createdAt: new Date().toISOString(),
        source: 'manual'
    };
    
    revitWallTypes.push(newWallType);
    saveRevitWallTypes();
    updateRevitWallTable();
    
    // 모달 닫기
    closeSubModal(modal);
    
    console.log('✅ 새 벽체 타입 추가됨:', newWallType);
    alert(`"${wallName}" 벽체 타입이 추가되었습니다.`);
}

function createWallTypeWithPrompt() {
    const wallName = prompt('새 벽체 타입명을 입력하세요:', '새 벽체 타입');
    
    if (!wallName || !wallName.trim()) {
        return;
    }
    
    // 중복 이름 확인
    const isDuplicate = revitWallTypes.some(wall => wall.name.toLowerCase() === wallName.toLowerCase());
    if (isDuplicate) {
        alert('이미 존재하는 벽체 타입명입니다.');
        return;
    }
    
    const newWallType = {
        id: ++revitWallTypeCounter,
        name: wallName.trim(),
        thickness: 0,
        fire: '',
        sound: '',
        thermal: '',
        structure: '',
        waterproof: '',
        finish: '',
        unitPriceId: '',
        createdAt: new Date().toISOString(),
        source: 'manual'
    };
    
    revitWallTypes.push(newWallType);
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log('✅ 새 벽체 타입 추가됨:', newWallType);
}

function handleWallTypeCreationKeydown(event) {
    if (event.key === 'Enter') {
        // Enter 키로 모달의 "추가" 버튼 클릭
        const modal = event.target.closest('.sub-modal');
        if (modal) {
            createNewWallType(modal);
        }
    }
}

function duplicateRevitWall() {
    const selectedIds = Array.from(selectedRevitWalls);
    if (selectedIds.length === 0) {
        alert('복사할 벽체 타입을 선택해주세요.');
        return;
    }
    
    let duplicatedCount = 0;
    
    selectedIds.forEach(wallId => {
        const originalWall = revitWallTypes.find(w => w.id === wallId);
        if (originalWall) {
            const duplicatedWall = {
                ...originalWall,
                id: ++revitWallTypeCounter,
                name: originalWall.name + ' (복사본)',
                createdAt: new Date().toISOString(),
                source: 'duplicated'
            };
            
            revitWallTypes.push(duplicatedWall);
            duplicatedCount++;
        }
    });
    
    if (duplicatedCount > 0) {
        saveRevitWallTypes();
        updateRevitWallTable();
        selectedRevitWalls.clear();
        console.log(`✅ ${duplicatedCount}개 벽체 타입 복사됨`);
        alert(`${duplicatedCount}개의 벽체 타입이 복사되었습니다.`);
    }
}

function deleteSelectedRevitWalls() {
    const selectedIds = Array.from(selectedRevitWalls);
    if (selectedIds.length === 0) {
        alert('삭제할 벽체 타입을 선택해주세요.');
        return;
    }
    
    const confirmMessage = `선택된 ${selectedIds.length}개의 벽체 타입을 삭제하시겠습니까?`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // 선택된 벽체 타입들 삭제
    revitWallTypes = revitWallTypes.filter(wall => !selectedIds.includes(wall.id));
    selectedRevitWalls.clear();
    
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`✅ ${selectedIds.length}개 벽체 타입 삭제됨`);
    alert(`${selectedIds.length}개의 벽체 타입이 삭제되었습니다.`);
}

function clearRevitWallData() {
    if (!confirm('모든 Revit 벽체 타입 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    revitWallTypes = [];
    revitWallTypeCounter = 0;
    selectedRevitWalls.clear();
    
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log('🗑️ 모든 Revit 벽체 타입 데이터 삭제됨');
    alert('모든 벽체 타입 데이터가 삭제되었습니다.');
}

// =============================================================================
// 선택 관리
// =============================================================================

function toggleRevitWallSelection(wallId) {
    if (selectedRevitWalls.has(wallId)) {
        selectedRevitWalls.delete(wallId);
    } else {
        selectedRevitWalls.add(wallId);
    }
    updateRevitWallTable();
}

function toggleAllRevitWallSelection() {
    if (selectedRevitWalls.size === revitWallTypes.length) {
        selectedRevitWalls.clear();
    } else {
        selectedRevitWalls.clear();
        revitWallTypes.forEach(wall => selectedRevitWalls.add(wall.id));
    }
    updateRevitWallTable();
}

// =============================================================================
// 자재 선택 관리
// =============================================================================

function selectMaterial(wallId, fieldName) {
    console.log(`🎯 자재 선택: 벽체 ${wallId}, 필드 ${fieldName}`);
    
    const modal = createMaterialSelectionModal(wallId, fieldName);
    if (modal) {
        // 검색 필드에 포커스
        setTimeout(() => {
            const searchInput = document.getElementById('materialSearchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }
}

function getFieldDisplayName(fieldName) {
    const fieldNames = {
        fire: '방화',
        sound: '차음', 
        thermal: '단열',
        structure: '구조',
        waterproof: '방수',
        finish: '마감'
    };
    return fieldNames[fieldName] || fieldName;
}

function createMaterialSelectionModal(wallId, fieldName) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return null;
    }
    
    const fieldDisplayName = getFieldDisplayName(fieldName);
    
    const modalHTML = `
        <div class="material-selection-container">
            <div class="material-header mb-3">
                <h5><i class="fas fa-cube"></i> ${wall.name} - ${fieldDisplayName} 자재 선택</h5>
                <div class="input-group">
                    <input type="text" id="materialSearchInput" class="form-control" 
                           placeholder="자재명으로 검색..." 
                           oninput="filterMaterialSelectionTable(this.value)">
                    <div class="input-group-append">
                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                    </div>
                </div>
            </div>
            
            <div class="material-table-container" style="max-height: 500px; overflow-y: auto;">
                <table class="table table-sm table-hover" id="materialSelectionTable">
                    <thead class="table-light">
                        <tr>
                            <th>선택</th>
                            <th>자재명</th>
                            <th>카테고리</th>
                            <th>단위</th>
                            <th>단가</th>
                            <th>규격</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateMaterialTableRows()}
                    </tbody>
                </table>
            </div>
            
            <div class="selected-material-info mt-3" id="selectedMaterialInfo" style="display: none;">
                <div class="alert alert-info">
                    <strong>선택된 자재:</strong> <span id="selectedMaterialName"></span>
                </div>
            </div>
        </div>
    `;
    
    return createSubModal(`🎯 ${fieldDisplayName} 자재 선택`, modalHTML, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '선택된 자재 지우기', class: 'btn-warning', onClick: (modal) => clearMaterialFromModal(wallId, fieldName, modal) },
        { text: '적용', class: 'btn-primary', onClick: (modal) => applySelectedMaterial(wallId, fieldName, modal) }
    ], {
        disableBackgroundClick: false,
        disableEscapeKey: false
    });
}

function generateMaterialTableRows() {
    // priceDatabase.js에서 자재 데이터 가져오기
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
                unit: item.unit,
                price: item.price,
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
                unit: item.unit,
                price: price,
                spec: `${item.w}x${item.h}x${item.t}`
            });
        });
    }
    
    return materials.map(material => `
        <tr class="material-row" onclick="selectMaterialRow(this, '${material.id}', '${material.name}')" 
            style="cursor: pointer;">
            <td><input type="radio" name="selectedMaterial" value="${material.id}"></td>
            <td>${material.name}</td>
            <td><small class="text-muted">${material.category}</small></td>
            <td>${material.unit}</td>
            <td>₩${material.price.toLocaleString()}</td>
            <td><small>${material.spec || '-'}</small></td>
        </tr>
    `).join('');
}

function selectMaterialRow(rowElement, materialId, materialName) {
    // 기존 선택 해제
    document.querySelectorAll('#materialSelectionTable .material-row').forEach(row => {
        row.classList.remove('table-primary');
    });
    
    // 현재 행 선택
    rowElement.classList.add('table-primary');
    const radio = rowElement.querySelector('input[type="radio"]');
    if (radio) {
        radio.checked = true;
    }
    
    // 선택된 자재 정보 표시
    selectedMaterialData = { id: materialId, name: materialName };
    const infoDiv = document.getElementById('selectedMaterialInfo');
    const nameSpan = document.getElementById('selectedMaterialName');
    
    if (infoDiv && nameSpan) {
        nameSpan.textContent = materialName;
        infoDiv.style.display = 'block';
    }
    
    console.log('🎯 자재 선택됨:', materialName);
}

function applySelectedMaterial(wallId, fieldName, modal) {
    if (!selectedMaterialData) {
        alert('자재를 선택해주세요.');
        return;
    }
    
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return;
    }
    
    // 벽체에 자재 할당
    wall[fieldName] = selectedMaterialData.name;
    
    saveRevitWallTypes();
    updateRevitWallTable();
    closeSubModal(modal);
    
    // 선택된 자재 데이터 초기화
    selectedMaterialData = null;
    
    console.log(`✅ 자재 적용됨: ${wall.name} - ${getFieldDisplayName(fieldName)}: ${selectedMaterialData?.name}`);
    alert(`${getFieldDisplayName(fieldName)} 자재가 적용되었습니다.`);
}

function clearMaterial(event, wallId, fieldName) {
    event.stopPropagation();
    
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    wall[fieldName] = '';
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`🗑️ 자재 제거됨: ${wall.name} - ${getFieldDisplayName(fieldName)}`);
}

function clearMaterialFromModal(wallId, fieldName, modal) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return;
    }
    
    wall[fieldName] = '';
    saveRevitWallTypes();
    updateRevitWallTable();
    closeSubModal(modal);
    
    console.log(`🗑️ 자재 제거됨: ${wall.name} - ${getFieldDisplayName(fieldName)}`);
}

// =============================================================================
// 벽체 편집
// =============================================================================

function editRevitWallType(wallId) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return;
    }
    
    console.log('✏️ 벽체 타입 편집:', wall.name);
    // 여기에 편집 모달 로직 구현 가능
}

function saveWallTypeName(wallId, newName, inputElement) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        inputElement.value = wall.name;
        alert('벽체 타입명을 입력해주세요.');
        return;
    }
    
    // 중복 이름 확인 (현재 벽체 제외)
    const isDuplicate = revitWallTypes.some(w => 
        w.id !== wallId && w.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
        inputElement.value = wall.name;
        alert('이미 존재하는 벽체 타입명입니다.');
        return;
    }
    
    wall.name = trimmedName;
    saveRevitWallTypes();
    console.log(`✅ 벽체 타입명 변경됨: ${wallId} -> ${trimmedName}`);
}

function handleWallTypeNameKeydown(event, wallId, currentValue, inputElement) {
    if (event.key === 'Enter') {
        inputElement.blur();
    } else if (event.key === 'Escape') {
        inputElement.value = currentValue;
        inputElement.blur();
    }
}

function editRevitWallThickness(wallId) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    const newThickness = prompt('벽체 두께를 입력하세요 (mm):', wall.thickness || '');
    if (newThickness === null) return;
    
    const thickness = parseInt(newThickness);
    if (isNaN(thickness) || thickness <= 0) {
        alert('올바른 두께 값을 입력해주세요.');
        return;
    }
    
    wall.thickness = thickness;
    saveRevitWallTypes();
    updateRevitWallTable();
    console.log(`✅ 벽체 두께 변경됨: ${wallId} -> ${thickness}mm`);
}

function saveWallThickness(wallId, newThickness, inputElement) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    const thickness = parseInt(newThickness);
    if (isNaN(thickness) || thickness < 0) {
        inputElement.value = wall.thickness || '';
        alert('올바른 두께 값을 입력해주세요.');
        return;
    }
    
    wall.thickness = thickness;
    saveRevitWallTypes();
    console.log(`✅ 벽체 두께 변경됨: ${wallId} -> ${thickness}mm`);
}

function handleWallThicknessKeydown(event, wallId, currentValue, inputElement) {
    if (event.key === 'Enter') {
        inputElement.blur();
    } else if (event.key === 'Escape') {
        inputElement.value = currentValue;
        inputElement.blur();
    }
}

// =============================================================================
// 검색 및 필터링
// =============================================================================

function filterMaterialSelectionTable(searchValue) {
    const table = document.getElementById('materialSelectionTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const searchTerm = searchValue.toLowerCase();
    
    rows.forEach(row => {
        const materialName = row.cells[1]?.textContent.toLowerCase() || '';
        const category = row.cells[2]?.textContent.toLowerCase() || '';
        const spec = row.cells[5]?.textContent.toLowerCase() || '';
        
        const isMatch = materialName.includes(searchTerm) || 
                       category.includes(searchTerm) || 
                       spec.includes(searchTerm);
        
        row.style.display = isMatch ? '' : 'none';
    });
}

// =============================================================================
// 데이터 내보내기/가져오기
// =============================================================================

function exportRevitWallTypesToJSON() {
    if (revitWallTypes.length === 0) {
        alert('내보낼 벽체 타입 데이터가 없습니다.');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        wallTypesCount: revitWallTypes.length,
        wallTypes: revitWallTypes,
        counter: revitWallTypeCounter
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `kiyeno_revit_walltypes_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    console.log('✅ Revit 벽체 타입 데이터 내보내기 완료');
    alert(`${revitWallTypes.length}개의 벽체 타입 데이터가 내보내기되었습니다.`);
}

function importRevitWallTypesFromJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                
                // 데이터 검증
                if (!importData.wallTypes || !Array.isArray(importData.wallTypes)) {
                    alert('올바르지 않은 벽체 타입 데이터 형식입니다.');
                    return;
                }
                
                const confirmMessage = `${importData.wallTypes.length}개의 벽체 타입을 가져오시겠습니까?\n(기존 데이터는 모두 교체됩니다)`;
                
                if (confirm(confirmMessage)) {
                    revitWallTypes = importData.wallTypes;
                    revitWallTypeCounter = importData.counter || Math.max(...revitWallTypes.map(w => w.id), 0);
                    selectedRevitWalls.clear();
                    
                    saveRevitWallTypes();
                    updateRevitWallTable();
                    
                    alert(`${importData.wallTypes.length}개의 벽체 타입을 가져왔습니다.`);
                    console.log('✅ Revit 벽체 타입 데이터 가져오기 완료');
                }
            } catch (error) {
                console.error('벽체 타입 데이터 가져오기 실패:', error);
                alert('파일을 읽는 중 오류가 발생했습니다.');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// =============================================================================
// 스타일 추가
// =============================================================================

function addRevitTypeMappingStyles() {
    return `
        <style>
            .revit-type-mapping-container {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .project-management-panel {
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .tab-container .nav-tabs {
                border-bottom: 2px solid #dee2e6;
            }
            
            .tab-container .nav-link {
                border: none;
                border-bottom: 3px solid transparent;
                background: none;
                color: #6c757d;
                transition: all 0.3s ease;
            }
            
            .tab-container .nav-link:hover {
                color: #495057;
                border-bottom-color: #dee2e6;
            }
            
            .tab-container .nav-link.active {
                color: #667eea;
                border-bottom-color: #667eea;
                background: none;
            }
            
            .material-row:hover {
                background-color: #f8f9fa;
            }
            
            .material-row.table-primary {
                background-color: #cce5ff !important;
            }
            
            .empty-state {
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-radius: 8px;
                border: 2px dashed #dee2e6;
            }
            
            .dropdown-menu {
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border: 1px solid #e9ecef;
            }
            
            .dropdown-item:hover {
                background-color: #f8f9fa;
            }
            
            .form-control:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
            }
            
            .btn-outline-primary:hover {
                background-color: #667eea;
                border-color: #667eea;
            }
        </style>
    `;
}

// =============================================================================
// 전역 함수 등록 (revitTypeMatching.js)
// =============================================================================

// 메인 함수들
window.openRevitTypeMatching = openRevitTypeMatching;
window.closeRevitTypeMatching = closeRevitTypeMatching;

// 데이터 관리 함수들
window.loadRevitWallTypes = loadRevitWallTypes;
window.saveRevitWallTypes = saveRevitWallTypes;
window.updateRevitWallTable = updateRevitWallTable;

// 벽체 타입 관리 함수들
window.toggleRevitActionsDropdown = toggleRevitActionsDropdown;
window.addRevitWallType = addRevitWallType;
window.createNewWallType = createNewWallType;
window.handleWallTypeCreationKeydown = handleWallTypeCreationKeydown;
window.duplicateRevitWall = duplicateRevitWall;
window.deleteSelectedRevitWalls = deleteSelectedRevitWalls;
window.clearRevitWallData = clearRevitWallData;

// 선택 관리 함수들
window.toggleRevitWallSelection = toggleRevitWallSelection;
window.toggleAllRevitWallSelection = toggleAllRevitWallSelection;

// 자재 선택 함수들
window.selectMaterial = selectMaterial;
window.selectMaterialRow = selectMaterialRow;
window.applySelectedMaterial = applySelectedMaterial;
window.clearMaterial = clearMaterial;
window.clearMaterialFromModal = clearMaterialFromModal;
window.filterMaterialSelectionTable = filterMaterialSelectionTable;

// 벽체 편집 함수들
window.editRevitWallType = editRevitWallType;
window.saveWallTypeName = saveWallTypeName;
window.handleWallTypeNameKeydown = handleWallTypeNameKeydown;
window.saveWallThickness = saveWallThickness;
window.handleWallThicknessKeydown = handleWallThicknessKeydown;

// 일위대가 연동 함수들
window.createUnitPriceDropdown = createUnitPriceDropdown;
window.assignUnitPriceToWall = assignUnitPriceToWall;
window.showUnitPriceSummary = showUnitPriceSummary;

// 데이터 내보내기/가져오기
window.exportRevitWallTypesToJSON = exportRevitWallTypesToJSON;
window.importRevitWallTypesFromJSON = importRevitWallTypesFromJSON;

// 기타 유틸리티 함수들
window.saveAllChanges = saveAllChanges;
window.initializeTypeMappingTabs = initializeTypeMappingTabs;

console.log('✅ revitTypeMatching.js 로드 완료 - Revit 타입 매칭 전담 모듈 및 전역 함수 등록됨');