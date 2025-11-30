/**
 * 벽체 계산 결과 하단 슬라이드 패널 관리
 */

// 전역 변수
let calculationResults = [];
window.calculationResults = calculationResults; // 전역 노출
let isResultsPanelOpen = false;
let currentActiveTab = 'comparison';
let isOrderFormRendered = false;
let isPriceComparisonRendered = false;
let orderFormDirectCosts = []; // 발주서 직접비 데이터 저장

/**
 * 벽체 비용 계산 시작
 */
window.calculateWallCosts = async function () {
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
    window.calculationResults = calculationResults; // 전역 동기화
    let failedCount = 0; // 실패한 벽체 카운트

    // 렌더링 플래그 리셋 (새 계산 시 재렌더링되도록)
    isOrderFormRendered = false;
    isPriceComparisonRendered = false;

    for (let i = 0; i < selectedWalls.length; i++) {
      const wall = selectedWalls[i];
      const result = await calculateSingleWallCost(wall, i + 1);
      if (result) {
        calculationResults.push(result);
      } else {
        failedCount++; // 실패 카운트 증가
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

    // 계산 요약 메시지 표시
    if (failedCount > 0) {
      showToast(
        `계산 완료: 성공 ${calculationResults.length}개, 실패 ${failedCount}개`,
        'warning'
      );
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
    const dataSource =
      window.filteredRevitWallData ||
      (typeof filteredRevitWallData !== 'undefined'
        ? filteredRevitWallData
        : null);

    console.log('📊 데이터 소스 상태:', {
      'window.filteredRevitWallData':
        window.filteredRevitWallData?.length || 'undefined',
      'global filteredRevitWallData':
        typeof filteredRevitWallData !== 'undefined'
          ? filteredRevitWallData.length
          : 'undefined',
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

    // 3. 면적 기반 총 금액 계산 (소수점 반올림 적용)
    // 면적: 3째자리 반올림 → 2자리, 길이/높이/두께: 4째자리 반올림 → 3자리
    const area = Math.round((parseFloat(wall.Area) || 0) * 100) / 100;
    const totalCost = calculateTotalCost(layerPricing, area);

    return {
      // Revit 정보
      elementId: wall.Id,
      wallName: wall.Name,
      roomName: wall.RoomName || '미지정',
      area: area,
      height: Math.round((parseFloat(wall.Height) || 0) * 1000) / 1000,
      length: Math.round((parseFloat(wall.Length) || 0) * 1000) / 1000,
      thickness: Math.round((parseFloat(wall.Thickness) || 0) * 1000) / 1000,
      level: wall.Level || '',

      // 매칭 정보
      wallType: wallTypeMatch,
      layerPricing: layerPricing,

      // 계산 결과
      materialCost: totalCost.materialCost, // 총 자재비
      laborCost: totalCost.laborCost, // 총 노무비
      totalCost: totalCost.totalCost, // 총계
      materialUnitPrice: totalCost.materialUnitPrice, // M2당 자재비 단가
      laborUnitPrice: totalCost.laborUnitPrice, // M2당 노무비 단가
      unitPrice: totalCost.unitPrice, // M2당 총 단가

      // 메타데이터
      calculatedAt: new Date().toISOString(),
      sequence: sequence,
    };
  } catch (error) {
    console.error(`❌ 벽체 계산 실패: ${wall.Name}`, error);
    showToast(`벽체 계산 실패: ${wall.Name || wall.id}`, 'error');
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
    if (
      window.revitWallTypes &&
      Array.isArray(window.revitWallTypes) &&
      window.revitWallTypes.length > 0
    ) {
      console.log('📋 revitWallTypes:', window.revitWallTypes.length, '개');
      window.revitWallTypes.forEach((wt) => {
        console.log(
          `  📝 벽체 타입: "${wt.wallType}" (찾는값: "${wallTypeName}")`
        );
      });

      const match = window.revitWallTypes.find(
        (wt) => wt.wallType === wallTypeName
      );
      if (match) {
        console.log('✅ 벽체 타입 매칭 성공:', match.wallType);
        return match;
      } else {
        console.log('❌ revitWallTypes에서 매칭 실패');
      }
    } else {
      console.log(
        '❌ revitWallTypes 사용 불가능 또는 비어있음 - 데이터 로드 시도'
      );

      // 벽체 타입 데이터가 없으면 즉시 로드 시도
      if (typeof window.loadRevitWallTypes === 'function') {
        console.log('🔄 벽체 타입 데이터 재로드 시도...');
        window.loadRevitWallTypes();

        // 재로드 후 다시 확인
        if (window.revitWallTypes && window.revitWallTypes.length > 0) {
          console.log('✅ 재로드 성공:', window.revitWallTypes.length, '개');
          const match = window.revitWallTypes.find(
            (wt) => wt.wallType === wallTypeName
          );
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

    console.log(
      '❌ 벽체 타입 검색 실패 - 벽체 타입 관리에서 해당 타입을 확인해주세요'
    );
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
    'layer3_1',
    'layer2_1',
    'layer1_1',
    'column1',
    'infill',
    'layer1_2',
    'layer2_2',
    'layer3_2',
    'column2',
    'channel',
    'runner',
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
        found: !!materialData,
      };

      if (materialData) {
        foundMaterialsCount++;
        console.log(
          `  ✅ 자재 데이터 찾음: 재료비 ${materialData.materialPrice}, 노무비 ${materialData.laborPrice}`
        );
      } else {
        console.log(`  ❌ 자재 데이터 없음: "${materialName}"`);
      }
    } else {
      console.log(`  ⬜ 빈 레이어: ${layerKey}`);
    }
  }

  console.log(
    `📊 레이어 자재 추출 완료: 총 ${foundMaterialsCount}개 자재 발견`
  );
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
      const foundItem = unitPriceItems.find(
        (item) => item.id && item.id.trim() === searchName.trim()
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
          totalCosts: foundItem.totalCosts,
        };
      } else {
        console.log('❌ 일위대가 DB에서 해당 ID를 찾지 못함:', searchName);

        // 디버깅: 유사한 ID들 찾기
        const similarIds = unitPriceItems
          .map((item) => item.id)
          .filter(
            (id) => id && (id.includes('석고보드') || id.includes('STUD'))
          )
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

      const material = allMaterials.find(
        (m) => m.name && m.name.trim() === searchName.trim()
      );

      if (material) {
        console.log(
          `✅ 기본 자재 DB에서 발견: ${material.name}, 재료비: ${material.materialPrice}, 노무비: ${material.laborPrice}`
        );
        return {
          name: material.name,
          spec: material.size || '',
          materialPrice: parseFloat(material.materialPrice) || 0,
          laborPrice: parseFloat(material.laborPrice) || 0,
          workType1: material.workType1 || '',
          workType2: material.workType2 || '',
          unit: material.unit || 'M2',
          source: 'priceDatabase',
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
  let materialUnitPrice = 0; // M2당 자재비 단가
  let laborUnitPrice = 0; // M2당 노무비 단가
  let layerCount = 0;

  Object.entries(layerPricing).forEach(([layerKey, layer]) => {
    const layerMaterialPrice = layer.materialPrice || 0;
    const layerLaborPrice = layer.laborPrice || 0;

    console.log(
      `  ${layerKey}: ${layer.materialName} - 자재비단가 ${layerMaterialPrice}, 노무비단가 ${layerLaborPrice}`
    );

    materialUnitPrice += layerMaterialPrice;
    laborUnitPrice += layerLaborPrice;
    layerCount++;
  });

  console.log(
    `📊 M2당 단가 합계 - 자재비: ${materialUnitPrice}원/M2, 노무비: ${laborUnitPrice}원/M2`
  );

  // 2단계: 면적 곱하기 (총 금액 계산)
  const totalMaterialCost = Math.round(materialUnitPrice * area);
  const totalLaborCost = Math.round(laborUnitPrice * area);
  const totalCost = totalMaterialCost + totalLaborCost;
  const unitPrice = materialUnitPrice + laborUnitPrice; // M2당 총 단가

  const result = {
    materialCost: totalMaterialCost, // 총 자재비
    laborCost: totalLaborCost, // 총 노무비
    totalCost: totalCost, // 총계
    materialUnitPrice: materialUnitPrice, // M2당 자재비 단가
    laborUnitPrice: laborUnitPrice, // M2당 노무비 단가
    unitPrice: unitPrice, // M2당 총 단가
    area: area,
  };

  console.log(`💰 총 금액 계산 완료: ${layerCount}개 레이어`);
  console.log(
    `  - M2당 단가: 자재비 ${materialUnitPrice}, 노무비 ${laborUnitPrice}, 총 ${unitPrice}`
  );
  console.log(
    `  - 총 금액: 자재비 ${totalMaterialCost}, 노무비 ${totalLaborCost}, 총계 ${totalCost}`
  );

  return result;
}

/**
 * 계산 진행 상황 표시
 */
function showCalculationProgress(totalCount) {
  // 간단한 진행 표시 (나중에 모달로 개선 가능)
  const button = document.querySelector(
    'button[onclick="calculateWallCosts()"]'
  );
  if (button) {
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 계산 중...';
    button.disabled = true;
  }
}

function updateCalculationProgress(current, total) {
  const button = document.querySelector(
    'button[onclick="calculateWallCosts()"]'
  );
  if (button) {
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 계산 중... (${current}/${total})`;
  }
}

function hideCalculationProgress() {
  const button = document.querySelector(
    'button[onclick="calculateWallCosts()"]'
  );
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
window.toggleResultsPanel = function () {
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
window.closeResultsPanel = function () {
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
    const totalCost = calculationResults.reduce(
      (sum, result) => sum + result.totalCost,
      0
    );
    const totalArea = calculationResults.reduce(
      (sum, result) => sum + result.area,
      0
    );

    summaryElement.textContent = `${totalCount}개 벽체, ${totalArea.toFixed(
      2
    )}m², ₩${totalCost.toLocaleString()}`;
  }
}

/**
 * 계산 결과 렌더링
 */
async function renderCalculationResults() {
  renderIndividualResults();
  renderSummaryResults();
  renderComparisonResults();
  await renderMaterialSummaryTable();
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

  sortedResults.forEach((result) => {
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
            <button class="btn btn-sm btn-outline-success" onclick="exportSingleWall('${
              result.elementId
            }')">
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
  const leftSection = createLayerSection(
    '🏗️ 좌측 레이어',
    leftLayers,
    layerPricing,
    area
  );
  if (leftSection) sections.push(leftSection);

  // 구조체
  const structureLayers = ['column1', 'infill', 'column2'];
  const structureSection = createLayerSection(
    '🔧 구조체',
    structureLayers,
    layerPricing,
    area
  );
  if (structureSection) sections.push(structureSection);

  // 우측 레이어
  const rightLayers = ['layer1_2', 'layer2_2', 'layer3_2'];
  const rightSection = createLayerSection(
    '🏗️ 우측 레이어',
    rightLayers,
    layerPricing,
    area
  );
  if (rightSection) sections.push(rightSection);

  return sections.join('');
}

/**
 * 개별 레이어 섹션 생성
 */
function createLayerSection(title, layerKeys, layerPricing, area) {
  const items = layerKeys
    .map((key) => layerPricing[key])
    .filter((layer) => layer && layer.materialName);

  if (items.length === 0) return '';

  const layerItems = items
    .map((layer) => {
      const materialCost = Math.round(layer.materialPrice * area);
      const laborCost = Math.round(layer.laborPrice * area);
      const totalCost = materialCost + laborCost;

      return `
            <div class="layer-item material-name">${layer.materialName}</div>
            <div class="layer-item">₩${Math.round(
              layer.materialPrice
            ).toLocaleString()}</div>
            <div class="layer-item">₩${Math.round(
              layer.laborPrice
            ).toLocaleString()}</div>
            <div class="layer-item cost">₩${totalCost.toLocaleString()}</div>
        `;
    })
    .join('');

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
let roomChart = null;
let levelChart = null;

/**
 * 발주서 직접비에서 재료별 합계 집계 함수
 * 발주서에서 이미 계산된 금액을 그대로 사용
 * @returns {Array} 재료별 집계 데이터 배열
 */
function aggregateMaterialsByType() {
  console.log('📊 재료별 합계 집계 시작 (발주서 직접비 사용)');

  if (calculationResults.length === 0) {
    console.log('❌ 계산 결과 없음');
    return [];
  }

  if (orderFormDirectCosts.length === 0) {
    console.log('⚠️ 발주서 직접비 데이터가 없습니다. 발주서 탭을 먼저 렌더링하세요.');
    return [];
  }

  console.log(`📋 발주서 직접비 항목 개수: ${orderFormDirectCosts.length}`);

  // 재료별 집계 맵
  const materialMap = {};

  // 발주서 직접비 데이터를 품명별로 집계
  for (let i = 0; i < orderFormDirectCosts.length; i++) {
    const comp = orderFormDirectCosts[i];

    if (i < 3) {
      console.log(`  📦 직접비 항목 ${i + 1}:`, {
        name: comp.name,
        spec: comp.spec,
        unit: comp.unit,
        orderMatAmount: comp.orderMatAmount,
        orderLabAmount: comp.orderLabAmount,
        mValue: comp.mValue,
        sheetQuantity: comp.sheetQuantity
      });
    }

    const name = comp.name || '';
    const spec = comp.spec || '';
    const key = `${name}_${spec}`.trim();

    // ✅ 발주서에서 이미 계산된 금액을 그대로 사용
    const materialCost = comp.orderMatAmount || 0;
    const laborCost = comp.orderLabAmount || 0;

    // ✅ 수량: 석고보드는 sheetQuantity(14번 컬럼), 나머지는 mValue(11번 컬럼)
    let quantity = 0;
    let isSheet = false;
    if (isGypsumBoard(name) && comp.sheetQuantity) {
      quantity = comp.sheetQuantity;
      isSheet = true;
    } else if (comp.mValue !== null && comp.mValue !== undefined) {
      quantity = comp.mValue;
    } else {
      quantity = (comp.quantity || 0) * (comp.area || 0);
    }

    const unit = comp.unit || '';

    if (!materialMap[key]) {
      materialMap[key] = {
        nameSpec: `${name} ${spec}`.trim(),  // 품명+규격 통합
        unit: unit,
        quantity: 0,
        isWelding: isWeldingRod(name),  // 용접봉 여부 저장
        isSheet: isSheet,  // 석고보드 장수 여부 저장
        materialCost: 0,
        laborCost: 0,
      };
    }

    // 발주서에서 이미 계산된 금액을 그대로 합산
    materialMap[key].quantity += quantity;
    materialMap[key].materialCost += materialCost;
    materialMap[key].laborCost += laborCost;
  }

  // 맵을 배열로 변환하고 정렬
  const materialsArray = Object.values(materialMap).sort((a, b) => {
    if (a.nameSpec < b.nameSpec) return -1;
    if (a.nameSpec > b.nameSpec) return 1;
    return 0;
  });

  console.log(`\n✅ 재료별 집계 완료: ${materialsArray.length}개 자재`);
  console.log(`📊 집계 결과 (처음 5개):`, materialsArray.slice(0, 5));

  return materialsArray;
}

/**
 * 집계 현황 렌더링
 */
function renderSummaryResults() {
  if (calculationResults.length === 0) return;

  console.log('📊 집계 현황 렌더링 시작');

  const totalArea = calculationResults.reduce(
    (sum, result) => sum + result.area,
    0
  );
  const totalMaterialCost = calculationResults.reduce(
    (sum, result) => sum + result.materialCost,
    0
  );
  const totalLaborCost = calculationResults.reduce(
    (sum, result) => sum + result.laborCost,
    0
  );
  const totalProjectCost = totalMaterialCost + totalLaborCost;

  // 요약 카드 업데이트
  document.getElementById('totalArea').textContent = `${totalArea.toFixed(
    2
  )} m²`;
  document.getElementById(
    'totalMaterialCost'
  ).textContent = `₩${totalMaterialCost.toLocaleString()}`;
  document.getElementById(
    'totalLaborCost'
  ).textContent = `₩${totalLaborCost.toLocaleString()}`;
  document.getElementById(
    'totalProjectCost'
  ).textContent = `₩${totalProjectCost.toLocaleString()}`;

  // 차트 렌더링
  renderWorkTypeChart();
  renderWallTypeChart();
  renderRoomChart();
  renderLevelChart();

  console.log('✅ 집계 현황 렌더링 완료');
}

/**
 * 재료별 합계 테이블 렌더링
 */
async function renderMaterialSummaryTable() {
  console.log('📊 재료별 합계 테이블 렌더링 시작');

  const tableBody = document.getElementById('materialSummaryTableBody');
  const tableFoot = document.getElementById('materialSummaryTableFoot');

  if (!tableBody || !tableFoot) {
    console.error('❌ 재료별 합계 테이블 요소를 찾을 수 없습니다.');
    return;
  }

  // 발주서가 렌더링되지 않았으면 먼저 렌더링
  if (orderFormDirectCosts.length === 0) {
    console.log('⚠️ 발주서 데이터가 없습니다. 발주서 탭을 먼저 렌더링합니다...');
    await renderOrderFormTab();
  }

  // 재료별 집계 데이터 가져오기
  const materials = aggregateMaterialsByType();

  console.log('📊 집계 완료, materials.length:', materials.length);

  if (materials.length === 0) {
    console.log('❌ 집계된 재료 없음 - 빈 메시지 표시');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">집계된 재료가 없습니다.</td></tr>';
    tableFoot.innerHTML = '';
    return;
  }

  // 테이블 본문 생성
  let totalQuantity = 0;
  let totalMaterialCostSum = 0;
  let totalLaborCostSum = 0;
  let totalSum = 0;

  const rows = materials.map((material, index) => {
    // materialCost와 laborCost는 이미 반올림된 값
    const totalCost = material.materialCost + material.laborCost;
    totalQuantity += material.quantity;
    totalMaterialCostSum += material.materialCost;
    totalLaborCostSum += material.laborCost;
    totalSum += totalCost;

    // ✅ 용접봉은 소수점 표시, 나머지는 정수 표시
    let quantityDisplay;
    if (material.isWelding) {
      quantityDisplay = material.quantity.toLocaleString('ko-KR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2
      });
    } else {
      quantityDisplay = Math.round(material.quantity).toLocaleString();
    }

    return `
      <tr>
        <td>${material.nameSpec}</td>
        <td style="text-align: center;">${material.unit}</td>
        <td style="text-align: right;">${quantityDisplay}</td>
        <td style="text-align: right;">₩${material.materialCost.toLocaleString()}</td>
        <td style="text-align: right;">₩${material.laborCost.toLocaleString()}</td>
        <td style="text-align: right; font-weight: bold;">₩${totalCost.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  tableBody.innerHTML = rows;

  // 합계 행 생성 (이미 반올림된 값들의 합)
  tableFoot.innerHTML = `
    <tr style="background-color: #f8f9fa; font-weight: bold;">
      <td colspan="2" style="text-align: center;">합계</td>
      <td style="text-align: right;">-</td>
      <td style="text-align: right;">₩${totalMaterialCostSum.toLocaleString()}</td>
      <td style="text-align: right;">₩${totalLaborCostSum.toLocaleString()}</td>
      <td style="text-align: right; color: #2563eb;">₩${totalSum.toLocaleString()}</td>
    </tr>
  `;

  console.log(`✅ 재료별 합계 테이블 렌더링 완료: ${materials.length}개 자재`);
  console.log(`   총 재료비: ₩${totalMaterialCostSum.toLocaleString()}`);
  console.log(`   총 노무비: ₩${totalLaborCostSum.toLocaleString()}`);
  console.log(`   총   합계: ₩${totalSum.toLocaleString()}`);
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

  calculationResults.forEach((result) => {
    Object.values(result.layerPricing || {}).forEach((layer) => {
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
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = data.reduce((sum, value) => sum + value, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${
                context.label
              }: ₩${context.parsed.toLocaleString()} (${percentage}%)`;
            },
          },
        },
      },
    },
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

  calculationResults.forEach((result) => {
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
        count: 1,
      };
    }
  });

  // ✅ 정렬 적용
  const labels = sortWallTypeNames(Object.keys(wallTypeData));
  const materialData = labels.map((label) => wallTypeData[label].materialCost);
  const laborData = labels.map((label) => wallTypeData[label].laborCost);

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
          borderWidth: 1,
        },
        {
          label: '노무비',
          data: laborData,
          backgroundColor: '#FF9800',
          borderColor: '#F57C00',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: '벽체 타입',
          },
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: '비용 (₩)',
          },
          ticks: {
            callback: function (value) {
              return '₩' + value.toLocaleString();
            },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const wallType = context.label;
              const data = wallTypeData[wallType];
              const unitPrice = data.area > 0 ? data.totalCost / data.area : 0;

              return [
                `${
                  context.dataset.label
                }: ₩${context.parsed.y.toLocaleString()}`,
                `면적: ${data.area.toFixed(2)}m²`,
                `단가: ₩${unitPrice.toLocaleString()}/m²`,
                `개수: ${data.count}개`,
              ];
            },
          },
        },
      },
    },
  });
}

/**
 * 실별 비용 분포 차트 렌더링
 */
function renderRoomChart() {
  const ctx = document.getElementById('roomChart');
  if (!ctx || calculationResults.length === 0) return;

  // 기존 차트 파괴
  if (roomChart) {
    roomChart.destroy();
  }

  // 실별 데이터 집계
  const roomData = {};

  calculationResults.forEach((result) => {
    const roomName = result.roomName || '미지정';

    if (roomData[roomName]) {
      roomData[roomName].materialCost += result.materialCost;
      roomData[roomName].laborCost += result.laborCost;
      roomData[roomName].area += result.area;
      roomData[roomName].count += 1;
    } else {
      roomData[roomName] = {
        materialCost: result.materialCost,
        laborCost: result.laborCost,
        area: result.area,
        count: 1,
      };
    }
  });

  const labels = Object.keys(roomData);
  const materialData = labels.map((label) => roomData[label].materialCost);
  const laborData = labels.map((label) => roomData[label].laborCost);

  roomChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '재료비',
          data: materialData,
          backgroundColor: '#2196F3',
          borderColor: '#1976D2',
          borderWidth: 1,
        },
        {
          label: '노무비',
          data: laborData,
          backgroundColor: '#FFC107',
          borderColor: '#FFA000',
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: 'y', // 가로 막대
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: '비용 (₩)',
          },
          ticks: {
            callback: function (value) {
              return '₩' + value.toLocaleString();
            },
          },
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: '실(공간)명',
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const roomName = context.label;
              const data = roomData[roomName];
              const unitPrice = data.area > 0 ? (data.materialCost + data.laborCost) / data.area : 0;

              return [
                `${context.dataset.label}: ₩${context.parsed.x.toLocaleString()}`,
                `면적: ${data.area.toFixed(2)}m²`,
                `단가: ₩${unitPrice.toLocaleString()}/m²`,
                `개수: ${data.count}개`,
              ];
            },
          },
        },
      },
    },
  });
}

/**
 * 레벨별 비용 분포 차트 렌더링
 */
function renderLevelChart() {
  const ctx = document.getElementById('levelChart');
  if (!ctx || calculationResults.length === 0) return;

  // 기존 차트 파괴
  if (levelChart) {
    levelChart.destroy();
  }

  // 레벨별 데이터 집계
  const levelData = {};

  calculationResults.forEach((result) => {
    const level = result.level || '미지정';

    if (levelData[level]) {
      levelData[level].materialCost += result.materialCost;
      levelData[level].laborCost += result.laborCost;
      levelData[level].area += result.area;
      levelData[level].count += 1;
    } else {
      levelData[level] = {
        materialCost: result.materialCost,
        laborCost: result.laborCost,
        area: result.area,
        count: 1,
      };
    }
  });

  // 레벨 정렬 (예: Level 1, Level 2, ...)
  const labels = Object.keys(levelData).sort();
  const materialData = labels.map((label) => levelData[label].materialCost);
  const laborData = labels.map((label) => levelData[label].laborCost);

  levelChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '재료비',
          data: materialData,
          backgroundColor: '#9C27B0',
          borderColor: '#7B1FA2',
          borderWidth: 1,
        },
        {
          label: '노무비',
          data: laborData,
          backgroundColor: '#FF5722',
          borderColor: '#E64A19',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          title: {
            display: true,
            text: '레벨',
          },
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: '비용 (₩)',
          },
          ticks: {
            callback: function (value) {
              return '₩' + value.toLocaleString();
            },
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const level = context.label;
              const data = levelData[level];
              const unitPrice = data.area > 0 ? (data.materialCost + data.laborCost) / data.area : 0;

              return [
                `${context.dataset.label}: ₩${context.parsed.y.toLocaleString()}`,
                `면적: ${data.area.toFixed(2)}m²`,
                `단가: ₩${unitPrice.toLocaleString()}/m²`,
                `개수: ${data.count}개`,
              ];
            },
          },
        },
      },
    },
  });
}

/**
 * 차트용 색상 생성
 */
function generateChartColors(count) {
  const baseColors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
    '#FF6384',
    '#C9CBCF',
    '#4BC0C0',
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
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

  calculationResults.forEach((result) => {
    const wallName = result.wallName;

    if (!groupedData[wallName]) {
      groupedData[wallName] = {
        count: 0, // 개수
        totalArea: 0, // 수량 합산
        totalCost: 0, // 총합계 합산
        materialUnitPrice: result.materialUnitPrice, // M2당 자재비 (첫 번째 값)
        laborUnitPrice: result.laborUnitPrice, // M2당 노무비 (첫 번째 값)
        unitPrice: result.unitPrice, // M2당 단가 (첫 번째 값)
      };
    }

    groupedData[wallName].count++;
    groupedData[wallName].totalArea += result.area; // 면적 합산
    groupedData[wallName].totalCost += result.totalCost; // 금액 합산
  });

  // 2단계: 그룹화된 데이터로 테이블 행 생성 (✅ 정렬 적용)
  const sortedWallNames = sortWallTypeNames(Object.keys(groupedData));

  sortedWallNames.forEach((wallName) => {
    const data = groupedData[wallName];
    const row = document.createElement('tr');
    row.innerHTML = `
            <td>${wallName}</td>
            <td>${data.count}개</td>
            <td>M2</td>
            <td class="text-right">${data.totalArea.toFixed(2)}</td>
            <td class="text-right cost-cell">₩${Math.round(
              data.materialUnitPrice || 0
            ).toLocaleString()}</td>
            <td class="text-right cost-cell">₩${Math.round(
              data.laborUnitPrice || 0
            ).toLocaleString()}</td>
            <td class="text-right">₩${Math.round(
              data.unitPrice || 0
            ).toLocaleString()}</td>
            <td class="text-right cost-cell">₩${Math.round(
              data.totalCost || 0
            ).toLocaleString()}</td>
        `;
    tbody.appendChild(row);
  });
}

/**
 * 결과 탭 전환
 */
window.switchResultTab = function (tabName) {
  // 탭 버튼 상태 업데이트
  document.querySelectorAll('.panel-tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  document
    .querySelector(`[onclick="switchResultTab('${tabName}')"]`)
    .classList.add('active');

  // 탭 콘텐츠 표시
  document.querySelectorAll('.tab-content').forEach((content) => {
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
  } else if (tabName === 'materialSummary') {
    renderMaterialSummaryTable();
  }
};

/**
 * Excel 내보내기 (ExcelJS 사용)
 */
window.exportCalculationResults = async function () {
  // 드롭다운 닫기
  closeExportDropdown();

  if (calculationResults.length === 0) {
    alert('내보낼 계산 결과가 없습니다.');
    return;
  }

  try {
    console.log(
      '📊 Excel 내보내기 시작:',
      calculationResults.length,
      '개 벽체'
    );

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
    const dateStr = now
      .toLocaleDateString('ko-KR')
      .replace(/\./g, '')
      .replace(/\s/g, '');
    const timeStr = now
      .toLocaleTimeString('ko-KR', { hour12: false })
      .replace(/:/g, '');
    const filename = `벽체계산결과_${dateStr}_${timeStr}.xlsx`;

    // Excel 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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
    { header: '계산일시', key: 'calculatedAt', width: 20 },
  ];

  // 데이터 추가
  calculationResults.forEach((result) => {
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
      calculatedAt: new Date(result.calculatedAt).toLocaleString('ko-KR'),
    });
  });

  // 헤더 스타일 적용
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
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
        right: { style: 'thin' },
      };

      // 정렬: 금액 컬럼(9~12)은 우측, 나머지는 중앙
      if (colNumber >= 9 && colNumber <= 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        // 천단위 콤마
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        // 수치 컬럼 포맷
        if (colNumber === 5 || colNumber === 6 || colNumber === 7) {
          // 면적, 높이, 길이
          cell.numFmt = '#,##0.##';
        } else if (colNumber === 8) {
          // 두께
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
    { header: '비율(%)', key: 'percentage', width: 10 },
  ];

  // 벽체명으로 그룹화
  const groupedData = {};
  calculationResults.forEach((result) => {
    const wallName = result.wallName;

    if (!groupedData[wallName]) {
      groupedData[wallName] = {
        count: 0,
        totalArea: 0,
        totalCost: 0,
        materialUnitPrice: result.materialUnitPrice,
        laborUnitPrice: result.laborUnitPrice,
        unitPrice: result.unitPrice,
      };
    }

    groupedData[wallName].count++;
    groupedData[wallName].totalArea += result.area;
    groupedData[wallName].totalCost += result.totalCost;
  });

  const totalCost = Object.values(groupedData).reduce(
    (sum, g) => sum + g.totalCost,
    0
  );

  // 데이터 추가
  Object.entries(groupedData).forEach(([wallName, groupInfo]) => {
    const percentage =
      totalCost > 0 ? ((groupInfo.totalCost / totalCost) * 100).toFixed(2) : 0;

    worksheet.addRow({
      wallName: wallName,
      count: groupInfo.count,
      area: groupInfo.totalArea,
      materialPrice: Math.round(groupInfo.materialUnitPrice),
      laborPrice: Math.round(groupInfo.laborUnitPrice),
      unitPrice: Math.round(groupInfo.unitPrice),
      totalCost: Math.round(groupInfo.totalCost),
      percentage: percentage,
    });
  });

  // 헤더 스타일 적용
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
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
        right: { style: 'thin' },
      };

      // 정렬: 금액 컬럼(4~7)은 우측, 나머지는 중앙
      if (colNumber >= 4 && colNumber <= 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        // 천단위 콤마
        if (colNumber !== 8) {
          // 비율 제외
          cell.numFmt = '#,##0';
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (colNumber === 2 || colNumber === 3) {
          // 개수, 면적
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
    { header: '합계단가(₩/m²)', key: 'totalPrice', width: 15 },
  ];

  // 타입별로 1개만 추출
  const processedTypes = new Set();

  calculationResults.forEach((result) => {
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
        totalPrice: Math.round(totalUnitPrice),
      });
    });
  });

  // 헤더 스타일 적용
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
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
        right: { style: 'thin' },
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
    layer3_1: '좌측 Layer3',
    layer2_1: '좌측 Layer2',
    layer1_1: '좌측 Layer1',
    column1: 'Column1',
    infill: 'Infill',
    layer1_2: '우측 Layer1',
    layer2_2: '우측 Layer2',
    layer3_2: '우측 Layer3',
    column2: 'Column2',
    channel: 'Channel',
    runner: 'Runner',
  };

  return layerNames[layerKey] || layerKey;
}

/**
 * 단일 벽체 Excel 내보내기 (ExcelJS 사용)
 */
window.exportSingleWall = async function (elementId) {
  const result = calculationResults.find((r) => r.elementId === elementId);
  if (!result) {
    alert('해당 벽체 데이터를 찾을 수 없습니다.');
    return;
  }

  try {
    console.log('📊 단일 벽체 Excel 내보내기:', result.wallName);

    // ExcelJS 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kiyeno 벽체 관리 시스템';
    workbook.created = new Date();

    // 1. 벽체 기본 정보 시트
    createSingleWallInfoSheet(workbook, result);

    // 2. 레이어별 자재 상세 시트
    createSingleWallMaterialSheet(workbook, result);

    // 파일 이름 생성
    const now = new Date();
    const dateStr = now
      .toLocaleDateString('ko-KR')
      .replace(/\./g, '')
      .replace(/\s/g, '');
    const timeStr = now
      .toLocaleTimeString('ko-KR', { hour12: false })
      .replace(/:/g, '');
    const safeName = result.wallName.replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeName}_${dateStr}_${timeStr}.xlsx`;

    // Excel 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ 단일 벽체 Excel 파일 생성 완료:', filename);
  } catch (error) {
    console.error('단일 벽체 Excel 내보내기 실패:', error);
    alert('Excel 내보내기 중 오류가 발생했습니다: ' + error.message);
  }
};

/**
 * 단일 벽체 기본 정보 시트 생성 (ExcelJS)
 */
function createSingleWallInfoSheet(workbook, result) {
  const worksheet = workbook.addWorksheet('벽체정보');

  // 컬럼 너비 설정
  worksheet.columns = [
    { width: 20 },
    { width: 25 },
    { width: 12 }
  ];

  // 공통 테두리 스타일
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // 섹션 헤더 스타일 함수
  const addSectionHeader = (text, rowNum) => {
    const row = worksheet.getRow(rowNum);
    worksheet.mergeCells(rowNum, 1, rowNum, 3);
    row.getCell(1).value = text;
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).border = thinBorder;
    row.height = 22;
  };

  // 데이터 행 추가 함수
  const addDataRow = (label, value, unit, rowNum, numFmt = null) => {
    const row = worksheet.getRow(rowNum);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.getCell(3).value = unit || '';

    for (let col = 1; col <= 3; col++) {
      const cell = row.getCell(col);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      if (col === 2 && numFmt) {
        cell.numFmt = numFmt;
      }
    }
    row.height = 20;
  };

  let currentRow = 1;

  // 기본 정보 섹션
  addSectionHeader('=== 벽체 기본 정보 ===', currentRow++);
  addDataRow('ElementID', result.elementId, '', currentRow++);
  addDataRow('벽체명', result.wallName, '', currentRow++);
  addDataRow('공간명', result.roomName, '', currentRow++);
  addDataRow('레벨', result.level, '', currentRow++);
  addDataRow('면적', result.area, 'm²', currentRow++, '0.00');
  addDataRow('높이', result.height, 'm', currentRow++, '0.000');
  addDataRow('길이', result.length, 'm', currentRow++, '0.000');
  addDataRow('두께', result.thickness, 'm', currentRow++, '0.000');
  currentRow++; // 빈 행

  // 계산 결과 섹션
  addSectionHeader('=== 계산 결과 ===', currentRow++);
  addDataRow('재료비', result.materialCost, '₩', currentRow++, '#,##0');
  addDataRow('노무비', result.laborCost, '₩', currentRow++, '#,##0');
  addDataRow('총계', result.totalCost, '₩', currentRow++, '#,##0');
  addDataRow('단가', result.unitPrice, '₩/m²', currentRow++, '#,##0');
  addDataRow('계산일시', new Date(result.calculatedAt).toLocaleString('ko-KR'), '', currentRow++);
  currentRow++; // 빈 행

  // 매칭된 벽체 타입 정보 섹션
  if (result.wallType) {
    addSectionHeader('=== 매칭된 벽체 타입 정보 ===', currentRow++);
    addDataRow('벽체 타입', result.wallType.wallType || '', '', currentRow++);
    addDataRow('설명', result.wallType.description || '', '', currentRow++);
    addDataRow('두께', result.wallType.thickness ? result.wallType.thickness / 1000 : '', 'm', currentRow++, '0.000');
  }
}

/**
 * 단일 벽체 레이어별 자재 상세 시트 생성 (ExcelJS)
 */
function createSingleWallMaterialSheet(workbook, result) {
  const worksheet = workbook.addWorksheet('레이어별자재');

  // 컬럼 너비 설정
  worksheet.columns = [
    { width: 15 },  // 레이어
    { width: 30 },  // 자재명
    { width: 12 },  // 공종1
    { width: 12 },  // 공종2
    { width: 8 },   // 단위
    { width: 15 },  // 재료비단가
    { width: 15 },  // 노무비단가
    { width: 12 },  // 면적
    { width: 15 },  // 재료비계
    { width: 15 },  // 노무비계
    { width: 15 }   // 소계
  ];

  // 공통 테두리 스타일
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // 헤더 추가
  const headers = [
    '레이어',
    '자재명',
    '공종1',
    '공종2',
    '단위',
    '재료비단가(₩)',
    '노무비단가(₩)',
    '면적(m²)',
    '재료비계(₩)',
    '노무비계(₩)',
    '소계(₩)'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCCCCC' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

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

    const dataRow = worksheet.addRow([
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

    dataRow.height = 22;
    dataRow.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;

      // 숫자 포맷 적용
      if (colNumber === 6 || colNumber === 7) {
        // 재료비단가, 노무비단가
        cell.numFmt = '#,##0';
      } else if (colNumber === 8) {
        // 면적 (소수점 2자리)
        cell.numFmt = '0.00';
      } else if (colNumber >= 9 && colNumber <= 11) {
        // 재료비계, 노무비계, 소계 (천단위 콤마)
        cell.numFmt = '#,##0';
      }
    });
  });

  // 빈 행 추가
  worksheet.addRow([]);

  // 합계 행 추가
  const totalRow = worksheet.addRow([
    '합계',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalMaterialCost,
    totalLaborCost,
    totalMaterialCost + totalLaborCost
  ]);

  totalRow.height = 25;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF2CC' }  // 연한 노란색 배경
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;

    // 숫자 포맷 적용
    if (colNumber >= 9 && colNumber <= 11) {
      cell.numFmt = '#,##0';
    }
  });
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
                            <td></td>
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

  // ✅ 최초 렌더링 후 소계/단수정리/총계 모두 업데이트 (정확한 테이블 값으로 재계산)
  console.log('🔄 초기 생성 완료 후 소계/단수정리/총계 재계산 시작');
  updateSubtotalRows();  // 소계 업데이트

  // ✅ 비율 변경 없이 현재 비율로 단수정리와 총계 재계산
  updateContractPricesRealtime();  // 함수 내부에서 비율을 읽음

  // 조정비율 입력 필드 이벤트 리스너
  const contractRatioInput = document.getElementById('contractRatioInput');
  if (contractRatioInput) {
    contractRatioInput.addEventListener('input', function () {
      console.log('🔄 조정비율 변경됨:', this.value);
      // 실시간 업데이트 (재렌더링 없이 DOM만 수정, Debounce 적용으로 렉 방지)
      debounceUpdateContractPrices();
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
  results.forEach((result) => {
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
  sortedTypeNames.forEach((typeName) => {
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
    'layer3_1',
    'layer2_1',
    'layer1_1',
    'column1',
    'infill',
    'layer1_2',
    'layer2_2',
    'layer3_2',
    'column2',
    'channel',
    'runner',
  ];

  // 첫 번째 결과만 사용 (대표값)
  if (results.length > 0) {
    const result = results[0];

    // ✅ layerOrder 순서대로 순회 (모든 레이어 처리)
    for (const layerKey of layerOrder) {
      const layer = result.layerPricing[layerKey];

      if (!layer || !layer.materialName) continue;

      // 일위대가 아이템 조회
      const unitPriceItem = await findUnitPriceItemByIdOrName(
        layer.materialName
      );

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
            console.log(
              `  📏 석고보드 두께 추가: ${materialData.t} (레이어: ${layerKey})`
            );
          } else if (isStud(componentName) && !studWidthAdded) {
            // ✅ 스터드: size 필드 파싱하여 넓이 추출
            const studWidth =
              materialData?.w || parseSizeField(materialData?.size).width;
            if (studWidth) {
              totalThickness += parseFloat(studWidth) || 0;
              studWidthAdded = true;
              console.log(
                `  📏 스터드 넓이 추가: ${studWidth} (레이어: ${layerKey})`
              );
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
  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;

  // ✅ 발주단가 (기준값)
  const orderMaterialUnitPrice = totalMaterialUnitPrice;
  const orderLaborUnitPrice = totalLaborUnitPrice;

  // ✅ 계약도급 단가 (발주단가 × 조정비율, 반올림)
  const contractMaterialUnitPrice = Math.round(orderMaterialUnitPrice * contractRatio);
  const contractLaborUnitPrice = Math.round(orderLaborUnitPrice * contractRatio);

  // ✅ 금액 계산
  const orderMaterialCost = orderMaterialUnitPrice * totalArea;
  const orderLaborCost = orderLaborUnitPrice * totalArea;
  const contractMaterialCost = contractMaterialUnitPrice * totalArea;
  const contractLaborCost = contractLaborUnitPrice * totalArea;

  // ✅ 경비 (타입 요약 행은 경비 0)
  const expenseUnitPrice = 0;
  const expenseCost = 0;

  // ✅ 합계 계산
  const contractTotalUnitPrice =
    contractMaterialUnitPrice + contractLaborUnitPrice + expenseUnitPrice;
  const contractTotalCost =
    contractMaterialCost + contractLaborCost + expenseCost;
  const orderTotalUnitPrice =
    orderMaterialUnitPrice + orderLaborUnitPrice + expenseUnitPrice;
  const orderTotalCost = orderMaterialCost + orderLaborCost + expenseCost;

  console.log(
    `📐 ${typeName} THK: ${totalThickness}, 조정비율: ${contractRatio}, 계약도급 자재비: ${contractMaterialUnitPrice}, 발주단가 자재비: ${orderMaterialUnitPrice}`
  );

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
  return (
    name && (name.includes('스터드') || name.toUpperCase().includes('STUD'))
  );
}

function isRunner(name) {
  return (
    name && (name.includes('런너') || name.toUpperCase().includes('RUNNER'))
  );
}

function isGypsumBoard(name) {
  return (
    name && (name.includes('석고보드') || name.toUpperCase().includes('GYPSUM'))
  );
}

function isGlassWool(name) {
  return (
    name &&
    (name.includes('그라스울') || name.toUpperCase().includes('GLASSWOOL'))
  );
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
  return (
    isStud(componentName) ||
    isRunner(componentName) ||
    isGypsumBoard(componentName) ||
    isGlassWool(componentName)
  );
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
      height: match[3] ? parseInt(match[3]) : null,
    };
  }

  // "50형" 패턴 처리
  const formMatch = sizeString.match(/(\d+)형/);
  if (formMatch) {
    return {
      thickness: null,
      width: parseInt(formMatch[1]) || null,
      height: null,
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
      const found = materials.find((m) => m.id === materialId);

      if (found) {
        console.log(`  ✅ 자재 DB 조회 성공: ${materialId}`, {
          name: found.name,
          size: found.size,
          category: found.category,
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
      const foundItem = unitPriceItems.find(
        (item) => item.id && item.id.trim() === searchName.trim()
      );

      if (foundItem) {
        console.log(`✅ 일위대가 아이템 발견: ${foundItem.id}`);
        return foundItem; // 전체 데이터 반환
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
  const component =
    components &&
    components.find(
      (c) =>
        c.name &&
        componentName &&
        (c.name.includes(componentName) || componentName.includes(c.name))
    );

  // 1. 스터드 판별
  if (isStud(componentName)) {
    const size = basic.size || ''; // "50형" 또는 "0.8T*60*45"
    const spacing = basic.spacing || ''; // "@450"
    const quantity = component?.quantity || 0;

    // "스터드 0.8T*60*45 @450 M2.33" 형식
    return `${
      basic.itemName || componentName
    } ${size} ${spacing} M${quantity.toFixed(2)}`.trim();
  }

  // 2. 런너 판별
  if (isRunner(componentName)) {
    const spacing = basic.spacing || '';

    // "런너 @450" 형식
    return `${basic.itemName || componentName} ${spacing}`.trim();
  }

  // 3. 석고보드 판별
  if (isGypsumBoard(componentName)) {
    const size = basic.size || ''; // "9.5T*1PLY"

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
async function generateComponentRow(
  component,
  unitPriceItem,
  result,
  rowNumber,
  totalArea
) {
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
      두께: thicknessValue,
      넓이: widthValue,
      높이: heightValue,
      M: `${mValue} (${componentQty} × ${totalArea})`,
    });
  } else if (isRunner(componentName)) {
    // 런너: @ 컬럼 비움, M 컬럼에 (component.quantity × 면적합계) 표시
    atValue = ''; // ✅ 런너는 @ 값 비움
    thicknessValue = sizeData.thickness || '';
    widthValue = sizeData.width || '';
    heightValue = sizeData.height || '';
    const componentQty = parseFloat(component.quantity) || 0;
    const mValueRaw = Math.round(componentQty * totalArea);
    mValue = mValueRaw.toLocaleString();

    console.log(`  📏 런너 (${componentName}):`, {
      Type: wallTypeCode,
      '@': '(비움)',
      두께: thicknessValue,
      넓이: widthValue,
      높이: heightValue,
      M: `${mValue} (${componentQty} × ${totalArea})`,
    });
  } else if (isGypsumBoard(componentName)) {
    // 석고보드: THK만 채움 (✅ materialData.t 필드 사용)
    wallThk = materialData?.t || sizeData.thickness || '';

    console.log(`  📏 석고보드 (${componentName}):`, {
      THK: wallThk,
      Type: wallTypeCode,
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
      console.log(
        `  📐 석고보드 1장당 면적: ${conversionM2} m² (W:${w}, H:${h})`
      );
    }
  }

  // D. 단가 및 금액 계산
  const area = totalArea || result.area || 0; // ✅ 타입별 전체 면적 합계 사용
  const componentQuantity = parseFloat(component.quantity) || 0;

  // ✅ 수량 컬럼: 모든 자재 동일하게 면적만 표시
  const displayQuantity = area;

  // ✅ 조정비율 가져오기 (기본값 1.2)
  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;

  // ✅ 발주단가 (기준값)
  const orderMaterialUnitPrice = parseFloat(component.materialPrice) || 0;
  const orderLaborUnitPrice = parseFloat(component.laborPrice) || 0;

  // ✅ 발주단가 금액 먼저 계산
  const orderMaterialAmount = orderMaterialUnitPrice * area;
  const orderLaborAmount = orderLaborUnitPrice * area;

  // ✅ 계약도급 단가 = 발주단가 단가 × 조정비율 (소수점 2자리로 계산)
  const contractMaterialUnitPrice = Math.round((orderMaterialUnitPrice * contractRatio) * 100) / 100;
  const contractLaborUnitPrice = Math.round((orderLaborUnitPrice * contractRatio) * 100) / 100;

  // ✅ 계약도급 금액 = 단가 × 면적 (소수점 단가로 계산)
  const contractMaterialAmount = Math.round((contractMaterialUnitPrice * area) * 100) / 100;
  const contractLaborAmount = Math.round((contractLaborUnitPrice * area) * 100) / 100;

  // ✅ 합계 (소수점 2자리로 계산)
  const contractTotalUnitPrice = Math.round((contractMaterialUnitPrice + contractLaborUnitPrice) * 100) / 100;
  const contractTotalAmount = Math.round((contractMaterialAmount + contractLaborAmount) * 100) / 100;
  const orderTotalUnitPrice = Math.round((orderMaterialUnitPrice + orderLaborUnitPrice) * 100) / 100;
  const orderTotalAmount = Math.round((orderMaterialAmount + orderLaborAmount) * 100) / 100;

  // 석고보드 장 수량 재계산: 실제수량 ÷ 1장당m2 (0단위 반올림)
  if (isGypsumBoard(componentName) && conversionM2) {
    const m2PerSheet = parseFloat(conversionM2);
    if (m2PerSheet > 0) {
      const actualQuantity = area * componentQuantity;
      sheetQuantity = Math.round(actualQuantity / m2PerSheet); // ✅ 0단위 반올림
      console.log(
        `  📦 석고보드 장 수량: ${sheetQuantity}장 (면적:${area} × 소요량:${componentQuantity} ÷ 1장당:${m2PerSheet})`
      );
    }
  }

  console.log(`  💰 단가 계산 (${componentName}):`, {
    조정비율: contractRatio,
    계약도급_재료비단가: contractMaterialUnitPrice,
    계약도급_재료비금액: contractMaterialAmount,
    계약도급_노무비단가: contractLaborUnitPrice,
    계약도급_노무비금액: contractLaborAmount,
    계약도급_합계단가: contractTotalUnitPrice,
    계약도급_합계금액: contractTotalAmount,
    발주단가_재료비단가: orderMaterialUnitPrice,
    발주단가_재료비금액: orderMaterialAmount,
    발주단가_노무비단가: orderLaborUnitPrice,
    발주단가_노무비금액: orderLaborAmount,
    발주단가_합계단가: orderTotalUnitPrice,
    발주단가_합계금액: orderTotalAmount,
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
            <td>${
              sheetQuantity ? parseInt(sheetQuantity).toLocaleString() : ''
            }</td>
            <td>M2</td>
            <td class="quantity-cell">${displayQuantity.toFixed(2)}</td>
            <td class="number-cell contract-material-price">${contractMaterialUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-material-amount">${contractMaterialAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-labor-price">${contractLaborUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-labor-amount">${contractLaborAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td><input type="text" class="expense-input contract-expense-price" data-row="${rowNumber}" value="0" style="width: 100%; text-align: right; border: 1px solid #ddd; padding: 4px; font-size: 11px;"></td>
            <td class="number-cell expense-amount contract-expense-amount" data-row="${rowNumber}">0</td>
            <td class="number-cell contract-total-price" data-row="${rowNumber}">${contractTotalUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-total-amount" data-row="${rowNumber}">${contractTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <td class="number-cell order-material-price">${orderMaterialUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-material-amount">${orderMaterialAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-labor-price">${orderLaborUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-labor-amount">${orderLaborAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td><input type="text" class="expense-input order-expense-price" data-row="${rowNumber}" value="0" style="width: 100%; text-align: right; border: 1px solid #ddd; padding: 4px; font-size: 11px;"></td>
            <td class="number-cell expense-amount order-expense-amount" data-row="${rowNumber}">0</td>
            <td class="number-cell order-total-price" data-row="${rowNumber}">${orderTotalUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-total-amount" data-row="${rowNumber}">${orderTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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
    'layer3_1',
    'layer2_1',
    'layer1_1',
    'column1',
    'infill',
    'layer1_2',
    'layer2_2',
    'layer3_2',
    'column2',
    'channel',
    'runner',
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

    if (
      unitPriceItem &&
      unitPriceItem.components &&
      unitPriceItem.components.length > 0
    ) {
      // ✅ 일위대가 아이템 발견: 각 컴포넌트마다 별도 행 생성
      console.log(
        `📋 일위대가 아이템 사용: ${unitPriceItem.id} (컴포넌트 ${unitPriceItem.components.length}개)`
      );

      for (const component of unitPriceItem.components) {
        // 스터드, 런너, 석고보드, 그라스울만 표시 (피스, 타정총알, 용접봉 제외)
        if (!shouldDisplayComponent(component.name)) {
          console.log(`  ⏭️ 컴포넌트 건너뛰기: ${component.name}`);
          continue;
        }

        html += await generateComponentRow(
          component,
          unitPriceItem,
          result,
          layerNumber,
          totalArea
        );
        layerNumber++;
      }
    } else {
      // ❌ 일위대가 없음: 기존 자재 정보로 단일 행 생성 (하위 호환성)
      console.log(
        `⚠️ 일위대가 없음 - 기존 자재 정보 사용: ${layer.materialName}`
      );

      const materialInfo = await findMaterialInUnitPriceDB(layer.materialName);
      const displayName = materialInfo?.name
        ? materialInfo.spec
          ? `${materialInfo.name} ${materialInfo.spec}`
          : materialInfo.name
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
                    <td class="number-cell">${Math.round(
                      materialUnitPrice
                    ).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(
                      materialAmount
                    ).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(
                      laborUnitPrice
                    ).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(
                      laborAmount
                    ).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(
                      totalUnitPrice
                    ).toLocaleString()}</td>
                    <td class="number-cell">${Math.round(
                      totalAmount
                    ).toLocaleString()}</td>
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
  if (name.includes('그라스울') || name.includes('GLASSWOOL'))
    return '그라스울';
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
    '로스',
    '코스트',
    '운반비',
    '할증',
    '공수',
    '보조',
    '타수정리',
    '세',
  ];

  return indirectKeywords.some((keyword) => componentName.includes(keyword));
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

  const layerOrder = [
    'layer3_1',
    'layer2_1',
    'layer1_1',
    'column1',
    'infill',
    'layer1_2',
    'layer2_2',
    'layer3_2',
    'column2',
    'channel',
    'runner',
  ];

  // ✅ 모든 results 순회 (첫 번째만이 아니라)
  for (const result of results) {
    const individualArea = result.area; // 각 결과의 개별 면적

    // 각 레이어 순회
    for (const layerKey of layerOrder) {
      const layer = result.layerPricing[layerKey];
      if (!layer || !layer.materialName) continue;

      const unitPriceItem = await findUnitPriceItemByIdOrName(
        layer.materialName
      );
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
          area: individualArea, // ✅ totalArea 대신 개별 면적 사용
          parentCategory: parentCategory,
          unitPriceId: unitPriceItem.id,
          // ✅ 1m² 단가 추가
          materialPricePerM2: parseFloat(component.materialPricePerM2) || 0,
          laborPricePerM2: parseFloat(component.laborPricePerM2) || 0,
          // ✅ 추가 데이터
          size: component.size || materialData?.size || '',
          materialData: materialData,
          unitPriceItem: unitPriceItem,
          wallType: result.wallType,
        });
      }
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

  console.log('🔍 그룹핑 시작 - 총 구성품 수:', components.length);

  for (const comp of components) {
    // 그룹핑 키: 품명 + 규격 + 단위 + 카테고리
    const key = `${comp.name}|${comp.spec}|${comp.unit}|${comp.parentCategory}`;

    if (!grouped[key]) {
      console.log(
        `  ✨ 새 그룹 생성: ${comp.name} (${comp.spec}) - 카테고리: ${comp.parentCategory}`
      );
      grouped[key] = {
        name: comp.name,
        spec: comp.spec,
        unit: comp.unit,
        materialPrice: comp.materialPrice,
        laborPrice: comp.laborPrice,
        laborAmount: comp.laborAmount,
        quantity: comp.quantity, // ✅ 1m² 수량 (합산하지 않음, 첫 번째 값 유지)
        area: 0, // ✅ 합산할 것이므로 0으로 시작
        parentCategory: comp.parentCategory,
        // ✅ 1m² 단가 보존 (첫 번째 것 사용)
        materialPricePerM2: comp.materialPricePerM2,
        laborPricePerM2: comp.laborPricePerM2,
        // ✅ 추가 데이터 보존 (첫 번째 것 사용)
        size: comp.size,
        materialData: comp.materialData,
        unitPriceItem: comp.unitPriceItem,
        wallType: comp.wallType,
      };
    }

    // ✅ 면적만 합산 (quantity는 합산하지 않음)
    const beforeArea = grouped[key].area;
    grouped[key].area += comp.area;
    console.log(
      `    ➕ ${comp.name}: 면적 ${beforeArea.toFixed(2)} + ${comp.area.toFixed(
        2
      )} = ${grouped[key].area.toFixed(2)}m²`
    );
  }

  const result = Object.values(grouped);
  console.log('✅ 그룹핑 완료 - 결과:', result.length, '개 그룹');
  console.table(
    result.map((r) => ({
      품명: r.name,
      규격: r.spec,
      단위: r.unit,
      '1m² 수량': r.quantity,
      '총 면적': r.area.toFixed(2),
      카테고리: r.parentCategory,
    }))
  );

  return result;
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
  const categoryPriority = {
    STUD: 1, // 스터드 카테고리 먼저
    석고보드: 2, // 석고보드 카테고리 나중
  };

  const typePriority = {
    STUD: 1,
    RUNNER: 2,
    석고보드: 3,
    그라스울: 4,
    PIECE: 5,
    BULLET: 6,
    WELDING: 7,
    ETC: 99,
  };

  return components.sort((a, b) => {
    // 1단계: parentCategory로 먼저 정렬 (STUD → 석고보드)
    const catPriorityA = categoryPriority[a.parentCategory] || 99;
    const catPriorityB = categoryPriority[b.parentCategory] || 99;

    if (catPriorityA !== catPriorityB) {
      return catPriorityA - catPriorityB;
    }

    // 2단계: 같은 카테고리 내에서 타입별 정렬
    const typeA = getComponentType(a.name);
    const typeB = getComponentType(b.name);

    const priorityA = typePriority[typeA] || 50;
    const priorityB = typePriority[typeB] || 50;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 3단계: 같은 타입이면 품명 가나다순
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
 * @param {number} rowNumber - 행 번호
 * @returns {string} - HTML 문자열
 */
function generateSubtotalRow(components, label, rowNumber) {
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
  let mValueSum = 0; // 11번 칸럼 (mValue) 합계
  let sheetQuantitySum = 0; // 14번 칸럼 (매/장) 합계
  let displayQuantitySum = 0; // 16번 칸럼 (displayQuantity) 합계

  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;

  console.log(`🔍 ========== [${label}] 화면 표시용 소계 디버깅 시작 ==========`);
  console.log(`📦 components 배열 개수: ${components.length}`);

  // ✅ unitPriceId별로 그룹핑 (DB 저장값 사용을 위해)
  const groupedByUnitPrice = {};

  for (const comp of components) {
    const unitPriceId = comp.unitPriceItem?.id;
    if (!unitPriceId) {
      console.log(`⚠️ unitPriceId 없음: ${comp.name}`);
      continue;
    }

    if (!groupedByUnitPrice[unitPriceId]) {
      groupedByUnitPrice[unitPriceId] = {
        unitPriceItem: comp.unitPriceItem,
        totalArea: comp.area,  // ✅ 첫 번째 구성품의 면적만 사용 (같은 unitPriceId는 면적 공유)
        components: [],
        componentNames: []  // 디버깅용
      };
    }
    // ✅ 면적은 첫 번째 구성품에서만 설정 (중복 합산 방지)
    groupedByUnitPrice[unitPriceId].components.push(comp);
    groupedByUnitPrice[unitPriceId].componentNames.push(`${comp.name}(${comp.area}m²)`);
  }

  console.log(`📊 unitPriceId별 그룹 개수: ${Object.keys(groupedByUnitPrice).length}`);

  // ✅ DB 저장된 1m² 단가 사용하여 금액 계산
  for (const [unitPriceId, group] of Object.entries(groupedByUnitPrice)) {
    const materialUnitPrice = group.unitPriceItem.totalCosts?.materialUnitPrice || 0;
    const laborUnitPrice = group.unitPriceItem.totalCosts?.laborUnitPrice || 0;
    const totalArea = group.totalArea;

    console.log(`\n🔹 unitPriceId: ${unitPriceId}`);
    console.log(`  구성품: ${group.componentNames.join(', ')}`);
    console.log(`  DB 자재 단가: ${materialUnitPrice.toLocaleString()}원/m²`);
    console.log(`  DB 노무 단가: ${laborUnitPrice.toLocaleString()}원/m²`);
    console.log(`  총 면적: ${totalArea.toFixed(2)}m²`);

    // ✅ 발주단가 - 금액 합계 (DB 저장값 × 면적, 소수점 유지)
    // ✅ 발주단가 금액도 소수점 2자리로 계산
    const matAmount = Math.round((materialUnitPrice * totalArea) * 100) / 100;
    const labAmount = Math.round((laborUnitPrice * totalArea) * 100) / 100;
    orderMaterialAmountSum += matAmount;
    orderLaborAmountSum += labAmount;

    console.log(`  발주단가 금액(소수점): 자재=${matAmount.toFixed(2)}, 노무=${labAmount.toFixed(2)}`);

    // ✅ 계약도급 - 금액 계산 시 전체 정밀도 유지, 최종 결과만 고정소수점 반올림
    const contractMatAmount = Math.round((materialUnitPrice * contractRatio * totalArea) * 100) / 100;
    const contractLabAmount = Math.round((laborUnitPrice * contractRatio * totalArea) * 100) / 100;
    contractMaterialAmountSum += contractMatAmount;
    contractLaborAmountSum += contractLabAmount;

    // ✅ 표시용 단가도 소수점 2자리로 계산
    const contractMatUnitPrice = Math.round((materialUnitPrice * contractRatio) * 100) / 100;
    const contractLabUnitPrice = Math.round((laborUnitPrice * contractRatio) * 100) / 100;

    console.log(`  계약도급 금액(소수점): 자재=${contractMatAmount.toFixed(2)}, 노무=${contractLabAmount.toFixed(2)}`);
  }

  // ✅ 단가 합계는 구성품별로 계산 (표시용) - 각 항목을 정수로 반올림!
  console.log(`\n🔍 [${label}] 구성품별 단가 계산 시작 (총 ${components.length}개):`);
  for (const comp of components) {
    // ✅ 각 구성품 단가를 정수로 반올림 (단가는 정수!)
    const matPrice1m2 = Math.round(comp.materialPrice * comp.quantity);
    const labPrice1m2 = Math.round(comp.laborAmount);

    console.log(`  📦 ${comp.name}:`);
    console.log(`    - materialPrice: ${comp.materialPrice}, quantity: ${comp.quantity}`);
    console.log(`    - 계산: ${comp.materialPrice} × ${comp.quantity} = ${comp.materialPrice * comp.quantity}`);
    console.log(`    - 반올림: ${matPrice1m2}`);
    console.log(`    - 누적 합계 전: ${orderMaterialPriceSum.toFixed(4)}`);

    // 발주단가 - 단가 합계 (표시용)
    orderMaterialPriceSum += matPrice1m2;
    orderLaborPriceSum += labPrice1m2;

    console.log(`    - 누적 합계 후: ${orderMaterialPriceSum.toFixed(4)}`);

    // ✅ 계약도급 - 단가 합계 (표시용, 소수점 2자리)
    const contractMatPrice = Math.round((matPrice1m2 * contractRatio) * 100) / 100;
    const contractLabPrice = Math.round((labPrice1m2 * contractRatio) * 100) / 100;
    contractMaterialPriceSum += contractMatPrice;
    contractLaborPriceSum += contractLabPrice;

    // 수량 합산
    mValueSum += comp.quantity * comp.area; // ✅ 11번 칸럼 (mValue) - quantity 사용

    // 16번 칸럼 (displayQuantity) - 석고보드는 area × quantity
    let currentDisplayQuantity = 0;
    if (
      comp.gypsumBoardDisplayQuantity !== undefined &&
      comp.gypsumBoardDisplayQuantity !== null
    ) {
      currentDisplayQuantity = comp.gypsumBoardDisplayQuantity;
      displayQuantitySum += comp.gypsumBoardDisplayQuantity;
    } else if (comp.parentCategory === '석고보드') {
      currentDisplayQuantity = comp.area * comp.quantity; // ✅ quantity 사용
      displayQuantitySum += comp.area * comp.quantity; // ✅ quantity 사용
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
      console.log(
        `  - width: ${width}, height: ${height}, m2PerSheet: ${m2PerSheet}`
      );
      console.log(`  - currentDisplayQuantity: ${currentDisplayQuantity}`);
      if (m2PerSheet > 0 && currentDisplayQuantity > 0) {
        const sheetCount = Math.round(currentDisplayQuantity / m2PerSheet);
        console.log(`  - 장 수량: ${sheetCount}`);
        sheetQuantitySum += sheetCount;
      }
    }
  }

  // ✅ 합계 계산 (소수점 2자리)
  const contractTotalPriceSum = Math.round((contractMaterialPriceSum + contractLaborPriceSum + contractExpensePriceSum) * 100) / 100;
  const contractTotalAmountSum = Math.round((contractMaterialAmountSum + contractLaborAmountSum + contractExpenseAmountSum) * 100) / 100;
  const orderTotalPriceSum = Math.round((orderMaterialPriceSum + orderLaborPriceSum + orderExpensePriceSum) * 100) / 100;
  const orderTotalAmountSum = Math.round((orderMaterialAmountSum + orderLaborAmountSum + orderExpenseAmountSum) * 100) / 100;

  const htmlMaterialAmount = Math.round(orderMaterialAmountSum);
  const htmlLaborAmount = Math.round(orderLaborAmountSum);

  console.log(`\n✅ [${label}] 화면 표시용 최종 합계:`);
  console.log(`  ✅ 소수점 유지 합계 - 자재: ${orderMaterialAmountSum.toFixed(2)}, 노무: ${orderLaborAmountSum.toFixed(2)}`);
  console.log(`  ✅ 화면 표시(반올림) - 자재: ${htmlMaterialAmount.toLocaleString()}, 노무: ${htmlLaborAmount.toLocaleString()}`);
  console.log(`  소계 수량 합계 - 11번: ${mValueSum}, 14번(장): ${sheetQuantitySum}, 16번: ${displayQuantitySum}`);
  console.log(`\n🔍 [단가 합산 디버깅]:`);
  console.log(`  orderMaterialPriceSum (반올림 전): ${orderMaterialPriceSum}`);
  console.log(`  orderMaterialPriceSum (소수점 4자리): ${orderMaterialPriceSum.toFixed(4)}`);
  console.log(`  반올림 계산: Math.round(${orderMaterialPriceSum} * 100) / 100`);
  console.log(`  반올림 결과: ${Math.round(orderMaterialPriceSum * 100) / 100}`);
  console.log(`  📌 반환 단가 - 자재: ${Math.round(orderMaterialPriceSum * 100) / 100}, 노무: ${Math.round(orderLaborPriceSum * 100) / 100}`);
  console.log(`🔍 ========== [${label}] 화면 표시용 소계 디버깅 종료 ==========\n`);

  // ✅ 계산된 소계 데이터를 함께 반환 (총계 계산에 사용)
  const subtotalData = {
    orderMaterialPrice: Math.round(orderMaterialPriceSum * 100) / 100,
    orderLaborPrice: Math.round(orderLaborPriceSum * 100) / 100,
    orderExpensePrice: Math.round(orderExpensePriceSum * 100) / 100,
    contractMaterialPrice: Math.round(contractMaterialPriceSum * 100) / 100,
    contractLaborPrice: Math.round(contractLaborPriceSum * 100) / 100,
    contractExpensePrice: Math.round(contractExpensePriceSum * 100) / 100,
    orderMaterialAmount: Math.round(orderMaterialAmountSum * 100) / 100,
    orderLaborAmount: Math.round(orderLaborAmountSum * 100) / 100,
    contractMaterialAmount: Math.round(contractMaterialAmountSum * 100) / 100,
    contractLaborAmount: Math.round(contractLaborAmountSum * 100) / 100
  };

  const html = `
        <tr style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); font-weight: 600;">
            <td class="number-cell">${rowNumber}</td>
            <td></td>
            <td>${label}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(
              mValueSum
            ).toLocaleString()}</td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(
              sheetQuantitySum
            ).toLocaleString()}</td>
            <td></td>
            <td class="number-cell">${displayQuantitySum.toFixed(2)}</td>
            <!-- 계약도급 -->
            <td class="number-cell">${contractMaterialPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractMaterialAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractLaborPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractLaborAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${contractTotalPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractTotalAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <!-- 발주단가 -->
            <td class="number-cell">${orderMaterialPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderMaterialAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderLaborPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderLaborAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${orderTotalPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderTotalAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
        </tr>
    `;

  // ✅ HTML과 계산된 데이터를 함께 반환
  return { html, subtotalData };
}

/**
 * 카테고리별 간접비 계산
 * @param {string} categoryName - 카테고리명 ("스터드" or "석고보드")
 * @param {number} materialTotal - 해당 카테고리 자재비 합계
 * @param {number} laborTotal - 해당 카테고리 노무비 합계
 * @param {Object} fixedRates - 간접비 비율
 * @param {Object} unitPriceItem - 일위대가 아이템 (1m² 단가 포함)
 * @param {number} totalArea - 총 면적
 * @returns {Array} - 간접비 항목 배열
 */
function calculateIndirectCosts(
  categoryName,
  materialTotal,
  laborTotal,
  fixedRates,
  unitPriceItem = null,
  totalArea = 0
) {
  console.log(`💰 [${categoryName}] 간접비 계산 시작`);
  console.log(`  - 자재비 합계: ${materialTotal.toLocaleString()}`);
  console.log(`  - 노무비 합계: ${laborTotal.toLocaleString()}`);
  console.log(`  - fixedRates:`, fixedRates);

  let materialLoss, transportCost, materialProfit, toolExpense;
  let materialLossUnitPrice, transportCostUnitPrice, materialProfitUnitPrice, toolExpenseUnitPrice;

  // ✨ DB에 저장된 1m² 단가가 있으면 사용, 없으면 비율로 계산
  if (unitPriceItem?.totalCosts?.indirectCosts && totalArea > 0) {
    const indirectCosts = unitPriceItem.totalCosts.indirectCosts;

    materialLossUnitPrice = indirectCosts.materialLoss;
    transportCostUnitPrice = indirectCosts.transportCost;
    materialProfitUnitPrice = indirectCosts.materialProfit;
    toolExpenseUnitPrice = indirectCosts.toolExpense;

    // ✅ 금액을 소수점 2자리로 계산
    materialLoss = Math.round((materialLossUnitPrice * totalArea) * 100) / 100;
    transportCost = Math.round((transportCostUnitPrice * totalArea) * 100) / 100;
    materialProfit = Math.round((materialProfitUnitPrice * totalArea) * 100) / 100;
    toolExpense = Math.round((toolExpenseUnitPrice * totalArea) * 100) / 100;

    console.log(`  📊 DB 저장된 1m² 단가 사용 (면적: ${totalArea}m²)`);
  } else {
    // Fallback: 비율로 계산 (소수점 2자리)
    materialLoss = Math.round(((materialTotal * fixedRates.materialLoss) / 100) * 100) / 100;
    transportCost = Math.round(((materialTotal * fixedRates.transportCost) / 100) * 100) / 100;
    const materialProfitBase = materialTotal + materialLoss + transportCost;
    materialProfit = Math.round(((materialProfitBase * fixedRates.materialProfit) / 100) * 100) / 100;
    toolExpense = Math.round(((laborTotal * fixedRates.toolExpense) / 100) * 100) / 100;

    // ✅ 1m² 단가 역산 (면적이 있을 때만, 소수점 2자리)
    if (totalArea > 0) {
      materialLossUnitPrice = Math.round((materialLoss / totalArea) * 100) / 100;
      transportCostUnitPrice = Math.round((transportCost / totalArea) * 100) / 100;
      materialProfitUnitPrice = Math.round((materialProfit / totalArea) * 100) / 100;
      toolExpenseUnitPrice = Math.round((toolExpense / totalArea) * 100) / 100;
    }

    console.log(`  ⚠️ 비율로 계산 (fallback)`);
  }

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
      amount: materialLoss,
      unitPrice: materialLossUnitPrice || 0, // ✨ 1m² 단가 추가
      area: totalArea, // ✨ 면적 추가
    },
    {
      name: `${categoryName} 자재운반비 및 양중비`,
      spec: '자재비의',
      unit: '%',
      rate: fixedRates.transportCost,
      amount: transportCost,
      unitPrice: transportCostUnitPrice || 0, // ✨ 1m² 단가 추가
      area: totalArea, // ✨ 면적 추가
    },
    {
      name: `${categoryName} 자재비 이윤`,
      spec: '자재비의',
      unit: '%',
      rate: fixedRates.materialProfit,
      amount: materialProfit,
      unitPrice: materialProfitUnitPrice || 0, // ✨ 1m² 단가 추가
      area: totalArea, // ✨ 면적 추가
    },
    {
      name: `${categoryName} 공구손료 및 기계경비`,
      spec: '노무비의',
      unit: '%',
      rate: fixedRates.toolExpense,
      amount: toolExpense,
      unitPrice: toolExpenseUnitPrice || 0, // ✨ 1m² 단가 추가
      area: totalArea, // ✨ 면적 추가
    },
  ];
}

/**
 * 자재별 단수정리 행 생성 (회색 배경)
 * @param {string} materialName - 자재 이름 (예: "스터드", "석고보드 9.5T", "그라스울 50T")
 * @param {number} directMaterialAmount - 직접비 자재 금액 (발주단가)
 * @param {number} directLaborAmount - 직접비 노무비 금액 (발주단가)
 * @param {number} directExpenseAmount - 직접비 경비 금액 (발주단가)
 * @param {number} indirectMaterialAmount - 간접비 자재 금액 (발주단가)
 * @param {number} indirectLaborAmount - 간접비 노무비 금액 (발주단가)
 * @param {number} contractDirectMaterialAmount - 직접비 자재 금액 (계약도급)
 * @param {number} contractDirectLaborAmount - 직접비 노무비 금액 (계약도급)
 * @param {number} contractDirectExpenseAmount - 직접비 경비 금액 (계약도급)
 * @param {number} contractIndirectMaterialAmount - 간접비 자재 금액 (계약도급)
 * @param {number} contractIndirectLaborAmount - 간접비 노무비 금액 (계약도급)
 * @param {number} rowNumber - 행 번호
 * @returns {Object} - { html: string, orderRounding: number, contractRounding: number }
 */
function generateMaterialRoundingRow(
  materialName,
  unitPrice,
  area,
  contractRatio,
  rowNumber
) {
  // ✅ unitPrice에 저장된 단수정리 1m² 단가 사용 (신규 rounding 객체 우선, 없으면 roundingPerM2 사용)
  const roundingData = unitPrice.totalCosts?.rounding || {
    material: 0,
    labor: 0,
    expense: 0,
    total: unitPrice.totalCosts?.roundingPerM2 || 0
  };

  // 발주단가 단수정리 (1m² 단가)
  const orderMatPrice = roundingData.material;
  const orderLabPrice = roundingData.labor;
  const orderExpPrice = roundingData.expense;
  const orderTotalPrice = roundingData.total;

  // ✅ 발주단가 단수정리 (금액 = 1m² 단가 × 면적, 소수점 유지)
  const orderMatAmount = orderMatPrice * area;  // Math.round() 제거
  const orderLabAmount = orderLabPrice * area;   // Math.round() 제거
  const orderExpAmount = orderExpPrice * area;   // Math.round() 제거
  const orderTotalAmount = orderTotalPrice * area;  // Math.round() 제거

  // ✅ 계약도급 단수정리 (1m² 단가 = 발주단가 × 비율, 소수점 2자리)
  const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
  const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;
  const contractExpPrice = Math.round((orderExpPrice * contractRatio) * 100) / 100;
  const contractTotalPrice = Math.round((orderTotalPrice * contractRatio) * 100) / 100;

  // ✅ 계약도급 단수정리 (금액 = 1m² 단가 × 면적, 소수점 2자리)
  const contractMatAmount = Math.round((contractMatPrice * area) * 100) / 100;
  const contractLabAmount = Math.round((contractLabPrice * area) * 100) / 100;
  const contractExpAmount = Math.round((contractExpPrice * area) * 100) / 100;
  const contractTotalAmount = Math.round((contractTotalPrice * area) * 100) / 100;

  console.log(`📐 [${materialName}] 단수정리:`);
  console.log(
    `  발주단가 - 자재비: ${orderMatPrice}원 × ${area.toFixed(2)}m² = ${orderMatAmount.toLocaleString()}원`
  );
  console.log(
    `  발주단가 - 노무비: ${orderLabPrice}원 × ${area.toFixed(2)}m² = ${orderLabAmount.toLocaleString()}원`
  );
  console.log(
    `  발주단가 - 합계: ${orderTotalPrice}원 × ${area.toFixed(2)}m² = ${orderTotalAmount.toLocaleString()}원`
  );
  console.log(
    `  계약도급 - 합계: ${contractTotalPrice}원 × ${area.toFixed(2)}m² = ${contractTotalAmount.toLocaleString()}원 (비율 ${contractRatio})`
  );

  const html = `
        <tr style="background: linear-gradient(135deg, #e0e0e0 0%, #eeeeee 100%);"
            data-material-rounding="${orderMatPrice}"
            data-labor-rounding="${orderLabPrice}"
            data-expense-rounding="${orderExpPrice}"
            data-total-rounding="${orderTotalPrice}"
            data-area="${area}">
            <td class="number-cell">${rowNumber}</td>
            <td></td>
            <td>단수정리 (${materialName})</td>
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
            <td class="number-cell contract-material-price">${contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-material-amount">${contractMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-labor-price">${contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-labor-amount">${contractLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-expense-price">${contractExpPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-expense-amount">${contractExpAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-total-price">${contractTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-total-amount" data-contract-rounding="${contractTotalAmount.toFixed(2)}">${contractTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <!-- 발주단가 -->
            <td class="number-cell order-material-price">${orderMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-material-amount">${orderMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-labor-price">${orderLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-labor-amount">${orderLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-expense-price">${orderExpPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-expense-amount">${orderExpAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-total-price">${orderTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-total-amount" data-order-rounding="${orderTotalAmount.toFixed(2)}">${orderTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
        </tr>
    `;

  return { html, orderRounding: orderTotalAmount, contractRounding: contractTotalAmount };
}

/**
 * 간접비 행 생성 (노란색 배경)
 * @param {Object} item - 간접비 항목 객체
 * @param {number} rowNumber - 행 번호
 * @returns {string} - HTML 문자열
 */
function generateIndirectCostRow(item, rowNumber, totalArea) {
  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;

  // ✅ item.area가 있으면 사용, 없으면 totalArea 사용
  const area = item.area || totalArea;

  // 1m² 단가
  const orderUnitPrice = item.unitPrice || 0;

  // ✅ 발주단가 금액 계산 (소수점 2자리)
  const orderAmount = Math.round((orderUnitPrice * area) * 100) / 100;

  // ✅ 계약도급 단가도 소수점 2자리로 계산
  const contractUnitPrice = Math.round((orderUnitPrice * contractRatio) * 100) / 100;

  // ✅ 계약도급 금액 계산 (소수점 단가로 계산)
  const contractAmount = Math.round((contractUnitPrice * area) * 100) / 100;

  // 자재비 항목인지 노무비 항목인지 구분
  const isMaterialCost = item.name.includes('자재로스') ||
                         item.name.includes('운반비') ||
                         item.name.includes('이윤');
  const isLaborCost = item.name.includes('공구손료');

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
            <td>M2</td>
            <td class="quantity-cell">${area.toFixed(2)}</td>
            <!-- 계약도급 -->
            <td class="number-cell">${isMaterialCost ? contractUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">${isMaterialCost ? contractAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">${isLaborCost ? contractUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">${isLaborCost ? contractAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${contractUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <!-- 발주단가 -->
            <td class="number-cell">${isMaterialCost ? orderUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">${isMaterialCost ? orderAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">${isLaborCost ? orderUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">${isLaborCost ? orderAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${orderUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 단수정리 행 생성 (노란색 배경)
 * @param {string} categoryName - 카테고리명 (예: "스터드", "석고보드")
 * @param {Array} indirectCostItems - 해당 카테고리의 간접비 항목 배열
 * @param {number} rowNumber - 행 번호
 * @returns {string} - HTML 문자열
 */
function generateRoundingAdjustmentRow(categoryName, indirectCostItems, rowNumber) {
    const value = parseFloat(document.getElementById('contractRatioInput')?.value);
    const contractRatio = isNaN(value) ? 1.2 : value;

    // 해당 카테고리 간접비 합계 계산
    let categoryExpenseSum = 0;
    for (const item of indirectCostItems) {
        categoryExpenseSum += item.amount;
    }

    // ✅ 단수정리: 10원 단위 절사 (소수점 2자리)
    const orderRoundingAmount = -(categoryExpenseSum % 10);
    const contractRoundingAmount = Math.round((orderRoundingAmount * contractRatio) * 100) / 100;

    return `
        <tr style="background: #fff9c4;">
            <td class="number-cell">${rowNumber}</td>
            <td></td>
            <td>${categoryName} 단수정리</td>
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
            <td class="number-cell">0.00</td>
            <td class="number-cell">${contractRoundingAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <td class="number-cell" data-contract-rounding="${contractRoundingAmount.toFixed(2)}">${contractRoundingAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">0</td>
            <td class="number-cell">${orderRoundingAmount.toLocaleString()}</td>
            <td></td>
            <td class="number-cell" data-order-rounding="${orderRoundingAmount.toFixed(2)}">${orderRoundingAmount.toLocaleString()}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 간접비 소계 행 생성 (노란색 배경)
 * @param {Array} indirectCostItems - 간접비 항목 배열
 * @param {number} totalArea - 총 면적
 * @param {number} rowNumber - 행 번호
 * @param {Object} preCalculatedSubtotal - 미리 계산된 소계 객체 (선택적)
 * @returns {string} - HTML 문자열
 */
function generateIndirectCostSubtotalRow(indirectCostItems, totalArea, rowNumber, preCalculatedSubtotal = null) {
  console.log(`🔍 generateIndirectCostSubtotalRow 함수 진입 - preCalculatedSubtotal:`, preCalculatedSubtotal);
  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;

  let orderMaterialAmount, orderLaborAmount, orderMaterialUnitPrice, orderLaborUnitPrice;
  let contractMaterialAmount, contractLaborAmount, contractMaterialUnitPrice, contractLaborUnitPrice;
  let orderTotalUnitPrice, orderTotalAmount, contractTotalUnitPrice, contractTotalAmount;

  console.log(`🔍 preCalculatedSubtotal 체크: ${preCalculatedSubtotal ? '있음' : '없음'}`);
  if (preCalculatedSubtotal) {
    // ✅ 미리 계산된 값 사용 (총계 계산과 동일한 값 보장!)
    console.log(`📊 [소계 (간접비)] 미리 계산된 값 사용 (재계산 안 함)`);
    orderMaterialAmount = preCalculatedSubtotal.orderMaterialAmount;
    orderLaborAmount = preCalculatedSubtotal.orderLaborAmount;
    orderMaterialUnitPrice = preCalculatedSubtotal.orderMaterialPrice;
    orderLaborUnitPrice = preCalculatedSubtotal.orderLaborPrice;
    contractMaterialAmount = preCalculatedSubtotal.contractMaterialAmount;
    contractLaborAmount = preCalculatedSubtotal.contractLaborAmount;
    contractMaterialUnitPrice = preCalculatedSubtotal.contractMaterialPrice;
    contractLaborUnitPrice = preCalculatedSubtotal.contractLaborPrice;

    orderTotalUnitPrice = Math.round((orderMaterialUnitPrice + orderLaborUnitPrice) * 100) / 100;
    orderTotalAmount = Math.round((orderMaterialAmount + orderLaborAmount) * 100) / 100;
    contractTotalUnitPrice = Math.round((contractMaterialUnitPrice + contractLaborUnitPrice) * 100) / 100;
    contractTotalAmount = Math.round((contractMaterialAmount + contractLaborAmount) * 100) / 100;

    console.log(`  🎯 화면 표시용 단가 (총계와 동일) - 자재: ${orderMaterialUnitPrice}, 노무: ${orderLaborUnitPrice}`);
  } else {
    // ✅ 직접 계산 (기존 로직)
    console.log(`📊 간접비 소계 계산 시작 (총 ${indirectCostItems.length}개 항목)`);

    orderMaterialAmount = 0;
    orderLaborAmount = 0;

    for (const item of indirectCostItems) {
      const isMaterialCost = item.name.includes('자재로스') ||
                             item.name.includes('운반비') ||
                             item.name.includes('이윤');
      const isLaborCost = item.name.includes('공구손료');

      console.log(`  - ${item.name}: amount=${(item.amount || 0).toLocaleString()}, unitPrice=${(item.unitPrice || 0).toLocaleString()}`);

      if (isMaterialCost) {
        orderMaterialAmount += item.amount || 0;
      } else if (isLaborCost) {
        orderLaborAmount += item.amount || 0;
      }
    }

    console.log(`📊 [소계 (간접비)] 화면 표시용 소계:`);
    console.log(`  ✅ 소수점 유지 합계 - 자재: ${orderMaterialAmount.toFixed(2)}, 노무: ${orderLaborAmount.toFixed(2)}`);
    console.log(`  ✅ 화면 표시(반올림) - 자재: ${Math.round(orderMaterialAmount).toLocaleString()}, 노무: ${Math.round(orderLaborAmount).toLocaleString()}`);

    // ✅ 단가 역산 (금액 ÷ 면적, 소수점 2자리)
    orderMaterialUnitPrice = totalArea > 0 ? Math.round((orderMaterialAmount / totalArea) * 100) / 100 : 0;
    orderLaborUnitPrice = totalArea > 0 ? Math.round((orderLaborAmount / totalArea) * 100) / 100 : 0;
    console.log(`  🎯 화면 표시용 단가 - 자재: ${orderMaterialUnitPrice}, 노무: ${orderLaborUnitPrice} (금액 ÷ ${totalArea.toFixed(2)}m²)`);
    orderTotalUnitPrice = Math.round((orderMaterialUnitPrice + orderLaborUnitPrice) * 100) / 100;
    orderTotalAmount = Math.round((orderMaterialAmount + orderLaborAmount) * 100) / 100;

    // ✅ 계약도급 - 금액은 고정소수점 계산, 단가만 정수로
    contractMaterialAmount = Math.round(orderMaterialAmount * contractRatio * 100) / 100;
    contractLaborAmount = Math.round(orderLaborAmount * contractRatio * 100) / 100;
    contractTotalAmount = Math.round((contractMaterialAmount + contractLaborAmount) * 100) / 100;

    // ✅ 표시용 단가도 소수점 2자리로 계산
    contractMaterialUnitPrice = Math.round((orderMaterialUnitPrice * contractRatio) * 100) / 100;
    contractLaborUnitPrice = Math.round((orderLaborUnitPrice * contractRatio) * 100) / 100;
    contractTotalUnitPrice = Math.round((orderTotalUnitPrice * contractRatio) * 100) / 100;

    console.log(`  ✅ 계약도급 합계(소수점) (${contractRatio}배) - 자재비: ${contractMaterialAmount.toFixed(2)}, 노무비: ${contractLaborAmount.toFixed(2)}`);
  }

  return `
        <tr style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); font-weight: 600;">
            <td class="number-cell">${rowNumber}</td>
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
            <td>M2</td>
            <td class="quantity-cell"></td>
            <!-- 계약도급 -->
            <td class="number-cell">${contractMaterialUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractMaterialAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractLaborUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractLaborAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${contractTotalUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <!-- 발주단가 -->
            <td class="number-cell">${orderMaterialUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderMaterialAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderLaborUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderLaborAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${orderTotalUnitPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 전체 합계 행 생성 (초록색 배경) - 직접비 소계 + 간접비 소계 + 단수정리
 * @param {Object} directSubtotal - 직접비 소계 데이터
 * @param {Object} indirectSubtotal - 간접비 소계 데이터
 * @param {number} roundingAmount - 1000원 단위 단수정리 금액
 * @param {number} rowNumber - 행 번호
 * @returns {string} - HTML 문자열
 */
function generateGrandTotalRow(directSubtotal, indirectSubtotal, roundingAmount, rowNumber) {
  console.log(`💵 ========== 총계 행 생성 시작 ==========`);
  console.log(`  📊 [입력값] 직접비 소계 - 자재: ${directSubtotal.orderMaterialAmount.toLocaleString()}, 노무: ${directSubtotal.orderLaborAmount.toLocaleString()}`);
  console.log(`  📊 [입력값] 간접비 소계 - 자재: ${indirectSubtotal.orderMaterialAmount.toLocaleString()}, 노무: ${indirectSubtotal.orderLaborAmount.toLocaleString()}`);
  console.log(`  📐 [입력값] 단수정리: ${roundingAmount.toLocaleString()}`);

  // 발주단가 총계 = 직접비 소계 + 간접비 소계 + 단수정리
  const orderMaterialTotal = directSubtotal.orderMaterialAmount + indirectSubtotal.orderMaterialAmount;
  const orderLaborTotal = directSubtotal.orderLaborAmount + indirectSubtotal.orderLaborAmount;
  const orderGrandTotal = orderMaterialTotal + orderLaborTotal + roundingAmount;

  console.log(`  📐 [계산] 발주단가 총계:`);
  console.log(`    자재비 = ${directSubtotal.orderMaterialAmount} + ${indirectSubtotal.orderMaterialAmount} = ${orderMaterialTotal}`);
  console.log(`    노무비 = ${directSubtotal.orderLaborAmount} + ${indirectSubtotal.orderLaborAmount} = ${orderLaborTotal}`);
  console.log(`    합계 = ${orderMaterialTotal} + ${orderLaborTotal} + ${roundingAmount} = ${orderGrandTotal}`);

  // 계약도급 총계
  const contractMaterialTotal = directSubtotal.contractMaterialAmount + indirectSubtotal.contractMaterialAmount;
  const contractLaborTotal = directSubtotal.contractLaborAmount + indirectSubtotal.contractLaborAmount;
  const contractTotalBeforeRounding = contractMaterialTotal + contractLaborTotal;
  const contractRounding = -(contractTotalBeforeRounding % 1000);
  const contractGrandTotal = contractTotalBeforeRounding + contractRounding;

  console.log(`  ✅ 계약도급 총계 - 자재: ${contractMaterialTotal.toLocaleString()}, 노무: ${contractLaborTotal.toLocaleString()}`);
  console.log(`  📐 계약도급 단수정리 전: ${contractTotalBeforeRounding.toLocaleString()}, 단수정리: ${contractRounding.toLocaleString()}, 최종: ${contractGrandTotal.toLocaleString()}`);

  // ✅ 단가 합계 계산
  const contractMatPrice = directSubtotal.contractMaterialPrice + indirectSubtotal.contractMaterialPrice;
  const contractLabPrice = directSubtotal.contractLaborPrice + indirectSubtotal.contractLaborPrice;
  const contractExpPrice = directSubtotal.contractExpensePrice + indirectSubtotal.contractExpensePrice;
  const contractTotalPrice = contractMatPrice + contractLabPrice + contractExpPrice;

  const orderMatPrice = directSubtotal.orderMaterialPrice + indirectSubtotal.orderMaterialPrice;
  const orderLabPrice = directSubtotal.orderLaborPrice + indirectSubtotal.orderLaborPrice;
  const orderExpPrice = directSubtotal.orderExpensePrice + indirectSubtotal.orderExpensePrice;
  const orderTotalPrice = orderMatPrice + orderLabPrice + orderExpPrice;

  console.log(`\n🎯 [총계 행] 단가 계산 결과:`);
  console.log(`  직접비 단가 - 자재: ${directSubtotal.orderMaterialPrice}, 노무: ${directSubtotal.orderLaborPrice}`);
  console.log(`  간접비 단가 - 자재: ${indirectSubtotal.orderMaterialPrice}, 노무: ${indirectSubtotal.orderLaborPrice}`);
  console.log(`  ➕ 총계 단가 - 자재: ${orderMatPrice}, 노무: ${orderLabPrice}, 합계: ${orderTotalPrice}\n`);

  return `
        <tr style="background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%); color: white; font-weight: 700; font-size: 1.1em;">
            <td class="number-cell">${rowNumber}</td>
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
            <td class="number-cell">${contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell" data-material-amount="${contractMaterialTotal.toFixed(2)}">${contractMaterialTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell" data-labor-amount="${contractLaborTotal.toFixed(2)}">${contractLaborTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractExpPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${contractTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${contractGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
            <!-- 발주단가 -->
            <td class="number-cell">${orderMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell" data-material-amount="${orderMaterialTotal.toFixed(2)}">${orderMaterialTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell" data-labor-amount="${orderLaborTotal.toFixed(2)}">${orderLaborTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderExpPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">0.00</td>
            <td class="number-cell">${orderTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell">${orderGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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

  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;

  let contractTotal = 0;
  let orderTotal = 0;

  for (const comp of allCosts) {
    // 1m² 단가 계산
    const matPrice1m2 = comp.materialPrice * comp.quantity;
    const labPrice1m2 = comp.laborAmount;

    // 발주 총액 = 1m² 단가 × 면적
    orderTotal += (matPrice1m2 + labPrice1m2) * comp.area;

    // 계약도급 총액 = 발주 총액 × 조정비율
    contractTotal += (matPrice1m2 + labPrice1m2) * comp.area * contractRatio;
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
            <td class="number-cell">${Math.round(
              contractTotal
            ).toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${Math.round(
              orderTotal
            ).toLocaleString()}</td>
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
  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;
  const area = component.area;
  const componentName = component.name;
  const materialData = component.materialData;
  const unitPriceItem = component.unitPriceItem;

  // 🐛 디버깅: 3,146 값 추적
  console.log(`\n🔍 [${componentName}] 발주단가 계산 디버깅:`);
  console.log(`  materialPrice: ${component.materialPrice}`);
  console.log(`  quantity (1m²): ${component.quantity}`);
  console.log(`  materialPricePerM2 (DB): ${component.materialPricePerM2}`);
  console.log(`  laborPricePerM2 (DB): ${component.laborPricePerM2}`);
  console.log(`  fallback 계산: Math.round(${component.materialPrice} * ${component.quantity}) = ${Math.round(component.materialPrice * component.quantity)}`);

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
  let gypsumBoardDisplayQuantity = null; // 석고보드 16번 컬럼 값 저장용

  if (isStud(componentName)) {
    // 스터드: @, 두께, 넓이, 높이, 수량
    atValue = spacingValue || '';
    thicknessValue = sizeData.thickness || '';
    widthValue = sizeData.width || '';
    heightValue = sizeData.height || '';
    const mValueRaw = Math.round(component.quantity * area); // ✅ quantity × area
    mValue = mValueRaw.toLocaleString();
  } else if (isRunner(componentName)) {
    // 런너: 두께, 넓이, 높이, 수량
    atValue = '';
    thicknessValue = sizeData.thickness || '';
    widthValue = sizeData.width || '';
    heightValue = sizeData.height || '';
    const mValueRaw = Math.round(component.quantity * area); // ✅ quantity × area
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
            gypsumBoardDisplayQuantity = area * component.quantity; // ✅ quantity 사용
          }
          // 14번 컬럼 장: displayQuantity ÷ m2PerSheet
          sheetQuantity = Math.round(gypsumBoardDisplayQuantity / m2PerSheet);
        }
      }
    }
  } else if (isMagazinePiece(componentName) || isNailingBullet(componentName)) {
    // 매거진피스, 타정총알: 11번 컬럼에 수량 표시 (정수)
    const mValueRaw = Math.round(component.quantity * area); // ✅ quantity × area
    mValue = mValueRaw.toLocaleString();
  } else if (isWeldingRod(componentName)) {
    // 용접봉: 11번 컬럼에 수량 표시 (소수점 둘째자리)
    const mValueRaw = (component.quantity * area).toFixed(2); // ✅ quantity × area
    mValue = parseFloat(mValueRaw).toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // 수량 계산
  let displayQuantity = area;
  // ✅ 석고보드: 16번 컬럼에 area × component.quantity
  if (isGypsumBoard(componentName)) {
    displayQuantity =
      component.gypsumBoardDisplayQuantity || area * component.quantity; // ✅ quantity 사용
  } else if (component.parentCategory === '석고보드') {
    // ✅ 메거진피스 등 석고보드 카테고리의 다른 자재: area 사용 (그룹핑된 면적 합계)
    displayQuantity = area; // 120 + 120 = 240
  }
  const quantity = component.quantity * area; // ✅ quantity 사용 (totalQuantity 제거됨)

  // 발주단가 - 1m² 단가 (DB에 저장된 값 사용, 없으면 계산)
  const orderMatPrice = component.materialPricePerM2 ||
                       Math.round(component.materialPrice * component.quantity); // 1m² 자재비
  const orderLabPrice = component.laborPricePerM2 ||
                       Math.round(component.laborAmount); // 1m² 노무비
  const orderMatAmount = orderMatPrice * displayQuantity; // 총 자재비 = 반올림된 1m² 단가 × 수량(16번 칸럼)
  const orderLabAmount = orderLabPrice * displayQuantity; // 총 노무비 = 반올림된 1m² 단가 × 수량(16번 칸럼)

  // 🐛 디버깅: 최종 계산 결과
  console.log(`  ✅ 최종 orderMatPrice: ${orderMatPrice}`);

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
        <tr style="background: white;" data-row="${rowNumber}" data-category="${component.dataCategory || ''}">
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
            <td>${
              sheetQuantity ? parseInt(sheetQuantity).toLocaleString() : ''
            }</td>
            <td>M2</td>
            <td class="quantity-cell">${displayQuantity.toFixed(2)}</td>

            <!-- 계약도급 -->
            <td class="number-cell contract-material-price">${Math.round(
              contractMatPrice
            ).toLocaleString()}</td>
            <td class="number-cell contract-material-amount">${contractMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell contract-labor-price">${Math.round(
              contractLabPrice
            ).toLocaleString()}</td>
            <td class="number-cell contract-labor-amount">${contractLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td><input type="text" class="expense-input contract-expense-price" data-row="${rowNumber}" placeholder="0" style="text-align: right;"></td>
            <td class="number-cell contract-expense-amount">0</td>
            <td class="number-cell contract-total-price">${Math.round(
              contractMatPrice + contractLabPrice
            ).toLocaleString()}</td>
            <td class="number-cell contract-total-amount">${(contractMatAmount + contractLabAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>

            <!-- 발주단가 -->
            <td class="number-cell order-material-price">${Math.round(
              orderMatPrice
            ).toLocaleString()}</td>
            <td class="number-cell order-material-amount">${orderMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="number-cell order-labor-price">${Math.round(
              orderLabPrice
            ).toLocaleString()}</td>
            <td class="number-cell order-labor-amount">${orderLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td><input type="text" class="expense-input order-expense-price" data-row="${rowNumber}" placeholder="0" style="text-align: right;"></td>
            <td class="number-cell order-expense-amount">0</td>
            <td class="number-cell order-total-price">${Math.round(
              orderMatPrice + orderLabPrice
            ).toLocaleString()}</td>
            <td class="number-cell order-total-amount">${(orderMatAmount + orderLabAmount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td></td>
        </tr>
    `;
}

/**
 * 발주서 데이터 행 생성
 */
async function generateOrderFormDataRows() {
  console.log('🏗️ generateOrderFormDataRows() 함수 실행 시작');
  console.log(`📊 calculationResults.length: ${calculationResults.length}`);

  if (calculationResults.length === 0) {
    console.log('⚠️ calculationResults가 비어있어 조기 리턴');
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

  console.log('✅ 발주서 데이터 행 생성 진행 중...');

  // 타입별로 그룹핑
  const groupedByType = groupResultsByType(calculationResults);

  // 각 타입별 처리
  for (const [typeName, results] of Object.entries(groupedByType)) {
    console.log(`\n🔷 타입 처리 시작: ${typeName}, 벽체 개수: ${results.length}`);

    // 타입별로 rowNumber를 1부터 시작
    let rowNumber = 1;

    // 1. 타입 요약 행
    html += await generateTypeSummaryRow(typeName, results, typeIndex);

    // 2. ✅ Phase 1 함수 사용: 구성품 수집 및 그룹핑
    console.log(`📦 collectAndGroupComponents() 호출 중...`);
    const groupedComponents = await collectAndGroupComponents(results);
    console.log(`✅ 그룹핑 완료: ${groupedComponents.length}개 구성품`);

    // 3. ✅ 직접비/간접비 분리
    const { directCosts, indirectCosts } =
      separateDirectAndIndirectCosts(groupedComponents);

    // 4. ✅ 직접비 정렬 및 행 생성
    const sortedDirectCosts = sortComponents(directCosts);

    // ✅ 4-1. 먼저 석고보드 찾아서 displayQuantity 계산
    let gypsumBoardQty = null;
    for (const comp of sortedDirectCosts) {
      if (isGypsumBoard(comp.name)) {
        // 석고보드의 16번 컬럼 값 계산: area × quantity
        gypsumBoardQty = comp.area * comp.quantity;
        console.log(
          `📦 석고보드 수량 계산: ${comp.area} × ${comp.quantity} = ${gypsumBoardQty}`
        );
        break;
      }
    }

    // ✅ 4-1.5. dataCategory 설정 (HTML 생성 전에 미리 설정)
    for (const comp of sortedDirectCosts) {
      const category = comp.parentCategory;
      if (category === 'STUD' || category === 'RUNNER') {
        comp.dataCategory = 'STUD'; // ✅ 스터드+런너 통합
      } else if (category) {
        comp.dataCategory = category; // ✅ 모든 자재 자동 처리 (석고보드, 그라스울, 방화재 등)
      }
    }

    // ✅ 4-2. 석고보드 수량을 모든 구성품에 전달하고 금액 계산
    for (const comp of sortedDirectCosts) {
      comp.gypsumBoardDisplayQuantity = gypsumBoardQty;

      // 💾 발주단가 금액 계산 및 저장 (재료별 합계에서 사용)
      const area = comp.area;
      const componentName = comp.name;
      const materialData = comp.materialData;

      // 16번 컬럼 수량 계산
      let displayQuantity = area;
      if (isGypsumBoard(componentName)) {
        displayQuantity = comp.gypsumBoardDisplayQuantity || area * comp.quantity;
      }

      // 14번 컬럼 장수 계산 (석고보드만)
      let sheetQuantity = null;
      if (isGypsumBoard(componentName) && materialData) {
        const w = parseFloat(materialData.w) || 0;
        const h = parseFloat(materialData.h) || 0;
        if (w > 0 && h > 0) {
          const m2PerSheet = ((w / 1000) * (h / 1000));
          const gypsumBoardQty = comp.gypsumBoardDisplayQuantity || area * comp.quantity;
          sheetQuantity = Math.round(gypsumBoardQty / m2PerSheet);
        }
      }

      // 11번 컬럼 수량 계산
      let mValue = null;
      if (isWeldingRod(componentName)) {
        mValue = parseFloat((comp.quantity * area).toFixed(2));
      } else if (!isGypsumBoard(componentName)) {
        mValue = Math.round(comp.quantity * area);
      }

      // 발주단가 1m² 단가
      const orderMatPrice = comp.materialPricePerM2 || Math.round(comp.materialPrice * comp.quantity);
      const orderLabPrice = comp.laborPricePerM2 || Math.round(comp.laborAmount);

      // 발주단가 금액 = 1m² 단가 × 16번 컬럼 수량
      const orderMatAmount = Math.round(orderMatPrice * displayQuantity);
      const orderLabAmount = Math.round(orderLabPrice * displayQuantity);

      // 저장
      comp.displayQuantity = displayQuantity;
      comp.sheetQuantity = sheetQuantity;
      comp.mValue = mValue;
      comp.orderMatPrice = orderMatPrice;
      comp.orderLabPrice = orderLabPrice;
      comp.orderMatAmount = orderMatAmount;
      comp.orderLabAmount = orderLabAmount;

      html += generateGroupedComponentRow(comp, rowNumber);
      rowNumber++;
    }

    // ✅ 전역 변수에 직접비 데이터 저장 (재료별 합계에서 사용)
    // 모든 계산이 완료된 후에 저장하여 orderMatAmount, orderLabAmount 등이 포함되도록 함
    orderFormDirectCosts = sortedDirectCosts;
    console.log(`💾 발주서 직접비 데이터 저장됨: ${orderFormDirectCosts.length}개 항목`);

    // 5. ✅ 직접비 소계 (HTML과 데이터 함께 받기)
    const directSubtotalResult = generateSubtotalRow(sortedDirectCosts, '소계 (직접자재)', rowNumber);
    html += directSubtotalResult.html;
    const savedDirectSubtotal = directSubtotalResult.subtotalData;  // ✅ 총계 계산에 사용할 데이터 저장
    console.log(`🔍 [저장시점] savedDirectSubtotal 단가 - 자재: ${savedDirectSubtotal.orderMaterialPrice}, 노무: ${savedDirectSubtotal.orderLaborPrice}`);
    rowNumber++;

    // 6. 🆕 간접비 계산 및 행 생성 (모든 카테고리 포함)

    // 6-1. 직접비를 카테고리별로 완전히 그룹핑
    console.log(
      `🔍 전체 직접비 구성품:`,
      sortedDirectCosts.map((c) => ({
        name: c.name,
        parentCategory: c.parentCategory,
      }))
    );

    // ✅ 모든 카테고리별로 그룹핑 (스터드/런너, 석고보드, 그라스울 등)
    const categorizedCosts = {
      'STUD': [],  // 스터드와 런너를 함께 처리
      '석고보드': {},
      '그라스울': {},
    };

    for (const comp of sortedDirectCosts) {
      const category = comp.parentCategory;

      if (category === 'STUD' || category === 'RUNNER') {
        // 스터드와 런너는 경량자재로 함께 처리
        // ✅ comp.dataCategory는 이미 위에서 설정됨 (3888-3896라인)
        categorizedCosts['STUD'].push(comp);
      } else if (category === '석고보드' || category === '그라스울') {
        // 석고보드와 그라스울은 unitPriceId별로 그룹핑
        const unitPriceId = comp.unitPriceItem?.id || 'unknown';
        // ✅ comp.dataCategory는 이미 위에서 설정됨 (3888-3896라인)
        if (!categorizedCosts[category][unitPriceId]) {
          categorizedCosts[category][unitPriceId] = [];
        }
        categorizedCosts[category][unitPriceId].push(comp);
      }
    }

    console.log(
      `📦 카테고리별 그룹 개수:`,
      `경량자재=${categorizedCosts['STUD'].length}, ` +
      `석고보드=${Object.keys(categorizedCosts['석고보드']).length}, ` +
      `그라스울=${Object.keys(categorizedCosts['그라스울']).length}`
    );

    // ✨ 총 면적 계산
    const totalArea = results.reduce((sum, r) => sum + r.area, 0);

    // 6-2. 스터드(경량자재) 간접비 계산
    let studIndirectCosts = [];
    let studMaterialTotal = 0;  // ✅ 스코프 확장
    let studLaborTotal = 0;     // ✅ 스코프 확장

    if (categorizedCosts['STUD'].length > 0) {
      const studUnitPriceItem = categorizedCosts['STUD'][0]?.unitPriceItem;
      const studFixedRates = studUnitPriceItem?.fixedRates || {
        materialLoss: 3,
        transportCost: 1.5,
        materialProfit: 15,
        toolExpense: 2,
      };

      console.log(`🔧 스터드 unitPriceItem:`, studUnitPriceItem?.id);
      console.log(`🔧 스터드 fixedRates:`, studFixedRates);
      console.log(`📊 스터드/런너 구성품 상세:`);
      for (const comp of categorizedCosts['STUD']) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;

        console.log(
          `  - ${comp.name}: 자재(${comp.materialPrice}×${
            comp.quantity
          }=${materialPricePerM2.toFixed(2)}), 노무(${laborPricePerM2}), 면적(${
            comp.area
          }m²)`
        );

        studMaterialTotal += materialPricePerM2 * comp.area;
        studLaborTotal += laborPricePerM2 * comp.area;
      }
      console.log(
        `📊 스터드/런너 직접비 합계 - 자재: ${studMaterialTotal.toLocaleString()}, 노무: ${studLaborTotal.toLocaleString()}`
      );

      studIndirectCosts = calculateIndirectCosts(
        '스터드',
        studMaterialTotal,
        studLaborTotal,
        studFixedRates,
        studUnitPriceItem,
        totalArea
      );
    }

    // 6-3. 석고보드 그룹별 간접비 계산
    const allGypsumIndirectCosts = [];

    for (const [unitPriceId, gypsumGroup] of Object.entries(categorizedCosts['석고보드'])) {
      const gypsumUnitPriceItem = gypsumGroup[0]?.unitPriceItem;
      const gypsumFixedRates = gypsumUnitPriceItem?.fixedRates || {
        materialLoss: 3,
        transportCost: 1.5,
        materialProfit: 15,
        toolExpense: 2,
      };

      // 이 그룹의 직접비와 면적
      let gypsumMaterialTotal = 0;
      let gypsumLaborTotal = 0;

      // ✅ 면적은 첫 번째 구성품 것만 사용 (직접비 테이블 표시와 일치)
      const gypsumArea = gypsumGroup[0]?.area || 0;

      // ✅ basic 객체에서 이름 조합 (itemName + size)
      const categoryName = gypsumUnitPriceItem?.basic
        ? `${gypsumUnitPriceItem.basic.itemName} ${gypsumUnitPriceItem.basic.size}`
        : (gypsumGroup[0]?.name || '석고보드');

      console.log(`📊 석고보드 그룹 [${categoryName}] 구성품 상세:`);
      for (const comp of gypsumGroup) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;

        console.log(
          `  - ${comp.name}: 자재(${comp.materialPrice}×${
            comp.quantity
          }=${materialPricePerM2.toFixed(2)}), 노무(${laborPricePerM2}), 면적(${
            comp.area
          }m²)`
        );

        // 금액 합산 (각 comp는 이미 자신의 area를 가지고 있음)
        gypsumMaterialTotal += materialPricePerM2 * comp.area;
        gypsumLaborTotal += laborPricePerM2 * comp.area;
      }

      console.log(
        `📊 석고보드 그룹 [${categoryName}] 직접비 합계 - 자재: ${gypsumMaterialTotal.toLocaleString()}, 노무: ${gypsumLaborTotal.toLocaleString()}, 면적: ${gypsumArea}m²`
      );

      // 이 그룹의 간접비 계산
      const gypsumIndirectCosts = calculateIndirectCosts(
        categoryName,
        gypsumMaterialTotal,
        gypsumLaborTotal,
        gypsumFixedRates,
        gypsumUnitPriceItem,
        gypsumArea  // ✅ 해당 석고보드 면적만
      );

      allGypsumIndirectCosts.push(...gypsumIndirectCosts);
    }

    // 6-4. 그라스울 그룹별 간접비 계산
    const allGlassWoolIndirectCosts = [];

    for (const [unitPriceId, glassWoolGroup] of Object.entries(categorizedCosts['그라스울'])) {
      const glassWoolUnitPriceItem = glassWoolGroup[0]?.unitPriceItem;
      const glassWoolFixedRates = glassWoolUnitPriceItem?.fixedRates || {
        materialLoss: 3,
        transportCost: 1.5,
        materialProfit: 15,
        toolExpense: 2,
      };

      // 이 그룹의 직접비와 면적
      let glassWoolMaterialTotal = 0;
      let glassWoolLaborTotal = 0;

      // ✅ 면적은 첫 번째 구성품 것만 사용
      const glassWoolArea = glassWoolGroup[0]?.area || 0;

      // ✅ basic 객체에서 이름 조합 또는 name 사용
      const categoryName = glassWoolUnitPriceItem?.basic
        ? `${glassWoolUnitPriceItem.basic.itemName || '그라스울'} ${glassWoolUnitPriceItem.basic.size || ''}`
        : (glassWoolGroup[0]?.name || '그라스울');

      console.log(`📊 그라스울 그룹 [${categoryName}] 구성품 상세:`);
      for (const comp of glassWoolGroup) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;

        console.log(
          `  - ${comp.name}: 자재(${comp.materialPrice}×${
            comp.quantity
          }=${materialPricePerM2.toFixed(2)}), 노무(${laborPricePerM2}), 면적(${
            comp.area
          }m²)`
        );

        // 금액 합산
        glassWoolMaterialTotal += materialPricePerM2 * comp.area;
        glassWoolLaborTotal += laborPricePerM2 * comp.area;
      }

      console.log(
        `📊 그라스울 그룹 [${categoryName}] 직접비 합계 - 자재: ${glassWoolMaterialTotal.toLocaleString()}, 노무: ${glassWoolLaborTotal.toLocaleString()}, 면적: ${glassWoolArea}m²`
      );

      // 이 그룹의 간접비 계산
      const glassWoolIndirectCosts = calculateIndirectCosts(
        categoryName,
        glassWoolMaterialTotal,
        glassWoolLaborTotal,
        glassWoolFixedRates,
        glassWoolUnitPriceItem,
        glassWoolArea
      );

      allGlassWoolIndirectCosts.push(...glassWoolIndirectCosts);
    }

    // 6-5. 간접비 행 생성 (스터드 + 석고보드 + 그라스울 + 소계)
    // 🆕 자재별 단수정리 누적 변수
    let totalRoundingOrder = 0;
    let totalRoundingContract = 0;

    // 스터드 간접비
    for (const item of studIndirectCosts) {
      html += generateIndirectCostRow(item, rowNumber, totalArea);
      rowNumber++;
    }

    // 🆕 스터드 단수정리 행 추가
    if (studIndirectCosts.length > 0) {
      const value = parseFloat(document.getElementById('contractRatioInput')?.value);
      const contractRatio = isNaN(value) ? 1.2 : value;

      // 스터드 간접비 합계 계산 (발주단가 & 계약도급)
      let studIndirectMaterial = 0;
      let studIndirectLabor = 0;
      let studContractIndirectMaterial = 0;
      let studContractIndirectLabor = 0;

      for (const item of studIndirectCosts) {
        const isMaterialCost =
          item.name.includes('자재로스') ||
          item.name.includes('운반비') ||
          item.name.includes('이윤');
        const isLaborCost = item.name.includes('공구손료');

        if (isMaterialCost) {
          studIndirectMaterial += item.amount || 0;
          // ✅ 계약도급: (단가 × 비율 반올림) × 면적
          const area = item.area || totalArea;
          const contractUnitPrice = Math.round((item.unitPrice || 0) * contractRatio);
          studContractIndirectMaterial += Math.round(contractUnitPrice * area);
        }
        if (isLaborCost) {
          studIndirectLabor += item.amount || 0;
          // ✅ 계약도급: (단가 × 비율 반올림) × 면적
          const area = item.area || totalArea;
          const contractUnitPrice = Math.round((item.unitPrice || 0) * contractRatio);
          studContractIndirectLabor += Math.round(contractUnitPrice * area);
        }
      }

      // 스터드 직접비 계약도급 합계 계산
      let studContractMaterialTotal = 0;
      let studContractLaborTotal = 0;
      for (const comp of categorizedCosts['STUD']) {
        const matPrice1m2 = comp.materialPrice * comp.quantity;
        const labPrice1m2 = comp.laborAmount;
        const contractMatPrice = Math.round(matPrice1m2 * contractRatio);
        const contractLabPrice = Math.round(labPrice1m2 * contractRatio);
        studContractMaterialTotal += contractMatPrice * comp.area;
        studContractLaborTotal += contractLabPrice * comp.area;
      }

      // 🆕 스터드 직접비 경비 합계 계산 (HTML에서 읽기)
      let studExpense = 0;
      let studContractExpense = 0;
      for (const comp of categorizedCosts['STUD']) {
        const rows = document.querySelectorAll('.order-form-table tbody tr[data-row]');
        for (const row of rows) {
          const nameCell = row.cells[2]?.textContent.trim();
          if (nameCell && nameCell.includes(comp.name)) {
            const expenseInput = row.querySelector('.contract-expense-price');
            if (expenseInput) {
              const expenseValue = parseFloat(expenseInput.value.replace(/,/g, '')) || 0;
              studContractExpense += expenseValue;
              studExpense += expenseValue / contractRatio; // 발주단가로 역계산
            }
            break;
          }
        }
      }

      // ✅ 스터드 unitPriceItem에서 단수정리 1m² 단가 가져오기
      const studUnitPriceItem = categorizedCosts['STUD'][0]?.unitPriceItem;

      const studRoundingResult = generateMaterialRoundingRow(
        '스터드',
        studUnitPriceItem,
        totalArea,
        contractRatio,
        rowNumber
      );
      html += studRoundingResult.html;
      totalRoundingOrder += studRoundingResult.orderRounding;
      totalRoundingContract += studRoundingResult.contractRounding;
      rowNumber++;
    }

    // 석고보드 간접비 (각 그룹별 4개씩 + 단수정리)
    // 🆕 그룹별로 처리하기 위해 다시 순회
    for (const [unitPriceId, gypsumGroup] of Object.entries(categorizedCosts['석고보드'])) {
      const gypsumUnitPriceItem = gypsumGroup[0]?.unitPriceItem;
      const categoryName = gypsumUnitPriceItem?.basic
        ? `${gypsumUnitPriceItem.basic.itemName} ${gypsumUnitPriceItem.basic.size}`
        : (gypsumGroup[0]?.name || '석고보드');

      // 이 그룹의 직접비 합계 (다시 계산)
      let gypsumDirectMaterial = 0;
      let gypsumDirectLabor = 0;
      for (const comp of gypsumGroup) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;
        gypsumDirectMaterial += materialPricePerM2 * comp.area;
        gypsumDirectLabor += laborPricePerM2 * comp.area;
      }

      // 이 그룹의 간접비만 필터링
      const gypsumGroupIndirectCosts = allGypsumIndirectCosts.filter(
        item => item.name.includes(categoryName)
      );

      // 간접비 행 생성
      for (const item of gypsumGroupIndirectCosts) {
        html += generateIndirectCostRow(item, rowNumber, totalArea);
        rowNumber++;
      }

      // 🆕 이 그룹의 단수정리 행 추가
      if (gypsumGroupIndirectCosts.length > 0) {
        const value = parseFloat(document.getElementById('contractRatioInput')?.value);
        const contractRatio = isNaN(value) ? 1.2 : value;

        // 간접비 합계 계산 (발주단가 & 계약도급)
        let gypsumIndirectMaterial = 0;
        let gypsumIndirectLabor = 0;
        let gypsumContractIndirectMaterial = 0;
        let gypsumContractIndirectLabor = 0;

        for (const item of gypsumGroupIndirectCosts) {
          const isMaterialCost =
            item.name.includes('자재로스') ||
            item.name.includes('운반비') ||
            item.name.includes('이윤');
          const isLaborCost = item.name.includes('공구손료');

          if (isMaterialCost) {
            gypsumIndirectMaterial += item.amount || 0;
            const area = item.area || totalArea;
            const contractUnitPrice = Math.round((item.unitPrice || 0) * contractRatio);
            gypsumContractIndirectMaterial += Math.round(contractUnitPrice * area);
          }
          if (isLaborCost) {
            gypsumIndirectLabor += item.amount || 0;
            const area = item.area || totalArea;
            const contractUnitPrice = Math.round((item.unitPrice || 0) * contractRatio);
            gypsumContractIndirectLabor += Math.round(contractUnitPrice * area);
          }
        }

        // 석고보드 그룹 직접비 계약도급 합계 계산
        let gypsumContractDirectMaterial = 0;
        let gypsumContractDirectLabor = 0;
        for (const comp of gypsumGroup) {
          const matPrice1m2 = comp.materialPrice * comp.quantity;
          const labPrice1m2 = comp.laborAmount;
          const contractMatPrice = Math.round(matPrice1m2 * contractRatio);
          const contractLabPrice = Math.round(labPrice1m2 * contractRatio);
          gypsumContractDirectMaterial += contractMatPrice * comp.area;
          gypsumContractDirectLabor += contractLabPrice * comp.area;
        }

        // 🆕 석고보드 그룹 직접비 경비 합계 계산 (HTML에서 읽기)
        let gypsumExpense = 0;
        let gypsumContractExpense = 0;
        for (const comp of gypsumGroup) {
          const rows = document.querySelectorAll('.order-form-table tbody tr[data-row]');
          for (const row of rows) {
            const nameCell = row.cells[2]?.textContent.trim();
            if (nameCell && nameCell.includes(comp.name)) {
              const expenseInput = row.querySelector('.contract-expense-price');
              if (expenseInput) {
                const expenseValue = parseFloat(expenseInput.value.replace(/,/g, '')) || 0;
                gypsumContractExpense += expenseValue;
                gypsumExpense += expenseValue / contractRatio;
              }
              break;
            }
          }
        }

        // ✅ 석고보드 그룹의 면적 (첫 번째 구성품 면적)
        const gypsumArea = gypsumGroup[0]?.area || 0;

        const gypsumRoundingResult = generateMaterialRoundingRow(
          categoryName,
          gypsumUnitPriceItem,
          gypsumArea,
          contractRatio,
          rowNumber
        );
        html += gypsumRoundingResult.html;
        totalRoundingOrder += gypsumRoundingResult.orderRounding;
        totalRoundingContract += gypsumRoundingResult.contractRounding;
        rowNumber++;
      }
    }

    // 그라스울 간접비 (각 그룹별 4개씩 + 단수정리)
    // 🆕 그룹별로 처리하기 위해 다시 순회
    for (const [unitPriceId, glassWoolGroup] of Object.entries(categorizedCosts['그라스울'])) {
      const glassWoolUnitPriceItem = glassWoolGroup[0]?.unitPriceItem;
      const categoryName = glassWoolUnitPriceItem?.basic
        ? `${glassWoolUnitPriceItem.basic.itemName || '그라스울'} ${
            glassWoolUnitPriceItem.basic.size || ''
          }`
        : glassWoolGroup[0]?.name || '그라스울';

      // 이 그룹의 직접비 합계 (다시 계산)
      let glassWoolDirectMaterial = 0;
      let glassWoolDirectLabor = 0;
      for (const comp of glassWoolGroup) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;
        glassWoolDirectMaterial += materialPricePerM2 * comp.area;
        glassWoolDirectLabor += laborPricePerM2 * comp.area;
      }

      // 이 그룹의 간접비만 필터링
      const glassWoolGroupIndirectCosts = allGlassWoolIndirectCosts.filter(
        item => item.name.includes(categoryName)
      );

      // 간접비 행 생성
      for (const item of glassWoolGroupIndirectCosts) {
        html += generateIndirectCostRow(item, rowNumber, totalArea);
        rowNumber++;
      }

      // 🆕 이 그룹의 단수정리 행 추가
      if (glassWoolGroupIndirectCosts.length > 0) {
        const value = parseFloat(document.getElementById('contractRatioInput')?.value);
        const contractRatio = isNaN(value) ? 1.2 : value;

        // 간접비 합계 계산
        let glassWoolIndirectMaterial = 0;
        let glassWoolIndirectLabor = 0;
        for (const item of glassWoolGroupIndirectCosts) {
          const isMaterialCost =
            item.name.includes('자재로스') ||
            item.name.includes('운반비') ||
            item.name.includes('이윤');
          const isLaborCost = item.name.includes('공구손료');

          if (isMaterialCost) glassWoolIndirectMaterial += item.amount || 0;
          if (isLaborCost) glassWoolIndirectLabor += item.amount || 0;
        }

        // 🆕 그라스울 그룹 직접비 경비 합계 계산 (HTML에서 읽기)
        let glassWoolExpense = 0;
        for (const comp of glassWoolGroup) {
          const rows = document.querySelectorAll('.order-form-table tbody tr[data-row]');
          for (const row of rows) {
            const nameCell = row.cells[2]?.textContent.trim();
            if (nameCell && nameCell.includes(comp.name)) {
              const expenseInput = row.querySelector('.contract-expense-price');
              if (expenseInput) {
                glassWoolExpense += parseFloat(expenseInput.value.replace(/,/g, '')) || 0;
              }
              break;
            }
          }
        }

        // ✅ 간접비 계약도급 계산
        let glassWoolContractIndirectMaterial = 0;
        let glassWoolContractIndirectLabor = 0;
        for (const item of glassWoolGroupIndirectCosts) {
          const area = item.area || totalArea;
          const contractUnitPrice = Math.round((item.unitPrice || 0) * contractRatio);
          const isMaterialCost =
            item.name.includes('자재로스') ||
            item.name.includes('운반비') ||
            item.name.includes('이윤');
          const isLaborCost = item.name.includes('공구손료');

          if (isMaterialCost) {
            glassWoolContractIndirectMaterial += Math.round(contractUnitPrice * area);
          }
          if (isLaborCost) {
            glassWoolContractIndirectLabor += Math.round(contractUnitPrice * area);
          }
        }

        // ✅ 직접비 계약도급 계산
        let glassWoolContractDirectMaterial = 0;
        let glassWoolContractDirectLabor = 0;
        let glassWoolContractExpense = 0;
        for (const comp of glassWoolGroup) {
          const matPrice1m2 = comp.materialPrice * comp.quantity;
          const labPrice1m2 = comp.laborPrice * comp.quantity;
          const contractMatPrice = Math.round(matPrice1m2 * contractRatio);
          const contractLabPrice = Math.round(labPrice1m2 * contractRatio);

          glassWoolContractDirectMaterial += contractMatPrice * comp.area;
          glassWoolContractDirectLabor += contractLabPrice * comp.area;
        }

        // 경비는 HTML에서 직접 읽기 (계약도급 값)
        for (const comp of glassWoolGroup) {
          const rows = document.querySelectorAll('.order-form-table tbody tr[data-row]');
          for (const row of rows) {
            const nameCell = row.cells[2]?.textContent.trim();
            if (nameCell && nameCell.includes(comp.name)) {
              const expenseInput = row.querySelector('.contract-expense-price');
              if (expenseInput) {
                glassWoolContractExpense += parseFloat(expenseInput.value.replace(/,/g, '')) || 0;
              }
              break;
            }
          }
        }

        // ✅ 그라스울 그룹의 면적 (첫 번째 구성품 면적)
        const glassWoolArea = glassWoolGroup[0]?.area || 0;

        const glassWoolRoundingResult = generateMaterialRoundingRow(
          categoryName,
          glassWoolUnitPriceItem,
          glassWoolArea,
          contractRatio,
          rowNumber
        );
        html += glassWoolRoundingResult.html;
        totalRoundingOrder += glassWoolRoundingResult.orderRounding;
        totalRoundingContract += glassWoolRoundingResult.contractRounding;
        rowNumber++;
      }
    }

    const allIndirectCosts = [...studIndirectCosts, ...allGypsumIndirectCosts, ...allGlassWoolIndirectCosts];

    // 7. 간접비 소계 데이터 계산 (✅ amount 직접 합산 방식으로 변경)
    const value = parseFloat(document.getElementById('contractRatioInput')?.value);
    const contractRatio = isNaN(value) ? 1.2 : value;
    let orderMaterialAmount = 0;
    let orderLaborAmount = 0;

    console.log(`💰 간접비 소계 객체 계산 시작 (총 ${allIndirectCosts.length}개 항목)`);

    for (const item of allIndirectCosts) {
      const isMaterialCost = item.name.includes('자재로스') || item.name.includes('운반비') || item.name.includes('이윤');
      const isLaborCost = item.name.includes('공구손료');

      if (isMaterialCost) {
        orderMaterialAmount += item.amount || 0;
        console.log(`  - [자재비] ${item.name}: amount=${(item.amount || 0).toLocaleString()}`);
      } else if (isLaborCost) {
        orderLaborAmount += item.amount || 0;
        console.log(`  - [노무비] ${item.name}: amount=${(item.amount || 0).toLocaleString()}`);
      }
    }

    console.log(`  ✅ 발주단가 합계 - 자재비: ${orderMaterialAmount.toLocaleString()}, 노무비: ${orderLaborAmount.toLocaleString()}`);

    // ✅ 계약도급 금액: 소수점 2자리 유지 (발주단가 합계 × 비율)
    const contractMaterialAmount = Math.round((orderMaterialAmount * contractRatio) * 100) / 100;
    const contractLaborAmount = Math.round((orderLaborAmount * contractRatio) * 100) / 100;

    // ✅ 단가 합계 계산 (총계 행 표시용) - 직접비와 동일하게 unitPrice 합산 방식 사용!
    let orderMaterialUnitPrice = 0;
    let orderLaborUnitPrice = 0;

    console.log(`  🔍 간접비 단가 합산 시작 (총 ${allIndirectCosts.length}개 항목)`);

    for (const item of allIndirectCosts) {
      const isMaterialCost = item.name.includes('자재로스') || item.name.includes('운반비') || item.name.includes('이윤');
      const isLaborCost = item.name.includes('공구손료');

      if (isMaterialCost) {
        orderMaterialUnitPrice += item.unitPrice || 0;
        console.log(`    - [자재비 단가] ${item.name}: unitPrice=${item.unitPrice || 0}`);
      } else if (isLaborCost) {
        orderLaborUnitPrice += item.unitPrice || 0;
        console.log(`    - [노무비 단가] ${item.name}: unitPrice=${item.unitPrice || 0}`);
      }
    }

    // 소수점 2자리로 반올림
    orderMaterialUnitPrice = Math.round(orderMaterialUnitPrice * 100) / 100;
    orderLaborUnitPrice = Math.round(orderLaborUnitPrice * 100) / 100;

    const contractMaterialUnitPrice = Math.round((orderMaterialUnitPrice * contractRatio) * 100) / 100;
    const contractLaborUnitPrice = Math.round((orderLaborUnitPrice * contractRatio) * 100) / 100;

    console.log(`  ✅ 간접비 단가 합계 - 자재: ${orderMaterialUnitPrice}, 노무: ${orderLaborUnitPrice}`);

    const indirectSubtotal = {
      orderMaterialAmount: Math.round(orderMaterialAmount * 100) / 100,
      orderLaborAmount: Math.round(orderLaborAmount * 100) / 100,
      orderMaterialPrice: orderMaterialUnitPrice,
      orderLaborPrice: orderLaborUnitPrice,
      orderExpensePrice: 0,
      contractMaterialAmount: contractMaterialAmount,
      contractLaborAmount: contractLaborAmount,
      contractMaterialPrice: contractMaterialUnitPrice,
      contractLaborPrice: contractLaborUnitPrice,
      contractExpensePrice: 0
    };

    console.log(`📊 [간접비 소계] 총계 계산용 객체 (화면 표시 소계와 동일):`);
    console.log(`  발주단가 금액 - 자재: ${indirectSubtotal.orderMaterialAmount.toLocaleString()}, 노무: ${indirectSubtotal.orderLaborAmount.toLocaleString()}`);
    console.log(`  🔍 발주단가 단가 - 자재: ${indirectSubtotal.orderMaterialPrice}, 노무: ${indirectSubtotal.orderLaborPrice}`);
    console.log(`  ✅ 계약도급 (${contractRatio}배) - 자재비: ${indirectSubtotal.contractMaterialAmount.toLocaleString()}, 노무비: ${indirectSubtotal.contractLaborAmount.toLocaleString()}`);

    // 8. 간접비 소계 HTML 생성 (✅ 미리 계산된 객체 전달 - 재계산 방지!)
    console.log(`🚀 generateIndirectCostSubtotalRow 호출 직전 - indirectSubtotal:`, indirectSubtotal);
    html += generateIndirectCostSubtotalRow(allIndirectCosts, totalArea, rowNumber, indirectSubtotal);
    rowNumber++;

    // 9. ✅ 직접비 소계 데이터는 이미 savedDirectSubtotal에 저장되어 있음 (재계산하지 않음!)
    console.log(`✅ ========== [직접비 소계] 화면 표시 값 재사용 (재계산 안함!) ==========`);
    console.log(`  금액 - 자재: ${savedDirectSubtotal.orderMaterialAmount.toLocaleString()}, 노무: ${savedDirectSubtotal.orderLaborAmount.toLocaleString()}`);
    console.log(`  🔍 단가 - 자재: ${savedDirectSubtotal.orderMaterialPrice}, 노무: ${savedDirectSubtotal.orderLaborPrice}`);
    console.log(`✅ ========== [직접비 소계] 데이터 재사용 완료 ==========\n`);

    // 10. ✅ 자재별 단수정리의 합산 (타입별 단수정리)
    const roundingAmount = totalRoundingOrder;
    const contractRoundingAmount = totalRoundingContract;

    console.log(`📐 타입별 단수정리 (자재별 합산):`);
    console.log(`  발주단가: ${roundingAmount.toLocaleString()}`);
    console.log(`  계약도급: ${contractRoundingAmount.toLocaleString()}`);

    html += `
        <tr style="background: #fff9c4;">
            <td class="number-cell">${rowNumber}</td>
            <td></td>
            <td>단수정리</td>
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
            <td class="number-cell">${contractRoundingAmount.toLocaleString()}</td>
            <td></td>
            <!-- 발주단가 -->
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${roundingAmount.toLocaleString()}</td>
            <td></td>
        </tr>
    `;
    rowNumber++;

    // 10. 🆕 전체 합계 (직접비 소계 + 간접비 소계 + 단수정리)
    // ✅ savedDirectSubtotal 사용 (화면 표시와 동일한 값)
    console.log(`🔍 [총계 호출 직전] savedDirectSubtotal 단가 - 자재: ${savedDirectSubtotal.orderMaterialPrice}, 노무: ${savedDirectSubtotal.orderLaborPrice}`);
    console.log(`🔍 [총계 호출 직전] indirectSubtotal 단가 - 자재: ${indirectSubtotal.orderMaterialPrice}, 노무: ${indirectSubtotal.orderLaborPrice}`);
    console.log(`🔍 [예상 총계 단가] 자재: ${savedDirectSubtotal.orderMaterialPrice} + ${indirectSubtotal.orderMaterialPrice} = ${savedDirectSubtotal.orderMaterialPrice + indirectSubtotal.orderMaterialPrice}`);
    html += generateGrandTotalRow(savedDirectSubtotal, indirectSubtotal, roundingAmount, rowNumber);

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
  const summaryRows = document.querySelectorAll(
    '.order-form-table tbody tr[style*="linear-gradient"]'
  );
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
  const allDataRows = document.querySelectorAll(
    '.order-form-table tbody tr[data-row]'
  );
  const typeDataRows = Array.from(allDataRows).filter((row) => {
    const rowType = row.cells[4]?.textContent.trim();
    return rowType === typeName;
  });

  // 계약도급 또는 발주단가 경비 합계 계산
  let totalExpenseAmount = 0;

  typeDataRows.forEach((row) => {
    const expenseCell = isContract
      ? row.querySelector('.contract-expense-amount')
      : row.querySelector('.order-expense-amount');

    const expenseValue =
      parseFloat(expenseCell?.textContent.replace(/,/g, '')) || 0;
    totalExpenseAmount += expenseValue;
  });

  // 타입 요약 행의 경비 셀 업데이트 (계약도급 또는 발주단가)
  // 계약도급: 20번째 컬럼 (경비 단가), 21번째 컬럼 (경비 금액)
  // 발주단가: 28번째 컬럼 (경비 단가), 29번째 컬럼 (경비 금액)
  const expensePriceColIndex = isContract ? 19 : 27; // 0-based index
  const expenseAmountColIndex = isContract ? 20 : 28;

  // 경비 단가는 0으로 유지 (요약 행은 단가 개념 없음)
  if (summaryRow.cells[expensePriceColIndex]) {
    summaryRow.cells[expensePriceColIndex].textContent = '0';
  }

  // 경비 금액 업데이트
  if (summaryRow.cells[expenseAmountColIndex]) {
    summaryRow.cells[expenseAmountColIndex].textContent =
      Math.round(totalExpenseAmount).toLocaleString();
  }

  // 타입 요약 행의 합계 재계산 (자재비 + 노무비 + 경비)
  // 1. 단가 읽기
  const materialPriceCell = isContract
    ? summaryRow.querySelector('.contract-material-price')
    : summaryRow.querySelector('.order-material-price');
  const laborPriceCell = isContract
    ? summaryRow.querySelector('.contract-labor-price')
    : summaryRow.querySelector('.order-labor-price');

  const materialPrice =
    parseFloat(materialPriceCell?.textContent.replace(/,/g, '')) || 0;
  const laborPrice =
    parseFloat(laborPriceCell?.textContent.replace(/,/g, '')) || 0;

  // 2. 금액 읽기
  const materialAmountCell = isContract
    ? summaryRow.querySelector('.contract-material-amount')
    : summaryRow.querySelector('.order-material-amount');
  const laborAmountCell = isContract
    ? summaryRow.querySelector('.contract-labor-amount')
    : summaryRow.querySelector('.order-labor-amount');

  const materialAmount =
    parseFloat(materialAmountCell?.textContent.replace(/,/g, '')) || 0;
  const laborAmount =
    parseFloat(laborAmountCell?.textContent.replace(/,/g, '')) || 0;

  // 3. 합계 단가 계산 (자재비 단가 + 노무비 단가 + 경비 단가)
  // 경비 단가 = 경비 금액 합계
  const totalPrice = Math.round(
    materialPrice + laborPrice + totalExpenseAmount
  );

  // 4. 합계 금액 계산 (자재비 금액 + 노무비 금액 + 경비 금액)
  const totalAmount = Math.round(
    materialAmount + laborAmount + totalExpenseAmount
  );

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
  const subtotalRows = document.querySelectorAll(
    '.order-form-table tbody tr[style*="linear-gradient(135deg, #f5f7fa"]'
  );
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

    // ✅ 간접비 소계도 재계산 (계약도급 비율 변경 시 필요)

    // 이 소계 행의 범위 결정 (타입 요약 행부터 다음 소계/합계 행까지)
    const allRows = Array.from(
      document.querySelectorAll('.order-form-table tbody tr')
    );
    const subtotalIndex = allRows.indexOf(subtotalRow);

    // 역방향으로 시작 행 찾기
    let startIndex = -1;
    const isIndirectSubtotal = label.includes('간접비');

    if (isIndirectSubtotal) {
      // 간접비 소계: 직접비 소계 행 다음부터
      for (let i = subtotalIndex - 1; i >= 0; i--) {
        const row = allRows[i];
        const rowLabel = row.cells[2]?.textContent.trim();
        if (rowLabel && rowLabel.includes('소계') && rowLabel.includes('직접')) {
          startIndex = i + 1;
          break;
        }
      }
    } else {
      // 직접비 소계: 타입 요약 행 다음부터
      for (let i = subtotalIndex - 1; i >= 0; i--) {
        const row = allRows[i];
        const firstCell = row.cells[0]?.textContent.trim();
        if (firstCell && /^\d+-\d+$/.test(firstCell)) {
          startIndex = i + 1;
          break;
        }
      }
    }

    if (startIndex === -1) return;

    // 해당 범위의 행들 수집
    const dataRows = [];
    for (let i = startIndex; i < subtotalIndex; i++) {
      const row = allRows[i];
      if (isIndirectSubtotal) {
        // 간접비 소계: 노란색 배경 행들 (#fffacd)
        const style = row.getAttribute('style') || '';
        if (style.includes('#fffacd')) {
          dataRows.push(row);
        }
      } else {
        // 직접비 소계: data-row 속성 있는 행들
        if (row.hasAttribute('data-row')) {
          dataRows.push(row);
        }
      }
    }
    console.log(`  📦 ${isIndirectSubtotal ? '간접비' : '직접비'} 행 개수: ${dataRows.length}`);

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
    let mValueSum = 0; // 11번 칸럼
    let sheetQuantitySum = 0; // 14번 칸럼
    let displayQuantitySum = 0; // 16번 칸럼

    dataRows.forEach((row) => {
      let contractMatPrice, contractLabPrice, contractExpPrice;
      let contractMatAmount, contractLabAmount, contractExpAmount;
      let orderMatPrice, orderLabPrice, orderExpPrice;
      let orderMatAmount, orderLabAmount, orderExpAmount;

      if (isIndirectSubtotal) {
        // 간접비 행: 셀 인덱스로 읽기
        contractMatPrice = parseFloat(row.cells[16]?.textContent.replace(/,/g, '')) || 0;
        contractMatAmount = parseFloat(row.cells[17]?.textContent.replace(/,/g, '')) || 0;
        contractLabPrice = parseFloat(row.cells[18]?.textContent.replace(/,/g, '')) || 0;
        contractLabAmount = parseFloat(row.cells[19]?.textContent.replace(/,/g, '')) || 0;
        contractExpPrice = 0; // 간접비는 경비 없음
        contractExpAmount = 0;

        orderMatPrice = parseFloat(row.cells[25]?.textContent.replace(/,/g, '')) || 0;
        orderMatAmount = parseFloat(row.cells[26]?.textContent.replace(/,/g, '')) || 0;
        orderLabPrice = parseFloat(row.cells[27]?.textContent.replace(/,/g, '')) || 0;
        orderLabAmount = parseFloat(row.cells[28]?.textContent.replace(/,/g, '')) || 0;
        orderExpPrice = 0;
        orderExpAmount = 0;
      } else {
        // 직접비 행: CSS 클래스로 읽기
        contractMatPrice = parseFloat(row.querySelector('.contract-material-price')?.textContent.replace(/,/g, '')) || 0;
        contractLabPrice = parseFloat(row.querySelector('.contract-labor-price')?.textContent.replace(/,/g, '')) || 0;
        contractExpPrice = parseFloat(row.querySelector('.contract-expense-price')?.value.replace(/,/g, '')) || 0;
        contractMatAmount = parseFloat(row.querySelector('.contract-material-amount')?.textContent.replace(/,/g, '')) || 0;
        contractLabAmount = parseFloat(row.querySelector('.contract-labor-amount')?.textContent.replace(/,/g, '')) || 0;
        contractExpAmount = parseFloat(row.querySelector('.contract-expense-amount')?.textContent.replace(/,/g, '')) || 0;

        orderMatPrice = parseFloat(row.querySelector('.order-material-price')?.textContent.replace(/,/g, '')) || 0;
        orderLabPrice = parseFloat(row.querySelector('.order-labor-price')?.textContent.replace(/,/g, '')) || 0;
        orderExpPrice = parseFloat(row.querySelector('.order-expense-price')?.value.replace(/,/g, '')) || 0;
        orderMatAmount = parseFloat(row.querySelector('.order-material-amount')?.textContent.replace(/,/g, '')) || 0;
        orderLabAmount = parseFloat(row.querySelector('.order-labor-amount')?.textContent.replace(/,/g, '')) || 0;
        orderExpAmount = parseFloat(row.querySelector('.order-expense-amount')?.textContent.replace(/,/g, '')) || 0;
      }

      contractMaterialPriceSum += contractMatPrice;
      contractLaborPriceSum += contractLabPrice;
      contractExpensePriceSum += contractExpPrice;
      contractMaterialAmountSum += contractMatAmount;
      contractLaborAmountSum += contractLabAmount;
      contractExpenseAmountSum += contractExpAmount;

      orderMaterialPriceSum += orderMatPrice;
      orderLaborPriceSum += orderLabPrice;
      orderExpensePriceSum += orderExpPrice;
      orderMaterialAmountSum += orderMatAmount;
      orderLaborAmountSum += orderLabAmount;
      orderExpenseAmountSum += orderExpAmount;

      // 수량 합산 (직접비만 해당, 간접비는 건너뜀)
      if (!isIndirectSubtotal) {
        const mValue =
          parseFloat(row.cells[10]?.textContent.replace(/,/g, '')) || 0;
        const sheetQuantity =
          parseFloat(row.cells[13]?.textContent.replace(/,/g, '')) || 0;
        const displayQuantity =
          parseFloat(row.cells[15]?.textContent.replace(/,/g, '')) || 0;

        mValueSum += mValue;
        sheetQuantitySum += sheetQuantity;
        displayQuantitySum += displayQuantity;
      }
    });

    // 합계 계산
    const contractTotalPriceSum =
      contractMaterialPriceSum +
      contractLaborPriceSum +
      contractExpensePriceSum;
    const contractTotalAmountSum =
      contractMaterialAmountSum +
      contractLaborAmountSum +
      contractExpenseAmountSum;
    const orderTotalPriceSum =
      orderMaterialPriceSum + orderLaborPriceSum + orderExpensePriceSum;
    const orderTotalAmountSum =
      orderMaterialAmountSum + orderLaborAmountSum + orderExpenseAmountSum;

    console.log(
      `  💰 계약도급 경비: 단가=${contractExpensePriceSum.toLocaleString()}, 금액=${contractExpenseAmountSum.toLocaleString()}`
    );
    console.log(
      `  💰 발주단가 경비: 단가=${orderExpensePriceSum.toLocaleString()}, 금액=${orderExpenseAmountSum.toLocaleString()}`
    );

    // 소계 행 업데이트
    const cells = subtotalRow.cells;

    // 수량 칸럼 업데이트
    if (cells[10])
      cells[10].textContent = Math.round(mValueSum).toLocaleString();
    if (cells[13])
      cells[13].textContent = Math.round(sheetQuantitySum).toLocaleString();
    if (cells[15]) cells[15].textContent = displayQuantitySum.toFixed(2);

    // 계약도급 (17번 셀부터 - 인덱스 16)
    if (cells[16])
      cells[16].textContent = contractMaterialPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[17])
      cells[17].textContent = contractMaterialAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[18])
      cells[18].textContent = contractLaborPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[19])
      cells[19].textContent = contractLaborAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[20])
      cells[20].textContent = contractExpensePriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[21])
      cells[21].textContent = contractExpenseAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[22])
      cells[22].textContent = contractTotalPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[23])
      cells[23].textContent = contractTotalAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // 발주단가 (25번 셀부터 - 인덱스 24, 24번은 비고)
    if (cells[25])
      cells[25].textContent = orderMaterialPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[26])
      cells[26].textContent = orderMaterialAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[27])
      cells[27].textContent = orderLaborPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[28])
      cells[28].textContent = orderLaborAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[29])
      cells[29].textContent = orderExpensePriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[30])
      cells[30].textContent = orderExpenseAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[31])
      cells[31].textContent = orderTotalPriceSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (cells[32])
      cells[32].textContent = orderTotalAmountSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  });

  // ✅ 총계 행 업데이트 (경비 포함)
  console.log('🔄 총계 행 업데이트 시작');

  // 총계 행 찾기 (초록색 배경, "총 계" 라벨)
  const grandTotalRow = document.querySelector(
    '.order-form-table tbody tr[style*="linear-gradient(135deg, #56ab2f"]'
  );

  if (grandTotalRow) {
    console.log('📊 총계 행 찾음');

    // 모든 소계 행에서 경비 합산
    let totalContractExpenseAmount = 0;
    let totalOrderExpenseAmount = 0;

    subtotalRows.forEach((subtotalRow) => {
      const label = subtotalRow.cells[2]?.textContent.trim();
      console.log(`  📝 소계 라벨: "${label}"`);

      // 계약도급 경비 금액
      const contractExpense =
        parseFloat(subtotalRow.cells[21]?.textContent.replace(/,/g, '')) || 0;
      // 발주단가 경비 금액
      const orderExpense =
        parseFloat(subtotalRow.cells[30]?.textContent.replace(/,/g, '')) || 0;

      totalContractExpenseAmount += contractExpense;
      totalOrderExpenseAmount += orderExpense;

      console.log(
        `  💰 경비 누적: 계약도급=${totalContractExpenseAmount.toLocaleString()}, 발주단가=${totalOrderExpenseAmount.toLocaleString()}`
      );
    });

    console.log(
      `  💰 총 경비: 계약도급=${totalContractExpenseAmount.toLocaleString()}, 발주단가=${totalOrderExpenseAmount.toLocaleString()}`
    );

    // 총계 행의 기존 자재비, 노무비 금액 읽기 (data 속성 우선, 없으면 textContent 파싱)
    const contractMaterialAmount = parseFloat(
      grandTotalRow.cells[17]?.dataset?.materialAmount ||
      grandTotalRow.cells[17]?.textContent.replace(/,/g, '')
    ) || 0;
    const contractLaborAmount = parseFloat(
      grandTotalRow.cells[19]?.dataset?.laborAmount ||
      grandTotalRow.cells[19]?.textContent.replace(/,/g, '')
    ) || 0;
    const orderMaterialAmount = parseFloat(
      grandTotalRow.cells[26]?.dataset?.materialAmount ||
      grandTotalRow.cells[26]?.textContent.replace(/,/g, '')
    ) || 0;
    const orderLaborAmount = parseFloat(
      grandTotalRow.cells[28]?.dataset?.laborAmount ||
      grandTotalRow.cells[28]?.textContent.replace(/,/g, '')
    ) || 0;

    // 단수정리 금액 읽기 (발주단가와 계약도급 모두)
    const roundingRowIndex = Array.from(
      document.querySelectorAll('.order-form-table tbody tr')
    ).findIndex((row) => row.cells[2]?.textContent.trim() === '단수정리');

    let roundingAmount = 0;
    let contractRoundingAmount = 0;
    if (roundingRowIndex !== -1) {
      const roundingRow = document.querySelectorAll('.order-form-table tbody tr')[roundingRowIndex];
      // data 속성에서 원본 값 읽기 (없으면 textContent 파싱)
      roundingAmount = parseFloat(
        roundingRow.cells[32]?.dataset?.orderRounding ||
        roundingRow.cells[32]?.textContent.replace(/,/g, '')
      ) || 0;
      contractRoundingAmount = parseFloat(
        roundingRow.cells[23]?.dataset?.contractRounding ||
        roundingRow.cells[23]?.textContent.replace(/,/g, '')
      ) || 0;
    }

    console.log(`  📐 단수정리 - 발주단가: ${roundingAmount.toLocaleString()}, 계약도급: ${contractRoundingAmount.toLocaleString()}`);

    // 총계 금액 재계산 (자재비 + 노무비 + 단수정리) - 경비 중복 제거, 고정소수점 계산
    const orderGrandTotal = Math.round(
      (orderMaterialAmount + orderLaborAmount + roundingAmount) * 100
    ) / 100;
    const contractGrandTotal = Math.round(
      (contractMaterialAmount + contractLaborAmount + contractRoundingAmount) * 100
    ) / 100;

    console.log(
      `  💵 총계 금액: 계약도급=${contractGrandTotal.toFixed(2)}, 발주단가=${orderGrandTotal.toFixed(2)}`
    );

    // 총계 행 업데이트
    // 계약도급 경비
    if (grandTotalRow.cells[21]) {
      grandTotalRow.cells[21].textContent = totalContractExpenseAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    // 계약도급 합계 금액
    if (grandTotalRow.cells[23]) {
      grandTotalRow.cells[23].textContent = contractGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // 발주단가 경비
    if (grandTotalRow.cells[30]) {
      grandTotalRow.cells[30].textContent = totalOrderExpenseAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    // 발주단가 합계 금액
    if (grandTotalRow.cells[32]) {
      grandTotalRow.cells[32].textContent = orderGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    console.log('✅ 총계 행 업데이트 완료');
  } else {
    console.log('❌ 총계 행을 찾을 수 없음');
  }

  // ❌ 단수정리 행 재계산 로직 제거됨
  // 이유: HTML에서 자재 타입별 경계를 구분할 수 없어 잘못된 합산 발생
  // 최초 계산이 올바르므로 그대로 유지
}

/**
 * 경비 입력 필드 이벤트 리스너 추가
 * 경비 단가 입력 시 자동으로 금액 및 합계 계산
 */
function attachExpenseInputListeners() {
  console.log('💰 경비 입력 이벤트 리스너 추가');

  // 모든 경비 입력 필드 선택
  const expenseInputs = document.querySelectorAll('.expense-input');

  expenseInputs.forEach((input) => {
    input.addEventListener('input', function () {
      // 천단위 콤마 포맷 적용
      formatNumberInput(this);

      const rowNumber = this.getAttribute('data-row');
      const isContract = this.classList.contains('contract-expense-price');

      // 입력값 가져오기 (콤마 제거)
      const expensePrice =
        parseFloat(this.dataset.numericValue || this.value.replace(/,/g, '')) ||
        0;

      // 해당 행 찾기
      const row = document.querySelector(`tr[data-row="${rowNumber}"]`);
      if (!row) return;

      // 경비 금액 계산 (경비는 단가 그대로 사용, 수량 곱하지 않음, 소수점 2자리)
      const expenseAmount = Math.round(expensePrice * 100) / 100;

      if (isContract) {
        // 계약도급 경비 금액 업데이트 (소수점 2자리)
        const expenseAmountCell = row.querySelector('.contract-expense-amount');
        if (expenseAmountCell) {
          expenseAmountCell.textContent = expenseAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        // 계약도급 자재비, 노무비 가져오기 (클래스 선택자 사용)
        const materialAmountCell = row.querySelector(
          '.contract-material-amount'
        );
        const laborAmountCell = row.querySelector('.contract-labor-amount');
        const materialAmount =
          parseFloat(materialAmountCell?.textContent.replace(/,/g, '')) || 0;
        const laborAmount =
          parseFloat(laborAmountCell?.textContent.replace(/,/g, '')) || 0;

        // 계약도급 합계 단가 계산 (소수점 2자리)
        const materialPriceCell = row.querySelector('.contract-material-price');
        const laborPriceCell = row.querySelector('.contract-labor-price');
        const materialPrice =
          parseFloat(materialPriceCell?.textContent.replace(/,/g, '')) || 0;
        const laborPrice =
          parseFloat(laborPriceCell?.textContent.replace(/,/g, '')) || 0;
        const totalPrice = Math.round((materialPrice + laborPrice + expensePrice) * 100) / 100;

        // 계약도급 합계 금액 계산 (소수점 2자리)
        const totalAmount = Math.round((materialAmount + laborAmount + expenseAmount) * 100) / 100;

        // 합계 셀 업데이트 (소수점 2자리 표시)
        const totalPriceCell = row.querySelector('.contract-total-price');
        const totalAmountCell = row.querySelector('.contract-total-amount');

        if (totalPriceCell)
          totalPriceCell.textContent = totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (totalAmountCell)
          totalAmountCell.textContent = totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      } else {
        // 발주단가 경비 금액 업데이트 (소수점 2자리)
        const expenseAmountCell = row.querySelector('.order-expense-amount');
        if (expenseAmountCell) {
          expenseAmountCell.textContent = expenseAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        }

        // 발주단가 자재비, 노무비 가져오기 (클래스 선택자 사용)
        const materialAmountCell = row.querySelector('.order-material-amount');
        const laborAmountCell = row.querySelector('.order-labor-amount');
        const materialAmount =
          parseFloat(materialAmountCell?.textContent.replace(/,/g, '')) || 0;
        const laborAmount =
          parseFloat(laborAmountCell?.textContent.replace(/,/g, '')) || 0;

        // 발주단가 합계 단가 계산 (소수점 2자리)
        const materialPriceCell = row.querySelector('.order-material-price');
        const laborPriceCell = row.querySelector('.order-labor-price');
        const materialPrice =
          parseFloat(materialPriceCell?.textContent.replace(/,/g, '')) || 0;
        const laborPrice =
          parseFloat(laborPriceCell?.textContent.replace(/,/g, '')) || 0;
        const totalPrice = Math.round((materialPrice + laborPrice + expensePrice) * 100) / 100;

        // 발주단가 합계 금액 계산 (소수점 2자리)
        const totalAmount = Math.round((materialAmount + laborAmount + expenseAmount) * 100) / 100;

        // 합계 셀 업데이트 (소수점 2자리 표시)
        const totalPriceCell = row.querySelector('.order-total-price');
        const totalAmountCell = row.querySelector('.order-total-amount');

        if (totalPriceCell)
          totalPriceCell.textContent = totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        if (totalAmountCell)
          totalAmountCell.textContent = totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
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
 * 조정비율 업데이트 debounce 타이머
 */
let updateContractPricesTimeout = null;

/**
 * 조정비율 변경 시 계약도급 단가 실시간 업데이트 (Debounced)
 * 입력 후 300ms 대기 후 실행하여 렉 방지
 */
function debounceUpdateContractPrices() {
  if (updateContractPricesTimeout) {
    clearTimeout(updateContractPricesTimeout);
  }
  updateContractPricesTimeout = setTimeout(() => {
    updateContractPricesRealtime();
  }, 300);
}

/**
 * 조정비율 변경 시 계약도급 단가 실시간 업데이트
 * 전체 재렌더링 없이 DOM의 숫자만 변경하여 포커스 유지
 */
function updateContractPricesRealtime() {
  const value = parseFloat(document.getElementById('contractRatioInput')?.value);
  const contractRatio = isNaN(value) ? 1.2 : value;
  console.log('💰 조정비율 실시간 업데이트:', contractRatio);

  // 모든 데이터 행 순회
  const allRows = document.querySelectorAll(
    '.order-form-table tbody tr[data-row]'
  );

  allRows.forEach((row) => {
    // 발주단가 금액 읽기
    const orderMatAmountCell = row.querySelector('.order-material-amount');
    const orderLabAmountCell = row.querySelector('.order-labor-amount');

    const orderMatAmount =
      parseFloat(orderMatAmountCell?.textContent.replace(/,/g, '')) || 0;
    const orderLabAmount =
      parseFloat(orderLabAmountCell?.textContent.replace(/,/g, '')) || 0;

    // 발주 단가 가져오기
    const orderMatPriceCell = row.querySelector('.order-material-price');
    const orderLabPriceCell = row.querySelector('.order-labor-price');
    const orderMatPrice = parseFloat(orderMatPriceCell?.textContent.replace(/,/g, '')) || 0;
    const orderLabPrice = parseFloat(orderLabPriceCell?.textContent.replace(/,/g, '')) || 0;

    // 수량 가져오기
    const quantityCell = row.querySelector('.quantity-cell');
    const quantity =
      parseFloat(quantityCell?.textContent.replace(/,/g, '')) || 0;

    // ✅ 계약도급 단가 계산 (발주 단가 × 조정비율, 소수점 2자리)
    const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
    const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;

    // ✅ 계약도급 금액 계산 (단가 × 수량, 소수점 2자리)
    const contractMatAmount = Math.round((contractMatPrice * quantity) * 100) / 100;
    const contractLabAmount = Math.round((contractLabPrice * quantity) * 100) / 100;

    // ✅ 계약도급 단가 업데이트 (소수점 2자리 표시)
    const contractMatPriceCell = row.querySelector('.contract-material-price');
    const contractLabPriceCell = row.querySelector('.contract-labor-price');
    if (contractMatPriceCell)
      contractMatPriceCell.textContent = contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractLabPriceCell)
      contractLabPriceCell.textContent = contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // 계약도급 금액 업데이트
    const contractMatAmountCell = row.querySelector(
      '.contract-material-amount'
    );
    const contractLabAmountCell = row.querySelector('.contract-labor-amount');
    if (contractMatAmountCell)
      contractMatAmountCell.textContent = contractMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractLabAmountCell)
      contractLabAmountCell.textContent = contractLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // 경비 가져오기 (경비는 단가 그대로)
    const expenseAmountCell = row.querySelector('.contract-expense-amount');
    const expensePrice =
      parseFloat(expenseAmountCell?.textContent.replace(/,/g, '')) || 0;

    // ✅ 합계 계산 (소수점 2자리)
    const totalPrice = Math.round((contractMatPrice + contractLabPrice) * 100) / 100;
    const totalAmount = Math.round((contractMatAmount + contractLabAmount + expensePrice) * 100) / 100;

    // ✅ 합계 업데이트 (소수점 2자리 표시)
    const totalPriceCell = row.querySelector('.contract-total-price');
    const totalAmountCell = row.querySelector('.contract-total-amount');
    if (totalPriceCell)
      totalPriceCell.textContent = totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (totalAmountCell)
      totalAmountCell.textContent = totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  });

  // 타입 요약 행 및 소계/총계 행도 업데이트 (보라색/회색/노란색/초록색 배경 행)
  const summaryRows = document.querySelectorAll(
    '.order-form-table tbody tr[style*="linear-gradient"]'
  );

  summaryRows.forEach((row) => {
    // ✅ 타입 요약 행인지 확인 (1-1, 1-2 같은 NO를 가짐)
    const noCell = row.cells[0];
    const noText = noCell?.textContent.trim();

    // ✅ 총계 행 특별 처리 (CSS 클래스 없이 cell index로 직접 접근)
    const labelCell = row.cells[1];
    const labelText = labelCell?.textContent.trim();

    if (labelText === '총 계') {
      console.log('🔄 총계 행 단가 업데이트');

      // 발주단가 단가 읽기 (cell index 사용)
      const orderMatPrice =
        parseFloat(row.cells[25]?.textContent.replace(/,/g, '')) || 0;
      const orderLabPrice =
        parseFloat(row.cells[27]?.textContent.replace(/,/g, '')) || 0;
      const orderExpPrice =
        parseFloat(row.cells[29]?.textContent.replace(/,/g, '')) || 0;

      // ✅ 계약도급 단가 계산 (발주단가 × 조정비율, 소수점 2자리)
      const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
      const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;
      const contractExpPrice = Math.round((orderExpPrice * contractRatio) * 100) / 100;
      const contractTotalPrice = Math.round(
        (contractMatPrice + contractLabPrice + contractExpPrice) * 100
      ) / 100;

      // ✅ 단가 업데이트 (cell index 사용, 소수점 2자리 표시)
      if (row.cells[16])
        row.cells[16].textContent = contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (row.cells[18])
        row.cells[18].textContent = contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (row.cells[20])
        row.cells[20].textContent = contractExpPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (row.cells[22])
        row.cells[22].textContent = contractTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

      console.log(
        `  ✅ 자재비 단가: ${orderMatPrice.toLocaleString()} → ${contractMatPrice.toLocaleString()}`
      );
      console.log(
        `  ✅ 노무비 단가: ${orderLabPrice.toLocaleString()} → ${contractLabPrice.toLocaleString()}`
      );
      console.log(
        `  ✅ 경비 단가: ${orderExpPrice.toLocaleString()} → ${contractExpPrice.toLocaleString()}`
      );
      console.log(
        `  ✅ 합계 단가: ${contractTotalPrice.toLocaleString()}`
      );

      return; // 다른 처리 건너뛰기
    }

    // 타입 요약 행은 "1-1", "1-2" 같은 형식
    if (noText && /^\d+-\d+$/.test(noText)) {
      console.log(`⏭️ 타입 요약 행 자재비/노무비 건너뛰기: ${noText}`);

      // ✅ 타입 요약 행은 합계만 업데이트 (자재비/노무비는 빈칸 유지)
      const orderTotalPriceCell = row.querySelector('.order-total-price');
      const orderTotalAmountCell = row.querySelector('.order-total-amount');

      const orderTotalPrice =
        parseFloat(orderTotalPriceCell?.textContent.replace(/,/g, '')) || 0;
      const orderTotalAmount =
        parseFloat(orderTotalAmountCell?.textContent.replace(/,/g, '')) || 0;

      const contractTotalPrice = Math.round((orderTotalPrice * contractRatio) * 100) / 100;
      const contractTotalAmount = Math.round((orderTotalAmount * contractRatio) * 100) / 100;

      const contractTotalPriceCell = row.querySelector('.contract-total-price');
      const contractTotalAmountCell = row.querySelector(
        '.contract-total-amount'
      );

      if (contractTotalPriceCell)
        contractTotalPriceCell.textContent =
          contractTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (contractTotalAmountCell)
        contractTotalAmountCell.textContent =
          contractTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

      return; // 자재비/노무비 업데이트는 건너뛰기
    }

    // ✅ 소계/총계 행만 자재비/노무비 업데이트
    // 발주단가 읽기
    const orderMatPriceCell = row.querySelector('.order-material-price');
    const orderLabPriceCell = row.querySelector('.order-labor-price');
    const orderMatAmountCell = row.querySelector('.order-material-amount');
    const orderLabAmountCell = row.querySelector('.order-labor-amount');

    const orderMatPrice =
      parseFloat(orderMatPriceCell?.textContent.replace(/,/g, '')) || 0;
    const orderLabPrice =
      parseFloat(orderLabPriceCell?.textContent.replace(/,/g, '')) || 0;
    const orderMatAmount =
      parseFloat(orderMatAmountCell?.textContent.replace(/,/g, '')) || 0;
    const orderLabAmount =
      parseFloat(orderLabAmountCell?.textContent.replace(/,/g, '')) || 0;

    // ✅ 계약도급 단가 계산 (발주단가 × 조정비율, 소수점 2자리)
    const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
    const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;

    // ✅ 계약도급 금액 계산 (발주금액 × 조정비율, 소수점 2자리)
    const contractMatAmount = Math.round((orderMatAmount * contractRatio) * 100) / 100;
    const contractLabAmount = Math.round((orderLabAmount * contractRatio) * 100) / 100;

    // ✅ 계약도급 단가 업데이트 (소수점 2자리)
    const contractMatPriceCell = row.querySelector('.contract-material-price');
    const contractLabPriceCell = row.querySelector('.contract-labor-price');
    if (contractMatPriceCell)
      contractMatPriceCell.textContent = contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractLabPriceCell)
      contractLabPriceCell.textContent = contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // ✅ 계약도급 금액 업데이트 (소수점 2자리)
    const contractMatAmountCell = row.querySelector(
      '.contract-material-amount'
    );
    const contractLabAmountCell = row.querySelector('.contract-labor-amount');
    if (contractMatAmountCell)
      contractMatAmountCell.textContent = contractMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractLabAmountCell)
      contractLabAmountCell.textContent = contractLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // ✅ 경비 처리 (조정비율 적용, 소수점 2자리)
    const orderExpenseAmountCell = row.querySelector('.order-expense-amount');
    const orderExpenseAmount =
      parseFloat(orderExpenseAmountCell?.textContent.replace(/,/g, '')) || 0;

    const contractExpenseAmount = Math.round((orderExpenseAmount * contractRatio) * 100) / 100;

    const contractExpenseAmountCell = row.querySelector('.contract-expense-amount');
    if (contractExpenseAmountCell)
      contractExpenseAmountCell.textContent = contractExpenseAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    // ✅ 합계 업데이트 (경비 포함, 소수점 2자리)
    const totalPrice = Math.round((contractMatPrice + contractLabPrice) * 100) / 100;
    const totalAmount = Math.round(
      (contractMatAmount + contractLabAmount + contractExpenseAmount) * 100
    ) / 100;

    const totalPriceCell = row.querySelector('.contract-total-price');
    const totalAmountCell = row.querySelector('.contract-total-amount');
    if (totalPriceCell)
      totalPriceCell.textContent = totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (totalAmountCell)
      totalAmountCell.textContent = totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  });

  console.log(
    `✅ 데이터 행 ${allRows.length}개, 타입 요약 행 ${summaryRows.length}개 업데이트 완료`
  );

  // ✅ 간접비 행 재계산 (노란색 배경 #fffacd)
  const indirectRows = document.querySelectorAll('.order-form-table tbody tr[style*="#fffacd"]');

  indirectRows.forEach(row => {
    // 면적 (15번 셀)
    const area = parseFloat(row.cells[15]?.textContent.replace(/,/g, '')) || 0;

    // 발주 단가 (25, 27번 셀)
    const orderMatPrice = parseFloat(row.cells[25]?.textContent.replace(/,/g, '')) || 0;
    const orderLabPrice = parseFloat(row.cells[27]?.textContent.replace(/,/g, '')) || 0;

    // ✅ 단가 우선 계산 (발주 단가 × 비율, 소수점 2자리)
    const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
    const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;

    // 금액 계산 (단가 × 면적, 소수점 2자리)
    const contractMatAmount = Math.round((contractMatPrice * area) * 100) / 100;
    const contractLabAmount = Math.round((contractLabPrice * area) * 100) / 100;

    // 계약도급 업데이트 (16-23번 셀, 소수점 2자리 표시)
    if (row.cells[16]) row.cells[16].textContent = contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (row.cells[17]) row.cells[17].textContent = contractMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (row.cells[18]) row.cells[18].textContent = contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (row.cells[19]) row.cells[19].textContent = contractLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const contractTotal = Math.round((contractMatPrice + contractLabPrice) * 100) / 100;
    const contractTotalAmount = Math.round((contractMatAmount + contractLabAmount) * 100) / 100;
    if (row.cells[22]) row.cells[22].textContent = contractTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (row.cells[23]) row.cells[23].textContent = contractTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  });

  console.log(`✅ 간접비 행 ${indirectRows.length}개 업데이트 완료`);

  // ✅ 소계 행 업데이트 (경비 포함)
  updateSubtotalRows();

  // ✅ 단수정리 행 업데이트 (회색 배경 #e0e0e0)
  const roundingRows = document.querySelectorAll('.order-form-table tbody tr[style*="linear-gradient(135deg, #e0e0e0"]');
  console.log(`🔄 단수정리 행 ${roundingRows.length}개 재계산 시작`);

  roundingRows.forEach((row, idx) => {
    const label = row.cells[2]?.textContent.trim();
    if (!label || !label.includes('단수정리')) {
      return;
    }

    // "단수정리" (합산 행)은 나중에 처리
    if (label === '단수정리') {
      console.log(`  ⏭️ 행 ${idx + 1}: "${label}" - 합산 행은 나중에 처리`);
      return;
    }

    console.log(`  🔍 행 ${idx + 1}: "${label}" - 타입별 단수정리 재계산 시작`);

    // 자재명 추출 (로그용)
    const materialName = label.match(/\(([^)]+)\)/)?.[1] || '';

    // ✅ data 속성에서 발주단가 단수정리 1m² 단가 읽기
    const orderMatPrice = parseFloat(row.dataset.materialRounding) || 0;
    const orderLabPrice = parseFloat(row.dataset.laborRounding) || 0;
    const orderExpPrice = parseFloat(row.dataset.expenseRounding) || 0;
    const orderTotalPrice = parseFloat(row.dataset.totalRounding) || 0;
    const area = parseFloat(row.dataset.area) || 0;

    // ✅ 계약도급 1m² 단가 = 발주단가 × 비율 (소수점 2자리)
    const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
    const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;
    const contractExpPrice = Math.round((orderExpPrice * contractRatio) * 100) / 100;
    const contractTotalPrice = Math.round((orderTotalPrice * contractRatio) * 100) / 100;

    // ✅ 계약도급 금액 = 1m² 단가 × 면적 (소수점 2자리)
    const contractMatAmount = Math.round((contractMatPrice * area) * 100) / 100;
    const contractLabAmount = Math.round((contractLabPrice * area) * 100) / 100;
    const contractExpAmount = Math.round((contractExpPrice * area) * 100) / 100;
    const contractTotalAmount = Math.round((contractTotalPrice * area) * 100) / 100;

    console.log(`  📐 ${materialName} 단수정리:`);
    console.log(`    자재비: ${orderMatPrice}원 × ${contractRatio} = ${contractMatPrice}원`);
    console.log(`    노무비: ${orderLabPrice}원 × ${contractRatio} = ${contractLabPrice}원`);
    console.log(`    합계: ${orderTotalPrice}원 × ${contractRatio} = ${contractTotalPrice}원`);

    // ✅ CSS 클래스로 계약도급 셀 업데이트
    const contractMatPriceCell = row.querySelector('.contract-material-price');
    const contractMatAmountCell = row.querySelector('.contract-material-amount');
    const contractLabPriceCell = row.querySelector('.contract-labor-price');
    const contractLabAmountCell = row.querySelector('.contract-labor-amount');
    const contractExpPriceCell = row.querySelector('.contract-expense-price');
    const contractExpAmountCell = row.querySelector('.contract-expense-amount');
    const contractTotalPriceCell = row.querySelector('.contract-total-price');
    const contractTotalAmountCell = row.querySelector('.contract-total-amount');

    if (contractMatPriceCell) contractMatPriceCell.textContent = contractMatPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractMatAmountCell) contractMatAmountCell.textContent = contractMatAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractLabPriceCell) contractLabPriceCell.textContent = contractLabPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractLabAmountCell) contractLabAmountCell.textContent = contractLabAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractExpPriceCell) contractExpPriceCell.textContent = contractExpPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractExpAmountCell) contractExpAmountCell.textContent = contractExpAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractTotalPriceCell) contractTotalPriceCell.textContent = contractTotalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (contractTotalAmountCell) contractTotalAmountCell.textContent = contractTotalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    console.log(`  ✅ ${label} 재계산 완료`);
  });

  console.log(`✅ 단수정리 행 ${roundingRows.length}개 업데이트 완료`);

  // ✅ 타입별 단수정리 합산 행 업데이트 (밝은 노란색 배경 #fff9c4, "단수정리" 라벨)
  const typeTotalRoundingRow = document.querySelector('.order-form-table tbody tr[style*="#fff9c4"]');

  if (typeTotalRoundingRow) {
    console.log('🔄 타입별 단수정리 합산 행 재계산 시작');

    // ✅ 개별 타입별 단수정리 행들의 값을 합산 (예: "단수정리 (스터드)", "단수정리 (석고보드 9.5T)")
    const typeRoundingRows = Array.from(roundingRows).filter(row => {
      const label = row.cells[2]?.textContent.trim();
      return label && label.includes('단수정리') && label !== '단수정리';
    });

    let orderRoundingSum = 0;
    let contractRoundingSum = 0;

    console.log(`  타입별 단수정리 행 개수: ${typeRoundingRows.length}`);

    typeRoundingRows.forEach(row => {
      const label = row.cells[2]?.textContent.trim();
      const orderRounding = parseFloat(row.cells[32]?.textContent.replace(/,/g, '')) || 0;
      const contractRounding = parseFloat(row.cells[23]?.textContent.replace(/,/g, '')) || 0;

      console.log(`  - ${label}: 발주단가=${orderRounding.toLocaleString()}, 계약도급=${contractRounding.toLocaleString()}`);

      orderRoundingSum += orderRounding;
      contractRoundingSum += contractRounding;
    });

    console.log(`  발주단가 단수정리 합산: ${orderRoundingSum.toLocaleString()}`);
    console.log(`  계약도급 단수정리 합산: ${contractRoundingSum.toLocaleString()}`);

    // 발주단가 단수정리 합산 업데이트 (32번 셀, 소수점 2자리)
    if (typeTotalRoundingRow.cells[32]) {
      typeTotalRoundingRow.cells[32].textContent = orderRoundingSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    // 계약도급 단수정리 합산 업데이트 (23번 셀, 소수점 2자리)
    if (typeTotalRoundingRow.cells[23]) {
      typeTotalRoundingRow.cells[23].textContent = contractRoundingSum.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    console.log('✅ 타입별 단수정리 합산 행 업데이트 완료');
  }

  // ✅ 총계 행 업데이트 (초록색 배경 #56ab2f) - 발주단가와 동일한 구조
  const grandTotalRow = document.querySelector('.order-form-table tbody tr[style*="linear-gradient(135deg, #56ab2f"]');
  if (grandTotalRow) {
    console.log('🔄 총계 행 재계산 시작 (소계 행들 합산 - 발주단가와 동일)');

    const allRows = Array.from(document.querySelectorAll('.order-form-table tbody tr'));

    // 1. "소계 (직접자재)" 행 찾기
    let directSubtotalRow = null;
    let indirectSubtotalRow = null;

    for (const row of allRows) {
      const label = row.cells[2]?.textContent.trim();
      if (label === '소계 (직접자재)') {
        directSubtotalRow = row;
      } else if (label === '소계 (간접비)') {
        indirectSubtotalRow = row;
      }
    }

    if (!directSubtotalRow || !indirectSubtotalRow) {
      console.log('  ⚠️ 소계 행을 찾을 수 없음');
      return;
    }

    // 2. ✅ 계약도급 총계만 재계산 (소계 행들 합산)
    // 계약도급: 17번 셀(자재비), 19번 셀(노무비)
    const contractDirectMat = parseFloat(directSubtotalRow.cells[17]?.textContent.replace(/,/g, '')) || 0;
    const contractDirectLab = parseFloat(directSubtotalRow.cells[19]?.textContent.replace(/,/g, '')) || 0;
    const contractIndirectMat = parseFloat(indirectSubtotalRow.cells[17]?.textContent.replace(/,/g, '')) || 0;
    const contractIndirectLab = parseFloat(indirectSubtotalRow.cells[19]?.textContent.replace(/,/g, '')) || 0;

    const contractMaterialTotal = contractDirectMat + contractIndirectMat;
    const contractLaborTotal = contractDirectLab + contractIndirectLab;

    // 3. ✅ 계약도급 단수정리만 합산
    let contractRoundingSum = 0;

    for (const row of allRows) {
      const label = row.cells[2]?.textContent.trim() || '';

      // 단수정리 행만 합산
      if (label.includes('단수정리') && (row.getAttribute('style') || '').includes('#e0e0e0')) {
        const contractRounding = parseFloat(row.cells[23]?.textContent.replace(/,/g, '')) || 0;
        contractRoundingSum += contractRounding;

        console.log(`  단수정리 발견: ${label} - 계약: ${contractRounding.toLocaleString()}`);
      }
    }

    // 4. ✅ 계약도급 총계 = 소계합 + 단수정리합
    const contractGrandTotal = contractMaterialTotal + contractLaborTotal + contractRoundingSum;

    console.log(`  💰 계약도급 - 자재: ${contractMaterialTotal.toLocaleString()}, 노무: ${contractLaborTotal.toLocaleString()}, 단수정리: ${contractRoundingSum.toLocaleString()}`);
    console.log(`  💰 계약도급 총계: ${contractGrandTotal.toLocaleString()}`);

    // 6. ✅ 총계 행 업데이트 (계약도급만, 발주단가는 초기값 유지)
    // 계약도급 (17, 19, 21, 23번 셀)
    if (grandTotalRow.cells[17]) grandTotalRow.cells[17].textContent = contractMaterialTotal.toLocaleString();
    if (grandTotalRow.cells[19]) grandTotalRow.cells[19].textContent = contractLaborTotal.toLocaleString();
    if (grandTotalRow.cells[21]) grandTotalRow.cells[21].textContent = '0'; // 경비는 0
    if (grandTotalRow.cells[23]) grandTotalRow.cells[23].textContent = contractGrandTotal.toLocaleString();

    console.log('✅ 총계 행 업데이트 완료 (발주단가는 초기값 유지)');
  }
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
  const siteNameInput = document.querySelector(
    '#orderFormContainer input[placeholder="현장명을 입력하세요"]'
  );
  return siteNameInput ? siteNameInput.value : '';
}

/**
 * 견적서 총액 업데이트
 */
function updateEstimateTotalAmount() {
  const grandTotal = calculateEstimateGrandTotal();
  // 1000단위 절사 (버림)
  const roundedTotal = Math.floor(grandTotal / 1000) * 1000;

  const amountElement = document.getElementById('estimateTotalAmount');
  const numberElement = document.querySelector('.amount-number');

  if (amountElement && numberElement) {
    amountElement.textContent = `일금 ${numberToKorean(roundedTotal)} 원정`;
    numberElement.textContent = `₩ ${roundedTotal.toLocaleString()}`;
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
    { no: '', name: 'I. 기타공사' },
  ];

  directItems.forEach((item) => {
    // D-1, E-1, F-1 등 하위 항목은 들여쓰기 적용
    const indentClass =
      item.no && item.no.includes('-') ? 'indent-2' : 'indent-1';

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
    } else if (
      item.name.startsWith('D.') ||
      item.name.startsWith('E.') ||
      item.name.startsWith('F.')
    ) {
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
  const toggleBtn = document.querySelector(
    `.toggle-btn[onclick*="${groupId}"]`
  );

  if (!childRows.length || !toggleBtn) return;

  // 현재 상태 확인 (첫 번째 자식 행의 display 속성으로 판단)
  const isVisible = childRows[0].style.display !== 'none';

  // 모든 자식 행 토글
  childRows.forEach((row) => {
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

  calculationResults.forEach((result) => {
    materialCost += result.materialCost;
    laborCost += result.laborCost;
  });

  return {
    materialCost,
    laborCost,
    totalCost: materialCost + laborCost,
  };
}

/**
 * 간접공사비 행 생성
 */
function generateIndirectCostRows() {
  let html = '';

  html += `
        <tr>
            <td></td>
            <td class="left-align" style="font-weight: bold;">간접공사비</td>
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
    '기업이윤 (직접공사비기준)',
  ];

  indirectItems.forEach((itemName, index) => {
    html += `
            <tr>
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

  // A. 인테리어 설계비 섹션
  html += `
        <tr>
            <td></td>
            <td class="left-align" style="font-weight: bold;">A. 인테리어 설계비</td>
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
        <tr>
            <td></td>
            <td class="left-align indent-1">디자인 제안비</td>
            <td></td>
            <td>식</td>
            <td class="number-cell">1.00</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td></td>
        </tr>
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">A. 인테리어 설계비 SUB TOTAL</td>
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

  // B. 가설 및 공사준비 작업 섹션
  html += `
        <tr>
            <td></td>
            <td class="left-align" style="font-weight: bold;">B. 가설 및 공사준비 작업</td>
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

  const tempWorkItems = [
    { name: '현장보양', spec: '' },
    { name: '먹매김', spec: '' },
    { name: '내부수평비계', spec: '' },
    { name: '자재 소운반', spec: '' },
    { name: '자재 대운반', spec: '' },
    { name: '현장 정리정돈', spec: '' },
    { name: '방염', spec: '' },
    { name: '폐기물 처리비', spec: '가설' },
    { name: '폐기물 소운반', spec: '' },
    { name: '고소작업대', spec: '보이드 구간' },
    { name: '준공청소', spec: '' },
    { name: '마감코팅', spec: '' },
  ];

  tempWorkItems.forEach((item) => {
    html += `
        <tr>
            <td></td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>M2</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td></td>
        </tr>
    `;
  });

  html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">B. 가설 및 공사준비 작업 SUB TOTAL</td>
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

  // C. 철거공사 섹션
  html += `
        <tr>
            <td></td>
            <td class="left-align" style="font-weight: bold;">C. 철거공사</td>
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

  const demolitionItems = [
    { name: '바닥철거', spec: '' },
    { name: '벽체철거 + 글라스월 + 창호 포함', spec: '골조 및 하지 +유리 + 마감 +도어' },
    { name: '천정철거', spec: '' },
    { name: '폐기물 소운반 및 집기류', spec: '' },
    { name: '폐기물 처리비', spec: '' },
    { name: '장비사용료', spec: '' },
  ];

  demolitionItems.forEach((item) => {
    html += `
        <tr>
            <td></td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>M2</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // C. 철거공사 SUB TOTAL
  html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">C. 철거공사 SUB TOTAL</td>
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

  // D. 인테리어공사 섹션
  html += `
        <tr>
            <td></td>
            <td class="left-align" style="font-weight: bold;">D. 인테리어공사</td>
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
        <tr>
            <td>D-1</td>
            <td class="left-align" style="font-weight: bold;">바닥공사</td>
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

  const floorWorkItems = [
    { no: '-', name: '기존바닥 보양', spec: '', unit: 'M2' },
    { no: '', name: '기존 OA플로워 보수 및 깔기 (시스템박스이설)', spec: '전체면적의 *20%', unit: 'M2' },
    { no: '', name: '기존 OA플로워 레벨조절', spec: '', unit: 'M2' },
    { no: '-', name: '치장 카펫', spec: '', unit: 'M2' },
    { no: '', name: '치장 카펫 걷기', spec: '', unit: 'M2' },
    { no: '-', name: '지정 LVT', spec: '', unit: 'M2' },
    { no: '', name: '지정 LVT 걷기', spec: '', unit: 'M2' },
    { no: '-', name: '미화실 히팅판넬', spec: '일체형 판넬', unit: 'M2' },
    { no: '-', name: '하지합판', spec: '', unit: 'M2' },
    { no: '', name: '하지합판 깔기', spec: '', unit: 'M2' },
    { no: '-', name: 'WOOD FLOORING', spec: '', unit: 'M2' },
    { no: '', name: 'WOOD FLOORING 깔기', spec: '', unit: 'M2' },
    { no: '-', name: '재료분리대', spec: '', unit: 'M' },
    { no: '-', name: '화장실 바닥방수', spec: '액방 + 우레탄방수', unit: '개소' },
    { no: '-', name: '붙임몰탈', spec: '', unit: 'M2' },
    { no: '-', name: '지정바닥타일', spec: '600*1200', unit: 'M2' },
    { no: '-', name: '지정바닥타일', spec: '600*1200', unit: 'M2' },
    { no: '-', name: '지정바닥타일', spec: '600*600', unit: 'M2' },
    { no: '', name: '지정바닥타일 깔기', spec: '', unit: 'M/D' },
    { no: '', name: '지정바닥타일 매지넣기', spec: '', unit: 'M/D' },
    { no: '-', name: 'FLOOR HINGE 타공 및 보강', spec: '', unit: 'EA' },
  ];

  floorWorkItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 바닥공사 SUB TOTAL
  html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">바닥공사 SUB TOTAL</td>
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

  // D-2 벽체공사
  html += `
        <tr>
            <td>D-2</td>
            <td class="left-align" style="font-weight: bold;">벽체공사</td>
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

  const wallWorkItems = [
    { no: '', name: 'DRY WALL-3', spec: 'STUD 100 + 단열재 + SGB 9.5T*2P(양면) + 차음시트* 1P(양면)', unit: 'M2' },
    { no: '', name: 'POCKET WALL', spec: 'PIPE 30*30(양면) + GB 9.5T*2P(양면)', unit: 'M2' },
    { no: '', name: 'END FRAME', spec: 'W:150', unit: 'EA' },
    { no: '', name: 'FCU 경량구', spec: '', unit: 'EA' },
    { no: '', name: '각파이프 이중구조틀', spec: '50*50', unit: 'M2' },
    { no: '', name: '매지 몰딩', spec: '', unit: 'M' },
    { no: '', name: 'STUD', spec: '65T (단면)', unit: 'M2' },
    { no: '', name: 'STUD', spec: '65T (양면)', unit: 'M2' },
    { no: '', name: 'GLASS WOOL', spec: '24K50T', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 시공', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '합판보강', spec: '9T*1PLY', unit: 'M2' },
  ];

  wallWorkItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 벽체공사 SUB TOTAL
  html += `
        <tr class="subtotal-row">
            <td></td>
            <td class="left-align">벽체공사 SUB TOTAL</td>
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

  // D-3 벽체마감공사
  html += `
        <tr>
            <td>D-3</td>
            <td class="left-align" style="font-weight: bold;">벽체마감공사</td>
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
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[출입구-2개소]</td>
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

  const wallFinishItems1 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '구조철판 마감', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'STL FRAME+도장', spec: '20*150', unit: 'M' },
    { no: '', name: 'STL FRAME+도장', spec: '20*150', unit: 'M' },
    { no: '', name: 'STL FRAME+도장', spec: '20*150', unit: 'M' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems1.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[전견실]</td>
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

  const wallFinishItems2 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems2.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [자니] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[자니]</td>
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

  const wallFinishItems3 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems3.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [레지나] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[레지나]</td>
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

  const wallFinishItems4 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems4.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [제임스] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[제임스]</td>
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

  const wallFinishItems5 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems5.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [준] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[준]</td>
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

  const wallFinishItems6 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems6.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [PHONE RM-12개소] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[PHONE RM-12개소]</td>
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

  const wallFinishItems7 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems7.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [OA / CANTEEN] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[OA / CANTEEN]</td>
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

  const wallFinishItems8 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems8.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [OPEN OFFICE -1] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[OPEN OFFICE -1]</td>
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

  const wallFinishItems9 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems9.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [창고] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[창고]</td>
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

  const wallFinishItems10 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems10.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-1] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-1]</td>
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

  const wallFinishItems11 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems11.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-2] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-2]</td>
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

  const wallFinishItems12 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems12.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [LOCKER] 서브섹션
  html += `
        <tr>
            <td>*</td>
            <td class="left-align indent-1" style="font-weight: bold;">[LOCKER]</td>
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

  const wallFinishItems13 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems13.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-3] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-3]</td>
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

  const wallFinishItems14 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems14.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [OA-1] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[OA-1]</td>
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

  const wallFinishItems15 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems15.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [서버룸] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[서버룸]</td>
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

  const wallFinishItems16 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems16.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-4] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-4]</td>
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

  const wallFinishItems17 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems17.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 16인] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 16인]</td>
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

  const wallFinishItems18 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems18.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-5] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-5]</td>
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

  const wallFinishItems19 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems19.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-6] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-6]</td>
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

  const wallFinishItems20 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems20.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [OA-2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[OA-2]</td>
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

  const wallFinishItems21 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems21.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [본부실장실-1] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[본부실장실-1]</td>
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

  const wallFinishItems22 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems22.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [본부실장실-2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[본부실장실-2]</td>
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

  const wallFinishItems23 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems23.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실-10인-1] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실-10인-1]</td>
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

  const wallFinishItems24 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems24.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [본부실장실-3] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[본부실장실-3]</td>
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

  const wallFinishItems25 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems25.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실-10인-2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실-10인-2]</td>
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

  const wallFinishItems26 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems26.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-7] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-7]</td>
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

  const wallFinishItems27 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems27.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [미화대기실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[미화대기실]</td>
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

  const wallFinishItems28 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems28.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CEO - RECEPTION] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CEO - RECEPTION]</td>
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

  const wallFinishItems29 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'SPECIAL PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems29.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CEO -STO] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CEO -STO]</td>
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

  const wallFinishItems30 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems30.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CEO -1,2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CEO -1,2]</td>
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

  const wallFinishItems31 = [
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems31.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [화장실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[화장실]</td>
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

  const wallFinishItems32 = [
    { no: '', name: 'CRC보드 취부', spec: '9.5T*1PLY', unit: 'M2' },
    { no: '', name: '화장실 벽체방수', spec: '액방 + 우레탄방수', unit: 'M2' },
    { no: '', name: '붙임몰탈', spec: '', unit: 'M2' },
    { no: '', name: '지정벽체타일', spec: '', unit: 'M2' },
    { no: '', name: '지정벽체타일 취부', spec: '', unit: 'M2' },
    { no: '', name: '지정벽체타일 매지넣기', spec: '', unit: 'M2' },
    { no: '', name: '세면대구조틀 및 하지취부', spec: '', unit: 'M' },
    { no: '', name: '세면대상판', spec: '', unit: 'M' },
    { no: '', name: '젠다이구조틀 및 하지취부', spec: '', unit: 'M' },
    { no: '', name: '젠다이상판', spec: '', unit: 'M' },
    { no: '', name: '은경구조틀 및 하지취부', spec: '', unit: '개소' },
    { no: '', name: '은경', spec: '', unit: 'M' },
    { no: '', name: '은경몰딩', spec: '', unit: 'M' },
  ];

  wallFinishItems32.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CEO -대표 대회의실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CEO -대표 대회의실]</td>
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

  const wallFinishItems33 = [
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems33.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [전략기획팀] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[전략기획팀]</td>
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

  const wallFinishItems34 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems34.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [전략기획팀] - 회의실-8인 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[전략기획팀] - 회의실-8인</td>
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

  const wallFinishItems35 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems35.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CFO] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CFO]</td>
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

  const wallFinishItems36 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems36.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [오스카] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[오스카]</td>
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

  const wallFinishItems37 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems37.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [로고] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[로고]</td>
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

  const wallFinishItems38 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems38.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 16인-1] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 16인-1]</td>
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

  const wallFinishItems39 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems39.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-9] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-9]</td>
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

  const wallFinishItems40 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems40.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [OA-3] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[OA-3]</td>
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

  const wallFinishItems41 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems41.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-10] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-10]</td>
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

  const wallFinishItems42 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems42.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CANTEEN] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CANTEEN]</td>
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

  const wallFinishItems43 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems43.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [서버룸] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[서버룸]</td>
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

  const wallFinishItems44 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems44.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [자금 금고] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[자금 금고]</td>
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

  const wallFinishItems45 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems45.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-11] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-11]</td>
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

  const wallFinishItems46 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems46.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CANTEEN] 서브섹션 (25.png)
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CANTEEN]</td>
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

  const wallFinishItems47 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems47.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 16인-2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 16인-2]</td>
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

  const wallFinishItems48 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems48.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-12] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-12]</td>
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

  const wallFinishItems49 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems49.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-13] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-13]</td>
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

  const wallFinishItems50 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems50.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [창고] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[창고]</td>
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

  const wallFinishItems51 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems51.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-14] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-14]</td>
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

  const wallFinishItems52 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems52.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [OA-3] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[OA-3]</td>
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

  const wallFinishItems53 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems53.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-15] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-15]</td>
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

  const wallFinishItems54 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems54.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [창고] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[창고]</td>
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

  const wallFinishItems55 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems55.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실 8인-16] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실 8인-16]</td>
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

  const wallFinishItems56 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems56.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [사이먼] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[사이먼]</td>
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

  const wallFinishItems57 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems57.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [코난] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[코난]</td>
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

  const wallFinishItems58 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems58.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [디렉터룸-1] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[디렉터룸-1]</td>
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

  const wallFinishItems59 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems59.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [디렉터룸-2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[디렉터룸-2]</td>
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

  const wallFinishItems60 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems60.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [윤리경영] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[윤리경영]</td>
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

  const wallFinishItems61 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems61.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [디렉터룸-3] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[디렉터룸-3]</td>
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

  const wallFinishItems62 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems62.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [디렉터룸-4] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[디렉터룸-4]</td>
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

  const wallFinishItems63 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems63.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [공통공사] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[공통공사]</td>
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

  const wallFinishItems64 = [
    { no: '', name: '신규벽체 도장', spec: 'ALL PUTTY 포함', unit: 'M2' },
    { no: '', name: '기존벽체 재도장', spec: '전체면적의 *60%', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
    { no: '', name: 'FCU 재도장', spec: '전체면적의 *50%', unit: 'M2' },
  ];

  wallFinishItems64.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 벽체마감공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="font-weight: bold;">벽체마감공사 SUB TOTAL</td>
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

  // [D-4 유리벽체공사] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">D-4 유리벽체공사</td>
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

  const glassWallItems = [
    { no: '', name: 'STL FRAME', spec: 'ㅁ50*150', unit: 'M' },
    { no: '', name: 'STL FRAME PAINT', spec: '', unit: 'M' },
    { no: '', name: 'GLASS', spec: 'T:10', unit: 'M2' },
    { no: '', name: 'FROST SHEET', spec: '', unit: 'M2' },
    { no: '', name: 'TEMPERED GLASS 상부 보강', spec: 'ㅁ50*50', unit: 'M' },
  ];

  glassWallItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 유리벽체공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="font-weight: bold;">유리벽체공사 SUB TOTAL</td>
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

  // [D-5 창호 및 하드웨어 공사] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">D-5 창호 및 하드웨어 공사</td>
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

  const windowHardwareItems = [
    { no: '', name: 'GLASS DOOR', spec: '900*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR - >가마찌도어', spec: '850*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR - >가마찌도어', spec: '850*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR - >가마찌도어', spec: '850*2600', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '2000*2400', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '3740*2600', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '4530*2600', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '2000*2600', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & FRAME', spec: '960*2600', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & FRAME', spec: '960*2600', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & FRAME', spec: '960*2600', unit: 'EA' },
    { no: '', name: 'WOOD SLIDING DOOR & FRAME', spec: '950*2600', unit: 'EA' },
    { no: '', name: 'WOOD SLIDING DOOR & FRAME', spec: '950*2600', unit: 'EA' },
    { no: '', name: 'WOOD SLIDING DOOR & FRAME', spec: '950*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & FRAME + H/W포함', spec: '1650*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & FRAME + H/W포함', spec: '1650*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & FRAME + H/W포함', spec: '1650*2600', unit: 'EA' },
  ];

  windowHardwareItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [*HARD WARE*] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">*HARD WARE*</td>
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

  const hardwareItems = [
    { no: '', name: 'GLASS DOOR & H/W', spec: '', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & H/W', spec: '가마찌도어', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & H/W', spec: '편개', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & H/W', spec: '양개', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & H/W', spec: '', unit: 'EA' },
    { no: '', name: 'SLIDING DOOR & H/W', spec: '', unit: 'EA' },
  ];

  hardwareItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 창호 및 하드웨어 공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="font-weight: bold;">창호 및 하드웨어 공사 SUB TOTAL</td>
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

  // [D-6 천정공사] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">D-6 천정공사</td>
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

  const ceilingItems = [
    { no: '', name: '기존 천정 보수 및 커튼박스몰딩도장', spec: '', unit: 'M2' },
    { no: '', name: '**기커튼박스재사용**', spec: '', unit: '' },
  ];

  ceilingItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 천정공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="font-weight: bold;">천정공사 SUB TOTAL</td>
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

  // [D-7 천정마감공사] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">D-7 천정마감공사</td>
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

  // [ENT-1.2] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[ENT-1.2]</td>
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

  const ent12Items = [
    { no: '', name: '각파이프구조틀', spec: '', unit: 'M2' },
    { no: '', name: '합판보강', spec: '', unit: 'M2' },
    { no: '', name: '합판보강', spec: '', unit: 'M2' },
    { no: '', name: '합판보강', spec: '', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '구조철판 마감', spec: '', unit: 'M2' },
    { no: '', name: '간접박스', spec: 'STL 50*50*50', unit: 'M' },
    { no: '', name: '간접박스 도장', spec: 'STL 50*50*50', unit: 'M' },
    { no: '', name: '구조철판 JOINT MOULDING', spec: '', unit: 'M' },
  ];

  ent12Items.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [PHONE RM.-1~12] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[PHONE RM.-1~12]</td>
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

  const phoneRmItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*1PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*1PLY', unit: 'M2' },
    { no: '', name: '다노라인', spec: '', unit: 'M2' },
    { no: '', name: '다노라인 취부', spec: '', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
  ];

  phoneRmItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실10인실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실10인실]</td>
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

  const meeting10Items = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
  ];

  meeting10Items.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [회의실8인실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[회의실8인실]</td>
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

  const meeting8Items = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  meeting8Items.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [미화실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[미화실]</td>
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

  const cleaningRoomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '마이텍스', spec: '', unit: 'M2' },
    { no: '', name: '마이텍스취부', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
  ];

  cleaningRoomItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [CORRIDOR] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CORRIDOR]</td>
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

  const corridorItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: 'JOINT MOULDING', spec: '', unit: 'M' },
    { no: '', name: 'PAINT (부분퍼티포함)', spec: '', unit: 'M2' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
  ];

  corridorItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [[CEO-ZONE]] 섹션 헤더
  html += `
    <tr>
        <td></td>
        <td class="left-align" style="font-weight: bold;">[[CEO-ZONE]]</td>
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

  // [CEO 대기실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[CEO 대기실]</td>
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

  const ceoWaitingRoomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '라인디퓨져', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '라인디퓨져 취부', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  ceoWaitingRoomItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [ROOM] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[ROOM]</td>
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

  const roomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '라인디퓨져', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '라인디퓨져 취부', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '팬덴트 타공 및 보강', spec: '', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  roomItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [STO] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[STO]</td>
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

  const stoItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  stoItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [화장실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[화장실]</td>
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

  const bathroomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  bathroomItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [대표회의실] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[대표회의실]</td>
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

  const ceoConferenceRoomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 200*100*50', unit: 'M' },
    { no: '', name: '간접박스', spec: 'STL 200*100*200', unit: 'M' },
    { no: '', name: '간접박스 도장', spec: 'STL 200*100*200', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M2' },
    { no: '', name: '라인디퓨져', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '라인디퓨져 취부', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  ceoConferenceRoomItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // [[전락기획팀-ZONE]] 서브섹션
  html += `
    <tr>
        <td>*</td>
        <td class="left-align indent-1" style="font-weight: bold;">[[전락기획팀-ZONE]]</td>
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

  const strategyPlanningZoneItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  strategyPlanningZoneItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 천정마감공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">천정마감공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // D-8 조명기구공사
  html += `
    <tr>
        <td>D-8</td>
        <td class="left-align" style="font-weight: bold;">조명기구공사</td>
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

  const lightingItems = [
    { no: '', name: 'LT-01', spec: '', unit: 'EA' },
    { no: '', name: 'LT-01-1', spec: '', unit: 'EA' },
    { no: '', name: 'LT-02', spec: '', unit: 'EA' },
    { no: '', name: 'LT-03', spec: '', unit: 'M' },
    { no: '', name: 'LT-04', spec: '', unit: 'M' },
    { no: '', name: 'PD-01', spec: '', unit: 'M' },
    { no: '', name: 'PD-05', spec: '', unit: 'EA' },
    { no: '', name: 'IL-01', spec: '', unit: 'M' },
    { no: '', name: '기존조명 보완', spec: '', unit: 'LOT' },
    { no: '', name: 'STAND LIGHT', spec: 'PHONE RM', unit: 'EA' },
  ];

  lightingItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 조명기구공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">조명기구공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // D-9 블라인드공사
  html += `
    <tr>
        <td>D-9</td>
        <td class="left-align" style="font-weight: bold;">블라인드공사</td>
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

  const blindItems = [
    { no: '', name: '기존 블라인드 보수 및 수정', spec: '', unit: 'EA' },
    { no: '', name: '지정 블라인드 / 시공', spec: '', unit: 'M2' },
  ];

  blindItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 블라인드공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">블라인드공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // D-10 실내싸인공사
  html += `
    <tr>
        <td>D-10</td>
        <td class="left-align" style="font-weight: bold;">실내싸인공사</td>
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

  const interiorSignItems = [
    { no: '', name: 'MAIN ENT SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'ROOM SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'PICTOGRAM SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'EVACUATION INFORMATION SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'GRAPHICS SHEET', spec: '', unit: 'LOT' },
    { no: '', name: 'LOBOR COST', spec: '', unit: 'LOT' },
    { no: '', name: '실내싸인보완작업', spec: '', unit: 'LOT' },
  ];

  interiorSignItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 실내싸인공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">실내싸인공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // E. 기계설비공사
  html += `
    <tr>
        <td></td>
        <td class="left-align" style="font-weight: bold;">E. 기계설비공사</td>
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

  // E-1 공조 및 환기덕트 공사
  html += `
    <tr>
        <td>E-1</td>
        <td class="left-align" style="font-weight: bold;">공조 및 환기덕트 공사</td>
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

  const airConditioningItems = [
    { no: '', name: '덕트제작 및 설치', spec: '0.5T', unit: 'M2' },
    { no: '', name: '트랜스퍼덕트(내부 흡음재설치)', spec: '', unit: 'EA' },
    { no: '', name: '원형디퓨져 신설', spec: 'ND200', unit: 'EA' },
    { no: '', name: '보온플렉시블덕트', spec: '200mm', unit: 'M' },
    { no: '', name: '잡자재비', spec: '', unit: '식' },
    { no: '', name: '노무비', spec: '덕트공', unit: '인' },
    { no: '', name: '철거비', spec: '', unit: '식' },
    { no: '', name: '공구손료', spec: '', unit: '식' },
  ];

  airConditioningItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 공조 및 환기덕트 공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">공조 및 환기덕트 공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // E-2 위생설비 공사
  html += `
    <tr>
        <td>E-2</td>
        <td class="left-align" style="font-weight: bold;">위생설비 공사</td>
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

  const sanitaryItems = [
    { no: '', name: '양변기 외 휴지걸이 셋트', spec: '', unit: 'SET' },
    { no: '', name: '세면기 셋트', spec: '', unit: 'SET' },
    { no: '', name: '저탕식 전기온수기', spec: '15리터', unit: 'EA' },
    { no: '', name: '싱크드레인펌프', spec: 'PD53', unit: 'EA' },
    { no: '', name: '일반배관용 스테인리스 강관', spec: 'K-TYPE, D15', unit: 'M' },
    { no: '', name: '일반배관용 스테인리스 강관', spec: 'K-TYPE, D25', unit: 'M' },
    { no: '', name: '관부속(SR)', spec: '', unit: '식' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '관보온(EPDM+메직)', spec: '13TxD15', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '13TxD25', unit: 'M' },
    { no: '', name: '볼 밸브(STS)', spec: '10kg, D15', unit: 'EA' },
    { no: '', name: '볼 밸브(STS)', spec: '10kg, D25', unit: 'EA' },
    { no: '', name: '각압 밸브', spec: '냉온수 난사, 10kg, D15', unit: 'EA' },
    { no: '', name: '원격검침기', spec: 'D25', unit: 'EA' },
    { no: '', name: '배관배선', spec: '', unit: '식' },
    { no: '', name: '프로그램 업그레이드', spec: '', unit: '식' },
    { no: '', name: '일반용 경질염화비닐관', spec: 'PVC관(VG1,DRF) D50', unit: 'M' },
    { no: '', name: '일반용 경질염화비닐관', spec: 'PVC관(VG1,DRF) D100', unit: 'M' },
    { no: '', name: '관부속(DRF)', spec: '', unit: '식' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '관보온(EPDM+메직)', spec: '13TxD100', unit: 'M' },
    { no: '', name: '급수차단밸브', spec: '', unit: 'EA' },
    { no: '', name: '누수탐지설비', spec: '', unit: 'EA' },
    { no: '', name: 'STS판', spec: '', unit: 'EA' },
    { no: '', name: '실링팬', spec: '', unit: 'EA' },
    { no: '', name: '스파이럴덕트', spec: 'D150', unit: 'EA' },
    { no: '', name: '스파이럴덕트 부속류', spec: '', unit: '식' },
    { no: '', name: '벽체 코어링', spec: 'D150', unit: '개소' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '잡자재비', spec: '', unit: '식' },
    { no: '', name: '노무비', spec: '배관공', unit: '인' },
    { no: '', name: '노무비', spec: '보통인부', unit: '인' },
    { no: '', name: '공구손료', spec: '', unit: '식' },
  ];

  sanitaryItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 위생설비 공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">위생설비 공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // E-3 기계 소화설비 공사
  html += `
    <tr>
        <td>E-3</td>
        <td class="left-align" style="font-weight: bold;">기계 소화설비 공사</td>
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

  const fireExtinguishingItems = [
    { no: '', name: '배관용 탄소강관', spec: 'D25', unit: 'M' },
    { no: '', name: '배관용 탄소강관', spec: 'D32', unit: 'M' },
    { no: '', name: '배관용 탄소강관', spec: 'D40', unit: 'M' },
    { no: '', name: '배관용 탄소강관', spec: 'D50', unit: 'M' },
    { no: '', name: '관부속(강관)', spec: '', unit: '식' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD25', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD32', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD40', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD50', unit: 'M' },
    { no: '', name: '소방용헤드(FLUSH-TV), 이설', spec: '하향식 72℃', unit: 'EA' },
    { no: '', name: '소방용헤드(FLUSH-TV), 신설', spec: '하향식 72℃', unit: 'EA' },
    { no: '', name: '후렉시블조인트(펌조)', spec: '2.3M', unit: 'SET' },
    { no: '', name: '스프링클러 퇴수 및 중수비용', spec: '', unit: '식' },
    { no: '', name: '잡자재비', spec: '', unit: '식' },
    { no: '', name: '노무비', spec: '배관공', unit: '인' },
    { no: '', name: '노무비', spec: '보통인부', unit: '인' },
    { no: '', name: '철거노무비', spec: '', unit: '식' },
    { no: '', name: '공구손료', spec: '', unit: '식' },
  ];

  fireExtinguishingItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // 기계 소화설비 공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">기계 소화설비 공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td></td>
    </tr>
  `;

  // E-4 기타
  html += `
    <tr>
        <td>E-4</td>
        <td class="left-align" style="font-weight: bold;">기타</td>
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

  const etcItems = [
    { no: '', name: 'T.A.B', spec: '', unit: '식' },
    { no: '', name: '[냉난방]', spec: '', unit: '' },
    { no: '', name: '[냉난방]', spec: '', unit: '' },
    { no: '', name: '1-WAY 카세트 실내기', spec: 'AM023BN1PBH1', unit: 'EA' },
    { no: '', name: '1-WAY 카세트 실내기', spec: 'AM032BN1PBH1', unit: 'EA' },
    { no: '', name: '4-WAY 카세트 실내기', spec: 'AM060BN4DBH1', unit: 'EA' },
    { no: '', name: '4-WAY 카세트 실내기', spec: 'AM083BN4DBH1', unit: 'EA' },
    { no: '', name: '4-WAY 카세트 실내기', spec: 'AM130BN4DBH1', unit: 'EA' },
    { no: '', name: '1-WAY 판넬', spec: 'PC1NWSK3NW', unit: 'EA' },
    { no: '', name: '4-WAY 판넬', spec: 'PC4NUFK1NW', unit: 'EA' },
    { no: '', name: '표준형 냉난방 실외기', spec: 'AM180AXVGHH1', unit: 'EA' },
    { no: '', name: '유선리모컨', spec: 'AWR-WE13N', unit: 'EA' },
    { no: '', name: 'Y-분기관', spec: 'AXJ-YA2815M 外', unit: 'EA' },
    { no: '', name: '16살 제어기', spec: 'ACM-A202DN', unit: 'EA' },
    { no: '', name: '실외기 발칠대', spec: '멀티용', unit: 'EA' },
  ];

  etcItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align indent-1">${item.name}</td>
            <td>${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
        </tr>
    `;
  });

  // E-4 기타 추가 항목들
  const additionalEtcItems = [
    { no: '', name: '냉난방 설치공사비', spec: '신규라인', unit: '' },
    { no: '', name: '냉매배관 공사비', spec: '동관,EPDM보온재作', unit: 'SET' },
    { no: '', name: '드레인배관 공사비', spec: 'PVC,보온재作', unit: 'SET' },
    { no: '', name: '실내기 통신공사', spec: 'CVVSB2.0SQx3C', unit: 'SET' },
    { no: '', name: '냉매', spec: 'R-410', unit: 'LOT' },
    { no: '', name: '기밀시험', spec: '질소차징', unit: 'SET' },
    { no: '', name: '기타 공과잡비', spec: '행거,전산볼트外', unit: 'LOT' },
    { no: '', name: '인건비', spec: '기계설치공', unit: '명' },
    { no: '', name: '인건비', spec: '배관공', unit: '명' },
    { no: '', name: '인건비', spec: '용접공', unit: '명' },
    { no: '', name: '인건비', spec: '보온공', unit: '명' },
    { no: '', name: '인건비', spec: '내전선공', unit: '명' },
    { no: '', name: '인건비', spec: '보통인부', unit: '명' },
    { no: '', name: '기타 공과잡비', spec: '공구손료 外', unit: 'LOT' },
    { no: '', name: '이전설치', spec: '동관,EPDM보온재外 (장비벽경포함)', unit: 'SET' },
    { no: '', name: '기타공사비', spec: '', unit: '' },
    { no: '', name: '실외기 배관 COVER 및 TRAY', spec: '제작설치', unit: 'LOT' },
    { no: '', name: '16살 제어공사', spec: '', unit: 'LOT' },
    { no: '', name: '타공 공사비', spec: '', unit: 'LOT' },
    { no: '', name: '실외기양중', spec: '크레인 및 도비비', unit: 'LOT' },
    { no: '', name: '기타 공과잡비', spec: '', unit: 'LOT' },
  ];

  additionalEtcItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 기타 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">기타 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F. 전기공사
  html += `
    <tr>
        <td>F.</td>
        <td class="left-align" style="font-weight: bold;">전기공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F-1 동력전원설비공사
  html += `
    <tr>
        <td>F-1</td>
        <td class="left-align" style="font-weight: bold;">동력전원설비공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const powerSupplyItems = [
    { no: '', name: '450/750V 저독성난연가교폴리올레핀절연선', spec: 'HFIX, 4 ㎟', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 10SQ * 4C', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 4SQ * 4C', unit: 'M' },
    { no: '', name: '접지용전선', spec: 'F-GV 10SQ', unit: 'M' },
    { no: '', name: '접지용전선', spec: 'F-GV 4SQ', unit: 'M' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 22mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 28mm, 방수', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 36mm, 방수', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '풀박스', spec: '풀박스, 400*400*400mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 중형4각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 4각, 평', unit: '개' },
    { no: '', name: '콘센트', spec: '콘센트, 2구, 15A, 250V, 동근형-매입형, 접지', unit: '개' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
    { no: '', name: '전선관지지행거(단독)', spec: '28 C', unit: '개소' },
    { no: '', name: '전선관지지행거(단독)', spec: '36 C', unit: '개소' },
    { no: '', name: '실내기전원 이설', spec: '', unit: '식' },
    { no: '', name: '분전함 신설', spec: 'LN-9-에어컨', unit: '식' },
    { no: '', name: '분전함 이설', spec: 'LN-9-1F, 1E, 2G, 2F', unit: '식' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
  ];

  powerSupplyItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // F-1 동력전원설비공사 추가 항목들
  const additionalPowerSupplyItems = [
    { no: '', name: '노무비', spec: '내선전공', unit: '인' },
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalPowerSupplyItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 동력전원설비공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">동력전원설비공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F-2 전열설비공사
  html += `
    <tr>
        <td>F-2</td>
        <td class="left-align" style="font-weight: bold;">전열설비공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const electricalHeatingItems = [
    { no: '', name: '450/750V 저독성난연가교폴리올레핀절연선', spec: 'HFIX, 4 ㎟', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 4SQ * 3C', unit: 'M' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 22mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '풀박스', spec: '300*300*200', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 중형4각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 4각, 평', unit: '개' },
    { no: '', name: '콘센트', spec: '콘센트, 2구, 15A, 250V, 동근형-매입형, 접지', unit: '개' },
    { no: '', name: '콘센트', spec: '방수콘센트, 2구, 15A, 250V', unit: '개' },
    { no: '', name: '콘센트', spec: '콘센트, 2구, 15A, 250V, 노출', unit: '개' },
    { no: '', name: '플러그', spec: '노출, 15A, 250V', unit: '개' },
    { no: '', name: '석고구멍따기', spec: '', unit: '개소' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '노무비', spec: '내선전공', unit: '인' },
  ];

  electricalHeatingItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // F-2 전열설비공사 추가 항목들
  const additionalElectricalHeatingItems = [
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalElectricalHeatingItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 전열설비공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">전열설비공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F-3 전등설비공사
  html += `
    <tr>
        <td>F-3</td>
        <td class="left-align" style="font-weight: bold;">전등설비공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const lightingEquipmentItems = [
    { no: '', name: '저독성난연케이블', spec: 'HFIX, 2.5 ㎟', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 2.5SQ * 3C', unit: 'M' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 16mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 중형4각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 8각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 4각, 평', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 8각, 평형', unit: '개' },
    { no: '', name: '스위치', spec: '1구 , 매입형', unit: '개' },
    { no: '', name: '스위치', spec: '2구 , 매입형', unit: '개' },
    { no: '', name: '스위치', spec: '3구 , 매입형', unit: '개' },
    { no: '', name: '스위치', spec: 'PROGRAM S/W , 4구 , 매입형', unit: '개' },
    { no: '', name: '석고구멍따기', spec: '', unit: '개소' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '노무비', spec: '내선전공', unit: '인' },
  ];

  lightingEquipmentItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // F-3 전등설비공사 추가 항목들
  const additionalLightingEquipmentItems = [
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalLightingEquipmentItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 전등설비공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">전등설비공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F-4 철거맞이설공사
  html += `
    <tr>
        <td>F-4</td>
        <td class="left-align" style="font-weight: bold;">철거맞이설공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const dismantlingItems = [
    { no: '', name: '철거 및 이설', spec: '', unit: '식' },
  ];

  dismantlingItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 철거맞이설공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">철거맞이설공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F-5 자탐 및 유도등공사
  html += `
    <tr>
        <td>F-5</td>
        <td class="left-align" style="font-weight: bold;">자탐 및 유도등공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const smokeDetectorGuideItems = [
    { no: '', name: '저독성난연케이블', spec: 'HFIX, 2.5 ㎟', unit: 'M' },
    { no: '', name: '케이블', spec: 'TSP AWG16', unit: 'M' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 8각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 8각, 평형', unit: '개' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 16mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '연기감지기', spec: '', unit: '개' },
    { no: '', name: '유도등', spec: '유도등, 천정형(단면), 60분용, 피난구유도등, 고휘도, LED', unit: '개' },
    { no: '', name: '유도등', spec: '유도등, 중형(단면), 60분용, 피난구유도등, 고휘도, LED', unit: '개' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
  ];

  smokeDetectorGuideItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // F-5 자탐 및 유도등공사 추가 항목들
  const additionalSmokeDetectorGuideItems = [
    { no: '', name: '내선전공', spec: '알박공사 직종', unit: '인' },
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalSmokeDetectorGuideItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 자탐 및 유도등공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">자탐 및 유도등공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // F-6 전관방송설비공사
  html += `
    <tr>
        <td>F-6</td>
        <td class="left-align" style="font-weight: bold;">전관방송설비공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const broadcastEquipmentItems = [
    { no: '', name: '스피커', spec: '천정형', unit: '개' },
    { no: '', name: '저독성난연케이블', spec: 'HFIX, 2.5 ㎟', unit: 'M' },
    { no: '', name: '케이블', spec: 'TSP AWG16', unit: 'M' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 8각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 8각, 평형', unit: '개' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 16mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '내선전공', spec: '알박공사 직종', unit: '인' },
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  broadcastEquipmentItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // 전관방송설비공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">전관방송설비공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // G. 재작가구공사
  html += `
    <tr>
        <td>G.</td>
        <td class="left-align" style="font-weight: bold;">재작가구공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const customFurnitureItems = [
    { no: '', name: 'Table 1~13', spec: 'D:500*H:750', unit: 'M' },
  ];

  customFurnitureItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // G. 재작가구공사 추가 항목들
  const additionalCustomFurnitureItems = [
    { no: '', name: '캔틴장 - 하부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: 'OA상부장-1', spec: 'W:4300', unit: 'SET' },
    { no: '', name: 'OA하부장-1', spec: 'W:2560', unit: 'SET' },
    { no: '', name: '락카장', spec: '400*550*800', unit: 'SET' },
    { no: '', name: 'OA상부장-2', spec: '1820*350*750', unit: 'SET' },
    { no: '', name: 'OA하부장-2', spec: '1820*600*2650', unit: 'SET' },
    { no: '', name: 'Booth Sofa', spec: '1610*700*850', unit: 'SET' },
    { no: '', name: 'Booth Table', spec: '1610*600*750', unit: 'SET' },
    { no: '', name: 'OA상부장-3', spec: '1600*350*750', unit: 'SET' },
    { no: '', name: '붙박이장', spec: '2100*750*2600', unit: 'SET' },
    { no: '', name: '캔틴장 - 하부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: '세면대 하부장', spec: 'W:2400', unit: 'SET' },
    { no: '', name: '안내데스크', spec: '2600*800*1100', unit: 'SET' },
    { no: '', name: '캔틴장 - 하부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: 'OA상부장-4', spec: '1250*350*750', unit: 'SET' },
    { no: '', name: 'OA하부장-4', spec: '1250*600*2650', unit: 'SET' },
    { no: '', name: 'OA상부장-5', spec: '3560*350*750', unit: 'SET' },
    { no: '', name: 'OA하부장-5', spec: '1820*600*850', unit: 'SET' },
  ];

  additionalCustomFurnitureItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // G. 재작가구공사 추가 항목들 (54.png)
  const moreCustomFurnitureItems = [
    { no: '', name: '캔틴장 - 하부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: '락카장', spec: '400*550*800', unit: 'SET' },
    { no: '', name: '캔틴장 - 하부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: '락카장', spec: '400*550*800', unit: 'SET' },
    { no: '', name: 'OA상부장-6', spec: '1760*350*750', unit: 'SET' },
    { no: '', name: '캐비닛', spec: 'W:3600', unit: 'SET' },
    { no: '', name: '운반비 및 셋팅비', spec: '', unit: '식' },
  ];

  moreCustomFurnitureItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // G. 재작가구공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">G. 재작가구공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // H. 이동식가구공사
  html += `
    <tr>
        <td>H.</td>
        <td class="left-align" style="font-weight: bold;">이동식가구공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // H. 이동식가구공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">H. 이동식가구공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  // I. 기타공사
  html += `
    <tr>
        <td>I.</td>
        <td class="left-align" style="font-weight: bold;">기타공사</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
    </tr>
  `;

  const otherConstructionItems = [
    { no: '', name: '기존사방실 철거(FMS 판넬 철거)', spec: '', unit: '식' },
  ];

  otherConstructionItems.forEach((item) => {
    html += `
        <tr>
            <td>${item.no}</td>
            <td class="left-align">${item.name}</td>
            <td class="left-align">${item.spec}</td>
            <td>${item.unit}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td class="left-align"></td>
        </tr>
    `;
  });

  // I. 기타공사 SUB TOTAL
  html += `
    <tr class="subtotal-row">
        <td></td>
        <td class="left-align" style="padding-left: 20px;">I. 기타공사 SUB TOTAL</td>
        <td></td>
        <td></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="number-cell"></td>
        <td class="left-align"></td>
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
    laborTotal * 0.0375 + // 안전보건관리
    Math.max(total * 0.0199, 5349000) + // 안전관리비
    laborTotal * 0.0087 + // 고용보험료
    laborTotal * 0.0323 + // 산업분류료
    laborTotal * 0.045 + // 연금보험료
    laborTotal * 0.045 * 0.0851 + // 경기요양보험료
    laborTotal * 0.023; // 퇴직공제분담금

  return directCosts.totalCost + indirectTotal;
}

/**
 * 견적조건 추가
 */
window.addEstimateTerm = function () {
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
window.removeLastEstimateTerm = function () {
  const termsList = document.getElementById('estimateTermsList');
  if (termsList && termsList.children.length > 0) {
    termsList.removeChild(termsList.lastElementChild);
  }
};

/**
 * 견적조건 삭제 (더블클릭한 항목)
 */
window.removeEstimateTerm = function (element) {
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
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `견적서_${dateStr}_${timeStr}.xlsx`;

    // Excel 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  const totalAmount =
    document.getElementById('estimateTotalAmount')?.textContent || '';
  const amountNumber =
    document.querySelector('.amount-number')?.textContent || '';

  // 견적조건 가져오기
  const termsList = document.getElementById('estimateTermsList');
  const terms = termsList
    ? Array.from(termsList.children).map((li) => li.textContent.trim())
    : [];

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
      editAs: 'oneCell',
    });

    currentRow = 5; // 이미지 공간 확보
  } catch (error) {
    console.warn('이미지 로드 실패, 텍스트로 대체:', error);
    // 이미지 로드 실패 시 텍스트로 대체
    sheet.mergeCells(`A${currentRow}:D${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'KIYENO';
    sheet.getCell(`A${currentRow}`).font = { size: 24, bold: true };
    sheet.getCell(`A${currentRow}`).alignment = {
      horizontal: 'left',
      vertical: 'middle',
    };
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
  sheet.getCell(`D${currentRow}`).alignment = {
    horizontal: 'right',
    vertical: 'middle',
  };
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
  sheet.getCell(`D${currentRow}`).alignment = {
    horizontal: 'right',
    vertical: 'middle',
  };
  currentRow += 2;

  // 메시지
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = '상기와 같이 견적서를 제출합니다.';
  sheet.getCell(`A${currentRow}`).font = { size: 11 };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  currentRow++;

  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  sheet.getCell(`A${currentRow}`).value =
    'WE ARE PLEASED TO SUBMIT YOU ESTIMATE AS SPECIFIED ON ATTACHED SHEETS.';
  sheet.getCell(`A${currentRow}`).font = { size: 11 };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
  currentRow += 2;

  // 견적조건
  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  sheet.getCell(`A${currentRow}`).value = '견 적 조 건 / TERMS';
  sheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
  currentRow++;

  terms.forEach((term) => {
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
  sheet.getCell(`A${currentRow}`).value =
    '서울시 강남구 봉은사로 37길 26 키예노빌딩';
  sheet.getCell(`A${currentRow}`).font = { size: 11 };
  sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
  currentRow++;

  sheet.mergeCells(`A${currentRow}:D${currentRow}`);
  sheet.getCell(`A${currentRow}`).value =
    'TEL: 02)2193-8300 , FAX: 02)3463-0769';
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
  [1, 2, 3].forEach((rowNum) => {
    const row = sheet.getRow(rowNum);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF667EEA' },
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
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

  // SUB TOTAL 행 번호 매핑 생성 (1차 패스)
  const subtotalRowMapping = {};
  let tempRow = 4; // 헤더 3행 다음부터 시작
  detailRows.forEach((row) => {
    if (row.type === 'subtotal' && row.name.includes('SUB TOTAL')) {
      // "A. 인테리어 설계비 SUB TOTAL" → "A. 인테리어 설계비"
      const sectionName = row.name.replace(' SUB TOTAL', '').trim();
      subtotalRowMapping[sectionName] = tempRow;
    }
    tempRow++;
  });

  // 섹션 경계 추적을 위한 변수
  let sectionStartRow = null;
  let lastItemRow = null;

  // A-TOTAL, B-TOTAL 행 번호 추적
  let aTotalRow = null;
  let bTotalRow = null;

  detailRows.forEach((row, index) => {
    const dataRow = sheet.getRow(currentRow);

    // 기본 정보 (항상 정적 값)
    dataRow.getCell(1).value = row.no || itemNo++;
    dataRow.getCell(2).value = row.name;
    dataRow.getCell(3).value = row.spec || '';
    dataRow.getCell(4).value = row.unit || '';
    dataRow.getCell(14).value = row.remark || '';
    dataRow.getCell(23).value = row.remark2 || '';

    // 섹션 헤더 추적
    if (row.type === 'section-header') {
      sectionStartRow = currentRow + 1; // 다음 행부터 항목 시작
      dataRow.getCell(5).value = row.quantity || '';
      dataRow.getCell(6).value = row.materialUnitPrice || '';
      dataRow.getCell(7).value = row.materialAmount || '';
      dataRow.getCell(8).value = row.laborUnitPrice || '';
      dataRow.getCell(9).value = row.laborAmount || '';
      dataRow.getCell(10).value = row.expenseUnitPrice || '';
      dataRow.getCell(11).value = row.expenseAmount || '';
      dataRow.getCell(12).value = row.totalUnitPrice || '';
      dataRow.getCell(13).value = row.totalAmount || '';
      dataRow.getCell(15).value = row.orderMaterialUnitPrice || '';
      dataRow.getCell(16).value = row.orderMaterialAmount || '';
      dataRow.getCell(17).value = row.orderLaborUnitPrice || '';
      dataRow.getCell(18).value = row.orderLaborAmount || '';
      dataRow.getCell(19).value = row.orderExpenseUnitPrice || '';
      dataRow.getCell(20).value = row.orderExpenseAmount || '';
      dataRow.getCell(21).value = row.orderTotalUnitPrice || '';
      dataRow.getCell(22).value = row.orderTotalAmount || '';
    }
    // 일반 항목: 수식 적용
    else if (row.type === 'item') {
      lastItemRow = currentRow;

      // 수량 (정적 값)
      dataRow.getCell(5).value = row.quantity || '';

      // A~I 항목인지 확인 (직접공사비 아래 항목들)
      const isMainSection = subtotalRowMapping[row.name];

      if (isMainSection) {
        // A~I 항목: 단가 빈칸, 금액은 SUB TOTAL 참조
        const subtotalRow = subtotalRowMapping[row.name];

        // 도급내역서 - 단가 빈칸
        dataRow.getCell(6).value = '';
        dataRow.getCell(8).value = '';
        dataRow.getCell(10).value = '';
        dataRow.getCell(12).value = '';

        // 도급내역서 - 금액 (SUB TOTAL 참조)
        dataRow.getCell(7).value = { formula: `=IFERROR(G${subtotalRow},0)` };
        dataRow.getCell(9).value = { formula: `=IFERROR(I${subtotalRow},0)` };
        dataRow.getCell(11).value = { formula: `=IFERROR(K${subtotalRow},0)` };
        dataRow.getCell(13).value = { formula: `=IFERROR(M${subtotalRow},0)` };

        // 발주단가내역서 - 단가 빈칸
        dataRow.getCell(15).value = '';
        dataRow.getCell(17).value = '';
        dataRow.getCell(19).value = '';
        dataRow.getCell(21).value = '';

        // 발주단가내역서 - 금액 (SUB TOTAL 참조)
        dataRow.getCell(16).value = { formula: `=IFERROR(P${subtotalRow},0)` };
        dataRow.getCell(18).value = { formula: `=IFERROR(R${subtotalRow},0)` };
        dataRow.getCell(20).value = { formula: `=IFERROR(T${subtotalRow},0)` };
        dataRow.getCell(22).value = { formula: `=IFERROR(V${subtotalRow},0)` };
      } else {
        // 일반 항목: 기존 로직 (수량 × 단가)

        // 도급내역서 - 단가 (정적 값)
        dataRow.getCell(6).value = row.materialUnitPrice || '';
        dataRow.getCell(8).value = row.laborUnitPrice || '';
        dataRow.getCell(10).value = row.expenseUnitPrice || '';

        // 도급내역서 - 금액 (수식: 수량 × 단가, 항상 적용)
        dataRow.getCell(7).value = { formula: `=IFERROR(E${currentRow}*F${currentRow},0)` };
        dataRow.getCell(9).value = { formula: `=IFERROR(E${currentRow}*H${currentRow},0)` };
        dataRow.getCell(11).value = { formula: `=IFERROR(E${currentRow}*J${currentRow},0)` };

        // 도급내역서 - 합계 단가 (수식: 자재비+노무비+경비)
        dataRow.getCell(12).value = { formula: `=IFERROR(F${currentRow}+H${currentRow}+J${currentRow},0)` };

        // 도급내역서 - 합계 금액 (수식: 자재비금액+노무비금액+경비금액)
        dataRow.getCell(13).value = { formula: `=IFERROR(G${currentRow}+I${currentRow}+K${currentRow},0)` };

        // 발주단가내역서 - 단가 (정적 값)
        dataRow.getCell(15).value = row.orderMaterialUnitPrice || '';
        dataRow.getCell(17).value = row.orderLaborUnitPrice || '';
        dataRow.getCell(19).value = row.orderExpenseUnitPrice || '';

        // 발주단가내역서 - 금액 (수식: 수량 × 단가, 항상 적용)
        dataRow.getCell(16).value = { formula: `=IFERROR(E${currentRow}*O${currentRow},0)` };
        dataRow.getCell(18).value = { formula: `=IFERROR(E${currentRow}*Q${currentRow},0)` };
        dataRow.getCell(20).value = { formula: `=IFERROR(E${currentRow}*S${currentRow},0)` };

        // 발주단가내역서 - 합계 단가 (수식: 자재비+노무비+경비)
        dataRow.getCell(21).value = { formula: `=IFERROR(O${currentRow}+Q${currentRow}+S${currentRow},0)` };

        // 발주단가내역서 - 합계 금액 (수식: 자재비금액+노무비금액+경비금액)
        dataRow.getCell(22).value = { formula: `=IFERROR(P${currentRow}+R${currentRow}+T${currentRow},0)` };
      }
    }
    // SUB TOTAL: SUM 수식
    else if (row.type === 'subtotal') {
      dataRow.getCell(5).value = row.quantity || '';

      // 섹션에 항목이 있는 경우 SUM 수식 적용
      if (sectionStartRow && lastItemRow) {
        // 도급내역서 - 단가와 금액 모두 SUM
        dataRow.getCell(6).value = { formula: `=IFERROR(SUM(F${sectionStartRow}:F${lastItemRow}),0)` };
        dataRow.getCell(7).value = { formula: `=IFERROR(SUM(G${sectionStartRow}:G${lastItemRow}),0)` };
        dataRow.getCell(8).value = { formula: `=IFERROR(SUM(H${sectionStartRow}:H${lastItemRow}),0)` };
        dataRow.getCell(9).value = { formula: `=IFERROR(SUM(I${sectionStartRow}:I${lastItemRow}),0)` };
        dataRow.getCell(10).value = { formula: `=IFERROR(SUM(J${sectionStartRow}:J${lastItemRow}),0)` };
        dataRow.getCell(11).value = { formula: `=IFERROR(SUM(K${sectionStartRow}:K${lastItemRow}),0)` };
        dataRow.getCell(12).value = { formula: `=IFERROR(SUM(L${sectionStartRow}:L${lastItemRow}),0)` };
        dataRow.getCell(13).value = { formula: `=IFERROR(SUM(M${sectionStartRow}:M${lastItemRow}),0)` };

        // 발주단가내역서 - 단가와 금액 모두 SUM
        dataRow.getCell(15).value = { formula: `=IFERROR(SUM(O${sectionStartRow}:O${lastItemRow}),0)` };
        dataRow.getCell(16).value = { formula: `=IFERROR(SUM(P${sectionStartRow}:P${lastItemRow}),0)` };
        dataRow.getCell(17).value = { formula: `=IFERROR(SUM(Q${sectionStartRow}:Q${lastItemRow}),0)` };
        dataRow.getCell(18).value = { formula: `=IFERROR(SUM(R${sectionStartRow}:R${lastItemRow}),0)` };
        dataRow.getCell(19).value = { formula: `=IFERROR(SUM(S${sectionStartRow}:S${lastItemRow}),0)` };
        dataRow.getCell(20).value = { formula: `=IFERROR(SUM(T${sectionStartRow}:T${lastItemRow}),0)` };
        dataRow.getCell(21).value = { formula: `=IFERROR(SUM(U${sectionStartRow}:U${lastItemRow}),0)` };
        dataRow.getCell(22).value = { formula: `=IFERROR(SUM(V${sectionStartRow}:V${lastItemRow}),0)` };
      } else {
        // 섹션에 항목이 없는 경우 정적 값
        dataRow.getCell(6).value = row.materialUnitPrice || '';
        dataRow.getCell(7).value = row.materialAmount || '';
        dataRow.getCell(8).value = row.laborUnitPrice || '';
        dataRow.getCell(9).value = row.laborAmount || '';
        dataRow.getCell(10).value = row.expenseUnitPrice || '';
        dataRow.getCell(11).value = row.expenseAmount || '';
        dataRow.getCell(12).value = row.totalUnitPrice || '';
        dataRow.getCell(13).value = row.totalAmount || '';
        dataRow.getCell(15).value = row.orderMaterialUnitPrice || '';
        dataRow.getCell(16).value = row.orderMaterialAmount || '';
        dataRow.getCell(17).value = row.orderLaborUnitPrice || '';
        dataRow.getCell(18).value = row.orderLaborAmount || '';
        dataRow.getCell(19).value = row.orderExpenseUnitPrice || '';
        dataRow.getCell(20).value = row.orderExpenseAmount || '';
        dataRow.getCell(21).value = row.orderTotalUnitPrice || '';
        dataRow.getCell(22).value = row.orderTotalAmount || '';
      }

      // A-TOTAL, B-TOTAL 행 번호 저장
      if (row.name === 'A - TOTAL') {
        aTotalRow = currentRow;
      } else if (row.name === 'B - TOTAL') {
        bTotalRow = currentRow;
      }

      // SUB TOTAL 후 섹션 초기화
      sectionStartRow = null;
      lastItemRow = null;
    }
    // 간접공사비 항목: 정적 값 + lastItemRow 업데이트
    else if (row.type === 'indirect') {
      lastItemRow = currentRow;

      dataRow.getCell(5).value = row.quantity || '';
      dataRow.getCell(6).value = row.materialUnitPrice || '';
      dataRow.getCell(7).value = row.materialAmount || '';
      dataRow.getCell(8).value = row.laborUnitPrice || '';
      dataRow.getCell(9).value = row.laborAmount || '';
      dataRow.getCell(10).value = row.expenseUnitPrice || '';
      dataRow.getCell(11).value = row.expenseAmount || '';
      dataRow.getCell(12).value = row.totalUnitPrice || '';
      dataRow.getCell(13).value = row.totalAmount || '';
      dataRow.getCell(15).value = row.orderMaterialUnitPrice || '';
      dataRow.getCell(16).value = row.orderMaterialAmount || '';
      dataRow.getCell(17).value = row.orderLaborUnitPrice || '';
      dataRow.getCell(18).value = row.orderLaborAmount || '';
      dataRow.getCell(19).value = row.orderExpenseUnitPrice || '';
      dataRow.getCell(20).value = row.orderExpenseAmount || '';
      dataRow.getCell(21).value = row.orderTotalUnitPrice || '';
      dataRow.getCell(22).value = row.orderTotalAmount || '';
    }
    // GRAND TOTAL: A-TOTAL + B-TOTAL 참조 수식
    else if (row.type === 'total') {
      dataRow.getCell(5).value = '';

      // 도급내역서 - 단가 빈칸, 금액은 A-TOTAL + B-TOTAL
      dataRow.getCell(6).value = '';
      dataRow.getCell(8).value = '';
      dataRow.getCell(10).value = '';
      dataRow.getCell(12).value = '';

      if (aTotalRow && bTotalRow) {
        dataRow.getCell(7).value = { formula: `=IFERROR(G${aTotalRow}+G${bTotalRow},0)` };
        dataRow.getCell(9).value = { formula: `=IFERROR(I${aTotalRow}+I${bTotalRow},0)` };
        dataRow.getCell(11).value = { formula: `=IFERROR(K${aTotalRow}+K${bTotalRow},0)` };
        dataRow.getCell(13).value = { formula: `=IFERROR(M${aTotalRow}+M${bTotalRow},0)` };
      } else {
        dataRow.getCell(7).value = '';
        dataRow.getCell(9).value = '';
        dataRow.getCell(11).value = '';
        dataRow.getCell(13).value = '';
      }

      // 발주단가내역서 - 단가 빈칸, 금액은 A-TOTAL + B-TOTAL
      dataRow.getCell(15).value = '';
      dataRow.getCell(17).value = '';
      dataRow.getCell(19).value = '';
      dataRow.getCell(21).value = '';

      if (aTotalRow && bTotalRow) {
        dataRow.getCell(16).value = { formula: `=IFERROR(P${aTotalRow}+P${bTotalRow},0)` };
        dataRow.getCell(18).value = { formula: `=IFERROR(R${aTotalRow}+R${bTotalRow},0)` };
        dataRow.getCell(20).value = { formula: `=IFERROR(T${aTotalRow}+T${bTotalRow},0)` };
        dataRow.getCell(22).value = { formula: `=IFERROR(V${aTotalRow}+V${bTotalRow},0)` };
      } else {
        dataRow.getCell(16).value = '';
        dataRow.getCell(18).value = '';
        dataRow.getCell(20).value = '';
        dataRow.getCell(22).value = '';
      }
    }
    // 나머지 (단수정리 등): 정적 값
    else {
      dataRow.getCell(5).value = row.quantity || '';
      dataRow.getCell(6).value = row.materialUnitPrice || '';
      dataRow.getCell(7).value = row.materialAmount || '';
      dataRow.getCell(8).value = row.laborUnitPrice || '';
      dataRow.getCell(9).value = row.laborAmount || '';
      dataRow.getCell(10).value = row.expenseUnitPrice || '';
      dataRow.getCell(11).value = row.expenseAmount || '';
      dataRow.getCell(12).value = row.totalUnitPrice || '';
      dataRow.getCell(13).value = row.totalAmount || '';
      dataRow.getCell(15).value = row.orderMaterialUnitPrice || '';
      dataRow.getCell(16).value = row.orderMaterialAmount || '';
      dataRow.getCell(17).value = row.orderLaborUnitPrice || '';
      dataRow.getCell(18).value = row.orderLaborAmount || '';
      dataRow.getCell(19).value = row.orderExpenseUnitPrice || '';
      dataRow.getCell(20).value = row.orderExpenseAmount || '';
      dataRow.getCell(21).value = row.orderTotalUnitPrice || '';
      dataRow.getCell(22).value = row.orderTotalAmount || '';
    }

    // Excel 그룹화: 자식 행 판별 (D-1, D-2, E-1, E-2 등)
    if (row.no && typeof row.no === 'string' && row.no.includes('-')) {
      dataRow.outlineLevel = 1;
    }

    // 스타일 적용
    if (row.type === 'section-header') {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' },
        };
        cell.font = { bold: true };
      });
    } else if (row.type === 'subtotal') {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1ECF1' },
        };
        cell.font = { bold: true };
      });
    } else if (row.type === 'indirect') {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        };
      });
    } else if (row.type === 'total') {
      dataRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF667EEA' },
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });
    }

    // 테두리 적용
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 숫자 셀 오른쪽 정렬 및 천단위 구분 (모든 숫자 컬럼)
    [5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22].forEach(
      (colNum) => {
        const cell = dataRow.getCell(colNum);
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0'; // 조건 없이 모든 숫자 컬럼에 포맷 적용
      }
    );

    // 품명 왼쪽 정렬
    dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

    // 단위 중앙정렬
    dataRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

    currentRow++;
  });

  // 컬럼 너비 설정
  sheet.getColumn(1).width = 8; // NO
  sheet.getColumn(2).width = 30; // 품명
  sheet.getColumn(3).width = 15; // 규격
  sheet.getColumn(4).width = 8; // 단위
  sheet.getColumn(5).width = 10; // 수량
  sheet.getColumn(6).width = 12; // 도급: 자재비 단가
  sheet.getColumn(7).width = 12; // 도급: 자재비 금액
  sheet.getColumn(8).width = 12; // 도급: 노무비 단가
  sheet.getColumn(9).width = 12; // 도급: 노무비 금액
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
    type: 'section-header',
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
    { no: '', name: 'I. 기타공사' },
  ];

  directItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: '',
      unit: 'LOT',
      quantity: 1.0,
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
      type: 'item',
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
    type: 'subtotal',
  });

  // 간접공사비 섹션 헤더
  rows.push({
    no: '',
    name: '간접공사비',
    type: 'section-header',
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
    { name: '기업이윤 (직접공사비기준)', value: 0 },
  ];

  let indirectTotal = 0;

  indirectItems.forEach((item) => {
    indirectTotal += item.value;
    rows.push({
      no: '',
      name: item.name,
      spec: '',
      unit: 'LOT',
      quantity: 1.0,
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
      type: 'indirect',
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
    type: 'subtotal',
  });

  // 단수정리
  rows.push({
    no: '',
    name: '단수정리',
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
    type: 'indirect',
  });

  // 총 합계
  const grandTotal = 0; // 모든 금액이 0이므로
  rows.push({
    no: '',
    name: 'GRAND TOTAL (A+B+C+D)',
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
    type: 'total',
  });

  // A. 인테리어 설계비 섹션
  rows.push({
    no: '',
    name: 'A. 인테리어 설계비',
    type: 'section-header',
  });

  rows.push({
    no: '',
    name: '디자인 제안비',
    spec: '',
    unit: '식',
    quantity: 1.0,
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
    type: 'item',
  });

  rows.push({
    no: '',
    name: 'A. 인테리어 설계비 SUB TOTAL',
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
    type: 'subtotal',
  });

  // B. 가설 및 공사준비 작업 섹션
  rows.push({
    no: '',
    name: 'B. 가설 및 공사준비 작업',
    type: 'section-header',
  });

  const tempWorkItems = [
    { name: '현장보양', spec: '' },
    { name: '먹매김', spec: '' },
    { name: '내부수평비계', spec: '' },
    { name: '자재 소운반', spec: '' },
    { name: '자재 대운반', spec: '' },
    { name: '현장 정리정돈', spec: '' },
    { name: '방염', spec: '' },
    { name: '폐기물 처리비', spec: '가설' },
    { name: '폐기물 소운반', spec: '' },
    { name: '고소작업대', spec: '보이드 구간' },
    { name: '준공청소', spec: '' },
    { name: '마감코팅', spec: '' },
  ];

  tempWorkItems.forEach((item) => {
    rows.push({
      no: '',
      name: item.name,
      spec: item.spec,
      unit: 'M2',
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
      type: 'item',
    });
  });

  rows.push({
    no: '',
    name: 'B. 가설 및 공사준비 작업 SUB TOTAL',
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
    type: 'subtotal',
  });

  // C. 철거공사 섹션
  rows.push({
    no: '',
    name: 'C. 철거공사',
    type: 'section-header',
  });

  const demolitionItems = [
    { name: '바닥철거', spec: '' },
    { name: '벽체철거 + 글라스월 + 창호 포함', spec: '골조 및 하지 +유리 + 마감 +도어' },
    { name: '천정철거', spec: '' },
    { name: '폐기물 소운반 및 집기류', spec: '' },
    { name: '폐기물 처리비', spec: '' },
    { name: '장비사용료', spec: '' },
  ];

  demolitionItems.forEach((item) => {
    rows.push({
      no: '',
      name: item.name,
      spec: item.spec,
      unit: 'M2',
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
      type: 'item',
    });
  });

  rows.push({
    no: '',
    name: 'C. 철거공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // D. 인테리어공사 섹션
  rows.push({
    no: '',
    name: 'D. 인테리어공사',
    type: 'section-header',
  });

  rows.push({
    no: 'D-1',
    name: '바닥공사',
    type: 'section-header',
  });

  const floorWorkItems = [
    { no: '-', name: '기존바닥 보양', spec: '', unit: 'M2' },
    { no: '', name: '기존 OA플로워 보수 및 깔기 (시스템박스이설)', spec: '전체면적의 *20%', unit: 'M2' },
    { no: '', name: '기존 OA플로워 레벨조절', spec: '', unit: 'M2' },
    { no: '-', name: '치장 카펫', spec: '', unit: 'M2' },
    { no: '', name: '치장 카펫 걷기', spec: '', unit: 'M2' },
    { no: '-', name: '지정 LVT', spec: '', unit: 'M2' },
    { no: '', name: '지정 LVT 걷기', spec: '', unit: 'M2' },
    { no: '-', name: '미화실 히팅판넬', spec: '일체형 판넬', unit: 'M2' },
    { no: '-', name: '하지합판', spec: '', unit: 'M2' },
    { no: '', name: '하지합판 깔기', spec: '', unit: 'M2' },
    { no: '-', name: 'WOOD FLOORING', spec: '', unit: 'M2' },
    { no: '', name: 'WOOD FLOORING 깔기', spec: '', unit: 'M2' },
    { no: '-', name: '재료분리대', spec: '', unit: 'M' },
    { no: '-', name: '화장실 바닥방수', spec: '액방 + 우레탄방수', unit: '개소' },
    { no: '-', name: '붙임몰탈', spec: '', unit: 'M2' },
    { no: '-', name: '지정바닥타일', spec: '600*1200', unit: 'M2' },
    { no: '-', name: '지정바닥타일', spec: '600*1200', unit: 'M2' },
    { no: '-', name: '지정바닥타일', spec: '600*600', unit: 'M2' },
    { no: '', name: '지정바닥타일 깔기', spec: '', unit: 'M/D' },
    { no: '', name: '지정바닥타일 매지넣기', spec: '', unit: 'M/D' },
    { no: '-', name: 'FLOOR HINGE 타공 및 보강', spec: '', unit: 'EA' },
  ];

  floorWorkItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 바닥공사 SUB TOTAL
  rows.push({
    no: '',
    name: '바닥공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // D-2 벽체공사
  rows.push({
    no: 'D-2',
    name: '벽체공사',
    type: 'section-header',
  });

  const wallWorkItems = [
    { no: '', name: 'DRY WALL-3', spec: 'STUD 100 + 단열재 + SGB 9.5T*2P(양면) + 차음시트* 1P(양면)', unit: 'M2' },
    { no: '', name: 'POCKET WALL', spec: 'PIPE 30*30(양면) + GB 9.5T*2P(양면)', unit: 'M2' },
    { no: '', name: 'END FRAME', spec: 'W:150', unit: 'EA' },
    { no: '', name: 'FCU 경량구', spec: '', unit: 'EA' },
    { no: '', name: '각파이프 이중구조틀', spec: '50*50', unit: 'M2' },
    { no: '', name: '매지 몰딩', spec: '', unit: 'M' },
    { no: '', name: 'STUD', spec: '65T (단면)', unit: 'M2' },
    { no: '', name: 'STUD', spec: '65T (양면)', unit: 'M2' },
    { no: '', name: 'GLASS WOOL', spec: '24K50T', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 시공', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '합판보강', spec: '9T*1PLY', unit: 'M2' },
  ];

  wallWorkItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 벽체공사 SUB TOTAL
  rows.push({
    no: '',
    name: '벽체공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // D-3 벽체마감공사
  rows.push({
    no: 'D-3',
    name: '벽체마감공사',
    type: 'section-header',
  });

  rows.push({
    no: '*',
    name: '[출입구-2개소]',
    type: 'section-header',
  });

  const wallFinishItems1 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '구조철판 마감', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'STL FRAME+도장', spec: '20*150', unit: 'M' },
    { no: '', name: 'STL FRAME+도장', spec: '20*150', unit: 'M' },
    { no: '', name: 'STL FRAME+도장', spec: '20*150', unit: 'M' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems1.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  rows.push({
    no: '*',
    name: '[전견실]',
    type: 'section-header',
  });

  const wallFinishItems2 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems2.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [자니] 서브섹션
  rows.push({
    no: '*',
    name: '[자니]',
    type: 'section-header',
  });

  const wallFinishItems3 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems3.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [레지나] 서브섹션
  rows.push({
    no: '*',
    name: '[레지나]',
    type: 'section-header',
  });

  const wallFinishItems4 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems4.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [제임스] 서브섹션
  rows.push({
    no: '*',
    name: '[제임스]',
    type: 'section-header',
  });

  const wallFinishItems5 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems5.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [준] 서브섹션
  rows.push({
    no: '*',
    name: '[준]',
    type: 'section-header',
  });

  const wallFinishItems6 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems6.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [PHONE RM-12개소] 서브섹션
  rows.push({
    no: '*',
    name: '[PHONE RM-12개소]',
    type: 'section-header',
  });

  const wallFinishItems7 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems7.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [OA / CANTEEN] 서브섹션
  rows.push({
    no: '*',
    name: '[OA / CANTEEN]',
    type: 'section-header',
  });

  const wallFinishItems8 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems8.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [OPEN OFFICE -1] 서브섹션
  rows.push({
    no: '*',
    name: '[OPEN OFFICE -1]',
    type: 'section-header',
  });

  const wallFinishItems9 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems9.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [창고] 서브섹션
  rows.push({
    no: '*',
    name: '[창고]',
    type: 'section-header',
  });

  const wallFinishItems10 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems10.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-1] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-1]',
    type: 'section-header',
  });

  const wallFinishItems11 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems11.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-2] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-2]',
    type: 'section-header',
  });

  const wallFinishItems12 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems12.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [LOCKER] 서브섹션
  rows.push({
    no: '*',
    name: '[LOCKER]',
    type: 'section-header',
  });

  const wallFinishItems13 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems13.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-3] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-3]',
    type: 'section-header',
  });

  const wallFinishItems14 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems14.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [OA-1] 서브섹션
  rows.push({
    no: '*',
    name: '[OA-1]',
    type: 'section-header',
  });

  const wallFinishItems15 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems15.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [서버룸] 서브섹션
  rows.push({
    no: '*',
    name: '[서버룸]',
    type: 'section-header',
  });

  const wallFinishItems16 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems16.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-4] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-4]',
    type: 'section-header',
  });

  const wallFinishItems17 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems17.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 16인] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 16인]',
    type: 'section-header',
  });

  const wallFinishItems18 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems18.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-5] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-5]',
    type: 'section-header',
  });

  const wallFinishItems19 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems19.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-6] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-6]',
    type: 'section-header',
  });

  const wallFinishItems20 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems20.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [OA-2] 서브섹션
  rows.push({
    no: '*',
    name: '[OA-2]',
    type: 'section-header',
  });

  const wallFinishItems21 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems21.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [본부실장실-1] 서브섹션
  rows.push({
    no: '*',
    name: '[본부실장실-1]',
    type: 'section-header',
  });

  const wallFinishItems22 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems22.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [본부실장실-2] 서브섹션
  rows.push({
    no: '*',
    name: '[본부실장실-2]',
    type: 'section-header',
  });

  const wallFinishItems23 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems23.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실-10인-1] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실-10인-1]',
    type: 'section-header',
  });

  const wallFinishItems24 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems24.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [본부실장실-3] 서브섹션
  rows.push({
    no: '*',
    name: '[본부실장실-3]',
    type: 'section-header',
  });

  const wallFinishItems25 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems25.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실-10인-2] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실-10인-2]',
    type: 'section-header',
  });

  const wallFinishItems26 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems26.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-7] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-7]',
    type: 'section-header',
  });

  const wallFinishItems27 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems27.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [미화대기실] 서브섹션
  rows.push({
    no: '*',
    name: '[미화대기실]',
    type: 'section-header',
  });

  const wallFinishItems28 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems28.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CEO - RECEPTION] 서브섹션
  rows.push({
    no: '*',
    name: '[CEO - RECEPTION]',
    type: 'section-header',
  });

  const wallFinishItems29 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'SPECIAL PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems29.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CEO -STO] 서브섹션
  rows.push({
    no: '*',
    name: '[CEO -STO]',
    type: 'section-header',
  });

  const wallFinishItems30 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems30.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CEO -1,2] 서브섹션
  rows.push({
    no: '*',
    name: '[CEO -1,2]',
    type: 'section-header',
  });

  const wallFinishItems31 = [
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems31.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [화장실] 서브섹션
  rows.push({
    no: '*',
    name: '[화장실]',
    type: 'section-header',
  });

  const wallFinishItems32 = [
    { no: '', name: 'CRC보드 취부', spec: '9.5T*1PLY', unit: 'M2' },
    { no: '', name: '화장실 벽체방수', spec: '액방 + 우레탄방수', unit: 'M2' },
    { no: '', name: '붙임몰탈', spec: '', unit: 'M2' },
    { no: '', name: '지정벽체타일', spec: '', unit: 'M2' },
    { no: '', name: '지정벽체타일 취부', spec: '', unit: 'M2' },
    { no: '', name: '지정벽체타일 매지넣기', spec: '', unit: 'M2' },
    { no: '', name: '세면대구조틀 및 하지취부', spec: '', unit: 'M' },
    { no: '', name: '세면대상판', spec: '', unit: 'M' },
    { no: '', name: '젠다이구조틀 및 하지취부', spec: '', unit: 'M' },
    { no: '', name: '젠다이상판', spec: '', unit: 'M' },
    { no: '', name: '은경구조틀 및 하지취부', spec: '', unit: '개소' },
    { no: '', name: '은경', spec: '', unit: 'M' },
    { no: '', name: '은경몰딩', spec: '', unit: 'M' },
  ];

  wallFinishItems32.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CEO -대표 대회의실] 서브섹션
  rows.push({
    no: '*',
    name: '[CEO -대표 대회의실]',
    type: 'section-header',
  });

  const wallFinishItems33 = [
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부(고급)', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems33.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [전략기획팀] 서브섹션
  rows.push({
    no: '*',
    name: '[전략기획팀]',
    type: 'section-header',
  });

  const wallFinishItems34 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems34.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [전략기획팀] - 회의실-8인 서브섹션
  rows.push({
    no: '*',
    name: '[전략기획팀] - 회의실-8인',
    type: 'section-header',
  });

  const wallFinishItems35 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems35.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CFO] 서브섹션
  rows.push({
    no: '*',
    name: '[CFO]',
    type: 'section-header',
  });

  const wallFinishItems36 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems36.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [오스카] 서브섹션
  rows.push({
    no: '*',
    name: '[오스카]',
    type: 'section-header',
  });

  const wallFinishItems37 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems37.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [로고] 서브섹션
  rows.push({
    no: '*',
    name: '[로고]',
    type: 'section-header',
  });

  const wallFinishItems38 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems38.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 16인-1] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 16인-1]',
    type: 'section-header',
  });

  const wallFinishItems39 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems39.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-9] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-9]',
    type: 'section-header',
  });

  const wallFinishItems40 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems40.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [OA-3] 서브섹션
  rows.push({
    no: '*',
    name: '[OA-3]',
    type: 'section-header',
  });

  const wallFinishItems41 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems41.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-10] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-10]',
    type: 'section-header',
  });

  const wallFinishItems42 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems42.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CANTEEN] 서브섹션
  rows.push({
    no: '*',
    name: '[CANTEEN]',
    type: 'section-header',
  });

  const wallFinishItems43 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems43.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [서버룸] 서브섹션
  rows.push({
    no: '*',
    name: '[서버룸]',
    type: 'section-header',
  });

  const wallFinishItems44 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems44.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [자금 금고] 서브섹션
  rows.push({
    no: '*',
    name: '[자금 금고]',
    type: 'section-header',
  });

  const wallFinishItems45 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems45.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-11] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-11]',
    type: 'section-header',
  });

  const wallFinishItems46 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems46.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CANTEEN] 서브섹션 (25.png)
  rows.push({
    no: '*',
    name: '[CANTEEN]',
    type: 'section-header',
  });

  const wallFinishItems47 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems47.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 16인-2] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 16인-2]',
    type: 'section-header',
  });

  const wallFinishItems48 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems48.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-12] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-12]',
    type: 'section-header',
  });

  const wallFinishItems49 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems49.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-13] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-13]',
    type: 'section-header',
  });

  const wallFinishItems50 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems50.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [창고] 서브섹션
  rows.push({
    no: '*',
    name: '[창고]',
    type: 'section-header',
  });

  const wallFinishItems51 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems51.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-14] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-14]',
    type: 'section-header',
  });

  const wallFinishItems52 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems52.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [OA-3] 서브섹션
  rows.push({
    no: '*',
    name: '[OA-3]',
    type: 'section-header',
  });

  const wallFinishItems53 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '타공판넬설치', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems53.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-15] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-15]',
    type: 'section-header',
  });

  const wallFinishItems54 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems54.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [창고] 서브섹션
  rows.push({
    no: '*',
    name: '[창고]',
    type: 'section-header',
  });

  const wallFinishItems55 = [
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems55.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실 8인-16] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실 8인-16]',
    type: 'section-header',
  });

  const wallFinishItems56 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems56.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [사이먼] 서브섹션
  rows.push({
    no: '*',
    name: '[사이먼]',
    type: 'section-header',
  });

  const wallFinishItems57 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems57.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [코난] 서브섹션
  rows.push({
    no: '*',
    name: '[코난]',
    type: 'section-header',
  });

  const wallFinishItems58 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems58.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [디렉터룸-1] 서브섹션
  rows.push({
    no: '*',
    name: '[디렉터룸-1]',
    type: 'section-header',
  });

  const wallFinishItems59 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems59.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [디렉터룸-2] 서브섹션
  rows.push({
    no: '*',
    name: '[디렉터룸-2]',
    type: 'section-header',
  });

  const wallFinishItems60 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems60.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [윤리경영] 서브섹션
  rows.push({
    no: '*',
    name: '[윤리경영]',
    type: 'section-header',
  });

  const wallFinishItems61 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems61.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [디렉터룸-3] 서브섹션
  rows.push({
    no: '*',
    name: '[디렉터룸-3]',
    type: 'section-header',
  });

  const wallFinishItems62 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems62.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [디렉터룸-4] 서브섹션
  rows.push({
    no: '*',
    name: '[디렉터룸-4]',
    type: 'section-header',
  });

  const wallFinishItems63 = [
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS', spec: '', unit: 'M2' },
    { no: '', name: 'BACK PAINT GLASS 몰딩', spec: '', unit: 'M' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
  ];

  wallFinishItems63.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [공통공사] 서브섹션
  rows.push({
    no: '*',
    name: '[공통공사]',
    type: 'section-header',
  });

  const wallFinishItems64 = [
    { no: '', name: '신규벽체 도장', spec: 'ALL PUTTY 포함', unit: 'M2' },
    { no: '', name: '기존벽체 재도장', spec: '전체면적의 *60%', unit: 'M2' },
    { no: '', name: '걸레받이', spec: '', unit: 'M' },
    { no: '', name: 'FCU 재도장', spec: '전체면적의 *50%', unit: 'M2' },
  ];

  wallFinishItems64.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 벽체마감공사 SUB TOTAL
  rows.push({
    no: '',
    name: '벽체마감공사 SUB TOTAL',
    type: 'subtotal',
  });

  // D-4 유리벽체공사 서브섹션
  rows.push({
    no: '*',
    name: 'D-4 유리벽체공사',
    type: 'section-header',
  });

  const glassWallItems = [
    { no: '', name: 'STL FRAME', spec: 'ㅁ50*150', unit: 'M' },
    { no: '', name: 'STL FRAME PAINT', spec: '', unit: 'M' },
    { no: '', name: 'GLASS', spec: 'T:10', unit: 'M2' },
    { no: '', name: 'FROST SHEET', spec: '', unit: 'M2' },
    { no: '', name: 'TEMPERED GLASS 상부 보강', spec: 'ㅁ50*50', unit: 'M' },
  ];

  glassWallItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 유리벽체공사 SUB TOTAL
  rows.push({
    no: '',
    name: '유리벽체공사 SUB TOTAL',
    type: 'subtotal',
  });

  // D-5 창호 및 하드웨어 공사 서브섹션
  rows.push({
    no: '*',
    name: 'D-5 창호 및 하드웨어 공사',
    type: 'section-header',
  });

  const windowHardwareItems = [
    { no: '', name: 'GLASS DOOR', spec: '900*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR - >가마찌도어', spec: '850*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR - >가마찌도어', spec: '850*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR - >가마찌도어', spec: '850*2600', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '2000*2400', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '3740*2600', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '4530*2600', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & FRAME', spec: '2000*2600', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & FRAME', spec: '960*2600', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & FRAME', spec: '960*2600', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & FRAME', spec: '960*2600', unit: 'EA' },
    { no: '', name: 'WOOD SLIDING DOOR & FRAME', spec: '950*2600', unit: 'EA' },
    { no: '', name: 'WOOD SLIDING DOOR & FRAME', spec: '950*2600', unit: 'EA' },
    { no: '', name: 'WOOD SLIDING DOOR & FRAME', spec: '950*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & FRAME + H/W포함', spec: '1650*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & FRAME + H/W포함', spec: '1650*2600', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & FRAME + H/W포함', spec: '1650*2600', unit: 'EA' },
  ];

  windowHardwareItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // *HARD WARE* 서브섹션
  rows.push({
    no: '*',
    name: '*HARD WARE*',
    type: 'section-header',
  });

  const hardwareItems = [
    { no: '', name: 'GLASS DOOR & H/W', spec: '', unit: 'EA' },
    { no: '', name: 'GLASS DOOR & H/W', spec: '가마찌도어', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & H/W', spec: '편개', unit: 'EA' },
    { no: '', name: 'AUTO DOOR & H/W', spec: '양개', unit: 'EA' },
    { no: '', name: 'WOOD DOOR & H/W', spec: '', unit: 'EA' },
    { no: '', name: 'SLIDING DOOR & H/W', spec: '', unit: 'EA' },
  ];

  hardwareItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 창호 및 하드웨어 공사 SUB TOTAL
  rows.push({
    no: '',
    name: '창호 및 하드웨어 공사 SUB TOTAL',
    type: 'subtotal',
  });

  // D-6 천정공사 서브섹션
  rows.push({
    no: '*',
    name: 'D-6 천정공사',
    type: 'section-header',
  });

  const ceilingItems = [
    { no: '', name: '기존 천정 보수 및 커튼박스몰딩도장', spec: '', unit: 'M2' },
    { no: '', name: '**기커튼박스재사용**', spec: '', unit: '' },
  ];

  ceilingItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 천정공사 SUB TOTAL
  rows.push({
    no: '',
    name: '천정공사 SUB TOTAL',
    type: 'subtotal',
  });

  // D-7 천정마감공사 서브섹션
  rows.push({
    no: '*',
    name: 'D-7 천정마감공사',
    type: 'section-header',
  });

  // [ENT-1.2] 서브섹션
  rows.push({
    no: '*',
    name: '[ENT-1.2]',
    type: 'section-header',
  });

  const ent12Items = [
    { no: '', name: '각파이프구조틀', spec: '', unit: 'M2' },
    { no: '', name: '합판보강', spec: '', unit: 'M2' },
    { no: '', name: '합판보강', spec: '', unit: 'M2' },
    { no: '', name: '합판보강', spec: '', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '패브릭판넬 취부', spec: 'MDF+패브릭', unit: 'M2' },
    { no: '', name: '구조철판 마감', spec: '', unit: 'M2' },
    { no: '', name: '간접박스', spec: 'STL 50*50*50', unit: 'M' },
    { no: '', name: '간접박스 도장', spec: 'STL 50*50*50', unit: 'M' },
    { no: '', name: '구조철판 JOINT MOULDING', spec: '', unit: 'M' },
  ];

  ent12Items.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [PHONE RM.-1~12] 서브섹션
  rows.push({
    no: '*',
    name: '[PHONE RM.-1~12]',
    type: 'section-header',
  });

  const phoneRmItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*1PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*1PLY', unit: 'M2' },
    { no: '', name: '다노라인', spec: '', unit: 'M2' },
    { no: '', name: '다노라인 취부', spec: '', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
  ];

  phoneRmItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실10인실] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실10인실]',
    type: 'section-header',
  });

  const meeting10Items = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
  ];

  meeting10Items.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [회의실8인실] 서브섹션
  rows.push({
    no: '*',
    name: '[회의실8인실]',
    type: 'section-header',
  });

  const meeting8Items = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  meeting8Items.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [미화실] 서브섹션
  rows.push({
    no: '*',
    name: '[미화실]',
    type: 'section-header',
  });

  const cleaningRoomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '마이텍스', spec: '', unit: 'M2' },
    { no: '', name: '마이텍스취부', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
  ];

  cleaningRoomItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [CORRIDOR] 서브섹션
  rows.push({
    no: '*',
    name: '[CORRIDOR]',
    type: 'section-header',
  });

  const corridorItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: 'JOINT MOULDING', spec: '', unit: 'M' },
    { no: '', name: 'PAINT (부분퍼티포함)', spec: '', unit: 'M2' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'ST\'L 450*450', unit: 'EA' },
  ];

  corridorItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [[CEO-ZONE]] 섹션 헤더
  rows.push({
    no: '',
    name: '[[CEO-ZONE]]',
    type: 'section-header',
  });

  // [CEO 대기실] 서브섹션
  rows.push({
    no: '*',
    name: '[CEO 대기실]',
    type: 'section-header',
  });

  const ceoWaitingRoomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '라인디퓨져', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '라인디퓨져 취부', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  ceoWaitingRoomItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [ROOM] 서브섹션
  rows.push({
    no: '*',
    name: '[ROOM]',
    type: 'section-header',
  });

  const roomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '라인디퓨져', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '라인디퓨져 취부', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '팬덴트 타공 및 보강', spec: '', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  roomItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [STO] 서브섹션
  rows.push({
    no: '*',
    name: '[STO]',
    type: 'section-header',
  });

  const stoItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  stoItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [화장실] 서브섹션
  rows.push({
    no: '*',
    name: '[화장실]',
    type: 'section-header',
  });

  const bathroomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 300*200*100*50', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  bathroomItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [대표회의실] 서브섹션
  rows.push({
    no: '*',
    name: '[대표회의실]',
    type: 'section-header',
  });

  const ceoConferenceRoomItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: '간접등박스', spec: 'STL 200*100*50', unit: 'M' },
    { no: '', name: '간접등박스 도장', spec: 'STL 200*100*50', unit: 'M' },
    { no: '', name: '간접박스', spec: 'STL 200*100*200', unit: 'M' },
    { no: '', name: '간접박스 도장', spec: 'STL 200*100*200', unit: 'M' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M2' },
    { no: '', name: '라인디퓨져', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '라인디퓨져 취부', spec: 'STL 30*30*30*30*30 (이중) + 타공판포함', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  ceoConferenceRoomItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // [[전락기획팀-ZONE]] 서브섹션
  rows.push({
    no: '*',
    name: '[[전락기획팀-ZONE]]',
    type: 'section-header',
  });

  const strategyPlanningZoneItems = [
    { no: '', name: '경량천정구조틀', spec: 'M-BAR', unit: 'M2' },
    { no: '', name: '석고보드', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: '석고보드 취부', spec: '9.5T*2PLY', unit: 'M2' },
    { no: '', name: 'ALL PUTTY', spec: '', unit: 'M2' },
    { no: '', name: 'PAINT', spec: '', unit: 'M2' },
    { no: '', name: 'AL 몰딩', spec: '', unit: 'M' },
    { no: '', name: '디퓨져 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '등기구 타공 및 보강', spec: '', unit: 'M2' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
    { no: '', name: '점검구', spec: 'STL 450*450', unit: 'EA' },
  ];

  strategyPlanningZoneItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 천정마감공사 SUB TOTAL
  rows.push({
    no: '',
    name: '천정마감공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // D-8 조명기구공사
  rows.push({
    no: 'D-8',
    name: '조명기구공사',
    type: 'section-header',
  });

  const lightingItems = [
    { no: '', name: 'LT-01', spec: '', unit: 'EA' },
    { no: '', name: 'LT-01-1', spec: '', unit: 'EA' },
    { no: '', name: 'LT-02', spec: '', unit: 'EA' },
    { no: '', name: 'LT-03', spec: '', unit: 'M' },
    { no: '', name: 'LT-04', spec: '', unit: 'M' },
    { no: '', name: 'PD-01', spec: '', unit: 'M' },
    { no: '', name: 'PD-05', spec: '', unit: 'EA' },
    { no: '', name: 'IL-01', spec: '', unit: 'M' },
    { no: '', name: '기존조명 보완', spec: '', unit: 'LOT' },
    { no: '', name: 'STAND LIGHT', spec: 'PHONE RM', unit: 'EA' },
  ];

  lightingItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 조명기구공사 SUB TOTAL
  rows.push({
    no: '',
    name: '조명기구공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // D-9 블라인드공사
  rows.push({
    no: 'D-9',
    name: '블라인드공사',
    type: 'section-header',
  });

  const blindItems = [
    { no: '', name: '기존 블라인드 보수 및 수정', spec: '', unit: 'EA' },
    { no: '', name: '지정 블라인드 / 시공', spec: '', unit: 'M2' },
  ];

  blindItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 블라인드공사 SUB TOTAL
  rows.push({
    no: '',
    name: '블라인드공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // D-10 실내싸인공사
  rows.push({
    no: 'D-10',
    name: '실내싸인공사',
    type: 'section-header',
  });

  const interiorSignItems = [
    { no: '', name: 'MAIN ENT SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'ROOM SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'PICTOGRAM SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'EVACUATION INFORMATION SIGN', spec: '', unit: 'LOT' },
    { no: '', name: 'GRAPHICS SHEET', spec: '', unit: 'LOT' },
    { no: '', name: 'LOBOR COST', spec: '', unit: 'LOT' },
    { no: '', name: '실내싸인보완작업', spec: '', unit: 'LOT' },
  ];

  interiorSignItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 실내싸인공사 SUB TOTAL
  rows.push({
    no: '',
    name: '실내싸인공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // E. 기계설비공사
  rows.push({
    no: '',
    name: 'E. 기계설비공사',
    type: 'section-header',
  });

  // E-1 공조 및 환기덕트 공사
  rows.push({
    no: 'E-1',
    name: '공조 및 환기덕트 공사',
    type: 'section-header',
  });

  const airConditioningItems = [
    { no: '', name: '덕트제작 및 설치', spec: '0.5T', unit: 'M2' },
    { no: '', name: '트랜스퍼덕트(내부 흡음재설치)', spec: '', unit: 'EA' },
    { no: '', name: '원형디퓨져 신설', spec: 'ND200', unit: 'EA' },
    { no: '', name: '보온플렉시블덕트', spec: '200mm', unit: 'M' },
    { no: '', name: '잡자재비', spec: '', unit: '식' },
    { no: '', name: '노무비', spec: '덕트공', unit: '인' },
    { no: '', name: '철거비', spec: '', unit: '식' },
    { no: '', name: '공구손료', spec: '', unit: '식' },
  ];

  airConditioningItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 공조 및 환기덕트 공사 SUB TOTAL
  rows.push({
    no: '',
    name: '공조 및 환기덕트 공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // E-2 위생설비 공사
  rows.push({
    no: 'E-2',
    name: '위생설비 공사',
    type: 'section-header',
  });

  const sanitaryItems = [
    { no: '', name: '양변기 외 휴지걸이 셋트', spec: '', unit: 'SET' },
    { no: '', name: '세면기 셋트', spec: '', unit: 'SET' },
    { no: '', name: '저탕식 전기온수기', spec: '15리터', unit: 'EA' },
    { no: '', name: '싱크드레인펌프', spec: 'PD53', unit: 'EA' },
    { no: '', name: '일반배관용 스테인리스 강관', spec: 'K-TYPE, D15', unit: 'M' },
    { no: '', name: '일반배관용 스테인리스 강관', spec: 'K-TYPE, D25', unit: 'M' },
    { no: '', name: '관부속(SR)', spec: '', unit: '식' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '관보온(EPDM+메직)', spec: '13TxD15', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '13TxD25', unit: 'M' },
    { no: '', name: '볼 밸브(STS)', spec: '10kg, D15', unit: 'EA' },
    { no: '', name: '볼 밸브(STS)', spec: '10kg, D25', unit: 'EA' },
    { no: '', name: '각압 밸브', spec: '냉온수 난사, 10kg, D15', unit: 'EA' },
    { no: '', name: '원격검침기', spec: 'D25', unit: 'EA' },
    { no: '', name: '배관배선', spec: '', unit: '식' },
    { no: '', name: '프로그램 업그레이드', spec: '', unit: '식' },
    { no: '', name: '일반용 경질염화비닐관', spec: 'PVC관(VG1,DRF) D50', unit: 'M' },
    { no: '', name: '일반용 경질염화비닐관', spec: 'PVC관(VG1,DRF) D100', unit: 'M' },
    { no: '', name: '관부속(DRF)', spec: '', unit: '식' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '관보온(EPDM+메직)', spec: '13TxD100', unit: 'M' },
    { no: '', name: '급수차단밸브', spec: '', unit: 'EA' },
    { no: '', name: '누수탐지설비', spec: '', unit: 'EA' },
    { no: '', name: 'STS판', spec: '', unit: 'EA' },
    { no: '', name: '실링팬', spec: '', unit: 'EA' },
    { no: '', name: '스파이럴덕트', spec: 'D150', unit: 'EA' },
    { no: '', name: '스파이럴덕트 부속류', spec: '', unit: '식' },
    { no: '', name: '벽체 코어링', spec: 'D150', unit: '개소' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '잡자재비', spec: '', unit: '식' },
    { no: '', name: '노무비', spec: '배관공', unit: '인' },
    { no: '', name: '노무비', spec: '보통인부', unit: '인' },
    { no: '', name: '공구손료', spec: '', unit: '식' },
  ];

  sanitaryItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 위생설비 공사 SUB TOTAL
  rows.push({
    no: '',
    name: '위생설비 공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // E-3 기계 소화설비 공사
  rows.push({
    no: 'E-3',
    name: '기계 소화설비 공사',
    type: 'section-header',
  });

  const fireExtinguishingItems = [
    { no: '', name: '배관용 탄소강관', spec: 'D25', unit: 'M' },
    { no: '', name: '배관용 탄소강관', spec: 'D32', unit: 'M' },
    { no: '', name: '배관용 탄소강관', spec: 'D40', unit: 'M' },
    { no: '', name: '배관용 탄소강관', spec: 'D50', unit: 'M' },
    { no: '', name: '관부속(강관)', spec: '', unit: '식' },
    { no: '', name: '지지철물', spec: '', unit: '식' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD25', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD32', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD40', unit: 'M' },
    { no: '', name: '관보온(EPDM+메직)', spec: '25TxD50', unit: 'M' },
    { no: '', name: '소방용헤드(FLUSH-TV), 이설', spec: '하향식 72℃', unit: 'EA' },
    { no: '', name: '소방용헤드(FLUSH-TV), 신설', spec: '하향식 72℃', unit: 'EA' },
    { no: '', name: '후렉시블조인트(펌조)', spec: '2.3M', unit: 'SET' },
    { no: '', name: '스프링클러 퇴수 및 중수비용', spec: '', unit: '식' },
    { no: '', name: '잡자재비', spec: '', unit: '식' },
    { no: '', name: '노무비', spec: '배관공', unit: '인' },
    { no: '', name: '노무비', spec: '보통인부', unit: '인' },
    { no: '', name: '철거노무비', spec: '', unit: '식' },
    { no: '', name: '공구손료', spec: '', unit: '식' },
  ];

  fireExtinguishingItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 기계 소화설비 공사 SUB TOTAL
  rows.push({
    no: '',
    name: '기계 소화설비 공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // E-4 기타
  rows.push({
    no: 'E-4',
    name: '기타',
    type: 'section-header',
  });

  const etcItems = [
    { no: '', name: 'T.A.B', spec: '', unit: '식' },
    { no: '', name: '[냉난방]', spec: '', unit: '' },
    { no: '', name: '[냉난방]', spec: '', unit: '' },
    { no: '', name: '1-WAY 카세트 실내기', spec: 'AM023BN1PBH1', unit: 'EA' },
    { no: '', name: '1-WAY 카세트 실내기', spec: 'AM032BN1PBH1', unit: 'EA' },
    { no: '', name: '4-WAY 카세트 실내기', spec: 'AM060BN4DBH1', unit: 'EA' },
    { no: '', name: '4-WAY 카세트 실내기', spec: 'AM083BN4DBH1', unit: 'EA' },
    { no: '', name: '4-WAY 카세트 실내기', spec: 'AM130BN4DBH1', unit: 'EA' },
    { no: '', name: '1-WAY 판넬', spec: 'PC1NWSK3NW', unit: 'EA' },
    { no: '', name: '4-WAY 판넬', spec: 'PC4NUFK1NW', unit: 'EA' },
    { no: '', name: '표준형 냉난방 실외기', spec: 'AM180AXVGHH1', unit: 'EA' },
    { no: '', name: '유선리모컨', spec: 'AWR-WE13N', unit: 'EA' },
    { no: '', name: 'Y-분기관', spec: 'AXJ-YA2815M 外', unit: 'EA' },
    { no: '', name: '16살 제어기', spec: 'ACM-A202DN', unit: 'EA' },
    { no: '', name: '실외기 발칠대', spec: '멀티용', unit: 'EA' },
  ];

  etcItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const additionalEtcItems = [
    { no: '', name: '냉난방 설치공사비', spec: '신규라인', unit: '' },
    { no: '', name: '냉매배관 공사비', spec: '동관,EPDM보온재作', unit: 'SET' },
    { no: '', name: '드레인배관 공사비', spec: 'PVC,보온재作', unit: 'SET' },
    { no: '', name: '실내기 통신공사', spec: 'CVVSB2.0SQx3C', unit: 'SET' },
    { no: '', name: '냉매', spec: 'R-410', unit: 'LOT' },
    { no: '', name: '기밀시험', spec: '질소차징', unit: 'SET' },
    { no: '', name: '기타 공과잡비', spec: '행거,전산볼트外', unit: 'LOT' },
    { no: '', name: '인건비', spec: '기계설치공', unit: '명' },
    { no: '', name: '인건비', spec: '배관공', unit: '명' },
    { no: '', name: '인건비', spec: '용접공', unit: '명' },
    { no: '', name: '인건비', spec: '보온공', unit: '명' },
    { no: '', name: '인건비', spec: '내전선공', unit: '명' },
    { no: '', name: '인건비', spec: '보통인부', unit: '명' },
    { no: '', name: '기타 공과잡비', spec: '공구손료 外', unit: 'LOT' },
    { no: '', name: '이전설치', spec: '동관,EPDM보온재外 (장비벽경포함)', unit: 'SET' },
    { no: '', name: '기타공사비', spec: '', unit: '' },
    { no: '', name: '실외기 배관 COVER 및 TRAY', spec: '제작설치', unit: 'LOT' },
    { no: '', name: '16살 제어공사', spec: '', unit: 'LOT' },
    { no: '', name: '타공 공사비', spec: '', unit: 'LOT' },
    { no: '', name: '실외기양중', spec: '크레인 및 도비비', unit: 'LOT' },
    { no: '', name: '기타 공과잡비', spec: '', unit: 'LOT' },
  ];

  additionalEtcItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 기타 SUB TOTAL
  rows.push({
    no: '',
    name: '기타 SUB TOTAL',
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
    type: 'subtotal',
  });

  // F. 전기공사
  rows.push({
    no: 'F.',
    name: '전기공사',
    type: 'section-header',
  });

  // F-1 동력전원설비공사
  rows.push({
    no: 'F-1',
    name: '동력전원설비공사',
    type: 'section-header',
  });

  const powerSupplyItems = [
    { no: '', name: '450/750V 저독성난연가교폴리올레핀절연선', spec: 'HFIX, 4 ㎟', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 10SQ * 4C', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 4SQ * 4C', unit: 'M' },
    { no: '', name: '접지용전선', spec: 'F-GV 10SQ', unit: 'M' },
    { no: '', name: '접지용전선', spec: 'F-GV 4SQ', unit: 'M' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 22mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 28mm, 방수', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 36mm, 방수', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '풀박스', spec: '풀박스, 400*400*400mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 중형4각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 4각, 평', unit: '개' },
    { no: '', name: '콘센트', spec: '콘센트, 2구, 15A, 250V, 동근형-매입형, 접지', unit: '개' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
    { no: '', name: '전선관지지행거(단독)', spec: '28 C', unit: '개소' },
    { no: '', name: '전선관지지행거(단독)', spec: '36 C', unit: '개소' },
    { no: '', name: '실내기전원 이설', spec: '', unit: '식' },
    { no: '', name: '분전함 신설', spec: 'LN-9-에어컨', unit: '식' },
    { no: '', name: '분전함 이설', spec: 'LN-9-1F, 1E, 2G, 2F', unit: '식' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
  ];

  powerSupplyItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const additionalPowerSupplyItems = [
    { no: '', name: '노무비', spec: '내선전공', unit: '인' },
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalPowerSupplyItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 동력전원설비공사 SUB TOTAL
  rows.push({
    no: '',
    name: '동력전원설비공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // F-2 전열설비공사
  rows.push({
    no: 'F-2',
    name: '전열설비공사',
    type: 'section-header',
  });

  const electricalHeatingItems = [
    { no: '', name: '450/750V 저독성난연가교폴리올레핀절연선', spec: 'HFIX, 4 ㎟', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 4SQ * 3C', unit: 'M' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 22mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '풀박스', spec: '300*300*200', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 중형4각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 4각, 평', unit: '개' },
    { no: '', name: '콘센트', spec: '콘센트, 2구, 15A, 250V, 동근형-매입형, 접지', unit: '개' },
    { no: '', name: '콘센트', spec: '방수콘센트, 2구, 15A, 250V', unit: '개' },
    { no: '', name: '콘센트', spec: '콘센트, 2구, 15A, 250V, 노출', unit: '개' },
    { no: '', name: '플러그', spec: '노출, 15A, 250V', unit: '개' },
    { no: '', name: '석고구멍따기', spec: '', unit: '개소' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '노무비', spec: '내선전공', unit: '인' },
  ];

  electricalHeatingItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const additionalElectricalHeatingItems = [
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalElectricalHeatingItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 전열설비공사 SUB TOTAL
  rows.push({
    no: '',
    name: '전열설비공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // F-3 전등설비공사
  rows.push({
    no: 'F-3',
    name: '전등설비공사',
    type: 'section-header',
  });

  const lightingEquipmentItems = [
    { no: '', name: '저독성난연케이블', spec: 'HFIX, 2.5 ㎟', unit: 'M' },
    { no: '', name: '난연전력케이블', spec: 'F-CV 2.5SQ * 3C', unit: 'M' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 16mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 중형4각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 8각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 4각, 평', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 8각, 평형', unit: '개' },
    { no: '', name: '스위치', spec: '1구 , 매입형', unit: '개' },
    { no: '', name: '스위치', spec: '2구 , 매입형', unit: '개' },
    { no: '', name: '스위치', spec: '3구 , 매입형', unit: '개' },
    { no: '', name: '스위치', spec: 'PROGRAM S/W , 4구 , 매입형', unit: '개' },
    { no: '', name: '석고구멍따기', spec: '', unit: '개소' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '노무비', spec: '내선전공', unit: '인' },
  ];

  lightingEquipmentItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const additionalLightingEquipmentItems = [
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalLightingEquipmentItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 전등설비공사 SUB TOTAL
  rows.push({
    no: '',
    name: '전등설비공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // F-4 철거맞이설공사
  rows.push({
    no: 'F-4',
    name: '철거맞이설공사',
    type: 'section-header',
  });

  const dismantlingItems = [
    { no: '', name: '철거 및 이설', spec: '', unit: '식' },
  ];

  dismantlingItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 철거맞이설공사 SUB TOTAL
  rows.push({
    no: '',
    name: '철거맞이설공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // F-5 자탐 및 유도등공사
  rows.push({
    no: 'F-5',
    name: '자탐 및 유도등공사',
    type: 'section-header',
  });

  const smokeDetectorGuideItems = [
    { no: '', name: '저독성난연케이블', spec: 'HFIX, 2.5 ㎟', unit: 'M' },
    { no: '', name: '케이블', spec: 'TSP AWG16', unit: 'M' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 8각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 8각, 평형', unit: '개' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 16mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '연기감지기', spec: '', unit: '개' },
    { no: '', name: '유도등', spec: '유도등, 천정형(단면), 60분용, 피난구유도등, 고휘도, LED', unit: '개' },
    { no: '', name: '유도등', spec: '유도등, 중형(단면), 60분용, 피난구유도등, 고휘도, LED', unit: '개' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수, 콘넥터', unit: '개' },
    { no: '', name: '전선관지지행거(단독)', spec: '16 C', unit: '개소' },
  ];

  smokeDetectorGuideItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const additionalSmokeDetectorGuideItems = [
    { no: '', name: '내선전공', spec: '알박공사 직종', unit: '인' },
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  additionalSmokeDetectorGuideItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 자탐 및 유도등공사 SUB TOTAL
  rows.push({
    no: '',
    name: '자탐 및 유도등공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // F-6 전관방송설비공사
  rows.push({
    no: 'F-6',
    name: '전관방송설비공사',
    type: 'section-header',
  });

  const broadcastEquipmentItems = [
    { no: '', name: '스피커', spec: '천정형', unit: '개' },
    { no: '', name: '저독성난연케이블', spec: 'HFIX, 2.5 ㎟', unit: 'M' },
    { no: '', name: '케이블', spec: 'TSP AWG16', unit: 'M' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 8각, 54mm', unit: '개' },
    { no: '', name: '아웃렛박스', spec: '아웃렛박스, 커버, 8각, 평형', unit: '개' },
    { no: '', name: '강제전선관', spec: '강제전선관, 후강전선관, 아연도, 16mm', unit: 'M' },
    { no: '', name: '1종금속제가요전선관', spec: '1종금속제가요전선관, 16mm, 비방수', unit: 'M' },
    { no: '', name: '전선관부속품비', spec: '전선관의 %', unit: '식' },
    { no: '', name: '잡재료비', spec: '배관배선의 %', unit: '식' },
    { no: '', name: '내선전공', spec: '알박공사 직종', unit: '인' },
    { no: '', name: '노무비', spec: '저압케이블전공', unit: '인' },
    { no: '', name: '공구손료', spec: '인력품의 %', unit: '식' },
  ];

  broadcastEquipmentItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // 전관방송설비공사 SUB TOTAL
  rows.push({
    no: '',
    name: '전관방송설비공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // G. 재작가구공사
  rows.push({
    no: 'G.',
    name: '재작가구공사',
    type: 'section-header',
  });

  const customFurnitureItems = [
    { no: '', name: 'Table 1~13', spec: 'D:500*H:750', unit: 'M' },
  ];

  customFurnitureItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const additionalCustomFurnitureItems = [
    { no: '', name: '캔틴장 - 하부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: 'OA상부장-1', spec: 'W:4300', unit: 'SET' },
    { no: '', name: 'OA하부장-1', spec: 'W:2560', unit: 'SET' },
    { no: '', name: '락카장', spec: '400*550*800', unit: 'SET' },
    { no: '', name: 'OA상부장-2', spec: '1820*350*750', unit: 'SET' },
    { no: '', name: 'OA하부장-2', spec: '1820*600*2650', unit: 'SET' },
    { no: '', name: 'Booth Sofa', spec: '1610*700*850', unit: 'SET' },
    { no: '', name: 'Booth Table', spec: '1610*600*750', unit: 'SET' },
    { no: '', name: 'OA상부장-3', spec: '1600*350*750', unit: 'SET' },
    { no: '', name: '붙박이장', spec: '2100*750*2600', unit: 'SET' },
    { no: '', name: '캔틴장 - 하부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: '세면대 하부장', spec: 'W:2400', unit: 'SET' },
    { no: '', name: '안내데스크', spec: '2600*800*1100', unit: 'SET' },
    { no: '', name: '캔틴장 - 하부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:3150', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: 'OA상부장-4', spec: '1250*350*750', unit: 'SET' },
    { no: '', name: 'OA하부장-4', spec: '1250*600*2650', unit: 'SET' },
    { no: '', name: 'OA상부장-5', spec: '3560*350*750', unit: 'SET' },
    { no: '', name: 'OA하부장-5', spec: '1820*600*850', unit: 'SET' },
  ];

  additionalCustomFurnitureItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  const moreCustomFurnitureItems = [
    { no: '', name: '캔틴장 - 하부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: '락카장', spec: '400*550*800', unit: 'SET' },
    { no: '', name: '캔틴장 - 하부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 상부장', spec: 'W:2350', unit: 'SET' },
    { no: '', name: '캔틴장 - 붙박이장', spec: 'W:1150', unit: 'SET' },
    { no: '', name: '락카장', spec: '400*550*800', unit: 'SET' },
    { no: '', name: 'OA상부장-6', spec: '1760*350*750', unit: 'SET' },
    { no: '', name: '캐비닛', spec: 'W:3600', unit: 'SET' },
    { no: '', name: '운반비 및 셋팅비', spec: '', unit: '식' },
  ];

  moreCustomFurnitureItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // G. 재작가구공사 SUB TOTAL
  rows.push({
    no: '',
    name: 'G. 재작가구공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // H. 이동식가구공사
  rows.push({
    no: 'H.',
    name: '이동식가구공사',
    type: 'section-header',
  });

  // H. 이동식가구공사 SUB TOTAL
  rows.push({
    no: '',
    name: 'H. 이동식가구공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  // I. 기타공사
  rows.push({
    no: 'I.',
    name: '기타공사',
    type: 'section-header',
  });

  const otherConstructionItems = [
    { no: '', name: '기존사방실 철거(FMS 판넬 철거)', spec: '', unit: '식' },
  ];

  otherConstructionItems.forEach((item) => {
    rows.push({
      no: item.no,
      name: item.name,
      spec: item.spec,
      unit: item.unit,
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
      type: 'item',
    });
  });

  // I. 기타공사 SUB TOTAL
  rows.push({
    no: '',
    name: 'I. 기타공사 SUB TOTAL',
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
    type: 'subtotal',
  });

  return rows;
}

// =============================================================================
// Excel 내보내기 드롭다운 관리
// =============================================================================

/**
 * Excel 내보내기 드롭다운 토글
 */
window.toggleExportDropdown = function (event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('exportDropdown');
  if (!dropdown) return;

  const isVisible = dropdown.style.display === 'block';
  dropdown.style.display = isVisible ? 'none' : 'block';

  // 드롭다운을 열 때만 외부 클릭 리스너 등록 (성능 최적화 및 메모리 관리)
  if (!isVisible) {
    // 다음 틱에 리스너 등록 (현재 클릭 이벤트와 분리)
    setTimeout(() => {
      function closeOnOutsideClick(e) {
        const button = e.target.closest('[onclick*="toggleExportDropdown"]');
        if (!button && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
          document.removeEventListener('click', closeOnOutsideClick);
        }
      }
      document.addEventListener('click', closeOnOutsideClick);
    }, 0);
  }
};

/**
 * 드롭다운 닫기
 */
window.closeExportDropdown = function () {
  const dropdown = document.getElementById('exportDropdown');
  if (dropdown) dropdown.style.display = 'none';
};

/**
 * 발주서 Excel 내보내기
 */
window.exportOrderForm = function () {
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
      alert(
        '벽체 계산 데이터가 없습니다. 먼저 벽체를 선택하고 계산하기를 실행하세요.'
      );
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
        fitToHeight: 0,
      },
    });

    // 헤더 생성 (3행 병합 구조)
    createOrderFormExcelHeader(worksheet);

    // 데이터 행 생성 (스타일 포함)
    await addOrderFormDataToExcel(worksheet);

    // 파일 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
  // ✅ 34개 컬럼 설정 (HTML과 일치)
  worksheet.columns = [
    { key: 'no', width: 6 }, // A: NO
    { key: 'category', width: 12 }, // B: 구분
    { key: 'name', width: 25 }, // C: 품명 및 규격
    { key: 'thk', width: 8 }, // D: WALL - THK
    { key: 'type', width: 10 }, // E: WALL - Type
    { key: 'spacing', width: 8 }, // F: 개수 - @
    { key: 'thick', width: 8 }, // G: 개수 - 두께
    { key: 'width', width: 8 }, // H: 개수 - 넓이
    { key: 'height', width: 8 }, // I: 개수 - 높이
    { key: 'countUnit', width: 8 }, // J: 개수 - 단위 🆕 추가
    { key: 'length', width: 8 }, // K: 개수 - 수량 (기존 M)
    { key: 'supplier', width: 12 }, // L: 환산 - 제공자
    { key: 'area', width: 10 }, // M: 환산 - 1장->m2
    { key: 'sheets', width: 8 }, // N: 환산 - 장
    { key: 'unit', width: 8 }, // O: 단위
    { key: 'amount', width: 10 }, // P: 수량
    { key: 'matPrice', width: 10 }, // Q: 계약도급 - 자재비 단가
    { key: 'matCost', width: 12 }, // R: 계약도급 - 자재비 금액
    { key: 'labPrice', width: 10 }, // S: 계약도급 - 노무비 단가
    { key: 'labCost', width: 12 }, // T: 계약도급 - 노무비 금액
    { key: 'expPrice', width: 10 }, // U: 계약도급 - 경비 단가
    { key: 'expCost', width: 12 }, // V: 계약도급 - 경비 금액
    { key: 'totalPrice', width: 10 }, // W: 계약도급 - 합계 단가
    { key: 'totalCost', width: 12 }, // X: 계약도급 - 합계 금액
    { key: 'note1', width: 10 }, // Y: 비고
    { key: 'ordMatPrice', width: 10 }, // Z: 발주단가 - 자재비 단가
    { key: 'ordMatCost', width: 12 }, // AA: 발주단가 - 자재비 금액
    { key: 'ordLabPrice', width: 10 }, // AB: 발주단가 - 노무비 단가
    { key: 'ordLabCost', width: 12 }, // AC: 발주단가 - 노무비 금액
    { key: 'ordExpPrice', width: 10 }, // AD: 발주단가 - 경비 단가
    { key: 'ordExpCost', width: 12 }, // AE: 발주단가 - 경비 금액
    { key: 'ordTotalPrice', width: 10 }, // AF: 발주단가 - 합계 단가
    { key: 'ordTotalCost', width: 12 }, // AG: 발주단가 - 합계 금액
    { key: 'note2', width: 10 }, // AH: 비고
  ];

  // ✅ A1:C3 영역에 "발주서" 제목 추가
  worksheet.mergeCells('A1:C3');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '발주서';
  titleCell.font = { bold: true, size: 22 };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // ✅ Row 4: 메인 헤더 (1~3행은 빈칸) - 34개
  const row4 = worksheet.getRow(4);
  row4.values = [
    'NO',          // A
    '구분',         // B
    '품명 및 규격',   // C
    'WALL',        // D
    '',            // E (WALL 병합)
    '개수',         // F
    '',            // G (개수 병합)
    '',            // H (개수 병합)
    '',            // I (개수 병합)
    '',            // J (개수 병합)
    '',            // K (개수 병합)
    '환산',         // L
    '',            // M (환산 병합)
    '',            // N (환산 병합)
    '단위',         // O
    '수량',         // P
    '계약도급',      // Q
    '',            // R (계약도급 병합)
    '',            // S (계약도급 병합)
    '',            // T (계약도급 병합)
    '',            // U (계약도급 병합)
    '',            // V (계약도급 병합)
    '',            // W (계약도급 병합)
    '',            // X (계약도급 병합)
    '비고',         // Y
    '발주단가',      // Z
    '',            // AA (발주단가 병합)
    '',            // AB (발주단가 병합)
    '',            // AC (발주단가 병합)
    '',            // AD (발주단가 병합)
    '',            // AE (발주단가 병합)
    '',            // AF (발주단가 병합)
    '',            // AG (발주단가 병합)
    '비고',         // AH
  ];

  // ✅ Row 5: 서브 헤더 (A, B, C는 빈 값 - Row 4와 병합됨) - 34개
  const row5 = worksheet.getRow(5);
  row5.values = [
    '',           // A (NO 병합)
    '',           // B (구분 병합)
    '',           // C (품명 및 규격 병합)
    'THK',        // D
    'Type',       // E
    '@',          // F
    '두께',        // G
    '넓이',        // H
    '높이',        // I
    '단위',        // J 🆕 추가
    '수량',        // K 🆕 수정 (기존 M)
    '제공자',      // L 🆕 수정
    '1장->m2',    // M 🆕 수정
    '장',         // N 🆕 수정
    '',           // O (단위 병합)
    '',           // P (수량 병합)
    '자재비',      // Q 🆕 수정
    '',           // R (자재비 병합)
    '노무비',      // S 🆕 수정
    '',           // T (노무비 병합)
    '경비',        // U 🆕 수정
    '',           // V (경비 병합)
    '합계',        // W 🆕 수정
    '',           // X (합계 병합)
    '',           // Y (비고 병합)
    '자재비',      // Z 🆕 수정
    '',           // AA (자재비 병합)
    '노무비',      // AB 🆕 수정
    '',           // AC (노무비 병합)
    '경비',        // AD 🆕 수정
    '',           // AE (경비 병합)
    '합계',        // AF 🆕 수정
    '',           // AG (합계 병합)
    '',           // AH (비고 병합)
  ];

  // ✅ Row 6: 세부 헤더 (A, B, C는 빈 값 - Row 4와 병합됨) - 34개
  const row6 = worksheet.getRow(6);
  row6.values = [
    '',           // A (NO 병합)
    '',           // B (구분 병합)
    '',           // C (품명 및 규격 병합)
    '',           // D (THK 병합)
    '',           // E (Type 병합)
    '',           // F (@ 병합)
    '',           // G (두께 병합)
    '',           // H (넓이 병합)
    '',           // I (높이 병합)
    '',           // J (단위 병합) 🆕 추가
    '',           // K (수량 병합) 🆕 수정
    '',           // L (제공자 병합) 🆕 수정
    '',           // M (1장->m2 병합) 🆕 수정
    '',           // N (장 병합) 🆕 수정
    '',           // O (단위 병합)
    '',           // P (수량 병합)
    '단가',        // Q 🆕 수정
    '금액',        // R 🆕 수정
    '단가',        // S 🆕 수정
    '금액',        // T 🆕 수정
    '단가',        // U 🆕 수정
    '금액',        // V 🆕 수정
    '단가',        // W 🆕 수정
    '금액',        // X 🆕 수정
    '',           // Y (비고 병합)
    '단가',        // Z 🆕 수정
    '금액',        // AA 🆕 수정
    '단가',        // AB 🆕 수정
    '금액',        // AC 🆕 수정
    '단가',        // AD 🆕 수정
    '금액',        // AE 🆕 수정
    '단가',        // AF 🆕 수정
    '금액',        // AG 🆕 수정
    '',           // AH (비고 병합)
  ];

  // ✅ 병합 (4~6행으로 변경) - 33개 컬럼
  worksheet.mergeCells('A4:A6'); // NO (4,5,6 row 병합)
  worksheet.mergeCells('B4:B6'); // 구분 (4,5,6 row 병합)
  worksheet.mergeCells('C4:C6'); // 품명 및 규격 (4,5,6 row 병합)
  worksheet.mergeCells('D4:E4'); // WALL (2개)
  worksheet.mergeCells('F4:K4'); // 개수 (6개: @, 두께, 넓이, 높이, 단위, 수량) 🆕 수정
  worksheet.mergeCells('L4:N4'); // 환산 (3개: 제공자, 1장->m2, 장) 🆕 수정
  worksheet.mergeCells('O4:O6'); // 단위 (4,5,6 row 병합) 🆕 수정
  worksheet.mergeCells('P4:P6'); // 수량 (4,5,6 row 병합) 🆕 수정
  worksheet.mergeCells('Q4:X4'); // 계약도급 (8개: 자재비2 + 노무비2 + 경비2 + 합계2) 🆕 수정
  worksheet.mergeCells('Y4:Y6'); // 비고 (4,5,6 row 병합) 🆕 수정
  worksheet.mergeCells('Z4:AG4'); // 발주단가 (8개: 자재비2 + 노무비2 + 경비2 + 합계2) 🆕 수정
  worksheet.mergeCells('AH4:AH6'); // 비고 (4,5,6 row 병합) 🆕 수정

  // Row 5와 Row 6 병합
  worksheet.mergeCells('D5:D6'); // THK
  worksheet.mergeCells('E5:E6'); // Type
  worksheet.mergeCells('F5:F6'); // @
  worksheet.mergeCells('G5:G6'); // 두께
  worksheet.mergeCells('H5:H6'); // 넓이
  worksheet.mergeCells('I5:I6'); // 높이
  worksheet.mergeCells('J5:J6'); // 단위 🆕 추가
  worksheet.mergeCells('K5:K6'); // 수량 🆕 수정
  worksheet.mergeCells('L5:L6'); // 제공자 🆕 수정
  worksheet.mergeCells('M5:M6'); // 1장->m2 🆕 수정
  worksheet.mergeCells('N5:N6'); // 장 🆕 수정
  worksheet.mergeCells('Q5:R5'); // 계약도급 - 자재비 🆕 수정
  worksheet.mergeCells('S5:T5'); // 계약도급 - 노무비 🆕 수정
  worksheet.mergeCells('U5:V5'); // 계약도급 - 경비 🆕 수정
  worksheet.mergeCells('W5:X5'); // 계약도급 - 합계 🆕 수정
  worksheet.mergeCells('Z5:AA5'); // 발주단가 - 자재비 🆕 수정
  worksheet.mergeCells('AB5:AC5'); // 발주단가 - 노무비 🆕 수정
  worksheet.mergeCells('AD5:AE5'); // 발주단가 - 경비 🆕 수정
  worksheet.mergeCells('AF5:AG5'); // 발주단가 - 합계 🆕 수정

  // ✅ 헤더 스타일 적용 (폰트 크기 12) - Row 4, 5, 6
  [row4, row5, row6].forEach((row) => {
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD0D0D0' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
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
  siteRow.values = [
    '1',
    siteName,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];

  // 현장명 행 스타일 적용
  siteRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  currentRow++;

  // 타입별로 그룹핑
  const groupedByType = groupResultsByType(calculationResults);
  let typeIndex = 1;
  let layerNumber = 1; // 전체 행 번호 추적

  // 각 타입별 처리
  for (const [typeName, results] of Object.entries(groupedByType)) {
    console.log(`📋 Excel 타입 처리: ${typeName} (${results.length}개 벽체)`);

    const totalArea = results.reduce((sum, r) => sum + r.area, 0);

    // 1. 타입 합계 행 추가
    const summaryRowData = await generateTypeSummaryRowData(
      typeName,
      results,
      typeIndex
    );
    const summaryRow = worksheet.getRow(currentRow);
    summaryRow.values = summaryRowData;

    // 타입 합계 행 스타일 (굵은 글씨, 배경색, 폰트 11)
    summaryRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9370DB' }, // 보라색
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // ✅ 숫자 포맷: 수량(P)은 소수점 2자리, 단가/금액(Q~X, Z~AG)은 정수
      if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
        if (colNumber === 16) {
          cell.numFmt = '#,##0';
        } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
          cell.numFmt = '#,##0';
        }
      }
    });
    currentRow++;

    // 2. 직접비 구성품 수집 및 그룹핑 (HTML 로직과 동일)
    console.log(`📦 Excel: collectAndGroupComponents() 호출 중...`);
    const groupedComponents = await collectAndGroupComponents(results);
    console.log(`✅ Excel: 그룹핑 완료: ${groupedComponents.length}개 구성품`);

    // 3. 직접비/간접비 분리
    const { directCosts, indirectCosts } =
      separateDirectAndIndirectCosts(groupedComponents);

    // 4. 직접비 정렬
    const sortedDirectCosts = sortComponents(directCosts);

    // 4-1. 석고보드 displayQuantity 계산
    let gypsumBoardQty = null;
    for (const comp of sortedDirectCosts) {
      if (isGypsumBoard(comp.name)) {
        gypsumBoardQty = comp.area * comp.quantity;
        console.log(
          `📦 Excel 석고보드 수량: ${comp.area} × ${comp.quantity} = ${gypsumBoardQty}`
        );
        break;
      }
    }

    // 4-2. 모든 구성품에 석고보드 수량 전달하고 행 추가
    const directCostStartRow = currentRow;
    let studDirectStartRow = null; // 스터드 직접비 시작 행 추적
    let studDirectEndRow = null; // 스터드 직접비 끝 행 추적
    const gypsumDirectStartRows = new Map(); // 석고보드 타입별 직접비 시작 행 (unitPriceId -> row)
    const gypsumDirectEndRows = new Map(); // 석고보드 타입별 직접비 끝 행 (unitPriceId -> row)
    const glassWoolDirectStartRows = new Map(); // 그라스울 타입별 직접비 시작 행 (unitPriceId -> row)
    const glassWoolDirectEndRows = new Map(); // 그라스울 타입별 직접비 끝 행 (unitPriceId -> row)

    for (const comp of sortedDirectCosts) {
      comp.gypsumBoardDisplayQuantity = gypsumBoardQty;

      // ✅ unitPriceItem의 첫 번째 구성품으로 카테고리 판단
      let categoryType = null;
      if (comp.unitPriceItem && comp.unitPriceItem.components) {
        const firstComponent = comp.unitPriceItem.components.find(c => shouldDisplayComponent(c.name));
        const firstComponentName = firstComponent?.name || '';

        if (isStud(firstComponentName) || isRunner(firstComponentName)) {
          categoryType = 'STUD';
        } else if (isGypsumBoard(firstComponentName)) {
          categoryType = '석고보드';
        } else if (isGlassWool(firstComponentName)) {
          categoryType = '그라스울';
        }
      }

      // 스터드 직접비 시작/끝 행 기록 (같은 unitPriceItem의 모든 구성품 포함)
      if (categoryType === 'STUD') {
        if (studDirectStartRow === null) {
          studDirectStartRow = currentRow;
        }
        studDirectEndRow = currentRow; // 계속 업데이트하여 마지막 행 추적
      }

      // 석고보드 직접비 시작/끝 행 기록 (unitPriceId별, 모든 구성품 포함)
      if (categoryType === '석고보드' && comp.unitPriceItem) {
        const unitPriceId = comp.unitPriceItem.id;
        if (!gypsumDirectStartRows.has(unitPriceId)) {
          gypsumDirectStartRows.set(unitPriceId, currentRow);
        }
        gypsumDirectEndRows.set(unitPriceId, currentRow); // 계속 업데이트하여 마지막 행 추적
      }

      // 그라스울 직접비 시작/끝 행 기록 (unitPriceId별, 모든 구성품 포함)
      if (categoryType === '그라스울' && comp.unitPriceItem) {
        const unitPriceId = comp.unitPriceItem.id;
        if (!glassWoolDirectStartRows.has(unitPriceId)) {
          glassWoolDirectStartRows.set(unitPriceId, currentRow);
        }
        glassWoolDirectEndRows.set(unitPriceId, currentRow); // 계속 업데이트하여 마지막 행 추적
      }

      const rowData = await generateComponentRowDataFromGrouped(
        comp,
        layerNumber,
        currentRow
      );
      const dataRow = worksheet.getRow(currentRow);
      dataRow.values = rowData;

      // 데이터 행 스타일 적용 (폰트 11)
      dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { size: 11 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // 정렬
        if (colNumber === 1) {
          // NO: 중앙 정렬
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 2 || colNumber === 3) {
          // 구분, 품명 및 규격: 왼쪽 정렬
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if (
          (colNumber >= 17 && colNumber <= 24) ||
          (colNumber >= 26 && colNumber <= 33)
        ) {
          // ✅ 단가/금액 컬럼 (Q~X, Z~AG): 오른쪽 정렬
          // Q(17): 자재비단가, R(18): 자재비금액
          // S(19): 노무비단가, T(20): 노무비금액
          // U(21): 경비단가, V(22): 경비금액
          // W(23): 합계단가, X(24): 합계금액
          // Z(26): 발주단가 자재비단가, AA(27): 발주단가 자재비금액
          // AB(28): 발주단가 노무비단가, AC(29): 발주단가 노무비금액
          // AD(30): 발주단가 경비단가, AE(31): 발주단가 경비금액
          // AF(32): 발주단가 합계단가, AG(33): 발주단가 합계금액
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // ✅ 숫자 포맷 (천단위 콤마) - 확장된 범위 (34개 컬럼)
        // G(7): 두께 - 소수점 1자리
        // H(8), I(9), K(11): 넓이, 높이, M - 정수
        // N(14): 장 수량 - 정수
        // P(16): 수량 - 소수점 2자리
        // Q,S,U,W(17,19,21,23): 계약도급 단가 - 소수점 1자리
        // R,T,V,X(18,20,22,24): 계약도급 금액 - 정수
        // Z~AG(26~33): 발주단가 - 정수
        // 수식 셀과 값 셀 모두 포맷 적용
        if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
          if (colNumber === 7) {
            // 두께: 소수점 1자리 표시
            cell.numFmt = '0.0';
          } else if (colNumber === 11) {
            // K열 (M 수량): 용접봉은 소수점 표시, 나머지는 정수만 표시
            if (isWeldingRod(comp.name)) {
              cell.numFmt = '#,##0.##'; // 용접봉: 소수점 표시
            } else {
              cell.numFmt = '#,##0'; // 나머지: 정수만 표시
            }
          } else if (colNumber === 16) {
            // 수량: 소수점 2자리 표시
            cell.numFmt = '#,##0';
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            // 모든 단가와 금액: 정수
            cell.numFmt = '#,##0';
          } else if ((colNumber >= 8 && colNumber <= 9) || colNumber === 14) {
            // 두께, 넓이, 제공자: 소수점 2자리
            cell.numFmt = '#,##0';
          }
        }
      });

      currentRow++;
      layerNumber++;
    }
    const directCostEndRow = currentRow - 1;

    // 5. 직접비 소계 행 추가
    const directSubtotalRowData = generateDirectCostSubtotalRowData(
      '소계 (직접자재)',
      layerNumber,
      currentRow,
      directCostStartRow,
      directCostEndRow
    );
    const directSubtotalRow = worksheet.getRow(currentRow);
    directSubtotalRow.values = directSubtotalRowData;

    // 직접비 소계 행 스타일 (연두색 배경)
    directSubtotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4EDDA' }, // 연두색
      };

      // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
      if (colNumber === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // ✅ 숫자 포맷: 모든 단가와 금액은 정수
      if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
        if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
          cell.numFmt = '#,##0';
        }
      }
    });

    const directSubtotalRowNumber = currentRow;
    currentRow++;
    layerNumber++;

    // 6. 간접비 및 단수정리 행 추가 (HTML 로직과 동일)
    const indirectCostStartRow = currentRow;
    const roundingRowNumbers = []; // 자재별 단수정리 행 번호 추적

    // 구성품을 카테고리별로 분류 (스터드, 석고보드, 그라스울)
    const categorizedCosts = {
      STUD: [],
      '석고보드': {},
      '그라스울': {},
    };

    // results[0]의 layerPricing을 순회하여 구성품 수집
    const result = results[0];
    const layerOrder = [
      'layer3_1',
      'layer2_1',
      'layer1_1',
      'column1',
      'infill',
      'layer1_2',
      'layer2_2',
      'layer3_2',
      'column2',
      'channel',
      'runner',
    ];

    for (const layerKey of layerOrder) {
      const layer = result.layerPricing[layerKey];
      if (!layer || !layer.materialName) continue;

      const unitPriceItem = await findUnitPriceItemByIdOrName(
        layer.materialName
      );

      if (
        unitPriceItem &&
        unitPriceItem.components &&
        unitPriceItem.components.length > 0
      ) {
        // ✅ unitPriceItem의 첫 번째 구성품으로 카테고리 판단
        const firstComponent = unitPriceItem.components.find(c => shouldDisplayComponent(c.name));
        const firstComponentName = firstComponent?.name || '';

        // 카테고리 타입 결정
        let categoryType = null;
        let unitPriceId = unitPriceItem.id;

        if (isStud(firstComponentName) || isRunner(firstComponentName)) {
          categoryType = 'STUD';
        } else if (isGypsumBoard(firstComponentName)) {
          categoryType = '석고보드';
        } else if (isGlassWool(firstComponentName)) {
          categoryType = '그라스울';
        }

        // ✅ 같은 unitPriceItem의 모든 구성품을 같은 카테고리로 분류
        for (const component of unitPriceItem.components) {
          if (!shouldDisplayComponent(component.name)) continue;

          const materialData = await findMaterialByIdInDB(
            component.materialId
          );

          const comp = {
            name: component.name,
            materialPrice: component.materialPrice || 0,
            laborAmount: component.laborPrice || 0,
            quantity: component.quantity || 0,
            area: totalArea,
            unitPriceItem: unitPriceItem,
            materialData: materialData,
          };

          // 카테고리에 추가
          if (categoryType === 'STUD') {
            categorizedCosts['STUD'].push(comp);
          } else if (categoryType === '석고보드') {
            if (!categorizedCosts['석고보드'][unitPriceId]) {
              categorizedCosts['석고보드'][unitPriceId] = [];
            }
            categorizedCosts['석고보드'][unitPriceId].push(comp);
          } else if (categoryType === '그라스울') {
            if (!categorizedCosts['그라스울'][unitPriceId]) {
              categorizedCosts['그라스울'][unitPriceId] = [];
            }
            categorizedCosts['그라스울'][unitPriceId].push(comp);
          }
        }
      }
    }

    // 3. 스터드 간접비 계산 및 추가
    // studDirectStartRow는 위에서 추적됨
    let studMaterialTotal = 0;
    let studLaborTotal = 0;

    for (const comp of categorizedCosts['STUD']) {
      const materialPricePerM2 = comp.materialPrice * comp.quantity;
      const laborPricePerM2 = comp.laborAmount;
      studMaterialTotal += materialPricePerM2 * comp.area;
      studLaborTotal += laborPricePerM2 * comp.area;
    }

    let studIndirectCosts = [];
    if (categorizedCosts['STUD'].length > 0) {
      const studUnitPriceItem = categorizedCosts['STUD'][0]?.unitPriceItem;
      const studFixedRates = studUnitPriceItem?.fixedRates || {
        materialLoss: 3,
        transportCost: 1.5,
        materialProfit: 15,
        toolExpense: 2,
      };

      studIndirectCosts = calculateIndirectCosts(
        '스터드',
        studMaterialTotal,
        studLaborTotal,
        studFixedRates,
        studUnitPriceItem,
        totalArea
      );

      // 스터드 간접비 행 추가
      const studIndirectStartRow = currentRow;
      for (const item of studIndirectCosts) {
        const indirectRowData = generateIndirectCostRowData(
          item,
          layerNumber,
          totalArea,
          currentRow
        );
        const indirectRow = worksheet.getRow(currentRow);
        indirectRow.values = indirectRowData;

        // 간접비 행 스타일 (노란색 배경)
        indirectRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFCD' }, // 노란색
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
      }

      // 스터드 단수정리 행 추가
      if (studIndirectCosts.length > 0) {
        const studIndirectEndRow = currentRow - 1;
        // ✅ HTML과 동일한 계산을 위한 파라미터 준비
        const roundingData = studUnitPriceItem?.totalCosts?.rounding || {
          material: 0,
          labor: 0,
          expense: 0,
          total: studUnitPriceItem?.totalCosts?.roundingPerM2 || 0
        };
        const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
        const roundingRowData = generateMaterialRoundingRowData(
          '스터드',
          layerNumber,
          currentRow,
          roundingData,            // 단수정리 데이터 객체
          totalArea,               // 면적
          contractRatio            // 조정비율
        );
        const roundingRow = worksheet.getRow(currentRow);
        roundingRow.values = roundingRowData;

        // 단수정리 행 스타일 (회색 배경)
        roundingRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }, // 회색
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
        roundingRowNumbers.push(currentRow - 1); // 스터드 단수정리 행 번호 추가
      }
    }

    // 4. 석고보드 타입별 간접비 및 단수정리 추가
    for (const [unitPriceId, gypsumGroup] of Object.entries(
      categorizedCosts['석고보드']
    )) {
      const gypsumUnitPriceItem = gypsumGroup[0]?.unitPriceItem;
      const categoryName =
        gypsumUnitPriceItem?.basic
          ? `${gypsumUnitPriceItem.basic.itemName} ${gypsumUnitPriceItem.basic.size}`
          : gypsumGroup[0]?.name || '석고보드';

      let gypsumMaterialTotal = 0;
      let gypsumLaborTotal = 0;
      // ✅ 면적은 그룹 내 모든 구성품의 합산 (그룹핑된 수량 반영)
      const gypsumArea = gypsumGroup.reduce((sum, comp) => sum + comp.area, 0);

      for (const comp of gypsumGroup) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;
        gypsumMaterialTotal += materialPricePerM2 * comp.area;
        gypsumLaborTotal += laborPricePerM2 * comp.area;
      }

      const gypsumFixedRates = gypsumUnitPriceItem?.fixedRates || {
        materialLoss: 5,
        transportCost: 1.5,
        materialProfit: 15,
        toolExpense: 0,
      };

      const gypsumIndirectCosts = calculateIndirectCosts(
        categoryName,
        gypsumMaterialTotal,
        gypsumLaborTotal,
        gypsumFixedRates,
        gypsumUnitPriceItem,
        gypsumArea
      );

      // 석고보드 간접비 행 추가
      const gypsumDirectStartRow = gypsumDirectStartRows.get(unitPriceId) || currentRow; // 추적된 직접비 시작 행 사용
      const gypsumIndirectStartRow = currentRow;
      for (const item of gypsumIndirectCosts) {
        const indirectRowData = generateIndirectCostRowData(
          item,
          layerNumber,
          totalArea,
          currentRow
        );
        const indirectRow = worksheet.getRow(currentRow);
        indirectRow.values = indirectRowData;

        // 간접비 행 스타일
        indirectRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFCD' },
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
      }

      // 석고보드 단수정리 행 추가
      if (gypsumIndirectCosts.length > 0) {
        const gypsumIndirectEndRow = currentRow - 1;
        const gypsumDirectEndRow = gypsumDirectEndRows.get(unitPriceId) || gypsumDirectStartRow; // 추적된 직접비 끝 행 사용
        // ✅ HTML과 동일한 계산을 위한 파라미터 준비
        const roundingData = gypsumUnitPriceItem?.totalCosts?.rounding || {
          material: 0,
          labor: 0,
          expense: 0,
          total: gypsumUnitPriceItem?.totalCosts?.roundingPerM2 || 0
        };
        const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
        const roundingRowData = generateMaterialRoundingRowData(
          categoryName,
          layerNumber,
          currentRow,
          roundingData,            // 단수정리 데이터 객체
          gypsumArea,              // 면적 (타입별 면적 합산)
          contractRatio            // 조정비율
        );
        const roundingRow = worksheet.getRow(currentRow);
        roundingRow.values = roundingRowData;

        // 단수정리 행 스타일
        roundingRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
        roundingRowNumbers.push(currentRow - 1); // 석고보드 단수정리 행 번호 추가
      }
    }

    // 5. 그라스울 타입별 간접비 및 단수정리 추가
    for (const [unitPriceId, glassWoolGroup] of Object.entries(
      categorizedCosts['그라스울']
    )) {
      const glassWoolUnitPriceItem = glassWoolGroup[0]?.unitPriceItem;
      const categoryName =
        glassWoolUnitPriceItem?.basic
          ? `${glassWoolUnitPriceItem.basic.itemName || '그라스울'} ${glassWoolUnitPriceItem.basic.size || ''}`
          : glassWoolGroup[0]?.name || '그라스울';

      let glassWoolMaterialTotal = 0;
      let glassWoolLaborTotal = 0;
      // ✅ 면적은 그룹 내 모든 구성품의 합산 (그룹핑된 수량 반영)
      const glassWoolArea = glassWoolGroup.reduce((sum, comp) => sum + comp.area, 0);

      for (const comp of glassWoolGroup) {
        const materialPricePerM2 = comp.materialPrice * comp.quantity;
        const laborPricePerM2 = comp.laborAmount;
        glassWoolMaterialTotal += materialPricePerM2 * comp.area;
        glassWoolLaborTotal += laborPricePerM2 * comp.area;
      }

      const glassWoolFixedRates = glassWoolUnitPriceItem?.fixedRates || {
        materialLoss: 3,
        transportCost: 1.5,
        materialProfit: 15,
        toolExpense: 0,
      };

      const glassWoolIndirectCosts = calculateIndirectCosts(
        categoryName,
        glassWoolMaterialTotal,
        glassWoolLaborTotal,
        glassWoolFixedRates,
        glassWoolUnitPriceItem,
        glassWoolArea
      );

      // 그라스울 간접비 행 추가
      const glassWoolDirectStartRow = glassWoolDirectStartRows.get(unitPriceId) || currentRow; // 추적된 직접비 시작 행 사용
      const glassWoolIndirectStartRow = currentRow;
      for (const item of glassWoolIndirectCosts) {
        const indirectRowData = generateIndirectCostRowData(
          item,
          layerNumber,
          totalArea,
          currentRow
        );
        const indirectRow = worksheet.getRow(currentRow);
        indirectRow.values = indirectRowData;

        // 간접비 행 스타일
        indirectRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFFCD' },
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
      }

      // 그라스울 단수정리 행 추가
      if (glassWoolIndirectCosts.length > 0) {
        const glassWoolIndirectEndRow = currentRow - 1;
        const glassWoolDirectEndRow = glassWoolDirectEndRows.get(unitPriceId) || glassWoolDirectStartRow; // 추적된 직접비 끝 행 사용
        // ✅ HTML과 동일한 계산을 위한 파라미터 준비
        const roundingData = glassWoolUnitPriceItem?.totalCosts?.rounding || {
          material: 0,
          labor: 0,
          expense: 0,
          total: glassWoolUnitPriceItem?.totalCosts?.roundingPerM2 || 0
        };
        const contractRatio = parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
        const roundingRowData = generateMaterialRoundingRowData(
          categoryName,
          layerNumber,
          currentRow,
          roundingData,            // 단수정리 데이터 객체
          glassWoolArea,           // 면적 (타입별 면적 합산)
          contractRatio            // 조정비율
        );
        const roundingRow = worksheet.getRow(currentRow);
        roundingRow.values = roundingRowData;

        // 단수정리 행 스타일
        roundingRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
        roundingRowNumbers.push(currentRow - 1);
      }
    }

    // 7. 간접비 소계 행 추가
    const indirectCostEndRow = currentRow - 1;
    if (indirectCostEndRow >= indirectCostStartRow) {
      const indirectSubtotalRowData = generateIndirectCostSubtotalRowData(
        '소계 (간접비)',
        layerNumber,
        currentRow,
        indirectCostStartRow,
        indirectCostEndRow,
        roundingRowNumbers  // 단수정리 행 번호 배열 전달
      );
      const indirectSubtotalRow = worksheet.getRow(currentRow);
      indirectSubtotalRow.values = indirectSubtotalRowData;

      // 간접비 소계 행 스타일 (연두색 배경)
      indirectSubtotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { bold: true, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD4EDDA' },
        };

        // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
        if (colNumber === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // ✅ 숫자 포맷: 모든 단가와 금액은 정수
        if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
          if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            // 모든 단가와 금액: 정수
            cell.numFmt = '#,##0';
          }
        }
      });

      const indirectSubtotalRowNumber = currentRow;
      currentRow++;
      layerNumber++;

      // 8. 타입별 단수정리 합계 행 추가
      if (roundingRowNumbers.length > 0) {
        const typeTotalRoundingRowData = generateTypeTotalRoundingRowData(
          '단수정리',
          layerNumber,
          currentRow,
          roundingRowNumbers
        );
        const typeTotalRoundingRow = worksheet.getRow(currentRow);
        typeTotalRoundingRow.values = typeTotalRoundingRowData;

        // 단수정리 합계 행 스타일 (밝은 회색 배경)
        typeTotalRoundingRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { bold: true, size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9C4E1' }, // 밝은 회색
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        const typeTotalRoundingRowNumber = currentRow;
        currentRow++;
        layerNumber++;

        // 9. 전체 합계 행 추가
        const grandTotalRowData = generateGrandTotalRowData(
          '합계',
          layerNumber,
          currentRow,
          directSubtotalRowNumber,
          indirectSubtotalRowNumber,
          typeTotalRoundingRowNumber
        );
        const grandTotalRow = worksheet.getRow(currentRow);
        grandTotalRow.values = grandTotalRowData;

        // 전체 합계 행 스타일 (초록색 배경)
        grandTotalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.font = { bold: true, size: 11 };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF90EE90' }, // 초록색
          };

          // ✅ 정렬: C열은 왼쪽, 금액 컬럼은 오른쪽, 나머지는 중앙
          if (colNumber === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          // ✅ 숫자 포맷: 단가/금액(Q~X, Z~AG)은 정수
          if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
            if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
              cell.numFmt = '#,##0';
            }
          }
        });

        currentRow++;
        layerNumber++;
      }
    }

    typeIndex++;
  }

  console.log(
    `✅ 총 ${currentRow - 7}개 데이터 행 추가 완료 (직접비+소계+간접비+소계+단수정리+합계)`
  );
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
    'layer3_1',
    'layer2_1',
    'layer1_1',
    'column1',
    'infill',
    'layer1_2',
    'layer2_2',
    'layer3_2',
    'column2',
    'channel',
    'runner',
  ];

  if (results.length > 0) {
    const result = results[0];

    for (const layerKey of layerOrder) {
      const layer = result.layerPricing[layerKey];
      if (!layer || !layer.materialName) continue;

      const unitPriceItem = await findUnitPriceItemByIdOrName(
        layer.materialName
      );

      if (unitPriceItem && unitPriceItem.components) {
        for (const component of unitPriceItem.components) {
          const componentName = component.name || '';
          if (!shouldDisplayComponent(componentName)) continue;

          const materialData = await findMaterialByIdInDB(component.materialId);

          // THK 계산
          if (isGypsumBoard(componentName) && materialData?.t) {
            totalThickness += parseFloat(materialData.t) || 0;
          } else if (isStud(componentName) && !studWidthAdded) {
            const studWidth =
              materialData?.w || parseSizeField(materialData?.size).width;
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
  const totalUnitPrice =
    totalMaterialUnitPrice + totalLaborUnitPrice + totalExpenseUnitPrice;
  const totalCost = totalMaterialCost + totalLaborCost + totalExpenseCost;

  // 34개 컬럼 데이터 배열 반환 (HTML TD 순서와 일치)
  return [
    `1-${typeIndex}`, // A: NO
    typeName, // B: 구분
    '', // C: 품명 및 규격
    totalThickness || '', // D: THK
    typeName, // E: Type
    '', // F: @ (개수 그룹)
    '', // G: 두께 (개수 그룹)
    '', // H: 넓이 (개수 그룹)
    '', // I: 높이 (개수 그룹)
    '', // J: 단위 (개수 그룹) - 🆕 ADDED
    '', // K: M (개수 그룹)
    '', // L: 제공자 (환산 그룹)
    '', // M: 1장->m2 (환산 그룹)
    '', // N: 장 (환산 그룹)
    'M2', // O: 단위
    '', // P: 수량 (타입 요약 행은 빈칸)
    '', // Q: 계약도급 자재비 단가 (요약 행은 빈칸)
    '', // R: 계약도급 자재비 금액 (요약 행은 빈칸)
    '', // S: 계약도급 노무비 단가 (요약 행은 빈칸)
    '', // T: 계약도급 노무비 금액 (요약 행은 빈칸)
    '', // U: 계약도급 경비 단가 (요약 행은 빈칸)
    '', // V: 계약도급 경비 금액 (요약 행은 빈칸)
    '', // W: 계약도급 합계 단가 (요약 행은 빈칸)
    '', // X: 계약도급 합계 금액 (요약 행은 빈칸)
    '', // Y: 비고
    '', // Z: 발주단가 자재비 단가 (요약 행은 빈칸)
    '', // AA: 발주단가 자재비 금액 (요약 행은 빈칸)
    '', // AB: 발주단가 노무비 단가 (요약 행은 빈칸)
    '', // AC: 발주단가 노무비 금액 (요약 행은 빈칸)
    '', // AD: 발주단가 경비 단가 (요약 행은 빈칸)
    '', // AE: 발주단가 경비 금액 (요약 행은 빈칸)
    '', // AF: 발주단가 합계 단가 (요약 행은 빈칸)
    '', // AG: 발주단가 합계 금액 (요약 행은 빈칸)
    '', // AH: 비고
  ];
}

/**
 * 레이어 상세 행 데이터 생성 (Excel용)
 * @param {Object} result - 첫 번째 결과 객체
 * @param {Array} allResults - 모든 결과 배열
 * @param {number} startRow - Excel 시작 행 번호
 */
async function generateLayerDetailRowsData(result, allResults, startRow) {
  const layerOrder = [
    'layer3_1',
    'layer2_1',
    'layer1_1',
    'column1',
    'infill',
    'layer1_2',
    'layer2_2',
    'layer3_2',
    'column2',
    'channel',
    'runner',
  ];

  const totalArea = allResults.reduce((sum, r) => sum + (r.area || 0), 0);
  const rows = [];
  let layerNumber = 1;
  let currentExcelRow = startRow; // 실제 Excel 행 번호 추적

  for (const layerKey of layerOrder) {
    const layer = result.layerPricing[layerKey];
    if (!layer || !layer.materialName) continue;

    const unitPriceItem = await findUnitPriceItemByIdOrName(layer.materialName);

    if (
      unitPriceItem &&
      unitPriceItem.components &&
      unitPriceItem.components.length > 0
    ) {
      for (const component of unitPriceItem.components) {
        if (!shouldDisplayComponent(component.name)) continue;

        const rowData = await generateComponentRowData(
          component,
          unitPriceItem,
          result,
          layerNumber,
          totalArea,
          currentExcelRow // 실제 Excel 행 번호 전달
        );
        rows.push(rowData);
        layerNumber++;
        currentExcelRow++; // 행 번호 증가
      }
    }
  }

  return rows;
}

/**
 * 컴포넌트 행 데이터 생성 (Excel용)
 * @param {Object} component - 구성품 객체
 * @param {Object} unitPriceItem - 일위대가 아이템
 * @param {Object} result - 결과 객체
 * @param {number} layerNumber - 레이어 번호
 * @param {number} totalArea - 총 면적
 * @param {number} excelRow - 실제 Excel 행 번호
 */
async function generateComponentRowData(
  component,
  unitPriceItem,
  result,
  layerNumber,
  totalArea,
  excelRow
) {
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
  const supplierInput = document.querySelector(
    `.supplier-input[data-row="${layerNumber}"]`
  );
  if (supplierInput) {
    supplier = supplierInput.value || '';
  }

  const sizeData = parseSizeField(materialData?.size);

  if (isStud(componentName)) {
    // 스터드: @ 컬럼에 간격, M 컬럼에 (소요량 × 면적합계), 개수 단위 반올림
    spacing = basic.spacing || '';
    const quantity = component?.quantity || 0;

    if (materialData) {
      thick = materialData.t || sizeData.thickness || '';
      width = materialData.w || sizeData.width || '';
      height = materialData.h || sizeData.height || '';
      length = Math.round(quantity * totalArea); // M 컬럼: 개수 단위 반올림
    }
  } else if (isRunner(componentName)) {
    // 런너: @ 컬럼 비움, M 컬럼에 (소요량 × 면적합계), 개수 단위 반올림
    spacing = ''; // ✅ 런너는 @ 값 비움
    const quantity = component?.quantity || 0;
    if (materialData) {
      thick = materialData.t || sizeData.thickness || '';
      width = materialData.w || sizeData.width || '';
      height = materialData.h || sizeData.height || '';
      length = Math.round(quantity * totalArea); // M 컬럼: 개수 단위 반올림
    }
  } else if (isGypsumBoard(componentName)) {
    // 석고보드: THK 채우기 (D열), 1장->m2, 장 수량
    // ✅ 두께, 넓이, 높이는 비움 (개수 그룹에 표시 안 함)
    if (materialData) {
      thk = materialData.t || sizeData.thickness || ''; // THK (D열)
      thick = ''; // 두께 비움 (G열)
      width = ''; // 넓이 비움 (H열)
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
    ? parseFloat(contractExpenseInput.value) || 0
    : 0;

  const orderExpenseInput = document.querySelector(
    `.order-expense-price[data-row="${layerNumber}"]`
  );
  const orderExpensePrice = orderExpenseInput
    ? parseFloat(orderExpenseInput.value) || 0
    : 0;

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
    ? parseFloat(orderTotalPriceInput.value) || 0
    : 0;
  const orderTotalCost = orderTotalPrice * totalArea;

  // ✅ 조정비율 가져오기
  const contractRatio =
    parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

  // 34개 컬럼 데이터 배열 반환 (Excel 산식 포함)
  // excelRow는 실제 Excel 행 번호 (호출자로부터 전달받음)

  return [
    layerNumber, // A: NO
    '', // B: 구분
    productName, // C: 품명 및 규격
    thk, // D: THK (석고보드만)
    wallTypeCode, // E: Type
    spacing, // F: @ (스터드/런너만, 개수 그룹)
    thick, // G: 두께 (스터드/런너만, 개수 그룹)
    width, // H: 넓이 (스터드/런너만, 개수 그룹)
    height, // I: 높이 (스터드/런너만, 개수 그룹)
    '', // J: 단위 (개수 그룹)
    length, // K: M (스터드/런너만, 개수 그룹)
    supplier, // L: 제공자 (환산 그룹)
    areaPerSheet, // M: 1장->m2 (석고보드만, 환산 그룹)
    sheets, // N: 장 (석고보드만, 환산 그룹)
    unit, // O: 단위
    finalQuantity, // P: 수량

    // ✅ 계약도급 (Q~X) - 금액 우선 계산 방식 (Round 제거)
    { formula: `=Z${excelRow}*${contractRatio}` }, // Q: 계약도급 자재비 단가 = 발주 단가×비율
    { formula: `=Q${excelRow}*P${excelRow}` }, // R: 계약도급 자재비 금액 = 단가×수량
    { formula: `=AB${excelRow}*${contractRatio}` }, // S: 계약도급 노무비 단가 = 발주 단가×비율
    { formula: `=S${excelRow}*P${excelRow}` }, // T: 계약도급 노무비 금액 = 단가×수량
    { formula: `=AD${excelRow}*${contractRatio}` }, // U: 계약도급 경비 단가 = 발주 단가×비율
    { formula: `=U${excelRow}*P${excelRow}` }, // V: 계약도급 경비 금액 = 단가×수량
    { formula: `=Q${excelRow}+S${excelRow}+U${excelRow}` }, // W: 계약도급 합계 단가 = 자재+노무+경비
    { formula: `=R${excelRow}+T${excelRow}+V${excelRow}` }, // X: 계약도급 합계 금액 = 자재+노무+경비
    '', // Y: 비고

    // ✅ 발주단가 (Z~AG) - Round 함수 제거
    materialPrice, // Z: 발주단가 자재비 단가
    { formula: `=Z${excelRow}*P${excelRow}` }, // AA: 발주단가 자재비 금액 = 단가×수량
    laborPrice, // AB: 발주단가 노무비 단가
    { formula: `=AB${excelRow}*P${excelRow}` }, // AC: 발주단가 노무비 금액 = 단가×수량
    orderExpensePrice, // AD: 발주단가 경비 단가
    { formula: `=AD${excelRow}*P${excelRow}` }, // AE: 발주단가 경비 금액 = 단가×수량
    orderTotalPrice, // AF: 발주단가 합계 단가
    { formula: `=AF${excelRow}*P${excelRow}` }, // AG: 발주단가 합계 금액 = 단가×수량
    '', // AH: 비고
  ];
}

/**
 * 그룹핑된 구성품 행 데이터 생성 (Excel용)
 * HTML의 generateGroupedComponentRow와 동일한 로직
 * @param {Object} comp - 그룹핑된 구성품 객체
 * @param {number} layerNumber - 레이어 번호
 * @param {number} excelRow - 실제 Excel 행 번호
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
async function generateComponentRowDataFromGrouped(comp, layerNumber, excelRow) {
  const contractRatio =
    parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;
  const area = comp.area;
  const componentName = comp.name;
  const materialData = comp.materialData;
  const unitPriceItem = comp.unitPriceItem;

  // WALL 및 개수 컬럼 채우기
  const wallTypeCode = comp.wallType?.wallType || '';
  const sizeData = parseSizeField(comp.size);
  const spacingValue = extractSpacingValue(unitPriceItem?.basic?.spacing);

  let wallThk = '';
  let atValue = '';
  let thicknessValue = '';
  let widthValue = '';
  let heightValue = '';
  let mValue = '';

  // 환산 컬럼: 석고보드만
  let conversionM2 = '';
  let sheetQuantity = '';

  if (isStud(componentName)) {
    atValue = spacingValue || '';
    thicknessValue = sizeData.thickness || '';
    widthValue = sizeData.width || '';
    heightValue = sizeData.height || '';
    mValue = Math.round(comp.quantity * area); // 개수 단위 반올림
  } else if (isRunner(componentName)) {
    atValue = '';
    thicknessValue = sizeData.thickness || '';
    widthValue = sizeData.width || '';
    heightValue = sizeData.height || '';
    mValue = Math.round(comp.quantity * area); // 개수 단위 반올림
  } else if (isGypsumBoard(componentName)) {
    wallThk = materialData?.t || sizeData.thickness || '';
    mValue = '';

    if (materialData) {
      const w = parseFloat(materialData.w) || 0;
      const h = parseFloat(materialData.h) || 0;
      if (w > 0 && h > 0) {
        conversionM2 = ((w / 1000) * (h / 1000)).toFixed(3);
        const m2PerSheet = parseFloat(conversionM2);
        if (m2PerSheet > 0) {
          const gypsumBoardDisplayQuantity =
            comp.gypsumBoardDisplayQuantity || area * comp.quantity;
          sheetQuantity = Math.round(gypsumBoardDisplayQuantity / m2PerSheet);
        }
      }
    }
  } else if (isMagazinePiece(componentName) || isNailingBullet(componentName)) {
    mValue = Math.round(comp.quantity * area); // 개수 단위 반올림
  } else if (isWeldingRod(componentName)) {
    const mValueRaw = (comp.quantity * area).toFixed(2);
    mValue = parseFloat(mValueRaw); // kg 단위 소수점 유지
  }

  // 수량 계산
  let displayQuantity = area;
  if (isGypsumBoard(componentName)) {
    displayQuantity = comp.gypsumBoardDisplayQuantity || area * comp.quantity;
  } else if (comp.parentCategory === '석고보드') {
    displayQuantity = area;
  }

  // 발주단가 - 1m² 단가 (소수점 유지)
  const orderMatPrice =
    comp.materialPricePerM2 ||
    comp.materialPrice * comp.quantity; // 반올림 제거
  const orderLabPrice = comp.laborPricePerM2 || comp.laborAmount; // 반올림 제거

  // ✅ 경비 입력값 가져오기 (HTML에서)
  const contractExpenseInput = document.querySelector(
    `.contract-expense-price[data-row="${layerNumber}"]`
  );
  const contractExpensePrice = contractExpenseInput
    ? parseFloat(contractExpenseInput.value.replace(/,/g, '')) || 0
    : 0;

  const orderExpenseInput = document.querySelector(
    `.order-expense-price[data-row="${layerNumber}"]`
  );
  const orderExpensePrice = orderExpenseInput
    ? parseFloat(orderExpenseInput.value.replace(/,/g, '')) || 0
    : 0;

  // ✅ 제공자 입력값 가져오기 (HTML에서)
  const supplierInput = document.querySelector(
    `.supplier-input[data-row="${layerNumber}"]`
  );
  const supplier = supplierInput ? supplierInput.value : '';

  // 품명 표시
  let displayName = comp.name;
  if (comp.spec) {
    displayName += ` ${comp.spec}`;
  }

  // 34개 컬럼 데이터 배열 반환 (Excel 산식 포함)
  return [
    layerNumber, // A: NO
    '', // B: 구분
    displayName, // C: 품명 및 규격
    wallThk, // D: THK
    wallTypeCode, // E: Type
    atValue, // F: @
    thicknessValue, // G: 두께
    widthValue, // H: 넓이
    heightValue, // I: 높이
    comp.unit, // J: 단위
    mValue, // K: M
    supplier, // L: 제공자 (입력값)
    conversionM2, // M: 1장->m2
    sheetQuantity, // N: 장
    'M2', // O: 단위
    displayQuantity, // P: 수량

    // ✅ 계약도급 (Q~X) - Round 함수 제거
    { formula: `=Z${excelRow}*${contractRatio}` }, // Q: 계약도급 자재비 단가 = 발주 단가×비율
    { formula: `=Q${excelRow}*P${excelRow}` }, // R: 계약도급 자재비 금액 = 단가×수량
    { formula: `=AB${excelRow}*${contractRatio}` }, // S: 계약도급 노무비 단가 = 발주 단가×비율
    { formula: `=S${excelRow}*P${excelRow}` }, // T: 계약도급 노무비 금액 = 단가×수량
    { formula: `=AD${excelRow}*${contractRatio}` }, // U: 계약도급 경비 단가 = 발주 단가×비율
    { formula: `=U${excelRow}*P${excelRow}` }, // V: 계약도급 경비 금액 = 단가×수량
    { formula: `=Q${excelRow}+S${excelRow}+U${excelRow}` }, // W: 계약도급 합계 단가
    { formula: `=R${excelRow}+T${excelRow}+V${excelRow}` }, // X: 계약도급 합계 금액
    '', // Y: 비고

    // ✅ 발주단가 (Z~AG) - Round 함수 제거
    orderMatPrice, // Z: 발주단가 자재비 단가
    { formula: `=Z${excelRow}*P${excelRow}` }, // AA: 발주단가 자재비 금액 = 단가×수량
    orderLabPrice, // AB: 발주단가 노무비 단가
    { formula: `=AB${excelRow}*P${excelRow}` }, // AC: 발주단가 노무비 금액 = 단가×수량
    orderExpensePrice, // AD: 발주단가 경비 단가
    { formula: `=AD${excelRow}*P${excelRow}` }, // AE: 발주단가 경비 금액 = 단가×수량
    { formula: `=Z${excelRow}+AB${excelRow}+AD${excelRow}` }, // AF: 발주단가 합계 단가
    { formula: `=AA${excelRow}+AC${excelRow}+AE${excelRow}` }, // AG: 발주단가 합계 금액
    '', // AH: 비고
  ];
}

/**
 * 간접비 행 데이터 생성 (Excel용)
 * @param {Object} item - 간접비 항목 객체
 * @param {number} layerNumber - 레이어 번호
 * @param {number} totalArea - 총 면적
 * @param {number} excelRow - 실제 Excel 행 번호
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
function generateIndirectCostRowData(item, layerNumber, totalArea, excelRow) {
  const contractRatio =
    parseFloat(document.getElementById('contractRatioInput')?.value) || 1.2;

  // item.area가 있으면 사용, 없으면 totalArea 사용
  const area = item.area || totalArea;

  // 1m² 단가
  const orderUnitPrice = item.unitPrice || 0;

  // 자재비 항목인지 노무비 항목인지 구분
  const isMaterialCost =
    item.name.includes('자재로스') ||
    item.name.includes('운반비') ||
    item.name.includes('이윤');
  const isLaborCost = item.name.includes('공구손료');

  // 34개 컬럼 데이터 배열 반환 (Excel 산식 포함)
  return [
    layerNumber, // A: NO
    '', // B: 구분
    item.name, // C: 품명 및 규격
    '', // D: THK
    '', // E: Type
    '', // F: @
    '', // G: 두께
    '', // H: 넓이
    '', // I: 높이
    item.spec, // J: 단위 - 간접비는 spec (예: %)
    `${item.rate}%`, // K: M - 간접비는 rate (예: 10%)
    '', // L: 제공자
    '', // M: 1장->m2
    '', // N: 장
    'M2', // O: 단위
    area, // P: 수량

    // ✅ 계약도급 (Q~X) - 단가 우선 계산 방식
    isMaterialCost
      ? { formula: `=Z${excelRow}*${contractRatio}` }
      : 0, // Q: 계약도급 자재비 단가 = 발주 단가×비율
    isMaterialCost
      ? { formula: `=Q${excelRow}*P${excelRow}` }
      : 0, // R: 계약도급 자재비 금액 = 단가×수량
    isLaborCost
      ? { formula: `=AB${excelRow}*${contractRatio}` }
      : 0, // S: 계약도급 노무비 단가 = 발주 단가×비율
    isLaborCost
      ? { formula: `=S${excelRow}*P${excelRow}` }
      : 0, // T: 계약도급 노무비 금액 = 단가×수량
    0, // U: 계약도급 경비 단가
    0, // V: 계약도급 경비 금액
    { formula: `=AF${excelRow}*${contractRatio}` }, // W: 계약도급 합계 단가 = 발주 단가×비율
    { formula: `=W${excelRow}*P${excelRow}` }, // X: 계약도급 합계 금액 = 단가×수량
    '', // Y: 비고

    // 발주단가 (Z~AG)
    isMaterialCost ? orderUnitPrice : 0, // Z: 발주단가 자재비 단가
    isMaterialCost
      ? { formula: `=Z${excelRow}*P${excelRow}` }
      : 0, // AA: 발주단가 자재비 금액
    isLaborCost ? orderUnitPrice : 0, // AB: 발주단가 노무비 단가
    isLaborCost
      ? { formula: `=AB${excelRow}*P${excelRow}` }
      : 0, // AC: 발주단가 노무비 금액
    0, // AD: 발주단가 경비 단가
    0, // AE: 발주단가 경비 금액
    orderUnitPrice, // AF: 발주단가 합계 단가
    { formula: `=AF${excelRow}*P${excelRow}` }, // AG: 발주단가 합계 금액
    '', // AH: 비고
  ];
}

/**
 * 직접비 소계 행 데이터 생성 (Excel용)
 * @param {string} label - 라벨 (예: "소계 (직접자재)")
 * @param {number} layerNumber - 레이어 번호
 * @param {number} excelRow - 실제 Excel 행 번호
 * @param {number} startRow - 합계 시작 행
 * @param {number} endRow - 합계 종료 행
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
function generateDirectCostSubtotalRowData(
  label,
  layerNumber,
  excelRow,
  startRow,
  endRow
) {
  // 34개 컬럼 데이터 배열 반환 (Excel 산식 포함)
  return [
    layerNumber, // A: NO
    '', // B: 구분
    label, // C: 품명 및 규격
    '', // D: THK
    '', // E: Type
    '', // F: @
    '', // G: 두께
    '', // H: 넓이
    '', // I: 높이
    '', // J: 단위
    { formula: `=ROUND(SUM(K${startRow}:K${endRow}),0)` }, // K: M (수량 합계, 반올림)
    '', // L: 제공자
    '', // M: 1장->m2
    { formula: `=SUM(N${startRow}:N${endRow})` }, // N: 장 (합계)
    '', // O: 단위
    { formula: `=SUM(P${startRow}:P${endRow})` }, // P: 수량 (합계)

    // 계약도급 (Q~X)
    { formula: `=SUM(Q${startRow}:Q${endRow})` }, // Q: 계약도급 자재비 단가 (합계)
    { formula: `=SUM(R${startRow}:R${endRow})` }, // R: 계약도급 자재비 금액
    { formula: `=SUM(S${startRow}:S${endRow})` }, // S: 계약도급 노무비 단가 (합계)
    { formula: `=SUM(T${startRow}:T${endRow})` }, // T: 계약도급 노무비 금액
    { formula: `=SUM(U${startRow}:U${endRow})` }, // U: 계약도급 경비 단가 (합계)
    { formula: `=SUM(V${startRow}:V${endRow})` }, // V: 계약도급 경비 금액
    { formula: `=SUM(W${startRow}:W${endRow})` }, // W: 계약도급 합계 단가 (합계)
    { formula: `=R${excelRow}+T${excelRow}+V${excelRow}` }, // X: 계약도급 합계 금액
    '', // Y: 비고

    // 발주단가 (Z~AG)
    { formula: `=SUM(Z${startRow}:Z${endRow})` }, // Z: 발주단가 자재비 단가 (합계)
    { formula: `=SUM(AA${startRow}:AA${endRow})` }, // AA: 발주단가 자재비 금액
    { formula: `=SUM(AB${startRow}:AB${endRow})` }, // AB: 발주단가 노무비 단가 (합계)
    { formula: `=SUM(AC${startRow}:AC${endRow})` }, // AC: 발주단가 노무비 금액
    { formula: `=SUM(AD${startRow}:AD${endRow})` }, // AD: 발주단가 경비 단가 (합계)
    { formula: `=SUM(AE${startRow}:AE${endRow})` }, // AE: 발주단가 경비 금액
    { formula: `=SUM(AF${startRow}:AF${endRow})` }, // AF: 발주단가 합계 단가 (합계)
    { formula: `=AA${excelRow}+AC${excelRow}+AE${excelRow}` }, // AG: 발주단가 합계 금액
    '', // AH: 비고
  ];
}

/**
 * 간접비 소계 행 데이터 생성 (Excel용)
 * @param {string} label - 라벨 (예: "소계 (간접비)")
 * @param {number} layerNumber - 레이어 번호
 * @param {number} excelRow - 실제 Excel 행 번호
 * @param {number} startRow - 합계 시작 행
 * @param {number} endRow - 합계 종료 행
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
function generateIndirectCostSubtotalRowData(
  label,
  layerNumber,
  excelRow,
  startRow,
  endRow,
  roundingRowNumbers = []  // 단수정리 행 번호 배열
) {
  // ✅ 단수정리 행 제외를 위한 수식 생성
  // SUM(전체) - SUM(단수정리 행들)
  const roundingRowsFormula = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `Q${row}`).join(',')})`
    : '';
  const roundingRowsFormulaR = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `R${row}`).join(',')})`
    : '';
  const roundingRowsFormulaS = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `S${row}`).join(',')})`
    : '';
  const roundingRowsFormulaT = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `T${row}`).join(',')})`
    : '';
  const roundingRowsFormulaU = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `U${row}`).join(',')})`
    : '';
  const roundingRowsFormulaV = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `V${row}`).join(',')})`
    : '';
  const roundingRowsFormulaW = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `W${row}`).join(',')})`
    : '';
  const roundingRowsFormulaZ = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `Z${row}`).join(',')})`
    : '';
  const roundingRowsFormulaAA = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `AA${row}`).join(',')})`
    : '';
  const roundingRowsFormulaAB = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `AB${row}`).join(',')})`
    : '';
  const roundingRowsFormulaAC = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `AC${row}`).join(',')})`
    : '';
  const roundingRowsFormulaAD = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `AD${row}`).join(',')})`
    : '';
  const roundingRowsFormulaAE = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `AE${row}`).join(',')})`
    : '';
  const roundingRowsFormulaAF = roundingRowNumbers.length > 0
    ? `-SUM(${roundingRowNumbers.map(row => `AF${row}`).join(',')})`
    : '';

  // 34개 컬럼 데이터 배열 반환 (Excel 산식 포함)
  // 간접비 소계는 K, N, P를 빈칸으로 처리
  return [
    layerNumber, // A: NO
    '', // B: 구분
    label, // C: 품명 및 규격
    '', // D: THK
    '', // E: Type
    '', // F: @
    '', // G: 두께
    '', // H: 넓이
    '', // I: 높이
    '', // J: 단위
    '', // K: M (빈칸)
    '', // L: 제공자
    '', // M: 1장->m2
    '', // N: 장 (빈칸)
    '', // O: 단위
    '', // P: 수량 (빈칸)

    // 계약도급 (Q~X) - 단수정리 제외
    { formula: `=SUM(Q${startRow}:Q${endRow})${roundingRowsFormula}` }, // Q: 계약도급 자재비 단가 (합계)
    { formula: `=SUM(R${startRow}:R${endRow})${roundingRowsFormulaR}` }, // R: 계약도급 자재비 금액
    { formula: `=SUM(S${startRow}:S${endRow})${roundingRowsFormulaS}` }, // S: 계약도급 노무비 단가 (합계)
    { formula: `=SUM(T${startRow}:T${endRow})${roundingRowsFormulaT}` }, // T: 계약도급 노무비 금액
    { formula: `=SUM(U${startRow}:U${endRow})${roundingRowsFormulaU}` }, // U: 계약도급 경비 단가 (합계)
    { formula: `=SUM(V${startRow}:V${endRow})${roundingRowsFormulaV}` }, // V: 계약도급 경비 금액
    { formula: `=SUM(W${startRow}:W${endRow})${roundingRowsFormulaW}` }, // W: 계약도급 합계 단가 (합계)
    { formula: `=R${excelRow}+T${excelRow}+V${excelRow}` }, // X: 계약도급 합계 금액
    '', // Y: 비고

    // 발주단가 (Z~AG) - 단수정리 제외
    { formula: `=SUM(Z${startRow}:Z${endRow})${roundingRowsFormulaZ}` }, // Z: 발주단가 자재비 단가 (합계)
    { formula: `=SUM(AA${startRow}:AA${endRow})${roundingRowsFormulaAA}` }, // AA: 발주단가 자재비 금액
    { formula: `=SUM(AB${startRow}:AB${endRow})${roundingRowsFormulaAB}` }, // AB: 발주단가 노무비 단가 (합계)
    { formula: `=SUM(AC${startRow}:AC${endRow})${roundingRowsFormulaAC}` }, // AC: 발주단가 노무비 금액
    { formula: `=SUM(AD${startRow}:AD${endRow})${roundingRowsFormulaAD}` }, // AD: 발주단가 경비 단가 (합계)
    { formula: `=SUM(AE${startRow}:AE${endRow})${roundingRowsFormulaAE}` }, // AE: 발주단가 경비 금액
    { formula: `=SUM(AF${startRow}:AF${endRow})${roundingRowsFormulaAF}` }, // AF: 발주단가 합계 단가 (합계)
    { formula: `=AA${excelRow}+AC${excelRow}+AE${excelRow}` }, // AG: 발주단가 합계 금액
    '', // AH: 비고
  ];
}

/**
 * 타입별 단수정리 합계 행 데이터 생성 (Excel용)
 * @param {string} label - 라벨 (예: "단수정리")
 * @param {number} layerNumber - 레이어 번호
 * @param {number} excelRow - 실제 Excel 행 번호
 * @param {Array<number>} roundingRows - 자재별 단수정리 행 번호 배열
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
function generateTypeTotalRoundingRowData(
  label,
  layerNumber,
  excelRow,
  roundingRows
) {
  // 각 자재별 단수정리 행들의 X, AG 컬럼 합산
  const contractRoundingFormula = roundingRows
    .map((row) => `X${row}`)
    .join('+');
  const orderRoundingFormula = roundingRows.map((row) => `AG${row}`).join('+');

  return [
    layerNumber, // A: NO
    '', // B: 구분
    label, // C: 품명 및 규격
    '', // D: THK
    '', // E: Type
    '', // F: @
    '', // G: 두께
    '', // H: 넓이
    '', // I: 높이
    '', // J: 단위
    '', // K: M
    '', // L: 제공자
    '', // M: 1장->m2
    '', // N: 장
    '', // O: 단위
    '', // P: 수량

    // 계약도급 (Q~X)
    '', // Q: 계약도급 자재비 단가
    '', // R: 계약도급 자재비 금액
    '', // S: 계약도급 노무비 단가
    '', // T: 계약도급 노무비 금액
    '', // U: 계약도급 경비 단가
    '', // V: 계약도급 경비 금액
    '', // W: 계약도급 합계 단가
    { formula: `=${contractRoundingFormula}` }, // X: 계약도급 합계 금액 (자재별 단수정리 합)
    '', // Y: 비고

    // 발주단가 (Z~AG)
    '', // Z: 발주단가 자재비 단가
    '', // AA: 발주단가 자재비 금액
    '', // AB: 발주단가 노무비 단가
    '', // AC: 발주단가 노무비 금액
    '', // AD: 발주단가 경비 단가
    '', // AE: 발주단가 경비 금액
    '', // AF: 발주단가 합계 단가
    { formula: `=${orderRoundingFormula}` }, // AG: 발주단가 합계 금액 (자재별 단수정리 합)
    '', // AH: 비고
  ];
}

/**
 * 전체 합계 행 데이터 생성 (Excel용)
 * @param {string} label - 라벨 (예: "합계")
 * @param {number} layerNumber - 레이어 번호
 * @param {number} excelRow - 실제 Excel 행 번호
 * @param {number} directSubtotalRow - 직접비 소계 행 번호
 * @param {number} indirectSubtotalRow - 간접비 소계 행 번호
 * @param {number} roundingRow - 단수정리 행 번호
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
function generateGrandTotalRowData(
  label,
  layerNumber,
  excelRow,
  directSubtotalRow,
  indirectSubtotalRow,
  roundingRow
) {
  return [
    layerNumber, // A: NO
    '', // B: 구분
    label, // C: 품명 및 규격
    '', // D: THK
    '', // E: Type
    '', // F: @
    '', // G: 두께
    '', // H: 넓이
    '', // I: 높이
    '', // J: 단위
    '', // K: M
    '', // L: 제공자
    '', // M: 1장->m2
    '', // N: 장
    '', // O: 단위
    '', // P: 수량

    // 계약도급 (Q~X)
    { formula: `=Q${directSubtotalRow}+Q${indirectSubtotalRow}` }, // Q: 계약도급 자재비 단가
    { formula: `=R${directSubtotalRow}+R${indirectSubtotalRow}` }, // R: 계약도급 자재비 금액
    { formula: `=S${directSubtotalRow}+S${indirectSubtotalRow}` }, // S: 계약도급 노무비 단가
    { formula: `=T${directSubtotalRow}+T${indirectSubtotalRow}` }, // T: 계약도급 노무비 금액
    { formula: `=U${directSubtotalRow}+U${indirectSubtotalRow}` }, // U: 계약도급 경비 단가
    { formula: `=V${directSubtotalRow}+V${indirectSubtotalRow}` }, // V: 계약도급 경비 금액
    { formula: `=W${directSubtotalRow}+W${indirectSubtotalRow}` }, // W: 계약도급 합계 단가
    { formula: `=X${directSubtotalRow}+X${indirectSubtotalRow}+X${roundingRow}` }, // X: 계약도급 합계 금액
    '', // Y: 비고

    // 발주단가 (Z~AG)
    { formula: `=Z${directSubtotalRow}+Z${indirectSubtotalRow}` }, // Z: 발주단가 자재비 단가
    { formula: `=AA${directSubtotalRow}+AA${indirectSubtotalRow}` }, // AA: 발주단가 자재비 금액
    { formula: `=AB${directSubtotalRow}+AB${indirectSubtotalRow}` }, // AB: 발주단가 노무비 단가
    { formula: `=AC${directSubtotalRow}+AC${indirectSubtotalRow}` }, // AC: 발주단가 노무비 금액
    { formula: `=AD${directSubtotalRow}+AD${indirectSubtotalRow}` }, // AD: 발주단가 경비 단가
    { formula: `=AE${directSubtotalRow}+AE${indirectSubtotalRow}` }, // AE: 발주단가 경비 금액
    { formula: `=AF${directSubtotalRow}+AF${indirectSubtotalRow}` }, // AF: 발주단가 합계 단가
    { formula: `=AG${directSubtotalRow}+AG${indirectSubtotalRow}+AG${roundingRow}` }, // AG: 발주단가 합계 금액
    '', // AH: 비고
  ];
}

/**
 * 자재별 단수정리 행 데이터 생성 (Excel용)
 * @param {string} materialName - 자재 이름 (예: "스터드", "석고보드 9.5T")
 * @param {number} layerNumber - 레이어 번호
 * @param {number} excelRow - 실제 Excel 행 번호
 * @param {object} roundingData - 단수정리 데이터 { material, labor, expense, total }
 * @param {number} area - 면적
 * @param {number} contractRatio - 조정비율
 * @returns {Array} - 34개 컬럼 데이터 배열
 */
function generateMaterialRoundingRowData(
  materialName,
  layerNumber,
  excelRow,
  roundingData,
  area,
  contractRatio
) {
  // ✅ HTML과 동일한 계산 방식
  // 발주단가 단수정리 (1m² 단가)
  const orderMatPrice = roundingData.material || 0;
  const orderLabPrice = roundingData.labor || 0;
  const orderExpPrice = roundingData.expense || 0;
  const orderTotalPrice = roundingData.total || 0;

  // ✅ 발주단가 단수정리 (금액 = 1m² 단가 × 면적, 소수점 유지)
  const orderMatAmount = orderMatPrice * area;  // 소수점 유지
  const orderLabAmount = orderLabPrice * area;   // 소수점 유지
  const orderExpAmount = orderExpPrice * area;   // 소수점 유지
  const orderTotalAmount = orderTotalPrice * area;  // 소수점 유지

  // ✅ 계약도급 단수정리 (1m² 단가 = 발주단가 × 비율, 소수점 2자리)
  const contractMatPrice = Math.round((orderMatPrice * contractRatio) * 100) / 100;
  const contractLabPrice = Math.round((orderLabPrice * contractRatio) * 100) / 100;
  const contractExpPrice = Math.round((orderExpPrice * contractRatio) * 100) / 100;
  const contractTotalPrice = Math.round((orderTotalPrice * contractRatio) * 100) / 100;

  // ✅ 계약도급 단수정리 (금액 = 1m² 단가 × 면적, 소수점 2자리)
  const contractMatAmount = Math.round((contractMatPrice * area) * 100) / 100;
  const contractLabAmount = Math.round((contractLabPrice * area) * 100) / 100;
  const contractExpAmount = Math.round((contractExpPrice * area) * 100) / 100;
  const contractTotalAmount = Math.round((contractTotalPrice * area) * 100) / 100;

  console.log(`📐 Excel: [${materialName}] 단수정리:`);
  console.log(`  발주단가 - 자재비: ${orderMatPrice}원 × ${area.toFixed(2)}m² = ${orderMatAmount.toLocaleString()}원`);
  console.log(`  발주단가 - 노무비: ${orderLabPrice}원 × ${area.toFixed(2)}m² = ${orderLabAmount.toLocaleString()}원`);
  console.log(`  발주단가 - 합계: ${orderTotalPrice}원 × ${area.toFixed(2)}m² = ${orderTotalAmount.toLocaleString()}원`);
  console.log(`  계약도급 - 합계: ${contractTotalPrice}원 × ${area.toFixed(2)}m² = ${contractTotalAmount.toLocaleString()}원 (비율 ${contractRatio})`);

  // 34개 컬럼 데이터 배열 반환 (실제 값 입력)
  return [
    layerNumber, // A: NO
    '', // B: 구분
    `단수정리 (${materialName})`, // C: 품명 및 규격
    '', // D: THK
    '', // E: Type
    '', // F: @
    '', // G: 두께
    '', // H: 넓이
    '', // I: 높이
    '', // J: 단위
    '', // K: M
    '', // L: 제공자
    '', // M: 1장->m2
    '', // N: 장
    '', // O: 단위
    '', // P: 수량

    // ✅ 계약도급 (Q~X) - 자재비/노무비/경비 각각 표시
    contractMatPrice, // Q: 계약도급 자재비 단가
    contractMatAmount, // R: 계약도급 자재비 금액
    contractLabPrice, // S: 계약도급 노무비 단가
    contractLabAmount, // T: 계약도급 노무비 금액
    contractExpPrice, // U: 계약도급 경비 단가
    contractExpAmount, // V: 계약도급 경비 금액
    contractTotalPrice, // W: 계약도급 합계 단가
    contractTotalAmount, // X: 계약도급 합계 금액
    '', // Y: 비고

    // 발주단가 (Z~AG) - 자재비/노무비/경비 각각 표시
    orderMatPrice, // Z: 발주단가 자재비 단가
    orderMatAmount, // AA: 발주단가 자재비 금액
    orderLabPrice, // AB: 발주단가 노무비 단가
    orderLabAmount, // AC: 발주단가 노무비 금액
    orderExpPrice, // AD: 발주단가 경비 단가
    orderExpAmount, // AE: 발주단가 경비 금액
    orderTotalPrice, // AF: 발주단가 합계 단가
    orderTotalAmount, // AG: 발주단가 합계 금액
    '', // AH: 비고
  ];
}

/**
 * 발주서 Excel 스타일 적용
 * 34개 컬럼 기준 (A~AH)
 */
function applyOrderFormExcelStyles(worksheet) {
  // 모든 데이터 행에 테두리 적용
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 3) {
      // 헤더 이후
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // 테두리
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // 정렬
        if (colNumber === 3) {
          // C: 품명 및 규격 - 좌측 정렬
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
          // Q~X (17~24): 계약도급 단가/금액 - 오른쪽 정렬
          // Z~AG (26~33): 발주단가 단가/금액 - 오른쪽 정렬
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          // 나머지 - 가운데 정렬
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // ✅ 숫자 포맷: 모든 단가와 금액은 정수
        // 계약도급: Q(17), S(19), U(21), W(23) = 단가
        //          R(18), T(20), V(22), X(24) = 금액
        // 발주단가: Z(26), AB(28), AD(30), AF(32) = 단가
        //          AA(27), AC(29), AE(31), AG(33) = 금액
        if (cell.value !== null && cell.value !== '' && cell.value !== undefined) {
          if ((colNumber >= 17 && colNumber <= 24) || (colNumber >= 26 && colNumber <= 33)) {
            // 모든 단가와 금액: 정수
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
window.exportEstimate = function () {
  closeExportDropdown();
  exportEstimateToExcel();
};

// ✅ 전역 document click 리스너 제거됨 (toggleExportDropdown 함수에서 동적 관리)
// 이전에는 모든 클릭에 대해 리스너가 실행되었으나, 이제는 드롭다운을 열 때만 등록됨

console.log('✅ wall-cost-calculator.js 로드 완료');
