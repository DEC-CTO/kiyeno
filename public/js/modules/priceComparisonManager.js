// =============================================================================
// 단가비교표 관리 모듈
// =============================================================================

// 전역 데이터 (IndexedDB 사용 안 함, 메모리만 사용)
let priceComparisonData = {
    siteName: '',  // 현장명 (첫 번째 행 품명 칸)
    summaryRow: {  // 2번째 행: 경량공사 요약
        itemName: '경량공사',
        spec: '',
        unit: '식',
        contractQty: 1.00,
        contractPrice: { unitPrice: '', amount: '' },
        orderUnit: '식',
        orderQuantity: 1.00,
        progressPrice: { unitPrice: '', amount: '' },
        progressQuantity: 1.00,
        orderPrice: { unitPrice: '', amount: '' },
        orderQuantity2: 1.00,
        vendors: [
            { name: '업체1', unitPrice: '', amount: '', quantity: '' },
            { name: '업체2', unitPrice: '', amount: '', quantity: '' },
            { name: '업체3', unitPrice: '', amount: '' }
        ],
        remarks: ''
    },
    miscRow: {  // 3번째 행: 공과잡비
        itemName: '공과잡비',
        spec: '',
        unit: '%',
        contractQty: '',
        contractPrice: { unitPrice: '', amount: '' },
        orderUnit: '',
        orderQuantity: '',
        progressPrice: { unitPrice: '', amount: '' },
        progressQuantity: '',
        orderPrice: { unitPrice: '', amount: '' },
        orderQuantity2: '',
        vendors: [
            { name: '업체1', unitPrice: '', amount: '', quantity: '' },
            { name: '업체2', unitPrice: '', amount: '', quantity: '' },
            { name: '업체3', unitPrice: '', amount: '' }
        ],
        remarks: ''
    },
    roundingRow: {  // 4번째 행: 단수정리
        itemName: '단수정리',
        contractPrice: { amount: '' },
        progressPrice: { amount: '' },
        orderPrice: { amount: '' },
        vendors: [
            { name: '업체1', amount: '' },
            { name: '업체2', amount: '' },
            { name: '업체3', amount: '' }
        ]
    },
    subtotalRow: {  // 5번째 행: 합계 (계산됨)
        itemName: '합 계',
        contractPrice: { amount: 0 },
        progressPrice: { amount: 0 },
        orderPrice: { amount: 0 },
        vendors: [
            { name: '업체1', amount: 0 },
            { name: '업체2', amount: 0 },
            { name: '업체3', amount: 0 }
        ]
    },
    detailSections: {  // 상세 아이템 (자재비/노무비)
        materials: [],   // 자재비 아이템 배열
        labor: []        // 노무비 아이템 배열
    },
    finalTotalRow: {  // 최종 계 (자재비+노무비 합계, 계산됨)
        itemName: '계',
        contractPrice: { amount: 0 },
        progressPrice: { amount: 0 },
        orderPrice: { amount: 0 },
        vendors: [
            { name: '업체1', amount: 0 },
            { name: '업체2', amount: 0 },
            { name: '업체3', amount: 0 }
        ]
    },
    items: []  // 기존 호환성 유지 (사용 안 함)
};

// =============================================================================
// 모달 관리
// =============================================================================

/**
 * 단가비교표 모달 열기
 */
function openPriceComparisonModal() {
    console.log('📊 단가비교표 모달 열기');

    // 모달이 없으면 생성
    if (!document.getElementById('priceComparisonModal')) {
        createPriceComparisonModal();
    }

    // 데이터 초기화
    priceComparisonData = {
        siteName: '',
        summaryRow: {
            itemName: '경량공사',
            spec: '',
            unit: '식',
            contractQty: 1.00,
            contractPrice: { unitPrice: '', amount: 5780000 },
            orderUnit: '식',
            orderQuantity: 1.00,
            progressPrice: { unitPrice: '', amount: 4621000 },
            progressQuantity: 1.00,
            orderPrice: { unitPrice: '', amount: 3981000 },
            orderQuantity2: 1.00,
            vendors: [
                { name: '업체1', unitPrice: '', amount: 4277500, quantity: 1.00 },
                { name: '업체2', unitPrice: '', amount: 4277500, quantity: 1.00 },
                { name: '업체3', unitPrice: '', amount: 4277500 }
            ],
            remarks: ''
        },
        miscRow: {
            itemName: '공과잡비',
            spec: '',
            unit: '%',
            contractQty: '',
            contractPrice: { unitPrice: '', amount: '' },
            orderUnit: '',
            orderQuantity: '',
            progressPrice: { unitPrice: '', amount: '' },
            progressQuantity: '',
            orderPrice: { unitPrice: '', amount: '' },
            orderQuantity2: '',
            vendors: [
                { name: '업체1', unitPrice: '', amount: '', quantity: '' },
                { name: '업체2', unitPrice: '', amount: '', quantity: '' },
                { name: '업체3', unitPrice: '', amount: '' }
            ],
            remarks: ''
        },
        roundingRow: {
            itemName: '단수정리',
            contractPrice: { amount: '' },
            progressPrice: { amount: '' },
            orderPrice: { amount: '' },
            vendors: [
                { name: '업체1', amount: '' },
                { name: '업체2', amount: '' },
                { name: '업체3', amount: '' }
            ]
        },
        subtotalRow: {
            itemName: '합 계',
            contractPrice: { amount: 0 },
            progressPrice: { amount: 0 },
            orderPrice: { amount: 0 },
            vendors: [
                { name: '업체1', amount: 0 },
                { name: '업체2', amount: 0 },
                { name: '업체3', amount: 0 }
            ]
        },
        detailSections: {
            materials: [],
            labor: []
        },
        finalTotalRow: {
            itemName: '계',
            contractPrice: { amount: 0 },
            progressPrice: { amount: 0 },
            orderPrice: { amount: 0 },
            vendors: [
                { name: '업체1', amount: 0 },
                { name: '업체2', amount: 0 },
                { name: '업체3', amount: 0 }
            ]
        },
        items: [createEmptyItem(1)]
    };

    // 모달 표시
    const modal = document.getElementById('priceComparisonModal');
    modal.classList.add('active');

    // 테이블 렌더링
    renderPriceComparisonTable();
}

/**
 * 단가비교표 모달 닫기
 */
function closePriceComparisonModal() {
    const modal = document.getElementById('priceComparisonModal');
    if (modal) {
        modal.classList.remove('active');
    }
    console.log('📊 단가비교표 모달 닫기');
}

/**
 * 단가비교표 모달 HTML 생성
 */
function createPriceComparisonModal() {
    const modalHTML = `
        <div id="priceComparisonModal" class="price-comparison-modal">
            <div class="price-comparison-modal-content">
                <!-- 헤더 -->
                <div class="price-comparison-modal-header">
                    <h2><i class="fas fa-chart-bar"></i> 단가비교표</h2>
                    <div class="price-comparison-header-controls">
                        <button class="price-comparison-close-btn" onclick="closePriceComparisonModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- 바디 -->
                <div class="price-comparison-modal-body">
                    <!-- 컨트롤 버튼 -->
                    <div class="price-comparison-controls">
                        <button class="price-comparison-btn price-comparison-btn-info" onclick="exportPriceComparisonToExcel()">
                            <i class="fas fa-file-excel"></i> Excel 내보내기
                        </button>
                    </div>

                    <!-- 테이블 -->
                    <div class="price-comparison-table-wrapper">
                        <table class="price-comparison-table" id="priceComparisonTable">
                            <thead id="priceComparisonTableHead">
                                <!-- JavaScript로 동적 생성 -->
                            </thead>
                            <tbody id="priceComparisonTableBody">
                                <!-- JavaScript로 동적 생성 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =============================================================================
// 데이터 관리
// =============================================================================

/**
 * 빈 항목 생성
 */
function createEmptyItem(no) {
    return {
        no: no,
        itemName: '',           // 품명
        spec: '',               // 규격
        unit: '',               // 단위
        contractQty: '',        // 계약도급수량
        contractPrice: { unitPrice: '', amount: '' },      // 계약도급 (단가, 금액)
        orderUnit: '',                                      // 단위
        orderQuantity: '',                                  // 발주수량
        progressPrice: { unitPrice: '', amount: '' },      // 진행도급 (단가, 금액)
        progressQuantity: '',                               // 수량 (진행도급 다음)
        orderPrice: { unitPrice: '', amount: '' },         // 발주단가 (단가, 금액)
        orderQuantity2: '',                                 // 수량 (발주단가 다음)
        vendors: [
            { name: '업체1', unitPrice: '', amount: '', quantity: '' },
            { name: '업체2', unitPrice: '', amount: '', quantity: '' },
            { name: '업체3', unitPrice: '', amount: '' }
        ],
        supplies: {
            order: { rate: '', amount: 0 },
            vendor1: { rate: '', amount: 0 },
            vendor2: { rate: '', amount: 0 },
            vendor3: { rate: '', amount: 0 }
        },
        expenses: {
            order: '',
            vendor1: '',
            vendor2: '',
            vendor3: ''
        },
        remarks: ''
    };
}


// =============================================================================
// 테이블 렌더링
// =============================================================================

/**
 * 테이블 렌더링
 */
function renderPriceComparisonTable() {
    renderTableHead();
    renderTableBody();
}

/**
 * 테이블 헤더 렌더링
 */
function renderTableHead() {
    const thead = document.getElementById('priceComparisonTableHead');
    const vendorCount = priceComparisonData.items[0]?.vendors.length || 3;

    thead.innerHTML = `
        <tr>
            <th rowspan="2">NO</th>
            <th rowspan="2">품명</th>
            <th rowspan="2">규격</th>
            <th rowspan="2">단위</th>
            <th rowspan="2">계약도급수량</th>
            <th colspan="2">계약도급</th>
            <th rowspan="2">단위</th>
            <th rowspan="2">발주수량</th>
            <th colspan="2">진행도급</th>
            <th rowspan="2">수량</th>
            <th colspan="2">발주단가</th>
            <th rowspan="2">수량</th>
            ${Array.from({ length: vendorCount }, (_, i) => {
                const isLast = i === vendorCount - 1;
                return `<th colspan="2">${priceComparisonData.items[0].vendors[i].name}</th>${isLast ? '' : '<th rowspan="2">수량</th>'}`;
            }).join('')}
            <th rowspan="2">비고</th>
        </tr>
        <tr>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
            <th>단가</th>
            <th>금액</th>
            ${Array.from({ length: vendorCount }, () =>
                '<th>단가</th><th>금액</th>'
            ).join('')}
        </tr>
    `;
}

// =============================================================================
// 테이블 행 렌더링 헬퍼 함수들
// =============================================================================

/**
 * 단수정리 행 렌더링
 */
function renderRoundingRow() {
    const vendorCount = priceComparisonData.roundingRow.vendors.length;
    const row = priceComparisonData.roundingRow;

    return `
        <tr>
            <td></td>
            <td>${row.itemName}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${row.contractPrice.amount || ''}</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${row.progressPrice.amount || ''}</td>
            <td></td>
            <td></td>
            <td class="number-cell">${row.orderPrice.amount || ''}</td>
            <td></td>
            ${row.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === vendorCount - 1;
                return `
                    <td></td>
                    <td></td>
                    ${isLast ? '' : '<td></td>'}
                `;
            }).join('')}
            <td></td>
        </tr>
    `;
}

/**
 * 합계 행 렌더링 (경량공사 + 공과잡비 + 단수정리)
 */
function renderSubtotalRow() {
    const vendorCount = priceComparisonData.subtotalRow.vendors.length;
    const row = priceComparisonData.subtotalRow;

    return `
        <tr style="font-weight: bold; background-color: #e6f2ff;">
            <td></td>
            <td>${row.itemName}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${formatNumber(row.contractPrice.amount)}</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${formatNumber(row.progressPrice.amount)}</td>
            <td></td>
            <td></td>
            <td class="number-cell">${formatNumber(row.orderPrice.amount)}</td>
            <td></td>
            ${row.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === vendorCount - 1;
                return `
                    <td></td>
                    <td></td>
                    ${isLast ? '' : '<td></td>'}
                `;
            }).join('')}
            <td></td>
        </tr>
    `;
}

/**
 * 섹션 구분선 (경량공사 헤더 반복) - 24칸 구조
 */
function renderSectionDivider(title) {
    const vendorCount = priceComparisonData.roundingRow.vendors.length;

    return `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
            <td></td>
            <td>${title}</td>
            ${Array.from({ length: 13 }).map(() => '<td></td>').join('')}
            ${Array.from({ length: vendorCount }, (_, i) => {
                const isLast = i === vendorCount - 1;
                return `<td></td><td></td>${isLast ? '' : '<td></td>'}`;
            }).join('')}
            <td></td>
        </tr>
    `;
}

/**
 * 섹션 헤더 (자재비/노무비)
 */
function renderSectionHeader(title, sectionNo) {
    const vendorCount = priceComparisonData.roundingRow.vendors.length;

    return `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
            <td>${sectionNo}</td>
            <td>${title}</td>
            ${Array.from({ length: 13 }).map(() => '<td></td>').join('')}
            ${Array.from({ length: vendorCount }, (_, i) => {
                const isLast = i === vendorCount - 1;
                return `<td></td><td></td>${isLast ? '' : '<td></td>'}`;
            }).join('')}
            <td></td>
        </tr>
    `;
}

/**
 * 벽체공사 행 렌더링 (NO 컬럼 비어있음)
 */
function renderWorkTypeRow(workType) {
    const vendorCount = priceComparisonData.roundingRow.vendors.length;

    return `
        <tr>
            <td></td>
            <td>${workType}</td>
            ${Array.from({ length: 13 }).map(() => '<td></td>').join('')}
            ${Array.from({ length: vendorCount }, (_, i) => {
                const isLast = i === vendorCount - 1;
                return `<td></td><td></td>${isLast ? '' : '<td></td>'}`;
            }).join('')}
            <td></td>
        </tr>
    `;
}

/**
 * 상세 아이템 행 렌더링 (공종 헤더 없이 순번만)
 * @param {Array} items - 아이템 배열
 * @param {string} type - 'material' 또는 'labor'
 */
function renderDetailItems(items, type) {
    if (!items || items.length === 0) {
        return '';
    }

    let html = '';
    let itemNo = 1;  // 아이템 순번

    items.forEach((item, index) => {
        // isHeader 체크 (하위 호환성 유지)
        if (item.isHeader) {
            return;  // 공종 헤더는 스킵
        }

        // 일반 아이템 (24칸 구조)
        const vendorCount = priceComparisonData.roundingRow.vendors.length;
        html += `
            <tr>
                <td>${itemNo}</td>
                <td>${item.itemName}</td>
                <td>${item.spec || ''}</td>
                <td>${item.unit}</td>
                <td class="number-cell">${formatQuantity(item.quantity)}</td>
                <td class="number-cell">${formatNumber(item.unitPrice)}</td>
                <td class="number-cell">${formatNumber(item.amount)}</td>
                <td>${item.orderUnit || item.unit}</td>
                <td><input type="text" class="order-quantity-input" data-type="${type}" data-index="${index}" value="${item.orderQuantity ? formatNumber(item.orderQuantity) : ''}" style="width: 80px; text-align: right !important;" /></td>
                <td class="number-cell">${formatNumber(item.progressUnitPrice || 0)}</td>
                <td class="number-cell progress-amount" data-type="${type}" data-index="${index}">${formatNumber(item.progressAmount || 0)}</td>
                <td class="number-cell order-price-quantity" data-type="${type}" data-index="${index}">${formatNumber(item.orderPriceQuantity || 0)}</td>
                <td><input type="text" class="order-price-unit-input" data-type="${type}" data-index="${index}" value="${item.orderPriceUnitPrice ? formatNumber(item.orderPriceUnitPrice) : ''}" style="width: 80px; text-align: right !important;" /></td>
                <td class="number-cell order-price-amount" data-type="${type}" data-index="${index}">${formatNumber(item.orderPriceAmount || 0)}</td>
                <td></td>
                ${Array.from({ length: vendorCount }, (_, i) => {
                    const isLast = i === vendorCount - 1;
                    return `<td></td><td></td>${isLast ? '' : '<td></td>'}`;
                }).join('')}
                <td></td>
            </tr>
        `;
        itemNo++;
    });

    return html;
}

// =============================================================================
// 자동 계산 함수들
// =============================================================================

/**
 * 합계 계산 (경량공사 + 공과잡비 + 단수정리)
 */
function calculateSubtotal() {
    const summary = priceComparisonData.summaryRow;
    const misc = priceComparisonData.miscRow;
    const rounding = priceComparisonData.roundingRow;
    const subtotal = priceComparisonData.subtotalRow;

    // 계약도급 금액
    subtotal.contractPrice.amount =
        (parseFloat(summary.contractPrice.amount) || 0) +
        (parseFloat(misc.contractPrice.amount) || 0) +
        (parseFloat(rounding.contractPrice.amount) || 0);

    // 진행도급 금액
    subtotal.progressPrice.amount =
        (parseFloat(summary.progressPrice.amount) || 0) +
        (parseFloat(misc.progressPrice.amount) || 0) +
        (parseFloat(rounding.progressPrice.amount) || 0);

    // 발주단가 금액
    subtotal.orderPrice.amount =
        (parseFloat(summary.orderPrice.amount) || 0) +
        (parseFloat(misc.orderPrice.amount) || 0) +
        (parseFloat(rounding.orderPrice.amount) || 0);

    // 업체별 금액
    for (let i = 0; i < subtotal.vendors.length; i++) {
        subtotal.vendors[i].amount =
            (parseFloat(summary.vendors[i]?.amount) || 0) +
            (parseFloat(misc.vendors[i]?.amount) || 0) +
            (parseFloat(rounding.vendors[i]?.amount) || 0);
    }
}

/**
 * 최종 계 계산 (자재비 + 노무비 합계)
 */
function calculateFinalTotal() {
    const materials = priceComparisonData.detailSections.materials;
    const labor = priceComparisonData.detailSections.labor;
    const finalTotal = priceComparisonData.finalTotalRow;

    // 초기화
    finalTotal.contractPrice.amount = 0;
    finalTotal.progressPrice.amount = 0;
    finalTotal.orderPrice.amount = 0;
    finalTotal.vendors.forEach(v => v.amount = 0);

    // 자재비 합산
    materials.forEach(item => {
        if (!item.isHeader) {
            finalTotal.contractPrice.amount += item.amount || 0;
            finalTotal.progressPrice.amount += item.progressAmount || 0;  // 진행도급 실제 계산
            finalTotal.orderPrice.amount += item.orderPriceAmount || 0;   // 발주단가 실제 계산
        }
    });

    // 노무비 합산
    labor.forEach(item => {
        if (!item.isHeader) {
            finalTotal.contractPrice.amount += item.amount || 0;
            finalTotal.progressPrice.amount += item.progressAmount || 0;  // 진행도급 실제 계산
            finalTotal.orderPrice.amount += item.orderPriceAmount || 0;   // 발주단가 실제 계산
        }
    });

    // 업체별은 계약도급과 동일하게 설정 (단가는 빈칸)
    finalTotal.vendors.forEach(v => v.amount = finalTotal.contractPrice.amount);
}

/**
 * 최종 계 행 렌더링 (자재비 + 노무비 합계) - 24칸 구조
 */
function renderFinalTotalRow() {
    const vendorCount = priceComparisonData.finalTotalRow.vendors.length;
    const row = priceComparisonData.finalTotalRow;

    return `
        <tr style="font-weight: bold; background-color: #d0e8ff;">
            <td></td>
            <td>${row.itemName}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${formatNumber(row.contractPrice.amount)}</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${formatNumber(row.progressPrice.amount)}</td>
            <td></td>
            <td></td>
            <td class="number-cell">${formatNumber(row.orderPrice.amount)}</td>
            <td></td>
            ${row.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === vendorCount - 1;
                return `
                    <td></td>
                    <td></td>
                    ${isLast ? '' : '<td></td>'}
                `;
            }).join('')}
            <td></td>
        </tr>
    `;
}

/**
 * 경량공사 요약 행 렌더링
 */
function renderSummaryRow() {
    return `
        <tr>
            <td></td>
            <td>${priceComparisonData.summaryRow.itemName}</td>
            <td>${priceComparisonData.summaryRow.spec || ''}</td>
            <td>${priceComparisonData.summaryRow.unit}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.summaryRow.contractQty)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.contractPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.contractPrice.amount)}</td>
            <td>${priceComparisonData.summaryRow.orderUnit}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.summaryRow.orderQuantity)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.progressPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.progressPrice.amount)}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.summaryRow.progressQuantity)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.orderPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.orderPrice.amount)}</td>
            <td></td>
            ${priceComparisonData.summaryRow.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === priceComparisonData.summaryRow.vendors.length - 1;
                return `
                    <td></td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
                    ${isLast ? '' : `<td class="number-cell">${formatQuantity(vendor.quantity)}</td>`}
                `;
            }).join('')}
            <td>${priceComparisonData.summaryRow.remarks || ''}</td>
        </tr>
    `;
}

/**
 * 공과잡비 행 렌더링
 */
function renderMiscRow() {
    const progressQuantityValue = priceComparisonData.miscRow.progressQuantity
        ? priceComparisonData.miscRow.progressQuantity.toString().replace('%', '')
        : '';

    return `
        <tr>
            <td></td>
            <td>${priceComparisonData.miscRow.itemName}</td>
            <td>${priceComparisonData.miscRow.spec || ''}</td>
            <td>${priceComparisonData.miscRow.unit}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.miscRow.contractQty)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.contractPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.contractPrice.amount)}</td>
            <td>${priceComparisonData.miscRow.orderUnit || ''}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.miscRow.orderQuantity)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.progressPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.progressPrice.amount)}</td>
            <td><input type="text" class="misc-quantity-input" value="${progressQuantityValue}" style="width: 80px; text-align: right !important;" /></td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.orderPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.orderPrice.amount)}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.miscRow.orderQuantity2)}</td>
            ${priceComparisonData.miscRow.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === priceComparisonData.miscRow.vendors.length - 1;
                return `
                    <td></td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
                    ${isLast ? '' : `<td class="number-cell">${formatQuantity(vendor.quantity)}</td>`}
                `;
            }).join('')}
            <td>${priceComparisonData.miscRow.remarks || ''}</td>
        </tr>
    `;
}

/**
 * 테이블 본문 렌더링
 */
function renderTableBody() {
    const tbody = document.getElementById('priceComparisonTableBody');
    const vendorCount = priceComparisonData.items[0]?.vendors.length || 3;

    // 첫 번째 행: 품명만 입력 가능, 나머지는 빈 칸
    const firstRow = `
        <tr>
            <td></td>
            <td>
                <input type="text" value="${priceComparisonData.siteName || ''}"
                       onchange="updateSiteName(this.value)" placeholder="현장명을 입력하세요">
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
            ${Array.from({ length: vendorCount === 3 ? 8 : vendorCount * 3 + 2 }).map(() => '<td></td>').join('')}
            <td></td>
        </tr>
    `;

    // 나머지 데이터 행들
    const dataRows = priceComparisonData.items.map((item, index) => `
        <!-- 데이터 행 (1줄) -->
        <tr>
            <td>${item.no}</td>
            <td>
                <input type="text" value="${item.itemName}"
                       onchange="updateItemField(${index}, 'itemName', this.value)" placeholder="품명">
            </td>
            <td>
                <input type="text" value="${item.spec}"
                       onchange="updateItemField(${index}, 'spec', this.value)" placeholder="규격">
            </td>
            <td>
                <input type="text" value="${item.unit}"
                       onchange="updateItemField(${index}, 'unit', this.value)" placeholder="단위">
            </td>
            <td>
                <input type="number" value="${item.contractQty}"
                       onchange="updateItemField(${index}, 'contractQty', this.value)" placeholder="계약도급수량">
            </td>
            <td><input type="number" value="${item.contractPrice.unitPrice}"
                       onchange="updateContractPrice(${index}, 'unitPrice', this.value)"></td>
            <td><input type="number" value="${item.contractPrice.amount}"
                       onchange="updateContractPrice(${index}, 'amount', this.value)"></td>
            <td><input type="text" value="${item.orderUnit}"
                       onchange="updateItemField(${index}, 'orderUnit', this.value)"></td>
            <td><input type="number" value="${item.orderQuantity}"
                       onchange="updateItemField(${index}, 'orderQuantity', this.value)"></td>
            <td><input type="number" value="${item.progressPrice.unitPrice}"
                       onchange="updateProgressPrice(${index}, 'unitPrice', this.value)"></td>
            <td><input type="number" value="${item.progressPrice.amount}"
                       onchange="updateProgressPrice(${index}, 'amount', this.value)"></td>
            <td><input type="number" value="${item.progressQuantity}"
                       onchange="updateItemField(${index}, 'progressQuantity', this.value)"></td>
            <td><input type="number" value="${item.orderPrice.unitPrice}"
                       onchange="updateOrderPrice(${index}, 'unitPrice', this.value)"></td>
            <td><input type="number" value="${item.orderPrice.amount}"
                       onchange="updateOrderPrice(${index}, 'amount', this.value)"></td>
            <td><input type="number" value="${item.orderQuantity2}"
                       onchange="updateItemField(${index}, 'orderQuantity2', this.value)"></td>
            ${item.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === item.vendors.length - 1;
                return `
                    <td><input type="number" value="${vendor.unitPrice}"
                               onchange="updateVendor(${index}, ${vIdx}, 'unitPrice', this.value)"></td>
                    <td><input type="number" value="${vendor.amount}"
                               onchange="updateVendor(${index}, ${vIdx}, 'amount', this.value)"></td>
                    ${isLast ? '' : `<td><input type="number" value="${vendor.quantity}"
                               onchange="updateVendor(${index}, ${vIdx}, 'quantity', this.value)"></td>`}
                `;
            }).join('')}
            <td>
                <input type="text" value="${item.remarks}"
                       onchange="updateItemField(${index}, 'remarks', this.value)" placeholder="비고">
            </td>
        </tr>
    `).join('');

    // ===== 새로운 13단계 렌더링 =====
    let html = '';

    // 최종 계 먼저 계산 (자재비+노무비 합계)
    calculateFinalTotal();

    // 경량공사 금액을 자재비+노무비 합계로 설정 (계약도급, 진행도급, 발주단가)
    priceComparisonData.summaryRow.contractPrice.amount =
        priceComparisonData.finalTotalRow.contractPrice.amount;
    priceComparisonData.summaryRow.progressPrice.amount =
        priceComparisonData.finalTotalRow.progressPrice.amount;
    priceComparisonData.summaryRow.orderPrice.amount =
        priceComparisonData.finalTotalRow.orderPrice.amount;

    // 합계 자동 계산 (경량공사 + 공과잡비 + 단수정리)
    calculateSubtotal();

    // 1. 현장명 행
    html += firstRow;

    // 2. 경량공사 행 (함수 호출로 동적 생성 - 업데이트된 값 사용)
    html += renderSummaryRow();

    // 3. 공과잡비 행 (함수 호출로 동적 생성)
    html += renderMiscRow();

    // 4. 단수정리 행
    html += renderRoundingRow();

    // 5. 합계 행 (경량공사 + 공과잡비 + 단수정리)
    html += renderSubtotalRow();

    // 6. 경량공사 헤더 (구분선)
    html += renderSectionDivider('경량공사');

    // 7. 자재비 헤더
    html += renderSectionHeader('자재비', '1-1');

    // 8. 벽체공사 행 (자재비 아래)
    html += renderWorkTypeRow('벽체공사');

    // 9. 자재비 상세 아이템들
    html += renderDetailItems(priceComparisonData.detailSections.materials, 'material');

    // 10. 노무비 헤더
    html += renderSectionHeader('노무비', '1-2');

    // 11. 벽체공사 행 (노무비 아래)
    html += renderWorkTypeRow('벽체공사');

    // 12. 노무비 상세 아이템들
    html += renderDetailItems(priceComparisonData.detailSections.labor, 'labor');

    // 13. 최종 계
    calculateFinalTotal();  // 최종 계 자동 계산
    html += renderFinalTotalRow();

    tbody.innerHTML = html;

    // 발주수량 입력 필드 이벤트 리스너 부착
    attachOrderQuantityListeners();
    attachOrderPriceUnitListeners();
    attachMiscQuantityListener();
}

/**
 * 발주수량 입력 필드에 이벤트 리스너 부착
 */
function attachOrderQuantityListeners() {
    const inputs = document.querySelectorAll('.order-quantity-input');

    inputs.forEach(input => {
        // 입력 시 콤마 포맷 적용
        input.addEventListener('input', function() {
            const type = this.dataset.type;  // 'material' 또는 'labor'
            const index = parseInt(this.dataset.index);

            // 콤마 제거 후 숫자만 추출
            const rawValue = this.value.replace(/,/g, '');

            // 숫자가 아닌 문자 제거 (소수점과 숫자만 허용)
            const cleanValue = rawValue.replace(/[^\d.]/g, '');

            // 소수점이 여러 개 있으면 첫 번째만 유지
            const parts = cleanValue.split('.');
            const formattedValue = parts.length > 1
                ? parts[0] + '.' + parts.slice(1).join('')
                : cleanValue;

            const quantity = parseFloat(formattedValue) || 0;

            // 데이터 모델 업데이트
            const items = type === 'material'
                ? priceComparisonData.detailSections.materials
                : priceComparisonData.detailSections.labor;

            if (items[index]) {
                items[index].orderQuantity = quantity;

                // 커서 위치 저장
                const cursorPos = this.selectionStart;
                const oldLength = this.value.length;

                // 콤마 포맷 적용 (정수 부분만 콤마, 소수점 유지)
                if (formattedValue) {
                    const [intPart, decPart] = formattedValue.split('.');
                    const formattedInt = parseInt(intPart || 0).toLocaleString('ko-KR');
                    this.value = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
                } else {
                    this.value = '';
                }

                // 커서 위치 복원 (콤마 추가로 인한 위치 조정)
                const newLength = this.value.length;
                const newCursorPos = cursorPos + (newLength - oldLength);
                this.setSelectionRange(newCursorPos, newCursorPos);

                // 진행도급 금액 계산: 발주수량 × 진행도급 단가
                const progressAmount = quantity * (items[index].progressUnitPrice || 0);
                items[index].progressAmount = Math.round(progressAmount);

                // UI 업데이트 (해당 항목의 진행도급 금액 셀)
                const amountCell = document.querySelector(`.progress-amount[data-type="${type}"][data-index="${index}"]`);
                if (amountCell) {
                    amountCell.textContent = formatNumber(Math.round(progressAmount));
                }

                // 발주단가 수량 자동 복사 (9번 → 12번)
                items[index].orderPriceQuantity = quantity;

                // 발주단가 금액 재계산: 발주단가 수량 × 발주단가 단가
                const orderPriceAmount = quantity * (items[index].orderPriceUnitPrice || 0);
                items[index].orderPriceAmount = Math.round(orderPriceAmount);

                // UI 업데이트 (12번, 14번 칸)
                const orderQuantityCell = document.querySelector(`.order-price-quantity[data-type="${type}"][data-index="${index}"]`);
                if (orderQuantityCell) {
                    orderQuantityCell.textContent = formatNumber(quantity);
                }

                const orderAmountCell = document.querySelector(`.order-price-amount[data-type="${type}"][data-index="${index}"]`);
                if (orderAmountCell) {
                    orderAmountCell.textContent = formatNumber(Math.round(orderPriceAmount));
                }

                // ✅ 추가: "계" 행 재계산
                calculateFinalTotal();

                // ✅ 추가: 경량공사 행 업데이트 (진행도급 금액)
                priceComparisonData.summaryRow.progressPrice.amount =
                    priceComparisonData.finalTotalRow.progressPrice.amount;

                // ✅ 추가: 합계 행 재계산
                calculateSubtotal();

                // ✅ 추가: "계" 행 UI 업데이트 (진행도급 금액 - 11번째 컬럼)
                const tbody = document.getElementById('priceComparisonTableBody');
                const finalTotalRow = tbody.querySelector('tr:last-child');
                if (finalTotalRow) {
                    const finalTotalCell = finalTotalRow.querySelector('td:nth-child(11)');
                    if (finalTotalCell) {
                        finalTotalCell.textContent = formatNumber(priceComparisonData.finalTotalRow.progressPrice.amount);
                    }
                }

                // ✅ 추가: 경량공사 행 UI 업데이트 (진행도급 금액 - 11번째 컬럼)
                // 경량공사 행은 2번째 행 (firstRow 다음)
                const summaryRow = tbody.querySelector('tr:nth-child(2)');
                if (summaryRow) {
                    const summaryProgressCell = summaryRow.querySelector('td:nth-child(11)');
                    if (summaryProgressCell) {
                        summaryProgressCell.textContent = formatNumber(priceComparisonData.summaryRow.progressPrice.amount);
                    }
                }

                // ✅ 추가: 합계 행 UI 업데이트 (진행도급 금액 - 11번째 컬럼)
                // 합계 행은 5번째 행
                const subtotalRow = tbody.querySelector('tr:nth-child(5)');
                if (subtotalRow) {
                    const subtotalProgressCell = subtotalRow.querySelector('td:nth-child(11)');
                    if (subtotalProgressCell) {
                        subtotalProgressCell.textContent = formatNumber(priceComparisonData.subtotalRow.progressPrice.amount);
                    }
                }
            }
        });
    });
}

/**
 * 발주단가 단가 입력 필드에 이벤트 리스너 부착
 */
function attachOrderPriceUnitListeners() {
    const inputs = document.querySelectorAll('.order-price-unit-input');

    inputs.forEach(input => {
        // 입력 시 콤마 포맷 적용
        input.addEventListener('input', function() {
            const type = this.dataset.type;  // 'material' 또는 'labor'
            const index = parseInt(this.dataset.index);

            // 콤마 제거 후 숫자만 추출
            const rawValue = this.value.replace(/,/g, '');

            // 숫자가 아닌 문자 제거 (소수점과 숫자만 허용)
            const cleanValue = rawValue.replace(/[^\d.]/g, '');

            // 소수점이 여러 개 있으면 첫 번째만 유지
            const parts = cleanValue.split('.');
            const formattedValue = parts.length > 1
                ? parts[0] + '.' + parts.slice(1).join('')
                : cleanValue;

            const unitPrice = parseFloat(formattedValue) || 0;

            // 데이터 모델 업데이트
            const items = type === 'material'
                ? priceComparisonData.detailSections.materials
                : priceComparisonData.detailSections.labor;

            if (items[index]) {
                items[index].orderPriceUnitPrice = unitPrice;

                // 커서 위치 저장
                const cursorPos = this.selectionStart;
                const oldLength = this.value.length;

                // 콤마 포맷 적용 (정수 부분만 콤마, 소수점 유지)
                if (formattedValue) {
                    const [intPart, decPart] = formattedValue.split('.');
                    const formattedInt = parseInt(intPart || 0).toLocaleString('ko-KR');
                    this.value = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
                } else {
                    this.value = '';
                }

                // 커서 위치 복원 (콤마 추가로 인한 위치 조정)
                const newLength = this.value.length;
                const newCursorPos = cursorPos + (newLength - oldLength);
                this.setSelectionRange(newCursorPos, newCursorPos);

                // 발주단가 금액 계산: 발주단가 수량 × 발주단가 단가
                const orderPriceAmount = (items[index].orderPriceQuantity || 0) * unitPrice;
                items[index].orderPriceAmount = Math.round(orderPriceAmount);

                // UI 업데이트 (14번 칸)
                const orderAmountCell = document.querySelector(`.order-price-amount[data-type="${type}"][data-index="${index}"]`);
                if (orderAmountCell) {
                    orderAmountCell.textContent = formatNumber(Math.round(orderPriceAmount));
                }

                // "계" 행 재계산
                calculateFinalTotal();

                // 경량공사 행 업데이트 (발주단가 금액)
                priceComparisonData.summaryRow.orderPrice.amount =
                    priceComparisonData.finalTotalRow.orderPrice.amount;

                // 합계 행 재계산
                calculateSubtotal();

                // "계" 행 UI 업데이트 (발주단가 금액 - 14번째 컬럼)
                const tbody = document.getElementById('priceComparisonTableBody');
                const finalTotalRow = tbody.querySelector('tr:last-child');
                if (finalTotalRow) {
                    const finalTotalCell = finalTotalRow.querySelector('td:nth-child(14)');
                    if (finalTotalCell) {
                        finalTotalCell.textContent = formatNumber(priceComparisonData.finalTotalRow.orderPrice.amount);
                    }
                }

                // 경량공사 행 UI 업데이트 (발주단가 금액 - 14번째 컬럼)
                const summaryRow = tbody.querySelector('tr:nth-child(2)');
                if (summaryRow) {
                    const summaryOrderCell = summaryRow.querySelector('td:nth-child(14)');
                    if (summaryOrderCell) {
                        summaryOrderCell.textContent = formatNumber(priceComparisonData.summaryRow.orderPrice.amount);
                    }
                }

                // 합계 행 UI 업데이트 (발주단가 금액 - 14번째 컬럼)
                const subtotalRow = tbody.querySelector('tr:nth-child(5)');
                if (subtotalRow) {
                    const subtotalOrderCell = subtotalRow.querySelector('td:nth-child(14)');
                    if (subtotalOrderCell) {
                        subtotalOrderCell.textContent = formatNumber(priceComparisonData.subtotalRow.orderPrice.amount);
                    }
                }
            }
        });
    });
}

/**
 * 공과잡비 수량 입력 필드에 이벤트 리스너 부착
 */
function attachMiscQuantityListener() {
    const input = document.querySelector('.misc-quantity-input');
    if (!input) return;

    input.addEventListener('input', function() {
        // 콤마 제거 후 숫자만 추출
        const rawValue = this.value.replace(/,/g, '');

        // 숫자가 아닌 문자 제거 (소수점과 숫자만 허용)
        const cleanValue = rawValue.replace(/[^\d.]/g, '');

        // 소수점이 여러 개 있으면 첫 번째만 유지
        const parts = cleanValue.split('.');
        const formattedValue = parts.length > 1
            ? parts[0] + '.' + parts.slice(1).join('')
            : cleanValue;

        const quantity = parseFloat(formattedValue) || 0;

        // 데이터 모델 업데이트
        priceComparisonData.miscRow.progressQuantity = quantity;

        // 커서 위치 저장
        const cursorPos = this.selectionStart;
        const oldLength = this.value.length;

        // 콤마 포맷 적용 (정수 부분만 콤마, 소수점 유지)
        if (formattedValue) {
            const [intPart, decPart] = formattedValue.split('.');
            const formattedInt = parseInt(intPart || 0).toLocaleString('ko-KR');
            this.value = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
        } else {
            this.value = '';
        }

        // 커서 위치 복원 (콤마 추가로 인한 위치 조정)
        const newLength = this.value.length;
        const newCursorPos = cursorPos + (newLength - oldLength);
        this.setSelectionRange(newCursorPos, newCursorPos);

        // 공과잡비 발주단가 금액 계산: 경량공사 발주단가 금액 × (입력값 ÷ 100)
        const summaryOrderAmount = priceComparisonData.summaryRow.orderPrice.amount || 0;
        const miscOrderAmount = Math.round(summaryOrderAmount * (quantity / 100));
        priceComparisonData.miscRow.orderPrice.amount = miscOrderAmount;

        // 단수정리 계산: (경량공사 + 공과잡비) 발주단가 금액의 만단위 절사
        const totalBeforeRounding = summaryOrderAmount + miscOrderAmount;
        const roundingAmount = totalBeforeRounding % 100000;  // 십만단위 미만 금액
        priceComparisonData.roundingRow.orderPrice.amount = -roundingAmount;  // 음수로 저장

        // 합계 재계산
        calculateSubtotal();

        // UI 업데이트
        const tbody = document.getElementById('priceComparisonTableBody');

        // 공과잡비 14번 칸 업데이트
        const miscRow = tbody.querySelector('tr:nth-child(3)');
        if (miscRow) {
            const miscOrderCell = miscRow.querySelector('td:nth-child(14)');
            if (miscOrderCell) {
                miscOrderCell.textContent = formatNumber(miscOrderAmount);
            }
        }

        // 단수정리 14번 칸 업데이트
        const roundingRow = tbody.querySelector('tr:nth-child(4)');
        if (roundingRow) {
            const roundingOrderCell = roundingRow.querySelector('td:nth-child(14)');
            if (roundingOrderCell) {
                roundingOrderCell.textContent = formatNumber(-roundingAmount);
            }
        }

        // 합계 14번 칸 업데이트
        const subtotalRow = tbody.querySelector('tr:nth-child(5)');
        if (subtotalRow) {
            const subtotalOrderCell = subtotalRow.querySelector('td:nth-child(14)');
            if (subtotalOrderCell) {
                subtotalOrderCell.textContent = formatNumber(priceComparisonData.subtotalRow.orderPrice.amount);
            }
        }
    });
}

// =============================================================================
// 데이터 업데이트 함수들
// =============================================================================

function updateSiteName(value) {
    priceComparisonData.siteName = value;
}

function updateSummaryField(field, value) {
    priceComparisonData.summaryRow[field] = value;
}

function updateSummaryPrice(priceType, field, value) {
    priceComparisonData.summaryRow[priceType][field] = value;
}

function updateSummaryVendor(vendorIndex, field, value) {
    priceComparisonData.summaryRow.vendors[vendorIndex][field] = value;
}

function updateItemField(index, field, value) {
    priceComparisonData.items[index][field] = value;
}

function updateContractPrice(index, field, value) {
    priceComparisonData.items[index].contractPrice[field] = value;
}

function updateProgressPrice(index, field, value) {
    priceComparisonData.items[index].progressPrice[field] = value;
}

function updateOrderPrice(index, field, value) {
    priceComparisonData.items[index].orderPrice[field] = value;
}

function updateVendor(index, vendorIndex, field, value) {
    priceComparisonData.items[index].vendors[vendorIndex][field] = value;
}

function updateSupplyRate(index, column, value) {
    const item = priceComparisonData.items[index];
    item.supplies[column].rate = value;

    // 자동 계산
    let baseAmount = 0;
    if (column === 'order') {
        baseAmount = parseFloat(item.orderPrice.unitPrice) || 0;
    } else {
        const vIdx = parseInt(column.replace('vendor', '')) - 1;
        baseAmount = parseFloat(item.vendors[vIdx]?.unitPrice) || 0;
    }

    const rate = parseFloat(value) || 0;
    item.supplies[column].amount = Math.floor(baseAmount * (rate / 100));

    renderPriceComparisonTable();
}

function updateExpense(index, column, value) {
    priceComparisonData.items[index].expenses[column] = value;
    renderPriceComparisonTable();
}

// =============================================================================
// 계산 함수
// =============================================================================

/**
 * 숫자 포맷 (천단위 쉼표)
 */
/**
 * 금액 포맷 (정수, 천단위 콤마)
 */
function formatNumber(num) {
    if (!num && num !== 0) return '';
    return Math.floor(num).toLocaleString('ko-KR');
}

/**
 * 수량 포맷 (소수점 2자리, 천단위 콤마)
 */
function formatQuantity(num) {
    if (!num && num !== 0) return '';
    return parseFloat(num).toLocaleString('ko-KR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// =============================================================================
// Excel 내보내기
// =============================================================================

/**
 * Excel 파일로 내보내기 - ExcelJS
 */
async function exportPriceComparisonToExcel() {
    // 드롭다운 닫기
    if (typeof window.closeExportDropdown === 'function') {
        window.closeExportDropdown();
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('단가비교표');

        const vendorCount = priceComparisonData.items[0]?.vendors.length || 3;

        // 헤더 행 1 - 타이틀 행
        const headerRow1 = worksheet.addRow([]);
        const row1Num = headerRow1.number;
        let colIdx = 1;

        // 헤더 행 2 - 서브 헤더 (먼저 추가하여 row2Num 확보)
        const headerRow2 = worksheet.addRow([]);
        const row2Num = headerRow2.number;

        // 고정 헤더 (rowspan=2)
        ['NO', '품명', '규격', '단위', '계약도급수량'].forEach(text => {
            const cell = headerRow1.getCell(colIdx);
            cell.value = text;
            worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx); // rowspan=2
            colIdx++;
        });

        // 계약도급 (colspan=2)
        worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
        headerRow1.getCell(colIdx).value = '계약도급';
        colIdx += 2;

        // 단위, 발주수량 (rowspan=2)
        ['단위', '발주수량'].forEach(text => {
            const cell = headerRow1.getCell(colIdx);
            cell.value = text;
            worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
            colIdx++;
        });

        // 진행도급 (colspan=2)
        worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
        headerRow1.getCell(colIdx).value = '진행도급';
        colIdx += 2;

        // 수량 (rowspan=2)
        worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
        headerRow1.getCell(colIdx).value = '수량';
        colIdx++;

        // 발주단가 (colspan=2)
        worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
        headerRow1.getCell(colIdx).value = '발주단가';
        colIdx += 2;

        // 수량 (rowspan=2)
        worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
        headerRow1.getCell(colIdx).value = '수량';
        colIdx++;

        // 업체 컬럼들
        priceComparisonData.items[0].vendors.forEach((vendor, vIdx) => {
            const isLast = vIdx === vendorCount - 1;

            // 모든 업체: 단가+금액 2칸 병합 (먼저 추가)
            worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
            headerRow1.getCell(colIdx).value = vendor.name;
            colIdx += 2;

            if (!isLast) {
                // 업체1,2: 수량(rowspan=2) 나중 추가
                worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
                headerRow1.getCell(colIdx).value = '수량';
                colIdx++;
            }
        });

        // 비고 (rowspan=2)
        worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
        headerRow1.getCell(colIdx).value = '비고';

        // 헤더 행 2 서브헤더 작성
        colIdx = 6; // 계약도급부터 시작

        // 계약도급 서브헤더
        headerRow2.getCell(colIdx++).value = '단가';
        headerRow2.getCell(colIdx++).value = '금액';
        colIdx += 2; // 단위, 발주수량 건너뜀

        // 진행도급 서브헤더
        headerRow2.getCell(colIdx++).value = '단가';
        headerRow2.getCell(colIdx++).value = '금액';
        colIdx++; // 수량 건너뜀

        // 발주단가 서브헤더
        headerRow2.getCell(colIdx++).value = '단가';
        headerRow2.getCell(colIdx++).value = '금액';
        colIdx++; // 수량 건너뜀

        // 업체 서브헤더
        for (let v = 0; v < vendorCount; v++) {
            const isLast = v === vendorCount - 1;
            headerRow2.getCell(colIdx++).value = '단가';
            headerRow2.getCell(colIdx++).value = '금액';
            if (!isLast) {
                colIdx++; // 수량(rowspan=2) 건너뜀
            }
        }

        // 헤더 스타일 적용
        [headerRow1, headerRow2].forEach(row => {
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD3D3D3' }
                };
                cell.font = { bold: true, size: 12 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // 데이터 행 추가 함수
        const addDataRow = (rowData) => {
            let dataColIdx = 1;
            const row = worksheet.addRow([]);

            // 빈 값 처리 함수
            const formatValue = (val) => {
                const num = parseFloat(val);
                return (num && num !== 0) ? num : '';
            };

            // 기본 필드
            row.getCell(dataColIdx++).value = rowData.no || '';
            row.getCell(dataColIdx++).value = rowData.itemName;
            row.getCell(dataColIdx++).value = rowData.spec || '';
            row.getCell(dataColIdx++).value = rowData.unit || '';
            row.getCell(dataColIdx++).value = formatValue(rowData.contractQty);

            // 계약도급
            row.getCell(dataColIdx++).value = formatValue(rowData.contractPrice.unitPrice);
            row.getCell(dataColIdx++).value = formatValue(rowData.contractPrice.amount);

            // 단위, 발주수량
            row.getCell(dataColIdx++).value = rowData.orderUnit || '';
            row.getCell(dataColIdx++).value = formatValue(rowData.orderQuantity);

            // 진행도급
            row.getCell(dataColIdx++).value = formatValue(rowData.progressPrice.unitPrice);
            row.getCell(dataColIdx++).value = formatValue(rowData.progressPrice.amount);

            // 수량
            row.getCell(dataColIdx++).value = formatValue(rowData.progressQuantity);

            // 발주단가
            row.getCell(dataColIdx++).value = formatValue(rowData.orderPrice.unitPrice);
            row.getCell(dataColIdx++).value = formatValue(rowData.orderPrice.amount);

            // 수량2
            row.getCell(dataColIdx++).value = '';  // 항상 빈칸

            // 업체들
            rowData.vendors.forEach((vendor, vIdx) => {
                const isLast = vIdx === vendorCount - 1;
                if (!isLast) {
                    row.getCell(dataColIdx++).value = formatValue(vendor.quantity);
                }
                row.getCell(dataColIdx++).value = formatValue(vendor.unitPrice);
                row.getCell(dataColIdx++).value = formatValue(vendor.amount);
            });

            // 비고
            row.getCell(dataColIdx).value = rowData.remarks || '';

            // 스타일 적용
            row.eachCell((cell, cellColIdx) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                // 숫자 컬럼은 우측 정렬 및 천단위 콤마
                if (cellColIdx >= 5 && cellColIdx !== 4 && cellColIdx !== 8) {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });

            return row;
        };

        // 첫 번째 데이터 행: 현장명
        const siteRow = worksheet.addRow([]);
        siteRow.getCell(2).value = priceComparisonData.siteName || '';
        siteRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 두 번째 행: 경량공사 요약
        addDataRow(priceComparisonData.summaryRow);

        // 세 번째 행: 공과잡비
        addDataRow(priceComparisonData.miscRow);

        // 네 번째 행: 단수정리 (24칸 구조)
        const roundingRow = worksheet.addRow([
            '',  // 1. NO
            priceComparisonData.roundingRow.itemName,  // 2. 품명
            '',  // 3. 규격
            '',  // 4. 단위
            '',  // 5. 계약도급수량
            '',  // 6. 계약도급 단가
            priceComparisonData.roundingRow.contractPrice.amount || '',  // 7. 계약도급 금액
            '',  // 8. 단위
            '',  // 9. 발주수량
            '',  // 10. 진행도급 단가
            priceComparisonData.roundingRow.progressPrice.amount || '',  // 11. 진행도급 금액
            '',  // 12. 수량
            '',  // 13. 발주단가 단가
            priceComparisonData.roundingRow.orderPrice.amount || '',  // 14. 발주단가 금액
            '',  // 15. 수량2
            ...priceComparisonData.roundingRow.vendors.flatMap((v, vIdx) => {
                const isLast = vIdx === priceComparisonData.roundingRow.vendors.length - 1;
                return isLast ? ['', ''] : ['', '', ''];  // 16-23. 업체 3개 (단가, 금액, [수량])
            }),
            ''  // 24. 비고
        ]);
        roundingRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 다섯 번째 행: 합계 (24칸 구조, 파란 배경)
        const subtotalRow = worksheet.addRow([
            '',  // 1. NO
            priceComparisonData.subtotalRow.itemName,  // 2. 품명
            '',  // 3. 규격
            '',  // 4. 단위
            '',  // 5. 계약도급수량
            '',  // 6. 계약도급 단가
            priceComparisonData.subtotalRow.contractPrice.amount || 0,  // 7. 계약도급 금액
            '',  // 8. 단위
            '',  // 9. 발주수량
            '',  // 10. 진행도급 단가
            priceComparisonData.subtotalRow.progressPrice.amount || 0,  // 11. 진행도급 금액
            '',  // 12. 수량
            '',  // 13. 발주단가 단가
            priceComparisonData.subtotalRow.orderPrice.amount || 0,  // 14. 발주단가 금액
            '',  // 15. 수량2
            ...priceComparisonData.subtotalRow.vendors.flatMap((v, vIdx) => {
                const isLast = vIdx === priceComparisonData.subtotalRow.vendors.length - 1;
                return isLast ? ['', ''] : ['', '', ''];  // 16-23. 업체 3개 (단가, 금액, [수량])
            }),
            ''  // 24. 비고
        ]);
        subtotalRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6E9F8' }
            };
            cell.font = { bold: true };
            if (typeof cell.value === 'number') {
                cell.numFmt = '#,##0';
            }
        });

        // 경량공사 구분선
        const dividerRow = worksheet.addRow(['', '경량공사', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        dividerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true };
        });

        // 자재비 헤더
        const materialHeaderRow = worksheet.addRow(['1-1', '자재비', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        materialHeaderRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
            };
        });

        // 벽체공사 행 (자재비 아래, NO 컬럼 비어있음)
        const materialWorkTypeRow = worksheet.addRow(['', '벽체공사', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        materialWorkTypeRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 자재비 상세 아이템들 (공종 헤더 없이 순번만)
        let materialItemNo = 1;
        priceComparisonData.detailSections.materials.forEach(item => {
            // isHeader 체크 (하위 호환성 유지)
            if (item.isHeader) {
                return;  // 공종 헤더는 스킵
            }

            // 아이템 행 (24칸 구조)
            const itemRow = worksheet.addRow([
                materialItemNo,                         // 1. NO
                item.itemName || '',                    // 2. 품명
                item.spec || '',                        // 3. 규격
                item.unit || '',                        // 4. 단위
                item.quantity || 0,                     // 5. 계약도급수량
                item.unitPrice || 0,                    // 6. 계약도급 단가
                item.amount || 0,                       // 7. 계약도급 금액
                item.orderUnit || item.unit || '',      // 8. 단위
                item.orderQuantity || 0,                // 9. 발주수량
                item.progressUnitPrice || 0,            // 10. 진행도급 단가
                item.progressAmount || 0,               // 11. 진행도급 금액
                item.orderPriceQuantity || 0,           // 12. 발주단가 수량
                item.orderPriceUnitPrice || 0,          // 13. 발주단가 단가
                item.orderPriceAmount || 0,             // 14. 발주단가 금액
                '',                                     // 15. 수량2
                '', '', '',                             // 16-18. 업체1 (단가, 금액, 수량)
                '', '', '',                             // 19-21. 업체2 (단가, 금액, 수량)
                '', '',                                 // 22-23. 업체3 (단가, 금액)
                ''                                      // 24. 비고
            ]);
            itemRow.eachCell((cell, colIdx) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (colIdx >= 5 && colIdx <= 7) {
                    // 계약도급 수량/단가/금액
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                } else if (colIdx >= 9 && colIdx <= 11) {
                    // 발주수량, 진행도급 단가/금액
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
            materialItemNo++;
        });

        // 노무비 헤더
        const laborHeaderRow = worksheet.addRow(['1-2', '노무비', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        laborHeaderRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF0F0F0' }
            };
        });

        // 벽체공사 행 (노무비 아래, NO 컬럼 비어있음)
        const laborWorkTypeRow = worksheet.addRow(['', '벽체공사', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
        laborWorkTypeRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // 노무비 상세 아이템들 (공종 헤더 없이 순번만)
        let laborItemNo = 1;
        priceComparisonData.detailSections.labor.forEach(item => {
            // isHeader 체크 (하위 호환성 유지)
            if (item.isHeader) {
                return;  // 공종 헤더는 스킵
            }

            // 아이템 행 (24칸 구조)
            const itemRow = worksheet.addRow([
                laborItemNo,                            // 1. NO
                item.itemName || '',                    // 2. 품명
                item.spec || '',                        // 3. 규격
                item.unit || '',                        // 4. 단위
                item.quantity || 0,                     // 5. 계약도급수량
                item.unitPrice || 0,                    // 6. 계약도급 단가
                item.amount || 0,                       // 7. 계약도급 금액
                item.orderUnit || item.unit || '',      // 8. 단위
                item.orderQuantity || 0,                // 9. 발주수량
                item.progressUnitPrice || 0,            // 10. 진행도급 단가
                item.progressAmount || 0,               // 11. 진행도급 금액
                item.orderPriceQuantity || 0,           // 12. 발주단가 수량
                item.orderPriceUnitPrice || 0,          // 13. 발주단가 단가
                item.orderPriceAmount || 0,             // 14. 발주단가 금액
                '',                                     // 15. 수량2
                '', '', '',                             // 16-18. 업체1 (단가, 금액, 수량)
                '', '', '',                             // 19-21. 업체2 (단가, 금액, 수량)
                '', '',                                 // 22-23. 업체3 (단가, 금액)
                ''                                      // 24. 비고
            ]);
            itemRow.eachCell((cell, colIdx) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                if (colIdx >= 5 && colIdx <= 7) {
                    // 계약도급 수량/단가/금액
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                } else if (colIdx >= 9 && colIdx <= 11) {
                    // 발주수량, 진행도급 단가/금액
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number') {
                        cell.numFmt = '#,##0';
                    }
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
            laborItemNo++;
        });

        // 최종 계 (24칸 구조, 파란 배경)
        const finalTotalRow = worksheet.addRow([
            '',                     // 1. NO
            '계',                   // 2. 품명
            '',                     // 3. 규격
            '',                     // 4. 단위
            '',                     // 5. 계약도급수량
            '',                     // 6. 계약도급 단가
            priceComparisonData.finalTotalRow.contractPrice.amount || 0,  // 7. 계약도급 금액
            '',                     // 8. 단위
            '',                     // 9. 발주수량
            '',                     // 10. 진행도급 단가
            priceComparisonData.finalTotalRow.progressPrice.amount || 0,  // 11. 진행도급 금액
            '',                     // 12. 수량
            '',                     // 13. 발주단가 단가
            priceComparisonData.finalTotalRow.orderPrice.amount || 0,  // 14. 발주단가 금액
            '',                     // 15. 수량2
            ...priceComparisonData.finalTotalRow.vendors.flatMap((v, vIdx) => {
                const isLast = vIdx === priceComparisonData.finalTotalRow.vendors.length - 1;
                return isLast ? ['', ''] : ['', '', ''];  // 16-23. 업체들 (모두 빈칸)
            }),
            ''                      // 24. 비고
        ]);
        finalTotalRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6E9F8' }
            };
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        // 금액 컬럼만 우측 정렬 및 숫자 포맷
        finalTotalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
        finalTotalRow.getCell(7).numFmt = '#,##0';
        finalTotalRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
        finalTotalRow.getCell(11).numFmt = '#,##0';
        finalTotalRow.getCell(14).alignment = { vertical: 'middle', horizontal: 'right' };
        finalTotalRow.getCell(14).numFmt = '#,##0';

        // 컬럼 너비 설정
        worksheet.columns = worksheet.columns.map((col, idx) => {
            if (idx === 1) return { ...col, width: 20 }; // 품명
            else if (idx === 2) return { ...col, width: 20 }; // 규격
            else return { ...col, width: 12 };
        });

        // 전체 테이블 스타일 적용 (동적 범위)
        const lastRow = worksheet.rowCount;
        const lastCol = 24; // X열 (비고)

        // 1. 품명 컬럼(B열, 2번째) 왼쪽 정렬 (헤더 제외)
        for (let rowNum = 3; rowNum <= lastRow; rowNum++) {
            const cell = worksheet.getRow(rowNum).getCell(2);
            if (cell.value) {
                cell.alignment = { ...cell.alignment, horizontal: 'left' };
            }
        }

        // 헤더(1-2행) 품명은 가운데 정렬 유지
        worksheet.getRow(1).getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

        // 2. 모든 숫자 셀 오른쪽 정렬 및 콤마 포맷
        for (let rowNum = 1; rowNum <= lastRow; rowNum++) {
            const row = worksheet.getRow(rowNum);
            row.eachCell((cell, colNumber) => {
                if (typeof cell.value === 'number' && cell.value !== 0) {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (!cell.numFmt || cell.numFmt === 'General') {
                        cell.numFmt = '#,##0';
                    }
                }
            });
        }

        // 3. 전체 외곽선 굵은선 적용
        // 상단 외곽선
        for (let col = 1; col <= lastCol; col++) {
            const cell = worksheet.getRow(1).getCell(col);
            cell.border = {
                ...cell.border,
                top: { style: 'medium' }
            };
        }

        // 하단 외곽선
        for (let col = 1; col <= lastCol; col++) {
            const cell = worksheet.getRow(lastRow).getCell(col);
            cell.border = {
                ...cell.border,
                bottom: { style: 'medium' }
            };
        }

        // 좌측 외곽선
        for (let row = 1; row <= lastRow; row++) {
            const cell = worksheet.getRow(row).getCell(1);
            cell.border = {
                ...cell.border,
                left: { style: 'medium' }
            };
        }

        // 우측 외곽선
        for (let row = 1; row <= lastRow; row++) {
            const cell = worksheet.getRow(row).getCell(lastCol);
            cell.border = {
                ...cell.border,
                right: { style: 'medium' }
            };
        }

        // 4. 내부 선 스타일 적용 (내부 세로선: 실선, 내부 가로선: 점선)
        for (let rowNum = 1; rowNum <= lastRow; rowNum++) {
            for (let colNum = 1; colNum <= lastCol; colNum++) {
                const cell = worksheet.getRow(rowNum).getCell(colNum);
                const isTopEdge = rowNum === 1;
                const isBottomEdge = rowNum === lastRow;
                const isLeftEdge = colNum === 1;
                const isRightEdge = colNum === lastCol;

                cell.border = {
                    top: isTopEdge ? { style: 'medium' } : { style: 'dotted' },
                    bottom: isBottomEdge ? { style: 'medium' } : { style: 'dotted' },
                    left: isLeftEdge ? { style: 'medium' } : { style: 'thin' },
                    right: isRightEdge ? { style: 'medium' } : { style: 'thin' }
                };
            }
        }

        // 5. 헤더 전체(1-2행) 테두리 선 스타일 변경
        // 헤더 아래쪽 실선 (2행 하단)
        for (let colNum = 1; colNum <= lastCol; colNum++) {
            const cell = worksheet.getRow(2).getCell(colNum);
            cell.border = {
                ...cell.border,
                bottom: { style: 'thin' }
            };
        }

        // 헤더 내부 가로선 실선 (1행 하단 = 2행 상단)
        for (let colNum = 1; colNum <= lastCol; colNum++) {
            const cell1 = worksheet.getRow(1).getCell(colNum);
            const cell2 = worksheet.getRow(2).getCell(colNum);

            cell1.border = {
                ...cell1.border,
                bottom: { style: 'thin' }
            };

            cell2.border = {
                ...cell2.border,
                top: { style: 'thin' },
                bottom: { style: 'thin' }
            };
        }

        // 파일 다운로드
        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = `단가비교표_${new Date().toISOString().split('T')[0]}.xlsx`;
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        console.log('✅ Excel 파일 내보내기 완료:', fileName);
    } catch (error) {
        console.error('Excel 내보내기 실패:', error);
        alert('Excel 내보내기 중 오류가 발생했습니다: ' + error.message);
    }
}

// =============================================================================
// 전역 함수 노출
// =============================================================================

window.openPriceComparisonModal = openPriceComparisonModal;
window.closePriceComparisonModal = closePriceComparisonModal;
window.updateSiteName = updateSiteName;
window.updateSummaryField = updateSummaryField;
window.updateSummaryPrice = updateSummaryPrice;
window.updateSummaryVendor = updateSummaryVendor;
window.updateItemField = updateItemField;
window.updateContractPrice = updateContractPrice;
window.updateProgressPrice = updateProgressPrice;
window.updateOrderPrice = updateOrderPrice;
window.updateVendor = updateVendor;
window.updateSupplyRate = updateSupplyRate;
window.updateExpense = updateExpense;
window.exportPriceComparisonToExcel = exportPriceComparisonToExcel;

// =============================================================================
// 계산 결과 변환 함수
// =============================================================================

/**
 * 일위대가 ID를 파싱하여 품명과 규격 추출
 * @param {string} id - 예: "unitPrice_C-STUD-450-3600이하-50형-1759332998669"
 * @returns {object} - { itemName: "C-STUD", spec: "50형" }
 */
function parseUnitPriceId(id) {
    if (!id) return { itemName: '', spec: '' };

    // unitPrice_ 접두사 제거
    let cleaned = id.replace(/^unitPrice_/, '');

    // '-'로 분할
    const parts = cleaned.split('-');

    if (parts.length < 2) {
        return { itemName: cleaned, spec: '' };
    }

    // 타임스탬프 제거 (마지막 부분이 13자리 숫자)
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.match(/^\d{13}$/)) {
        parts.pop();
    }

    // 규격: 마지막 부분
    const spec = parts.pop() || '';

    // 품명 패턴 인식
    // C-STUD, C-RUNNER, J-RUNNER 등 알파벳-알파벳 패턴은 하나로 처리
    const firstPart = parts[0];
    const secondPart = parts[1];

    let itemName;
    if (firstPart && secondPart &&
        firstPart.match(/^[A-Z]$/) && secondPart.match(/^[A-Z]+$/)) {
        // C-STUD 패턴 (알파벳 1글자 - 알파벳 여러글자)
        itemName = `${firstPart}-${secondPart}`;
    } else {
        // 일반석고보드 등 일반 패턴
        itemName = firstPart;
    }

    console.log(`🔍 ID 파싱: "${id}" → 품명: "${itemName}", 규격: "${spec}"`);

    return { itemName, spec };
}

/**
 * calculationResults를 detailSections으로 변환
 * wall-cost-calculator.js의 calculationResults 전역 변수 사용
 */
function convertCalculationResultsToDetailSections() {
    console.log('🔄 계산 결과를 상세 섹션으로 변환 시작 (layerPricing 기반)');

    // calculationResults가 없으면 빈 배열 반환
    if (typeof window.calculationResults === 'undefined' || !window.calculationResults || window.calculationResults.length === 0) {
        console.warn('⚠️ calculationResults가 없습니다');
        return { materials: [], labor: [] };
    }

    console.log(`📊 변환할 계산 결과: ${window.calculationResults.length}개 벽체`);

    // 자재별 집계 (공종 구분 없이)
    const groupedItems = {};

    window.calculationResults.forEach((result, resultIdx) => {
        console.log(`  📋 처리 중: ${resultIdx + 1}/${window.calculationResults.length} - ${result.wallName} (${result.area.toFixed(2)} M2)`);

        // layerPricing이 없으면 스킵
        if (!result.layerPricing) {
            console.warn(`    ⚠️ layerPricing이 없음`);
            return;
        }

        // 각 레이어별로 처리 (11개 레이어)
        Object.entries(result.layerPricing).forEach(([layerKey, layer]) => {
            // found=false이거나 materialName이 없으면 스킵
            if (!layer.found || !layer.materialName) {
                return;
            }

            // ID 파싱하여 품명과 규격 추출
            const parsed = parseUnitPriceId(layer.materialName);
            const materialName = parsed.itemName || layer.materialName;
            const spec = parsed.spec || layer.spec || '';
            const unit = layer.unit || 'M2';

            console.log(`    🔹 레이어: ${layerKey} → ${materialName} (${spec})`);

            // 자재명+규격 키
            const itemKey = `${materialName}|${spec}`;

            // 아이템 초기화
            if (!groupedItems[itemKey]) {
                groupedItems[itemKey] = {
                    itemName: materialName,
                    spec: spec,
                    unit: unit,
                    quantity: 0,
                    materialUnitPrice: layer.materialPrice || 0,
                    laborUnitPrice: layer.laborPrice || 0,
                    materialAmount: 0,
                    laborAmount: 0
                };
            }

            // 수량 = 벽체 면적 (레이어는 이미 M2당 단가임)
            const qty = parseFloat(result.area) || 0;

            // 수량 및 금액 누적
            groupedItems[itemKey].quantity += qty;
            groupedItems[itemKey].materialAmount += (layer.materialPrice || 0) * qty;
            groupedItems[itemKey].laborAmount += (layer.laborPrice || 0) * qty;

            console.log(`      ✅ 누적: 수량 ${qty.toFixed(2)} M2, 자재비 ${Math.round((layer.materialPrice || 0) * qty).toLocaleString()}원, 노무비 ${Math.round((layer.laborPrice || 0) * qty).toLocaleString()}원`);
        });
    });

    // 자재비/노무비 배열 생성
    const materials = [];
    const labor = [];

    console.log(`📊 자재 집계 완료: ${Object.keys(groupedItems).length}개 자재`);

    // 품명 순으로 정렬하여 추가 (공종 헤더 없이)
    Object.values(groupedItems)
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
        .forEach(item => {
            // 자재비 아이템
            materials.push({
                itemName: item.itemName,
                spec: item.spec,
                unit: item.unit,
                quantity: Math.round(item.quantity * 100) / 100,  // 소수점 2자리
                unitPrice: Math.round(item.materialUnitPrice),    // 자재비 단가
                amount: Math.round(item.materialAmount),          // 자재비 총액
                // 발주도급 관련 필드
                orderUnit: item.unit,                             // 발주도급 단위 (동일)
                orderQuantity: 0,                                 // 발주수량 (입력 가능)
                progressUnitPrice: Math.round(item.materialUnitPrice),  // 진행도급 단가 (계약도급 복사)
                progressAmount: 0,                                // 진행도급 금액 (자동 계산)
                // 발주단가 관련 필드
                orderPriceQuantity: 0,                            // 발주단가 수량 (발주수량 자동 복사)
                orderPriceUnitPrice: 0,                           // 발주단가 단가 (입력 가능)
                orderPriceAmount: 0                               // 발주단가 금액 (자동 계산)
            });

            // 노무비 아이템
            labor.push({
                itemName: item.itemName,
                spec: item.spec,
                unit: item.unit,
                quantity: Math.round(item.quantity * 100) / 100,  // 소수점 2자리
                unitPrice: Math.round(item.laborUnitPrice),       // 노무비 단가
                amount: Math.round(item.laborAmount),             // 노무비 총액
                // 발주도급 관련 필드
                orderUnit: item.unit,                             // 발주도급 단위 (동일)
                orderQuantity: 0,                                 // 발주수량 (입력 가능)
                progressUnitPrice: Math.round(item.laborUnitPrice),  // 진행도급 단가 (계약도급 복사)
                progressAmount: 0,                                // 진행도급 금액 (자동 계산)
                // 발주단가 관련 필드
                orderPriceQuantity: 0,                            // 발주단가 수량 (발주수량 자동 복사)
                orderPriceUnitPrice: 0,                           // 발주단가 단가 (입력 가능)
                orderPriceAmount: 0                               // 발주단가 금액 (자동 계산)
            });

            console.log(`    ✅ ${item.itemName} (${item.spec}): 수량 ${(Math.round(item.quantity * 100) / 100).toFixed(2)} ${item.unit}, 자재비 ${Math.round(item.materialAmount).toLocaleString()}원, 노무비 ${Math.round(item.laborAmount).toLocaleString()}원`);
        });

    console.log(`✅ 변환 완료: 자재비 ${materials.length}개 항목, 노무비 ${labor.length}개 항목`);

    return { materials, labor };
}

// =============================================================================
// 탭 렌더링 함수
// =============================================================================

/**
 * 단가비교표 탭에 렌더링 (모달 대신 탭 사용)
 */
window.renderPriceComparisonTable = function() {
    console.log('💰 단가비교표 테이블 렌더링 시작');

    const container = document.getElementById('priceComparisonContainer');
    if (!container) {
        console.error('❌ priceComparisonContainer를 찾을 수 없습니다');
        return;
    }

    // calculationResults를 detailSections으로 변환
    const detailSections = convertCalculationResultsToDetailSections();
    priceComparisonData.detailSections = detailSections;

    // 데이터 초기화 (items가 비어있으면 기본 아이템 1개 추가)
    if (!priceComparisonData.items || priceComparisonData.items.length === 0) {
        console.log('📝 데이터 초기화: 기본 아이템 추가');
        priceComparisonData.items = [createEmptyItem(1)];
    }

    // 테이블 HTML 생성 (컨트롤 버튼 제거됨)
    const html = `
        <div class="price-comparison-table-wrapper" style="overflow-x: auto; padding: 15px;">
            <table class="price-comparison-table" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead id="priceComparisonTableHead">
                    <!-- 테이블 헤더가 동적으로 생성됩니다 -->
                </thead>
                <tbody id="priceComparisonTableBody">
                    <!-- 테이블 바디가 동적으로 생성됩니다 -->
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;

    // 테이블 렌더링
    renderTableHead();
    renderTableBody();
};

console.log('✅ 단가비교표 관리 모듈 로드 완료');
