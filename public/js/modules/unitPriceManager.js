// =============================================================================
// Kiyeno 벽체 관리 시스템 - 일위대가 관리 모듈
// 일위대가 생성, 편집, 계산, 관리 전담 모듈
// =============================================================================

// =============================================================================
// 전역 변수
// =============================================================================
let unitPriceItems = []; // 일위대가 아이템 목록
let currentUnitPriceData = {}; // 현재 편집 중인 일위대가 데이터

// =============================================================================
// 일위대가 관리 메인 함수들
// =============================================================================

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
                
                <!-- 간격 입력 -->
                <div class="form-group">
                    <label>간격 <span class="required">*</span></label>
                    <input type="text" id="spacing" placeholder="예: @400" value="${editData?.basic?.spacing || ''}" required>
                </div>
                
                <!-- 높이 입력 -->
                <div class="form-group">
                    <label>높이 <span class="required">*</span></label>
                    <input type="text" id="height" placeholder="예: 3600이하" value="${editData?.basic?.height || ''}" required>
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
                
                <!-- 공종1 -->
                <div class="form-group">
                    <label>공종1 <span class="required">*</span></label>
                    <input type="text" id="workType1" placeholder="예: 경량" value="${editData?.basic?.workType1 || ''}" required>
                </div>
                
                <!-- 공종2 -->
                <div class="form-group">
                    <label>공종2</label>
                    <input type="text" id="workType2" placeholder="예: 벽체" value="${editData?.basic?.workType2 || ''}">
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
        spacing: document.getElementById('spacing').value.trim(),
        height: document.getElementById('height').value.trim(),
        size: document.getElementById('size').value.trim(),
        location: document.getElementById('location').value.trim(),
        workType1: document.getElementById('workType1').value.trim(),
        workType2: document.getElementById('workType2').value.trim(),
        unit: document.getElementById('unit').value
    };
    
    // 필수 필드 검증
    const requiredFields = ['itemName', 'spacing', 'height', 'size', 'location', 'workType1', 'unit'];
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

// 필드 라벨 매핑
function getFieldLabel(field) {
    const labels = {
        itemName: '아이템',
        spacing: '간격',
        height: '높이',
        size: 'SIZE',
        location: '부위',
        workType1: '공종1',
        workType2: '공종2',
        unit: 'UNIT'
    };
    return labels[field] || field;
}

// =============================================================================
// 세부 설정 모달 관련 함수들
// =============================================================================

// 세부 아이템 입력 모달 열기  
function openUnitPriceDetailModal(isEdit = false) {
    console.log('🔧 세부 아이템 입력 모달 열기');
    
    const basic = currentUnitPriceData.basic;
    const workTypeDisplay = basic.workType2 ? `${basic.workType1}/${basic.workType2}` : basic.workType1;
    const itemSummary = `${basic.itemName} ${basic.spacing} ${basic.height} ${basic.size} | ${basic.location} | ${workTypeDisplay} | ${basic.unit}`;
    const modalTitle = isEdit ? '세부 아이템 수정' : '세부 아이템 설정';
    
    const detailModalHTML = createDetailModalHTML(itemSummary);
    
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
            loadExistingComponents();
            
            // 기본 구성품이 없다면 하나 추가
            if (!currentUnitPriceData.components || currentUnitPriceData.components.length === 0) {
                addComponentRow();
            }
        }, 100);
    }
}

// 세부 모달 HTML 생성
function createDetailModalHTML(itemSummary) {
    return `
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
                            <th rowspan="2" style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">싸이즈</th>
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
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="3" step="0.1" oninput="calculateGrandTotal()" placeholder="3.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재운반비 및 양중비 -->
                        <tr class="fixed-row transport-cost-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재운반비 및 양중비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="1.5" step="0.1" oninput="calculateGrandTotal()" placeholder="1.5" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 자재비 이윤 -->
                        <tr class="fixed-row material-profit-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">자재비 이윤</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">자재비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="15" step="0.1" oninput="calculateGrandTotal()" placeholder="15.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-material-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="fixed-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 공구손료 및 기계경비 -->
                        <tr class="fixed-row tool-expense-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; font-weight: 600;">공구손료 및 기계경비</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">노무비의</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151; text-align: center;">%</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;"><input type="number" class="fixed-quantity" value="2" step="0.1" oninput="calculateGrandTotal()" placeholder="2.0" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right; background: white;"></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #f3f4f6; color: #374151;" class="fixed-expense-price">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="fixed-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="fixed-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="fixed-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #f3f4f6;"></td>
                        </tr>
                        <!-- 단수 정리 -->
                        <tr class="fixed-row rounding-row">
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; font-weight: 600;">단수 정리</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: center;">원미만</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e; text-align: center;">절사</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e;"><select class="rounding-unit" onchange="calculateGrandTotal()" style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; background: white;">
                                <option value="1">원</option>
                                <option value="10">10원</option>
                                <option value="100" selected>100원</option>
                                <option value="1000">1000원</option>
                            </select></td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="rounding-material-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f0f9ff; color: #1e40af; font-weight: 600;" class="rounding-labor-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; background: #fef3c7; color: #92400e;">0</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="rounding-expense-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="rounding-total-price">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #dc2626; font-weight: 600;" class="rounding-total-amount">0원</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; background: #fef3c7;"></td>
                        </tr>
                    </tbody>
                    <tfoot style="background: #f9fafb; position: sticky; bottom: 0;">
                        <tr class="summary-row">
                            <td colspan="4" style="padding: 12px 8px; border: 1px solid #e2e8f0; font-weight: 700; text-align: center; background: #6366f1; color: white;"><strong>총 합계</strong></td>
                            <td colspan="2" id="totalMaterial" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #ecfdf5; color: #065f46;">0원</td>
                            <td colspan="2" id="totalLabor" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #eff6ff; color: #1e40af;">0원</td>
                            <td colspan="2" id="totalExpense" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 600; background: #fefbeb; color: #92400e;">0원</td>
                            <td colspan="2" id="grandTotal" style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; background: #fef2f2; color: #b91c1c;">0원</td>
                            <td style="border: 1px solid #e2e8f0; background: #6366f1;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- 버튼들은 createSubModal에서 처리 -->
        </div>
    `;
}

// =============================================================================
// 구성품 행 관리 함수들
// =============================================================================

// 구성품 행 추가
function addComponentRow(componentData = null) {
    const tbody = document.getElementById('componentsTable');
    if (!tbody) return;
    
    const rowIndex = tbody.children.length;
    const row = document.createElement('tr');
    row.className = 'component-row';
    
    const data = componentData || {
        name: '',
        spec: '',
        unit: '',
        quantity: 1,
        materialPrice: 0,
        laborPrice: 0,
        expensePrice: 0
    };
    
    row.innerHTML = `
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <div style="display: flex; gap: 4px; align-items: center;">
                <input type="text" class="component-name" value="${data.name}" placeholder="품명 입력" 
                       style="flex: 1; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                <button type="button" class="material-select-btn" onclick="openMaterialSelector(this)" 
                        style="padding: 4px 6px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px; white-space: nowrap;"
                        title="자재 선택">
                    <i class="fas fa-search"></i>
                </button>
            </div>
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
            <input type="text" class="component-spec" value="${data.spec}" placeholder="싸이즈 입력"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: center;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
            <input type="text" class="component-unit" value="${data.unit}" placeholder="단위"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: center;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="component-quantity" value="${data.quantity}" min="0" step="0.01"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="material-price" value="${data.materialPrice}" min="0"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f0fdf4; color: #166534; font-weight: 600;" class="material-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="labor-price" value="${data.laborPrice}" min="0"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #eff6ff; color: #1e40af; font-weight: 600;" class="labor-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0;">
            <input type="number" class="expense-price" value="${data.expensePrice}" min="0"
                   oninput="calculateRowTotal(this)"
                   style="width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #fffbeb; color: #a16207; font-weight: 600;" class="expense-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #f4f4f5; color: #52525b; font-weight: 600;" class="total-price">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #b91c1c; font-weight: bold; font-size: 12px;" class="total-amount">0원</td>
        <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
            <button onclick="removeComponentRow(this)" class="btn btn-sm" 
                    style="padding: 2px 6px; background: #dc2626; color: white; border: none; border-radius: 3px; font-size: 11px;">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    calculateRowTotal(row.querySelector('.component-quantity'));
    calculateGrandTotal();
}

// 구성품 행 삭제
function removeComponentRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
    }
    calculateGrandTotal();
}

// 행별 계산
function calculateRowTotal(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const quantity = parseFloat(row.querySelector('.component-quantity')?.value) || 0;
    const materialPrice = parseFloat(row.querySelector('.material-price')?.value) || 0;
    const laborPrice = parseFloat(row.querySelector('.labor-price')?.value) || 0;
    const expensePrice = parseFloat(row.querySelector('.expense-price')?.value) || 0;
    
    const materialAmount = quantity * materialPrice;
    const laborAmount = quantity * laborPrice;
    const expenseAmount = quantity * expensePrice;
    const totalAmount = materialAmount + laborAmount + expenseAmount;
    
    // 각 금액 업데이트
    const materialAmountElement = row.querySelector('.material-amount');
    const laborAmountElement = row.querySelector('.labor-amount');
    const expenseAmountElement = row.querySelector('.expense-amount');
    const totalAmountElement = row.querySelector('.total-amount');
    
    if (materialAmountElement) materialAmountElement.textContent = Math.round(materialAmount).toLocaleString() + '원';
    if (laborAmountElement) laborAmountElement.textContent = Math.round(laborAmount).toLocaleString() + '원';
    if (expenseAmountElement) expenseAmountElement.textContent = Math.round(expenseAmount).toLocaleString() + '원';
    if (totalAmountElement) totalAmountElement.textContent = Math.round(totalAmount).toLocaleString() + '원';
    
    calculateGrandTotal();
}

// =============================================================================
// 전체 합계 계산 함수들
// =============================================================================

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
    
    // 단수 정리 적용
    const roundingRow = document.querySelector('.rounding-row');
    if (roundingRow) {
        const roundingUnit = parseInt(roundingRow.querySelector('.rounding-unit')?.value || 100);
        
        // 각 카테고리별 단수 정리 적용 (내림)
        const roundedMaterial = Math.floor(totalMaterial / roundingUnit) * roundingUnit;
        const roundedLabor = Math.floor(totalLabor / roundingUnit) * roundingUnit;
        const roundedExpense = Math.floor(totalExpense / roundingUnit) * roundingUnit;
        const roundedGrandTotal = Math.floor(grandTotal / roundingUnit) * roundingUnit;
        
        // 단수 정리 차액 계산
        const materialDiff = totalMaterial - roundedMaterial;
        const laborDiff = totalLabor - roundedLabor;
        const expenseDiff = totalExpense - roundedExpense;
        const totalDiff = grandTotal - roundedGrandTotal;
        
        // 단수 정리 로우에 차액 표시
        const roundingMaterialElement = roundingRow.querySelector('.rounding-material-amount');
        const roundingLaborElement = roundingRow.querySelector('.rounding-labor-amount');
        const roundingExpenseElement = roundingRow.querySelector('.rounding-expense-amount');
        const roundingTotalElement = roundingRow.querySelector('.rounding-total-amount');
        
        if (roundingMaterialElement) roundingMaterialElement.textContent = `-${Math.round(materialDiff).toLocaleString()}원`;
        if (roundingLaborElement) roundingLaborElement.textContent = `-${Math.round(laborDiff).toLocaleString()}원`;
        if (roundingExpenseElement) roundingExpenseElement.textContent = `-${Math.round(expenseDiff).toLocaleString()}원`;
        if (roundingTotalElement) roundingTotalElement.textContent = `-${Math.round(totalDiff).toLocaleString()}원`;
        
        // 최종 값을 반올림된 값으로 업데이트
        totalMaterial = roundedMaterial;
        totalLabor = roundedLabor;
        totalExpense = roundedExpense;
        grandTotal = roundedGrandTotal;
    }
    
    // 합계 표시 업데이트
    const totalMaterialElement = document.getElementById('totalMaterial');
    const totalLaborElement = document.getElementById('totalLabor');
    const totalExpenseElement = document.getElementById('totalExpense');
    const grandTotalElement = document.getElementById('grandTotal');
    
    if (totalMaterialElement) totalMaterialElement.textContent = Math.round(totalMaterial).toLocaleString() + '원';
    if (totalLaborElement) totalLaborElement.textContent = Math.round(totalLabor).toLocaleString() + '원';
    if (totalExpenseElement) totalExpenseElement.textContent = Math.round(totalExpense).toLocaleString() + '원';
    if (grandTotalElement) grandTotalElement.textContent = Math.round(grandTotal).toLocaleString() + '원';
}

// 고정 로우 계산 (백분율 기반)
function calculateFixedRows(baseMaterial, baseLabor, baseExpense) {
    // 자재로스 (자재비의 %)
    const materialLossRow = document.querySelector('.material-loss-row');
    if (materialLossRow) {
        const percentage = parseFloat(materialLossRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseMaterial * percentage / 100);
        const amountElement = materialLossRow.querySelector('.fixed-material-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
    }
    
    // 자재운반비 및 양중비 (자재비의 %)
    const transportCostRow = document.querySelector('.transport-cost-row');
    if (transportCostRow) {
        const percentage = parseFloat(transportCostRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseMaterial * percentage / 100);
        const amountElement = transportCostRow.querySelector('.fixed-material-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
    }
    
    // 자재비 이윤 (자재비의 %)
    const materialProfitRow = document.querySelector('.material-profit-row');
    if (materialProfitRow) {
        const percentage = parseFloat(materialProfitRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseMaterial * percentage / 100);
        const amountElement = materialProfitRow.querySelector('.fixed-material-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
    }
    
    // 공구손료 및 기계경비 (노무비의 %)
    const toolExpenseRow = document.querySelector('.tool-expense-row');
    if (toolExpenseRow) {
        const percentage = parseFloat(toolExpenseRow.querySelector('.fixed-quantity')?.value) || 0;
        const amount = Math.round(baseLabor * percentage / 100);
        const amountElement = toolExpenseRow.querySelector('.fixed-expense-amount');
        if (amountElement) amountElement.textContent = amount.toLocaleString() + '원';
        
        // 단가도 업데이트
        const priceElement = toolExpenseRow.querySelector('.fixed-expense-price');
        if (priceElement) priceElement.textContent = amount.toLocaleString();
    }
}

// =============================================================================
// 데이터 저장 및 로드 함수들
// =============================================================================

// 기존 구성품 로드
function loadExistingComponents() {
    if (!currentUnitPriceData.components || currentUnitPriceData.components.length === 0) {
        return;
    }
    
    currentUnitPriceData.components.forEach(component => {
        addComponentRow(component);
    });
}

// 현재 구성품 데이터 수집
function collectCurrentComponents() {
    const components = [];
    const rows = document.querySelectorAll('#componentsTable .component-row');
    
    rows.forEach(row => {
        const component = {
            name: row.querySelector('.component-name')?.value || '',
            spec: row.querySelector('.component-spec')?.value || '',
            unit: row.querySelector('.component-unit')?.value || '',
            quantity: parseFloat(row.querySelector('.component-quantity')?.value) || 0,
            materialPrice: parseFloat(row.querySelector('.material-price')?.value) || 0,
            laborPrice: parseFloat(row.querySelector('.labor-price')?.value) || 0,
            expensePrice: parseFloat(row.querySelector('.expense-price')?.value) || 0
        };
        
        if (component.name.trim()) { // 품명이 있는 것만 저장
            components.push(component);
        }
    });
    
    currentUnitPriceData.components = components;
}

// 일위대가 아이템 저장
function saveUnitPriceItem() {
    // 구성품 데이터 수집
    collectCurrentComponents();
    
    // 총 비용 계산 및 저장
    const totalMaterial = parseFloat(document.getElementById('totalMaterial')?.textContent.replace(/[,원]/g, '') || 0);
    const totalLabor = parseFloat(document.getElementById('totalLabor')?.textContent.replace(/[,원]/g, '') || 0);
    const totalExpense = parseFloat(document.getElementById('totalExpense')?.textContent.replace(/[,원]/g, '') || 0);
    const grandTotal = parseFloat(document.getElementById('grandTotal')?.textContent.replace(/[,원]/g, '') || 0);
    
    currentUnitPriceData.totalCosts = {
        material: totalMaterial,
        labor: totalLabor,
        expense: totalExpense,
        total: grandTotal
    };
    
    // 고정 비용 비율 저장
    currentUnitPriceData.fixedRates = {
        materialLoss: parseFloat(document.querySelector('.material-loss-row .fixed-quantity')?.value) || 3,
        transportCost: parseFloat(document.querySelector('.transport-cost-row .fixed-quantity')?.value) || 1.5,
        materialProfit: parseFloat(document.querySelector('.material-profit-row .fixed-quantity')?.value) || 15,
        toolExpense: parseFloat(document.querySelector('.tool-expense-row .fixed-quantity')?.value) || 2
    };
    
    // 기존 아이템 수정인지 새 아이템인지 확인
    const existingIndex = unitPriceItems.findIndex(item => item.id === currentUnitPriceData.id);
    
    if (existingIndex >= 0) {
        // 기존 아이템 수정
        unitPriceItems[existingIndex] = currentUnitPriceData;
        console.log('✅ 일위대가 아이템 수정됨:', currentUnitPriceData.id);
    } else {
        // 새 아이템 추가
        currentUnitPriceData.id = generateUnitPriceId(currentUnitPriceData.basic);
        currentUnitPriceData.createdAt = new Date().toISOString();
        unitPriceItems.push(currentUnitPriceData);
        console.log('✅ 일위대가 아이템 추가됨:', currentUnitPriceData.id);
    }
    
    // 로컬스토리지에 저장
    saveUnitPriceItems();
    
    // 모달 닫기
    closeCurrentModal();
    
    // 목록 새로고침
    setTimeout(() => {
        renderUnitPriceItemsList();
    }, 100);
    
    alert('일위대가가 성공적으로 저장되었습니다.');
}

// 일위대가 ID 생성
function generateUnitPriceId(basic) {
    const timestamp = Date.now();
    const shortId = `${basic.itemName}-${basic.spacing}-${basic.height}-${basic.size}`.replace(/[^a-zA-Z0-9가-힣\-]/g, '');
    return `${shortId}-${timestamp}`;
}

// 현재 모달 닫기 (유틸리티 함수)
function closeCurrentModal() {
    const modal = document.querySelector('.modal.show') || document.querySelector('.modal');
    if (modal && typeof closeSubModal === 'function') {
        closeSubModal(modal);
    }
}

// =============================================================================
// 일위대가 목록 관리 함수들
// =============================================================================

// 일위대가 아이템 목록 로드
function loadUnitPriceItems() {
    try {
        const saved = localStorage.getItem('kiyeno_unitPriceItems');
        if (saved) {
            unitPriceItems = JSON.parse(saved);
            console.log(`✅ 일위대가 데이터 로드됨: ${unitPriceItems.length}개 아이템`);
        } else {
            unitPriceItems = [];
        }
    } catch (error) {
        console.error('일위대가 데이터 로드 실패:', error);
        unitPriceItems = [];
    }
    return unitPriceItems;
}

// 일위대가 아이템 목록 저장
function saveUnitPriceItems() {
    try {
        localStorage.setItem('kiyeno_unitPriceItems', JSON.stringify(unitPriceItems));
        console.log('✅ 일위대가 데이터 저장됨:', unitPriceItems.length + '개 아이템');
    } catch (error) {
        console.error('일위대가 데이터 저장 실패:', error);
        alert('데이터 저장에 실패했습니다.');
    }
}

// 일위대가 아이템 목록 렌더링
function renderUnitPriceItemsList() {
    const container = document.getElementById('unitPriceItemsList');
    if (!container) return;
    
    if (unitPriceItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>등록된 일위대가가 없습니다.</p>
                <p style="font-size: 14px;">상단의 "새 일위대가 추가" 버튼을 클릭하여 시작하세요.</p>
            </div>
        `;
        return;
    }
    
    // Excel 스타일 테이블 생성
    const tableHTML = `
        <div class="unit-price-table-wrapper" style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: white;">
                <thead style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 120px; text-align: center; font-weight: 600;">아이템</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">간격</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">높이</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">SIZE</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">부위</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">공종1</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 80px; text-align: center; font-weight: 600;">공종2</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 60px; text-align: center; font-weight: 600;">단위</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">재료비</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">노무비</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 90px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">경비</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 100px; text-align: center; font-weight: 600; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">총계</th>
                        <th style="padding: 12px 8px; border: 1px solid #e2e8f0; min-width: 100px; text-align: center; font-weight: 600;">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${unitPriceItems.map(item => {
                        const basic = item.basic;
                        const costs = item.totalCosts || { material: 0, labor: 0, expense: 0, total: 0 };
                        return `
                            <tr style="border-bottom: 1px solid #f3f4f6;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 500;">${basic?.itemName || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.spacing || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.height || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.size || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.location || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.workType1 || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.workType2 || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${basic?.unit || ''}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #ecfdf5; color: #065f46; font-weight: 600;">${Math.round(costs.material).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #eff6ff; color: #1e40af; font-weight: 600;">${Math.round(costs.labor).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fefbeb; color: #92400e; font-weight: 600;">${Math.round(costs.expense).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; background: #fef2f2; color: #b91c1c; font-weight: 600;">${Math.round(costs.total).toLocaleString()}원</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                                    <button onclick="editUnitPriceItem('${item.id}')" class="btn btn-sm" 
                                            style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; margin-right: 4px; font-size: 11px;">
                                        <i class="fas fa-edit"></i> 수정
                                    </button>
                                    <button onclick="deleteUnitPriceItem('${item.id}')" class="btn btn-sm"
                                            style="padding: 4px 8px; background: #dc2626; color: white; border: none; border-radius: 4px; font-size: 11px;">
                                        <i class="fas fa-trash"></i> 삭제
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
    
    console.log('✏️ 일위대가 아이템 수정:', id);
    
    // 현재 모달 닫기
    closeCurrentModal();
    
    // 수정 모달 열기
    setTimeout(() => {
        openUnitPriceBasicModal(item);
    }, 300);
}

// 일위대가 아이템 삭제
function deleteUnitPriceItem(id) {
    const item = unitPriceItems.find(item => item.id === id);
    if (!item) {
        alert('해당 아이템을 찾을 수 없습니다.');
        return;
    }
    
    const itemName = item.basic?.itemName || 'Unknown';
    if (confirm(`"${itemName}" 일위대가를 삭제하시겠습니까?`)) {
        unitPriceItems = unitPriceItems.filter(item => item.id !== id);
        saveUnitPriceItems();
        renderUnitPriceItemsList();
        console.log('✅ 일위대가 아이템 삭제됨:', id);
    }
}

// =============================================================================
// 데이터 내보내기/가져오기 함수들
// =============================================================================

// 일위대가 데이터 내보내기
function exportUnitPriceData() {
    if (unitPriceItems.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        itemsCount: unitPriceItems.length,
        items: unitPriceItems
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `kiyeno_unitprice_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    console.log('✅ 일위대가 데이터 내보내기 완료');
}

// 일위대가 데이터 가져오기
function importUnitPriceData() {
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
                if (!importData.items || !Array.isArray(importData.items)) {
                    alert('올바르지 않은 일위대가 데이터 형식입니다.');
                    return;
                }
                
                // 유효한 아이템만 필터링
                const validItems = importData.items.filter(item => 
                    item.basic && item.basic.itemName && item.totalCosts
                );
                
                if (validItems.length === 0) {
                    alert('가져올 수 있는 유효한 일위대가 데이터가 없습니다.');
                    return;
                }
                
                // 기존 데이터와 병합 (중복 ID는 새 데이터로 덮어쓰기)
                const confirmMessage = `${validItems.length}개의 일위대가 데이터를 가져오시겠습니까?\n(기존 데이터와 ID가 같은 경우 덮어쓰기됩니다)`;
                
                if (confirm(confirmMessage)) {
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
                    console.log('✅ 일위대가 데이터 가져오기 완료');
                }
            } catch (error) {
                console.error('일위대가 데이터 가져오기 실패:', error);
                alert('파일을 읽는 중 오류가 발생했습니다.');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// =============================================================================
// 전역 함수 등록 (unitPriceManager.js)
// =============================================================================

// 일위대가 관리 메인 함수들
window.openUnitPriceManagement = openUnitPriceManagement;
window.openUnitPriceBasicModal = openUnitPriceBasicModal;
window.proceedToDetailInput = proceedToDetailInput;
window.openUnitPriceDetailModal = openUnitPriceDetailModal;

// 구성품 관리 함수들
window.addComponentRow = addComponentRow;
window.removeComponentRow = removeComponentRow;
window.calculateRowTotal = calculateRowTotal;
window.calculateGrandTotal = calculateGrandTotal;

// 데이터 관리 함수들
window.saveUnitPriceItem = saveUnitPriceItem;
window.loadUnitPriceItems = loadUnitPriceItems;
window.saveUnitPriceItems = saveUnitPriceItems;
window.renderUnitPriceItemsList = renderUnitPriceItemsList;
window.editUnitPriceItem = editUnitPriceItem;
window.deleteUnitPriceItem = deleteUnitPriceItem;
window.exportUnitPriceData = exportUnitPriceData;
window.importUnitPriceData = importUnitPriceData;

// =============================================================================
// CSS 스타일 추가 (원본에서 분리된 스타일)
// =============================================================================

// 일위대가 관리 관련 CSS 스타일 추가
const unitPriceStyles = document.createElement('style');
unitPriceStyles.textContent = `
/* 일위대가 관리 기본 폼 스타일 */
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
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
}

.form-group input,
.form-group select,
.form-group textarea {
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s ease;
    background: white;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group textarea {
    resize: vertical;
    min-height: 100px;
}

.form-grid.full-width {
    grid-template-columns: 1fr;
}

/* 일위대가 상세 입력 폼 스타일 */
.unit-price-detail-form {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
}

.detail-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 25px;
    border: 1px solid #e9ecef;
}

.detail-section h3 {
    margin: 0 0 20px 0;
    color: #495057;
    font-size: 18px;
    font-weight: 600;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
}

.components-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.components-table th,
.components-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}

.components-table th {
    background: #007bff;
    color: white;
    font-weight: 600;
    font-size: 14px;
}

.components-table td input,
.components-table td select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    font-size: 14px;
}

.components-table td input:focus,
.components-table td select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.components-table .quantity-cell,
.components-table .unit-price-cell,
.components-table .total-cell {
    width: 120px;
    text-align: right;
}

.components-table .actions-cell {
    width: 80px;
    text-align: center;
}

.components-table .total-cell {
    font-weight: 600;
    color: #007bff;
}

/* 일위대가 관리 버튼 스타일 */
.btn-add-component {
    background: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin: 10px 0;
    transition: background-color 0.3s ease;
}

.btn-add-component:hover {
    background: #218838;
}

.btn-remove-component {
    background: #dc3545;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.3s ease;
}

.btn-remove-component:hover {
    background: #c82333;
}

/* 일위대가 총계 표시 스타일 */
.grand-total-section {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    margin-top: 25px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.grand-total-section h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
    font-weight: 600;
}

.grand-total-amount {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
}

/* 일위대가 목록 테이블 스타일 */
.unit-price-list-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-top: 20px;
}

.unit-price-list-table th,
.unit-price-list-table td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #e9ecef;
}

.unit-price-list-table th {
    background: #f8f9fa;
    color: #495057;
    font-weight: 600;
    font-size: 14px;
}

.unit-price-list-table tr:hover {
    background: #f8f9fa;
}

.unit-price-list-table .actions-column {
    width: 120px;
    text-align: center;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
    .form-grid {
        grid-template-columns: 1fr;
        gap: 15px;
    }
    
    .components-table {
        font-size: 12px;
    }
    
    .components-table th,
    .components-table td {
        padding: 8px;
    }
    
    .grand-total-section {
        padding: 15px;
    }
    
    .grand-total-amount {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    .unit-price-basic-form,
    .unit-price-detail-form {
        padding: 10px;
    }
    
    .detail-section {
        padding: 15px;
        margin-bottom: 15px;
    }
    
    .components-table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
    }
}
`;

document.head.appendChild(unitPriceStyles);

// =============================================================================
// 자재 선택 기능
// =============================================================================

// 현재 선택 중인 행을 저장하는 변수
let currentMaterialSelectRow = null;

// 자재 선택 모달 열기
function openMaterialSelector(button) {
    console.log('🔍 자재 선택 모달 열기');
    
    // 현재 행 저장 (버튼의 부모 요소들을 통해 tr 찾기)
    currentMaterialSelectRow = button.closest('tr');
    
    if (!currentMaterialSelectRow) {
        console.error('❌ 구성품 행을 찾을 수 없습니다.');
        alert('구성품 행을 찾을 수 없습니다.');
        return;
    }
    
    // 자재 선택 모달 창 생성
    createMaterialSelectModal();
}

// 자재 선택 모달 창 생성
function createMaterialSelectModal() {
    console.log('🏗️ 자재 선택 모달 창 생성');
    
    const modalHTML = `
        <div class="material-select-modal" style="
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); z-index: 99999; display: flex; 
            align-items: center; justify-content: center;
        ">
            <div class="material-select-content" style="
                background: white; border-radius: 12px; width: 90%; max-width: 1000px; 
                max-height: 80vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            ">
                <!-- 헤더 -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">
                        <i class="fas fa-search" style="margin-right: 8px;"></i>
                        자재 선택
                    </h3>
                    <button onclick="closeMaterialSelectModal()" style="
                        background: none; border: none; color: white; font-size: 24px; 
                        cursor: pointer; padding: 0; width: 30px; height: 30px; 
                        display: flex; align-items: center; justify-content: center;
                    ">&times;</button>
                </div>
                
                <!-- 필터 영역 -->
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px;">검색어</label>
                            <input type="text" id="materialSearchInput" placeholder="품명, 싸이즈, 단위로 검색" 
                                   oninput="filterMaterials()" style="
                                width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; 
                                border-radius: 6px; font-size: 14px;
                            ">
                        </div>
                        <div style="min-width: 150px;">
                            <label style="display: block; margin-bottom: 4px; font-weight: 500; font-size: 14px;">카테고리</label>
                            <select id="materialCategoryFilter" onchange="filterMaterials()" style="
                                width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; 
                                border-radius: 6px; font-size: 14px;
                            ">
                                <option value="">전체</option>
                                <option value="경량자재">경량자재</option>
                                <option value="석고보드">석고보드</option>
                            </select>
                        </div>
                        <button onclick="clearMaterialFilters()" style="
                            padding: 8px 16px; background: #6b7280; color: white; border: none; 
                            border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 20px;
                        ">초기화</button>
                    </div>
                </div>
                
                <!-- 자재 목록 -->
                <div id="materialListContainer" style="padding: 20px; max-height: 400px; overflow-y: auto;">
                    자재 데이터를 로드하는 중...
                </div>
                
                <!-- 하단 버튼 -->
                <div style="padding: 20px; border-top: 1px solid #e2e8f0; text-align: right;">
                    <button onclick="closeMaterialSelectModal()" style="
                        padding: 10px 20px; background: #6b7280; color: white; border: none; 
                        border-radius: 6px; cursor: pointer; margin-right: 10px;
                    ">취소</button>
                </div>
            </div>
        </div>
    `;
    
    // 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 자재 데이터 로드
    loadMaterialsForSelection();
}

// 자재 선택 모달 닫기
function closeMaterialSelectModal() {
    const modal = document.querySelector('.material-select-modal');
    if (modal) {
        modal.remove();
    }
    currentMaterialSelectRow = null;
}

// 자재 데이터 로드 (기본 데이터 + IndexedDB 데이터)
async function loadMaterialsForSelection() {
    console.log('📦 자재 선택용 데이터 로드 시작');
    
    try {
        let allMaterials = [];
        
        if (window.priceDatabase) {
            console.log('🔍 priceDatabase 인스턴스에서 데이터 로드');
            
            // 1순위: IndexedDB 사용자 데이터 확인
            const lightweightCache = window.priceDatabase.lightweightItemsCache || [];
            const gypsumCache = window.priceDatabase.gypsumItemsCache || [];
            
            console.log(`📊 캐시된 데이터 확인 - 경량자재: ${lightweightCache.length}개, 석고보드: ${gypsumCache.length}개`);
            
            // IndexedDB에 사용자 데이터가 있는 경우 (캐시에 데이터가 있음)
            if (lightweightCache.length > 0 || gypsumCache.length > 0) {
                console.log('📦 IndexedDB 사용자 데이터 사용');
                
                // 경량자재 사용자 데이터
                if (lightweightCache.length > 0) {
                    const lightweightMaterials = lightweightCache.map(item => ({
                        품명: item.name,
                        규격: item.size || item.spec,
                        단위: item.unit,
                        재료비단가: item.materialPrice || 0,
                        노무비단가: item.laborPrice || 0,
                        category: '경량자재',
                        source: 'indexeddb',
                        originalData: item
                    }));
                    allMaterials.push(...lightweightMaterials);
                }
                
                // 석고보드 사용자 데이터
                if (gypsumCache.length > 0) {
                    const gypsumBoards = gypsumCache.map(item => ({
                        품명: item.name,
                        규격: item.size || item.spec,
                        단위: item.unit,
                        재료비단가: item.재료비단가 || item.materialPrice || 0,
                        노무비단가: item.노무비단가 || item.laborPrice || 0,
                        category: '석고보드',
                        source: 'indexeddb',
                        originalData: item
                    }));
                    allMaterials.push(...gypsumBoards);
                }
            } else {
                // 2순위: IndexedDB가 비어있으면 하드코딩된 기본 데이터 사용
                console.log('📦 하드코딩된 기본 데이터 사용 (IndexedDB 비어있음)');
                
                // 경량자재 기본 데이터 가져오기
                const lightweightData = window.priceDatabase.getLightweightComponents();
                if (lightweightData && lightweightData.items) {
                    console.log(`📦 경량자재 기본 데이터 ${lightweightData.items.length}개 로드`);
                    const lightweightMaterials = lightweightData.items.map(item => ({
                        품명: item.name,
                        규격: item.size || item.spec,
                        단위: item.unit,
                        재료비단가: item.materialPrice || 0,
                        노무비단가: item.laborPrice || 0,
                        category: '경량자재',
                        source: 'default',
                        originalData: item
                    }));
                    allMaterials.push(...lightweightMaterials);
                }
                
                // 석고보드 기본 데이터 가져오기
                const gypsumData = window.priceDatabase.getGypsumBoards();
                if (gypsumData && gypsumData.items) {
                    console.log(`📦 석고보드 기본 데이터 ${gypsumData.items.length}개 로드`);
                    const gypsumBoards = gypsumData.items.map(item => ({
                        품명: item.name,
                        규격: item.size || item.spec,
                        단위: item.unit,
                        재료비단가: item.재료비단가 || item.materialPrice || 0,
                        노무비단가: item.노무비단가 || item.laborPrice || 0,
                        category: '석고보드',
                        source: 'default',
                        originalData: item
                    }));
                    allMaterials.push(...gypsumBoards);
                }
            }
        } else {
            console.warn('⚠️ priceDatabase 인스턴스를 찾을 수 없습니다.');
        }
        
        console.log(`📦 로드된 자재 수: ${allMaterials.length}개`);
        
        if (allMaterials.length === 0) {
            throw new Error('자재 데이터를 찾을 수 없습니다.');
        }
        
        // 자재 목록 렌더링
        renderMaterialsList(allMaterials);
        
        // 전역 변수에 저장 (필터링용)
        window.currentMaterialsData = allMaterials;
        
    } catch (error) {
        console.error('❌ 자재 데이터 로드 실패:', error);
        
        const container = document.getElementById('materialListContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>자재 데이터를 로드할 수 없습니다.</p>
                    <p style="font-size: 14px; color: #6b7280;">priceDatabase 인스턴스를 확인해주세요.</p>
                    <p style="font-size: 12px; color: #9ca3af;">오류: ${error.message}</p>
                </div>
            `;
        }
    }
}

// 자재 목록 렌더링
function renderMaterialsList(materials) {
    const container = document.getElementById('materialListContainer');
    if (!container) return;
    
    if (materials.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>조건에 맞는 자재가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    const tableHTML = `
        <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead style="background: #f9fafb; position: sticky; top: 0;">
                    <tr>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-weight: 600;">품명</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">싸이즈</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">단위</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">재료비 단가</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">노무비 단가</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">카테고리</th>
                        <th style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">선택</th>
                    </tr>
                </thead>
                <tbody>
                    ${materials.map((material, index) => `
                        <tr style="border-bottom: 1px solid #f3f4f6;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; font-weight: 500;">${material.품명 || material.name || ''}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${material.규격 || material.spec || ''}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">${material.단위 || material.unit || ''}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">${(material.재료비단가 || material.materialPrice || 0).toLocaleString()}원</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: right;">${(material.노무비단가 || material.laborPrice || 0).toLocaleString()}원</td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                                <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; background: ${material.category === '경량자재' ? '#dbeafe' : '#fef3c7'}; color: ${material.category === '경량자재' ? '#1e40af' : '#92400e'};">
                                    ${material.category}
                                </span>
                            </td>
                            <td style="padding: 8px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                                <button onclick="selectUnitPriceMaterial(${index})" style="
                                    padding: 4px 8px; background: #10b981; color: white; border: none; 
                                    border-radius: 4px; cursor: pointer; font-size: 11px;
                                " title="이 자재 선택">
                                    <i class="fas fa-check"></i> 선택
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// 자재 필터링
function filterMaterials() {
    if (!window.currentMaterialsData) return;
    
    const searchText = document.getElementById('materialSearchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('materialCategoryFilter')?.value || '';
    
    const filteredMaterials = window.currentMaterialsData.filter(material => {
        // 검색어 필터
        const searchMatch = !searchText || 
            (material.품명 || material.name || '').toLowerCase().includes(searchText) ||
            (material.규격 || material.spec || '').toLowerCase().includes(searchText) ||
            (material.단위 || material.unit || '').toLowerCase().includes(searchText);
        
        // 카테고리 필터
        const categoryMatch = !categoryFilter || material.category === categoryFilter;
        
        return searchMatch && categoryMatch;
    });
    
    renderMaterialsList(filteredMaterials);
}

// 자재 필터 초기화
function clearMaterialFilters() {
    const searchInput = document.getElementById('materialSearchInput');
    const categoryFilter = document.getElementById('materialCategoryFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    
    // 전체 자재 목록 다시 표시
    if (window.currentMaterialsData) {
        renderMaterialsList(window.currentMaterialsData);
    }
}

// 자재 선택 처리 (일위대가용)
function selectUnitPriceMaterial(materialIndex) {
    console.log('🔍 자재 선택 시작 - 인덱스:', materialIndex);
    console.log('🔍 currentMaterialsData:', window.currentMaterialsData?.length || 0, '개');
    console.log('🔍 currentMaterialSelectRow:', currentMaterialSelectRow);
    
    if (!window.currentMaterialsData || !currentMaterialSelectRow) {
        console.error('❌ 자재 데이터 또는 선택 행이 없습니다.');
        console.error('  - 자재 데이터:', !!window.currentMaterialsData);
        console.error('  - 선택 행:', !!currentMaterialSelectRow);
        alert('자재 데이터 또는 구성품 행을 찾을 수 없습니다.');
        return;
    }
    
    const selectedMaterial = window.currentMaterialsData[materialIndex];
    if (!selectedMaterial) {
        console.error('❌ 선택된 자재를 찾을 수 없습니다. 인덱스:', materialIndex);
        console.error('  - 전체 자재 수:', window.currentMaterialsData.length);
        alert('선택된 자재를 찾을 수 없습니다.');
        return;
    }
    
    console.log('✅ 자재 선택됨:', selectedMaterial);
    
    // 구성품 행에 자재 데이터 입력
    fillComponentRowWithMaterial(currentMaterialSelectRow, selectedMaterial);
    
    // 모달 닫기
    closeMaterialSelectModal();
}

// 선택된 자재 데이터로 구성품 행 채우기
function fillComponentRowWithMaterial(row, material) {
    console.log('🔧 구성품 행 데이터 입력 시작');
    console.log('  - 행:', row);
    console.log('  - 자재:', material);
    
    if (!row || !material) {
        console.error('❌ 행 또는 자재 데이터가 없습니다.');
        return;
    }
    
    try {
        // 각 필드별로 데이터 입력
        const nameInput = row.querySelector('.component-name');
        const specInput = row.querySelector('.component-spec');
        const unitInput = row.querySelector('.component-unit');
        const materialPriceInput = row.querySelector('.material-price');
        const laborPriceInput = row.querySelector('.labor-price');
        
        console.log('🔧 DOM 요소 확인:');
        console.log('  - nameInput:', !!nameInput);
        console.log('  - specInput:', !!specInput);
        console.log('  - unitInput:', !!unitInput);
        console.log('  - materialPriceInput:', !!materialPriceInput);
        console.log('  - laborPriceInput:', !!laborPriceInput);
        
        if (nameInput) nameInput.value = material.품명 || material.name || '';
        if (specInput) specInput.value = material.규격 || material.size || material.spec || '';
        if (unitInput) unitInput.value = material.단위 || material.unit || '';
        if (materialPriceInput) materialPriceInput.value = material.재료비단가 || material.materialPrice || 0;
        if (laborPriceInput) laborPriceInput.value = material.노무비단가 || material.laborPrice || 0;
        
        console.log('🔧 입력된 값들:');
        console.log('  - 품명:', material.품명 || material.name || '');
        console.log('  - 싸이즈:', material.규격 || material.size || material.spec || '');
        console.log('  - 단위:', material.단위 || material.unit || '');
        console.log('  - 재료비단가:', material.재료비단가 || material.materialPrice || 0);
        console.log('  - 노무비단가:', material.노무비단가 || material.laborPrice || 0);
        
        // 행 총계 다시 계산
        const quantityInput = row.querySelector('.component-quantity');
        if (quantityInput) {
            calculateRowTotal(quantityInput);
        }
        
        console.log('✅ 구성품 행에 자재 데이터 입력 완료');
        
    } catch (error) {
        console.error('❌ 자재 데이터 입력 실패:', error);
        alert('자재 데이터를 입력하는 중 오류가 발생했습니다.');
    }
}

// 전역 함수 등록
window.openMaterialSelector = openMaterialSelector;
window.closeMaterialSelectModal = closeMaterialSelectModal;
window.filterMaterials = filterMaterials;
window.clearMaterialFilters = clearMaterialFilters;
window.selectUnitPriceMaterial = selectUnitPriceMaterial;

console.log('✅ unitPriceManager.js 로드 완료 - 일위대가 관리 전담 모듈 및 자재 선택 기능 (CSS 스타일 포함)');