// =============================================================================
// Kiyeno 벽체 관리 시스템 - Revit 타입 매칭 모듈 (원본 복원)
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
        
        // 스타일 추가
        addRevitTypeMappingStyles();
        
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
                
                // DOM 요소 존재 여부 확인
                const tableBody = document.getElementById('revit-wall-table-body');
                
                if (tableBody) {
                    console.log('✅ DOM 요소 발견, 초기화 진행...');
                    
                    // 데이터 로드 및 초기화
                    loadRevitWallTypes();
                    updateRevitWallTable();
                    initializeTypeMappingTabs();
                    
                    return;
                } else if (attempts < maxAttempts) {
                    console.log('⏳ DOM 요소를 찾지 못함, 재시도...');
                    setTimeout(initWithRetry, 200);
                } else {
                    console.error('❌ 최대 시도 횟수 초과, 초기화 실패');
                    alert('모달 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
                }
            };
            
            // 초기화 시작
            setTimeout(initWithRetry, 100);
        }
        
        return modal;
        
    } catch (error) {
        console.error('❌ 벽체 타입 관리 모달 열기 실패:', error);
        alert('모달을 열 수 없습니다. 페이지를 새로고침해주세요.');
        return null;
    }
}

function closeRevitTypeMatching() {
    console.log('🚪 벽체 타입 관리 모달 닫기');
    
    // 서브 모달 닫기
    const subModal = document.querySelector('.sub-modal-overlay');
    if (subModal && typeof closeSubModal === 'function') {
        closeSubModal(subModal);
        return;
    }
    
    // 일반 모달 닫기
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
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
                <div class="dropdown-container" style="display: flex; align-items: center; gap: 10px;">
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
                    
                    <!-- 모든 변경사항 저장 버튼을 드롭다운 옆으로 이동 -->
                    <button class="btn btn-success" onclick="saveAllChanges()" style="margin-left: 5px;">
                        <i class="fas fa-save"></i> 모든 변경사항 저장
                    </button>
                    
                    <!-- 닫기 버튼 -->
                    <button class="btn btn-secondary" onclick="closeRevitTypeMatching()">
                        <i class="fas fa-times"></i> 닫기
                    </button>
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
                                <td colspan="16" style="text-align: center; padding: 20px; color: #6c757d;">
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

async function saveAllChanges() {
    console.log('💾 모든 변경사항 저장 중...');
    
    try {
        // 1. LocalStorage 저장 (기존 방식 유지)
        const localStorageSuccess = saveRevitWallTypes();
        
        // 2. IndexedDB wallTypeMasters 테이블에도 저장
        const indexedDBSuccess = await saveToWallTypeMasters();
        
        if (localStorageSuccess && indexedDBSuccess) {
            alert('✅ 모든 변경사항이 저장되었습니다.');
        } else {
            alert('❌ 저장 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('❌ 저장 중 오류:', error);
        alert('❌ 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// IndexedDB wallTypeMasters 테이블에 저장
async function saveToWallTypeMasters() {
    try {
        console.log('📦 wallTypeMasters 테이블에 벽체 타입 저장 중...');
        
        // UnitPriceDB 인스턴스가 있는지 확인
        if (!window.unitPriceDB) {
            console.log('🔧 UnitPriceDB 인스턴스 생성...');
            window.unitPriceDB = new UnitPriceDB();
        }
        
        // 데이터베이스가 제대로 초기화되었는지 확인
        console.log('🔍 DB 상태 확인 중...');
        const db = await window.unitPriceDB.initDB();
        console.log('📋 사용 가능한 테이블:', [...db.objectStoreNames]);
        
        // wallTypeMasters 테이블이 존재하는지 확인
        if (!db.objectStoreNames.contains('wallTypeMasters')) {
            console.error('❌ wallTypeMasters 테이블이 존재하지 않습니다. DB 재생성이 필요합니다.');
            
            // 기존 DB 삭제 후 재생성 시도
            db.close();
            await new Promise((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase('KiyenoMaterialsDB');
                deleteReq.onsuccess = () => {
                    console.log('🗑️ 기존 KiyenoMaterialsDB 삭제 완료');
                    resolve();
                };
                deleteReq.onerror = () => reject(deleteReq.error);
            });
            
            // 새로운 DB 인스턴스 생성
            window.unitPriceDB = new UnitPriceDB();
            const newDb = await window.unitPriceDB.initDB();
            console.log('✅ 새로운 DB 생성 완료. 사용 가능한 테이블:', [...newDb.objectStoreNames]);
        }
        
        // 현재 벽체 타입 데이터를 wallTypeMasters 형식으로 변환 (고정 ID 사용)
        const wallTypeMasterData = {
            id: 'wallType_master', // 고정 ID로 변경 - 항상 같은 레코드 업데이트
            name: '벽체 타입 관리 마스터',
            description: '벽체 타입 관리에서 저장된 데이터 (고정 레코드)',
            wallTypes: revitWallTypes || [],
            createdAt: new Date().toISOString(), // put 메서드에서 기존값 유지 처리
            updatedAt: new Date().toISOString(),
            source: 'revitTypeMatching',
            metadata: {
                totalCount: (revitWallTypes || []).length,
                counter: revitWallTypeCounter || 0,
                lastSaved: new Date().toISOString()
            }
        };
        
        console.log('💾 저장할 데이터:', {
            id: wallTypeMasterData.id,
            name: wallTypeMasterData.name,
            wallTypesCount: wallTypeMasterData.wallTypes.length
        });
        
        // wallTypeMasters 테이블에 저장
        const result = await window.unitPriceDB.saveWallTypeMaster(wallTypeMasterData);
        
        console.log('✅ wallTypeMasters 테이블 저장 완료:', result.id);
        return true;
        
    } catch (error) {
        console.error('❌ wallTypeMasters 저장 중 오류:', error);
        return false;
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
        const savedData = localStorage.getItem('kiyeno_revit_wall_types');
        
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            revitWallTypes = parsedData.types || [];
            revitWallTypeCounter = parsedData.counter || 0;
            console.log(`✅ Revit 벽체 타입 로드: ${revitWallTypes.length}개`);
        } else {
            revitWallTypes = [];
            revitWallTypeCounter = 0;
            console.log('📝 새로운 Revit 벽체 타입 목록 시작');
        }
        
        // ID가 누락된 항목 수정
        revitWallTypes.forEach((wall, index) => {
            if (!wall.id) {
                wall.id = ++revitWallTypeCounter;
            }
            wall.no = index + 1;
        });
        
        return true;
    } catch (error) {
        console.error('❌ 벽체 타입 데이터 로드 실패:', error);
        revitWallTypes = [];
        revitWallTypeCounter = 0;
        return false;
    }
}

// 벽체 타입 데이터 저장
function saveRevitWallTypes() {
    try {
        const dataToSave = {
            types: revitWallTypes,
            counter: revitWallTypeCounter,
            lastSaved: new Date().toISOString()
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
                <td colspan="17" style="text-align: center; padding: 20px; color: #6c757d;">
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
        </tr>
    `;
}

// =============================================================================
// 일위대가 연동 함수들
// =============================================================================


// =============================================================================
// 드롭다운 관리
// =============================================================================

function toggleRevitActionsDropdown() {
    const dropdown = document.getElementById('revitActionsDropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display === 'block';
    
    // 모든 드롭다운 닫기
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
    });
    
    // 현재 드롭다운 토글
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    // 클릭 외부 영역에서 닫기
    if (!isVisible) {
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }
}

// =============================================================================
// 벽체 타입 생성 및 관리
// =============================================================================

function addRevitWallType() {
    console.log('➕ 새 벽체 타입 추가 시작');
    
    // 드롭다운 닫기
    const dropdown = document.getElementById('revitActionsDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    return createWallTypeModal();
}

// 벽체 타입 생성 모달 생성
function createWallTypeModal() {
    const defaultName = `WallType_${revitWallTypeCounter + 1}`;
    
    const modalHTML = `
        <div class="wall-type-creation-form">
            <div class="form-group">
                <label for="newWallTypeName">
                    <i class="fas fa-tag"></i> WallType 이름 <span style="color: #dc3545;">*</span>
                </label>
                <input type="text" id="newWallTypeName" value="${defaultName}" 
                       class="form-control"
                       placeholder="WallType 이름을 입력하세요"
                       onkeydown="handleWallTypeCreationKeydown(event)">
            </div>
            
            <div class="form-group">
                <label for="newWallThickness">
                    <i class="fas fa-ruler-horizontal"></i> 벽체 두께 (mm)
                </label>
                <input type="number" id="newWallThickness" 
                       class="form-control"
                       placeholder="벽체 두께를 입력하세요 (예: 100)"
                       min="1" max="9999"
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
    const isDuplicate = revitWallTypes.some(wall => wall.wallType && wall.wallType.toLowerCase() === wallName.toLowerCase());
    if (isDuplicate) {
        alert('이미 존재하는 벽체 타입명입니다.');
        nameInput.focus();
        return;
    }
    
    // 새 벽체 타입 생성
    const newWallType = {
        id: ++revitWallTypeCounter,
        no: revitWallTypes.length + 1,
        wallType: wallName,
        thickness: wallThickness,
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

function handleWallTypeCreationKeydown(event) {
    if (event.key === 'Enter') {
        // Enter 키로 모달의 "추가" 버튼 클릭
        const modal = event.target.closest('.sub-modal-overlay');
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
                no: revitWallTypes.length + 1,
                wallType: originalWall.wallType + ' (복사본)',
                createdAt: new Date().toISOString(),
                source: 'duplicated'
            };
            
            revitWallTypes.push(duplicatedWall);
            duplicatedCount++;
        }
    });
    
    if (duplicatedCount > 0) {
        // 번호 재정렬
        revitWallTypes.forEach((wall, index) => {
            wall.no = index + 1;
        });
        
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
    
    // 번호 재정렬
    revitWallTypes.forEach((wall, index) => {
        wall.no = index + 1;
    });
    
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

async function selectMaterial(wallId, fieldName) {
    console.log(`🎯 일위대가 선택: 벽체 ${wallId}, 필드 ${fieldName}`);
    
    try {
        console.log('🔄 일위대가 선택 모달 생성 시작...');
        const modal = await createUnitPriceSelectionModal(wallId, fieldName);
        if (modal) {
            console.log('✅ 일위대가 선택 모달 생성 완료');
        } else {
            console.error('❌ 일위대가 선택 모달 생성 실패');
            alert('일위대가 선택 모달을 열 수 없습니다.');
        }
    } catch (error) {
        console.error('❌ 일위대가 선택 중 오류:', error);
        alert('일위대가 선택 중 오류가 발생했습니다: ' + error.message);
    }
}

function getFieldDisplayName(fieldName) {
    const fieldNames = {
        layer3_1: '석고보드 Layer3 (좌)',
        layer2_1: '석고보드 Layer2 (좌)', 
        layer1_1: '석고보드 Layer1 (좌)',
        column1: 'Column 모듈게이지',
        infill: 'Infill 충진재',
        layer1_2: '석고보드 Layer1 (우)',
        layer2_2: '석고보드 Layer2 (우)',
        layer3_2: '석고보드 Layer3 (우)',
        column2: 'Column',
        channel: 'Channel',
        runner: 'Runner',
        steelPlate: 'Steel Plate'
    };
    return fieldNames[fieldName] || fieldName;
}

async function createUnitPriceSelectionModal(wallId, fieldName) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return null;
    }
    
    const fieldDisplayName = getFieldDisplayName(fieldName);
    
    // 일위대가 데이터를 먼저 로드
    console.log('🔄 일위대가 선택 모달 생성 중...');
    const tableRowsHTML = await generateUnitPriceTableRows();
    
    const modalHTML = `
        <div class="unitprice-selection-container">
            <div class="unitprice-header">
                <h4><i class="fas fa-calculator"></i> ${wall.wallType} - ${fieldDisplayName} 일위대가 선택</h4>
            </div>
            
            <div class="unit-price-table-wrapper" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; max-height: 500px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;" id="unitPriceSelectionTable">
                    <thead style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; font-weight: 600;">선택</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; font-weight: 600;">아이템</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">간격</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">높이</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">SIZE</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">부위</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">공종1</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">공종2</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; font-weight: 600;">단위</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600;">재료비</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600;">노무비</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600;">경비</th>
                            <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 100px; text-align: center; font-weight: 600;">총계</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return createSubModal(`💰 ${fieldDisplayName} 일위대가 선택`, modalHTML, [
        { text: '취소', class: 'btn-secondary', onClick: (modal) => closeSubModal(modal) },
        { text: '선택된 일위대가 지우기', class: 'btn-warning', onClick: (modal) => clearUnitPriceFromModal(wallId, fieldName, modal) },
        { text: '적용', class: 'btn-primary', onClick: (modal) => applySelectedUnitPrice(wallId, fieldName, modal) }
    ], {
        disableBackgroundClick: false,
        disableEscapeKey: false,
        maxWidth: '95vw',
        width: '1200px'
    });
}

async function generateUnitPriceTableRows() {
    // unitPriceManager.js의 전용 getter 함수를 사용하여 일관된 데이터 소스 접근
    let unitPrices = [];
    
    console.log('🚀 일위대가 데이터 로드 시작 - 단일 데이터 소스 사용');
    
    try {
        // 유일한 데이터 소스: unitPriceManager.js의 전용 함수
        if (typeof window.getAllUnitPricesForExternal === 'function') {
            console.log('🔄 getAllUnitPricesForExternal 함수 호출 중...');
            unitPrices = await window.getAllUnitPricesForExternal();
            console.log('✅ 일위대가 데이터 로드 완료:', unitPrices?.length + '개');
        } else {
            console.error('❌ getAllUnitPricesForExternal 함수를 찾을 수 없습니다.');
            console.log('💡 unitPriceManager.js가 먼저 로드되어야 합니다.');
        }
        
        // 데이터 검증
        if (!Array.isArray(unitPrices)) {
            console.warn('⚠️ 일위대가 데이터가 배열이 아님:', typeof unitPrices);
            unitPrices = [];
        }
        
    } catch (error) {
        console.error('❌ 일위대가 데이터 로드 실패:', error);
        unitPrices = [];
    }
    
    if (!unitPrices || unitPrices.length === 0) {
        return `
            <tr>
                <td colspan="13" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                    일위대가 데이터를 찾을 수 없습니다.<br>
                    <small>일위대가 관리에서 데이터를 먼저 생성해주세요.</small>
                </td>
            </tr>
        `;
    }
    
    return unitPrices.map((item, index) => {
        const totalCosts = item.totalCosts || {};
        const materialCost = totalCosts.material || 0;
        const laborCost = totalCosts.labor || 0;
        const expenseCost = totalCosts.expense || 0;
        const totalCost = totalCosts.total || (materialCost + laborCost + expenseCost);
        
        const basic = item.basic || {};
        
        // 일위대가 관리 모달과 동일한 스타일 적용
        const rowStyle = index % 2 === 0 ? 'background-color: #f8fafc;' : 'background-color: white;';
        
        return `
            <tr class="unit-price-row" onclick="selectUnitPriceRow(this, '${item.id}', '${basic.itemName || ''}', '${materialCost}', '${laborCost}', '${totalCost}')" 
                style="cursor: pointer; transition: all 0.2s ease; ${rowStyle}" 
                onmouseover="this.style.backgroundColor='#e2e8f0'; this.style.transform='scale(1.01)'" 
                onmouseout="this.style.backgroundColor='${index % 2 === 0 ? '#f8fafc' : 'white'}'; this.style.transform='scale(1)'">
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px;">
                    <input type="radio" name="selectedUnitPrice" value="${item.id}" style="transform: scale(1.2);">
                </td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 500; color: #1e293b;">${basic.itemName || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.spacing || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.height || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.size || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.location || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.workType1 || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.workType2 || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">${basic.unit || '-'}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #059669; font-weight: 500;">₩${materialCost.toLocaleString()}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #dc2626; font-weight: 500;">₩${laborCost.toLocaleString()}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #7c3aed; font-weight: 500;">₩${expenseCost.toLocaleString()}</td>
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #1e293b; font-weight: 600; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);">₩${totalCost.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}

// 기존 자재 선택 함수 (호환성 유지)
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

// 일위대가 행 선택 함수
function selectUnitPriceRow(rowElement, unitPriceId, itemName, materialCost, laborCost, totalCost) {
    // 기존 선택 해제
    document.querySelectorAll('#unitPriceSelectionTable .unit-price-row').forEach(row => {
        row.classList.remove('table-primary');
    });
    
    // 현재 행 선택
    rowElement.classList.add('table-primary');
    const radio = rowElement.querySelector('input[type="radio"]');
    if (radio) {
        radio.checked = true;
    }
    
    // 선택된 일위대가 정보 저장
    selectedMaterialData = { 
        id: unitPriceId, 
        name: itemName,
        materialCost: materialCost,
        laborCost: laborCost,
        totalCost: totalCost
    };
    
    console.log('🎯 일위대가 선택됨:', itemName, `(ID: ${unitPriceId})`);
}


// 일위대가 선택 테이블 데이터 새로고침
async function refreshUnitPriceSelectionTable() {
    console.log('🔄 일위대가 선택 테이블 새로고침 시작...');
    
    try {
        const table = document.getElementById('unitPriceSelectionTable');
        const tbody = table?.querySelector('tbody');
        
        if (!tbody) {
            console.log('⚠️ 선택 테이블을 찾을 수 없음');
            return;
        }
        
        // DB 트랜잭션이 완료된 후이므로 최신 데이터 로드
        console.log('🔄 DB에서 최신 일위대가 데이터 로드...');
        
        // 새 데이터로 테이블 내용 업데이트
        const newTableRowsHTML = await generateUnitPriceTableRows();
        tbody.innerHTML = newTableRowsHTML;
        
        console.log('✅ 일위대가 선택 테이블 새로고침 완료');
        
        // 새로고침 완료를 시각적으로 표시
        tbody.style.backgroundColor = '#f0f9ff';
        setTimeout(() => {
            tbody.style.backgroundColor = '';
        }, 1000);
        
    } catch (error) {
        console.error('❌ 테이블 새로고침 실패:', error);
    }
}

// 기존 자재 행 선택 함수 (호환성 유지)
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

// 일위대가 적용 함수
function applySelectedUnitPrice(wallId, fieldName, modal) {
    if (!selectedMaterialData) {
        alert('일위대가를 선택해주세요.');
        return;
    }
    
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return;
    }
    
    // 벽체에 일위대가 ID 할당 (ID 참조 방식)
    wall[fieldName] = `unitPrice_${selectedMaterialData.id}`;
    
    saveRevitWallTypes();
    updateRevitWallTable();
    closeSubModal(modal);
    
    // 선택된 일위대가 데이터 초기화
    selectedMaterialData = null;
    
    console.log(`✅ 일위대가 적용됨: ${wall.wallType} - ${getFieldDisplayName(fieldName)}: ${wall[fieldName]}`);
}

// 일위대가 지우기 함수
function clearUnitPriceFromModal(wallId, fieldName, modal) {
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return;
    }
    
    // 해당 필드 값 지우기
    wall[fieldName] = '';
    
    saveRevitWallTypes();
    updateRevitWallTable();
    closeSubModal(modal);
    
    console.log(`✅ 일위대가 지움: ${wall.wallType} - ${getFieldDisplayName(fieldName)}`);
}

// 일위대가 검색 필터 함수
function filterUnitPriceSelectionTable(searchValue) {
    const table = document.getElementById('unitPriceSelectionTable');
    const rows = table.querySelectorAll('tbody tr.unit-price-row');
    const searchCount = document.getElementById('unitPriceSearchCount');
    
    let visibleCount = 0;
    
    rows.forEach(row => {
        const itemName = row.querySelector('.item-name')?.textContent.toLowerCase() || '';
        const shouldShow = searchValue === '' || itemName.includes(searchValue.toLowerCase());
        
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });
    
    if (searchCount) {
        if (searchValue === '') {
            searchCount.textContent = '전체 목록 표시';
        } else {
            searchCount.textContent = `검색 결과: ${visibleCount}개`;
        }
    }
}

// 기존 자재 적용 함수 (호환성 유지)
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
    
    console.log(`✅ 자재 적용됨: ${wall.wallType} - ${getFieldDisplayName(fieldName)}: ${wall[fieldName]}`);
}

function clearMaterial(event, wallId, fieldName) {
    event.stopPropagation();
    
    const wall = revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    wall[fieldName] = '';
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`🗑️ 자재 제거됨: ${wall.wallType} - ${getFieldDisplayName(fieldName)}`);
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
    
    console.log(`🗑️ 자재 제거됨: ${wall.wallType} - ${getFieldDisplayName(fieldName)}`);
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
    
    const newName = prompt('벽체 타입명을 입력하세요:', wall.wallType || '');
    if (newName === null) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert('벽체 타입명을 입력해주세요.');
        return;
    }
    
    // 중복 이름 확인 (현재 벽체 제외)
    const isDuplicate = revitWallTypes.some(w => 
        w.id !== wallId && w.wallType && w.wallType.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
        alert('이미 존재하는 벽체 타입명입니다.');
        return;
    }
    
    wall.wallType = trimmedName;
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`✅ 벽체 타입명 변경됨: ${wallId} -> ${trimmedName}`);
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
                    
                    // 번호 재정렬
                    revitWallTypes.forEach((wall, index) => {
                        wall.no = index + 1;
                    });
                    
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

        /* 자재 선택 모달 스타일 */
        .material-selection-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .material-header {
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .material-header h5 {
            color: #495057;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .material-table-container {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            overflow: hidden;
        }

        .material-table-container table {
            margin-bottom: 0;
        }

        .material-table-container tbody tr:hover {
            background-color: #f8f9fa;
            cursor: pointer;
        }

        .material-table-container .table-primary {
            background-color: #cce5ff !important;
        }

        /* 선택된 자재 정보 스타일 */
        .selected-material-info {
            background: #e7f3ff;
            border: 1px solid #b8daff;
            border-radius: 6px;
            padding: 12px;
        }

        .selected-material-info strong {
            color: #004085;
        }

        /* 벽체 타입 생성 모달 스타일 */
        .wall-type-creation-form .form-group {
            margin-bottom: 20px;
        }

        .wall-type-creation-form label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
            display: block;
        }

        .wall-type-creation-form input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s ease;
        }

        .wall-type-creation-form input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
    `;
    
    document.head.appendChild(style);
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

// 일위대가 선택 함수들 (새로 추가)
window.createUnitPriceSelectionModal = createUnitPriceSelectionModal;
window.generateUnitPriceTableRows = generateUnitPriceTableRows;
window.selectUnitPriceRow = selectUnitPriceRow;
window.applySelectedUnitPrice = applySelectedUnitPrice;
window.clearUnitPriceFromModal = clearUnitPriceFromModal;
window.filterUnitPriceSelectionTable = filterUnitPriceSelectionTable;
window.editUnitPriceFromSelection = editUnitPriceFromSelection;
window.refreshUnitPriceSelectionTable = refreshUnitPriceSelectionTable;

// 자재 선택 함수들 (호환성 유지)
window.selectMaterial = selectMaterial;
window.selectMaterialRow = selectMaterialRow;
window.applySelectedMaterial = applySelectedMaterial;
window.clearMaterial = clearMaterial;
window.clearMaterialFromModal = clearMaterialFromModal;
window.filterMaterialSelectionTable = filterMaterialSelectionTable;

// 벽체 편집 함수들
window.editRevitWallType = editRevitWallType;
window.editRevitWallThickness = editRevitWallThickness;


// 데이터 내보내기/가져오기
window.exportRevitWallTypesToJSON = exportRevitWallTypesToJSON;
window.importRevitWallTypesFromJSON = importRevitWallTypesFromJSON;

// 기타 유틸리티 함수들
window.saveAllChanges = saveAllChanges;
window.initializeTypeMappingTabs = initializeTypeMappingTabs;

console.log('✅ revitTypeMatching.js 로드 완료 - Revit 타입 매칭 전담 모듈 (원본 복원) 및 전역 함수 등록됨');