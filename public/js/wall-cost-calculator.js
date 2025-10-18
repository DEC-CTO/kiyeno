/**
 * 벽체 계산 결과 하단 슬라이드 패널 관리
 */

// 전역 변수
let calculationResults = [];
window.calculationResults = calculationResults;  // 전역 노출
let isResultsPanelOpen = false;
let currentActiveTab = 'comparison';
let isOrderFormRendered = false;
let isPriceComparisonRendered = false;

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

        // 렌더링 플래그 리셋 (새 계산 시 재렌더링되도록)
        isOrderFormRendered = false;
        isPriceComparisonRendered = false;

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

    // 탭별 렌더링 (최초 1회만)
    if (tabName === 'priceComparison') {
        if (!isPriceComparisonRendered) {
            renderPriceComparisonTab();
            isPriceComparisonRendered = true;
        }
    } else if (tabName === 'orderForm') {
        if (!isOrderFormRendered) {
            renderOrderFormTab();
            isOrderFormRendered = true;
        }
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
                                <input type="text" id="orderFormSiteName" placeholder="현장명을 입력하세요" style="width: 100%; border: 1px solid #ddd; padding: 6px; font-size: 12px;">
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

    // 경비 입력 이벤트 리스너 추가
    attachExpenseInputListeners();

    // ✅ 최초 렌더링 후 소계 행 업데이트 (정확한 테이블 값으로 재계산)
    updateSubtotalRows();

    // 조정비율 입력 필드 이벤트 리스너
    const contractRatioInput = document.getElementById('contractRatioInput');
    if (contractRatioInput) {
        contractRatioInput.addEventListener('input', function() {
            console.log('🔄 조정비율 변경됨:', this.value);
            // 실시간 업데이트 (재렌더링 없이 DOM만 수정)
            updateContractPricesRealtime();
        });
    }
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
async function generateTypeSummaryRow(typeName, results, typeIndex) {
    // 타입별 전체 면적 합계
    const totalArea = results.reduce((sum, r) => sum + r.area, 0);

    // ✅ THK 계산: 석고보드 두께(중복 허용) + 스터드 넓이(1개만)
    let totalThickness = 0;
    let studWidthAdded = false; // 스터드는 1개만 추가

    // ✅ 단가 계산: 표시되는 컴포넌트의 단가만 합산
    let totalMaterialUnitPrice = 0;
    let totalLaborUnitPrice = 0;

    // 레이어 순서 정의 (발주서 표시 순서와 동일)
    const layerOrder = [
        'layer3_1', 'layer2_1', 'layer1_1',
        'column1', 'infill',
        'layer1_2', 'layer2_2', 'layer3_2',
        'column2', 'channel', 'runner'
    ];

    // 첫 번째 결과만 사용 (대표값)
    if (results.length > 0) {
        const result = results[0];

        // ✅ layerOrder 순서대로 순회 (모든 레이어 처리)
        for (const layerKey of layerOrder) {
            const layer = result.layerPricing[layerKey];

            if (!layer || !layer.materialName) continue;

            // 일위대가 아이템 조회
            const unitPriceItem = await findUnitPriceItemByIdOrName(layer.materialName);

            if (unitPriceItem && unitPriceItem.components) {
                for (const component of unitPriceItem.components) {
                    const componentName = component.name || '';

                    // 표시되는 컴포넌트만 처리
                    if (!shouldDisplayComponent(componentName)) continue;

                    // 자재 DB 조회
                    const materialData = await findMaterialByIdInDB(component.materialId);

                    // THK 계산
                    if (isGypsumBoard(componentName) && materialData?.t) {
                        // ✅ 석고보드: 모든 레이어의 두께 누적 (중복 허용)
                        totalThickness += parseFloat(materialData.t) || 0;
                        console.log(`  📏 석고보드 두께 추가: ${materialData.t} (레이어: ${layerKey})`);
                    } else if (isStud(componentName) && !studWidthAdded) {
                        // ✅ 스터드: size 필드 파싱하여 넓이 추출
                        const studWidth = materialData?.w || parseSizeField(materialData?.size).width;
                        if (studWidth) {
                            totalThickness += parseFloat(studWidth) || 0;
                            studWidthAdded = true;
                            console.log(`  📏 스터드 넓이 추가: ${studWidth} (레이어: ${layerKey})`);
                        }
                    }

                    // ✅ 단가 합산
                    totalMaterialUnitPrice += parseFloat(component.materialPrice) || 0;
                    totalLaborUnitPrice += parseFloat(component.laborPrice) || 0;
                }
            }
        }
    }

    // ✅ 조정비율 가져오기 (기본값 1.2)
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

    // ✅ 발주단가 (기준값)
    const orderMaterialUnitPrice = totalMaterialUnitPrice;
    const orderLaborUnitPrice = totalLaborUnitPrice;

    // ✅ 계약도급 단가 (발주단가 × 조정비율)
    const contractMaterialUnitPrice = orderMaterialUnitPrice * contractRatio;
    const contractLaborUnitPrice = orderLaborUnitPrice * contractRatio;

    // ✅ 금액 계산
    const orderMaterialCost = orderMaterialUnitPrice * totalArea;
    const orderLaborCost = orderLaborUnitPrice * totalArea;
    const contractMaterialCost = contractMaterialUnitPrice * totalArea;
    const contractLaborCost = contractLaborUnitPrice * totalArea;

    // ✅ 경비 (타입 요약 행은 경비 0)
    const expenseUnitPrice = 0;
    const expenseCost = 0;

    // ✅ 합계 계산
    const contractTotalUnitPrice = contractMaterialUnitPrice + contractLaborUnitPrice + expenseUnitPrice;
    const contractTotalCost = contractMaterialCost + contractLaborCost + expenseCost;
    const orderTotalUnitPrice = orderMaterialUnitPrice + orderLaborUnitPrice + expenseUnitPrice;
    const orderTotalCost = orderMaterialCost + orderLaborCost + expenseCost;

    console.log(`📐 ${typeName} THK: ${totalThickness}, 조정비율: ${contractRatio}, 계약도급 자재비: ${contractMaterialUnitPrice}, 발주단가 자재비: ${orderMaterialUnitPrice}`);

    return `
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600;">
            <td>1-${typeIndex}</td>
            <td>${typeName}</td>
            <td></td>
            <td>${totalThickness || ''}</td>
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
            <td>M2</td>
            <td></td>
            <td class="number-cell contract-material-price"></td>
            <td class="number-cell contract-material-amount"></td>
            <td class="number-cell contract-labor-price"></td>
            <td class="number-cell contract-labor-amount"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell contract-total-price"></td>
            <td class="number-cell contract-total-amount"></td>
            <td></td>
            <td class="number-cell order-material-price"></td>
            <td class="number-cell order-material-amount"></td>
            <td class="number-cell order-labor-price"></td>
            <td class="number-cell order-labor-amount"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell order-total-price"></td>
            <td class="number-cell order-total-amount"></td>
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

function isMagazinePiece(name) {
    return name && name.includes('피스') && !name.includes('석고피스');
}

function isNailingBullet(name) {
    return name && name.includes('타정총알');
}

function isWeldingRod(name) {
    return name && name.includes('용접봉');
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

    if (isStud(componentName)) {
        // 스터드: M 컬럼에 (component.quantity × 면적합계) 표시, 0단위 반올림, 천단위 구분
        atValue = spacingValue || '';
        thicknessValue = sizeData.thickness || '';
        widthValue = sizeData.width || '';
        heightValue = sizeData.height || '';
        const componentQty = parseFloat(component.quantity) || 0;
        const mValueRaw = Math.round(componentQty * totalArea);
        mValue = mValueRaw.toLocaleString();

        console.log(`  📏 스터드 (${componentName}):`, {
            Type: wallTypeCode,
            '@': atValue,
            '두께': thicknessValue,
            '넓이': widthValue,
            '높이': heightValue,
            'M': `${mValue} (${componentQty} × ${totalArea})`
        });

    } else if (isRunner(componentName)) {
        // 런너: @ 컬럼 비움, M 컬럼에 (component.quantity × 면적합계) 표시
        atValue = '';  // ✅ 런너는 @ 값 비움
        thicknessValue = sizeData.thickness || '';
        widthValue = sizeData.width || '';
        heightValue = sizeData.height || '';
        const componentQty = parseFloat(component.quantity) || 0;
        const mValueRaw = Math.round(componentQty * totalArea);
        mValue = mValueRaw.toLocaleString();

        console.log(`  📏 런너 (${componentName}):`, {
            Type: wallTypeCode,
            '@': '(비움)',
            '두께': thicknessValue,
            '넓이': widthValue,
            '높이': heightValue,
            'M': `${mValue} (${componentQty} × ${totalArea})`
        });

    } else if (isGypsumBoard(componentName)) {
        // 석고보드: THK만 채움 (✅ materialData.t 필드 사용)
        wallThk = materialData?.t || sizeData.thickness || '';

        console.log(`  📏 석고보드 (${componentName}):`, {
            THK: wallThk,
            Type: wallTypeCode
        });
    }

    // C. 환산 컬럼: 석고보드만 1장->m2 계산
    let conversionM2 = '';
    let sheetQuantity = '';

    if (isGypsumBoard(componentName) && materialData) {
        // ✅ (W/1000) * (H/1000) 소수 셋째자리 반올림
        const w = parseFloat(materialData.w) || 0;
        const h = parseFloat(materialData.h) || 0;
        if (w > 0 && h > 0) {
            conversionM2 = ((w / 1000) * (h / 1000)).toFixed(3);
            console.log(`  📐 석고보드 1장당 면적: ${conversionM2} m² (W:${w}, H:${h})`);
        }
    }

    // D. 단가 및 금액 계산
    const area = totalArea || result.area || 0;  // ✅ 타입별 전체 면적 합계 사용
    const componentQuantity = parseFloat(component.quantity) || 0;

    // ✅ 수량 컬럼: 모든 자재 동일하게 면적만 표시
    const displayQuantity = area;

    // ✅ 조정비율 가져오기 (기본값 1.2)
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

    // ✅ 발주단가 (기준값)
    const orderMaterialUnitPrice = parseFloat(component.materialPrice) || 0;
    const orderLaborUnitPrice = parseFloat(component.laborPrice) || 0;

    // ✅ 계약도급 단가 (발주단가 × 조정비율)
    const contractMaterialUnitPrice = orderMaterialUnitPrice * contractRatio;
    const contractLaborUnitPrice = orderLaborUnitPrice * contractRatio;

    // ✅ 금액 계산
    const contractMaterialAmount = contractMaterialUnitPrice * area;
    const contractLaborAmount = contractLaborUnitPrice * area;
    const orderMaterialAmount = orderMaterialUnitPrice * area;
    const orderLaborAmount = orderLaborUnitPrice * area;

    // ✅ 합계
    const contractTotalUnitPrice = contractMaterialUnitPrice + contractLaborUnitPrice;
    const contractTotalAmount = contractMaterialAmount + contractLaborAmount;
    const orderTotalUnitPrice = orderMaterialUnitPrice + orderLaborUnitPrice;
    const orderTotalAmount = orderMaterialAmount + orderLaborAmount;

    // 석고보드 장 수량 재계산: 실제수량 ÷ 1장당m2 (0단위 반올림)
    if (isGypsumBoard(componentName) && conversionM2) {
        const m2PerSheet = parseFloat(conversionM2);
        if (m2PerSheet > 0) {
            const actualQuantity = area * componentQuantity;
            sheetQuantity = Math.round(actualQuantity / m2PerSheet);  // ✅ 0단위 반올림
            console.log(`  📦 석고보드 장 수량: ${sheetQuantity}장 (면적:${area} × 소요량:${componentQuantity} ÷ 1장당:${m2PerSheet})`);
        }
    }

    console.log(`  💰 단가 계산 (${componentName}):`, {
        '조정비율': contractRatio,
        '계약도급_재료비단가': contractMaterialUnitPrice,
        '계약도급_재료비금액': contractMaterialAmount,
        '계약도급_노무비단가': contractLaborUnitPrice,
        '계약도급_노무비금액': contractLaborAmount,
        '계약도급_합계단가': contractTotalUnitPrice,
        '계약도급_합계금액': contractTotalAmount,
        '발주단가_재료비단가': orderMaterialUnitPrice,
        '발주단가_재료비금액': orderMaterialAmount,
        '발주단가_노무비단가': orderLaborUnitPrice,
        '발주단가_노무비금액': orderLaborAmount,
        '발주단가_합계단가': orderTotalUnitPrice,
        '발주단가_합계금액': orderTotalAmount
    });

    // E. HTML 생성
    return `
        <tr style="background: white;" data-row="${rowNumber}">
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
            <td><input type="text" class="supplier-input" data-row="${rowNumber}" placeholder="제공자" style="width: 100%; text-align: center; border: 1px solid #ddd; padding: 4px;"></td>
            <td>${conversionM2}</td>
            <td>${sheetQuantity ? parseInt(sheetQuantity).toLocaleString() : ''}</td>
            <td>M2</td>
            <td class="quantity-cell">${displayQuantity.toFixed(2)}</td>
            <td class="number-cell contract-material-price">${Math.round(contractMaterialUnitPrice).toLocaleString()}</td>
            <td class="number-cell contract-material-amount">${Math.round(contractMaterialAmount).toLocaleString()}</td>
            <td class="number-cell contract-labor-price">${Math.round(contractLaborUnitPrice).toLocaleString()}</td>
            <td class="number-cell contract-labor-amount">${Math.round(contractLaborAmount).toLocaleString()}</td>
            <td><input type="text" class="expense-input contract-expense-price" data-row="${rowNumber}" value="0" style="width: 100%; text-align: right; border: 1px solid #ddd; padding: 4px; font-size: 11px;"></td>
            <td class="number-cell expense-amount contract-expense-amount" data-row="${rowNumber}">0</td>
            <td class="number-cell contract-total-price" data-row="${rowNumber}">${Math.round(contractTotalUnitPrice).toLocaleString()}</td>
            <td class="number-cell contract-total-amount" data-row="${rowNumber}">${Math.round(contractTotalAmount).toLocaleString()}</td>
            <td></td>
            <td class="number-cell order-material-price">${Math.round(orderMaterialUnitPrice).toLocaleString()}</td>
            <td class="number-cell order-material-amount">${Math.round(orderMaterialAmount).toLocaleString()}</td>
            <td class="number-cell order-labor-price">${Math.round(orderLaborUnitPrice).toLocaleString()}</td>
            <td class="number-cell order-labor-amount">${Math.round(orderLaborAmount).toLocaleString()}</td>
            <td><input type="text" class="expense-input order-expense-price" data-row="${rowNumber}" value="0" style="width: 100%; text-align: right; border: 1px solid #ddd; padding: 4px; font-size: 11px;"></td>
            <td class="number-cell expense-amount order-expense-amount" data-row="${rowNumber}">0</td>
            <td class="number-cell order-total-price" data-row="${rowNumber}">${Math.round(orderTotalUnitPrice).toLocaleString()}</td>
            <td class="number-cell order-total-amount" data-row="${rowNumber}">${Math.round(orderTotalAmount).toLocaleString()}</td>
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
 * ============================================
 * Phase 1: 데이터 수집 및 분류 함수들
 * ============================================
 */

/**
 * 일위대가 ID에서 상위 카테고리 추출
 * @param {string} unitPriceId - 일위대가 ID
 * @returns {string} - 카테고리 (STUD, 석고보드, RUNNER, 그라스울, ETC)
 */
function extractParentCategory(unitPriceId) {
    if (!unitPriceId) return 'ETC';

    const id = unitPriceId.toUpperCase();

    if (id.includes('STUD')) return 'STUD';
    if (id.includes('석고보드') || id.includes('GYPSUM')) return '석고보드';
    if (id.includes('RUNNER') || id.includes('런너')) return 'RUNNER';
    if (id.includes('그라스울') || id.includes('GLASSWOOL')) return '그라스울';

    return 'ETC';
}

/**
 * 컴포넌트 이름에서 자재 타입 추출
 * @param {string} componentName - 컴포넌트 이름
 * @returns {string} - 자재 타입
 */
function getComponentType(componentName) {
    if (!componentName) return 'ETC';

    const name = componentName.toUpperCase();

    if (name.includes('스터드') || name.includes('STUD')) return 'STUD';
    if (name.includes('런너') || name.includes('RUNNER')) return 'RUNNER';
    if (name.includes('석고보드') || name.includes('GYPSUM')) return '석고보드';
    if (name.includes('그라스울') || name.includes('GLASSWOOL')) return '그라스울';
    if (name.includes('피스') || name.includes('PIECE')) return 'PIECE';
    if (name.includes('총알') || name.includes('BULLET')) return 'BULLET';
    if (name.includes('용접') || name.includes('WELDING')) return 'WELDING';

    return 'ETC';
}

/**
 * 간접비 여부 판별
 * @param {string} componentName - 컴포넌트 이름
 * @returns {boolean} - 간접비 여부
 */
function isIndirectCost(componentName) {
    const indirectKeywords = [
        '로스', '코스트',
        '운반비', '할증',
        '공수', '보조',
        '타수정리', '세'
    ];

    return indirectKeywords.some(keyword => componentName.includes(keyword));
}

/**
 * 간접비 이름 생성 (카테고리 접두사 추가)
 * @param {string} indirectCostName - 간접비 이름
 * @param {string} parentCategory - 상위 카테고리
 * @returns {string} - 생성된 이름 (예: "STUD 자재로스")
 */
function generateIndirectCostName(indirectCostName, parentCategory) {
    if (parentCategory === 'ETC') {
        return indirectCostName;
    }

    return `${parentCategory} ${indirectCostName}`;
}

/**
 * 타입별 모든 구성품 수집 및 그룹핑
 * @param {Array} results - 같은 타입의 계산 결과 배열
 * @returns {Array} - 그룹핑된 구성품 배열
 */
async function collectAndGroupComponents(results) {
    const allComponents = [];
    const totalArea = results.reduce((sum, r) => sum + r.area, 0);
    const result = results[0];

    const layerOrder = [
        'layer3_1', 'layer2_1', 'layer1_1',
        'column1', 'infill',
        'layer1_2', 'layer2_2', 'layer3_2',
        'column2', 'channel', 'runner'
    ];

    // 각 레이어 순회
    for (const layerKey of layerOrder) {
        const layer = result.layerPricing[layerKey];
        if (!layer || !layer.materialName) continue;

        const unitPriceItem = await findUnitPriceItemByIdOrName(layer.materialName);
        if (!unitPriceItem?.components) continue;

        // 상위 카테고리 추출
        const parentCategory = extractParentCategory(unitPriceItem.id);

        // ✅ 모든 구성품 수집 (필터링 제거)
        for (const component of unitPriceItem.components) {
            // 자재 DB 조회
            const materialData = await findMaterialByIdInDB(component.materialId);

            allComponents.push({
                name: component.name || '',
                spec: component.spec || '',
                unit: component.unit || 'EA',
                materialPrice: parseFloat(component.materialPrice) || 0,
                laborPrice: parseFloat(component.laborPrice) || 0,
                laborAmount: parseFloat(component.laborAmount) || 0,
                quantity: parseFloat(component.quantity) || 0,
                area: totalArea,
                parentCategory: parentCategory,
                unitPriceId: unitPriceItem.id,
                // ✅ 추가 데이터
                size: component.size || materialData?.size || '',
                materialData: materialData,
                unitPriceItem: unitPriceItem,
                wallType: result.wallType,
            });
        }
    }

    // 그룹핑
    return groupComponentsByName(allComponents);
}

/**
 * 품명+규격+단위+카테고리로 그룹핑
 * @param {Array} components - 구성품 배열
 * @returns {Array} - 그룹핑된 구성품 배열
 */
function groupComponentsByName(components) {
    const grouped = {};

    for (const comp of components) {
        // 그룹핑 키: 품명 + 규격 + 단위 + 카테고리
        const key = `${comp.name}|${comp.spec}|${comp.unit}|${comp.parentCategory}`;

        if (!grouped[key]) {
            grouped[key] = {
                name: comp.name,
                spec: comp.spec,
                unit: comp.unit,
                materialPrice: comp.materialPrice,
                laborPrice: comp.laborPrice,
                laborAmount: comp.laborAmount,
                quantity: comp.quantity,
                totalQuantity: 0,
                area: comp.area,
                parentCategory: comp.parentCategory,
                // ✅ 추가 데이터 보존 (첫 번째 것 사용)
                size: comp.size,
                materialData: comp.materialData,
                unitPriceItem: comp.unitPriceItem,
                wallType: comp.wallType,
            };
        }

        // 수량 합산
        grouped[key].totalQuantity += comp.quantity;
    }

    return Object.values(grouped);
}

/**
 * 직접비/간접비 분리
 * @param {Array} groupedComponents - 그룹핑된 구성품 배열
 * @returns {Object} - { directCosts, indirectCosts }
 */
function separateDirectAndIndirectCosts(groupedComponents) {
    const directCosts = [];
    const indirectCosts = [];

    for (const comp of groupedComponents) {
        if (isIndirectCost(comp.name)) {
            // 간접비: 카테고리별 이름 생성
            const newName = generateIndirectCostName(comp.name, comp.parentCategory);

            indirectCosts.push({
                ...comp,
                name: newName,
                displayCategory: comp.parentCategory,
            });
        } else {
            // 직접비
            directCosts.push(comp);
        }
    }

    return {
        directCosts,
        indirectCosts,
    };
}

/**
 * 자재 종류별 정렬
 * @param {Array} components - 구성품 배열
 * @returns {Array} - 정렬된 구성품 배열
 */
function sortComponents(components) {
    const priority = {
        'STUD': 1,
        'RUNNER': 2,
        '석고보드': 3,
        '그라스울': 4,
        'PIECE': 5,
        'BULLET': 6,
        'WELDING': 7,
        'ETC': 99,
    };

    return components.sort((a, b) => {
        const typeA = getComponentType(a.name);
        const typeB = getComponentType(b.name);

        const priorityA = priority[typeA] || 50;
        const priorityB = priority[typeB] || 50;

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        return a.name.localeCompare(b.name, 'ko');
    });
}

/**
 * ============================================
 * Phase 2: 소계/합계 행 생성 함수들
 * ============================================
 */

/**
 * 소계 행 생성 (회색 배경)
 * @param {Array} components - 구성품 배열
 * @param {string} label - 소계 라벨 (예: "소계 (직접자재)")
 * @returns {string} - HTML 문자열
 */
function generateSubtotalRow(components, label) {
    // 계약도급 단가 합계
    let contractMaterialPriceSum = 0;
    let contractLaborPriceSum = 0;
    let contractExpensePriceSum = 0;

    // 계약도급 금액 합계
    let contractMaterialAmountSum = 0;
    let contractLaborAmountSum = 0;
    let contractExpenseAmountSum = 0;

    // 발주단가 단가 합계
    let orderMaterialPriceSum = 0;
    let orderLaborPriceSum = 0;
    let orderExpensePriceSum = 0;

    // 발주단가 금액 합계
    let orderMaterialAmountSum = 0;
    let orderLaborAmountSum = 0;
    let orderExpenseAmountSum = 0;

    // 수량 합계
    let mValueSum = 0;           // 11번 칸럼 (mValue) 합계
    let sheetQuantitySum = 0;    // 14번 칸럼 (매/장) 합계
    let displayQuantitySum = 0;  // 16번 칸럼 (displayQuantity) 합계

    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

    for (const comp of components) {
        // 1m² 단가 계산
        const matPrice1m2 = comp.materialPrice * comp.quantity;
        const labPrice1m2 = comp.laborAmount;

        // 발주단가 - 단가 합계
        orderMaterialPriceSum += matPrice1m2;
        orderLaborPriceSum += labPrice1m2;

        // 발주단가 - 금액 합계 (1m² 단가 × 면적)
        orderMaterialAmountSum += matPrice1m2 * comp.area;
        orderLaborAmountSum += labPrice1m2 * comp.area;

        // 계약도급 - 단가 합계 (발주단가 × 조정비율)
        contractMaterialPriceSum += matPrice1m2 * contractRatio;
        contractLaborPriceSum += labPrice1m2 * contractRatio;

        // 계약도급 - 금액 합계 (발주 금액 × 조정비율)
        contractMaterialAmountSum += (matPrice1m2 * comp.area) * contractRatio;
        contractLaborAmountSum += (labPrice1m2 * comp.area) * contractRatio;

        // 수량 합산
        mValueSum += comp.totalQuantity * comp.area;  // 11번 칸럼 (mValue)

        // 16번 칸럼 (displayQuantity) - 석고보드는 area × totalQuantity
        let currentDisplayQuantity = 0;
        if (comp.gypsumBoardDisplayQuantity !== undefined && comp.gypsumBoardDisplayQuantity !== null) {
            currentDisplayQuantity = comp.gypsumBoardDisplayQuantity;
            displayQuantitySum += comp.gypsumBoardDisplayQuantity;
        } else if (comp.parentCategory === '석고보드') {
            currentDisplayQuantity = comp.area * comp.totalQuantity;
            displayQuantitySum += comp.area * comp.totalQuantity;
        } else {
            displayQuantitySum += comp.area;
        }

        // 14번 칸럼 (매/장) - 석고보드만 계산
        if (comp.parentCategory === '석고보드' && comp.materialData) {
            console.log(`📦 석고보드 장 계산: ${comp.name}`);
            console.log(`  - materialData:`, comp.materialData);
            const width = parseFloat(comp.materialData.width) || 0;
            const height = parseFloat(comp.materialData.height) || 0;
            const m2PerSheet = width * height;
            console.log(`  - width: ${width}, height: ${height}, m2PerSheet: ${m2PerSheet}`);
            console.log(`  - currentDisplayQuantity: ${currentDisplayQuantity}`);
            if (m2PerSheet > 0 && currentDisplayQuantity > 0) {
                const sheetCount = Math.round(currentDisplayQuantity / m2PerSheet);
                console.log(`  - 장 수량: ${sheetCount}`);
                sheetQuantitySum += sheetCount;
            }
        }
    }

    // 합계 계산
    const contractTotalPriceSum = contractMaterialPriceSum + contractLaborPriceSum + contractExpensePriceSum;
    const contractTotalAmountSum = contractMaterialAmountSum + contractLaborAmountSum + contractExpenseAmountSum;
    const orderTotalPriceSum = orderMaterialPriceSum + orderLaborPriceSum + orderExpensePriceSum;
    const orderTotalAmountSum = orderMaterialAmountSum + orderLaborAmountSum + orderExpenseAmountSum;

    console.log(`✅ 소계 수량 합계 - 11번: ${mValueSum}, 14번(장): ${sheetQuantitySum}, 16번: ${displayQuantitySum}`);

    return `
        <tr style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); font-weight: 600;">
            <td></td>
            <td></td>
            <td>${label}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(mValueSum).toLocaleString()}</td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(sheetQuantitySum).toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${displayQuantitySum.toFixed(2)}</td>
            <!-- 계약도급 -->
            <td class="number-cell">${Math.round(contractMaterialPriceSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(contractMaterialAmountSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(contractLaborPriceSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(contractLaborAmountSum).toLocaleString()}</td>
            <td class="number-cell">0</td>
            <td class="number-cell">0</td>
            <td class="number-cell">${Math.round(contractTotalPriceSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(contractTotalAmountSum).toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td class="number-cell">${Math.round(orderMaterialPriceSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(orderMaterialAmountSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(orderLaborPriceSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(orderLaborAmountSum).toLocaleString()}</td>
            <td class="number-cell">0</td>
            <td class="number-cell">0</td>
            <td class="number-cell">${Math.round(orderTotalPriceSum).toLocaleString()}</td>
            <td class="number-cell">${Math.round(orderTotalAmountSum).toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 카테고리별 간접비 계산
 * @param {string} categoryName - 카테고리명 ("스터드" or "석고보드")
 * @param {number} materialTotal - 해당 카테고리 자재비 합계
 * @param {number} laborTotal - 해당 카테고리 노무비 합계
 * @param {Object} fixedRates - 간접비 비율
 * @returns {Array} - 간접비 항목 배열
 */
function calculateIndirectCosts(categoryName, materialTotal, laborTotal, fixedRates) {
    console.log(`💰 [${categoryName}] 간접비 계산 시작`);
    console.log(`  - 자재비 합계: ${materialTotal.toLocaleString()}`);
    console.log(`  - 노무비 합계: ${laborTotal.toLocaleString()}`);
    console.log(`  - fixedRates:`, fixedRates);

    const materialLoss = Math.round(materialTotal * fixedRates.materialLoss / 100);
    const transportCost = Math.round(materialTotal * fixedRates.transportCost / 100);
    const materialProfitBase = materialTotal + materialLoss + transportCost;
    const materialProfit = Math.round(materialProfitBase * fixedRates.materialProfit / 100);
    const toolExpense = Math.round(laborTotal * fixedRates.toolExpense / 100);

    console.log(`  ✅ 자재로스: ${materialLoss.toLocaleString()}`);
    console.log(`  ✅ 자재운반비: ${transportCost.toLocaleString()}`);
    console.log(`  ✅ 자재비 이윤: ${materialProfit.toLocaleString()}`);
    console.log(`  ✅ 공구손료: ${toolExpense.toLocaleString()}`);

    return [
        {
            name: `${categoryName} 자재로스`,
            spec: '자재비의',
            unit: '%',
            rate: fixedRates.materialLoss,
            amount: materialLoss
        },
        {
            name: `${categoryName} 자재운반비 및 양중비`,
            spec: '자재비의',
            unit: '%',
            rate: fixedRates.transportCost,
            amount: transportCost
        },
        {
            name: `${categoryName} 자재비 이윤`,
            spec: '자재비의',
            unit: '%',
            rate: fixedRates.materialProfit,
            amount: materialProfit
        },
        {
            name: `${categoryName} 공구손료 및 기계경비`,
            spec: '노무비의',
            unit: '%',
            rate: fixedRates.toolExpense,
            amount: toolExpense
        }
    ];
}

/**
 * 간접비 행 생성 (노란색 배경)
 * @param {Object} item - 간접비 항목 객체
 * @param {number} rowNumber - 행 번호
 * @returns {string} - HTML 문자열
 */
function generateIndirectCostRow(item, rowNumber) {
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
    const contractAmount = Math.round(item.amount * contractRatio);

    return `
        <tr style="background: #fffacd;">
            <td>${rowNumber}</td>
            <td></td>
            <td>${item.name}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>${item.spec}</td>
            <td>${item.rate}%</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <!-- 계약도급 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">0</td>
            <td class="number-cell">${contractAmount.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${contractAmount.toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">0</td>
            <td class="number-cell">${item.amount.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${item.amount.toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 간접비 소계 행 생성 (노란색 배경)
 * @param {Array} indirectCostItems - 간접비 항목 배열
 * @returns {string} - HTML 문자열
 */
function generateIndirectCostSubtotalRow(indirectCostItems) {
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

    // 간접비 합계 계산
    let orderExpenseSum = 0;
    for (const item of indirectCostItems) {
        orderExpenseSum += item.amount;
    }
    const contractExpenseSum = Math.round(orderExpenseSum * contractRatio);

    return `
        <tr style="background: #fff9c4; font-weight: 600;">
            <td></td>
            <td></td>
            <td>소계 (간접비)</td>
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
            <!-- 계약도급 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">0</td>
            <td class="number-cell">${contractExpenseSum.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${contractExpenseSum.toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">0</td>
            <td class="number-cell">${orderExpenseSum.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${orderExpenseSum.toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 전체 합계 행 생성 (초록색 배경)
 * @param {Array} directCosts - 직접비 배열
 * @param {Array} indirectCostItems - 간접비 항목 배열
 * @returns {string} - HTML 문자열
 */
function generateGrandTotalRow(directCosts, indirectCostItems) {
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

    // 직접비 합계 계산
    let orderMaterialTotal = 0;
    let orderLaborTotal = 0;
    for (const comp of directCosts) {
        const quantity = comp.totalQuantity * comp.area;
        orderMaterialTotal += comp.materialPrice * quantity;
        orderLaborTotal += comp.laborPrice * quantity;
    }

    // 간접비 합계 계산
    let orderExpenseTotal = 0;
    for (const item of indirectCostItems) {
        orderExpenseTotal += item.amount;
    }

    // 발주단가 총계
    const orderGrandTotal = orderMaterialTotal + orderLaborTotal + orderExpenseTotal;

    // 계약도급 총계
    const contractMaterialTotal = Math.round(orderMaterialTotal * contractRatio);
    const contractLaborTotal = Math.round(orderLaborTotal * contractRatio);
    const contractExpenseTotal = Math.round(orderExpenseTotal * contractRatio);
    const contractGrandTotal = contractMaterialTotal + contractLaborTotal + contractExpenseTotal;

    return `
        <tr style="background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; font-weight: 700; font-size: 1.1em;">
            <td></td>
            <td>총 계</td>
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
            <!-- 계약도급 -->
            <td></td>
            <td class="number-cell">${contractMaterialTotal.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${contractLaborTotal.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${contractExpenseTotal.toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${contractGrandTotal.toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td class="number-cell">${Math.round(orderMaterialTotal).toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${Math.round(orderLaborTotal).toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${Math.round(orderExpenseTotal).toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${Math.round(orderGrandTotal).toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 합계 행 생성 (파란색 배경) - 기존 함수 (호환성 유지)
 * @param {Array} directCosts - 직접비 배열
 * @param {Array} indirectCosts - 간접비 배열
 * @returns {string} - HTML 문자열
 */
function generateTotalRow(directCosts, indirectCosts) {
    const allCosts = [...directCosts, ...indirectCosts];

    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

    let contractTotal = 0;
    let orderTotal = 0;

    for (const comp of allCosts) {
        // 1m² 단가 계산
        const matPrice1m2 = comp.materialPrice * comp.quantity;
        const labPrice1m2 = comp.laborAmount;

        // 발주 총액 = 1m² 단가 × 면적
        orderTotal += (matPrice1m2 + labPrice1m2) * comp.area;

        // 계약도급 총액 = 발주 총액 × 조정비율
        contractTotal += ((matPrice1m2 + labPrice1m2) * comp.area) * contractRatio;
    }

    return `
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 700; font-size: 1.1em;">
            <td></td>
            <td>합 계</td>
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
            <!-- 계약도급 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(contractTotal).toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(orderTotal).toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 그룹핑된 구성품 행 생성
 * @param {Object} component - 구성품 객체
 * @param {number} rowNumber - 행 번호
 * @returns {string} - HTML 문자열
 */
function generateGroupedComponentRow(component, rowNumber) {
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
    const area = component.area;
    const componentName = component.name;
    const materialData = component.materialData;
    const unitPriceItem = component.unitPriceItem;

    // ✅ WALL 및 개수 컬럼 채우기
    const wallTypeCode = component.wallType?.wallType || '';
    const sizeData = parseSizeField(component.size);
    const spacingValue = extractSpacingValue(unitPriceItem?.basic?.spacing);

    let wallThk = '';
    let atValue = '';
    let thicknessValue = '';
    let widthValue = '';
    let heightValue = '';
    let mValue = '';

    // ✅ 환산 컬럼: 석고보드만
    let conversionM2 = '';
    let sheetQuantity = '';
    let gypsumBoardDisplayQuantity = null;  // 석고보드 16번 컬럼 값 저장용

    if (isStud(componentName)) {
        // 스터드: @, 두께, 넓이, 높이, 수량
        atValue = spacingValue || '';
        thicknessValue = sizeData.thickness || '';
        widthValue = sizeData.width || '';
        heightValue = sizeData.height || '';
        const mValueRaw = Math.round(component.totalQuantity * area);
        mValue = mValueRaw.toLocaleString();

    } else if (isRunner(componentName)) {
        // 런너: 두께, 넓이, 높이, 수량
        atValue = '';
        thicknessValue = sizeData.thickness || '';
        widthValue = sizeData.width || '';
        heightValue = sizeData.height || '';
        const mValueRaw = Math.round(component.totalQuantity * area);
        mValue = mValueRaw.toLocaleString();

    } else if (isGypsumBoard(componentName)) {
        // 석고보드: THK만, 11번 컬럼(수량)은 빈칸
        wallThk = materialData?.t || sizeData.thickness || '';
        mValue = ''; // 석고보드는 11번 컬럼 빈칸

        // ✅ 석고보드 환산 계산
        if (materialData) {
            const w = parseFloat(materialData.w) || 0;
            const h = parseFloat(materialData.h) || 0;
            if (w > 0 && h > 0) {
                conversionM2 = ((w / 1000) * (h / 1000)).toFixed(3);
                const m2PerSheet = parseFloat(conversionM2);
                if (m2PerSheet > 0) {
                    // ✅ 석고보드 수량: area × totalQuantity (렌더링 루프에서 전달됨)
                    if (component.gypsumBoardDisplayQuantity) {
                        gypsumBoardDisplayQuantity = component.gypsumBoardDisplayQuantity;
                    } else {
                        gypsumBoardDisplayQuantity = area * component.totalQuantity;
                    }
                    // 14번 컬럼 장: displayQuantity ÷ m2PerSheet
                    sheetQuantity = Math.round(gypsumBoardDisplayQuantity / m2PerSheet);
                }
            }
        }

    } else if (isMagazinePiece(componentName) || isNailingBullet(componentName)) {
        // 매거진피스, 타정총알: 11번 컬럼에 수량 표시 (정수)
        const mValueRaw = Math.round(component.totalQuantity * area);
        mValue = mValueRaw.toLocaleString();

    } else if (isWeldingRod(componentName)) {
        // 용접봉: 11번 컬럼에 수량 표시 (소수점 둘째자리)
        const mValueRaw = (component.totalQuantity * area).toFixed(2);
        mValue = parseFloat(mValueRaw).toLocaleString('ko-KR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // 수량 계산
    let displayQuantity = area;
    // ✅ 석고보드: 16번 컬럼에 area × component.totalQuantity
    if (isGypsumBoard(componentName)) {
        displayQuantity = component.gypsumBoardDisplayQuantity || (area * component.totalQuantity);
    } else if (component.parentCategory === '석고보드' && component.gypsumBoardDisplayQuantity !== null) {
        // ✅ 석고보드 카테고리의 모든 자재: 석고보드 수량 그대로 사용
        displayQuantity = component.gypsumBoardDisplayQuantity;
    }
    const quantity = component.totalQuantity * area;

    // 발주단가 - 1m² 단가 계산 (반올림 적용)
    const orderMatPrice = Math.round(component.materialPrice * component.quantity);  // 1m² 자재비 = 단가 × 수량 (반올림)
    const orderLabPrice = Math.round(component.laborAmount);                         // 1m² 노무비 (반올림)
    const orderMatAmount = orderMatPrice * displayQuantity;  // 총 자재비 = 반올림된 1m² 단가 × 수량(16번 칸럼)
    const orderLabAmount = orderLabPrice * displayQuantity;  // 총 노무비 = 반올림된 1m² 단가 × 수량(16번 칸럼)

    // 계약도급 (단가 반올림 후 수량 곱하기)
    const contractMatPrice = Math.round(orderMatPrice * contractRatio);
    const contractLabPrice = Math.round(orderLabPrice * contractRatio);
    const contractMatAmount = contractMatPrice * displayQuantity;
    const contractLabAmount = contractLabPrice * displayQuantity;

    // 품명 표시
    let displayName = component.name;
    if (component.spec) {
        displayName += ` ${component.spec}`;
    }

    return `
        <tr style="background: white;" data-row="${rowNumber}">
            <td>${rowNumber}</td>
            <td></td>
            <td>${displayName}</td>
            <td>${wallThk}</td>
            <td>${wallTypeCode}</td>
            <td>${atValue}</td>
            <td>${thicknessValue}</td>
            <td>${widthValue}</td>
            <td>${heightValue}</td>
            <td>${component.unit}</td>
            <td>${mValue}</td>
            <td><input type="text" class="supplier-input" data-row="${rowNumber}" placeholder="제공자" style="width: 100%; text-align: center; border: 1px solid #ddd; padding: 4px;"></td>
            <td>${conversionM2}</td>
            <td>${sheetQuantity ? parseInt(sheetQuantity).toLocaleString() : ''}</td>
            <td>M2</td>
            <td class="quantity-cell">${displayQuantity.toFixed(2)}</td>

            <!-- 계약도급 -->
            <td class="number-cell contract-material-price">${Math.round(contractMatPrice).toLocaleString()}</td>
            <td class="number-cell contract-material-amount">${Math.round(contractMatAmount).toLocaleString()}</td>
            <td class="number-cell contract-labor-price">${Math.round(contractLabPrice).toLocaleString()}</td>
            <td class="number-cell contract-labor-amount">${Math.round(contractLabAmount).toLocaleString()}</td>
            <td><input type="text" class="expense-input contract-expense-price" data-row="${rowNumber}" placeholder="0" style="text-align: right;"></td>
            <td class="number-cell contract-expense-amount">0</td>
            <td class="number-cell contract-total-price">${Math.round(contractMatPrice + contractLabPrice).toLocaleString()}</td>
            <td class="number-cell contract-total-amount">${Math.round(contractMatAmount + contractLabAmount).toLocaleString()}</td>
            <td></td>

            <!-- 발주단가 -->
            <td class="number-cell order-material-price">${Math.round(orderMatPrice).toLocaleString()}</td>
            <td class="number-cell order-material-amount">${Math.round(orderMatAmount).toLocaleString()}</td>
            <td class="number-cell order-labor-price">${Math.round(orderLabPrice).toLocaleString()}</td>
            <td class="number-cell order-labor-amount">${Math.round(orderLabAmount).toLocaleString()}</td>
            <td><input type="text" class="expense-input order-expense-price" data-row="${rowNumber}" placeholder="0" style="text-align: right;"></td>
            <td class="number-cell order-expense-amount">0</td>
            <td class="number-cell order-total-price">${Math.round(orderMatPrice + orderLabPrice).toLocaleString()}</td>
            <td class="number-cell order-total-amount">${Math.round(orderMatAmount + orderLabAmount).toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 발주서 데이터 행 생성
 */
async function generateOrderFormDataRows() {
    if (calculationResults.length === 0) {
        return `
            <tr>
                <td colspan="34" style="padding: 20px; text-align: center; color: #6c757d;">
                    벽체 계산 데이터가 없습니다. 먼저 벽체를 선택하고 계산하기를 실행하세요.
                </td>
            </tr>
        `;
    }

    let html = '';
    let typeIndex = 1;
    let rowNumber = 2; // 1번은 현장명 행

    // 타입별로 그룹핑
    const groupedByType = groupResultsByType(calculationResults);

    // 각 타입별 처리
    for (const [typeName, results] of Object.entries(groupedByType)) {
        // 1. 타입 요약 행
        html += await generateTypeSummaryRow(typeName, results, typeIndex);

        // 2. ✅ Phase 1 함수 사용: 구성품 수집 및 그룹핑
        const groupedComponents = await collectAndGroupComponents(results);

        // 3. ✅ 직접비/간접비 분리
        const { directCosts, indirectCosts } = separateDirectAndIndirectCosts(groupedComponents);

        // 4. ✅ 직접비 정렬 및 행 생성
        const sortedDirectCosts = sortComponents(directCosts);

        // ✅ 4-1. 먼저 석고보드 찾아서 displayQuantity 계산
        let gypsumBoardQty = null;
        for (const comp of sortedDirectCosts) {
            if (isGypsumBoard(comp.name)) {
                // 석고보드의 16번 컬럼 값 계산: area × totalQuantity
                gypsumBoardQty = comp.area * comp.totalQuantity;
                console.log(`📦 석고보드 수량 계산: ${comp.area} × ${comp.totalQuantity} = ${gypsumBoardQty}`);
                break;
            }
        }

        // ✅ 4-2. 석고보드 수량을 모든 구성품에 전달
        for (const comp of sortedDirectCosts) {
            comp.gypsumBoardDisplayQuantity = gypsumBoardQty;
            html += generateGroupedComponentRow(comp, rowNumber);
            rowNumber++;
        }

        // 5. ✅ 직접비 소계
        html += generateSubtotalRow(sortedDirectCosts, '소계 (직접자재)');

        // 6. 🆕 간접비 계산 및 행 생성 (카테고리별 분리)
        const unitPriceItem = sortedDirectCosts[0]?.unitPriceItem;
        const fixedRates = unitPriceItem?.fixedRates || {
            materialLoss: 3,
            transportCost: 1.5,
            materialProfit: 15,
            toolExpense: 2
        };

        // 6-1. 직접비를 카테고리별로 분리
        console.log(`🔍 전체 직접비 구성품:`, sortedDirectCosts.map(c => ({ name: c.name, parentCategory: c.parentCategory })));

        const lightWeightCosts = sortedDirectCosts.filter(comp => comp.parentCategory === 'STUD');
        const gypsumCosts = sortedDirectCosts.filter(comp => comp.parentCategory === '석고보드');

        console.log(`📦 경량자재 개수: ${lightWeightCosts.length}, 석고보드 개수: ${gypsumCosts.length}`);

        // 6-2. 스터드(경량자재) 직접비 합계
        let studMaterialTotal = 0;
        let studLaborTotal = 0;
        console.log(`📊 스터드 구성품 상세:`);
        for (const comp of lightWeightCosts) {
            // ✅ 1m² 단가 = materialPrice × quantity
            const materialPricePerM2 = comp.materialPrice * comp.quantity;
            // ✅ 1m² 노무비 = laborAmount (이미 계산된 값)
            const laborPricePerM2 = comp.laborAmount;

            console.log(`  - ${comp.name}: 자재(${comp.materialPrice}×${comp.quantity}=${materialPricePerM2.toFixed(2)}), 노무(${laborPricePerM2}), 면적(${comp.area}m²)`);

            // ✅ 총 금액 = 1m² 단가 × 면적
            studMaterialTotal += materialPricePerM2 * comp.area;
            studLaborTotal += laborPricePerM2 * comp.area;
        }
        console.log(`📊 스터드 직접비 합계 - 자재: ${studMaterialTotal.toLocaleString()}, 노무: ${studLaborTotal.toLocaleString()}`);

        // 6-3. 석고보드 직접비 합계
        let gypsumMaterialTotal = 0;
        let gypsumLaborTotal = 0;
        console.log(`📊 석고보드 구성품 상세:`);
        for (const comp of gypsumCosts) {
            // ✅ 1m² 단가 = materialPrice × quantity
            const materialPricePerM2 = comp.materialPrice * comp.quantity;
            // ✅ 1m² 노무비 = laborAmount (이미 계산된 값)
            const laborPricePerM2 = comp.laborAmount;

            console.log(`  - ${comp.name}: 자재(${comp.materialPrice}×${comp.quantity}=${materialPricePerM2.toFixed(2)}), 노무(${laborPricePerM2}), 면적(${comp.area}m²)`);

            // ✅ 총 금액 = 1m² 단가 × 면적
            gypsumMaterialTotal += materialPricePerM2 * comp.area;
            gypsumLaborTotal += laborPricePerM2 * comp.area;
        }
        console.log(`📊 석고보드 직접비 합계 - 자재: ${gypsumMaterialTotal.toLocaleString()}, 노무: ${gypsumLaborTotal.toLocaleString()}`);
        console.log(`🔧 fixedRates:`, unitPriceItem?.fixedRates);
        console.log(`🔧 사용할 fixedRates:`, fixedRates);

        // 6-4. 스터드 간접비 계산
        const studIndirectCosts = calculateIndirectCosts('스터드', studMaterialTotal, studLaborTotal, fixedRates);

        // 6-5. 석고보드 간접비 계산
        const gypsumIndirectCosts = calculateIndirectCosts('석고보드', gypsumMaterialTotal, gypsumLaborTotal, fixedRates);

        // 6-6. 간접비 행 생성 (스터드 4개 + 석고보드 4개 = 총 8개)
        const allIndirectCosts = [...studIndirectCosts, ...gypsumIndirectCosts];
        for (const item of allIndirectCosts) {
            html += generateIndirectCostRow(item, rowNumber);
            rowNumber++;
        }

        // 7. 🆕 간접비 소계 (8개 항목 합계)
        html += generateIndirectCostSubtotalRow(allIndirectCosts);

        // 8. 🆕 전체 합계 (직접비 + 간접비)
        html += generateGrandTotalRow(sortedDirectCosts, allIndirectCosts);

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
            <th colspan="6">개수</th>
            <th colspan="3">환산</th>
            <th rowspan="3">단위</th>
            <th rowspan="3">수량</th>
            <th colspan="8">
                계약도급
                <input type="text" id="contractRatioInput" value="1.2"
                       style="width: 50px; margin-left: 5px; text-align: center; font-size: 0.9em;"
                       placeholder="1.2" />
            </th>
            <th rowspan="3">비고</th>
            <th colspan="8">발주단가</th>
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
            <th rowspan="2">단위</th>
            <th rowspan="2">수량</th>
            <th rowspan="2">제공자</th>
            <th rowspan="2">1장->m2</th>
            <th rowspan="2">장</th>
            <th colspan="2">자재비</th>
            <th colspan="2">노무비</th>
            <th colspan="2">경비</th>
            <th colspan="2">합계</th>
            <th colspan="2">자재비</th>
            <th colspan="2">노무비</th>
            <th colspan="2">경비</th>
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
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
        </tr>
    `;
}

/**
 * 타입 요약 행의 경비 합계 업데이트
 * @param {HTMLElement} currentRow - 경비가 입력된 데이터 행
 * @param {boolean} isContract - 계약도급 여부
 */
function updateTypeSummaryRowExpense(currentRow, isContract) {
    // 현재 행의 타입명 가져오기 (5번째 컬럼)
    const typeName = currentRow.cells[4]?.textContent.trim();
    if (!typeName) return;

    // 타입 요약 행 찾기 (보라색 배경 행 중 해당 타입)
    const summaryRows = document.querySelectorAll('.order-form-table tbody tr[style*="linear-gradient"]');
    let summaryRow = null;

    for (const row of summaryRows) {
        const rowTypeName = row.cells[1]?.textContent.trim();
        if (rowTypeName === typeName) {
            summaryRow = row;
            break;
        }
    }

    if (!summaryRow) {
        console.warn(`⚠️ 타입 요약 행을 찾을 수 없음: ${typeName}`);
        return;
    }

    // 해당 타입의 모든 데이터 행 찾기 (흰색 배경 행 중 같은 타입)
    const allDataRows = document.querySelectorAll('.order-form-table tbody tr[data-row]');
    const typeDataRows = Array.from(allDataRows).filter(row => {
        const rowType = row.cells[4]?.textContent.trim();
        return rowType === typeName;
    });

    // 계약도급 또는 발주단가 경비 합계 계산
    let totalExpenseAmount = 0;

    typeDataRows.forEach(row => {
        const expenseCell = isContract
            ? row.querySelector('.contract-expense-amount')
            : row.querySelector('.order-expense-amount');

        const expenseValue = parseFloat(expenseCell?.textContent.replace(/,/g, '')) || 0;
        totalExpenseAmount += expenseValue;
    });

    // 타입 요약 행의 경비 셀 업데이트 (계약도급 또는 발주단가)
    // 계약도급: 20번째 컬럼 (경비 단가), 21번째 컬럼 (경비 금액)
    // 발주단가: 28번째 컬럼 (경비 단가), 29번째 컬럼 (경비 금액)
    const expensePriceColIndex = isContract ? 19 : 27;  // 0-based index
    const expenseAmountColIndex = isContract ? 20 : 28;

    // 경비 단가는 0으로 유지 (요약 행은 단가 개념 없음)
    if (summaryRow.cells[expensePriceColIndex]) {
        summaryRow.cells[expensePriceColIndex].textContent = '0';
    }

    // 경비 금액 업데이트
    if (summaryRow.cells[expenseAmountColIndex]) {
        summaryRow.cells[expenseAmountColIndex].textContent = Math.round(totalExpenseAmount).toLocaleString();
    }

    // 타입 요약 행의 합계 재계산 (자재비 + 노무비 + 경비)
    // 1. 단가 읽기
    const materialPriceCell = isContract
        ? summaryRow.querySelector('.contract-material-price')
        : summaryRow.querySelector('.order-material-price');
    const laborPriceCell = isContract
        ? summaryRow.querySelector('.contract-labor-price')
        : summaryRow.querySelector('.order-labor-price');

    const materialPrice = parseFloat(materialPriceCell?.textContent.replace(/,/g, '')) || 0;
    const laborPrice = parseFloat(laborPriceCell?.textContent.replace(/,/g, '')) || 0;

    // 2. 금액 읽기
    const materialAmountCell = isContract
        ? summaryRow.querySelector('.contract-material-amount')
        : summaryRow.querySelector('.order-material-amount');
    const laborAmountCell = isContract
        ? summaryRow.querySelector('.contract-labor-amount')
        : summaryRow.querySelector('.order-labor-amount');

    const materialAmount = parseFloat(materialAmountCell?.textContent.replace(/,/g, '')) || 0;
    const laborAmount = parseFloat(laborAmountCell?.textContent.replace(/,/g, '')) || 0;

    // 3. 합계 단가 계산 (자재비 단가 + 노무비 단가 + 경비 단가)
    // 경비 단가 = 경비 금액 합계
    const totalPrice = Math.round(materialPrice + laborPrice + totalExpenseAmount);

    // 4. 합계 금액 계산 (자재비 금액 + 노무비 금액 + 경비 금액)
    const totalAmount = Math.round(materialAmount + laborAmount + totalExpenseAmount);

    // 5. 합계 단가 셀 업데이트
    const totalPriceCell = isContract
        ? summaryRow.querySelector('.contract-total-price')
        : summaryRow.querySelector('.order-total-price');

    if (totalPriceCell) {
        totalPriceCell.textContent = totalPrice.toLocaleString();
    }

    // 6. 합계 금액 셀 업데이트
    const totalAmountCell = isContract
        ? summaryRow.querySelector('.contract-total-amount')
        : summaryRow.querySelector('.order-total-amount');

    if (totalAmountCell) {
        totalAmountCell.textContent = totalAmount.toLocaleString();
    }
}

/**
 * 소계 행들 업데이트 (경비 포함)
 */
function updateSubtotalRows() {
    console.log('🔄 소계 행 업데이트 시작');

    // 모든 소계 행 찾기 (회색 배경)
    const subtotalRows = document.querySelectorAll('.order-form-table tbody tr[style*="linear-gradient(135deg, #f5f7fa"]');
    console.log(`📊 찾은 소계 행 개수: ${subtotalRows.length}`);

    subtotalRows.forEach((subtotalRow, idx) => {
        console.log(`🔍 소계 행 ${idx + 1} 처리 중...`);
        const label = subtotalRow.cells[2]?.textContent.trim();

        // 소계 라벨 확인 (예: "소계 (직접자재)", "소계 (간접비)")
        console.log(`  📝 라벨: "${label}"`);
        if (!label || !label.includes('소계')) {
            console.log(`  ⏭️ 소계 행이 아님, 건너뜀`);
            return;
        }

        // 이 소계 행의 범위 결정 (타입 요약 행부터 다음 소계/합계 행까지)
        const allRows = Array.from(document.querySelectorAll('.order-form-table tbody tr'));
        const subtotalIndex = allRows.indexOf(subtotalRow);

        // 역방향으로 타입 요약 행 찾기
        let startIndex = -1;
        for (let i = subtotalIndex - 1; i >= 0; i--) {
            const row = allRows[i];
            // 타입 요약 행은 1-1, 1-2 등의 NO를 가짐
            const firstCell = row.cells[0]?.textContent.trim();
            if (firstCell && /^\d+-\d+$/.test(firstCell)) {
                startIndex = i + 1;  // 타입 요약 행 다음부터
                break;
            }
        }

        if (startIndex === -1) return;

        // 해당 범위의 데이터 행들 (흰색 배경 행, data-row 속성 있음)
        const dataRows = [];
        for (let i = startIndex; i < subtotalIndex; i++) {
            const row = allRows[i];
            if (row.hasAttribute('data-row')) {
                dataRows.push(row);
            }
        }
        console.log(`  📦 데이터 행 개수: ${dataRows.length}`);

        // 계약도급 합계 계산
        let contractMaterialPriceSum = 0;
        let contractLaborPriceSum = 0;
        let contractExpensePriceSum = 0;
        let contractMaterialAmountSum = 0;
        let contractLaborAmountSum = 0;
        let contractExpenseAmountSum = 0;

        // 발주단가 합계 계산
        let orderMaterialPriceSum = 0;
        let orderLaborPriceSum = 0;
        let orderExpensePriceSum = 0;
        let orderMaterialAmountSum = 0;
        let orderLaborAmountSum = 0;
        let orderExpenseAmountSum = 0;

        // 수량 합계
        let mValueSum = 0;           // 11번 칸럼
        let sheetQuantitySum = 0;    // 14번 칸럼
        let displayQuantitySum = 0;  // 16번 칸럼

        dataRows.forEach(row => {
            // 계약도급
            const contractMatPrice = parseFloat(row.querySelector('.contract-material-price')?.textContent.replace(/,/g, '')) || 0;
            const contractLabPrice = parseFloat(row.querySelector('.contract-labor-price')?.textContent.replace(/,/g, '')) || 0;
            const contractExpPrice = parseFloat(row.querySelector('.contract-expense-price')?.value.replace(/,/g, '')) || 0;

            const contractMatAmount = parseFloat(row.querySelector('.contract-material-amount')?.textContent.replace(/,/g, '')) || 0;
            const contractLabAmount = parseFloat(row.querySelector('.contract-labor-amount')?.textContent.replace(/,/g, '')) || 0;
            const contractExpAmount = parseFloat(row.querySelector('.contract-expense-amount')?.textContent.replace(/,/g, '')) || 0;

            contractMaterialPriceSum += contractMatPrice;
            contractLaborPriceSum += contractLabPrice;
            contractExpensePriceSum += contractExpPrice;
            contractMaterialAmountSum += contractMatAmount;
            contractLaborAmountSum += contractLabAmount;
            contractExpenseAmountSum += contractExpAmount;

            // 발주단가
            const orderMatPrice = parseFloat(row.querySelector('.order-material-price')?.textContent.replace(/,/g, '')) || 0;
            const orderLabPrice = parseFloat(row.querySelector('.order-labor-price')?.textContent.replace(/,/g, '')) || 0;
            const orderExpPrice = parseFloat(row.querySelector('.order-expense-price')?.value.replace(/,/g, '')) || 0;

            const orderMatAmount = parseFloat(row.querySelector('.order-material-amount')?.textContent.replace(/,/g, '')) || 0;
            const orderLabAmount = parseFloat(row.querySelector('.order-labor-amount')?.textContent.replace(/,/g, '')) || 0;
            const orderExpAmount = parseFloat(row.querySelector('.order-expense-amount')?.textContent.replace(/,/g, '')) || 0;

            orderMaterialPriceSum += orderMatPrice;
            orderLaborPriceSum += orderLabPrice;
            orderExpensePriceSum += orderExpPrice;
            orderMaterialAmountSum += orderMatAmount;
            orderLaborAmountSum += orderLabAmount;
            orderExpenseAmountSum += orderExpAmount;

            // 수량 합산 (테이블 셀에서 직접 읽기)
            const mValue = parseFloat(row.cells[10]?.textContent.replace(/,/g, '')) || 0;
            const sheetQuantity = parseFloat(row.cells[13]?.textContent.replace(/,/g, '')) || 0;
            const displayQuantity = parseFloat(row.cells[15]?.textContent.replace(/,/g, '')) || 0;

            mValueSum += mValue;
            sheetQuantitySum += sheetQuantity;
            displayQuantitySum += displayQuantity;
        });

        // 합계 계산
        const contractTotalPriceSum = contractMaterialPriceSum + contractLaborPriceSum + contractExpensePriceSum;
        const contractTotalAmountSum = contractMaterialAmountSum + contractLaborAmountSum + contractExpenseAmountSum;
        const orderTotalPriceSum = orderMaterialPriceSum + orderLaborPriceSum + orderExpensePriceSum;
        const orderTotalAmountSum = orderMaterialAmountSum + orderLaborAmountSum + orderExpenseAmountSum;

        console.log(`  💰 계약도급 경비: 단가=${contractExpensePriceSum.toLocaleString()}, 금액=${contractExpenseAmountSum.toLocaleString()}`);
        console.log(`  💰 발주단가 경비: 단가=${orderExpensePriceSum.toLocaleString()}, 금액=${orderExpenseAmountSum.toLocaleString()}`);

        // 소계 행 업데이트
        const cells = subtotalRow.cells;

        // 수량 칸럼 업데이트
        if (cells[10]) cells[10].textContent = Math.round(mValueSum).toLocaleString();
        if (cells[13]) cells[13].textContent = Math.round(sheetQuantitySum).toLocaleString();
        if (cells[15]) cells[15].textContent = displayQuantitySum.toFixed(2);

        // 계약도급 (17번 셀부터 - 인덱스 16)
        if (cells[16]) cells[16].textContent = Math.round(contractMaterialPriceSum).toLocaleString();
        if (cells[17]) cells[17].textContent = Math.round(contractMaterialAmountSum).toLocaleString();
        if (cells[18]) cells[18].textContent = Math.round(contractLaborPriceSum).toLocaleString();
        if (cells[19]) cells[19].textContent = Math.round(contractLaborAmountSum).toLocaleString();
        if (cells[20]) cells[20].textContent = Math.round(contractExpensePriceSum).toLocaleString();
        if (cells[21]) cells[21].textContent = Math.round(contractExpenseAmountSum).toLocaleString();
        if (cells[22]) cells[22].textContent = Math.round(contractTotalPriceSum).toLocaleString();
        if (cells[23]) cells[23].textContent = Math.round(contractTotalAmountSum).toLocaleString();

        // 발주단가 (25번 셀부터 - 인덱스 24, 24번은 비고)
        if (cells[25]) cells[25].textContent = Math.round(orderMaterialPriceSum).toLocaleString();
        if (cells[26]) cells[26].textContent = Math.round(orderMaterialAmountSum).toLocaleString();
        if (cells[27]) cells[27].textContent = Math.round(orderLaborPriceSum).toLocaleString();
        if (cells[28]) cells[28].textContent = Math.round(orderLaborAmountSum).toLocaleString();
        if (cells[29]) cells[29].textContent = Math.round(orderExpensePriceSum).toLocaleString();
        if (cells[30]) cells[30].textContent = Math.round(orderExpenseAmountSum).toLocaleString();
        if (cells[31]) cells[31].textContent = Math.round(orderTotalPriceSum).toLocaleString();
        if (cells[32]) cells[32].textContent = Math.round(orderTotalAmountSum).toLocaleString();
    });
}

/**
 * 경비 입력 필드 이벤트 리스너 추가
 * 경비 단가 입력 시 자동으로 금액 및 합계 계산
 */
function attachExpenseInputListeners() {
    console.log('💰 경비 입력 이벤트 리스너 추가');

    // 모든 경비 입력 필드 선택
    const expenseInputs = document.querySelectorAll('.expense-input');

    expenseInputs.forEach(input => {
        input.addEventListener('input', function() {
            // 천단위 콤마 포맷 적용
            formatNumberInput(this);

            const rowNumber = this.getAttribute('data-row');
            const isContract = this.classList.contains('contract-expense-price');

            // 입력값 가져오기 (콤마 제거)
            const expensePrice = parseFloat(this.dataset.numericValue || this.value.replace(/,/g, '')) || 0;

            // 해당 행 찾기
            const row = document.querySelector(`tr[data-row="${rowNumber}"]`);
            if (!row) return;

            // 경비 금액 계산 (경비는 단가 그대로 사용, 수량 곱하지 않음)
            const expenseAmount = Math.round(expensePrice);

            if (isContract) {
                // 계약도급 경비 금액 업데이트
                const expenseAmountCell = row.querySelector('.contract-expense-amount');
                if (expenseAmountCell) {
                    expenseAmountCell.textContent = expenseAmount.toLocaleString();
                }

                // 계약도급 자재비, 노무비 가져오기 (클래스 선택자 사용)
                const materialAmountCell = row.querySelector('.contract-material-amount');
                const laborAmountCell = row.querySelector('.contract-labor-amount');
                const materialAmount = parseFloat(materialAmountCell?.textContent.replace(/,/g, '')) || 0;
                const laborAmount = parseFloat(laborAmountCell?.textContent.replace(/,/g, '')) || 0;

                // 계약도급 합계 단가 계산
                const materialPriceCell = row.querySelector('.contract-material-price');
                const laborPriceCell = row.querySelector('.contract-labor-price');
                const materialPrice = parseFloat(materialPriceCell?.textContent.replace(/,/g, '')) || 0;
                const laborPrice = parseFloat(laborPriceCell?.textContent.replace(/,/g, '')) || 0;
                const totalPrice = Math.round(materialPrice + laborPrice + expensePrice);

                // 계약도급 합계 금액 계산
                const totalAmount = Math.round(materialAmount + laborAmount + expenseAmount);

                // 합계 셀 업데이트
                const totalPriceCell = row.querySelector('.contract-total-price');
                const totalAmountCell = row.querySelector('.contract-total-amount');

                if (totalPriceCell) totalPriceCell.textContent = totalPrice.toLocaleString();
                if (totalAmountCell) totalAmountCell.textContent = totalAmount.toLocaleString();

            } else {
                // 발주단가 경비 금액 업데이트
                const expenseAmountCell = row.querySelector('.order-expense-amount');
                if (expenseAmountCell) {
                    expenseAmountCell.textContent = expenseAmount.toLocaleString();
                }

                // 발주단가 자재비, 노무비 가져오기 (클래스 선택자 사용)
                const materialAmountCell = row.querySelector('.order-material-amount');
                const laborAmountCell = row.querySelector('.order-labor-amount');
                const materialAmount = parseFloat(materialAmountCell?.textContent.replace(/,/g, '')) || 0;
                const laborAmount = parseFloat(laborAmountCell?.textContent.replace(/,/g, '')) || 0;

                // 발주단가 합계 단가 계산
                const materialPriceCell = row.querySelector('.order-material-price');
                const laborPriceCell = row.querySelector('.order-labor-price');
                const materialPrice = parseFloat(materialPriceCell?.textContent.replace(/,/g, '')) || 0;
                const laborPrice = parseFloat(laborPriceCell?.textContent.replace(/,/g, '')) || 0;
                const totalPrice = Math.round(materialPrice + laborPrice + expensePrice);

                // 발주단가 합계 금액 계산
                const totalAmount = Math.round(materialAmount + laborAmount + expenseAmount);

                // 합계 셀 업데이트
                const totalPriceCell = row.querySelector('.order-total-price');
                const totalAmountCell = row.querySelector('.order-total-amount');

                if (totalPriceCell) totalPriceCell.textContent = totalPrice.toLocaleString();
                if (totalAmountCell) totalAmountCell.textContent = totalAmount.toLocaleString();
            }

            // ✅ 소계 행 업데이트 (타입 요약 행은 빈칸으로 유지)
            updateSubtotalRows();
        });
    });

    console.log(`✅ ${expenseInputs.length}개 경비 입력 필드에 리스너 추가 완료`);
}

/**
 * 숫자 입력 필드에 천단위 콤마 포맷 적용
 * @param {HTMLInputElement} input - 입력 필드 요소
 */
function formatNumberInput(input) {
    // 숫자만 추출
    let value = input.value.replace(/[^0-9]/g, '');

    // 숫자를 콤마 포맷으로 변환
    if (value) {
        value = parseInt(value).toLocaleString();
    }

    input.value = value;

    // 실제 숫자 값을 data 속성에 저장 (계산용)
    input.dataset.numericValue = value.replace(/,/g, '');
}

/**
 * 조정비율 변경 시 계약도급 단가 실시간 업데이트
 * 전체 재렌더링 없이 DOM의 숫자만 변경하여 포커스 유지
 */
function updateContractPricesRealtime() {
    const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
    console.log('💰 조정비율 실시간 업데이트:', contractRatio);

    // 모든 데이터 행 순회
    const allRows = document.querySelectorAll('.order-form-table tbody tr[data-row]');

    allRows.forEach(row => {
        // 발주단가 읽기
        const orderMatPriceCell = row.querySelector('.order-material-price');
        const orderLabPriceCell = row.querySelector('.order-labor-price');

        const orderMatPrice = parseFloat(orderMatPriceCell?.textContent.replace(/,/g, '')) || 0;
        const orderLabPrice = parseFloat(orderLabPriceCell?.textContent.replace(/,/g, '')) || 0;

        // 계약도급 단가 계산 (발주단가 × 조정비율)
        const contractMatPrice = Math.round(orderMatPrice * contractRatio);
        const contractLabPrice = Math.round(orderLabPrice * contractRatio);

        // 계약도급 단가 업데이트
        const contractMatPriceCell = row.querySelector('.contract-material-price');
        const contractLabPriceCell = row.querySelector('.contract-labor-price');
        if (contractMatPriceCell) contractMatPriceCell.textContent = contractMatPrice.toLocaleString();
        if (contractLabPriceCell) contractLabPriceCell.textContent = contractLabPrice.toLocaleString();

        // 수량 가져오기
        const quantityCell = row.querySelector('.quantity-cell');
        const quantity = parseFloat(quantityCell?.textContent.replace(/,/g, '')) || 0;

        // 계약도급 금액 계산
        const contractMatAmount = Math.round(contractMatPrice * quantity);
        const contractLabAmount = Math.round(contractLabPrice * quantity);

        // 계약도급 금액 업데이트
        const contractMatAmountCell = row.querySelector('.contract-material-amount');
        const contractLabAmountCell = row.querySelector('.contract-labor-amount');
        if (contractMatAmountCell) contractMatAmountCell.textContent = contractMatAmount.toLocaleString();
        if (contractLabAmountCell) contractLabAmountCell.textContent = contractLabAmount.toLocaleString();

        // 경비 가져오기 (경비는 단가 그대로)
        const expenseAmountCell = row.querySelector('.contract-expense-amount');
        const expensePrice = parseFloat(expenseAmountCell?.textContent.replace(/,/g, '')) || 0;

        // 합계 계산
        const totalPrice = Math.round(contractMatPrice + contractLabPrice);
        const totalAmount = Math.round(contractMatAmount + contractLabAmount + expensePrice);

        // 합계 업데이트
        const totalPriceCell = row.querySelector('.contract-total-price');
        const totalAmountCell = row.querySelector('.contract-total-amount');
        if (totalPriceCell) totalPriceCell.textContent = totalPrice.toLocaleString();
        if (totalAmountCell) totalAmountCell.textContent = totalAmount.toLocaleString();
    });

    // 타입 요약 행 및 소계/총계 행도 업데이트 (보라색/회색/노란색/초록색 배경 행)
    const summaryRows = document.querySelectorAll('.order-form-table tbody tr[style*="linear-gradient"]');

    summaryRows.forEach(row => {
        // ✅ 타입 요약 행인지 확인 (1-1, 1-2 같은 NO를 가짐)
        const noCell = row.cells[0];
        const noText = noCell?.textContent.trim();

        // 타입 요약 행은 "1-1", "1-2" 같은 형식
        if (noText && /^\d+-\d+$/.test(noText)) {
            console.log(`⏭️ 타입 요약 행 자재비/노무비 건너뛰기: ${noText}`);

            // ✅ 타입 요약 행은 합계만 업데이트 (자재비/노무비는 빈칸 유지)
            const orderTotalPriceCell = row.querySelector('.order-total-price');
            const orderTotalAmountCell = row.querySelector('.order-total-amount');

            const orderTotalPrice = parseFloat(orderTotalPriceCell?.textContent.replace(/,/g, '')) || 0;
            const orderTotalAmount = parseFloat(orderTotalAmountCell?.textContent.replace(/,/g, '')) || 0;

            const contractTotalPrice = Math.round(orderTotalPrice * contractRatio);
            const contractTotalAmount = Math.round(orderTotalAmount * contractRatio);

            const contractTotalPriceCell = row.querySelector('.contract-total-price');
            const contractTotalAmountCell = row.querySelector('.contract-total-amount');

            if (contractTotalPriceCell) contractTotalPriceCell.textContent = contractTotalPrice.toLocaleString();
            if (contractTotalAmountCell) contractTotalAmountCell.textContent = contractTotalAmount.toLocaleString();

            return;  // 자재비/노무비 업데이트는 건너뛰기
        }

        // ✅ 소계/총계 행만 자재비/노무비 업데이트
        // 발주단가 읽기
        const orderMatPriceCell = row.querySelector('.order-material-price');
        const orderLabPriceCell = row.querySelector('.order-labor-price');
        const orderMatAmountCell = row.querySelector('.order-material-amount');
        const orderLabAmountCell = row.querySelector('.order-labor-amount');

        const orderMatPrice = parseFloat(orderMatPriceCell?.textContent.replace(/,/g, '')) || 0;
        const orderLabPrice = parseFloat(orderLabPriceCell?.textContent.replace(/,/g, '')) || 0;
        const orderMatAmount = parseFloat(orderMatAmountCell?.textContent.replace(/,/g, '')) || 0;
        const orderLabAmount = parseFloat(orderLabAmountCell?.textContent.replace(/,/g, '')) || 0;

        // 계약도급 단가 계산 (발주단가 × 조정비율)
        const contractMatPrice = Math.round(orderMatPrice * contractRatio);
        const contractLabPrice = Math.round(orderLabPrice * contractRatio);

        // 계약도급 금액 계산 (발주금액 × 조정비율)
        const contractMatAmount = Math.round(orderMatAmount * contractRatio);
        const contractLabAmount = Math.round(orderLabAmount * contractRatio);

        // 계약도급 단가 업데이트
        const contractMatPriceCell = row.querySelector('.contract-material-price');
        const contractLabPriceCell = row.querySelector('.contract-labor-price');
        if (contractMatPriceCell) contractMatPriceCell.textContent = contractMatPrice.toLocaleString();
        if (contractLabPriceCell) contractLabPriceCell.textContent = contractLabPrice.toLocaleString();

        // 계약도급 금액 업데이트
        const contractMatAmountCell = row.querySelector('.contract-material-amount');
        const contractLabAmountCell = row.querySelector('.contract-labor-amount');
        if (contractMatAmountCell) contractMatAmountCell.textContent = contractMatAmount.toLocaleString();
        if (contractLabAmountCell) contractLabAmountCell.textContent = contractLabAmount.toLocaleString();

        // 합계 업데이트
        const totalPrice = Math.round(contractMatPrice + contractLabPrice);
        const totalAmount = Math.round(contractMatAmount + contractLabAmount);

        const totalPriceCell = row.querySelector('.contract-total-price');
        const totalAmountCell = row.querySelector('.contract-total-amount');
        if (totalPriceCell) totalPriceCell.textContent = totalPrice.toLocaleString();
        if (totalAmountCell) totalAmountCell.textContent = totalAmount.toLocaleString();
    });

    console.log(`✅ 데이터 행 ${allRows.length}개, 타입 요약 행 ${summaryRows.length}개 업데이트 완료`);

    // ✅ 소계 행 업데이트 (경비 포함)
    updateSubtotalRows();
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
                        <col style="width: 60px;">   <!-- NO. -->
                        <col style="width: 300px;">  <!-- 품명 -->
                        <col style="width: 400px;">  <!-- 규격 -->
                        <col style="width: 60px;">   <!-- 단위 -->
                        <col style="width: 80px;">   <!-- 수량 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 자재비 단가 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 자재비 금액 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 노무비 단가 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 노무비 금액 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 경비 단가 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 경비 금액 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 합계 단가 -->
                        <col style="width: 120px;">  <!-- 도급내역서: 합계 금액 -->
                        <col style="width: 100px;">  <!-- 비고① -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 자재비 단가 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 자재비 금액 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 노무비 단가 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 노무비 금액 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 경비 단가 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 경비 금액 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 합계 단가 -->
                        <col style="width: 120px;">  <!-- 발주단가내역서: 합계 금액 -->
                        <col style="width: 100px;">  <!-- 비고② -->
                    </colgroup>
                    <thead>
                        <tr>
                            <th rowspan="3">NO.</th>
                            <th rowspan="3">품명</th>
                            <th rowspan="3">규격</th>
                            <th rowspan="3">단위</th>
                            <th colspan="9">도급내역서</th>
                            <th rowspan="3">비고</th>
                            <th colspan="8">발주단가내역서</th>
                            <th rowspan="3">비고</th>
                        </tr>
                        <tr>
                            <th rowspan="2">수량</th>
                            <th colspan="2">자재비</th>
                            <th colspan="2">노무비</th>
                            <th colspan="2">경비</th>
                            <th colspan="2">합계</th>
                            <th colspan="2">자재비</th>
                            <th colspan="2">노무비</th>
                            <th colspan="2">경비</th>
                            <th colspan="2">합계</th>
                        </tr>
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

        // 하위 항목 여부 판별
        const isChildRow = item.no && item.no.includes('-');

        // 상위 항목(D, E, F) 판별 및 토글 버튼 추가
        let toggleButton = '';
        let parentId = '';
        let dataParentAttr = '';
        let childRowClass = '';

        if (isChildRow) {
            // 하위 항목: D-1 → parent = D
            parentId = item.no.split('-')[0];
            dataParentAttr = `data-parent="${parentId}"`;
            childRowClass = 'child-row';
        } else if (item.name.startsWith('D.') || item.name.startsWith('E.') || item.name.startsWith('F.')) {
            // 상위 항목: D, E, F
            const groupId = item.name.charAt(0);
            toggleButton = `<span class="toggle-btn" onclick="toggleEstimateGroup('${groupId}')" title="하위 항목 접기/펼치기">[-]</span> `;
        }

        html += `
            <tr class="type-row ${childRowClass}" ${dataParentAttr}>
                <td>${item.no}</td>
                <td class="left-align ${indentClass}">${toggleButton}${item.name}</td>
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
    `;

    // B. 간접공사비 (GRAND TOTAL 포함)
    html += generateIndirectCostRows();

    return html;
}

/**
 * 견적서 그룹 토글 (접기/펼치기)
 * @param {string} groupId - 그룹 ID (D, E, F 등)
 */
function toggleEstimateGroup(groupId) {
    // 해당 그룹의 모든 자식 행 찾기
    const childRows = document.querySelectorAll(`tr[data-parent="${groupId}"]`);

    // 토글 버튼 찾기
    const toggleBtn = document.querySelector(`.toggle-btn[onclick*="${groupId}"]`);

    if (!childRows.length || !toggleBtn) return;

    // 현재 상태 확인 (첫 번째 자식 행의 display 속성으로 판단)
    const isVisible = childRows[0].style.display !== 'none';

    // 모든 자식 행 토글
    childRows.forEach(row => {
        row.style.display = isVisible ? 'none' : 'table-row';
    });

    // 토글 버튼 텍스트 변경
    toggleBtn.textContent = isVisible ? '[+]' : '[-]';
}

// 전역 접근을 위해 window 객체에 추가
if (typeof window !== 'undefined') {
    window.toggleEstimateGroup = toggleEstimateGroup;
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
                <td><input type="text" class="estimate-input" data-type="indirect" data-index="${index}" data-field="expensePrice"></td>
                <td><input type="text" class="estimate-input" data-type="indirect" data-index="${index}" data-field="expenseAmount"></td>
                <td class="number-cell"></td>
                <td class="number-cell"></td>
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

    sheet.mergeCells('E1:M1');
    sheet.getCell('E1').value = '도급내역서';

    sheet.mergeCells('N1:N3');
    sheet.getCell('N1').value = '비고';

    sheet.mergeCells('O1:V1');
    sheet.getCell('O1').value = '발주단가내역서';

    sheet.mergeCells('W1:W3');
    sheet.getCell('W1').value = '비고';

    // 2단 헤더
    sheet.mergeCells('E2:E3');
    sheet.getCell('E2').value = '수량';

    sheet.mergeCells('F2:G2');
    sheet.getCell('F2').value = '자재비';

    sheet.mergeCells('H2:I2');
    sheet.getCell('H2').value = '노무비';

    sheet.mergeCells('J2:K2');
    sheet.getCell('J2').value = '경비';

    sheet.mergeCells('L2:M2');
    sheet.getCell('L2').value = '합계';

    sheet.mergeCells('O2:P2');
    sheet.getCell('O2').value = '자재비';

    sheet.mergeCells('Q2:R2');
    sheet.getCell('Q2').value = '노무비';

    sheet.mergeCells('S2:T2');
    sheet.getCell('S2').value = '경비';

    sheet.mergeCells('U2:V2');
    sheet.getCell('U2').value = '합계';

    // 3단 헤더
    sheet.getCell('F3').value = '단가';
    sheet.getCell('G3').value = '금액';
    sheet.getCell('H3').value = '단가';
    sheet.getCell('I3').value = '금액';
    sheet.getCell('J3').value = '단가';
    sheet.getCell('K3').value = '금액';
    sheet.getCell('L3').value = '단가';
    sheet.getCell('M3').value = '금액';
    sheet.getCell('O3').value = '단가';
    sheet.getCell('P3').value = '금액';
    sheet.getCell('Q3').value = '단가';
    sheet.getCell('R3').value = '금액';
    sheet.getCell('S3').value = '단가';
    sheet.getCell('T3').value = '금액';
    sheet.getCell('U3').value = '단가';
    sheet.getCell('V3').value = '금액';

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
        dataRow.getCell(10).value = row.expenseUnitPrice || '';
        dataRow.getCell(11).value = row.expenseAmount || '';
        dataRow.getCell(12).value = row.totalUnitPrice || '';
        dataRow.getCell(13).value = row.totalAmount || '';
        dataRow.getCell(14).value = row.remark || '';
        dataRow.getCell(15).value = row.orderMaterialUnitPrice || '';
        dataRow.getCell(16).value = row.orderMaterialAmount || '';
        dataRow.getCell(17).value = row.orderLaborUnitPrice || '';
        dataRow.getCell(18).value = row.orderLaborAmount || '';
        dataRow.getCell(19).value = row.orderExpenseUnitPrice || '';
        dataRow.getCell(20).value = row.orderExpenseAmount || '';
        dataRow.getCell(21).value = row.orderTotalUnitPrice || '';
        dataRow.getCell(22).value = row.orderTotalAmount || '';
        dataRow.getCell(23).value = row.remark2 || '';

        // Excel 그룹화: 자식 행 판별 (D-1, D-2, E-1, E-2 등)
        if (row.no && typeof row.no === 'string' && row.no.includes('-')) {
            dataRow.outlineLevel = 1;
        }

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
        [5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22].forEach(colNum => {
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
    sheet.getColumn(1).width = 8;   // NO
    sheet.getColumn(2).width = 30;  // 품명
    sheet.getColumn(3).width = 15;  // 규격
    sheet.getColumn(4).width = 8;   // 단위
    sheet.getColumn(5).width = 10;  // 수량
    sheet.getColumn(6).width = 12;  // 도급: 자재비 단가
    sheet.getColumn(7).width = 12;  // 도급: 자재비 금액
    sheet.getColumn(8).width = 12;  // 도급: 노무비 단가
    sheet.getColumn(9).width = 12;  // 도급: 노무비 금액
    sheet.getColumn(10).width = 12; // 도급: 경비 단가
    sheet.getColumn(11).width = 12; // 도급: 경비 금액
    sheet.getColumn(12).width = 12; // 도급: 합계 단가
    sheet.getColumn(13).width = 12; // 도급: 합계 금액
    sheet.getColumn(14).width = 10; // 비고①
    sheet.getColumn(15).width = 12; // 발주: 자재비 단가
    sheet.getColumn(16).width = 12; // 발주: 자재비 금액
    sheet.getColumn(17).width = 12; // 발주: 노무비 단가
    sheet.getColumn(18).width = 12; // 발주: 노무비 금액
    sheet.getColumn(19).width = 12; // 발주: 경비 단가
    sheet.getColumn(20).width = 12; // 발주: 경비 금액
    sheet.getColumn(21).width = 12; // 발주: 합계 단가
    sheet.getColumn(22).width = 12; // 발주: 합계 금액
    sheet.getColumn(23).width = 10; // 비고②
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
            expenseUnitPrice: '',
            expenseAmount: '',
            totalUnitPrice: '',
            totalAmount: '',
            remark: '',
            orderMaterialUnitPrice: '',
            orderMaterialAmount: '',
            orderLaborUnitPrice: '',
            orderLaborAmount: '',
            orderExpenseUnitPrice: '',
            orderExpenseAmount: '',
            orderTotalUnitPrice: '',
            orderTotalAmount: '',
            remark2: '',
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
        expenseUnitPrice: '',
        expenseAmount: '',
        totalUnitPrice: '',
        totalAmount: '',
        remark: '',
        orderMaterialUnitPrice: '',
        orderMaterialAmount: '',
        orderLaborUnitPrice: '',
        orderLaborAmount: '',
        orderExpenseUnitPrice: '',
        orderExpenseAmount: '',
        orderTotalUnitPrice: '',
        orderTotalAmount: '',
        remark2: '',
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
            expenseUnitPrice: '',
            expenseAmount: '',
            totalUnitPrice: '',
            totalAmount: Math.round(item.value) || '',
            remark: '',
            orderMaterialUnitPrice: '',
            orderMaterialAmount: '',
            orderLaborUnitPrice: '',
            orderLaborAmount: '',
            orderExpenseUnitPrice: '',
            orderExpenseAmount: '',
            orderTotalUnitPrice: '',
            orderTotalAmount: '',
            remark2: '',
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
        expenseUnitPrice: '',
        expenseAmount: '',
        totalUnitPrice: '',
        totalAmount: '',
        remark: '',
        orderMaterialUnitPrice: '',
        orderMaterialAmount: '',
        orderLaborUnitPrice: '',
        orderLaborAmount: '',
        orderExpenseUnitPrice: '',
        orderExpenseAmount: '',
        orderTotalUnitPrice: '',
        orderTotalAmount: '',
        remark2: '',
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
        expenseUnitPrice: '',
        expenseAmount: '',
        totalUnitPrice: '',
        totalAmount: '',
        remark: '',
        orderMaterialUnitPrice: '',
        orderMaterialAmount: '',
        orderLaborUnitPrice: '',
        orderLaborAmount: '',
        orderExpenseUnitPrice: '',
        orderExpenseAmount: '',
        orderTotalUnitPrice: '',
        orderTotalAmount: '',
        remark2: '',
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
 * 발주서 Excel 내보내기
 */
window.exportOrderForm = function() {
    closeExportDropdown();
    exportOrderFormToExcel();
};

/**
 * 발주서 Excel 파일 생성 및 다운로드
 */
async function exportOrderFormToExcel() {
    try {
        console.log('📋 발주서 Excel 내보내기 시작');

        if (calculationResults.length === 0) {
            alert('벽체 계산 데이터가 없습니다. 먼저 벽체를 선택하고 계산하기를 실행하세요.');
            return;
        }

        // 워크북 생성
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('발주서', {
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            }
        });

        // 헤더 생성 (3행 병합 구조)
        createOrderFormExcelHeader(worksheet);

        // 데이터 행 생성 (스타일 포함)
        await addOrderFormDataToExcel(worksheet);

        // 파일 다운로드
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const filename = `발주서_${dateStr}_${timeStr}.xlsx`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log('✅ 발주서 Excel 내보내기 완료:', filename);

    } catch (error) {
        console.error('❌ 발주서 Excel 내보내기 오류:', error);
        alert('발주서 Excel 내보내기 중 오류가 발생했습니다.\n' + error.message);
    }
}

/**
 * 발주서 Excel 헤더 생성 (3행 병합 구조)
 * HTML 구조와 정확히 일치: 29개 컬럼, 개수 5개(F~J), 환산 3개(K~M)
 */
function createOrderFormExcelHeader(worksheet) {
    // 33개 컬럼 설정
    worksheet.columns = [
        { key: 'no', width: 6 },           // A: NO
        { key: 'category', width: 12 },   // B: 구분
        { key: 'name', width: 25 },       // C: 품명 및 규격
        { key: 'thk', width: 8 },         // D: WALL - THK
        { key: 'type', width: 10 },       // E: WALL - Type
        { key: 'spacing', width: 8 },     // F: 개수 - @
        { key: 'thick', width: 8 },       // G: 개수 - 두께
        { key: 'width', width: 8 },       // H: 개수 - 넓이
        { key: 'height', width: 8 },      // I: 개수 - 높이
        { key: 'length', width: 8 },      // J: 개수 - M
        { key: 'supplier', width: 12 },   // K: 환산 - 제공자
        { key: 'area', width: 10 },       // L: 환산 - 1장->m2
        { key: 'sheets', width: 8 },      // M: 환산 - 장
        { key: 'unit', width: 8 },        // N: 단위
        { key: 'amount', width: 10 },     // O: 수량
        { key: 'matPrice', width: 10 },   // P: 계약도급 - 자재비 단가
        { key: 'matCost', width: 12 },    // Q: 계약도급 - 자재비 금액
        { key: 'labPrice', width: 10 },   // R: 계약도급 - 노무비 단가
        { key: 'labCost', width: 12 },    // S: 계약도급 - 노무비 금액
        { key: 'expPrice', width: 10 },   // T: 계약도급 - 경비 단가
        { key: 'expCost', width: 12 },    // U: 계약도급 - 경비 금액
        { key: 'totalPrice', width: 10 }, // V: 계약도급 - 합계 단가
        { key: 'totalCost', width: 12 },  // W: 계약도급 - 합계 금액
        { key: 'note1', width: 10 },      // X: 비고
        { key: 'ordMatPrice', width: 10 },// Y: 발주단가 - 자재비 단가
        { key: 'ordMatCost', width: 12 }, // Z: 발주단가 - 자재비 금액
        { key: 'ordLabPrice', width: 10 },// AA: 발주단가 - 노무비 단가
        { key: 'ordLabCost', width: 12 }, // AB: 발주단가 - 노무비 금액
        { key: 'ordExpPrice', width: 10 },// AC: 발주단가 - 경비 단가
        { key: 'ordExpCost', width: 12 }, // AD: 발주단가 - 경비 금액
        { key: 'ordTotalPrice', width: 10 }, // AE: 발주단가 - 합계 단가
        { key: 'ordTotalCost', width: 12 },  // AF: 발주단가 - 합계 금액
        { key: 'note2', width: 10 }       // AG: 비고
    ];

    // ✅ A1:C3 영역에 "발주서" 제목 추가
    worksheet.mergeCells('A1:C3');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = '발주서';
    titleCell.font = { bold: true, size: 22 };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // ✅ Row 4: 메인 헤더 (1~3행은 빈칸) - 33개
    const row4 = worksheet.getRow(4);
    row4.values = ['NO', '구분', '품명 및 규격', 'WALL', '', '개수', '', '', '', '', '환산', '', '', '단위', '수량', '계약도급', '', '', '', '', '', '', '', '비고', '발주단가', '', '', '', '', '', '', '', '비고'];

    // ✅ Row 5: 서브 헤더 (A, B, C는 빈 값 - Row 4와 병합됨) - 33개
    const row5 = worksheet.getRow(5);
    row5.values = ['', '', '', 'THK', 'Type', '@', '두께', '넓이', '높이', 'M', '제공자', '1장->m2', '장', '', '', '자재비', '', '노무비', '', '경비', '', '합계', '', '', '자재비', '', '노무비', '', '경비', '', '합계', '', ''];

    // ✅ Row 6: 세부 헤더 (A, B, C는 빈 값 - Row 4와 병합됨) - 33개
    const row6 = worksheet.getRow(6);
    row6.values = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '단가', '금액', '단가', '금액', '단가', '금액', '단가', '금액', '', '단가', '금액', '단가', '금액', '단가', '금액', '단가', '금액', ''];

    // ✅ 병합 (4~6행으로 변경) - 33개 컬럼
    worksheet.mergeCells('A4:A6'); // NO (4,5,6 row 병합)
    worksheet.mergeCells('B4:B6'); // 구분 (4,5,6 row 병합)
    worksheet.mergeCells('C4:C6'); // 품명 및 규격 (4,5,6 row 병합)
    worksheet.mergeCells('D4:E4'); // WALL (2개)
    worksheet.mergeCells('F4:J4'); // 개수 (5개: @, 두께, 넓이, 높이, M)
    worksheet.mergeCells('K4:M4'); // 환산 (3개: 제공자, 1장->m2, 장)
    worksheet.mergeCells('N4:N6'); // 단위 (4,5,6 row 병합)
    worksheet.mergeCells('O4:O6'); // 수량 (4,5,6 row 병합)
    worksheet.mergeCells('P4:W4'); // 계약도급 (8개: 자재비2 + 노무비2 + 경비2 + 합계2)
    worksheet.mergeCells('X4:X6'); // 비고 (4,5,6 row 병합)
    worksheet.mergeCells('Y4:AF4'); // 발주단가 (8개: 자재비2 + 노무비2 + 경비2 + 합계2)
    worksheet.mergeCells('AG4:AG6'); // 비고 (4,5,6 row 병합)

    // Row 5와 Row 6 병합
    worksheet.mergeCells('D5:D6'); // THK
    worksheet.mergeCells('E5:E6'); // Type
    worksheet.mergeCells('F5:F6'); // @
    worksheet.mergeCells('G5:G6'); // 두께
    worksheet.mergeCells('H5:H6'); // 넓이
    worksheet.mergeCells('I5:I6'); // 높이
    worksheet.mergeCells('J5:J6'); // M
    worksheet.mergeCells('K5:K6'); // 제공자
    worksheet.mergeCells('L5:L6'); // 1장->m2
    worksheet.mergeCells('M5:M6'); // 장
    worksheet.mergeCells('P5:Q5'); // 계약도급 - 자재비
    worksheet.mergeCells('R5:S5'); // 계약도급 - 노무비
    worksheet.mergeCells('T5:U5'); // 계약도급 - 경비
    worksheet.mergeCells('V5:W5'); // 계약도급 - 합계
    worksheet.mergeCells('Y5:Z5'); // 발주단가 - 자재비
    worksheet.mergeCells('AA5:AB5'); // 발주단가 - 노무비
    worksheet.mergeCells('AC5:AD5'); // 발주단가 - 경비
    worksheet.mergeCells('AE5:AF5'); // 발주단가 - 합계

    // ✅ 헤더 스타일 적용 (폰트 크기 12) - Row 4, 5, 6
    [row4, row5, row6].forEach(row => {
        row.height = 20;
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { bold: true, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD0D0D0' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });
}

/**
 * 발주서 Excel 데이터 행 추가
 */
async function addOrderFormDataToExcel(worksheet) {
    let currentRow = 7; // ✅ 헤더(4~6행) 이후 7행부터 시작

    // ✅ 현장명 입력값 가져오기
    const siteNameInput = document.getElementById('orderFormSiteName');
    const siteName = siteNameInput ? siteNameInput.value : '현장명을 입력하세요';

    // 현장명 입력 행 (34개 컬럼)
    const siteRow = worksheet.getRow(currentRow);
    siteRow.values = ['1', siteName, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];

    // 현장명 행 스타일 적용
    siteRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    currentRow++;

    // 타입별로 그룹핑
    const groupedByType = groupResultsByType(calculationResults);
    let typeIndex = 1;

    // 각 타입별 처리
    for (const [typeName, results] of Object.entries(groupedByType)) {
        console.log(`📋 타입 처리: ${typeName} (${results.length}개 벽체)`);

        // 타입 합계 행 추가
        const summaryRowData = await generateTypeSummaryRowData(typeName, results, typeIndex);
        const summaryRow = worksheet.getRow(currentRow);
        summaryRow.values = summaryRowData;

        // 타입 합계 행 스타일 (굵은 글씨, 배경색, 폰트 11)
        summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { bold: true, size: 11 };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF9370DB' } // 보라색
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // ✅ 타입 요약 행도 숫자 포맷 적용 (33개 컬럼)
            if (colNumber === 15 ||
                (colNumber >= 16 && colNumber <= 23) ||
                (colNumber >= 25 && colNumber <= 32)) {
                if (cell.value && !isNaN(cell.value)) {
                    cell.numFmt = '#,##0';
                }
            }
        });
        currentRow++;

        // 레이어별 상세 행 추가
        const detailRows = await generateLayerDetailRowsData(results[0], results);
        for (const rowData of detailRows) {
            const dataRow = worksheet.getRow(currentRow);
            dataRow.values = rowData;

            // 데이터 행 스타일 적용 (폰트 11)
            dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { size: 11 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // 정렬
                if (colNumber === 1) {
                    // NO: 중앙 정렬
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else if (colNumber === 2 || colNumber === 3) {
                    // 구분, 품명 및 규격: 왼쪽 정렬
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                } else if ((colNumber >= 16 && colNumber <= 23) ||
                           (colNumber >= 25 && colNumber <= 32)) {
                    // ✅ 단가/금액 컬럼 (P~W, Y~AF): 오른쪽 정렬
                    // P(16): 자재비단가, Q(17): 자재비금액
                    // R(18): 노무비단가, S(19): 노무비금액
                    // T(20): 경비단가, U(21): 경비금액
                    // V(22): 합계단가, W(23): 합계금액
                    // Y(25): 발주단가 자재비단가, Z(26): 발주단가 자재비금액
                    // AA(27): 발주단가 노무비단가, AB(28): 발주단가 노무비금액
                    // AC(29): 발주단가 경비단가, AD(30): 발주단가 경비금액
                    // AE(31): 발주단가 합계단가, AF(32): 발주단가 합계금액
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }

                // ✅ 숫자 포맷 (천단위 콤마) - 확장된 범위 (33개 컬럼)
                // G(7): 두께 - 소수점 1자리
                // H(8), I(9), J(10): 넓이, 높이, M - 정수
                // M(13): 장 수량 - 정수
                // O(15): 수량 - 소수점 2자리
                // P~W(16~23): 계약도급 - 정수
                // Y~AF(25~32): 발주단가 - 정수
                if (cell.value && !isNaN(cell.value)) {
                    if (colNumber === 7) {
                        // 두께: 소수점 1자리 표시
                        cell.numFmt = '0.0';
                    } else if (colNumber === 15) {
                        // 수량: 소수점 2자리 표시
                        cell.numFmt = '#,##0.00';
                    } else if ((colNumber >= 8 && colNumber <= 10) ||
                               colNumber === 13 ||
                               (colNumber >= 16 && colNumber <= 23) ||
                               (colNumber >= 25 && colNumber <= 32)) {
                        // 나머지: 정수 천단위 구분
                        cell.numFmt = '#,##0';
                    }
                }
            });

            currentRow++;
        }

        typeIndex++;
    }

    console.log(`✅ 총 ${currentRow - 7}개 데이터 행 추가 완료`);
}

/**
 * 타입 합계 행 데이터 생성 (Excel용)
 */
async function generateTypeSummaryRowData(typeName, results, typeIndex) {
    // 타입별 전체 면적 합계
    const totalArea = results.reduce((sum, r) => sum + r.area, 0);

    // THK 계산
    let totalThickness = 0;
    let studWidthAdded = false;

    // 단가 계산
    let totalMaterialUnitPrice = 0;
    let totalLaborUnitPrice = 0;

    const layerOrder = [
        'layer3_1', 'layer2_1', 'layer1_1',
        'column1', 'infill',
        'layer1_2', 'layer2_2', 'layer3_2',
        'column2', 'channel', 'runner'
    ];

    if (results.length > 0) {
        const result = results[0];

        for (const layerKey of layerOrder) {
            const layer = result.layerPricing[layerKey];
            if (!layer || !layer.materialName) continue;

            const unitPriceItem = await findUnitPriceItemByIdOrName(layer.materialName);

            if (unitPriceItem && unitPriceItem.components) {
                for (const component of unitPriceItem.components) {
                    const componentName = component.name || '';
                    if (!shouldDisplayComponent(componentName)) continue;

                    const materialData = await findMaterialByIdInDB(component.materialId);

                    // THK 계산
                    if (isGypsumBoard(componentName) && materialData?.t) {
                        totalThickness += parseFloat(materialData.t) || 0;
                    } else if (isStud(componentName) && !studWidthAdded) {
                        const studWidth = materialData?.w || parseSizeField(materialData?.size).width;
                        if (studWidth) {
                            totalThickness += parseFloat(studWidth) || 0;
                            studWidthAdded = true;
                        }
                    }

                    // 단가 합산
                    totalMaterialUnitPrice += parseFloat(component.materialPrice) || 0;
                    totalLaborUnitPrice += parseFloat(component.laborPrice) || 0;
                }
            }
        }
    }

    const totalMaterialCost = totalMaterialUnitPrice * totalArea;
    const totalLaborCost = totalLaborUnitPrice * totalArea;
    const totalExpenseUnitPrice = 0; // 경비 단가 (기본값 0)
    const totalExpenseCost = 0; // 경비 금액 (기본값 0)
    const totalUnitPrice = totalMaterialUnitPrice + totalLaborUnitPrice + totalExpenseUnitPrice;
    const totalCost = totalMaterialCost + totalLaborCost + totalExpenseCost;

    // 33개 컬럼 데이터 배열 반환 (HTML TD 순서와 일치)
    return [
        `1-${typeIndex}`,           // A: NO
        typeName,                   // B: 구분
        '',                         // C: 품명 및 규격
        totalThickness || '',       // D: THK
        typeName,                   // E: Type
        '',                         // F: @ (개수 그룹)
        '',                         // G: 두께 (개수 그룹)
        '',                         // H: 넓이 (개수 그룹)
        '',                         // I: 높이 (개수 그룹)
        '',                         // J: M (개수 그룹)
        '',                         // K: 제공자 (환산 그룹)
        '',                         // L: 1장->m2 (환산 그룹)
        '',                         // M: 장 (환산 그룹)
        'M2',                       // N: 단위
        '',                         // O: 수량 (타입 요약 행은 빈칸)
        Math.round(totalMaterialUnitPrice), // P: 계약도급 자재비 단가
        Math.round(totalMaterialCost),      // Q: 계약도급 자재비 금액
        Math.round(totalLaborUnitPrice),    // R: 계약도급 노무비 단가
        Math.round(totalLaborCost),         // S: 계약도급 노무비 금액
        Math.round(totalExpenseUnitPrice),  // T: 계약도급 경비 단가
        Math.round(totalExpenseCost),       // U: 계약도급 경비 금액
        Math.round(totalUnitPrice),         // V: 계약도급 합계 단가
        Math.round(totalCost),              // W: 계약도급 합계 금액
        '',                         // X: 비고
        '',                         // Y: 발주단가 자재비 단가
        '',                         // Z: 발주단가 자재비 금액
        '',                         // AA: 발주단가 노무비 단가
        '',                         // AB: 발주단가 노무비 금액
        '',                         // AC: 발주단가 경비 단가
        '',                         // AD: 발주단가 경비 금액
        '',                         // AE: 발주단가 합계 단가
        '',                         // AF: 발주단가 합계 금액
        ''                          // AG: 비고
    ];
}

/**
 * 레이어 상세 행 데이터 생성 (Excel용)
 */
async function generateLayerDetailRowsData(result, allResults) {
    const layerOrder = [
        'layer3_1', 'layer2_1', 'layer1_1',
        'column1', 'infill',
        'layer1_2', 'layer2_2', 'layer3_2',
        'column2', 'channel', 'runner'
    ];

    const totalArea = allResults.reduce((sum, r) => sum + (r.area || 0), 0);
    const rows = [];
    let layerNumber = 1;

    for (const layerKey of layerOrder) {
        const layer = result.layerPricing[layerKey];
        if (!layer || !layer.materialName) continue;

        const unitPriceItem = await findUnitPriceItemByIdOrName(layer.materialName);

        if (unitPriceItem && unitPriceItem.components && unitPriceItem.components.length > 0) {
            for (const component of unitPriceItem.components) {
                if (!shouldDisplayComponent(component.name)) continue;

                const rowData = await generateComponentRowData(component, unitPriceItem, result, layerNumber, totalArea);
                rows.push(rowData);
                layerNumber++;
            }
        }
    }

    return rows;
}

/**
 * 컴포넌트 행 데이터 생성 (Excel용)
 */
async function generateComponentRowData(component, unitPriceItem, result, layerNumber, totalArea) {
    const materialData = await findMaterialByIdInDB(component.materialId);
    const componentName = component.name || '';

    // 기본 정보
    const basic = unitPriceItem.basic || {};
    const wallTypeCode = result.wallType?.wallType || '';

    // 품명 및 규격
    let productName = materialData?.name || componentName;
    if (materialData?.spec) {
        productName += ` ${materialData.spec}`;
    }

    // WALL 정보
    let thk = '';
    let spacing = '';
    let thick = '';
    let width = '';
    let height = '';
    let length = '';
    let areaPerSheet = '';
    let sheets = '';

    // ✅ 제공자 입력값 가져오기 (HTML에서)
    let supplier = '';
    const supplierInput = document.querySelector(`.supplier-input[data-row="${layerNumber}"]`);
    if (supplierInput) {
        supplier = supplierInput.value || '';
    }

    const sizeData = parseSizeField(materialData?.size);

    if (isStud(componentName)) {
        // 스터드: @ 컬럼에 간격, M 컬럼에 (소요량 × 면적합계), 0단위 반올림
        spacing = basic.spacing || '';
        const quantity = component?.quantity || 0;

        if (materialData) {
            thick = materialData.t || sizeData.thickness || '';
            width = materialData.w || sizeData.width || '';
            height = materialData.h || sizeData.height || '';
            length = Math.round(quantity * totalArea);  // M 컬럼: 0단위 반올림
        }

    } else if (isRunner(componentName)) {
        // 런너: @ 컬럼 비움, M 컬럼에 (소요량 × 면적합계), 0단위 반올림
        spacing = '';  // ✅ 런너는 @ 값 비움
        const quantity = component?.quantity || 0;
        if (materialData) {
            thick = materialData.t || sizeData.thickness || '';
            width = materialData.w || sizeData.width || '';
            height = materialData.h || sizeData.height || '';
            length = Math.round(quantity * totalArea);  // M 컬럼: 0단위 반올림
        }

    } else if (isGypsumBoard(componentName)) {
        // 석고보드: THK 채우기 (D열), 1장->m2, 장 수량
        // ✅ 두께, 넓이, 높이는 비움 (개수 그룹에 표시 안 함)
        if (materialData) {
            thk = materialData.t || sizeData.thickness || '';  // THK (D열)
            thick = '';  // 두께 비움 (G열)
            width = '';  // 넓이 비움 (H열)
            height = ''; // 높이 비움 (I열)

            const w = parseFloat(materialData.w) || 0;
            const h = parseFloat(materialData.h) || 0;

            if (w > 0 && h > 0) {
                // ✅ (W/1000) * (H/1000) 소수 셋째자리
                areaPerSheet = ((w / 1000) * (h / 1000)).toFixed(3);

                // ✅ 장 수량: (면적 × 소요량) ÷ 1장당면적 (0단위 반올림)
                const componentQuantity = parseFloat(component.quantity) || 0;
                if (areaPerSheet && componentQuantity > 0) {
                    const actualQuantity = totalArea * componentQuantity;
                    sheets = Math.round(actualQuantity / parseFloat(areaPerSheet));
                }
            }
        }

    } else if (isGlassWool(componentName)) {
        // 그라스울: 두께, 넓이, 높이 비움 (석고보드와 동일)
        thick = '';
        width = '';
        height = '';
    }

    // 수량 및 단가
    // ✅ 수량은 면적 합계만 표시 (HTML과 동일)
    const finalQuantity = totalArea;
    const unit = 'M2';

    const materialPrice = parseFloat(component.materialPrice) || 0;
    const laborPrice = parseFloat(component.laborPrice) || 0;

    // ✅ 경비 입력값 가져오기 (HTML에서)
    const contractExpenseInput = document.querySelector(
        `.contract-expense-price[data-row="${layerNumber}"]`
    );
    const contractExpensePrice = contractExpenseInput
        ? parseFloat(contractExpenseInput.value) || 0 : 0;

    const orderExpenseInput = document.querySelector(
        `.order-expense-price[data-row="${layerNumber}"]`
    );
    const orderExpensePrice = orderExpenseInput
        ? parseFloat(orderExpenseInput.value) || 0 : 0;

    // ✅ 금액 = 단가 × 면적합계
    const materialCost = materialPrice * totalArea;
    const laborCost = laborPrice * totalArea;
    const contractExpenseCost = contractExpensePrice * totalArea;
    const orderExpenseCost = orderExpensePrice * totalArea;

    // 계약도급 합계
    const totalPrice = materialPrice + laborPrice + contractExpensePrice;
    const totalCost = materialCost + laborCost + contractExpenseCost;

    // 발주단가 합계 (입력값 기준)
    const orderTotalPriceInput = document.querySelector(
        `.order-total-price[data-row="${layerNumber}"]`
    );
    const orderTotalPrice = orderTotalPriceInput
        ? parseFloat(orderTotalPriceInput.value) || 0 : 0;
    const orderTotalCost = orderTotalPrice * totalArea;

    // 33개 컬럼 데이터 배열 반환 (HTML TD 순서와 정확히 일치)
    return [
        layerNumber,                    // A: NO
        '',                             // B: 구분
        productName,                    // C: 품명 및 규격
        thk,                            // D: THK (석고보드만)
        wallTypeCode,                   // E: Type
        spacing,                        // F: @ (스터드/런너만, 개수 그룹)
        thick,                          // G: 두께 (스터드/런너만, 개수 그룹)
        width,                          // H: 넓이 (스터드/런너만, 개수 그룹)
        height,                         // I: 높이 (스터드/런너만, 개수 그룹)
        length,                         // J: M (스터드/런너만, 개수 그룹)
        supplier,                       // K: 제공자 (환산 그룹)
        areaPerSheet,                   // L: 1장->m2 (석고보드만, 환산 그룹)
        sheets,                         // M: 장 (석고보드만, 환산 그룹)
        unit,                           // N: 단위
        finalQuantity,                  // O: 수량
        Math.round(materialPrice),      // P: 계약도급 자재비 단가
        Math.round(materialCost),       // Q: 계약도급 자재비 금액
        Math.round(laborPrice),         // R: 계약도급 노무비 단가
        Math.round(laborCost),          // S: 계약도급 노무비 금액
        Math.round(contractExpensePrice), // T: 계약도급 경비 단가
        Math.round(contractExpenseCost),  // U: 계약도급 경비 금액
        Math.round(totalPrice),         // V: 계약도급 합계 단가
        Math.round(totalCost),          // W: 계약도급 합계 금액
        '',                             // X: 비고
        '',                             // Y: 발주단가 자재비 단가
        '',                             // Z: 발주단가 자재비 금액
        '',                             // AA: 발주단가 노무비 단가
        '',                             // AB: 발주단가 노무비 금액
        Math.round(orderExpensePrice),  // AC: 발주단가 경비 단가
        Math.round(orderExpenseCost),   // AD: 발주단가 경비 금액
        Math.round(orderTotalPrice),    // AE: 발주단가 합계 단가
        Math.round(orderTotalCost),     // AF: 발주단가 합계 금액
        ''                              // AG: 비고
    ];
}

/**
 * 발주서 Excel 스타일 적용
 * 33개 컬럼 기준 (A~AG)
 */
function applyOrderFormExcelStyles(worksheet) {
    // 모든 데이터 행에 테두리 적용
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 3) { // 헤더 이후
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                // 테두리
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // 정렬
                if (colNumber === 1 || colNumber === 2 || colNumber === 3) {
                    // A, B, C: NO, 구분, 품명 - 좌측 정렬
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                } else {
                    // 나머지 - 가운데 정렬
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }

                // 숫자 포맷 (천단위 콤마)
                // P~U: 계약도급 (16~21)
                if (colNumber >= 16 && colNumber <= 21) {
                    if (cell.value && !isNaN(cell.value)) {
                        cell.numFmt = '#,##0';
                    }
                }
                // W~AB: 발주단가 (23~28)
                if (colNumber >= 23 && colNumber <= 28) {
                    if (cell.value && !isNaN(cell.value)) {
                        cell.numFmt = '#,##0';
                    }
                }
            });
        }
    });

    console.log('✅ 발주서 Excel 스타일 적용 완료');
}

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