// =============================================================================
// Kiyeno 벽체 관리 시스템 - Revit 타입 매칭 모듈 (원본 복원)
// Revit 벽체 타입 관리, 자재 매핑, 프로젝트 관리 전담 모듈
// =============================================================================

// =============================================================================
// 전역 변수
// =============================================================================

// window 객체에 직접 배열을 생성하여 참조 공유
if (!window.revitWallTypes) {
    window.revitWallTypes = [];
}

let revitWallTypeCounter = 0;
let selectedRevitWalls = new Set();
let selectedMaterialData = null;

/**
 * revitWallTypes 업데이트 및 전역 변수 동기화 헬퍼 함수
 * 이제 window.revitWallTypes를 직접 사용하므로 동기화 불필요
 */
function syncRevitWallTypes() {
    console.log('🔄 revitWallTypes 상태 확인:', window.revitWallTypes.length, '개');
}

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
        const modal = createSubModal('', modalHTML, [], {
            disableBackgroundClick: true,
            disableEscapeKey: true,
            width: '95vw'
        });
        
        console.log('✅ 모달 생성 완료:', modal ? '성공' : '실패');

        // 서브모달 외곽 스크롤 제거 (내부 flex 레이아웃이 스크롤 처리)
        if (modal) {
            // 오버레이 자체 스크롤 제거
            modal.style.overflow = 'hidden';

            const subModalInner = modal.querySelector('.sub-modal');
            if (subModalInner) {
                subModalInner.style.overflow = 'hidden';
                subModalInner.style.padding = '0';
                subModalInner.style.maxHeight = '95vh';
                subModalInner.style.height = '95vh';
                subModalInner.style.boxSizing = 'border-box';
                // flex column으로 변경하여 sub-modal-content가 남은 공간을 채우게 함
                subModalInner.style.display = 'flex';
                subModalInner.style.flexDirection = 'column';
            }

            // .sub-modal-content가 남은 높이를 채우도록 설정 (높이 체인 유효화)
            const subModalContent = modal.querySelector('.sub-modal-content');
            if (subModalContent) {
                subModalContent.style.flex = '1';
                subModalContent.style.overflow = 'hidden';
                subModalContent.style.minHeight = '0';
            }
        }

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
                    loadRevitWallTypes(); // 이 함수 내에서 동기화됨
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
        <div style="display: flex; flex-direction: column; height: 100%; padding: 0;">
            <!-- 모달 헤더 -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; background: #334155; flex-shrink: 0;">
                <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: white;">
                    <i class="fas fa-project-diagram"></i> 벽체 타입 관리
                </h3>
                <button onclick="closeRevitTypeMatching()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 4px; line-height: 1;"
                        onmouseover="this.style.color='white'; this.style.background='#475569'"
                        onmouseout="this.style.color='#94a3b8'; this.style.background='none'"
                        title="닫기">&times;</button>
            </div>

            <!-- 상단 툴바 -->
            <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; flex-wrap: wrap;">
                <div class="dropdown" style="position: relative;">
                    <button class="btn btn-primary dropdown-toggle" onclick="toggleRevitActionsDropdown()" style="padding: 5px 12px; font-size: 12px;">
                        <i class="fas fa-plus"></i> 벽체 작업
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="dropdown-menu" id="revitActionsDropdown" style="display: none;">
                        <div class="dropdown-item" onclick="addRevitWallType()">
                            <i class="fas fa-plus"></i> 새 WallType 생성
                        </div>
                        <div class="dropdown-divider"></div>
                        <div class="dropdown-item" onclick="showWallTypePreview()">
                            <i class="fas fa-cubes"></i> 벽체타입 생성 (Revit)
                        </div>
                        <div class="dropdown-divider"></div>
                        <div class="dropdown-item" onclick="deleteSelectedRevitWalls()">
                            <i class="fas fa-trash-alt"></i> 선택 삭제
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

                <div style="flex: 1;"></div>
                <span style="font-size: 11px; color: #94a3b8;">
                    좌클릭: 레이어 선택 &nbsp;|&nbsp; 우클릭: 레이어 해제
                </span>
            </div>

            <!-- 테이블 영역 (단일 스크롤 컨테이너 — excelWallTypeManager 방식) -->
            <div style="flex: 1; overflow: auto; position: relative;">
                <table style="width: max-content; min-width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead style="position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; width: 40px; min-width: 40px;">
                                <input type="checkbox" id="selectAllRevitWalls" onchange="toggleAllRevitWallSelection()">
                            </th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; width: 40px; min-width: 40px;" title="순서 번호">No</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; width: 80px; min-width: 80px;" title="벽체 타입명">WallType</th>
                            <th colspan="3" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap;" title="좌측 마감 레이어">좌측마감</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="구조체">구조체</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="단열제">단열제</th>
                            <th colspan="3" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap;" title="우측 마감 레이어">우측마감</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="옵션1">옵션1</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="옵션2">옵션2</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="옵션3">옵션3</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="옵션4">옵션4</th>
                            <th rowspan="2" style="padding: 6px 4px; text-align: center; font-size: 10px; font-weight: 600; color: white; background: linear-gradient(135deg, #475569 0%, #334155 100%); border: 1px solid #334155; white-space: nowrap; width: 60px; min-width: 60px;" title="벽체 두께 (밀리미터)">두께(mm)</th>
                        </tr>
                        <tr>
                            <th style="padding: 4px 3px; text-align: center; font-size: 9px; font-weight: 500; color: white; background: linear-gradient(135deg, #64748b 0%, #475569 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="레이어 3">Layer3</th>
                            <th style="padding: 4px 3px; text-align: center; font-size: 9px; font-weight: 500; color: white; background: linear-gradient(135deg, #64748b 0%, #475569 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="레이어 2">Layer2</th>
                            <th style="padding: 4px 3px; text-align: center; font-size: 9px; font-weight: 500; color: white; background: linear-gradient(135deg, #64748b 0%, #475569 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="레이어 1">Layer1</th>
                            <th style="padding: 4px 3px; text-align: center; font-size: 9px; font-weight: 500; color: white; background: linear-gradient(135deg, #64748b 0%, #475569 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="레이어 1">Layer1</th>
                            <th style="padding: 4px 3px; text-align: center; font-size: 9px; font-weight: 500; color: white; background: linear-gradient(135deg, #64748b 0%, #475569 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="레이어 2">Layer2</th>
                            <th style="padding: 4px 3px; text-align: center; font-size: 9px; font-weight: 500; color: white; background: linear-gradient(135deg, #64748b 0%, #475569 100%); border: 1px solid #334155; white-space: nowrap; min-width: 90px;" title="레이어 3">Layer3</th>
                        </tr>
                    </thead>
                    <tbody id="revit-wall-table-body">
                        <tr>
                            <td colspan="16" style="text-align: center; padding: 20px; color: #6c757d; border: 1px solid #cbd5e1;">
                                벽체 타입이 없습니다. "새 WallType 생성" 버튼을 클릭하여 추가하세요.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 상태 표시줄 -->
            <div style="padding: 6px 16px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; flex-shrink: 0;">
                벽체 타입 목록
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

// saveAllChanges()는 제거됨 — saveRevitWallTypes()에서 실시간 IndexedDB 동기화 처리

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
            const loadedTypes = parsedData.types || [];
            revitWallTypeCounter = parsedData.counter || 0;
            
            // window.revitWallTypes 배열을 직접 업데이트 (참조 유지)
            window.revitWallTypes.length = 0; // 기존 항목 제거
            window.revitWallTypes.push(...loadedTypes); // 새 항목 추가
            
            console.log(`✅ Revit 벽체 타입 로드: ${window.revitWallTypes.length}개`);
        } else {
            window.revitWallTypes.length = 0; // 배열 초기화 (참조 유지)
            revitWallTypeCounter = 0;
            console.log('📝 새로운 Revit 벽체 타입 목록 시작');
        }
        
        // ID가 누락된 항목 수정
        window.revitWallTypes.forEach((wall, index) => {
            if (!wall.id) {
                wall.id = ++revitWallTypeCounter;
            }
            wall.no = index + 1;
        });
        
        console.log('🌐 window.revitWallTypes 로드 완료:', window.revitWallTypes.length, '개');
        
        return true;
    } catch (error) {
        console.error('❌ 벽체 타입 데이터 로드 실패:', error);
        window.revitWallTypes.length = 0; // 배열 초기화 (참조 유지)
        revitWallTypeCounter = 0;
        return false;
    }
}

// 벽체 타입 데이터 저장 (LocalStorage 즉시 + IndexedDB 디바운스)
let _indexedDBSaveTimer = null;

function saveRevitWallTypes() {
    try {
        const dataToSave = {
            types: window.revitWallTypes,
            counter: revitWallTypeCounter,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('kiyeno_revit_wall_types', JSON.stringify(dataToSave));
        console.log('✅ Revit 벽체 타입 데이터 저장됨:', window.revitWallTypes.length, '개');

        // IndexedDB 디바운스 저장 (마지막 변경 후 500ms 후 저장)
        if (_indexedDBSaveTimer) clearTimeout(_indexedDBSaveTimer);
        _indexedDBSaveTimer = setTimeout(() => {
            saveToWallTypeMasters().then(success => {
                if (success) {
                    console.log('✅ IndexedDB 자동 동기화 완료');
                }
            }).catch(err => {
                console.error('❌ IndexedDB 자동 동기화 실패:', err);
            });
        }, 500);

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
    
    if (!window.revitWallTypes || window.revitWallTypes.length === 0) {
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
    const tableRows = window.revitWallTypes.map(wall => createRevitWallTableRow(wall)).join('');
    tableBody.innerHTML = tableRows;
}

// 벽체 테이블 행 생성 함수 (클릭 가능한 자재 셀 포함)
function createRevitWallTableRow(wall) {
    const isSelected = selectedRevitWalls.has(wall.id);
    
    const tdBase = 'padding: 4px; text-align: center; border: 1px solid #cbd5e1; font-size: 11px;';
    const tdMat = `${tdBase} cursor: pointer; background: #f8fafc; min-width: 90px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;`;
    const placeholder = '<span style="color: #999;">클릭하여 선택</span>';

    return `
        <tr data-wall-id="${wall.id}" class="${isSelected ? 'selected' : ''}">
            <td style="${tdBase}">
                <input type="checkbox" ${isSelected ? 'checked' : ''}
                       onchange="toggleRevitWallSelection(${wall.id})">
            </td>
            <td style="${tdBase} color: #94a3b8;">${wall.no}</td>
            <td style="${tdBase} font-weight: 600; color: #1e293b; min-width: 80px;" ondblclick="editRevitWallType(${wall.id})">${wall.wallType || ''}</td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'layer3_1')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer3_1')">
                ${wall.layer3_1 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'layer2_1')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer2_1')">
                ${wall.layer2_1 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'layer1_1')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer1_1')">
                ${wall.layer1_1 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'column1')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'column1')">
                ${wall.column1 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'infill')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'infill')">
                ${wall.infill || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'layer1_2')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer1_2')">
                ${wall.layer1_2 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'layer2_2')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer2_2')">
                ${wall.layer2_2 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'layer3_2')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'layer3_2')">
                ${wall.layer3_2 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'column2')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'column2')">
                ${wall.column2 || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'channel')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'channel')">
                ${wall.channel || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'runner')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'runner')">
                ${wall.runner || placeholder}
            </td>
            <td style="${tdMat}" onclick="selectMaterial(${wall.id}, 'steelPlate')"
                oncontextmenu="clearMaterial(event, ${wall.id}, 'steelPlate')">
                ${wall.steelPlate || placeholder}
            </td>
            <td style="${tdBase} color: #475569;" ondblclick="editRevitWallThickness(${wall.id})">${wall.thickness || ''}</td>
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

    // 드롭다운을 열 때만 외부 클릭 리스너 등록 (메모리 누수 방지)
    if (!isVisible) {
        // 다음 틱에 리스너 등록 (현재 클릭 이벤트와 분리)
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 0);
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
    const isDuplicate = window.revitWallTypes.some(wall => wall.wallType && wall.wallType.toLowerCase() === wallName.toLowerCase());
    if (isDuplicate) {
        alert('이미 존재하는 벽체 타입명입니다.');
        nameInput.focus();
        return;
    }
    
    // 새 벽체 타입 생성
    const newWallType = {
        id: ++revitWallTypeCounter,
        no: window.revitWallTypes.length + 1,
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
    
    window.revitWallTypes.push(newWallType);
    syncRevitWallTypes(); // 상태 확인
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
    const filteredWalls = window.revitWallTypes.filter(wall => !selectedIds.includes(wall.id));
    window.revitWallTypes.length = 0; // 기존 배열 초기화
    window.revitWallTypes.push(...filteredWalls); // 필터된 결과 추가
    selectedRevitWalls.clear();
    
    // 번호 재정렬
    window.revitWallTypes.forEach((wall, index) => {
        wall.no = index + 1;
    });
    
    syncRevitWallTypes(); // 상태 확인
    
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`✅ ${selectedIds.length}개 벽체 타입 삭제됨`);
    alert(`${selectedIds.length}개의 벽체 타입이 삭제되었습니다.`);
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
    const wall = window.revitWallTypes.find(w => w.id === wallId);
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
                    <thead style="background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; position: sticky; top: 0; z-index: 10;">
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
                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #64748b; font-weight: 500;">₩${expenseCost.toLocaleString()}</td>
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
        tbody.style.backgroundColor = '#f8fafc';
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
    
    const wall = window.revitWallTypes.find(w => w.id === wallId);
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
    const wall = window.revitWallTypes.find(w => w.id === wallId);
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
    
    const wall = window.revitWallTypes.find(w => w.id === wallId);
    if (!wall) {
        alert('벽체를 찾을 수 없습니다.');
        return;
    }
    
    // 벽체에 자재 할당
    wall[fieldName] = selectedMaterialData.name;
    
    // 참조는 같지만 데이터가 변경되었음을 알리기 위해 동기화
    syncRevitWallTypes();
    saveRevitWallTypes();
    updateRevitWallTable();
    closeSubModal(modal);
    
    // 선택된 자재 데이터 초기화
    selectedMaterialData = null;
    
    console.log(`✅ 자재 적용됨: ${wall.wallType} - ${getFieldDisplayName(fieldName)}: ${wall[fieldName]}`);
}

function clearMaterial(event, wallId, fieldName) {
    event.stopPropagation();
    
    const wall = window.revitWallTypes.find(w => w.id === wallId);
    if (!wall) return;
    
    wall[fieldName] = '';
    saveRevitWallTypes();
    updateRevitWallTable();
    
    console.log(`🗑️ 자재 제거됨: ${wall.wallType} - ${getFieldDisplayName(fieldName)}`);
}

function clearMaterialFromModal(wallId, fieldName, modal) {
    const wall = window.revitWallTypes.find(w => w.id === wallId);
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
    const wall = window.revitWallTypes.find(w => w.id === wallId);
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
    const wall = window.revitWallTypes.find(w => w.id === wallId);
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
    if (window.revitWallTypes.length === 0) {
        alert('내보낼 벽체 타입 데이터가 없습니다.');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        wallTypesCount: window.revitWallTypes.length,
        wallTypes: window.revitWallTypes,
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
                    // window.revitWallTypes 배열을 직접 업데이트 (참조 유지)
                    window.revitWallTypes.length = 0; // 기존 항목 제거
                    window.revitWallTypes.push(...importData.wallTypes); // 새 항목 추가
                    revitWallTypeCounter = importData.counter || Math.max(...window.revitWallTypes.map(w => w.id), 0);
                    selectedRevitWalls.clear();
                    
                    // 번호 재정렬
                    window.revitWallTypes.forEach((wall, index) => {
                        wall.no = index + 1;
                    });
                    
                    syncRevitWallTypes(); // 전역 변수 동기화
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
            overflow: hidden;
            padding: 20px;
            min-height: 0;
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
            border-left: 4px solid #94a3b8;
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

        /* 벽체 테이블 tbody 스타일 (인라인 스타일 보완) */
        #revit-wall-table-body tr:nth-child(even) {
            background: #f8fafc;
        }

        #revit-wall-table-body tr:hover {
            background: #e2e8f0;
        }

        #revit-wall-table-body tr.selected {
            background: #e2e8f0;
        }

        /* 자재 셀 스타일 */
        .material-cell {
            background: #f8fafc;
            border: 1px dashed #cbd5e1 !important;
            transition: all 0.2s ease;
        }

        .material-cell:hover {
            background: #f1f5f9;
            border-color: #94a3b8 !important;
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
            background-color: #e2e8f0 !important;
        }

        /* 선택된 자재 정보 스타일 */
        .selected-material-info {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 12px;
        }

        .selected-material-info strong {
            color: #334155;
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
            border-color: #64748b;
            box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.1);
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
window.deleteSelectedRevitWalls = deleteSelectedRevitWalls;

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
window.initializeTypeMappingTabs = initializeTypeMappingTabs;

// =============================================================================
// 벽체 타입 두께 계산 및 Revit 생성 기능
// =============================================================================

/**
 * ID가 일위대가 ID인지 확인
 * @param {string} id - 확인할 ID
 * @returns {boolean}
 */
function isUnitPriceId(id) {
    return id && typeof id === 'string' && id.startsWith('unitPrice_');
}

/**
 * 일위대가 ID로 일위대가 데이터 조회
 * @param {string} unitPriceId - 일위대가 ID (예: "unitPrice_일반석고보드-36-3600이하-95T1PLY-1759333188504")
 * @returns {Promise<object|null>} 일위대가 데이터 객체
 */
async function getUnitPriceData(unitPriceId) {
    if (!isUnitPriceId(unitPriceId)) {
        console.warn(`잘못된 일위대가 ID 형식: ${unitPriceId}`);
        return null;
    }

    // "unitPrice_" 접두사 제거
    const actualId = unitPriceId.replace('unitPrice_', '');

    try {
        // window.unitPriceDB가 존재하는지 확인
        if (!window.unitPriceDB) {
            console.error('❌ unitPriceDB가 초기화되지 않았습니다');
            return null;
        }

        // IndexedDB에서 일위대가 조회
        const unitPrice = await window.unitPriceDB.getUnitPriceById(actualId);

        if (unitPrice) {
            console.log(`✅ 일위대가 조회 성공: ${actualId}`);
        } else {
            console.warn(`⚠️ 일위대가를 찾을 수 없음: ${actualId}`);
        }

        return unitPrice;
    } catch (error) {
        console.error(`❌ 일위대가 조회 오류 (${actualId}):`, error);
        return null;
    }
}

/**
 * 일위대가의 구성품에서 두께 추출
 * @param {string} unitPriceId - 일위대가 ID
 * @returns {Promise<number|null>} 추출된 두께 (mm)
 */
async function extractThicknessFromUnitPrice(unitPriceId) {
    const unitPrice = await getUnitPriceData(unitPriceId);

    if (!unitPrice || !unitPrice.components || unitPrice.components.length === 0) {
        console.warn(`일위대가 ${unitPriceId}에 구성품이 없습니다`);
        return null;
    }

    console.log(`🔍 일위대가 구성품 분석: ${unitPrice.components.length}개`);

    // 구성품에서 석고보드나 스터드 찾기
    for (const component of unitPrice.components) {
        if (!component.materialId) {
            console.log(`  ⏭️  구성품 "${component.name}": materialId 없음 (스킵)`);
            continue;
        }

        // priceDatabase에서 실제 자재 조회 (비동기)
        const material = await getMaterialData(component.materialId);

        if (!material) {
            console.log(`  ⚠️  구성품 "${component.name}": 자재 ${component.materialId} 찾을 수 없음`);
            continue;
        }

        // 단열재 제외
        if (material.category === 'INSULATION') {
            console.log(`  🚫 구성품 "${component.name}": 단열재 (제외)`);
            continue;
        }

        // 석고보드: t 필드 사용
        if (material.t !== undefined && material.t !== null) {
            const thickness = parseFloat(material.t);
            console.log(`  ✅ 석고보드 두께 추출: ${component.name} → ${thickness}mm (t 필드)`);
            return thickness;
        }

        // 경량자재 (스터드): size 필드에서 가로값 추출
        if (material.size) {
            const match = material.size.match(/\d+\.?\d*T\*(\d+)/);
            if (match) {
                const thickness = parseFloat(match[1]);
                console.log(`  ✅ 스터드 가로값 추출: ${component.name} → ${thickness}mm (size: ${material.size})`);
                return thickness;
            }
        }

        console.log(`  ⏭️  구성품 "${component.name}": 두께 추출 불가 (t: ${material.t}, size: ${material.size})`);
    }

    console.warn(`일위대가 ${unitPriceId}에서 유효한 두께를 찾을 수 없습니다`);
    return null;
}

/**
 * 자재 ID로 자재 정보 조회 (비동기)
 * @param {string} materialId - 자재 ID
 * @returns {Promise<object|null>} 자재 데이터 객체
 */
async function getMaterialData(materialId) {
    if (!materialId || !window.priceDB) {
        console.warn('자재 ID가 없거나 priceDB가 초기화되지 않았습니다');
        return null;
    }

    try {
        // IndexedDB materials 테이블에서 ID로 직접 조회
        const material = await window.priceDB.findMaterialById(materialId);

        if (material) {
            console.log(`✅ 자재 발견: ${materialId} - ${material.name || material.item}`);
            return material;
        }

        console.warn(`자재 ${materialId}를 찾을 수 없습니다`);
        return null;
    } catch (error) {
        console.error(`자재 조회 오류 (${materialId}):`, error);
        return null;
    }
}

/**
 * 자재 ID 또는 일위대가 ID로부터 두께(mm) 추출
 * @param {string} materialId - 자재 ID 또는 일위대가 ID
 * @returns {Promise<number|null>} 두께(mm) 또는 null
 */
async function extractThicknessFromMaterial(materialId) {
    // 일위대가 ID인 경우
    if (isUnitPriceId(materialId)) {
        console.log(`📋 일위대가 ID 감지: ${materialId}`);
        return await extractThicknessFromUnitPrice(materialId);
    }

    // 일반 자재 ID인 경우
    const material = await getMaterialData(materialId);
    if (!material) {
        console.warn(`자재 ${materialId}를 찾을 수 없습니다`);
        return null;
    }

    // 디버깅: 자재 객체 전체 출력
    console.log(`🔍 자재 객체 구조 확인 (${materialId}):`, material);

    // 석고보드: t 필드 사용 (9.5, 12.5, 15.0 등)
    if (material.t !== undefined && material.t !== null) {
        const thickness = parseFloat(material.t);
        console.log(`📏 석고보드 두께: ${materialId} → ${thickness}mm (t 필드)`);
        return thickness;
    }

    // 경량자재: size 필드에서 가로값 추출 ("0.8T*60*45" → 60)
    if (material.size) {
        const match = material.size.match(/\d+\.?\d*T\*(\d+)/);
        if (match) {
            const thickness = parseFloat(match[1]);
            console.log(`📏 경량자재 두께: ${materialId} → ${thickness}mm (size: ${material.size})`);
            return thickness;
        }
    }

    // 단열재 제외 처리
    if (material.category === 'INSULATION') {
        console.log(`🚫 단열재 ${materialId}는 두께 계산에서 제외됨`);
        return null;
    }

    console.warn(`자재 ${materialId}의 두께를 추출할 수 없습니다 (t: ${material.t}, size: ${material.size})`);
    console.log(`📋 사용 가능한 필드:`, Object.keys(material));
    return null;
}

/**
 * 벽체 타입으로부터 레이어 구조 생성 (비동기)
 * @param {object} wallType - 벽체 타입 객체
 * @returns {Promise<object>} { wallTypeName, layers, totalThickness, errors, hasErrors }
 */
async function getLayerStructure(wallType) {
    console.log('🏗️ 레이어 구조 생성:', wallType.wallType);

    const layers = [];
    const errors = [];
    let totalThickness = 0;

    // 레이어 순서: 좌측마감3 → 좌측마감2 → 좌측마감1 → 구조체 → 우측마감1 → 우측마감2 → 우측마감3
    const layerConfig = [
        { field: 'layer3_1', name: '좌측마감 Layer3' },
        { field: 'layer2_1', name: '좌측마감 Layer2' },
        { field: 'layer1_1', name: '좌측마감 Layer1' },
        { field: 'column1', name: '구조체' },
        { field: 'layer1_2', name: '우측마감 Layer1' },
        { field: 'layer2_2', name: '우측마감 Layer2' },
        { field: 'layer3_2', name: '우측마감 Layer3' }
    ];

    // 비동기 처리를 위해 for...of 사용
    for (const config of layerConfig) {
        const materialId = wallType[config.field];

        if (!materialId) {
            console.log(`⏭️  ${config.name}: 빈 레이어 (스킵)`);
            continue; // 빈 레이어 스킵
        }

        // 일위대가인지 확인
        let displayName = materialId;
        let spec = '';
        let isUnitPrice = false;

        if (isUnitPriceId(materialId)) {
            // 일위대가인 경우
            isUnitPrice = true;
            const unitPrice = await getUnitPriceData(materialId);

            if (!unitPrice) {
                errors.push(`${config.name}: 일위대가 ${materialId}를 찾을 수 없음`);
                console.error(`❌ ${config.name}: 일위대가 ${materialId} 조회 실패`);
                continue;
            }

            displayName = unitPrice.basic?.itemName || '알 수 없는 일위대가';
            spec = `일위대가 (구성품 ${unitPrice.components?.length || 0}개)`;
        } else {
            // 일반 자재인 경우
            const material = await getMaterialData(materialId);
            if (!material) {
                errors.push(`${config.name}: 자재 ${materialId}를 찾을 수 없음`);
                console.error(`❌ ${config.name}: 자재 ${materialId} 조회 실패`);
                continue;
            }

            displayName = material.name || material.item;
            spec = material.spec || material.size || '';
        }

        // 두께 추출 (비동기)
        const thickness = await extractThicknessFromMaterial(materialId);
        if (thickness === null) {
            errors.push(`${config.name}: ${displayName} 두께 추출 실패`);
            console.error(`❌ ${config.name}: 두께 추출 실패`);
            continue;
        }

        layers.push({
            position: config.name,
            materialId: materialId,
            materialName: displayName,
            spec: spec,
            thickness: thickness,
            isUnitPrice: isUnitPrice
        });

        totalThickness += thickness;
        console.log(`  ✓ ${config.name}: ${displayName} (${thickness}mm)`);
    }

    const result = {
        wallTypeName: wallType.wallType,
        layers: layers,
        totalThickness: Math.round(totalThickness * 10) / 10, // 소수점 1자리
        errors: errors,
        hasErrors: errors.length > 0
    };

    console.log(`📊 레이어 구조 생성 완료: ${layers.length}개 레이어, 총 ${result.totalThickness}mm, 오류 ${errors.length}개`);

    return result;
}

/**
 * 레이어 구조 미리보기 모달 HTML 생성
 * @param {Array} wallTypesData - 벽체 타입 레이어 구조 배열
 * @returns {string} 모달 HTML
 */
function createLayerPreviewModalHTML(wallTypesData) {
    let html = `
        <div class="layer-preview-container" style="max-height: 600px; overflow-y: auto;">
            <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #64748b;">
                <h4 style="margin: 0 0 10px 0; color: #334155;">
                    <i class="fas fa-info-circle"></i> 생성 예정 벽체 타입
                </h4>
                <p style="margin: 0; color: #475569;">
                    선택된 ${wallTypesData.length}개의 벽체 타입을 Revit에서 생성합니다.
                </p>
            </div>
    `;

    wallTypesData.forEach((data, index) => {
        const hasErrors = data.hasErrors;
        const borderColor = hasErrors ? '#ef4444' : '#10b981';
        const bgColor = hasErrors ? '#fef2f2' : '#f0fdf4';

        html += `
            <div class="wall-type-preview" style="margin-bottom: 20px; padding: 20px; background: ${bgColor}; border-radius: 8px; border: 2px solid ${borderColor};">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; display: flex; justify-content: space-between; align-items: center;">
                    <span>
                        <i class="fas fa-layer-group"></i> ${data.wallTypeName}
                    </span>
                    <span style="font-size: 18px; font-weight: 700; color: ${borderColor};">
                        총 두께: ${data.totalThickness}mm
                    </span>
                </h3>

                ${hasErrors ? `
                    <div style="margin-bottom: 15px; padding: 10px; background: #fee2e2; border-radius: 6px; color: #991b1b;">
                        <strong><i class="fas fa-exclamation-triangle"></i> 오류:</strong>
                        <ul style="margin: 5px 0 0 20px; padding: 0;">
                            ${data.errors.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden;">
                    <thead>
                        <tr style="background: #1f2937; color: white;">
                            <th style="padding: 10px; text-align: left; font-size: 12px;">위치</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px;">자재명</th>
                            <th style="padding: 10px; text-align: left; font-size: 12px;">규격</th>
                            <th style="padding: 10px; text-align: right; font-size: 12px;">두께(mm)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.layers.map(layer => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 10px; font-size: 11px; color: #6b7280;">${layer.position}</td>
                                <td style="padding: 10px; font-size: 11px; font-weight: 600;">${layer.materialName}</td>
                                <td style="padding: 10px; font-size: 11px; color: #6b7280;">${layer.spec}</td>
                                <td style="padding: 10px; font-size: 11px; text-align: right; font-weight: 600; color: #475569;">${layer.thickness}</td>
                            </tr>
                        `).join('')}
                        <tr style="background: #f9fafb; font-weight: 700;">
                            <td colspan="3" style="padding: 12px; font-size: 12px; text-align: right;">합계</td>
                            <td style="padding: 12px; font-size: 12px; text-align: right; color: ${borderColor};">${data.totalThickness} mm</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });

    html += `</div>`;
    return html;
}

/**
 * 벽체 타입 레이어 구조 미리보기 모달 표시 (비동기)
 */
async function showWallTypePreview() {
    console.log('🔍 벽체타입 생성 미리보기');

    // 1. 선택된 벽체 타입 ID 확인
    const selectedIds = Array.from(selectedRevitWalls);

    if (selectedIds.length === 0) {
        alert('벽체 타입을 선택해주세요.');
        return;
    }

    // 2. ID로부터 실제 벽체 객체 가져오기
    const selectedWalls = window.revitWallTypes.filter(wall => selectedIds.includes(wall.id));

    console.log(`📋 선택된 벽체 타입: ${selectedWalls.length}개`, selectedWalls);

    // 드롭다운 닫기
    toggleRevitActionsDropdown();

    // 3. 각 벽체 타입의 레이어 구조 계산 (비동기 처리)
    const wallTypesData = await Promise.all(
        selectedWalls.map(wallType => getLayerStructure(wallType))
    );

    // 4. 오류가 있는 벽체 타입 확인
    const errorCount = wallTypesData.filter(data => data.hasErrors).length;

    // 4. 미리보기 모달 HTML 생성
    const previewHTML = createLayerPreviewModalHTML(wallTypesData);

    // 5. 모달 버튼 설정
    const buttons = [
        {
            text: '<i class="fas fa-times"></i> 취소',
            className: 'btn btn-secondary',
            onClick: (modal) => {
                console.log('🔴 취소 버튼 클릭됨');
                closeSubModal(modal);
            }
        }
    ];

    // 오류가 없는 경우에만 생성 버튼 추가
    if (errorCount === 0) {
        buttons.push({
            text: '<i class="fas fa-check"></i> Revit에서 생성하기',
            className: 'btn btn-success',
            onClick: async (modal) => {
                console.log('🟢 생성하기 버튼 클릭됨');
                console.log('wallTypesData:', wallTypesData);

                // 직접 인라인으로 함수 내용 실행 (함수 이름 충돌 회피)
                try {
                    console.log('📤 Revit 벽체 타입 생성 시작:', wallTypesData);

                    // 1. 오류가 없는 벽체 타입만 필터링
                    const validWallTypes = wallTypesData.filter(data => !data.hasErrors);
                    console.log('✅ 유효한 벽체 타입:', validWallTypes.length, '개');

                    if (validWallTypes.length === 0) {
                        alert('생성 가능한 벽체 타입이 없습니다.\n모든 벽체에 오류가 있습니다.');
                        return;
                    }

                    // 2. Revit C# 호환 형식으로 데이터 변환
                    console.log('🔄 데이터 변환 시작...');
                    const revitData = validWallTypes.map(wallData => ({
                        WallTypeName: wallData.wallTypeName,
                        TotalThickness: wallData.totalThickness,
                        Layers: wallData.layers.map(layer => ({
                            Position: layer.position,
                            MaterialId: layer.materialId,
                            MaterialName: layer.materialName,
                            Specification: layer.spec,
                            Thickness: layer.thickness,
                            IsUnitPrice: layer.isUnitPrice
                        }))
                    }));

                    console.log('🔄 변환된 Revit 데이터:', revitData);

                    // 3. WebSocket을 통해 Revit으로 전송
                    console.log('🔍 WebSocket 연결 상태 확인...');
                    if (!window.socketService || !window.socketService.isConnected) {
                        alert('WebSocket 서버에 연결되어 있지 않습니다.\n서버 연결 상태를 확인해주세요.');
                        return;
                    }

                    if (!window.socketService.revitConnected) {
                        alert('Revit이 연결되어 있지 않습니다.\nRevit에서 Kiyeno 애드인을 실행해주세요.');
                        return;
                    }

                    // 전송 중 메시지 표시
                    console.log('📡 Revit으로 벽체 타입 생성 명령 전송 중...');

                    const success = window.socketService.sendRevitCommand('CREATE_WALL_TYPES', revitData);

                    if (success) {
                        // 전송 성공 메시지
                        const skippedCount = wallTypesData.length - validWallTypes.length;
                        let message = `${validWallTypes.length}개의 벽체 타입 생성 명령을 Revit으로 전송했습니다.`;

                        if (skippedCount > 0) {
                            message += `\n\n⚠️ ${skippedCount}개의 벽체 타입은 오류로 인해 제외되었습니다.`;
                        }

                        alert(message + '\n\n잠시 후 결과를 확인할 수 있습니다.');
                        console.log('✅ Revit 명령 전송 완료');
                    } else {
                        alert('Revit 명령 전송에 실패했습니다.\n네트워크 연결을 확인해주세요.');
                        console.error('❌ Revit 명령 전송 실패');
                    }
                } catch (error) {
                    console.error('❌ 벽체 타입 생성 오류:', error);
                    console.error('스택:', error.stack);
                    alert(`벽체 타입 생성 중 오류 발생:\n${error.message}`);
                } finally {
                    closeSubModal(modal);
                }
            }
        });
    }

    // 6. 서브 모달 생성
    const modal = createSubModal(
        '🏗️ 벽체타입 생성 미리보기',
        previewHTML,
        buttons,
        {
            disableBackgroundClick: true,
            width: '1000px'
        }
    );

    // 7. 오류 알림
    if (errorCount > 0) {
        setTimeout(() => {
            alert(`${errorCount}개 벽체 타입에 오류가 있습니다.\n자재 정보를 확인하고 다시 시도해주세요.`);
        }, 300);
    }
}

/**
 * Revit에서 벽체 타입 생성
 * @param {Array} wallTypesData - 벽체 타입 레이어 구조 배열
 */
async function createWallTypesInRevit(wallTypesData) {
    try {
        console.log('📤 Revit 벽체 타입 생성 시작:', wallTypesData);

        // 1. 오류가 없는 벽체 타입만 필터링
        const validWallTypes = wallTypesData.filter(data => !data.hasErrors);
        console.log('✅ 유효한 벽체 타입:', validWallTypes.length, '개');

        if (validWallTypes.length === 0) {
            alert('생성 가능한 벽체 타입이 없습니다.\n모든 벽체에 오류가 있습니다.');
            return;
        }

        // 2. Revit C# 호환 형식으로 데이터 변환
        console.log('🔄 데이터 변환 시작...');
        const revitData = validWallTypes.map(wallData => ({
            WallTypeName: wallData.wallTypeName,
            TotalThickness: wallData.totalThickness,
            Layers: wallData.layers.map(layer => ({
                Position: layer.position,
                MaterialId: layer.materialId,
                MaterialName: layer.materialName,
                Specification: layer.spec,
                Thickness: layer.thickness,
                IsUnitPrice: layer.isUnitPrice
            }))
        }));

        console.log('🔄 변환된 Revit 데이터:', revitData);

        // 3. WebSocket을 통해 Revit으로 전송
        console.log('🔍 WebSocket 연결 상태 확인...');
        if (!window.socketService || !window.socketService.isConnected) {
            alert('WebSocket 서버에 연결되어 있지 않습니다.\n서버 연결 상태를 확인해주세요.');
            return;
        }

        if (!window.socketService.revitConnected) {
            alert('Revit이 연결되어 있지 않습니다.\nRevit에서 Kiyeno 애드인을 실행해주세요.');
            return;
        }

        // 전송 중 메시지 표시
        console.log('📡 Revit으로 벽체 타입 생성 명령 전송 중...');

        const success = window.socketService.sendRevitCommand('CREATE_WALL_TYPES', revitData);

        if (success) {
            // 전송 성공 메시지
            const skippedCount = wallTypesData.length - validWallTypes.length;
            let message = `${validWallTypes.length}개의 벽체 타입 생성 명령을 Revit으로 전송했습니다.`;

            if (skippedCount > 0) {
                message += `\n\n⚠️ ${skippedCount}개의 벽체 타입은 오류로 인해 제외되었습니다.`;
            }

            alert(message + '\n\n잠시 후 결과를 확인할 수 있습니다.');
            console.log('✅ Revit 명령 전송 완료');
        } else {
            alert('Revit 명령 전송에 실패했습니다.\n네트워크 연결을 확인해주세요.');
            console.error('❌ Revit 명령 전송 실패');
        }
    } catch (error) {
        console.error('❌ createWallTypesInRevit 오류:', error);
        console.error('스택:', error.stack);
        alert(`벽체 타입 생성 중 오류 발생:\n${error.message}`);
    }
}

// 두께 계산 유틸리티 함수들 전역 등록
window.getMaterialData = getMaterialData;
window.extractThicknessFromMaterial = extractThicknessFromMaterial;
window.getLayerStructure = getLayerStructure;
window.createLayerPreviewModalHTML = createLayerPreviewModalHTML;
window.showWallTypePreview = showWallTypePreview;
// createWallTypesInRevit는 인라인 구현으로 대체되어 전역 등록 불필요

console.log('✅ revitTypeMatching.js 로드 완료 - Revit 타입 매칭 전담 모듈 및 전역 함수 등록됨');

// Revit 벽체 타입 생성 결과 이벤트 리스너
if (window.socketService) {
    window.socketService.on('revit:wallTypeResult', (result) => {
        console.log('🔧 Revit 벽체 타입 생성 결과 수신:', result);

        // 결과 모달 표시
        showWallTypeCreationResult(result);
    });
    console.log('✅ Revit 벽체 타입 생성 결과 리스너 등록 완료');
} else {
    console.warn('⚠️ socketService가 아직 초기화되지 않았습니다. 리스너는 나중에 등록될 것입니다.');
}

/**
 * 벽체 타입 생성 결과 모달 표시
 * @param {Object} result - Revit으로부터 받은 생성 결과
 */
function showWallTypeCreationResult(result) {
    console.log('📊 벽체 타입 생성 결과 표시:', result);

    // 결과 HTML 생성
    let html = `
        <div style="max-height: 600px; overflow-y: auto;">
            <div style="margin-bottom: 20px; padding: 15px; background: ${result.Success ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border-left: 4px solid ${result.Success ? '#10b981' : '#ef4444'};">
                <h4 style="margin: 0 0 10px 0; color: ${result.Success ? '#166534' : '#991b1b'};">
                    <i class="fas ${result.Success ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    ${result.Success ? '벽체 타입 생성 완료' : '벽체 타입 생성 실패'}
                </h4>
                <p style="margin: 0; color: #475569;">
                    ${result.Message || '결과 메시지가 없습니다.'}
                </p>
            </div>
    `;

    // 성공한 타입들
    if (result.CreatedTypes && result.CreatedTypes.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #10b981;">
                    <i class="fas fa-check"></i> 생성 성공 (${result.CreatedTypes.length}개)
                </h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${result.CreatedTypes.map(typeName => `
                        <li style="padding: 8px 12px; margin: 4px 0; background: #f0fdf4; border-radius: 4px; border-left: 3px solid #10b981;">
                            <i class="fas fa-layer-group"></i> ${typeName}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // 실패한 타입들
    if (result.FailedTypes && result.FailedTypes.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #ef4444;">
                    <i class="fas fa-times"></i> 생성 실패 (${result.FailedTypes.length}개)
                </h4>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${result.FailedTypes.map(failure => `
                        <li style="padding: 8px 12px; margin: 4px 0; background: #fef2f2; border-radius: 4px; border-left: 3px solid #ef4444;">
                            <div style="font-weight: 600; margin-bottom: 4px;">
                                <i class="fas fa-layer-group"></i> ${failure.WallTypeName || '알 수 없는 타입'}
                            </div>
                            <div style="font-size: 11px; color: #991b1b;">
                                ${failure.ErrorMessage || '오류 메시지가 없습니다.'}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // 상세 오류 메시지
    if (result.ErrorMessage) {
        html += `
            <div style="margin-top: 20px; padding: 12px; background: #fee2e2; border-radius: 6px; color: #991b1b; font-size: 11px;">
                <strong><i class="fas fa-exclamation-triangle"></i> 상세 오류:</strong>
                <div style="margin-top: 8px; white-space: pre-wrap; font-family: monospace;">
                    ${result.ErrorMessage}
                </div>
            </div>
        `;
    }

    html += `</div>`;

    // 모달 표시
    if (window.createSubModal) {
        window.createSubModal({
            title: 'Revit 벽체 타입 생성 결과',
            content: html,
            width: '800px',
            buttons: [
                {
                    text: '<i class="fas fa-check"></i> 확인',
                    className: 'btn-primary',
                    onClick: (modal) => modal.remove()
                }
            ]
        });
    } else {
        // createSubModal이 없으면 기본 alert 사용
        alert(result.Message || '벽체 타입 생성이 완료되었습니다.');
    }
}

// showWallTypeCreationResult 전역 등록
window.showWallTypeCreationResult = showWallTypeCreationResult;

// 페이지 로드 시 초기 데이터 동기화
document.addEventListener('DOMContentLoaded', function() {
    // 초기 데이터가 있을 수도 있으므로 동기화 수행
    setTimeout(() => {
        if (window.revitWallTypes.length === 0) {
            // 저장된 데이터가 있는지 확인하고 로드
            loadRevitWallTypes();
        } else {
            // 이미 데이터가 있으면 상태 확인만 수행
            syncRevitWallTypes();
        }
    }, 100);
});