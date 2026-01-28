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
            { name: '업체1', unitPrice: '', amount: '', quantity: 1.00 },
            { name: '업체2', unitPrice: '', amount: '', quantity: 1.00 },
            { name: '업체3', unitPrice: '', amount: '', quantity: 1.00 }
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
        progressQuantity: 0,
        orderPrice: { unitPrice: '', amount: 0 },
        orderQuantity2: '',
        vendors: [
            { name: '업체1', percent: 0, amount: 0, quantity: '' },
            { name: '업체2', percent: 0, amount: 0, quantity: '' },
            { name: '업체3', percent: 0, amount: 0 }
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
            <th colspan="2">
                계약도급
                <input type="text" id="globalContractRatio" value="1.2"
                       style="width: 50px; margin-left: 5px; text-align: center; font-size: 0.9em;"
                       placeholder="1.2" />
            </th>
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
            <td class="number-cell"></td>
            <td></td>
            <td></td>
            <td></td>
            <td class="number-cell">${row.progressPrice.amount || ''}</td>
            <td></td>
            <td></td>
            <td class="number-cell">${row.orderPrice.amount || ''}</td>
            ${row.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === vendorCount - 1;
                return `
                    <td></td>
                    <td></td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
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
            ${row.vendors.map((vendor, vIdx) => {
                return `
                    <td></td>
                    <td></td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
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
                <td style="white-space: nowrap;">
                    ${item.itemName}
                    <button class="btn-view-material-walls"
                            data-item-name="${escapeHtml(item.itemName)}"
                            data-item-spec="${escapeHtml(item.spec || '')}"
                            data-unit-price-ids="${escapeHtml((item.originalUnitPriceIds || []).join(','))}"
                            title="이 자재가 사용된 벽체를 Revit 3D 뷰에서 색상으로 표시"
                            style="margin-left: 4px; padding: 2px 5px; background: #2563eb; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        <i class="fas fa-cube"></i>
                    </button>
                </td>
                <td>${item.spec || ''}</td>
                <td>${item.unit}</td>
                <td class="number-cell">${formatQuantity(item.quantity)}</td>
                <td class="number-cell contract-unit-price" data-type="${type}" data-index="${index}">${formatNumber(item.contractUnitPrice || 0)}</td>
                <td class="number-cell contract-amount" data-type="${type}" data-index="${index}">${formatNumber(item.contractAmount || 0)}</td>
                <td>${item.orderUnit || item.unit}</td>
                <td><input type="text" class="order-quantity-input" data-type="${type}" data-index="${index}" value="${item.orderQuantity ? formatNumber(item.orderQuantity) : ''}" style="width: 80px; text-align: right !important;" /></td>
                <td class="number-cell progress-unit-price" data-type="${type}" data-index="${index}">${formatNumber(item.progressUnitPrice || 0)}</td>
                <td class="number-cell progress-amount" data-type="${type}" data-index="${index}">${formatNumber(item.progressAmount || 0)}</td>
                <td class="number-cell order-price-quantity" data-type="${type}" data-index="${index}">${formatQuantity(item.orderPriceQuantity || 0)}</td>
                <td class="number-cell">${formatNumber(item.unitPrice)}</td>
                <td class="number-cell order-price-amount" data-type="${type}" data-index="${index}">${formatNumber(item.orderPriceAmount || 0)}</td>
                ${Array.from({ length: vendorCount }, (_, i) => {
                    const vendor = item.vendors && item.vendors[i] ? item.vendors[i] : { unitPrice: 0, amount: 0, quantity: 0 };
                    return `<td class="number-cell vendor-quantity-${i}" data-type="${type}" data-index="${index}" data-vendor="${i}">${formatQuantity(item.orderPriceQuantity || 0)}</td><td><input type="text" class="vendor-unit-price-input" data-type="${type}" data-index="${index}" data-vendor="${i}" value="${vendor.unitPrice ? formatNumber(vendor.unitPrice) : ''}" style="width: 80px; text-align: right !important;" /></td><td class="number-cell vendor-amount" data-type="${type}" data-index="${index}" data-vendor="${i}">${formatNumber(vendor.amount || 0)}</td>`;
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
            finalTotal.contractPrice.amount += item.contractAmount || 0;  // 계약도급 금액 (계약수량 × 계약단가)
            finalTotal.progressPrice.amount += item.progressAmount || 0;  // 진행도급 실제 계산
            finalTotal.orderPrice.amount += item.orderPriceAmount || 0;   // 발주단가 실제 계산
        }
    });

    // 노무비 합산
    labor.forEach(item => {
        if (!item.isHeader) {
            finalTotal.contractPrice.amount += item.contractAmount || 0;  // 계약도급 금액 (계약수량 × 계약단가)
            finalTotal.progressPrice.amount += item.progressAmount || 0;  // 진행도급 실제 계산
            finalTotal.orderPrice.amount += item.orderPriceAmount || 0;   // 발주단가 실제 계산
        }
    });

    // 업체별 합산 (자재비 + 노무비)
    finalTotal.vendors.forEach((vendor, vIdx) => {
        let vendorTotal = 0;

        // 자재비 합산
        materials.forEach(item => {
            if (!item.isHeader && item.vendors && item.vendors[vIdx]) {
                vendorTotal += item.vendors[vIdx].amount || 0;
            }
        });

        // 노무비 합산
        labor.forEach(item => {
            if (!item.isHeader && item.vendors && item.vendors[vIdx]) {
                vendorTotal += item.vendors[vIdx].amount || 0;
            }
        });

        vendor.amount = vendorTotal;
    });
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
            ${row.vendors.map((vendor, vIdx) => {
                return `
                    <td></td>
                    <td></td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
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
            <td class="number-cell"></td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.contractPrice.amount)}</td>
            <td>${priceComparisonData.summaryRow.orderUnit}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.summaryRow.orderQuantity)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.progressPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.progressPrice.amount)}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.summaryRow.progressQuantity)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.orderPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.summaryRow.orderPrice.amount)}</td>
            ${priceComparisonData.summaryRow.vendors.map((vendor, vIdx) => {
                return `
                    <td class="number-cell">${formatQuantity(vendor.quantity)}</td>
                    <td></td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
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
        : '0';

    return `
        <tr>
            <td></td>
            <td>${priceComparisonData.miscRow.itemName}</td>
            <td>${priceComparisonData.miscRow.spec || ''}</td>
            <td>${priceComparisonData.miscRow.unit}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.miscRow.contractQty)}</td>
            <td class="number-cell"></td>
            <td class="number-cell"></td>
            <td>${priceComparisonData.miscRow.orderUnit || ''}</td>
            <td class="number-cell">${formatQuantity(priceComparisonData.miscRow.orderQuantity)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.progressPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.progressPrice.amount)}</td>
            <td><input type="text" class="misc-quantity-input" value="${progressQuantityValue}" style="width: 80px; text-align: right !important;" /></td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.orderPrice.unitPrice)}</td>
            <td class="number-cell">${formatNumber(priceComparisonData.miscRow.orderPrice.amount)}</td>
            ${priceComparisonData.miscRow.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === priceComparisonData.miscRow.vendors.length - 1;
                return `
                    <td><input type="text" class="vendor-misc-percent-input" data-vendor="${vIdx}" value="${vendor.percent || 0}" style="width: 80px; text-align: right !important;" /></td>
                    <td></td>
                    <td class="number-cell vendor-misc-amount" data-vendor="${vIdx}">${formatNumber(vendor.amount)}</td>
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

    // 경량공사 금액 설정: 자재비+노무비 합계를 각 컬럼에 복사
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

    // 입력 필드 이벤트 리스너 부착
    attachGlobalContractRatioListener();  // 전역 계약도급 비율 입력
    attachOrderQuantityListeners();       // 발주수량 입력
    attachOrderPriceUnitListeners();      // 발주단가 단가 입력
    attachMiscQuantityListener();         // 공과잡비 % 입력
    attachVendorUnitPriceListeners();     // 업체별 단가 입력
    attachVendorMiscPercentListeners();   // 업체별 공과잡비 % 입력
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

                // 발주단가 금액 재계산: 발주단가 수량 × 계약도급 단가 (item.unitPrice)
                const orderPriceAmount = quantity * (items[index].unitPrice || 0);
                items[index].orderPriceAmount = Math.round(orderPriceAmount);

                // UI 업데이트 (12번, 14번 칸)
                const orderQuantityCell = document.querySelector(`.order-price-quantity[data-type="${type}"][data-index="${index}"]`);
                if (orderQuantityCell) {
                    orderQuantityCell.textContent = formatQuantity(quantity);
                }

                const orderAmountCell = document.querySelector(`.order-price-amount[data-type="${type}"][data-index="${index}"]`);
                if (orderAmountCell) {
                    orderAmountCell.textContent = formatNumber(Math.round(orderPriceAmount));
                }

                // ✅ 업체별 수량 자동 복사 (9번 → 15번, 18번, 21번)
                if (items[index].vendors) {
                    items[index].vendors.forEach((vendor, vIdx) => {
                        vendor.quantity = quantity;

                        // 15열, 18열, 21열 (업체1, 2, 3 수량) - data-vendor="0", "1", "2"
                        const vendorQuantityCell = document.querySelector(`.vendor-quantity-${vIdx}[data-type="${type}"][data-index="${index}"]`);
                        if (vendorQuantityCell) {
                            vendorQuantityCell.textContent = formatQuantity(quantity);
                        }

                        // 업체별 금액 재계산: 수량 × 업체 단가
                        const vendorAmount = quantity * (vendor.unitPrice || 0);
                        vendor.amount = Math.round(vendorAmount);

                        // 업체별 금액 UI 업데이트
                        const vendorAmountCell = document.querySelector(`.vendor-amount[data-type="${type}"][data-index="${index}"][data-vendor="${vIdx}"]`);
                        if (vendorAmountCell) {
                            vendorAmountCell.textContent = formatNumber(Math.round(vendorAmount));
                        }
                    });
                }

                // ✅ 추가: "계" 행 재계산
                calculateFinalTotal();

                // ✅ 추가: 경량공사 행 업데이트 (진행도급 금액 + 발주단가 금액)
                priceComparisonData.summaryRow.progressPrice.amount =
                    priceComparisonData.finalTotalRow.progressPrice.amount;
                priceComparisonData.summaryRow.orderPrice.amount =
                    priceComparisonData.finalTotalRow.orderPrice.amount;

                // ✅ 추가: 합계 행 재계산
                calculateSubtotal();

                // ✅ 추가: "계" 행 UI 업데이트 (진행도급 금액 - 11번째 컬럼, 발주단가 금액 - 14번째 컬럼)
                const tbody = document.getElementById('priceComparisonTableBody');
                const finalTotalRow = tbody.querySelector('tr:last-child');
                if (finalTotalRow) {
                    const finalTotalProgressCell = finalTotalRow.querySelector('td:nth-child(11)');
                    if (finalTotalProgressCell) {
                        finalTotalProgressCell.textContent = formatNumber(priceComparisonData.finalTotalRow.progressPrice.amount);
                    }
                    const finalTotalOrderCell = finalTotalRow.querySelector('td:nth-child(14)');
                    if (finalTotalOrderCell) {
                        finalTotalOrderCell.textContent = formatNumber(priceComparisonData.finalTotalRow.orderPrice.amount);
                    }
                }

                // ✅ 추가: 경량공사 행 UI 업데이트 (진행도급 금액 - 11번째 컬럼, 발주단가 금액 - 14번째 컬럼)
                // 경량공사 행은 2번째 행 (firstRow 다음)
                const summaryRow = tbody.querySelector('tr:nth-child(2)');
                if (summaryRow) {
                    const summaryProgressCell = summaryRow.querySelector('td:nth-child(11)');
                    if (summaryProgressCell) {
                        summaryProgressCell.textContent = formatNumber(priceComparisonData.summaryRow.progressPrice.amount);
                    }
                    const summaryOrderCell = summaryRow.querySelector('td:nth-child(14)');
                    if (summaryOrderCell) {
                        summaryOrderCell.textContent = formatNumber(priceComparisonData.summaryRow.orderPrice.amount);
                    }
                }

                // ✅ 추가: 합계 행 UI 업데이트 (진행도급 금액 - 11번째 컬럼, 발주단가 금액 - 14번째 컬럼)
                // 합계 행은 5번째 행
                const subtotalRow = tbody.querySelector('tr:nth-child(5)');
                if (subtotalRow) {
                    const subtotalProgressCell = subtotalRow.querySelector('td:nth-child(11)');
                    if (subtotalProgressCell) {
                        subtotalProgressCell.textContent = formatNumber(priceComparisonData.subtotalRow.progressPrice.amount);
                    }
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
 * 전역 계약도급 비율 입력 필드에 이벤트 리스너 부착
 */
function attachGlobalContractRatioListener() {
    const input = document.getElementById('globalContractRatio');

    if (input) {
        input.addEventListener('input', function() {
            const value = parseFloat(this.value);
            const ratio = isNaN(value) ? 1.2 : value;

            // 모든 자재비 항목 업데이트
            priceComparisonData.detailSections.materials.forEach((item, index) => {
                if (!item.isHeader) {
                    item.contractRatio = ratio;

                    // 계약도급 단가 계산: 발주단가 단가 × 비율
                    const baseUnitPrice = item.unitPrice || 0;
                    const contractUnitPrice = Math.round(baseUnitPrice * ratio);
                    item.contractUnitPrice = contractUnitPrice;

                    // 계약도급 금액 계산: 계약도급 단가 × 계약수량
                    const contractAmount = (item.quantity || 0) * contractUnitPrice;
                    item.contractAmount = Math.round(contractAmount);

                    // 진행도급 단가 자동 업데이트
                    item.progressUnitPrice = contractUnitPrice;

                    // UI 업데이트
                    const contractUnitPriceCell = document.querySelector(`.contract-unit-price[data-type="material"][data-index="${index}"]`);
                    if (contractUnitPriceCell) {
                        contractUnitPriceCell.textContent = formatNumber(contractUnitPrice);
                    }

                    const contractAmountCell = document.querySelector(`.contract-amount[data-type="material"][data-index="${index}"]`);
                    if (contractAmountCell) {
                        contractAmountCell.textContent = formatNumber(Math.round(contractAmount));
                    }

                    const progressUnitPriceCell = document.querySelector(`.progress-unit-price[data-type="material"][data-index="${index}"]`);
                    if (progressUnitPriceCell) {
                        progressUnitPriceCell.textContent = formatNumber(contractUnitPrice);
                    }
                }
            });

            // 모든 노무비 항목 업데이트
            priceComparisonData.detailSections.labor.forEach((item, index) => {
                if (!item.isHeader) {
                    item.contractRatio = ratio;

                    const baseUnitPrice = item.unitPrice || 0;
                    const contractUnitPrice = Math.round(baseUnitPrice * ratio);
                    item.contractUnitPrice = contractUnitPrice;

                    const contractAmount = (item.quantity || 0) * contractUnitPrice;
                    item.contractAmount = Math.round(contractAmount);

                    item.progressUnitPrice = contractUnitPrice;

                    const contractUnitPriceCell = document.querySelector(`.contract-unit-price[data-type="labor"][data-index="${index}"]`);
                    if (contractUnitPriceCell) {
                        contractUnitPriceCell.textContent = formatNumber(contractUnitPrice);
                    }

                    const contractAmountCell = document.querySelector(`.contract-amount[data-type="labor"][data-index="${index}"]`);
                    if (contractAmountCell) {
                        contractAmountCell.textContent = formatNumber(Math.round(contractAmount));
                    }

                    const progressUnitPriceCell = document.querySelector(`.progress-unit-price[data-type="labor"][data-index="${index}"]`);
                    if (progressUnitPriceCell) {
                        progressUnitPriceCell.textContent = formatNumber(contractUnitPrice);
                    }
                }
            });

            // "계" 행, "경량공사" 행, "합계" 행 재계산
            calculateFinalTotal();
            priceComparisonData.summaryRow.contractPrice.amount =
                priceComparisonData.finalTotalRow.contractPrice.amount;
            calculateSubtotal();

            // UI 업데이트
            const tbody = document.getElementById('priceComparisonTableBody');

            // "계" 행 7번 컬럼
            const finalTotalRow = tbody.querySelector('tr:last-child');
            if (finalTotalRow) {
                const cell = finalTotalRow.querySelector('td:nth-child(7)');
                if (cell) cell.textContent = formatNumber(priceComparisonData.finalTotalRow.contractPrice.amount);
            }

            // 경량공사 행 7번 컬럼
            const summaryRow = tbody.querySelector('tr:nth-child(2)');
            if (summaryRow) {
                const cell = summaryRow.querySelector('td:nth-child(7)');
                if (cell) cell.textContent = formatNumber(priceComparisonData.summaryRow.contractPrice.amount);
            }

            // 합계 행 7번 컬럼
            const subtotalRow = tbody.querySelector('tr:nth-child(5)');
            if (subtotalRow) {
                const cell = subtotalRow.querySelector('td:nth-child(7)');
                if (cell) cell.textContent = formatNumber(priceComparisonData.subtotalRow.contractPrice.amount);
            }
        });
    }
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

        // 공과잡비 계산: 경량공사 발주단가 금액 × (입력값 ÷ 100)
        const summaryOrderAmount = priceComparisonData.summaryRow.orderPrice.amount || 0;
        const miscOrderAmount = Math.round(summaryOrderAmount * (quantity / 100));
        // 발주단가 칸에 계산값 표시
        priceComparisonData.miscRow.orderPrice.amount = miscOrderAmount;

        // 단수정리 계산: (경량공사 + 공과잡비) 발주단가 금액의 천단위 절사
        const totalBeforeRounding = summaryOrderAmount + miscOrderAmount;
        const roundingAmount = totalBeforeRounding % 1000;  // 천단위 미만 금액
        // 발주단가 칸에 절사값 표시
        priceComparisonData.roundingRow.orderPrice.amount = -roundingAmount;

        // 합계 재계산
        calculateSubtotal();

        // UI 업데이트
        const tbody = document.getElementById('priceComparisonTableBody');

        // 공과잡비 발주단가 금액 칸(14번) 업데이트
        const miscRow = tbody.querySelector('tr:nth-child(3)');
        if (miscRow) {
            const miscOrderCell = miscRow.querySelector('td:nth-child(14)');
            if (miscOrderCell) {
                miscOrderCell.textContent = formatNumber(miscOrderAmount);
            }
        }

        // 단수정리 발주단가 금액 칸(14번) 업데이트
        const roundingRow = tbody.querySelector('tr:nth-child(4)');
        if (roundingRow) {
            const roundingOrderCell = roundingRow.querySelector('td:nth-child(14)');
            if (roundingOrderCell) {
                roundingOrderCell.textContent = formatNumber(-roundingAmount);
            }
        }

        // 합계 발주단가 금액 칸(14번) 업데이트
        const subtotalRow = tbody.querySelector('tr:nth-child(5)');
        if (subtotalRow) {
            const subtotalOrderCell = subtotalRow.querySelector('td:nth-child(14)');
            if (subtotalOrderCell) {
                subtotalOrderCell.textContent = formatNumber(priceComparisonData.subtotalRow.orderPrice.amount);
            }
        }
    });
}

/**
 * 업체별 단가 입력 필드에 이벤트 리스너 부착
 */
function attachVendorUnitPriceListeners() {
    const inputs = document.querySelectorAll('.vendor-unit-price-input');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const type = this.dataset.type;  // 'material' 또는 'labor'
            const index = parseInt(this.dataset.index);
            const vendorIndex = parseInt(this.dataset.vendor);

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

            if (items[index] && items[index].vendors && items[index].vendors[vendorIndex]) {
                items[index].vendors[vendorIndex].unitPrice = unitPrice;

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

                // 업체별 금액 계산: 수량 × 단가
                const quantity = items[index].vendors[vendorIndex].quantity || 0;
                const vendorAmount = quantity * unitPrice;
                items[index].vendors[vendorIndex].amount = Math.round(vendorAmount);

                // UI 업데이트 (업체별 금액 셀)
                const vendorAmountCell = document.querySelector(`.vendor-amount[data-type="${type}"][data-index="${index}"][data-vendor="${vendorIndex}"]`);
                if (vendorAmountCell) {
                    vendorAmountCell.textContent = formatNumber(Math.round(vendorAmount));
                }

                // 업체별 "계" 행, "경량공사" 행, "공과잡비" 행, "합계" 행 재계산
                calculateVendorTotals();
            }
        });
    });
}

/**
 * 업체별 공과잡비 % 입력 필드에 이벤트 리스너 부착
 */
function attachVendorMiscPercentListeners() {
    const inputs = document.querySelectorAll('.vendor-misc-percent-input');

    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const vendorIndex = parseInt(this.dataset.vendor);

            // 콤마 제거 후 숫자만 추출
            const rawValue = this.value.replace(/,/g, '');
            const cleanValue = rawValue.replace(/[^\d.]/g, '');
            const parts = cleanValue.split('.');
            const formattedValue = parts.length > 1
                ? parts[0] + '.' + parts.slice(1).join('')
                : cleanValue;

            const percent = parseFloat(formattedValue) || 0;

            // 데이터 업데이트
            priceComparisonData.miscRow.vendors[vendorIndex].percent = percent;

            // 커서 위치 저장
            const cursorPos = this.selectionStart;
            const oldLength = this.value.length;

            // 콤마 포맷 적용
            if (formattedValue) {
                const [intPart, decPart] = formattedValue.split('.');
                const formattedInt = parseInt(intPart || 0).toLocaleString('ko-KR');
                this.value = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
            } else {
                this.value = '';
            }

            // 커서 위치 복원
            const newLength = this.value.length;
            const newCursorPos = cursorPos + (newLength - oldLength);
            this.setSelectionRange(newCursorPos, newCursorPos);

            // 금액 계산: 경량공사 × (% ÷ 100)
            const summaryAmount = priceComparisonData.summaryRow.vendors[vendorIndex].amount || 0;
            const miscAmount = Math.round(summaryAmount * (percent / 100));
            priceComparisonData.miscRow.vendors[vendorIndex].amount = miscAmount;

            // UI 업데이트
            const amountCell = document.querySelector(`.vendor-misc-amount[data-vendor="${vendorIndex}"]`);
            if (amountCell) {
                amountCell.textContent = formatNumber(miscAmount);
            }

            // 단수정리 및 합계 재계산
            calculateVendorRounding();
            calculateSubtotal();
            updateVendorUI();
        });
    });
}

/**
 * 업체별 단수정리 계산
 */
function calculateVendorRounding() {
    priceComparisonData.roundingRow.vendors.forEach((vendor, vIdx) => {
        const summaryAmount = priceComparisonData.summaryRow.vendors[vIdx].amount || 0;
        const miscAmount = priceComparisonData.miscRow.vendors[vIdx].amount || 0;
        const totalBeforeRounding = summaryAmount + miscAmount;
        const roundingAmount = totalBeforeRounding % 1000;  // 천단위 미만 금액
        vendor.amount = -roundingAmount;
    });
}

/**
 * 업체별 합계 계산 (계, 경량공사, 공과잡비, 합계)
 */
function calculateVendorTotals() {
    // 1. "계" 행 업데이트 (자재비 + 노무비)
    calculateFinalTotal();

    // 2. "경량공사" 행 업데이트 (계 복사)
    priceComparisonData.summaryRow.vendors.forEach((vendor, vIdx) => {
        vendor.amount = priceComparisonData.finalTotalRow.vendors[vIdx].amount;
    });

    // 3. "공과잡비" 행 업데이트 (경량공사 × 공과잡비%)
    const miscPercent = priceComparisonData.miscRow.progressQuantity || 0;
    priceComparisonData.miscRow.vendors.forEach((vendor, vIdx) => {
        const summaryAmount = priceComparisonData.summaryRow.vendors[vIdx].amount || 0;
        vendor.amount = Math.round(summaryAmount * (miscPercent / 100));
    });

    // 4. "단수정리" 행 업데이트
    calculateVendorRounding();

    // 5. "합계" 행 업데이트 (경량공사 + 공과잡비 + 단수정리)
    calculateSubtotal();

    // 6. UI 업데이트
    updateVendorUI();
}

/**
 * 업체별 UI 업데이트
 */
function updateVendorUI() {
    const tbody = document.getElementById('priceComparisonTableBody');
    if (!tbody) return;

    // "계" 행 (마지막 행)
    const finalTotalRow = tbody.querySelector('tr:last-child');
    if (finalTotalRow) {
        priceComparisonData.finalTotalRow.vendors.forEach((vendor, vIdx) => {
            // 컬럼 계산: 15번(업체1 수량 앞) 시작
            // 업체1: 16단가, 17금액 / 업체2: 18수량, 19단가, 20금액 / 업체3: 21수량, 22단가, 23금액
            const columnIndex = vIdx === 0 ? 17 : vIdx === 1 ? 20 : 23;
            const cell = finalTotalRow.querySelector(`td:nth-child(${columnIndex})`);
            if (cell) {
                cell.textContent = formatNumber(vendor.amount);
            }
        });
    }

    // "경량공사" 행 (2번째 행)
    const summaryRow = tbody.querySelector('tr:nth-child(2)');
    if (summaryRow) {
        priceComparisonData.summaryRow.vendors.forEach((vendor, vIdx) => {
            const columnIndex = vIdx === 0 ? 17 : vIdx === 1 ? 20 : 23;
            const cell = summaryRow.querySelector(`td:nth-child(${columnIndex})`);
            if (cell) {
                cell.textContent = formatNumber(vendor.amount);
            }
        });
    }

    // "공과잡비" 행 (3번째 행)
    const miscRow = tbody.querySelector('tr:nth-child(3)');
    if (miscRow) {
        priceComparisonData.miscRow.vendors.forEach((vendor, vIdx) => {
            const columnIndex = vIdx === 0 ? 17 : vIdx === 1 ? 20 : 23;
            const cell = miscRow.querySelector(`td:nth-child(${columnIndex})`);
            if (cell) {
                cell.textContent = formatNumber(vendor.amount);
            }
        });
    }

    // "단수정리" 행 (4번째 행)
    const roundingRow = tbody.querySelector('tr:nth-child(4)');
    if (roundingRow) {
        priceComparisonData.roundingRow.vendors.forEach((vendor, vIdx) => {
            const columnIndex = vIdx === 0 ? 17 : vIdx === 1 ? 20 : 23;
            const cell = roundingRow.querySelector(`td:nth-child(${columnIndex})`);
            if (cell) {
                cell.textContent = formatNumber(vendor.amount);
            }
        });
    }

    // "합계" 행 (5번째 행)
    const subtotalRow = tbody.querySelector('tr:nth-child(5)');
    if (subtotalRow) {
        priceComparisonData.subtotalRow.vendors.forEach((vendor, vIdx) => {
            const columnIndex = vIdx === 0 ? 17 : vIdx === 1 ? 20 : 23;
            const cell = subtotalRow.querySelector(`td:nth-child(${columnIndex})`);
            if (cell) {
                cell.textContent = formatNumber(vendor.amount);
            }
        });
    }
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

    // 데이터 확인
    if (!priceComparisonData || !priceComparisonData.items || priceComparisonData.items.length === 0) {
        alert('단가비교표 데이터가 없습니다. 먼저 단가비교표를 작성해주세요.');
        return;
    }

    if (!priceComparisonData.items[0].vendors || priceComparisonData.items[0].vendors.length === 0) {
        alert('업체 정보가 없습니다. 먼저 업체를 추가해주세요.');
        return;
    }

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('단가비교표');

        const vendorCount = priceComparisonData.items[0].vendors.length;

        // 타이틀 행 (행1)
        const titleRow = worksheet.addRow(['단가비교표']);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // 현장명 행 (행2)
        const siteNameRow = worksheet.addRow([`현장명: ${priceComparisonData.siteName || ''}`]);
        siteNameRow.font = { bold: true, size: 12 };
        siteNameRow.alignment = { vertical: 'middle', horizontal: 'left' };

        // 헤더 행 1 - 타이틀 행 (행3)
        const headerRow1 = worksheet.addRow([]);
        const row1Num = headerRow1.number;
        let colIdx = 1;

        // 헤더 행 2 - 서브 헤더 (행4)
        const headerRow2 = worksheet.addRow([]);
        const row2Num = headerRow2.number;

        // 병합된 셀 정보 추적 (상단 테두리 적용용)
        const mergedCellRanges = [];
        const rowspanColumns = []; // rowspan=2로 병합된 열 번호 추적

        // 고정 헤더 (rowspan=2)
        ['NO', '품명', '규격', '단위', '계약도급수량'].forEach(text => {
            const cell = headerRow1.getCell(colIdx);
            cell.value = text;
            worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx); // rowspan=2
            rowspanColumns.push(colIdx); // rowspan 열 기록
            colIdx++;
        });

        // 계약도급 (colspan=2)
        worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
        headerRow1.getCell(colIdx).value = '계약도급';
        mergedCellRanges.push({ startCol: colIdx, endCol: colIdx + 1, row: row1Num });
        colIdx += 2;

        // 단위, 발주수량 (rowspan=2)
        ['단위', '발주수량'].forEach(text => {
            const cell = headerRow1.getCell(colIdx);
            cell.value = text;
            worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
            rowspanColumns.push(colIdx); // rowspan 열 기록
            colIdx++;
        });

        // 진행도급 (colspan=2)
        worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
        headerRow1.getCell(colIdx).value = '진행도급';
        mergedCellRanges.push({ startCol: colIdx, endCol: colIdx + 1, row: row1Num });
        colIdx += 2;

        // 수량 (rowspan=2)
        worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
        headerRow1.getCell(colIdx).value = '수량';
        rowspanColumns.push(colIdx); // rowspan 열 기록
        colIdx++;

        // 발주단가 (colspan=2)
        worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
        headerRow1.getCell(colIdx).value = '발주단가';
        mergedCellRanges.push({ startCol: colIdx, endCol: colIdx + 1, row: row1Num });
        colIdx += 2;

        // 수량 (rowspan=2)
        worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
        headerRow1.getCell(colIdx).value = '수량';
        rowspanColumns.push(colIdx); // rowspan 열 기록
        colIdx++;

        // 업체 컬럼들
        priceComparisonData.items[0].vendors.forEach((vendor, vIdx) => {
            const isLast = vIdx === vendorCount - 1;

            // 모든 업체: 단가+금액 2칸 병합 (먼저 추가)
            worksheet.mergeCells(row1Num, colIdx, row1Num, colIdx + 1);
            headerRow1.getCell(colIdx).value = vendor.name;
            mergedCellRanges.push({ startCol: colIdx, endCol: colIdx + 1, row: row1Num });
            colIdx += 2;

            if (!isLast) {
                // 업체1,2: 수량(rowspan=2) 나중 추가
                worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
                headerRow1.getCell(colIdx).value = '수량';
                rowspanColumns.push(colIdx); // rowspan 열 기록
                colIdx++;
            }
        });

        // 비고 (rowspan=2)
        worksheet.mergeCells(row1Num, colIdx, row2Num, colIdx);
        headerRow1.getCell(colIdx).value = '비고';
        rowspanColumns.push(colIdx); // rowspan 열 기록

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

        // 헤더 스타일 적용 (border는 나중에 적용)
        [headerRow1, headerRow2].forEach(row => {
            row.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD3D3D3' }
                };
                cell.font = { bold: true, size: 12 };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
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

            // 업체들 - 요약 행은 수량(있으면 표시), 단가(빈칸), 금액만 표시
            rowData.vendors.forEach((vendor, vIdx) => {
                row.getCell(dataColIdx++).value = formatValue(vendor.quantity);  // 15,18,21열: 수량
                row.getCell(dataColIdx++).value = '';  // 16,19,22열: 단가 (항상 빈칸)
                row.getCell(dataColIdx++).value = formatValue(vendor.amount);  // 17,20,23열: 금액
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
                        // 수량 컬럼(5,9,12,15,18,21)은 소수점 2자리, 나머지는 정수
                        const isQuantityCol = [5, 9, 12, 15, 18, 21].includes(cellColIdx);
                        cell.numFmt = isQuantityCol ? '#,##0.00' : '#,##0';
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

        // 두 번째 데이터 행: 경량공사 요약
        const summaryRow = addDataRow(priceComparisonData.summaryRow);

        // 세 번째 데이터 행: 공과잡비
        const miscRow = addDataRow(priceComparisonData.miscRow);

        // 공과잡비 수식 적용
        const miscRowNum = miscRow.number;
        const summaryRowNum = summaryRow.number;

        // L열(12): 공과잡비 % 값 - 소수점 2자리 포맷
        miscRow.getCell(12).numFmt = '#,##0.00';

        miscRow.getCell(14).value = { formula: `=N${summaryRowNum}*(L${miscRowNum}/100)` };  // 14. 공과잡비 금액 = 경량공사 금액 × (% ÷ 100)
        miscRow.getCell(14).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(14).numFmt = '#,##0';

        // 업체1 공과잡비: 15열(% 입력), 16열(빈칸), 17열(금액)
        miscRow.getCell(15).value = priceComparisonData.miscRow.vendors[0]?.percent || 0;  // 15. 업체1 공과잡비 % (수량 열)
        miscRow.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(15).numFmt = '#,##0.00';
        miscRow.getCell(17).value = { formula: `=Q${summaryRowNum}*(O${miscRowNum}/100)` };  // 17. 업체1 공과잡비 금액 = 경량공사 × (% ÷ 100)
        miscRow.getCell(17).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(17).numFmt = '#,##0';

        // 업체2 공과잡비: 18열(% 입력), 19열(빈칸), 20열(금액)
        miscRow.getCell(18).value = priceComparisonData.miscRow.vendors[1]?.percent || 0;  // 18. 업체2 공과잡비 % (수량 열)
        miscRow.getCell(18).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(18).numFmt = '#,##0.00';
        miscRow.getCell(20).value = { formula: `=T${summaryRowNum}*(R${miscRowNum}/100)` };  // 20. 업체2 공과잡비 금액 = 경량공사 × (% ÷ 100)
        miscRow.getCell(20).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(20).numFmt = '#,##0';

        // 업체3 공과잡비: 21열(% 입력), 22열(빈칸), 23열(금액)
        miscRow.getCell(21).value = priceComparisonData.miscRow.vendors[2]?.percent || 0;  // 21. 업체3 공과잡비 % (수량 열)
        miscRow.getCell(21).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(21).numFmt = '#,##0.00';
        miscRow.getCell(23).value = { formula: `=W${summaryRowNum}*(U${miscRowNum}/100)` };  // 23. 업체3 공과잡비 금액 = 경량공사 × (% ÷ 100)
        miscRow.getCell(23).alignment = { vertical: 'middle', horizontal: 'right' };
        miscRow.getCell(23).numFmt = '#,##0';

        // 경량공사 행에 업체별 SUM 수식 추가 (자재비/노무비 합계)
        // 주의: materialStartRow, laborEndRow는 아직 정의되지 않았으므로 나중에 적용

        // 네 번째 데이터 행: 단수정리 (24칸 구조)
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
            '',  // 7. 계약도급 금액 (SUM 수식)
            '',  // 8. 단위
            '',  // 9. 발주수량
            '',  // 10. 진행도급 단가
            '',  // 11. 진행도급 금액 (SUM 수식)
            '',  // 12. 수량
            '',  // 13. 발주단가 단가
            '',  // 14. 발주단가 금액 (SUM 수식)
            '',  // 15. 수량2
            ...priceComparisonData.subtotalRow.vendors.flatMap((v, vIdx) => {
                const isLast = vIdx === priceComparisonData.subtotalRow.vendors.length - 1;
                return isLast ? ['', ''] : ['', '', ''];  // 16-23. 업체 3개 (단가, 금액, [수량])
            }),
            ''  // 24. 비고
        ]);

        // 단수정리 행에 업체별 수식 적용
        const roundingRowNum = roundingRow.number;

        // 업체1 단수정리: (경량공사 + 공과잡비)의 천단위 미만 × -1
        roundingRow.getCell(17).value = { formula: `=MOD(Q${summaryRowNum}+Q${miscRowNum}, 1000)*-1` };
        roundingRow.getCell(17).alignment = { vertical: 'middle', horizontal: 'right' };
        roundingRow.getCell(17).numFmt = '#,##0';

        // 업체2 단수정리
        roundingRow.getCell(20).value = { formula: `=MOD(T${summaryRowNum}+T${miscRowNum}, 1000)*-1` };
        roundingRow.getCell(20).alignment = { vertical: 'middle', horizontal: 'right' };
        roundingRow.getCell(20).numFmt = '#,##0';

        // 업체3 단수정리
        roundingRow.getCell(23).value = { formula: `=MOD(W${summaryRowNum}+W${miscRowNum}, 1000)*-1` };
        roundingRow.getCell(23).alignment = { vertical: 'middle', horizontal: 'right' };
        roundingRow.getCell(23).numFmt = '#,##0';

        // "합계" 행에 SUM 수식 적용 (경량공사 + 공과잡비 + 단수정리)
        subtotalRow.getCell(7).value = { formula: `=SUM(G${summaryRowNum},G${miscRowNum},G${roundingRowNum})` };   // 7. 계약도급 금액
        subtotalRow.getCell(11).value = { formula: `=SUM(K${summaryRowNum},K${miscRowNum},K${roundingRowNum})` };  // 11. 진행도급 금액
        subtotalRow.getCell(14).value = { formula: `=SUM(N${summaryRowNum},N${miscRowNum},N${roundingRowNum})` };  // 14. 발주단가 금액

        // 업체1 합계: 경량공사 + 공과잡비 + 단수정리
        subtotalRow.getCell(17).value = { formula: `=SUM(Q${summaryRowNum},Q${miscRowNum},Q${roundingRowNum})` };  // 17. 업체1 금액

        // 업체2 합계
        subtotalRow.getCell(20).value = { formula: `=SUM(T${summaryRowNum},T${miscRowNum},T${roundingRowNum})` };  // 20. 업체2 금액

        // 업체3 합계
        subtotalRow.getCell(23).value = { formula: `=SUM(W${summaryRowNum},W${miscRowNum},W${roundingRowNum})` };  // 23. 업체3 금액
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

        // 금액 컬럼만 우측 정렬 및 숫자 포맷
        subtotalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
        subtotalRow.getCell(7).numFmt = '#,##0';
        subtotalRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
        subtotalRow.getCell(11).numFmt = '#,##0';
        subtotalRow.getCell(14).alignment = { vertical: 'middle', horizontal: 'right' };
        subtotalRow.getCell(14).numFmt = '#,##0';

        // 업체별 금액 컬럼 우측 정렬 및 숫자 포맷
        subtotalRow.getCell(17).alignment = { vertical: 'middle', horizontal: 'right' };
        subtotalRow.getCell(17).numFmt = '#,##0';
        subtotalRow.getCell(20).alignment = { vertical: 'middle', horizontal: 'right' };
        subtotalRow.getCell(20).numFmt = '#,##0';
        subtotalRow.getCell(23).alignment = { vertical: 'middle', horizontal: 'right' };
        subtotalRow.getCell(23).numFmt = '#,##0';

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

        // 자재비 헤더 (24칸 구조)
        const materialHeaderRow = worksheet.addRow([
            '1-1', '자재비', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
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
        let materialStartRow = null;
        let materialEndRow = null;
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
                '',                                     // 6. 계약도급 단가 (수식)
                '',                                     // 7. 계약도급 금액 (수식)
                item.orderUnit || item.unit || '',      // 8. 단위
                item.orderQuantity || 0,                // 9. 발주수량
                '',                                     // 10. 진행도급 단가 (수식)
                item.progressAmount || 0,               // 11. 진행도급 금액
                item.orderPriceQuantity || 0,           // 12. 발주단가 수량
                item.unitPrice || 0,                    // 13. 발주단가 단가
                '',                                     // 14. 발주단가 금액 (수식)
                item.orderQuantity || 0, item.vendors[0]?.unitPrice || 0, '',  // 15-17. 업체1 (수량, 단가, 금액)
                item.orderQuantity || 0, item.vendors[1]?.unitPrice || 0, '',  // 18-20. 업체2 (수량, 단가, 금액)
                item.orderQuantity || 0, item.vendors[2]?.unitPrice || 0, '',  // 21-23. 업체3 (수량, 단가, 금액)
                ''                                      // 24. 비고
            ]);

            // 수식 적용
            const rowNum = itemRow.number;
            if (!materialStartRow) materialStartRow = rowNum;
            materialEndRow = rowNum;

            itemRow.getCell(6).value = { formula: `=M${rowNum}*1.2` };  // 6. 계약도급 단가 = 발주단가 × 1.2
            itemRow.getCell(7).value = { formula: `=E${rowNum}*F${rowNum}` };  // 7. 계약도급 금액 = 수량 × 계약도급 단가
            itemRow.getCell(10).value = { formula: `=F${rowNum}` };  // 10. 진행도급 단가 = 계약도급 단가
            itemRow.getCell(11).value = { formula: `=I${rowNum}*J${rowNum}` };  // 11. 진행도급 금액 = 발주수량 × 진행도급 단가
            itemRow.getCell(12).value = { formula: `=I${rowNum}` };  // 12. 발주단가 수량 = 발주수량
            itemRow.getCell(14).value = { formula: `=L${rowNum}*M${rowNum}` };  // 14. 발주단가 금액 = 발주단가 수량 × 발주단가 단가
            // 업체별 금액 수식 (발주수량 × 업체 단가)
            itemRow.getCell(17).value = { formula: `=I${rowNum}*P${rowNum}` };  // 17. 업체1 금액 = 9열(발주수량) × 16열(단가)
            itemRow.getCell(20).value = { formula: `=I${rowNum}*S${rowNum}` };  // 20. 업체2 금액 = 9열(발주수량) × 19열(단가)
            itemRow.getCell(23).value = { formula: `=I${rowNum}*V${rowNum}` };  // 23. 업체3 금액 = 9열(발주수량) × 22열(단가)

            itemRow.eachCell((cell, colIdx) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                // 숫자/금액 컬럼: 5-7, 9-23 (계약도급, 발주수량, 진행도급, 발주단가, 업체1/2/3)
                if ((colIdx >= 5 && colIdx <= 7) || (colIdx >= 9 && colIdx <= 23)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number' || cell.value?.formula) {
                        // 수량 컬럼(5,9,12,15,18,21)은 소수점 2자리, 나머지는 정수
                        const isQuantityCol = [5, 9, 12, 15, 18, 21].includes(colIdx);
                        cell.numFmt = isQuantityCol ? '#,##0.00' : '#,##0';
                    }
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            });
            materialItemNo++;
        });

        // 노무비 헤더 (24칸 구조)
        const laborHeaderRow = worksheet.addRow([
            '1-2', '노무비', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
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
        let laborStartRow = null;
        let laborEndRow = null;
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
                '',                                     // 6. 계약도급 단가 (수식)
                '',                                     // 7. 계약도급 금액 (수식)
                item.orderUnit || item.unit || '',      // 8. 단위
                item.orderQuantity || 0,                // 9. 발주수량
                '',                                     // 10. 진행도급 단가 (수식)
                item.progressAmount || 0,               // 11. 진행도급 금액
                item.orderPriceQuantity || 0,           // 12. 발주단가 수량
                item.unitPrice || 0,                    // 13. 발주단가 단가
                '',                                     // 14. 발주단가 금액 (수식)
                item.orderQuantity || 0, item.vendors[0]?.unitPrice || 0, '',  // 15-17. 업체1 (수량, 단가, 금액)
                item.orderQuantity || 0, item.vendors[1]?.unitPrice || 0, '',  // 18-20. 업체2 (수량, 단가, 금액)
                item.orderQuantity || 0, item.vendors[2]?.unitPrice || 0, '',  // 21-23. 업체3 (수량, 단가, 금액)
                ''                                      // 24. 비고
            ]);

            // 수식 적용
            const rowNum = itemRow.number;
            if (!laborStartRow) laborStartRow = rowNum;
            laborEndRow = rowNum;

            itemRow.getCell(6).value = { formula: `=M${rowNum}*1.2` };  // 6. 계약도급 단가 = 발주단가 × 1.2
            itemRow.getCell(7).value = { formula: `=E${rowNum}*F${rowNum}` };  // 7. 계약도급 금액 = 수량 × 계약도급 단가
            itemRow.getCell(10).value = { formula: `=F${rowNum}` };  // 10. 진행도급 단가 = 계약도급 단가
            itemRow.getCell(11).value = { formula: `=I${rowNum}*J${rowNum}` };  // 11. 진행도급 금액 = 발주수량 × 진행도급 단가
            itemRow.getCell(12).value = { formula: `=I${rowNum}` };  // 12. 발주단가 수량 = 발주수량
            itemRow.getCell(14).value = { formula: `=L${rowNum}*M${rowNum}` };  // 14. 발주단가 금액 = 발주단가 수량 × 발주단가 단가
            // 업체별 금액 수식 (발주수량 × 업체 단가)
            itemRow.getCell(17).value = { formula: `=I${rowNum}*P${rowNum}` };  // 17. 업체1 금액 = 9열(발주수량) × 16열(단가)
            itemRow.getCell(20).value = { formula: `=I${rowNum}*S${rowNum}` };  // 20. 업체2 금액 = 9열(발주수량) × 19열(단가)
            itemRow.getCell(23).value = { formula: `=I${rowNum}*V${rowNum}` };  // 23. 업체3 금액 = 9열(발주수량) × 22열(단가)

            itemRow.eachCell((cell, colIdx) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                // 숫자/금액 컬럼: 5-7, 9-23 (계약도급, 발주수량, 진행도급, 발주단가, 업체1/2/3)
                if ((colIdx >= 5 && colIdx <= 7) || (colIdx >= 9 && colIdx <= 23)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                    if (typeof cell.value === 'number' || cell.value?.formula) {
                        // 수량 컬럼(5,9,12,15,18,21)은 소수점 2자리, 나머지는 정수
                        const isQuantityCol = [5, 9, 12, 15, 18, 21].includes(colIdx);
                        cell.numFmt = isQuantityCol ? '#,##0.00' : '#,##0';
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
            '',                     // 7. 계약도급 금액 (SUM 수식)
            '',                     // 8. 단위
            '',                     // 9. 발주수량
            '',                     // 10. 진행도급 단가
            '',                     // 11. 진행도급 금액 (SUM 수식)
            '',                     // 12. 수량
            '',                     // 13. 발주단가 단가
            '',                     // 14. 발주단가 금액 (SUM 수식)
            '',                     // 15. 수량2
            ...priceComparisonData.finalTotalRow.vendors.flatMap((v, vIdx) => {
                const isLast = vIdx === priceComparisonData.finalTotalRow.vendors.length - 1;
                return isLast ? ['', ''] : ['', '', ''];  // 16-23. 업체들 (모두 빈칸)
            }),
            ''                      // 24. 비고
        ]);

        // "계" 행에 SUM 수식 적용
        if (materialStartRow && laborEndRow) {
            finalTotalRow.getCell(7).value = { formula: `=SUM(G${materialStartRow}:G${laborEndRow})` };  // 7. 계약도급 금액
            finalTotalRow.getCell(11).value = { formula: `=SUM(K${materialStartRow}:K${laborEndRow})` };  // 11. 진행도급 금액
            finalTotalRow.getCell(14).value = { formula: `=SUM(N${materialStartRow}:N${laborEndRow})` };  // 14. 발주단가 금액
            // 업체별 합계 수식 추가
            finalTotalRow.getCell(17).value = { formula: `=SUM(Q${materialStartRow}:Q${laborEndRow})` };  // 17. 업체1 금액
            finalTotalRow.getCell(20).value = { formula: `=SUM(T${materialStartRow}:T${laborEndRow})` };  // 20. 업체2 금액
            finalTotalRow.getCell(23).value = { formula: `=SUM(W${materialStartRow}:W${laborEndRow})` };  // 23. 업체3 금액

            // 경량공사 행에 업체별 SUM 수식 추가 (이제 materialStartRow, laborEndRow 사용 가능)
            summaryRow.getCell(17).value = { formula: `=SUM(Q${materialStartRow}:Q${laborEndRow})` };  // 17. 업체1 금액
            summaryRow.getCell(20).value = { formula: `=SUM(T${materialStartRow}:T${laborEndRow})` };  // 20. 업체2 금액
            summaryRow.getCell(23).value = { formula: `=SUM(W${materialStartRow}:W${laborEndRow})` };  // 23. 업체3 금액
        }
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
        // 업체 금액 컬럼 포맷팅
        finalTotalRow.getCell(17).alignment = { vertical: 'middle', horizontal: 'right' };
        finalTotalRow.getCell(17).numFmt = '#,##0';
        finalTotalRow.getCell(20).alignment = { vertical: 'middle', horizontal: 'right' };
        finalTotalRow.getCell(20).numFmt = '#,##0';
        finalTotalRow.getCell(23).alignment = { vertical: 'middle', horizontal: 'right' };
        finalTotalRow.getCell(23).numFmt = '#,##0';

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
        for (let rowNum = 5; rowNum <= lastRow; rowNum++) {
            const cell = worksheet.getRow(rowNum).getCell(2);
            if (cell.value) {
                cell.alignment = { ...cell.alignment, horizontal: 'left' };
            }
        }

        // 헤더(3-4행) 품명은 가운데 정렬 유지
        worksheet.getRow(3).getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(4).getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

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

        // 3. 내부 선 스타일 적용 (내부 세로선: 실선, 내부 가로선: 점선) - 3행부터
        for (let rowNum = 3; rowNum <= lastRow; rowNum++) {
            for (let colNum = 1; colNum <= lastCol; colNum++) {
                const cell = worksheet.getRow(rowNum).getCell(colNum);

                cell.border = {
                    top: { style: 'dotted' },
                    bottom: { style: 'dotted' },
                    left: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
        }

        // 4. 타이틀 행(1-2행) 테두리 제거
        for (let rowNum = 1; rowNum <= 2; rowNum++) {
            for (let colNum = 1; colNum <= lastCol; colNum++) {
                worksheet.getRow(rowNum).getCell(colNum).border = {};
            }
        }

        // 5. 헤더 내부 가로선 실선 (3행 하단 = 4행 상단)
        for (let colNum = 1; colNum <= lastCol; colNum++) {
            const cell3 = worksheet.getRow(3).getCell(colNum);
            const cell4 = worksheet.getRow(4).getCell(colNum);

            // rowspan 열이 아닌 경우만 내부 가로선 적용
            if (!rowspanColumns.includes(colNum)) {
                cell3.border = {
                    ...cell3.border,
                    bottom: { style: 'thin' }
                };

                cell4.border = {
                    ...cell4.border,
                    top: { style: 'thin' },
                    bottom: { style: 'thin' }
                };
            } else {
                // rowspan 열: 4행 하단만 thin
                cell4.border = {
                    ...cell4.border,
                    bottom: { style: 'thin' }
                };
            }
        }

        // 6. 전체 외곽선 굵은선 적용 (타이틀 행 제외, 3행부터 시작) - 마지막에 적용!
        // 상단 외곽선 (3행)
        for (let col = 1; col <= lastCol; col++) {
            const cell = worksheet.getRow(3).getCell(col);
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

        // 좌측 외곽선 (3행부터)
        for (let row = 3; row <= lastRow; row++) {
            const cell = worksheet.getRow(row).getCell(1);
            cell.border = {
                ...cell.border,
                left: { style: 'medium' }
            };
        }

        // 우측 외곽선 (3행부터)
        for (let row = 3; row <= lastRow; row++) {
            const cell = worksheet.getRow(row).getCell(lastCol);
            cell.border = {
                ...cell.border,
                right: { style: 'medium' }
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
async function convertCalculationResultsToDetailSections() {
    console.log('🔄 계산 결과를 상세 섹션으로 변환 시작 (layerPricing 기반)');

    // calculationResults가 없으면 빈 배열 반환
    if (typeof window.calculationResults === 'undefined' || !window.calculationResults || window.calculationResults.length === 0) {
        console.warn('⚠️ calculationResults가 없습니다');
        return { materials: [], labor: [] };
    }

    console.log(`📊 변환할 계산 결과: ${window.calculationResults.length}개 벽체`);

    // 자재별 집계 (공종 구분 없이)
    const groupedItems = {};

    for (const [resultIdx, result] of window.calculationResults.entries()) {
        console.log(`  📋 처리 중: ${resultIdx + 1}/${window.calculationResults.length} - ${result.wallName} (${result.area.toFixed(2)} M2)`);

        // layerPricing이 없으면 스킵
        if (!result.layerPricing) {
            console.warn(`    ⚠️ layerPricing이 없음`);
            continue;
        }

        // 각 레이어별로 처리 (11개 레이어)
        for (const [layerKey, layer] of Object.entries(result.layerPricing)) {
            // found=false이거나 materialName이 없으면 스킵
            if (!layer.found || !layer.materialName) {
                continue;
            }

            // DB에서 자재 정보 가져오기
            let materialName, spec, unit;

            if (typeof window.findMaterialInUnitPriceDB === 'function') {
                const materialInfo = await window.findMaterialInUnitPriceDB(layer.materialName);

                if (materialInfo && materialInfo.name) {
                    // DB에서 찾음: 정확한 품명 + 규격
                    materialName = materialInfo.name;
                    spec = materialInfo.spec || '';
                    unit = materialInfo.unit || layer.unit || 'M2';
                    console.log(`    🔹 레이어: ${layerKey} → ${materialName} (${spec}) [DB]`);
                } else {
                    // DB에서 못 찾음: 파싱으로 폴백
                    const parsed = parseUnitPriceId(layer.materialName);
                    materialName = parsed.itemName || layer.materialName;
                    spec = parsed.spec || '';
                    unit = layer.unit || 'M2';
                    console.warn(`    ⚠️ DB에서 못 찾음, 파싱 사용: ${layerKey} → ${materialName} (${spec})`);
                }
            } else {
                // findMaterialInUnitPriceDB 없음: 파싱으로 폴백
                const parsed = parseUnitPriceId(layer.materialName);
                materialName = parsed.itemName || layer.materialName;
                spec = parsed.spec || '';
                unit = layer.unit || 'M2';
                console.log(`    🔹 레이어: ${layerKey} → ${materialName} (${spec}) [파싱]`);
            }

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
                    laborAmount: 0,
                    originalUnitPriceIds: []  // ★ 원본 unitPriceId 저장용
                };
            }

            // ★ 원본 unitPriceId 저장 (중복 방지)
            if (layer.materialName && !groupedItems[itemKey].originalUnitPriceIds.includes(layer.materialName)) {
                groupedItems[itemKey].originalUnitPriceIds.push(layer.materialName);
            }

            // 수량 = 벽체 면적 (레이어는 이미 M2당 단가임)
            const qty = parseFloat(result.area) || 0;

            // 수량 및 금액 누적
            groupedItems[itemKey].quantity += qty;
            groupedItems[itemKey].materialAmount += (layer.materialPrice || 0) * qty;
            groupedItems[itemKey].laborAmount += (layer.laborPrice || 0) * qty;

            console.log(`      ✅ 누적: 수량 ${qty.toFixed(2)} M2, 자재비 ${Math.round((layer.materialPrice || 0) * qty).toLocaleString()}원, 노무비 ${Math.round((layer.laborPrice || 0) * qty).toLocaleString()}원`);
        }
    }

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
                quantity: Math.round(item.quantity * 100) / 100,  // 소수점 2자리 (계약수량)
                unitPrice: Math.round(item.materialUnitPrice),    // 발주단가 단가 (13번 컬럼)
                amount: Math.round(item.materialAmount),          // 자재비 총액
                contractRatio: 1.2,                               // 계약도급 비율 (기본값 1.2)
                contractUnitPrice: Math.round(item.materialUnitPrice * 1.2),  // 계약도급 단가 (6번)
                contractAmount: Math.round(item.quantity * item.materialUnitPrice * 1.2),  // 계약도급 금액 (7번)
                // 발주도급 관련 필드
                orderUnit: item.unit,                             // 발주도급 단위 (동일)
                orderQuantity: 0,                                 // 발주수량 (입력 가능)
                progressUnitPrice: Math.round(item.materialUnitPrice * 1.2),  // 진행도급 단가 (계약도급 복사)
                progressAmount: 0,                                // 진행도급 금액 (자동 계산)
                // 발주단가 관련 필드
                orderPriceQuantity: 0,                            // 발주단가 수량 (발주수량 자동 복사)
                orderPriceUnitPrice: 0,                           // 발주단가 단가 (입력 가능)
                orderPriceAmount: 0,                              // 발주단가 금액 (자동 계산)
                // ★ 원본 unitPriceIds 저장 (정확한 벽체 매칭용)
                originalUnitPriceIds: item.originalUnitPriceIds || [],
                // 업체별 필드
                vendors: [
                    { name: '업체1', unitPrice: 0, amount: 0, quantity: 0 },
                    { name: '업체2', unitPrice: 0, amount: 0, quantity: 0 },
                    { name: '업체3', unitPrice: 0, amount: 0 }
                ]
            });

            // 노무비 아이템
            labor.push({
                itemName: item.itemName,
                spec: item.spec,
                unit: item.unit,
                quantity: Math.round(item.quantity * 100) / 100,  // 소수점 2자리 (계약수량)
                unitPrice: Math.round(item.laborUnitPrice),       // 발주단가 단가 (13번 컬럼)
                amount: Math.round(item.laborAmount),             // 노무비 총액
                contractRatio: 1.2,                               // 계약도급 비율 (기본값 1.2)
                contractUnitPrice: Math.round(item.laborUnitPrice * 1.2),  // 계약도급 단가 (6번)
                contractAmount: Math.round(item.quantity * item.laborUnitPrice * 1.2),     // 계약도급 금액 (7번)
                // 발주도급 관련 필드
                orderUnit: item.unit,                             // 발주도급 단위 (동일)
                orderQuantity: 0,                                 // 발주수량 (입력 가능)
                progressUnitPrice: Math.round(item.laborUnitPrice * 1.2),  // 진행도급 단가 (계약도급 복사)
                progressAmount: 0,                                // 진행도급 금액 (자동 계산)
                // 발주단가 관련 필드
                orderPriceQuantity: 0,                            // 발주단가 수량 (발주수량 자동 복사)
                orderPriceUnitPrice: 0,                           // 발주단가 단가 (입력 가능)
                orderPriceAmount: 0,                              // 발주단가 금액 (자동 계산)
                // ★ 원본 unitPriceIds 저장 (정확한 벽체 매칭용)
                originalUnitPriceIds: item.originalUnitPriceIds || [],
                // 업체별 필드
                vendors: [
                    { name: '업체1', unitPrice: 0, amount: 0, quantity: 0 },
                    { name: '업체2', unitPrice: 0, amount: 0, quantity: 0 },
                    { name: '업체3', unitPrice: 0, amount: 0 }
                ]
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
window.renderPriceComparisonTable = async function() {
    console.log('💰 단가비교표 테이블 렌더링 시작');

    const container = document.getElementById('priceComparisonContainer');
    if (!container) {
        console.error('❌ priceComparisonContainer를 찾을 수 없습니다');
        return;
    }

    // calculationResults를 detailSections으로 변환
    const detailSections = await convertCalculationResultsToDetailSections();
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

// =============================================================================
// Phase 10: 자재별 Revit 벽체 3D 뷰 색상 표시 기능
// =============================================================================

/**
 * HTML 이스케이프 처리
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 특수문자와 공백 제거하여 정규화 (비교용)
 * 예: "9.5T*1PLY" → "95t1ply", "C-STUD" → "cstud"
 */
function normalizeForSearch(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
}

/**
 * 특정 자재가 포함된 벽체의 ElementId 목록 반환
 * @param {string} itemName - 품명 (예: "C-STUD")
 * @param {string} spec - 규격 (예: "65형")
 * @param {string} unitPriceIds - 원본 unitPriceId 목록 (콤마 구분, 정확한 매칭용)
 * @returns {Array<string>} ElementId 배열
 */
function findWallsByMaterial(itemName, spec, unitPriceIds = '') {
    const matchingWalls = [];

    // calculationResults가 없으면 빈 배열 반환
    if (!window.calculationResults || !Array.isArray(window.calculationResults)) {
        console.warn('⚠️ calculationResults가 없습니다. 먼저 계산을 실행해 주세요.');
        return matchingWalls;
    }

    // ★ unitPriceIds가 있으면 정확한 매칭 모드
    const exactMatchIds = unitPriceIds ? unitPriceIds.split(',').filter(id => id.trim()) : [];
    const useExactMatch = exactMatchIds.length > 0;

    // 검색어 정규화 (특수문자 제거) - 폴백 매칭용
    const normalizedItemName = normalizeForSearch(itemName);
    const normalizedSpec = spec ? normalizeForSearch(spec) : '';

    if (useExactMatch) {
        console.log(`🔍 자재 검색 (정확한 매칭): 품명="${itemName}", 규격="${spec || ''}", IDs: ${exactMatchIds.length}개`);
    } else {
        console.log(`🔍 자재 검색 (폴백 매칭): 품명="${itemName}"(${normalizedItemName}), 규격="${spec || ''}"(${normalizedSpec})`);
    }

    // calculationResults에서 검색
    for (const result of window.calculationResults) {
        let hasMaterial = false;

        // 일위대가 방식: layerPricing 검색
        // layerPricing 구조: { layer3_1: { materialName: "unitPrice_...", ... }, ... }
        if (result.layerPricing && typeof result.layerPricing === 'object') {
            for (const [layerKey, layer] of Object.entries(result.layerPricing)) {
                if (layer && layer.materialName) {
                    // ★ 정확한 매칭 모드: unitPriceId로 정확히 비교
                    if (useExactMatch) {
                        if (exactMatchIds.includes(layer.materialName)) {
                            hasMaterial = true;
                            console.log(`  ✅ 정확한 매칭: ${result.wallName} - ${layerKey}`);
                            console.log(`     ID: "${layer.materialName}"`);
                            break;
                        }
                    } else {
                        // 폴백: 품명/규격 포함 매칭 (기존 로직)
                        const normalizedMaterial = normalizeForSearch(layer.materialName);
                        const nameMatch = normalizedMaterial.includes(normalizedItemName);
                        const specMatch = !normalizedSpec || normalizedMaterial.includes(normalizedSpec);

                        if (nameMatch && specMatch) {
                            hasMaterial = true;
                            console.log(`  ✅ 폴백 매칭: ${result.wallName} - ${layerKey}`);
                            console.log(`     원본: "${layer.materialName}"`);
                            console.log(`     정규화 비교: "${normalizedMaterial}".includes("${normalizedItemName}") && includes("${normalizedSpec}")`);
                            break;
                        }
                    }
                }
            }
        }

        // 엑셀 방식: wallType에서 레이어 정보 검색
        if (!hasMaterial && result.source === 'excel' && result.wallType) {
            const layerFields = ['layer3_1', 'layer2_1', 'layer1_1', 'column1', 'infill',
                                 'layer1_2', 'layer2_2', 'layer3_2', 'column2', 'channel', 'runner', 'steelPlate'];

            for (const field of layerFields) {
                const unitPriceId = result.wallType[field];
                if (unitPriceId && window.ExcelUnitPriceImporter) {
                    const unitPrice = window.excelUnitPriceCache?.[unitPriceId];
                    if (unitPrice) {
                        const normalizedItem = normalizeForSearch(unitPrice.item);
                        const normalizedUnitSpec = normalizeForSearch(unitPrice.spec);

                        const nameMatch = normalizedItem.includes(normalizedItemName);
                        const specMatch = !normalizedSpec || normalizedUnitSpec.includes(normalizedSpec);

                        if (nameMatch && specMatch) {
                            hasMaterial = true;
                            console.log(`  ✅ 엑셀 매칭: ${result.wallName} - ${field}: "${unitPrice.item} ${unitPrice.spec}"`);
                            break;
                        }
                    }
                }
            }
        }

        // elementId로 벽체 추가
        if (hasMaterial && result.elementId) {
            matchingWalls.push(result.elementId);
        }
    }

    console.log(`🔍 "${itemName} ${spec || ''}" 검색 결과: ${matchingWalls.length}개 벽체`);
    return matchingWalls;
}

/**
 * 자재별 벽체 3D 뷰 색상 표시 버튼 클릭 핸들러
 * @param {string} itemName - 품명
 * @param {string} spec - 규격
 * @param {string} unitPriceIds - 원본 unitPriceId 목록 (콤마 구분, 정확한 매칭용)
 */
async function handleViewMaterialWalls(itemName, spec, unitPriceIds = '') {
    // 1. 연결 상태 확인
    if (!window.socketService?.isConnected) {
        alert('서버에 연결되어 있지 않습니다.');
        return;
    }
    if (!window.socketService?.revitConnected) {
        alert('Revit이 연결되어 있지 않습니다.\nRevit을 실행하고 애드인을 활성화해 주세요.');
        return;
    }

    // 2. 해당 자재가 포함된 벽체 찾기 (★ unitPriceIds로 정확한 매칭)
    const elementIds = findWallsByMaterial(itemName, spec, unitPriceIds);

    if (elementIds.length === 0) {
        const materialName = spec ? `${itemName} ${spec}` : itemName;
        alert(`"${materialName}"이(가) 포함된 벽체가 없습니다.\n\n※ 먼저 [계산하기] 버튼으로 벽체를 계산해 주세요.`);
        return;
    }

    // 3. 컬러 피커 모달 표시
    showColorPickerModal(itemName, spec, elementIds);
}

/**
 * 컬러 피커 모달 표시
 * @param {string} itemName - 품명
 * @param {string} spec - 규격
 * @param {Array} elementIds - 적용할 벽체 ElementId 배열
 */
function showColorPickerModal(itemName, spec, elementIds) {
    const viewName = spec ? `${itemName} ${spec}` : itemName;

    const modalHTML = `
        <div style="position: relative; padding-top: 5px;">
            <!-- X 닫기 버튼 -->
            <button id="btnCloseColorModal" style="
                position: absolute;
                top: 5px;
                right: 5px;
                width: 28px;
                height: 28px;
                border: none;
                background: #64748b;
                color: white;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
            " title="닫기">&times;</button>

            <div style="text-align: center; padding-top: 10px;">
                <p style="margin-bottom: 15px; font-size: 14px; color: #334155;">
                    <strong>${escapeHtml(viewName)}</strong>
                    <br>
                    <span style="color: #64748b; font-size: 12px;">${elementIds.length}개 벽체에 색상 적용</span>
                </p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label style="font-size: 13px; color: #64748b;">색상:</label>
                        <input type="color" id="materialColorPicker" value="#ff6b6b"
                               style="width: 60px; height: 36px; cursor: pointer; border: 2px solid #cbd5e1; border-radius: 6px; padding: 2px;">
                    </div>
                    <button id="btnApplyColor" class="btn btn-blue" style="padding: 8px 24px; border-radius: 6px; background: #2563eb; color: white; border: none; font-size: 13px;">적용</button>
                </div>
            </div>
        </div>
    `;

    const modal = window.createSubModal('', modalHTML, [], {
        width: '400px',
        disableBackgroundClick: true,
        disableEscapeKey: true
    });

    // 모달의 패딩 조정
    const subModal = modal?.querySelector?.('.sub-modal');
    if (subModal) {
        subModal.style.padding = '20px';
    }

    // X 닫기 버튼 이벤트
    document.getElementById('btnCloseColorModal')?.addEventListener('click', () => {
        window.closeSubModal?.(modal);
    });

    // 적용 버튼 이벤트
    document.getElementById('btnApplyColor')?.addEventListener('click', () => {
        const colorInput = document.getElementById('materialColorPicker');
        const hexColor = colorInput?.value || '#ff6b6b';
        const rgb = hexToRgb(hexColor);

        // Revit 명령 전송
        window.socketService.sendRevitCommand('DUPLICATE_3D_VIEW_WITH_COLOR', {
            viewName: viewName,
            elementIds: elementIds,
            color: rgb
        });

        window.showToast?.(`${viewName}: ${elementIds.length}개 벽체 색상 표시 요청...`, 'info');

        window.closeSubModal?.(modal);
    });
}

/**
 * HEX → RGB 변환
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 100, b: 100 };
}

// 이벤트 위임: 자재별 3D 뷰 버튼 클릭 처리
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-view-material-walls');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const itemName = btn.dataset.itemName;
        const spec = btn.dataset.itemSpec;
        const unitPriceIds = btn.dataset.unitPriceIds || '';  // ★ 정확한 매칭용 ID 목록
        handleViewMaterialWalls(itemName, spec, unitPriceIds);
    }
});

console.log('✅ 단가비교표 관리 모듈 로드 완료');
