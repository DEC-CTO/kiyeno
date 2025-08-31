/**
 * 벽체 계산 결과 하단 슬라이드 패널 관리
 */

// 전역 변수
let calculationResults = [];
let isResultsPanelOpen = false;
let currentActiveTab = 'individual';

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
        for (let i = 0; i < selectedWalls.length; i++) {
            const wall = selectedWalls[i];
            const result = await calculateSingleWallCost(wall, i + 1);
            if (result) {
                calculationResults.push(result);
            }
            updateCalculationProgress(i + 1, selectedWalls.length);
        }
        
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
            materialCost: totalCost.materialCost,
            laborCost: totalCost.laborCost,
            totalCost: totalCost.totalCost,
            unitPrice: area > 0 ? totalCost.totalCost / area : 0,
            
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
    
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let layerCount = 0;
    
    Object.entries(layerPricing).forEach(([layerKey, layer]) => {
        const materialCost = (layer.materialPrice || 0) * area;
        const laborCost = (layer.laborPrice || 0) * area;
        
        console.log(`  ${layerKey}: ${layer.materialName} - 재료비 ${layer.materialPrice}×${area} = ${materialCost}, 노무비 ${layer.laborPrice}×${area} = ${laborCost}`);
        
        totalMaterialCost += materialCost;
        totalLaborCost += laborCost;
        layerCount++;
    });
    
    const result = {
        materialCost: totalMaterialCost,
        laborCost: totalLaborCost,
        totalCost: totalMaterialCost + totalLaborCost,
        area: area
    };
    
    console.log(`💰 총 금액 계산 완료: ${layerCount}개 레이어, 재료비 ${totalMaterialCost}, 노무비 ${totalLaborCost}, 총계 ${result.totalCost}`);
    
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
 * 벽체별 상세 결과 렌더링
 */
function renderIndividualResults() {
    const container = document.querySelector('.wall-results-container');
    if (!container || calculationResults.length === 0) return;
    
    container.innerHTML = '';
    
    calculationResults.forEach(result => {
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
            <button class="btn btn-sm btn-outline-primary" onclick="viewWallDetails('${result.elementId}')">
                <i class="fas fa-eye"></i> 상세보기
            </button>
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
        const totalCost = (layer.materialPrice + layer.laborPrice) * area;
        return `
            <div class="layer-item material-name">${layer.materialName}</div>
            <div class="layer-item">₩${layer.materialPrice.toLocaleString()}/m²</div>
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
    
    const labels = Object.keys(wallTypeData);
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
 * 비교 분석 렌더링
 */
function renderComparisonResults() {
    const tbody = document.getElementById('comparisonTableBody');
    if (!tbody || calculationResults.length === 0) return;
    
    tbody.innerHTML = '';
    
    calculationResults.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${result.wallName}</td>
            <td class="text-right">${result.area.toFixed(2)}</td>
            <td class="text-right">₩${result.unitPrice.toLocaleString()}</td>
            <td class="text-right cost-cell">₩${result.materialCost.toLocaleString()}</td>
            <td class="text-right cost-cell">₩${result.laborCost.toLocaleString()}</td>
            <td class="text-right cost-cell">₩${result.totalCost.toLocaleString()}</td>
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
};

/**
 * Excel 내보내기
 */
window.exportCalculationResults = function() {
    if (calculationResults.length === 0) {
        alert('내보낼 계산 결과가 없습니다.');
        return;
    }
    
    try {
        console.log('📊 Excel 내보내기 시작:', calculationResults.length, '개 벽체');
        
        // 워크북 생성
        const wb = XLSX.utils.book_new();
        
        // 1. 벽체별 상세 시트
        createDetailSheet(wb);
        
        // 2. 집계 현황 시트
        createSummarySheet(wb);
        
        // 3. 비교 분석 시트
        createComparisonSheet(wb);
        
        // 4. 레이어별 자재 시트
        createMaterialSheet(wb);
        
        // 파일 이름 생성
        const now = new Date();
        const dateStr = now.toLocaleDateString('ko-KR').replace(/\./g, '').replace(/\s/g, '');
        const timeStr = now.toLocaleTimeString('ko-KR', {hour12: false}).replace(/:/g, '');
        const filename = `벽체계산결과_${dateStr}_${timeStr}.xlsx`;
        
        // Excel 파일 다운로드
        XLSX.writeFile(wb, filename);
        
        console.log('✅ Excel 파일 생성 완료:', filename);
        
    } catch (error) {
        console.error('Excel 내보내기 실패:', error);
        alert('Excel 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
};

/**
 * 벽체별 상세 시트 생성
 */
function createDetailSheet(wb) {
    const data = [];
    
    // 헤더 추가
    data.push([
        'ElementID', '벽체명', '공간명', '레벨', '면적(m²)', '높이(m)', '길이(m)', '두께(mm)',
        '재료비(₩)', '노무비(₩)', '총계(₩)', '단가(₩/m²)', '계산일시'
    ]);
    
    // 데이터 추가
    calculationResults.forEach(result => {
        data.push([
            result.elementId,
            result.wallName,
            result.roomName,
            result.level,
            result.area,
            result.height,
            result.length,
            result.thickness,
            result.materialCost,
            result.laborCost,
            result.totalCost,
            result.unitPrice,
            new Date(result.calculatedAt).toLocaleString('ko-KR')
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 12}, {wch: 20}, {wch: 15}, {wch: 10}, {wch: 12},
        {wch: 10}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15},
        {wch: 15}, {wch: 15}, {wch: 20}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '벽체별상세');
}

/**
 * 집계 현황 시트 생성
 */
function createSummarySheet(wb) {
    const data = [];
    
    // 전체 합계
    const totalArea = calculationResults.reduce((sum, r) => sum + r.area, 0);
    const totalMaterialCost = calculationResults.reduce((sum, r) => sum + r.materialCost, 0);
    const totalLaborCost = calculationResults.reduce((sum, r) => sum + r.laborCost, 0);
    const totalProjectCost = totalMaterialCost + totalLaborCost;
    
    data.push(['=== 전체 집계 ===']);
    data.push(['총 벽체 수', calculationResults.length, '개']);
    data.push(['총 면적', totalArea, 'm²']);
    data.push(['총 재료비', totalMaterialCost, '₩']);
    data.push(['총 노무비', totalLaborCost, '₩']);
    data.push(['총 공사비', totalProjectCost, '₩']);
    data.push(['평균 단가', totalArea > 0 ? totalProjectCost / totalArea : 0, '₩/m²']);
    data.push([]);
    
    // 벽체 타입별 집계
    data.push(['=== 벽체 타입별 집계 ===']);
    data.push(['벽체 타입', '개수', '면적(m²)', '재료비(₩)', '노무비(₩)', '총계(₩)', '평균단가(₩/m²)']);
    
    const typeData = {};
    calculationResults.forEach(result => {
        const typeName = result.wallName;
        if (typeData[typeName]) {
            typeData[typeName].count += 1;
            typeData[typeName].area += result.area;
            typeData[typeName].materialCost += result.materialCost;
            typeData[typeName].laborCost += result.laborCost;
        } else {
            typeData[typeName] = {
                count: 1,
                area: result.area,
                materialCost: result.materialCost,
                laborCost: result.laborCost
            };
        }
    });
    
    Object.entries(typeData).forEach(([typeName, typeInfo]) => {
        const totalCost = typeInfo.materialCost + typeInfo.laborCost;
        const unitPrice = typeInfo.area > 0 ? totalCost / typeInfo.area : 0;
        
        data.push([
            typeName,
            typeInfo.count,
            typeInfo.area,
            typeInfo.materialCost,
            typeInfo.laborCost,
            totalCost,
            unitPrice
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 20}, {wch: 10}, {wch: 12}, {wch: 15},
        {wch: 15}, {wch: 15}, {wch: 15}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '집계현황');
}

/**
 * 비교 분석 시트 생성
 */
function createComparisonSheet(wb) {
    const data = [];
    
    // 헤더 추가
    data.push(['벽체명', '면적(m²)', '단가(₩/m²)', '재료비(₩)', '노무비(₩)', '총계(₩)', '비율(%)']);
    
    const totalCost = calculationResults.reduce((sum, r) => sum + r.totalCost, 0);
    
    // 데이터 추가
    calculationResults.forEach(result => {
        const percentage = totalCost > 0 ? ((result.totalCost / totalCost) * 100).toFixed(2) : 0;
        
        data.push([
            result.wallName,
            result.area,
            result.unitPrice,
            result.materialCost,
            result.laborCost,
            result.totalCost,
            percentage
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 25}, {wch: 12}, {wch: 15}, {wch: 15},
        {wch: 15}, {wch: 15}, {wch: 10}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '비교분석');
}

/**
 * 레이어별 자재 시트 생성
 */
function createMaterialSheet(wb) {
    const data = [];
    
    // 헤더 추가
    data.push([
        'ElementID', '벽체명', '레이어', '자재명', '공종1', '공종2', 
        '재료비단가(₩/m²)', '노무비단가(₩/m²)', '면적(m²)', '재료비계(₩)', '노무비계(₩)', '소계(₩)'
    ]);
    
    // 데이터 추가
    calculationResults.forEach(result => {
        Object.entries(result.layerPricing || {}).forEach(([layerKey, layer]) => {
            if (!layer.found || !layer.materialName) return;
            
            const materialTotal = layer.materialPrice * result.area;
            const laborTotal = layer.laborPrice * result.area;
            const subtotal = materialTotal + laborTotal;
            
            data.push([
                result.elementId,
                result.wallName,
                getLayerDisplayName(layerKey),
                layer.materialName,
                layer.workType1 || '',
                layer.workType2 || '',
                layer.materialPrice,
                layer.laborPrice,
                result.area,
                materialTotal,
                laborTotal,
                subtotal
            ]);
        });
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 12}, {wch: 20}, {wch: 15}, {wch: 25}, {wch: 12}, {wch: 12},
        {wch: 15}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '레이어별자재');
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
 * 단일 벽체 상세보기
 */
window.viewWallDetails = function(elementId) {
    const result = calculationResults.find(r => r.elementId === elementId);
    if (!result) return;
    
    console.log('🔍 벽체 상세보기:', result.wallName, result);
    alert('벽체 상세보기 기능을 구현 중입니다.');
};

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

console.log('✅ wall-cost-calculator.js 로드 완료');