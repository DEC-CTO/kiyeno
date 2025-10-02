// =============================================================================
// 단가비교표 관리 모듈
// =============================================================================

// 전역 데이터 (IndexedDB 사용 안 함, 메모리만 사용)
let priceComparisonData = {
    siteName: '',  // 현장명 (첫 번째 행 품명 칸)
    summaryRow: {  // 2번째 행: 경량공사 요약
        itemName: '경량공사',
        spec: '3*6*9.5T*2PLY/3600이하',
        unit: '식',
        contractQty: 10000.00,
        contractPrice: { unitPrice: 10000, amount: 5780000 },
        orderUnit: '식',
        orderQuantity: 10000.00,
        progressPrice: { unitPrice: 10000, amount: 4621000 },
        progressQuantity: 10000.00,
        orderPrice: { unitPrice: 10000, amount: 3981000 },
        orderQuantity2: 10000.00,
        vendors: [
            { name: '업체1', unitPrice: 10000, amount: 4277500, quantity: 10000.00 },
            { name: '업체2', unitPrice: 10000, amount: 4277500, quantity: 10000.00 },
            { name: '업체3', unitPrice: 10000, amount: 4277500 }
        ],
        remarks: ''
    },
    items: []
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
            spec: '3*6*9.5T*2PLY/3600이하',
            unit: '식',
            contractQty: 10000.00,
            contractPrice: { unitPrice: 10000, amount: 5780000 },
            orderUnit: '식',
            orderQuantity: 10000.00,
            progressPrice: { unitPrice: 10000, amount: 4621000 },
            progressQuantity: 10000.00,
            orderPrice: { unitPrice: 10000, amount: 3981000 },
            orderQuantity2: 10000.00,
            vendors: [
                { name: '업체1', unitPrice: 10000, amount: 4277500, quantity: 10000.00 },
                { name: '업체2', unitPrice: 10000, amount: 4277500, quantity: 10000.00 },
                { name: '업체3', unitPrice: 10000, amount: 4277500 }
            ],
            remarks: ''
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
            ${Array.from({ length: vendorCount === 3 ? 7 : vendorCount * 3 }).map(() => '<td></td>').join('')}
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

    // 두 번째 행: 경량공사 요약 (NO는 빈칸)
    const summaryRow = `
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
            <td class="number-cell">${formatQuantity(priceComparisonData.summaryRow.orderQuantity2)}</td>
            ${priceComparisonData.summaryRow.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === priceComparisonData.summaryRow.vendors.length - 1;
                return `
                    <td class="number-cell">${formatNumber(vendor.unitPrice)}</td>
                    <td class="number-cell">${formatNumber(vendor.amount)}</td>
                    ${isLast ? '' : `<td class="number-cell">${formatQuantity(vendor.quantity)}</td>`}
                `;
            }).join('')}
            <td>${priceComparisonData.summaryRow.remarks || ''}</td>
        </tr>
    `;

    // 첫 번째 행 + 두 번째 행 + 데이터 행들 결합
    tbody.innerHTML = firstRow + summaryRow + dataRows;
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
 * Excel 파일로 내보내기
 */
function exportPriceComparisonToExcel() {
    const vendorCount = priceComparisonData.items[0]?.vendors.length || 3;

    let htmlContent = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 11px; }
                th { background-color: #667eea; color: white; font-weight: bold; }
                .supply-row { background-color: #e3f2fd; }
                .expense-row { background-color: #fff3cd; }
                .total-row { background-color: #d1ecf1; font-weight: bold; }
                .number { text-align: right; }
            </style>
        </head>
        <body>
            <h2>단가비교표</h2>
            <table>
                <thead>
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
                </thead>
                <tbody>
    `;

    // 첫 번째 행: 현장명
    htmlContent += `
        <tr>
            <td></td>
            <td>${priceComparisonData.siteName || ''}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            ${Array.from({ length: vendorCount === 3 ? 7 : vendorCount * 3 }).map(() => '<td></td>').join('')}
            <td></td>
        </tr>
    `;

    // 두 번째 행: 경량공사 요약
    const summary = priceComparisonData.summaryRow;
    htmlContent += `
        <tr>
            <td></td>
            <td>${summary.itemName}</td>
            <td>${summary.spec}</td>
            <td>${summary.unit}</td>
            <td class="number">${formatNumber(summary.contractQty)}</td>
            <td class="number">${formatNumber(summary.contractPrice.unitPrice)}</td>
            <td class="number">${formatNumber(summary.contractPrice.amount)}</td>
            <td>${summary.orderUnit}</td>
            <td class="number">${formatNumber(summary.orderQuantity)}</td>
            <td class="number">${formatNumber(summary.progressPrice.unitPrice)}</td>
            <td class="number">${formatNumber(summary.progressPrice.amount)}</td>
            <td class="number">${formatNumber(summary.progressQuantity)}</td>
            <td class="number">${formatNumber(summary.orderPrice.unitPrice)}</td>
            <td class="number">${formatNumber(summary.orderPrice.amount)}</td>
            <td class="number">${formatNumber(summary.orderQuantity2)}</td>
            ${summary.vendors.map((vendor, vIdx) => {
                const isLast = vIdx === summary.vendors.length - 1;
                return `
                    <td class="number">${formatNumber(vendor.unitPrice)}</td>
                    <td class="number">${formatNumber(vendor.amount)}</td>
                    ${isLast ? '' : `<td class="number">${formatNumber(vendor.quantity)}</td>`}
                `;
            }).join('')}
            <td>${summary.remarks}</td>
        </tr>
    `;

    priceComparisonData.items.forEach(item => {
        // 데이터 행 (1줄)
        htmlContent += `
            <tr>
                <td>${item.no}</td>
                <td>${item.itemName}</td>
                <td>${item.spec}</td>
                <td>${item.unit}</td>
                <td class="number">${formatNumber(item.contractQty)}</td>
                <td class="number">${formatNumber(item.contractPrice.unitPrice)}</td>
                <td class="number">${formatNumber(item.contractPrice.amount)}</td>
                <td>${item.orderUnit}</td>
                <td class="number">${formatNumber(item.orderQuantity)}</td>
                <td class="number">${formatNumber(item.progressPrice.unitPrice)}</td>
                <td class="number">${formatNumber(item.progressPrice.amount)}</td>
                <td class="number">${formatNumber(item.progressQuantity)}</td>
                <td class="number">${formatNumber(item.orderPrice.unitPrice)}</td>
                <td class="number">${formatNumber(item.orderPrice.amount)}</td>
                <td class="number">${formatNumber(item.orderQuantity2)}</td>
                ${item.vendors.map((vendor, vIdx) => {
                    const isLast = vIdx === item.vendors.length - 1;
                    return `
                        <td class="number">${formatNumber(vendor.unitPrice)}</td>
                        <td class="number">${formatNumber(vendor.amount)}</td>
                        ${isLast ? '' : `<td class="number">${formatNumber(vendor.quantity)}</td>`}
                    `;
                }).join('')}
                <td>${item.remarks}</td>
            </tr>
        `;
    });

    htmlContent += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    const fileName = `단가비교표_${new Date().toISOString().split('T')[0]}.xls`;
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ Excel 파일 내보내기 완료:', fileName);
    alert('Excel 파일이 다운로드되었습니다.');
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

console.log('✅ 단가비교표 관리 모듈 로드 완료');
