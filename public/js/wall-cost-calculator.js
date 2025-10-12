/**
 * 벽체 계산 결과 하단 슬라이드 패널 관리
 */

// 전역 변수
let calculationResults = [];
window.calculationResults = calculationResults;  // 전역 노출
let isResultsPanelOpen = false;
let currentActiveTab = 'comparison';

/**
 * 벽체 비용 계산 시작
 */
window.calculateWallCosts = async function() {
    try {
        console.log('🔢 벽체 비용 계산 시작');
        
        // 1. 선택된 벽체 확인
        const selectedWalls = getSelectedRevitWalls();
        if (!selectedWalls || selectedWalls.length === 0) {
            alert('계산할 벽체를 선택해주세요.');
            return;
        }
        
        console.log(`📊 선택된 벽체: ${selectedWalls.length}개`);
        
        // 2. 로딩 표시
        showCalculationProgress(selectedWalls.length);
        
        // 3. 벽체별 계산 수행
        calculationResults = [];
        window.calculationResults = calculationResults;  // 전역 동기화
        for (let i = 0; i < selectedWalls.length; i++) {
            const wall = selectedWalls[i];
            const result = await calculateSingleWallCost(wall, i + 1);
            if (result) {
                calculationResults.push(result);
            }
            updateCalculationProgress(i + 1, selectedWalls.length);
        }

        // 계산 완료 후 전역 변수 업데이트
        window.calculationResults = calculationResults;
        
        // 4. 계산 완료 처리
        hideCalculationProgress();
        
        if (calculationResults.length === 0) {
            alert('계산할 수 있는 벽체가 없습니다. 벽체 타입 매칭을 확인해주세요.');
            return;
        }
        
        // 5. 결과 패널 표시
        showResultsPanel();
        renderCalculationResults();
        
        console.log(`✅ 벽체 비용 계산 완료: ${calculationResults.length}개`);
        
    } catch (error) {
        console.error('❌ 벽체 비용 계산 실패:', error);
        hideCalculationProgress();
        alert('벽체 비용 계산 중 오류가 발생했습니다: ' + error.message);
    }
};

/**
 * 선택된 Revit 벽체 데이터 가져오기
 */
function getSelectedRevitWalls() {
    console.log('🔍 선택된 벽체 데이터 가져오기 시작');
    
    const checkboxes = document.querySelectorAll('.revit-row-checkbox:checked');
    console.log('📋 체크된 체크박스 개수:', checkboxes.length);
    
    const selectedWalls = [];
    
    checkboxes.forEach((checkbox, i) => {
        const row = checkbox.closest('tr');
        const index = parseInt(row.getAttribute('data-wall-index'));
        
        console.log(`📝 체크박스 ${i}: data-wall-index=${index}`);
        
        // window.filteredRevitWallData 또는 전역 filteredRevitWallData 확인
        const dataSource = window.filteredRevitWallData || 
                          (typeof filteredRevitWallData !== 'undefined' ? filteredRevitWallData : null);
        
        console.log('📊 데이터 소스 상태:', {
            'window.filteredRevitWallData': window.filteredRevitWallData?.length || 'undefined',
            'global filteredRevitWallData': typeof filteredRevitWallData !== 'undefined' ? filteredRevitWallData.length : 'undefined'
        });
        
        if (index >= 0 && dataSource && dataSource[index]) {
            selectedWalls.push(dataSource[index]);
            console.log(`✅ 벽체 추가: ${dataSource[index].Name}`);
        } else {
            console.warn(`❌ 벽체 데이터를 찾을 수 없음: index=${index}`);
        }
    });
    
    console.log(`📋 최종 선택된 벽체: ${selectedWalls.length}개`);
    return selectedWalls;
}

/**
 * 단일 벽체 비용 계산
 */
async function calculateSingleWallCost(wall, sequence) {
    try {
        console.log(`🧮 벽체 계산 중 (${sequence}): ${wall.Name}`);
        
        // 1. 벽체 타입 매칭
        const wallTypeMatch = await findMatchingWallType(wall.Name);
        if (!wallTypeMatch) {
            console.warn(`⚠️ 매칭되는 벽체 타입을 찾을 수 없음: ${wall.Name}`);
            return null;
        }
        
        // 2. 레이어별 자재 정보 추출
        const layerPricing = await extractLayerPricing(wallTypeMatch);
        
        // 3. 면적 기반 총 금액 계산
        const area = parseFloat(wall.Area) || 0;
        const totalCost = calculateTotalCost(layerPricing, area);
        
        return {
            // Revit 정보
            elementId: wall.Id,
            wallName: wall.Name,
            roomName: wall.RoomName || '미지정',
            area: area,
            height: parseFloat(wall.Height) || 0,
            length: parseFloat(wall.Length) || 0,
            thickness: parseFloat(wall.Thickness) || 0,
            level: wall.Level || '',

            // 매칭 정보
            wallType: wallTypeMatch,
            layerPricing: layerPricing,

            // 계산 결과
            materialCost: totalCost.materialCost,          // 총 자재비
            laborCost: totalCost.laborCost,                // 총 노무비
            totalCost: totalCost.totalCost,                // 총계
            materialUnitPrice: totalCost.materialUnitPrice, // M2당 자재비 단가
            laborUnitPrice: totalCost.laborUnitPrice,       // M2당 노무비 단가
            unitPrice: totalCost.unitPrice,                 // M2당 총 단가

            // 메타데이터
            calculatedAt: new Date().toISOString(),
            sequence: sequence
        };
        
    } catch (error) {
        console.error(`❌ 벽체 계산 실패: ${wall.Name}`, error);
        return null;
    }
}

/**
 * 벽체 타입 매칭 찾기
 */
async function findMatchingWallType(wallTypeName) {
    try {
        console.log('🔍 벽체 타입 매칭 검색 시작:', wallTypeName);
        
        // 주검색: 벽체 타입 관리에서 검색 (window.revitWallTypes)
        console.log('🔄 주검색: window.revitWallTypes');
        if (window.revitWallTypes && Array.isArray(window.revitWallTypes) && window.revitWallTypes.length > 0) {
            console.log('📋 revitWallTypes:', window.revitWallTypes.length, '개');
            window.revitWallTypes.forEach(wt => {
                console.log(`  📝 벽체 타입: "${wt.wallType}" (찾는값: "${wallTypeName}")`);
            });
            
            const match = window.revitWallTypes.find(wt => wt.wallType === wallTypeName);
            if (match) {
                console.log('✅ 벽체 타입 매칭 성공:', match.wallType);
                return match;
            } else {
                console.log('❌ revitWallTypes에서 매칭 실패');
            }
        } else {
            console.log('❌ revitWallTypes 사용 불가능 또는 비어있음 - 데이터 로드 시도');
            
            // 벽체 타입 데이터가 없으면 즉시 로드 시도
            if (typeof window.loadRevitWallTypes === 'function') {
                console.log('🔄 벽체 타입 데이터 재로드 시도...');
                window.loadRevitWallTypes();
                
                // 재로드 후 다시 확인
                if (window.revitWallTypes && window.revitWallTypes.length > 0) {
                    console.log('✅ 재로드 성공:', window.revitWallTypes.length, '개');
                    const match = window.revitWallTypes.find(wt => wt.wallType === wallTypeName);
                    if (match) {
                        console.log('✅ 재로드 후 벽체 타입 매칭 성공:', match.wallType);
                        return match;
                    }
                } else {
                    console.log('❌ 재로드 후에도 데이터 없음');
                }
            } else {
                console.log('❌ loadRevitWallTypes 함수 없음');
            }
        }
        
        console.log('❌ 벽체 타입 검색 실패 - 벽체 타입 관리에서 해당 타입을 확인해주세요');
        return null;
        
    } catch (error) {
        console.error('벽체 타입 매칭 검색 실패:', error);
        return null;
    }
}

/**
 * 레이어별 자재 단가 정보 추출
 */
async function extractLayerPricing(wallType) {
    console.log('🧱 레이어별 자재 단가 추출 시작:', wallType.wallType);
    
    const layers = [
        'layer3_1', 'layer2_1', 'layer1_1', 
        'column1', 'infill', 
        'layer1_2', 'layer2_2', 'layer3_2',
        'column2', 'channel', 'runner'
    ];
    
    const layerPricing = {};
    let foundMaterialsCount = 0;
    
    for (const layerKey of layers) {
        const materialName = wallType[layerKey];
        console.log(`🔍 레이어 ${layerKey}: "${materialName}"`);
        
        if (materialName && materialName.trim() !== '') {
            // 일위대가 DB에서 해당 자재의 단가 정보 검색
            const materialData = await findMaterialInUnitPriceDB(materialName);
            
            layerPricing[layerKey] = {
                materialName: materialName,
                materialPrice: materialData?.materialPrice || 0,
                laborPrice: materialData?.laborPrice || 0,
                workType1: materialData?.workType1 || '',
                workType2: materialData?.workType2 || '',
                unit: materialData?.unit || 'M2',
                found: !!materialData
            };
            
            if (materialData) {
                foundMaterialsCount++;
                console.log(`  ✅ 자재 데이터 찾음: 재료비 ${materialData.materialPrice}, 노무비 ${materialData.laborPrice}`);
            } else {
                console.log(`  ❌ 자재 데이터 없음: "${materialName}"`);
            }
        } else {
            console.log(`  ⬜ 빈 레이어: ${layerKey}`);
        }
    }
    
    console.log(`📊 레이어 자재 추출 완료: 총 ${foundMaterialsCount}개 자재 발견`);
    return layerPricing;
}

/**
 * 일위대가 DB에서 자재 검색
 */
async function findMaterialInUnitPriceDB(materialName) {
    try {
        console.log(`🔍 자재 검색 시작: "${materialName}"`);
        
        // unitPrice_ 접두사 제거 (벽체 타입에는 unitPrice_가 붙어있지만 실제 DB에는 없음)
        let searchName = materialName;
        if (materialName.startsWith('unitPrice_')) {
            searchName = materialName.replace('unitPrice_', '');
            console.log(`🔧 접두사 제거: "${materialName}" → "${searchName}"`);
        }
        
        // 일위대가 DB에서 ID로 아이템 검색 (완전 변경된 로직)
        if (window.unitPriceDB) {
            console.log('📊 일위대가 DB 검색 중...');
            console.log('🔧 unitPriceDB 객체 상태:', typeof window.unitPriceDB);
            const unitPriceItems = await window.unitPriceDB.getAllUnitPrices();
            console.log(`📋 일위대가 아이템 수: ${unitPriceItems.length}개`);
            
            // ID로 일위대가 아이템 직접 검색
            const foundItem = unitPriceItems.find(item => 
                item.id && item.id.trim() === searchName.trim()
            );
            
            if (foundItem) {
                console.log(`✅ 일위대가 아이템 발견: ${foundItem.id}`);
                console.log('🔍 아이템 기본정보:', foundItem.basic);
                console.log('💰 총 비용:', foundItem.totalCosts);
                
                // 일위대가 아이템 전체의 단가 정보 반환 (M2 기준)
                return {
                    name: foundItem.basic?.itemName || foundItem.id,
                    spec: foundItem.basic?.size || '',
                    materialPrice: parseFloat(foundItem.totalCosts?.material) || 0,
                    laborPrice: parseFloat(foundItem.totalCosts?.labor) || 0,
                    workType1: foundItem.basic?.workType1 || '',
                    workType2: foundItem.basic?.workType2 || '',
                    unit: foundItem.basic?.unit || 'M2',
                    source: 'unitPriceDB',
                    itemId: foundItem.id,
                    totalCosts: foundItem.totalCosts
                };
            } else {
                console.log('❌ 일위대가 DB에서 해당 ID를 찾지 못함:', searchName);
                
                // 디버깅: 유사한 ID들 찾기
                const similarIds = unitPriceItems
                    .map(item => item.id)
                    .filter(id => id && (id.includes('석고보드') || id.includes('STUD')))
                    .slice(0, 5);
                
                if (similarIds.length > 0) {
                    console.log('🔍 유사한 ID들 (샘플):', similarIds);
                }
            }
        } else {
            console.log('❌ unitPriceDB 사용 불가능');
        }
        
        // priceDatabase에서도 검색 (fallback)
        console.log('🔄 기본 자재 DB 검색 중...');
        if (window.priceDB) {
            const allMaterials = await window.priceDB.getAllMaterials();
            console.log(`📋 기본 자재 수: ${allMaterials.length}개`);
            
            const material = allMaterials.find(m => 
                m.name && m.name.trim() === searchName.trim()
            );
            
            if (material) {
                console.log(`✅ 기본 자재 DB에서 발견: ${material.name}, 재료비: ${material.materialPrice}, 노무비: ${material.laborPrice}`);
                return {
                    name: material.name,
                    spec: material.size || '',
                    materialPrice: parseFloat(material.materialPrice) || 0,
                    laborPrice: parseFloat(material.laborPrice) || 0,
                    workType1: material.workType1 || '',
                    workType2: material.workType2 || '',
                    unit: material.unit || 'M2',
                    source: 'priceDatabase'
                };
            } else {
                console.log('❌ 기본 자재 DB에서도 찾지 못함');
            }
        } else {
            console.log('❌ priceDB 사용 불가능');
        }
        
        return null;
        
    } catch (error) {
        console.error(`자재 검색 실패: ${materialName}`, error);
        return null;
    }
}

/**
 * 면적 기반 총 금액 계산
 */
function calculateTotalCost(layerPricing, area) {
    console.log(`💰 총 금액 계산 시작: 면적 ${area}m²`);

    // 1단계: M2당 단가 합산 (레이어별 단가를 모두 더함)
    let materialUnitPrice = 0;  // M2당 자재비 단가
    let laborUnitPrice = 0;     // M2당 노무비 단가
    let layerCount = 0;

    Object.entries(layerPricing).forEach(([layerKey, layer]) => {
        const layerMaterialPrice = layer.materialPrice || 0;
        const layerLaborPrice = layer.laborPrice || 0;

        console.log(`  ${layerKey}: ${layer.materialName} - 자재비단가 ${layerMaterialPrice}, 노무비단가 ${layerLaborPrice}`);

        materialUnitPrice += layerMaterialPrice;
        laborUnitPrice += layerLaborPrice;
        layerCount++;
    });

    console.log(`📊 M2당 단가 합계 - 자재비: ${materialUnitPrice}원/M2, 노무비: ${laborUnitPrice}원/M2`);

    // 2단계: 면적 곱하기 (총 금액 계산)
    const totalMaterialCost = Math.round(materialUnitPrice * area);
    const totalLaborCost = Math.round(laborUnitPrice * area);
    const totalCost = totalMaterialCost + totalLaborCost;
    const unitPrice = materialUnitPrice + laborUnitPrice;  // M2당 총 단가

    const result = {
        materialCost: totalMaterialCost,      // 총 자재비
        laborCost: totalLaborCost,            // 총 노무비
        totalCost: totalCost,                 // 총계
        materialUnitPrice: materialUnitPrice, // M2당 자재비 단가
        laborUnitPrice: laborUnitPrice,       // M2당 노무비 단가
        unitPrice: unitPrice,                 // M2당 총 단가
        area: area
    };

    console.log(`💰 총 금액 계산 완료: ${layerCount}개 레이어`);
    console.log(`  - M2당 단가: 자재비 ${materialUnitPrice}, 노무비 ${laborUnitPrice}, 총 ${unitPrice}`);
    console.log(`  - 총 금액: 자재비 ${totalMaterialCost}, 노무비 ${totalLaborCost}, 총계 ${totalCost}`);

    return result;
}

/**
 * 계산 진행 상황 표시
 */
function showCalculationProgress(totalCount) {
    // 간단한 진행 표시 (나중에 모달로 개선 가능)
    const button = document.querySelector('button[onclick="calculateWallCosts()"]');
    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 계산 중...';
        button.disabled = true;
    }
}

function updateCalculationProgress(current, total) {
    const button = document.querySelector('button[onclick="calculateWallCosts()"]');
    if (button) {
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 계산 중... (${current}/${total})`;
    }
}

function hideCalculationProgress() {
    const button = document.querySelector('button[onclick="calculateWallCosts()"]');
    if (button) {
        button.innerHTML = '<i class="fas fa-calculator"></i> 계산하기';
        button.disabled = false;
    }
}

/**
 * 결과 패널 표시
 */
function showResultsPanel() {
    const panel = document.getElementById('wallCostResultsPanel');
    
    if (panel) {
        panel.classList.add('show', 'expanded');
        isResultsPanelOpen = true;
        
        // 요약 정보 업데이트
        updateCalculationSummary();
    }
    
    // 모드리스 패널에서는 오버레이 사용하지 않음 - 상단 요소들의 클릭을 차단하지 않음
}

/**
 * 결과 패널 토글
 */
window.toggleResultsPanel = function() {
    const panel = document.getElementById('wallCostResultsPanel');
    const icon = document.getElementById('panelToggleIcon');
    
    if (panel && icon) {
        if (panel.classList.contains('expanded')) {
            panel.classList.remove('expanded');
            panel.classList.add('minimized');
            icon.className = 'fas fa-chevron-up';
        } else {
            panel.classList.remove('minimized');
            panel.classList.add('expanded');
            icon.className = 'fas fa-chevron-down';
        }
    }
};

/**
 * 결과 패널 닫기
 */
window.closeResultsPanel = function() {
    const panel = document.getElementById('wallCostResultsPanel');
    
    if (panel) {
        panel.classList.remove('show', 'expanded', 'minimized');
        isResultsPanelOpen = false;
    }
    
    // 모드리스 패널에서는 오버레이 사용하지 않음
};

/**
 * 계산 요약 정보 업데이트
 */
function updateCalculationSummary() {
    const summaryElement = document.getElementById('calculationSummary');
    if (summaryElement && calculationResults.length > 0) {
        const totalCount = calculationResults.length;
        const totalCost = calculationResults.reduce((sum, result) => sum + result.totalCost, 0);
        const totalArea = calculationResults.reduce((sum, result) => sum + result.area, 0);
        
        summaryElement.textContent = `${totalCount}개 벽체, ${totalArea.toFixed(2)}m², ₩${totalCost.toLocaleString()}`;
    }
}

/**
 * 계산 결과 렌더링
 */
function renderCalculationResults() {
    renderIndividualResults();
    renderSummaryResults();
    renderComparisonResults();
}

/**
 * 벽체별 상세 결과 렌더링 (타입별 정렬 적용)
 */
function renderIndividualResults() {
    const container = document.querySelector('.wall-results-container');
    if (!container || calculationResults.length === 0) return;

    container.innerHTML = '';

    // ✅ 타입별 정렬 적용
    const sortedResults = sortCalculationResultsByType(calculationResults);

    sortedResults.forEach(result => {
        const card = createWallResultCard(result);
        container.appendChild(card);
    });
}

/**
 * 벽체 결과 카드 생성
 */
function createWallResultCard(result) {
    const card = document.createElement('div');
    card.className = 'wall-result-card';
    
    const layerSections = createLayerSections(result.layerPricing, result.area);
    
    card.innerHTML = `
        <div class="wall-card-header">
            <div>
                <div class="wall-card-title">${result.wallName}</div>
                <div style="font-size: 12px; color: #6c757d; margin-top: 2px;">
                    ${result.roomName} | Level: ${result.level}
                </div>
            </div>
            <div class="wall-card-area">${result.area.toFixed(2)} m²</div>
        </div>

        <div class="layer-header">
            <div class="layer-header-item">자재명</div>
            <div class="layer-header-item">재료비</div>
            <div class="layer-header-item">노무비</div>
            <div class="layer-header-item">합계</div>
        </div>

        <div class="wall-card-layers">
            ${layerSections}
        </div>
        
        <div class="wall-card-total">
            <div class="total-row">
                <span>재료비:</span>
                <span>₩${result.materialCost.toLocaleString()}</span>
            </div>
            <div class="total-row">
                <span>노무비:</span>
                <span>₩${result.laborCost.toLocaleString()}</span>
            </div>
            <div class="total-row">
                <span>총계:</span>
                <span>₩${result.totalCost.toLocaleString()}</span>
            </div>
        </div>
        
        <div class="wall-card-actions">
            <button class="btn btn-sm btn-outline-success" onclick="exportSingleWall('${result.elementId}')">
                <i class="fas fa-file-excel"></i> Excel
            </button>
        </div>
    `;
    
    return card;
}

/**
 * 레이어 섹션 생성
 */
function createLayerSections(layerPricing, area) {
    const sections = [];
    
    // 좌측 레이어
    const leftLayers = ['layer3_1', 'layer2_1', 'layer1_1'];
    const leftSection = createLayerSection('🏗️ 좌측 레이어', leftLayers, layerPricing, area);
    if (leftSection) sections.push(leftSection);
    
    // 구조체
    const structureLayers = ['column1', 'infill', 'column2'];
    const structureSection = createLayerSection('🔧 구조체', structureLayers, layerPricing, area);
    if (structureSection) sections.push(structureSection);
    
    // 우측 레이어
    const rightLayers = ['layer1_2', 'layer2_2', 'layer3_2'];
    const rightSection = createLayerSection('🏗️ 우측 레이어', rightLayers, layerPricing, area);
    if (rightSection) sections.push(rightSection);
    
    return sections.join('');
}

/**
 * 개별 레이어 섹션 생성
 */
function createLayerSection(title, layerKeys, layerPricing, area) {
    const items = layerKeys
        .map(key => layerPricing[key])
        .filter(layer => layer && layer.materialName);

    if (items.length === 0) return '';

    const layerItems = items.map(layer => {
        const materialCost = Math.round(layer.materialPrice * area);
        const laborCost = Math.round(layer.laborPrice * area);
        const totalCost = materialCost + laborCost;

        return `
            <div class="layer-item material-name">${layer.materialName}</div>
            <div class="layer-item">₩${Math.round(layer.materialPrice).toLocaleString()}</div>
            <div class="layer-item">₩${Math.round(layer.laborPrice).toLocaleString()}</div>
            <div class="layer-item cost">₩${totalCost.toLocaleString()}</div>
        `;
    }).join('');

    return `
        <div class="layer-section">
            <div class="layer-section-title">${title}</div>
            <div class="layer-items">
                ${layerItems}
            </div>
        </div>
    `;
}

// 차트 인스턴스 전역 변수
let workTypeChart = null;
let wallTypeChart = null;

/**
 * 집계 현황 렌더링
 */
function renderSummaryResults() {
    if (calculationResults.length === 0) return;
    
    const totalArea = calculationResults.reduce((sum, result) => sum + result.area, 0);
    const totalMaterialCost = calculationResults.reduce((sum, result) => sum + result.materialCost, 0);
    const totalLaborCost = calculationResults.reduce((sum, result) => sum + result.laborCost, 0);
    const totalProjectCost = totalMaterialCost + totalLaborCost;
    
    // 요약 카드 업데이트
    document.getElementById('totalArea').textContent = `${totalArea.toFixed(2)} m²`;
    document.getElementById('totalMaterialCost').textContent = `₩${totalMaterialCost.toLocaleString()}`;
    document.getElementById('totalLaborCost').textContent = `₩${totalLaborCost.toLocaleString()}`;
    document.getElementById('totalProjectCost').textContent = `₩${totalProjectCost.toLocaleString()}`;
    
    // 차트 렌더링
    renderWorkTypeChart();
    renderWallTypeChart();
}

/**
 * 공종별 비용 분포 차트 렌더링
 */
function renderWorkTypeChart() {
    const ctx = document.getElementById('workTypeChart');
    if (!ctx || calculationResults.length === 0) return;
    
    // 기존 차트 파괴
    if (workTypeChart) {
        workTypeChart.destroy();
    }
    
    // 공종별 데이터 집계
    const workTypeData = {};
    
    calculationResults.forEach(result => {
        Object.values(result.layerPricing || {}).forEach(layer => {
            if (!layer.found || !layer.workType1) return;
            
            const workType = layer.workType1;
            const cost = (layer.materialPrice + layer.laborPrice) * result.area;
            
            if (workTypeData[workType]) {
                workTypeData[workType] += cost;
            } else {
                workTypeData[workType] = cost;
            }
        });
    });
    
    const labels = Object.keys(workTypeData);
    const data = Object.values(workTypeData);
    const colors = generateChartColors(labels.length);
    
    workTypeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = data.reduce((sum, value) => sum + value, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ₩${context.parsed.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * 벽체 타입별 비교 차트 렌더링
 */
function renderWallTypeChart() {
    const ctx = document.getElementById('wallTypeChart');
    if (!ctx || calculationResults.length === 0) return;
    
    // 기존 차트 파괴
    if (wallTypeChart) {
        wallTypeChart.destroy();
    }
    
    // 벽체 타입별 데이터 집계
    const wallTypeData = {};
    
    calculationResults.forEach(result => {
        const wallTypeName = result.wallName;
        
        if (wallTypeData[wallTypeName]) {
            wallTypeData[wallTypeName].totalCost += result.totalCost;
            wallTypeData[wallTypeName].materialCost += result.materialCost;
            wallTypeData[wallTypeName].laborCost += result.laborCost;
            wallTypeData[wallTypeName].area += result.area;
            wallTypeData[wallTypeName].count += 1;
        } else {
            wallTypeData[wallTypeName] = {
                totalCost: result.totalCost,
                materialCost: result.materialCost,
                laborCost: result.laborCost,
                area: result.area,
                count: 1
            };
        }
    });

    // ✅ 정렬 적용
    const labels = sortWallTypeNames(Object.keys(wallTypeData));
    const materialData = labels.map(label => wallTypeData[label].materialCost);
    const laborData = labels.map(label => wallTypeData[label].laborCost);

    wallTypeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '재료비',
                    data: materialData,
                    backgroundColor: '#4CAF50',
                    borderColor: '#388E3C',
                    borderWidth: 1
                },
                {
                    label: '노무비',
                    data: laborData,
                    backgroundColor: '#FF9800',
                    borderColor: '#F57C00',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: '벽체 타입'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: '비용 (₩)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₩' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const wallType = context.label;
                            const data = wallTypeData[wallType];
                            const unitPrice = data.area > 0 ? (data.totalCost / data.area) : 0;
                            
                            return [
                                `${context.dataset.label}: ₩${context.parsed.y.toLocaleString()}`,
                                `면적: ${data.area.toFixed(2)}m²`,
                                `단가: ₩${unitPrice.toLocaleString()}/m²`,
                                `개수: ${data.count}개`
                            ];
                        }
                    }
                }
            }
        }
    });
}

/**
 * 차트용 색상 생성
 */
function generateChartColors(count) {
    const baseColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
        '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
}

/**
 * 비교 분석 렌더링 (벽체명 그룹화)
 */
function renderComparisonResults() {
    const tbody = document.getElementById('comparisonTableBody');
    if (!tbody || calculationResults.length === 0) return;

    tbody.innerHTML = '';

    // 1단계: 벽체명으로 그룹화 및 집계
    const groupedData = {};

    calculationResults.forEach(result => {
        const wallName = result.wallName;

        if (!groupedData[wallName]) {
            groupedData[wallName] = {
                count: 0,                                    // 개수
                totalArea: 0,                                // 수량 합산
                totalCost: 0,                                // 총합계 합산
                materialUnitPrice: result.materialUnitPrice, // M2당 자재비 (첫 번째 값)
                laborUnitPrice: result.laborUnitPrice,       // M2당 노무비 (첫 번째 값)
                unitPrice: result.unitPrice                  // M2당 단가 (첫 번째 값)
            };
        }

        groupedData[wallName].count++;
        groupedData[wallName].totalArea += result.area;      // 면적 합산
        groupedData[wallName].totalCost += result.totalCost;  // 금액 합산
    });

    // 2단계: 그룹화된 데이터로 테이블 행 생성 (✅ 정렬 적용)
    const sortedWallNames = sortWallTypeNames(Object.keys(groupedData));

    sortedWallNames.forEach(wallName => {
        const data = groupedData[wallName];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${wallName}</td>
            <td>${data.count}개</td>
            <td>M2</td>
            <td class="text-right">${data.totalArea.toFixed(2)}</td>
            <td class="text-right cost-cell">₩${Math.round(data.materialUnitPrice || 0).toLocaleString()}</td>
            <td class="text-right cost-cell">₩${Math.round(data.laborUnitPrice || 0).toLocaleString()}</td>
            <td class="text-right">₩${Math.round(data.unitPrice || 0).toLocaleString()}</td>
            <td class="text-right cost-cell">₩${Math.round(data.totalCost || 0).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * 결과 탭 전환
 */
window.switchResultTab = function(tabName) {
    // 탭 버튼 상태 업데이트
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[onclick="switchResultTab('${tabName}')"]`).classList.add('active');

    // 탭 콘텐츠 표시
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    currentActiveTab = tabName;

    // 탭별 렌더링
    if (tabName === 'priceComparison') {
        renderPriceComparisonTab();
    } else if (tabName === 'orderForm') {
        renderOrderFormTab();
    } else if (tabName === 'estimate') {
        renderEstimateTab();
    }
};

/**
 * Excel 내보내기 (ExcelJS 사용)
 */
window.exportCalculationResults = async function() {
    // 드롭다운 닫기
    closeExportDropdown();

    if (calculationResults.length === 0) {
        alert('내보낼 계산 결과가 없습니다.');
        return;
    }

    try {
        console.log('📊 Excel 내보내기 시작:', calculationResults.length, '개 벽체');

        // ExcelJS 워크북 생성
        const workbook = new ExcelJS.Workbook();

        // 1. 벽체별 합계 시트 (비교 분석)
        await createComparisonSheet(workbook);

        // 2. 벽체별 상세 시트
        await createDetailSheet(workbook);

        // 3. 레이어별 자재 시트
        await createMaterialSheet(workbook);

        // 파일 이름 생성
        const now = new Date();
        const dateStr = now.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
        const timeStr = now.toLocaleTimeString('ko-KR', {hour12: false}).replace(/:/g, '');
        const filename = `벽체계산결과_${dateStr}_${timeStr}.xlsx`;

        // Excel 파일 다운로드
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        console.log('✅ Excel 파일 생성 완료:', filename);

    } catch (error) {
        console.error('Excel 내보내기 실패:', error);
        alert('Excel 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
};

/**
 * 벽체별 상세 시트 생성 - ExcelJS
 */
async function createDetailSheet(workbook) {
    const worksheet = workbook.addWorksheet('벽체별상세');

    // 컬럼 정의
    worksheet.columns = [
        { header: 'ElementID', key: 'elementId', width: 12 },
        { header: '벽체명', key: 'wallName', width: 20 },
        { header: '공간명', key: 'roomName', width: 15 },
        { header: '레벨', key: 'level', width: 10 },
        { header: '면적(m²)', key: 'area', width: 12 },
        { header: '높이(m)', key: 'height', width: 10 },
        { header: '길이(m)', key: 'length', width: 10 },
        { header: '두께(m)', key: 'thickness', width: 10 },
        { header: '재료비(₩)', key: 'materialCost', width: 15 },
        { header: '노무비(₩)', key: 'laborCost', width: 15 },
        { header: '단가(₩/m²)', key: 'unitPrice', width: 15 },
        { header: '총계(₩)', key: 'totalCost', width: 15 },
        { header: '계산일시', key: 'calculatedAt', width: 20 }
    ];

    // 데이터 추가
    calculationResults.forEach(result => {
        worksheet.addRow({
            elementId: result.elementId,
            wallName: result.wallName,
            roomName: result.roomName,
            level: result.level,
            area: result.area,
            height: result.height,
            length: result.length,
            thickness: result.thickness,
            materialCost: Math.round(result.materialCost),
            laborCost: Math.round(result.laborCost),
            unitPrice: Math.round(result.unitPrice),
            totalCost: Math.round(result.totalCost),
            calculatedAt: new Date(result.calculatedAt).toLocaleString('ko-KR')
        });
    });

    // 헤더 스타일 적용
    worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
        };
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // 데이터 행 스타일 적용
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 헤더는 이미 처리됨

        row.eachCell((cell, colNumber) => {
            // 테두리
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // 정렬: 금액 컬럼(9~12)은 우측, 나머지는 중앙
            if (colNumber >= 9 && colNumber <= 12) {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                // 천단위 콤마
                cell.numFmt = '#,##0';
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                // 수치 컬럼 포맷
                if (colNumber === 5 || colNumber === 6 || colNumber === 7) { // 면적, 높이, 길이
                    cell.numFmt = '#,##0.##';
                } else if (colNumber === 8) { // 두께
                    cell.numFmt = '0.000';
                }
            }
        });
    });
}

/**
 * 비교 분석 시트 생성 (벽체명 그룹화) - ExcelJS
 */
async function createComparisonSheet(workbook) {
    const worksheet = workbook.addWorksheet('벽체별합계');

    // 컬럼 정의
    worksheet.columns = [
        { header: '벽체명', key: 'wallName', width: 20 },
        { header: '개수', key: 'count', width: 10 },
        { header: '면적(m²)', key: 'area', width: 12 },
        { header: '재료비(₩/m²)', key: 'materialPrice', width: 15 },
        { header: '노무비(₩/m²)', key: 'laborPrice', width: 15 },
        { header: '단가(₩/m²)', key: 'unitPrice', width: 15 },
        { header: '총계(₩)', key: 'totalCost', width: 15 },
        { header: '비율(%)', key: 'percentage', width: 10 }
    ];

    // 벽체명으로 그룹화
    const groupedData = {};
    calculationResults.forEach(result => {
        const wallName = result.wallName;

        if (!groupedData[wallName]) {
            groupedData[wallName] = {
                count: 0,
                totalArea: 0,
                totalCost: 0,
                materialUnitPrice: result.materialUnitPrice,
                laborUnitPrice: result.laborUnitPrice,
                unitPrice: result.unitPrice
            };
        }

        groupedData[wallName].count++;
        groupedData[wallName].totalArea += result.area;
        groupedData[wallName].totalCost += result.totalCost;
    });

    const totalCost = Object.values(groupedData).reduce((sum, g) => sum + g.totalCost, 0);

    // 데이터 추가
    Object.entries(groupedData).forEach(([wallName, groupInfo]) => {
        const percentage = totalCost > 0 ? ((groupInfo.totalCost / totalCost) * 100).toFixed(2) : 0;

        worksheet.addRow({
            wallName: wallName,
            count: groupInfo.count,
            area: groupInfo.totalArea,
            materialPrice: Math.round(groupInfo.materialUnitPrice),
            laborPrice: Math.round(groupInfo.laborUnitPrice),
            unitPrice: Math.round(groupInfo.unitPrice),
            totalCost: Math.round(groupInfo.totalCost),
            percentage: percentage
        });
    });

    // 헤더 스타일 적용
    worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
        };
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // 데이터 행 스타일 적용
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 헤더는 이미 처리됨

        row.eachCell((cell, colNumber) => {
            // 테두리
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // 정렬: 금액 컬럼(4~7)은 우측, 나머지는 중앙
            if (colNumber >= 4 && colNumber <= 7) {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                // 천단위 콤마
                if (colNumber !== 8) { // 비율 제외
                    cell.numFmt = '#,##0';
                }
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                if (colNumber === 2 || colNumber === 3) { // 개수, 면적
                    cell.numFmt = '#,##0.##';
                }
            }
        });
    });
}

/**
 * 레이어별 자재 시트 생성 (타입별 1개만) - ExcelJS
 */
async function createMaterialSheet(workbook) {
    const worksheet = workbook.addWorksheet('레이어별자재');

    // 컬럼 정의
    worksheet.columns = [
        { header: '벽체명', key: 'wallName', width: 20 },
        { header: '레이어', key: 'layer', width: 15 },
        { header: '자재명', key: 'materialName', width: 25 },
        { header: '공종1', key: 'workType1', width: 12 },
        { header: '공종2', key: 'workType2', width: 12 },
        { header: '재료비단가(₩/m²)', key: 'materialPrice', width: 15 },
        { header: '노무비단가(₩/m²)', key: 'laborPrice', width: 15 },
        { header: '합계단가(₩/m²)', key: 'totalPrice', width: 15 }
    ];

    // 타입별로 1개만 추출
    const processedTypes = new Set();

    calculationResults.forEach(result => {
        const wallName = result.wallName;

        // 이미 처리된 타입이면 스킵
        if (processedTypes.has(wallName)) return;
        processedTypes.add(wallName);

        // 레이어 정보 추가
        Object.entries(result.layerPricing || {}).forEach(([layerKey, layer]) => {
            if (!layer.found || !layer.materialName) return;

            const totalUnitPrice = layer.materialPrice + layer.laborPrice;

            worksheet.addRow({
                wallName: wallName,
                layer: getLayerDisplayName(layerKey),
                materialName: layer.materialName,
                workType1: layer.workType1 || '',
                workType2: layer.workType2 || '',
                materialPrice: Math.round(layer.materialPrice),
                laborPrice: Math.round(layer.laborPrice),
                totalPrice: Math.round(totalUnitPrice)
            });
        });
    });

    // 헤더 스타일 적용
    worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
        };
        cell.font = { bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // 데이터 행 스타일 적용
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // 헤더는 이미 처리됨

        row.eachCell((cell, colNumber) => {
            // 테두리
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // 정렬: 금액 컬럼(6~8)은 우측, 나머지는 중앙
            if (colNumber >= 6 && colNumber <= 8) {
                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                // 천단위 콤마
                cell.numFmt = '#,##0';
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            }
        });
    });
}

/**
 * 레이어 키를 표시용 이름으로 변환
 */
function getLayerDisplayName(layerKey) {
    const layerNames = {
        'layer3_1': '좌측 Layer3',
        'layer2_1': '좌측 Layer2',
        'layer1_1': '좌측 Layer1',
        'column1': 'Column1',
        'infill': 'Infill',
        'layer1_2': '우측 Layer1',
        'layer2_2': '우측 Layer2',
        'layer3_2': '우측 Layer3',
        'column2': 'Column2',
        'channel': 'Channel',
        'runner': 'Runner'
    };
    
    return layerNames[layerKey] || layerKey;
}

/**
 * 단일 벽체 Excel 내보내기
 */
window.exportSingleWall = function(elementId) {
    const result = calculationResults.find(r => r.elementId === elementId);
    if (!result) {
        alert('해당 벽체 데이터를 찾을 수 없습니다.');
        return;
    }
    
    try {
        console.log('📊 단일 벽체 Excel 내보내기:', result.wallName);
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 1. 벽체 기본 정보 시트
        createSingleWallInfoSheet(wb, result);
        
        // 2. 레이어별 자재 상세 시트
        createSingleWallMaterialSheet(wb, result);
        
        // 파일 이름 생성
        const now = new Date();
        const dateStr = now.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
        const timeStr = now.toLocaleTimeString('ko-KR', {hour12: false}).replace(/:/g, '');
        const safeName = result.wallName.replace(/[<>:"/\\|?*]/g, '_');
        const filename = `${safeName}_${dateStr}_${timeStr}.xlsx`;
        
        // Excel 파일 다운로드
        XLSX.writeFile(wb, filename);
        
        console.log('✅ 단일 벽체 Excel 파일 생성 완료:', filename);
        
    } catch (error) {
        console.error('단일 벽체 Excel 내보내기 실패:', error);
        alert('Excel 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
};

/**
 * 단일 벽체 기본 정보 시트 생성
 */
function createSingleWallInfoSheet(wb, result) {
    const data = [];
    
    // 기본 정보
    data.push(['=== 벽체 기본 정보 ===']);
    data.push(['ElementID', result.elementId]);
    data.push(['벽체명', result.wallName]);
    data.push(['공간명', result.roomName]);
    data.push(['레벨', result.level]);
    data.push(['면적', result.area, 'm²']);
    data.push(['높이', result.height, 'm']);
    data.push(['길이', result.length, 'm']);
    data.push(['두께', result.thickness, 'mm']);
    data.push([]);
    
    // 계산 결과
    data.push(['=== 계산 결과 ===']);
    data.push(['재료비', result.materialCost, '₩']);
    data.push(['노무비', result.laborCost, '₩']);
    data.push(['총계', result.totalCost, '₩']);
    data.push(['단가', result.unitPrice, '₩/m²']);
    data.push(['계산일시', new Date(result.calculatedAt).toLocaleString('ko-KR')]);
    data.push([]);
    
    // 매칭된 벽체 타입 정보
    if (result.wallType) {
        data.push(['=== 매칭된 벽체 타입 정보 ===']);
        data.push(['벽체 타입', result.wallType.wallType || '']);
        data.push(['설명', result.wallType.description || '']);
        data.push(['두께', result.wallType.thickness || '', 'mm']);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 컬럼 너비 설정
    ws['!cols'] = [{wch: 20}, {wch: 20}, {wch: 10}];
    
    XLSX.utils.book_append_sheet(wb, ws, '벽체정보');
}

/**
 * 단일 벽체 레이어별 자재 상세 시트 생성
 */
function createSingleWallMaterialSheet(wb, result) {
    const data = [];
    
    // 헤더 추가
    data.push([
        '레이어', '자재명', '공종1', '공종2', '단위', 
        '재료비단가(₩)', '노무비단가(₩)', '면적(m²)', '재료비계(₩)', '노무비계(₩)', '소계(₩)'
    ]);
    
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    
    // 데이터 추가
    Object.entries(result.layerPricing || {}).forEach(([layerKey, layer]) => {
        if (!layer.found || !layer.materialName) return;
        
        const materialTotal = layer.materialPrice * result.area;
        const laborTotal = layer.laborPrice * result.area;
        const subtotal = materialTotal + laborTotal;
        
        totalMaterialCost += materialTotal;
        totalLaborCost += laborTotal;
        
        data.push([
            getLayerDisplayName(layerKey),
            layer.materialName,
            layer.workType1 || '',
            layer.workType2 || '',
            layer.unit || 'M2',
            layer.materialPrice,
            layer.laborPrice,
            result.area,
            materialTotal,
            laborTotal,
            subtotal
        ]);
    });
    
    // 합계 행 추가
    if (data.length > 1) {
        data.push([]);
        data.push([
            '합계', '', '', '', '', '', '', '',
            totalMaterialCost, totalLaborCost, totalMaterialCost + totalLaborCost
        ]);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 15}, {wch: 25}, {wch: 12}, {wch: 12}, {wch: 8},
        {wch: 15}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '레이어별자재');
}

/**
 * 발주서 탭 렌더링
 */
async function renderOrderFormTab() {
    console.log('📋 발주서 탭 렌더링');

    const container = document.getElementById('orderFormContainer');

    if (calculationResults.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">벽체 계산이 필요합니다</p>
                <p style="font-size: 14px;">먼저 벽체를 선택하고 "계산하기" 버튼을 클릭하세요.</p>
            </div>
        `;
        return;
    }

    // 데이터 행 생성 (비동기)
    const dataRowsHtml = await generateOrderFormDataRows();

    // 발주서 HTML 생성
    container.innerHTML = `
        <div class="order-form-wrapper" style="padding: 20px;">
            <div class="order-form-table-wrapper" style="overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                <table class="order-form-table">
                    <thead>
                        ${generateOrderFormHeader()}
                    </thead>
                    <tbody>
                        <!-- 현장명 입력 행 -->
                        <tr>
                            <td>1</td>
                            <td>
                                <input type="text" placeholder="현장명을 입력하세요" style="width: 100%; border: 1px solid #ddd; padding: 6px; font-size: 12px;">
                            </td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                        </tr>
                        <!-- 데이터 행 -->
                        ${dataRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * calculationResults를 타입별로 그룹핑
 */
/**
 * 벽체 타입 이름 정렬 함수
 * W1, W2, W3, A1, A2 등을 올바르게 정렬
 * @param {Array<string>} typeNames - 벽체 타입 이름 배열
 * @returns {Array<string>} 정렬된 배열
 */
function sortWallTypeNames(typeNames) {
    return typeNames.sort((a, b) => {
        // 알파벳 부분 추출
        const letterA = a.match(/^[A-Za-z]+/)?.[0] || '';
        const letterB = b.match(/^[A-Za-z]+/)?.[0] || '';

        // 숫자 부분 추출
        const numberA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numberB = parseInt(b.match(/\d+/)?.[0] || '0');

        // 알파벳 먼저 비교
        if (letterA !== letterB) {
            return letterA.localeCompare(letterB);
        }

        // 알파벳이 같으면 숫자 비교
        return numberA - numberB;
    });
}

/**
 * 계산 결과를 타입별로 정렬
 * @param {Array} results - 계산 결과 배열
 * @returns {Array} 정렬된 결과 배열
 */
function sortCalculationResultsByType(results) {
    return [...results].sort((a, b) => {
        const typeA = a.wallType.wallType;
        const typeB = b.wallType.wallType;

        // 타입 이름 정렬 로직 재사용
        const letterA = typeA.match(/^[A-Za-z]+/)?.[0] || '';
        const letterB = typeB.match(/^[A-Za-z]+/)?.[0] || '';
        const numberA = parseInt(typeA.match(/\d+/)?.[0] || '0');
        const numberB = parseInt(typeB.match(/\d+/)?.[0] || '0');

        if (letterA !== letterB) {
            return letterA.localeCompare(letterB);
        }
        return numberA - numberB;
    });
}

function groupResultsByType(results) {
    const grouped = {};

    // 1. 타입별 그룹핑
    results.forEach(result => {
        const typeName = result.wallType.wallType;
        if (!grouped[typeName]) {
            grouped[typeName] = [];
        }
        grouped[typeName].push(result);
    });

    // 2. ✅ 타입 이름 정렬
    const sortedTypeNames = sortWallTypeNames(Object.keys(grouped));

    // 3. ✅ 정렬된 순서로 새 객체 생성
    const sortedGrouped = {};
    sortedTypeNames.forEach(typeName => {
        sortedGrouped[typeName] = grouped[typeName];
    });

    console.log('📊 벽체 타입 정렬:', Object.keys(sortedGrouped));

    return sortedGrouped;
}

/**
 * 타입 합계 행 생성
 */
function generateTypeSummaryRow(typeName, results, typeIndex) {
    // 타입별 합계 계산
    const totalArea = results.reduce((sum, r) => sum + r.area, 0);
    const totalMaterialCost = results.reduce((sum, r) => sum + r.materialCost, 0);
    const totalLaborCost = results.reduce((sum, r) => sum + r.laborCost, 0);
    const totalCost = totalMaterialCost + totalLaborCost;

    // 단가 계산
    const materialUnitPrice = totalArea > 0 ? totalMaterialCost / totalArea : 0;
    const laborUnitPrice = totalArea > 0 ? totalLaborCost / totalArea : 0;
    const unitPrice = totalArea > 0 ? totalCost / totalArea : 0;

    return `
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">
            <td>1-${typeIndex}</td>
            <td>${typeName}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(materialUnitPrice).toLocaleString()}</td>
            <td class="number-cell">${Math.round(totalMaterialCost).toLocaleString()}</td>
            <td class="number-cell">${Math.round(laborUnitPrice).toLocaleString()}</td>
            <td class="number-cell">${Math.round(totalLaborCost).toLocaleString()}</td>
            <td class="number-cell">${Math.round(unitPrice).toLocaleString()}</td>
            <td class="number-cell">${Math.round(totalCost).toLocaleString()}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;
}

/**
 * 자재 타입 판별 헬퍼 함수들
 */
function isStud(name) {
    return name && (name.includes('스터드') || name.toUpperCase().includes('STUD'));
}

function isRunner(name) {
    return name && (name.includes('런너') || name.toUpperCase().includes('RUNNER'));
}

function isGypsumBoard(name) {
    return name && (name.includes('석고보드') || name.toUpperCase().includes('GYPSUM'));
}

function isGlassWool(name) {
    return name && (name.includes('그라스울') || name.toUpperCase().includes('GLASSWOOL'));
}

/**
 * 컴포넌트 표시 여부 판별 함수
 * 스터드, 런너, 석고보드, 그라스울만 발주서에 표시
 * @param {string} componentName - 컴포넌트 이름
 * @returns {boolean} - 표시 여부
 */
function shouldDisplayComponent(componentName) {
    if (!componentName) return false;

    // 표시할 자재: 스터드, 런너, 석고보드, 그라스울
    return isStud(componentName) ||
           isRunner(componentName) ||
           isGypsumBoard(componentName) ||
           isGlassWool(componentName);
}

/**
 * SIZE 필드 파싱 함수
 * @param {string} sizeString - SIZE 문자열 (예: "0.8T*60*45", "50형", "9.5T*1PLY")
 * @returns {object} - { thickness, width, height }
 */
function parseSizeField(sizeString) {
    if (!sizeString) {
        return { thickness: null, width: null, height: null };
    }

    // "0.8T*60*45" 패턴 처리
    const match = sizeString.match(/(\d+\.?\d*)T?\*?(\d+)?\*?(\d+)?/);
    if (match) {
        return {
            thickness: parseFloat(match[1]) || null,
            width: match[2] ? parseInt(match[2]) : null,
            height: match[3] ? parseInt(match[3]) : null
        };
    }

    // "50형" 패턴 처리
    const formMatch = sizeString.match(/(\d+)형/);
    if (formMatch) {
        return {
            thickness: null,
            width: parseInt(formMatch[1]) || null,
            height: null
        };
    }

    return { thickness: null, width: null, height: null };
}

/**
 * 간격 값 추출 함수
 * @param {string} spacingString - 간격 문자열 (예: "@450", "450")
 * @returns {number|null} - 간격 숫자값
 */
function extractSpacingValue(spacingString) {
    if (!spacingString) return null;
    const match = spacingString.match(/@?(\d+)/);
    return match ? parseInt(match[1]) : null;
}

/**
 * materialId로 자재 DB에서 자재 정보 조회
 * @param {string} materialId - 자재 ID (예: ST001, RN001, GB001)
 * @returns {object|null} - 자재 정보 또는 null
 */
async function findMaterialByIdInDB(materialId) {
    try {
        if (!materialId) return null;

        console.log(`  🔍 자재 DB 조회 시작: ${materialId}`);

        // priceDB에서 조회
        if (window.priceDB) {
            const materials = await window.priceDB.getAllMaterials();
            const found = materials.find(m => m.id === materialId);

            if (found) {
                console.log(`  ✅ 자재 DB 조회 성공: ${materialId}`, {
                    name: found.name,
                    size: found.size,
                    category: found.category
                });
                return found;
            }
        }

        console.warn(`  ⚠️ 자재 DB 조회 실패: ${materialId}`);
        return null;

    } catch (error) {
        console.error(`  ❌ 자재 DB 조회 오류: ${materialId}`, error);
        return null;
    }
}

/**
 * 일위대가 전체 데이터 조회 함수
 */
async function findUnitPriceItemByIdOrName(materialNameOrId) {
    try {
        // unitPrice_ 접두사 제거
        let searchName = materialNameOrId;
        if (materialNameOrId.startsWith('unitPrice_')) {
            searchName = materialNameOrId.replace('unitPrice_', '');
        }

        // 일위대가 DB에서 검색
        if (window.unitPriceDB) {
            const unitPriceItems = await window.unitPriceDB.getAllUnitPrices();

            // ID로 직접 검색
            const foundItem = unitPriceItems.find(item =>
                item.id && item.id.trim() === searchName.trim()
            );

            if (foundItem) {
                console.log(`✅ 일위대가 아이템 발견: ${foundItem.id}`);
                return foundItem;  // 전체 데이터 반환
            }
        }

        return null;
    } catch (error) {
        console.error('일위대가 조회 실패:', error);
        return null;
    }
}

/**
 * 품명 및 규격 생성 함수
 */
function generateItemNameWithSpec(unitPriceItem, componentName) {
    if (!unitPriceItem || !unitPriceItem.basic) {
        return componentName;
    }

    const { basic, components } = unitPriceItem;

    // 해당 구성품 찾기
    const component = components && components.find(c =>
        (c.name && componentName && (c.name.includes(componentName) || componentName.includes(c.name)))
    );

    // 1. 스터드 판별
    if (isStud(componentName)) {
        const size = basic.size || '';           // "50형" 또는 "0.8T*60*45"
        const spacing = basic.spacing || '';     // "@450"
        const quantity = component?.quantity || 0;

        // "스터드 0.8T*60*45 @450 M2.33" 형식
        return `${basic.itemName || componentName} ${size} ${spacing} M${quantity.toFixed(2)}`.trim();
    }

    // 2. 런너 판별
    if (isRunner(componentName)) {
        const spacing = basic.spacing || '';

        // "런너 @450" 형식
        return `${basic.itemName || componentName} ${spacing}`.trim();
    }

    // 3. 석고보드 판별
    if (isGypsumBoard(componentName)) {
        const size = basic.size || '';           // "9.5T*1PLY"

        // "일반석고보드 9.5T*1PLY" 형식 (M 표시 없음)
        return `${basic.itemName || componentName} ${size}`.trim();
    }

    // 4. 기타 (기본값)
    return basic.itemName || componentName;
}

/**
 * 컴포넌트별 행 생성 함수 (async로 변경)
 * @param {object} component - 컴포넌트 객체 (스터드, 런너, 석고보드 등)
 * @param {object} unitPriceItem - 전체 일위대가 아이템
 * @param {object} result - 계산 결과 객체 (area, wallType 포함)
 * @param {number} rowNumber - 행 번호
 * @returns {Promise<string>} HTML 행 문자열
 */
async function generateComponentRow(component, unitPriceItem, result, rowNumber, totalArea) {
    const componentName = component.name || '';

    // ✅ materialId로 자재 DB에서 자재 정보 조회
    const materialData = await findMaterialByIdInDB(component.materialId);
    const sizeFromDB = materialData?.size || '';

    // A. 품명 및 규격 생성
    let displayName = '';

    if (isStud(componentName)) {
        // ✅ component.name 사용 (예: "메탈 스터드 65형 ㉿")
        displayName = component.name || componentName;

    } else if (isRunner(componentName)) {
        // ✅ component.name 사용 (예: "메탈 런너 50형 ㉿")
        displayName = component.name || componentName;

    } else if (isGypsumBoard(componentName)) {
        // ✅ component.name + component.spec 사용 (예: "일반석고보드 12.5T*1PLY")
        const name = component.name || componentName;
        const spec = component.spec || '';
        displayName = `${name} ${spec}`.trim();

    } else if (isGlassWool(componentName)) {
        // "그라스울 24K*50T"
        const size = sizeFromDB || component.size || '';
        displayName = `${componentName} ${size}`.trim();

    } else {
        displayName = componentName;
    }

    // B. WALL 및 개수 컬럼 채우기
    const wallTypeCode = result.wallType?.wallType || '';
    const sizeData = parseSizeField(sizeFromDB || component.size);
    const spacingValue = extractSpacingValue(unitPriceItem.basic?.spacing);

    let wallThk = '';
    let atValue = '';
    let thicknessValue = '';
    let widthValue = '';
    let heightValue = '';
    let mValue = '';

    if (isStud(componentName) || isRunner(componentName)) {
        // 스터드/런너: THK 비움, 나머지 채움
        atValue = spacingValue || '';
        thicknessValue = sizeData.thickness || '';
        widthValue = sizeData.width || '';
        heightValue = sizeData.height || '';
        mValue = component.quantity ? component.quantity.toFixed(2) : '';

        console.log(`  📏 스터드/런너 (${componentName}):`, {
            Type: wallTypeCode,
            '@': atValue,
            '두께': thicknessValue,
            '넓이': widthValue,
            '높이': heightValue,
            'M': mValue
        });

    } else if (isGypsumBoard(componentName)) {
        // 석고보드: THK만 채움 (✅ materialData.t 필드 사용)
        wallThk = materialData?.t || '';

        console.log(`  📏 석고보드 (${componentName}):`, {
            THK: wallThk,
            Type: wallTypeCode
        });
    }

    // C. 환산 컬럼: 석고보드만 1장->m2 계산
    let conversionM2 = '';
    let sheetQuantity = '';

    if (isGypsumBoard(componentName) && materialData) {
        // ✅ (W/1000) * (H/1000) 소수 3째자리 반올림
        const w = parseFloat(materialData.w) || 0;
        const h = parseFloat(materialData.h) || 0;
        if (w > 0 && h > 0) {
            conversionM2 = ((w / 1000) * (h / 1000)).toFixed(3);
        }
    }

    // D. 단가 및 금액 계산
    const area = totalArea || result.area || 0;  // ✅ 타입별 전체 면적 합계 사용
    const componentQuantity = parseFloat(component.quantity) || 0;

    // ✅ 수량 컬럼에는 면적만 표시
    const displayQuantity = area;

    // ✅ 금액 계산용 실제 수량 (면적 × component.quantity)
    const actualQuantity = area * componentQuantity;

    // 석고보드 장 수량 계산: 실제수량 ÷ 1장당m2 (0단위 반올림)
    if (isGypsumBoard(componentName) && conversionM2) {
        const m2PerSheet = parseFloat(conversionM2);
        if (m2PerSheet > 0) {
            sheetQuantity = Math.round(actualQuantity / m2PerSheet);  // ✅ 0단위 반올림
        }
    }

    // 재료비 (실제 수량으로 계산)
    const materialUnitPrice = parseFloat(component.materialPrice) || 0;
    const materialAmount = materialUnitPrice * actualQuantity;  // ✅ 단가 × 실제수량

    // 노무비 - component에 이미 계산된 laborPrice 사용
    const laborUnitPrice = parseFloat(component.laborPrice) || 0;
    const laborTotalAmount = laborUnitPrice * actualQuantity;  // ✅ 단가 × 실제수량

    // 합계
    const totalUnitPrice = materialUnitPrice + laborUnitPrice;
    const totalAmount = materialAmount + laborTotalAmount;

    console.log(`  💰 단가 계산 (${componentName}):`, {
        '재료비단가': materialUnitPrice,
        '재료비금액': materialAmount,
        '노무비단가': laborUnitPrice,
        '노무비금액': laborTotalAmount,
        '합계단가': totalUnitPrice,
        '합계금액': totalAmount
    });

    // E. HTML 생성
    return `
        <tr style="background: white;">
            <td>${rowNumber}</td>
            <td></td>
            <td>${displayName}</td>
            <td>${wallThk}</td>
            <td>${wallTypeCode}</td>
            <td>${atValue}</td>
            <td>${thicknessValue}</td>
            <td>${widthValue}</td>
            <td>${heightValue}</td>
            <td>${mValue}</td>
            <td><input type="text" placeholder="제공자" style="width: 100%; text-align: center; border: 1px solid #ddd; padding: 4px;"></td>
            <td>${conversionM2}</td>
            <td>${sheetQuantity}</td>
            <td>M2</td>
            <td>${displayQuantity.toFixed(2)}</td>
            <td class="number-cell">${Math.round(materialUnitPrice).toLocaleString()}</td>
            <td class="number-cell">${Math.round(materialAmount).toLocaleString()}</td>
            <td class="number-cell">${Math.round(laborUnitPrice).toLocaleString()}</td>
            <td class="number-cell">${Math.round(laborTotalAmount).toLocaleString()}</td>
            <td class="number-cell">${Math.round(totalUnitPrice).toLocaleString()}</td>
            <td class="number-cell">${Math.round(totalAmount).toLocaleString()}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;
}

/**
 * 레이어별 상세 행 생성 (컴포넌트별로 분리)
 * @param {object} result - 대표 결과 (레이어 구조 참조용)
 * @param {array} allResults - 같은 타입의 모든 결과 (면적 합계용)
 */
async function generateLayerDetailRows(result, allResults) {
    const layerOrder = [
        'layer3_1', 'layer2_1', 'layer1_1',
        'column1', 'infill',
        'layer1_2', 'layer2_2', 'layer3_2',
        'column2', 'channel', 'runner'
    ];

    // ✅ 타입별 전체 면적 합계 계산
    const totalArea = allResults.reduce((sum, r) => sum + (r.area || 0), 0);
    console.log(`📐 타입별 전체 면적 합계: ${totalArea.toFixed(2)} m²`);

    let html = '';
    let layerNumber = 1;

    for (const layerKey of layerOrder) {
        const layer = result.layerPricing[layerKey];

        // 빈 레이어는 건너뛰기
        if (!layer || !layer.materialName) {
            continue;
        }

        // ✅ 일위대가 전체 데이터 조회
        const unitPriceItem = await findUnitPriceItemByIdOrName(layer.materialName);

        if (unitPriceItem && unitPriceItem.components && unitPriceItem.components.length > 0) {
            // ✅ 일위대가 아이템 발견: 각 컴포넌트마다 별도 행 생성
            console.log(`📋 일위대가 아이템 사용: ${unitPriceItem.id} (컴포넌트 ${unitPriceItem.components.length}개)`);

            for (const component of unitPriceItem.components) {
                // 스터드, 런너, 석고보드, 그라스울만 표시 (피스, 타정총알, 용접봉 제외)
                if (!shouldDisplayComponent(component.name)) {
                    console.log(`  ⏭️ 컴포넌트 건너뛰기: ${component.name}`);
                    continue;
                }

                html += await generateComponentRow(component, unitPriceItem, result, layerNumber, totalArea);
                layerNumber++;
            }

        } else {
            // ❌ 일위대가 없음: 기존 자재 정보로 단일 행 생성 (하위 호환성)
            console.log(`⚠️ 일위대가 없음 - 기존 자재 정보 사용: ${layer.materialName}`);

            const materialInfo = await findMaterialInUnitPriceDB(layer.materialName);
            const displayName = materialInfo?.name
                ? (materialInfo.spec ? `${materialInfo.name} ${materialInfo.spec}` : materialInfo.name)
                : layer.materialName;

            const quantity = result.area || 0;
            const materialUnitPrice = layer.materialPrice || 0;
            const laborUnitPrice = layer.laborPrice || 0;
            const totalUnitPrice = materialUnitPrice + laborUnitPrice;

            const materialAmount = materialUnitPrice * quantity;
            const laborAmount = laborUnitPrice * quantity;
            const totalAmount = materialAmount + laborAmount;

            // 벽체타입
            const wallTypeCode = result.wallType?.wallType || '';

            // 기본 행 생성 (WALL/개수 컬럼 비워둠)
            html += `
                <tr>
                    <td>${layerNumber}</td>
                    <td></td>
                    <td>${displayName}</td>
                    <td></td>
                    <td>${wallTypeCode}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>M2</td>
                    <td>${quantity.toFixed(2)}</td>
                    <td class="number-cell">${Math.round(materialUnitPrice).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(materialAmount).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(laborUnitPrice).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(laborAmount).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(totalUnitPrice).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(totalAmount).toLocaleString()}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            `;

            layerNumber++;
        }
    }

    return html;
}

/**
 * 발주서 데이터 행 생성
 */
async function generateOrderFormDataRows() {
    if (calculationResults.length === 0) {
        return `
            <tr>
                <td colspan="29" style="padding: 20px; text-align: center; color: #6c757d;">
                    벽체 계산 데이터가 없습니다. 먼저 벽체를 선택하고 계산하기를 실행하세요.
                </td>
            </tr>
        `;
    }

    let html = '';
    let typeIndex = 1;

    // 타입별로 그룹핑
    const groupedByType = groupResultsByType(calculationResults);

    // 각 타입별 처리
    for (const [typeName, results] of Object.entries(groupedByType)) {
        // 타입 합계 행
        html += generateTypeSummaryRow(typeName, results, typeIndex);

        // 레이어별 상세 행 (첫 번째 결과의 레이어 구조 사용, 모든 results의 면적 합계 사용)
        html += await generateLayerDetailRows(results[0], results);

        typeIndex++;
    }

    return html;
}

/**
 * 발주서 헤더 생성 (3행 복잡한 병합 구조)
 */
function generateOrderFormHeader() {
    return `
        <!-- Row 1: 메인 헤더 -->
        <tr>
            <th rowspan="3">NO</th>
            <th rowspan="3">구분</th>
            <th rowspan="3">품명 및 규격</th>
            <th colspan="2">WALL</th>
            <th colspan="5">개수</th>
            <th colspan="3">환산</th>
            <th rowspan="3">단위</th>
            <th rowspan="3">수량</th>
            <th colspan="6">계약도급</th>
            <th rowspan="3">비고</th>
            <th colspan="6">발주단가</th>
            <th rowspan="3">비고</th>
        </tr>

        <!-- Row 2: 서브 헤더 -->
        <tr>
            <th rowspan="2">THK</th>
            <th rowspan="2">Type</th>
            <th rowspan="2">@</th>
            <th rowspan="2">두께</th>
            <th rowspan="2">넓이</th>
            <th rowspan="2">높이</th>
            <th rowspan="2">M</th>
            <th rowspan="2">제공자</th>
            <th rowspan="2">1장->m2</th>
            <th rowspan="2">장</th>
            <th colspan="2">자재비</th>
            <th colspan="2">노무비</th>
            <th colspan="2">합계</th>
            <th colspan="2">자재비</th>
            <th colspan="2">노무비</th>
            <th colspan="2">합계</th>
        </tr>

        <!-- Row 3: 세부 헤더 -->
        <tr>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
        </tr>
    `;
}

/**
 * 단가비교표 탭 렌더링
 */
function renderPriceComparisonTab() {
    console.log('💰 단가비교표 탭 렌더링');

    if (calculationResults.length === 0) {
        const container = document.getElementById('priceComparisonContainer');
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <i class="fas fa-chart-bar" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">벽체 계산이 필요합니다</p>
                <p style="font-size: 14px;">먼저 벽체를 선택하고 "계산하기" 버튼을 클릭하세요.</p>
            </div>
        `;
        return;
    }

    // priceComparisonManager.js의 renderPriceComparisonTable() 호출
    if (typeof window.renderPriceComparisonTable === 'function') {
        window.renderPriceComparisonTable();
    }
}

/**
 * 견적서 탭 렌더링
 */
function renderEstimateTab() {
    console.log('📄 견적서 탭 렌더링');

    const container = document.getElementById('estimateContainer');

    if (calculationResults.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #6c757d;">
                <i class="fas fa-file-invoice" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">벽체 계산이 필요합니다</p>
                <p style="font-size: 14px;">먼저 벽체를 선택하고 "계산하기" 버튼을 클릭하세요.</p>
            </div>
        `;
        return;
    }

    // 견적서 HTML 생성
    container.innerHTML = `
        <!-- 갑지 (표지) -->
        <div class="estimate-cover-section">
            <div class="estimate-cover">
                <div class="cover-header">
                    <img src="/image.png" alt="KIYENO" class="cover-logo">
                </div>
                <div class="cover-row">
                    <label>제 출 처 /</label>
                    <input type="text" id="estimateRecipient" placeholder="발주기업명 입력">
                    <input type="date" id="estimateDate" class="cover-date">
                </div>
                <div class="cover-row">
                    <label>공 사 명 / PROJECT</label>
                    <input type="text" id="estimateProject" placeholder="공사명 입력" value="${getSiteNameFromOrderForm()}">
                </div>
                <div class="cover-row">
                    <label>금     액 / AMOUNT</label>
                    <span id="estimateTotalAmount">일금 영 원정</span>
                    <span class="amount-number">₩ -</span>
                </div>
                <div class="cover-message">
                    <p>상기와 같이 견적서를 제출합니다.</p>
                    <p>WE ARE PLEASED TO SUBMIT YOU ESTIMATE AS SPECIFIED ON ATTACHED SHEETS.</p>
                </div>
                <div class="cover-terms">
                    <h3>견 적 조 건 / TERMS</h3>
                    <ul id="estimateTermsList">
                        <li contenteditable="true" ondblclick="removeEstimateTerm(this)">-V.A.T 제외</li>
                        <li contenteditable="true" ondblclick="removeEstimateTerm(this)">-현장여건에 따라 금액 변동 있음</li>
                        <li contenteditable="true" ondblclick="removeEstimateTerm(this)">-견적서 사항과 분도</li>
                    </ul>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button onclick="addEstimateTerm()" style="padding: 5px 15px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">+ 조건 추가</button>
                        <button onclick="removeLastEstimateTerm()" style="padding: 5px 15px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">- 조건 삭제</button>
                    </div>
                </div>
                <div class="cover-footer">
                    <p>(주) 키 예 노</p>
                    <p>대표이사 고병화 (인)</p>
                    <p>서울시 강남구 봉은사로 37길 26 키예노빌딩</p>
                    <p>TEL: 02)2193-8300 , FAX: 02)3463-0769</p>
                    <p>MAIN E-MAIL: kiyeno@kiyeno.co.kr</p>
                </div>
            </div>
        </div>

        <!-- 페이지 구분선 -->
        <div class="page-break"></div>

        <!-- 을지 (내역서) -->
        <div class="estimate-detail-section">
            <div class="estimate-table-wrapper">
                <table class="estimate-table">
                    <colgroup>
                        <col style="width: 60px;">
                        <col style="width: 300px;">
                        <col style="width: 400px;">
                        <col style="width: 60px;">
                        <col style="width: 80px;">
                        <col style="width: 150px;">
                        <col style="width: 150px;">
                        <col style="width: 150px;">
                        <col style="width: 150px;">
                        <col style="width: 150px;">
                        <col style="width: 150px;">
                        <col style="width: 120px;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th rowspan="3">NO.</th>
                            <th rowspan="3">품명</th>
                            <th rowspan="3">규격</th>
                            <th rowspan="3">단위</th>
                            <th colspan="7">계 약 내 역 서</th>
                            <th rowspan="3">비고</th>
                        </tr>
                        <tr>
                            <th rowspan="2">수량</th>
                            <th colspan="2">자재비</th>
                            <th colspan="2">노무비</th>
                            <th colspan="2">합계</th>
                        </tr>
                        <tr>
                            <th>단가</th>
                            <th>금액</th>
                            <th>단가</th>
                            <th>금액</th>
                            <th>단가</th>
                            <th>금액</th>
                        </tr>
                    </thead>
                    <tbody id="estimateDetailTableBody">
                        ${generateEstimateDetailRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 총액 계산 및 표시
    updateEstimateTotalAmount();
}

/**
 * 발주서에서 현장명 가져오기
 */
function getSiteNameFromOrderForm() {
    const siteNameInput = document.querySelector('#orderFormContainer input[placeholder="현장명을 입력하세요"]');
    return siteNameInput ? siteNameInput.value : '';
}

/**
 * 견적서 총액 업데이트
 */
function updateEstimateTotalAmount() {
    const grandTotal = calculateEstimateGrandTotal();
    const amountElement = document.getElementById('estimateTotalAmount');
    const numberElement = document.querySelector('.amount-number');

    if (amountElement && numberElement) {
        amountElement.textContent = `일금 ${numberToKorean(grandTotal)} 원정`;
        numberElement.textContent = `₩ ${Math.round(grandTotal).toLocaleString()}`;
    }
}

/**
 * 숫자를 한글로 변환
 */
function numberToKorean(num) {
    if (num === 0) return '영';

    const koreanNum = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const koreanUnit = ['', '만', '억', '조'];
    const smallUnit = ['천', '백', '십', ''];

    num = Math.round(num);
    if (num === 0) return '영';

    let result = '';
    let unitIndex = 0;

    while (num > 0) {
        const part = num % 10000;
        if (part > 0) {
            let partStr = '';
            for (let i = 0; i < 4; i++) {
                const digit = Math.floor(part / Math.pow(10, 3 - i)) % 10;
                if (digit > 0) {
                    partStr += koreanNum[digit] + smallUnit[i];
                }
            }
            result = partStr + koreanUnit[unitIndex] + result;
        }
        num = Math.floor(num / 10000);
        unitIndex++;
    }

    return result || '영';
}

/**
 * 견적서 상세 행 생성
 */
function generateEstimateDetailRows() {
    let html = '';

    // A. 직접공사비
    html += `
        <tr class="section-header">
            <td></td>
            <td class="left-align">직접공사비</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    // 직접공사비 항목들
    const directItems = [
        { no: '', name: 'A. 인테리어 설계비' },
        { no: '', name: 'B. 가설 및 공사준비 작업' },
        { no: '', name: 'C. 철거공사' },
        { no: '', name: 'D. 인테리어공사' },
        { no: 'D-1', name: '바닥공사' },
        { no: 'D-2', name: '벽체공사' },
        { no: 'D-3', name: '벽체마감공사' },
        { no: 'D-4', name: '유리벽체공사' },
        { no: 'D-5', name: '창호 및 하드웨어 공사' },
        { no: 'D-6', name: '천정공사' },
        { no: 'D-7', name: '천정마감공사' },
        { no: 'D-8', name: '조명기구공사' },
        { no: 'D-9', name: '블라인드공사' },
        { no: 'D-10', name: '실내싸인공사' },
        { no: '', name: 'E. 기계설비공사' },
        { no: 'E-1', name: '공조 및 환기덕트 공사' },
        { no: 'E-2', name: '위생설비 공사' },
        { no: 'E-3', name: '기계 소화설비 공사' },
        { no: 'E-4', name: '기타' },
        { no: '', name: 'F. 전기공사' },
        { no: 'F-1', name: '동력전원설비공사' },
        { no: 'F-2', name: '전열설비공사' },
        { no: 'F-3', name: '전등설비공사' },
        { no: 'F-4', name: '철거및이설공사' },
        { no: 'F-5', name: '자탐 및 유도등공사' },
        { no: 'F-6', name: '전관방송설비공사' },
        { no: '', name: 'G. 제작가구공사' },
        { no: '', name: 'H. 이동식가구공사' },
        { no: '', name: 'I. 기타공사' }
    ];

    directItems.forEach(item => {
        // D-1, E-1, F-1 등 하위 항목은 들여쓰기 적용
        const indentClass = item.no && item.no.includes('-') ? 'indent-2' : 'indent-1';
        html += `
            <tr class="type-row">
                <td>${item.no}</td>
                <td class="left-align ${indentClass}">${item.name}</td>
                <td></td>
                <td>LOT</td>
                <td class="number-cell">1.00</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `;
    });

    // A-TOTAL
    html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">A - TOTAL</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    // B. 간접공사비 (GRAND TOTAL 포함)
    html += generateIndirectCostRows();

    return html;
}

/**
 * 직접공사비 계산
 */
function calculateDirectCosts() {
    let materialCost = 0;
    let laborCost = 0;

    calculationResults.forEach(result => {
        materialCost += result.materialCost;
        laborCost += result.laborCost;
    });

    return {
        materialCost,
        laborCost,
        totalCost: materialCost + laborCost
    };
}

/**
 * 간접공사비 행 생성
 */
function generateIndirectCostRows() {
    let html = '';

    html += `
        <tr class="section-header">
            <td></td>
            <td class="left-align">간접공사비</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    const indirectItems = [
        '산재보험료 (노무비의 3.75%)',
        '안전관리비 (직접비의 1.99%+5,349,000)',
        '고용보험료 (노무비의 0.87%)',
        '건강보험료 (노무비의 3.23%)',
        '연금보험료 (노무비의 4.5%)',
        '장기요양보험료 (건강보험료의 8.51%)',
        '퇴직공제부금 (노무비의 2.3%)',
        '계약이행증권',
        '영업배상책임보험',
        '하자이행증권',
        '공과잡비 (직접공사비기준)',
        '기업이윤 (직접공사비기준)'
    ];

    indirectItems.forEach((itemName, index) => {
        html += `
            <tr class="indirect-cost-row">
                <td></td>
                <td class="left-align indent-1">${itemName}</td>
                <td></td>
                <td>LOT</td>
                <td class="number-cell">1.00</td>
                <td><input type="text" class="estimate-input" data-type="indirect" data-index="${index}" data-field="materialPrice"></td>
                <td><input type="text" class="estimate-input" data-type="indirect" data-index="${index}" data-field="materialAmount"></td>
                <td><input type="text" class="estimate-input" data-type="indirect" data-index="${index}" data-field="laborPrice"></td>
                <td><input type="text" class="estimate-input" data-type="indirect" data-index="${index}" data-field="laborAmount"></td>
                <td class="number-cell"></td>
                <td class="number-cell"></td>
                <td></td>
            </tr>
        `;
    });

    // B-TOTAL
    html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">B - TOTAL</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    // 단수정리
    html += `
        <tr class="type-row">
            <td></td>
            <td class="left-align indent-1">단수정리</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    // GRAND TOTAL
    html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">GRAND TOTAL (A+B+C+D)</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
    `;

    return html;
}

/**
 * 견적서 총액 계산
 */
function calculateEstimateGrandTotal() {
    const directCosts = calculateDirectCosts();
    const laborTotal = directCosts.laborCost;
    const total = directCosts.totalCost;

    // 간접공사비 계산
    const indirectTotal =
        laborTotal * 0.0375 +  // 안전보건관리
        Math.max(total * 0.0199, 5349000) +  // 안전관리비
        laborTotal * 0.0087 +  // 고용보험료
        laborTotal * 0.0323 +  // 산업분류료
        laborTotal * 0.045 +   // 연금보험료
        (laborTotal * 0.045) * 0.0851 +  // 경기요양보험료
        laborTotal * 0.023;    // 퇴직공제분담금

    return directCosts.totalCost + indirectTotal;
}

/**
 * 견적조건 추가
 */
window.addEstimateTerm = function() {
    const termsList = document.getElementById('estimateTermsList');
    if (termsList) {
        const newLi = document.createElement('li');
        newLi.contentEditable = 'true';
        newLi.textContent = '-새 조건 입력';
        newLi.setAttribute('ondblclick', 'removeEstimateTerm(this)');
        termsList.appendChild(newLi);
    }
};

/**
 * 견적조건 삭제 (마지막 항목)
 */
window.removeLastEstimateTerm = function() {
    const termsList = document.getElementById('estimateTermsList');
    if (termsList && termsList.children.length > 0) {
        termsList.removeChild(termsList.lastElementChild);
    }
};

/**
 * 견적조건 삭제 (더블클릭한 항목)
 */
window.removeEstimateTerm = function(element) {
    if (confirm('이 조건을 삭제하시겠습니까?')) {
        element.remove();
    }
};

/**
 * 견적서 Excel 내보내기
 */
async function exportEstimateToExcel() {
    try {
        console.log('📊 견적서 Excel 내보내기 시작');

        // 워크북 생성
        const workbook = new ExcelJS.Workbook();

        // 1. 갑지 (표지) 시트
        await createEstimateCoverSheet(workbook);

        // 2. 을지 (내역서) 시트
        await createEstimateDetailSheet(workbook);

        // 파일 이름 생성
        const now = new Date();
        const dateStr = now.toISOString().slice(0,10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0,8).replace(/:/g, '');
        const filename = `견적서_${dateStr}_${timeStr}.xlsx`;

        // Excel 파일 다운로드
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        console.log('✅ 견적서 Excel 파일 생성 완료:', filename);

    } catch (error) {
        console.error('견적서 Excel 내보내기 실패:', error);
        alert('Excel 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

/**
 * 갑지 (표지) 시트 생성
 */
async function createEstimateCoverSheet(workbook) {
    const sheet = workbook.addWorksheet('갑지');

    // 입력 값 가져오기
    const recipient = document.getElementById('estimateRecipient')?.value || '';
    const project = document.getElementById('estimateProject')?.value || '';
    const date = document.getElementById('estimateDate')?.value || '';
    const totalAmount = document.getElementById('estimateTotalAmount')?.textContent || '';
    const amountNumber = document.querySelector('.amount-number')?.textContent || '';

    // 견적조건 가져오기
    const termsList = document.getElementById('estimateTermsList');
    const terms = termsList ? Array.from(termsList.children).map(li => li.textContent.trim()) : [];

    let currentRow = 1;

    // 로고 이미지 삽입
    try {
        const imageResponse = await fetch('/image.png');
        const imageBlob = await imageResponse.blob();
        const imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
        });

        const imageId = workbook.addImage({
            base64: imageBase64,
            extension: 'png',
        });

        // 이미지 삽입
        // ExcelJS는 픽셀 단위 사용 (72 DPI 기준)
        // 높이 2.83cm = 2.83 * 28.35 = 80.27pt = 107 픽셀
        // 너비 2.46cm = 2.46 * 28.35 = 69.74pt = 93 픽셀
        sheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 93, height: 107 },
            editAs: 'oneCell'
        });

        currentRow = 5; // 이미지 공간 확보
    } catch (error) {
        console.warn('이미지 로드 실패, 텍스트로 대체:', error);
        // 이미지 로드 실패 시 텍스트로 대체
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        sheet.getCell(`A${currentRow}`).value = 'KIYENO';
        sheet.getCell(`A${currentRow}`).font = { size: 24, bold: true };
        sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
        currentRow += 2;
    }

    // 구분선
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).border = { bottom: { style: 'thick' } };
    currentRow++;

    // 제출처
    sheet.getCell(`A${currentRow}`).value = '제 출 처 /';
    sheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    sheet.mergeCells(`B${currentRow}:C${currentRow}`);
    sheet.getCell(`B${currentRow}`).value = recipient;
    sheet.getCell(`B${currentRow}`).font = { size: 12 };
    sheet.getCell(`D${currentRow}`).value = date;
    sheet.getCell(`D${currentRow}`).font = { size: 12 };
    sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    currentRow++;

    // 공사명
    sheet.getCell(`A${currentRow}`).value = '공 사 명 / PROJECT';
    sheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    sheet.mergeCells(`B${currentRow}:D${currentRow}`);
    sheet.getCell(`B${currentRow}`).value = project;
    sheet.getCell(`B${currentRow}`).font = { size: 12 };
    currentRow++;

    // 금액
    sheet.getCell(`A${currentRow}`).value = '금     액 / AMOUNT';
    sheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    sheet.getCell(`B${currentRow}`).value = totalAmount;
    sheet.getCell(`B${currentRow}`).font = { size: 12 };
    sheet.getCell(`D${currentRow}`).value = amountNumber;
    sheet.getCell(`D${currentRow}`).font = { size: 12 };
    sheet.getCell(`D${currentRow}`).alignment = { horizontal: 'right', vertical: 'middle' };
    currentRow += 2;

    // 메시지
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = '상기와 같이 견적서를 제출합니다.';
    sheet.getCell(`A${currentRow}`).font = { size: 11 };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'WE ARE PLEASED TO SUBMIT YOU ESTIMATE AS SPECIFIED ON ATTACHED SHEETS.';
    sheet.getCell(`A${currentRow}`).font = { size: 11 };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
    currentRow += 2;

    // 견적조건
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = '견 적 조 건 / TERMS';
    sheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    currentRow++;

    terms.forEach(term => {
        sheet.mergeCells(`A${currentRow}:D${currentRow}`);
        sheet.getCell(`A${currentRow}`).value = term;
        sheet.getCell(`A${currentRow}`).font = { size: 11 };
        currentRow++;
    });

    currentRow += 2;

    // 회사 정보
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = '(주) 키 예 노';
    sheet.getCell(`A${currentRow}`).font = { size: 11, bold: true };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = '대표이사 고병화 (인)';
    sheet.getCell(`A${currentRow}`).font = { size: 11, bold: true };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = '서울시 강남구 봉은사로 37길 26 키예노빌딩';
    sheet.getCell(`A${currentRow}`).font = { size: 11 };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'TEL: 02)2193-8300 , FAX: 02)3463-0769';
    sheet.getCell(`A${currentRow}`).font = { size: 11 };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
    currentRow++;

    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'MAIN E-MAIL: kiyeno@kiyeno.co.kr';
    sheet.getCell(`A${currentRow}`).font = { size: 11 };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };

    // 컬럼 너비 설정
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 30;
    sheet.getColumn(3).width = 20;
    sheet.getColumn(4).width = 20;
}

/**
 * 을지 (내역서) 시트 생성
 */
async function createEstimateDetailSheet(workbook) {
    const sheet = workbook.addWorksheet('을지');

    // 3단 헤더
    const headerRow1 = sheet.getRow(1);
    const headerRow2 = sheet.getRow(2);
    const headerRow3 = sheet.getRow(3);

    // 1단 헤더
    sheet.mergeCells('A1:A3');
    sheet.getCell('A1').value = 'NO.';

    sheet.mergeCells('B1:B3');
    sheet.getCell('B1').value = '품명';

    sheet.mergeCells('C1:C3');
    sheet.getCell('C1').value = '규격';

    sheet.mergeCells('D1:D3');
    sheet.getCell('D1').value = '단위';

    sheet.mergeCells('E1:K1');
    sheet.getCell('E1').value = '계 약 내 역 서';

    sheet.mergeCells('L1:L3');
    sheet.getCell('L1').value = '비고';

    // 2단 헤더
    sheet.mergeCells('E2:E3');
    sheet.getCell('E2').value = '수량';

    sheet.mergeCells('F2:G2');
    sheet.getCell('F2').value = '자재비';

    sheet.mergeCells('H2:I2');
    sheet.getCell('H2').value = '노무비';

    sheet.mergeCells('J2:K2');
    sheet.getCell('J2').value = '합계';

    // 3단 헤더
    sheet.getCell('F3').value = '단가';
    sheet.getCell('G3').value = '금액';
    sheet.getCell('H3').value = '단가';
    sheet.getCell('I3').value = '금액';
    sheet.getCell('J3').value = '단가';
    sheet.getCell('K3').value = '금액';

    // 헤더 스타일 적용
    [1, 2, 3].forEach(rowNum => {
        const row = sheet.getRow(rowNum);
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF667EEA' }
            };
            cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    // 데이터 행 추가
    let currentRow = 4;
    let itemNo = 1;

    // 직접공사비 계산
    const directCosts = calculateDirectCosts();

    // 직접공사비 항목들
    const detailRows = generateEstimateDetailRowsData();

    detailRows.forEach(row => {
        const dataRow = sheet.getRow(currentRow);

        dataRow.getCell(1).value = row.no || itemNo++;
        dataRow.getCell(2).value = row.name;
        dataRow.getCell(3).value = row.spec || '';
        dataRow.getCell(4).value = row.unit || '';
        dataRow.getCell(5).value = row.quantity || '';
        dataRow.getCell(6).value = row.materialUnitPrice || '';
        dataRow.getCell(7).value = row.materialAmount || '';
        dataRow.getCell(8).value = row.laborUnitPrice || '';
        dataRow.getCell(9).value = row.laborAmount || '';
        dataRow.getCell(10).value = row.totalUnitPrice || '';
        dataRow.getCell(11).value = row.totalAmount || '';
        dataRow.getCell(12).value = row.remark || '';

        // 스타일 적용
        if (row.type === 'section-header') {
            dataRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
                cell.font = { bold: true };
            });
        } else if (row.type === 'subtotal') {
            dataRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1ECF1' } };
                cell.font = { bold: true };
            });
        } else if (row.type === 'indirect') {
            dataRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
            });
        } else if (row.type === 'total') {
            dataRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF667EEA' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            });
        }

        // 테두리 적용
        dataRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 숫자 셀 오른쪽 정렬 및 천단위 구분
        [5, 6, 7, 8, 9, 10, 11].forEach(colNum => {
            const cell = dataRow.getCell(colNum);
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (typeof cell.value === 'number') {
                cell.numFmt = '#,##0';
            }
        });

        // 품명 왼쪽 정렬
        dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

        currentRow++;
    });

    // 컬럼 너비 설정
    sheet.getColumn(1).width = 40;  // NO
    sheet.getColumn(2).width = 30;  // 품명
    sheet.getColumn(3).width = 15;  // 규격
    sheet.getColumn(4).width = 8;   // 단위
    sheet.getColumn(5).width = 12;  // 수량
    sheet.getColumn(6).width = 15;  // 자재비 단가
    sheet.getColumn(7).width = 15;  // 자재비 금액
    sheet.getColumn(8).width = 15;  // 노무비 단가
    sheet.getColumn(9).width = 15;  // 노무비 금액
    sheet.getColumn(10).width = 15; // 합계 단가
    sheet.getColumn(11).width = 15; // 합계 금액
    sheet.getColumn(12).width = 15; // 비고
}

/**
 * 견적서 데이터 행 생성 (Excel용)
 */
function generateEstimateDetailRowsData() {
    const rows = [];
    const directCosts = calculateDirectCosts();

    // 직접공사비 섹션 헤더
    rows.push({
        no: '',
        name: '직접공사비',
        type: 'section-header'
    });

    // 직접공사비 항목들
    const directItems = [
        { no: '', name: 'A. 인테리어 설계비' },
        { no: '', name: 'B. 가설 및 공사준비 작업' },
        { no: '', name: 'C. 철거공사' },
        { no: '', name: 'D. 인테리어공사' },
        { no: 'D-1', name: '바닥공사' },
        { no: 'D-2', name: '벽체공사' },
        { no: 'D-3', name: '벽체마감공사' },
        { no: 'D-4', name: '유리벽체공사' },
        { no: 'D-5', name: '창호 및 하드웨어 공사' },
        { no: 'D-6', name: '천정공사' },
        { no: 'D-7', name: '천정마감공사' },
        { no: 'D-8', name: '조명기구공사' },
        { no: 'D-9', name: '블라인드공사' },
        { no: 'D-10', name: '실내싸인공사' },
        { no: '', name: 'E. 기계설비공사' },
        { no: 'E-1', name: '공조 및 환기덕트 공사' },
        { no: 'E-2', name: '위생설비 공사' },
        { no: 'E-3', name: '기계 소화설비 공사' },
        { no: 'E-4', name: '기타' },
        { no: '', name: 'F. 전기공사' },
        { no: 'F-1', name: '동력전원설비공사' },
        { no: 'F-2', name: '전열설비공사' },
        { no: 'F-3', name: '전등설비공사' },
        { no: 'F-4', name: '철거및이설공사' },
        { no: 'F-5', name: '자탐 및 유도등공사' },
        { no: 'F-6', name: '전관방송설비공사' },
        { no: '', name: 'G. 제작가구공사' },
        { no: '', name: 'H. 이동식가구공사' },
        { no: '', name: 'I. 기타공사' }
    ];

    directItems.forEach(item => {
        rows.push({
            no: item.no,
            name: item.name,
            spec: '',
            unit: 'LOT',
            quantity: 1.00,
            materialUnitPrice: '',
            materialAmount: '',
            laborUnitPrice: '',
            laborAmount: '',
            totalUnitPrice: '',
            totalAmount: '',
            remark: '',
            type: 'item'
        });
    });

    // 직접공사비 소계
    rows.push({
        no: '',
        name: 'A - TOTAL',
        spec: '',
        unit: '',
        quantity: '',
        materialUnitPrice: '',
        materialAmount: '',
        laborUnitPrice: '',
        laborAmount: '',
        totalUnitPrice: '',
        totalAmount: '',
        remark: '',
        type: 'subtotal'
    });

    // 간접공사비 섹션 헤더
    rows.push({
        no: '',
        name: '간접공사비',
        type: 'section-header'
    });

    const laborTotal = directCosts.laborCost;
    const total = directCosts.totalCost;

    // 간접공사비 항목들
    const indirectItems = [
        { name: '산재보험료 (노무비의 3.75%)', value: 0 },
        { name: '안전관리비 (직접비의 1.99%+5,349,000)', value: 0 },
        { name: '고용보험료 (노무비의 0.87%)', value: 0 },
        { name: '건강보험료 (노무비의 3.23%)', value: 0 },
        { name: '연금보험료 (노무비의 4.5%)', value: 0 },
        { name: '장기요양보험료 (건강보험료의 8.51%)', value: 0 },
        { name: '퇴직공제부금 (노무비의 2.3%)', value: 0 },
        { name: '계약이행증권', value: 0 },
        { name: '영업배상책임보험', value: 0 },
        { name: '하자이행증권', value: 0 },
        { name: '공과잡비 (직접공사비기준)', value: 0 },
        { name: '기업이윤 (직접공사비기준)', value: 0 }
    ];

    let indirectTotal = 0;

    indirectItems.forEach(item => {
        indirectTotal += item.value;
        rows.push({
            no: '',
            name: item.name,
            spec: '',
            unit: 'LOT',
            quantity: 1.00,
            materialUnitPrice: '',
            materialAmount: '',
            laborUnitPrice: '',
            laborAmount: Math.round(item.value) || '',
            totalUnitPrice: '',
            totalAmount: Math.round(item.value) || '',
            remark: '',
            type: 'indirect'
        });
    });

    // 간접공사비 소계
    rows.push({
        no: '',
        name: 'B - TOTAL',
        spec: '',
        unit: '',
        quantity: '',
        materialUnitPrice: '',
        materialAmount: '',
        laborUnitPrice: '',
        laborAmount: '',
        totalUnitPrice: '',
        totalAmount: '',
        remark: '',
        type: 'subtotal'
    });

    // 총 합계
    const grandTotal = 0; // 모든 금액이 0이므로
    rows.push({
        no: '',
        name: 'GRAND TOTAL (A+B)',
        spec: '',
        unit: '',
        quantity: '',
        materialUnitPrice: '',
        materialAmount: '',
        laborUnitPrice: '',
        laborAmount: '',
        totalUnitPrice: '',
        totalAmount: '',
        remark: '',
        type: 'total'
    });

    return rows;
}

// =============================================================================
// Excel 내보내기 드롭다운 관리
// =============================================================================

/**
 * Excel 내보내기 드롭다운 토글
 */
window.toggleExportDropdown = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('exportDropdown');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
};

/**
 * 드롭다운 닫기
 */
window.closeExportDropdown = function() {
    const dropdown = document.getElementById('exportDropdown');
    if (dropdown) dropdown.style.display = 'none';
};

/**
 * 발주서 Excel 내보내기 (향후 구현)
 */
window.exportOrderForm = function() {
    closeExportDropdown();
    alert('발주서 Excel 내보내기 기능은 준비 중입니다.');
    // TODO: 발주서 Excel 내보내기 구현
};

/**
 * 견적서 Excel 내보내기
 */
window.exportEstimate = function() {
    closeExportDropdown();
    exportEstimateToExcel();
};

// 외부 클릭 시 드롭다운 닫기
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('exportDropdown');
    const button = event.target.closest('[onclick*="toggleExportDropdown"]');

    if (!button && dropdown && dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    }
});

console.log('✅ wall-cost-calculator.js 로드 완료');