/**
 * 결과물 디스플레이 시스템
 * 4가지 보기 모드: 기본값보기, 타입별보기, 재료별보기, 공종별보기
 */

// 디스플레이 시스템 네임스페이스
window.DisplaySystem = {
    currentMode: 'default', // 기본값보기
    
    // 보기 모드 정의
    viewModes: {
        default: { name: '기본값보기', icon: 'fas fa-list-alt' },
        type: { name: '타입별보기', icon: 'fas fa-layer-group' },
        material: { name: '재료별보기', icon: 'fas fa-box' },
        workType: { name: '공종별보기', icon: 'fas fa-hard-hat' }
    },

    // 모드 변경
    setMode(mode) {
        if (this.viewModes[mode]) {
            this.currentMode = mode;
            this.render();
            this.updateDropdownButton();
            this.updateDropdownItems();
        }
    },

    // 드롭다운 버튼 업데이트
    updateDropdownButton() {
        const button = document.getElementById('displayModeButton');
        const currentMode = this.viewModes[this.currentMode];
        if (button && currentMode) {
            button.innerHTML = `
                <i class="${currentMode.icon}"></i>
                ${currentMode.name}
                <i class="fas fa-chevron-down"></i>
            `;
        }
    },

    // 드롭다운 아이템 활성 상태 업데이트
    updateDropdownItems() {
        const items = document.querySelectorAll('.display-mode-dropdown-item');
        items.forEach((item, index) => {
            const modes = ['default', 'type', 'material', 'workType'];
            if (modes[index] === this.currentMode) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    // 메인 렌더링 함수
    render() {
        const container = document.getElementById('displayContainer');
        if (!container) return;

        let html = '';
        
        switch (this.currentMode) {
            case 'default':
                html = this.renderDefaultView();
                break;
            case 'type':
                html = this.renderTypeView();
                break;
            case 'material':
                html = this.renderMaterialView();
                break;
            case 'workType':
                html = this.renderWorkTypeView();
                break;
        }

        container.innerHTML = html;
    },

    // 기본값보기 렌더링
    renderDefaultView() {
        const sampleData = [
            {
                no: 1,
                room: '회의실',
                location: 'W',
                workType: '경량',
                itemName: 'C-STUD',
                spec: '65형',
                unit: 'M2',
                qty: 100.00,
                materialUnitPrice: 8500,
                materialAmount: 850000,
                contractLaborUnitPrice: 8000,
                contractLaborAmount: 800000,
                contractTotal: 1650000,
                actualMaterialUnitPrice: 7500,
                actualMaterialAmount: 750000,
                actualLaborUnitPrice: 7000,
                actualLaborAmount: 700000,
                actualTotal: 1450000
            },
            {
                no: 2,
                room: '회의실',
                location: 'W',
                workType: '간자재',
                itemName: '석고보드',
                spec: '9.5T*2P',
                unit: 'M2',
                qty: 100.00,
                materialUnitPrice: 7000,
                materialAmount: 700000,
                contractLaborUnitPrice: 0,
                contractLaborAmount: 0,
                contractTotal: 700000,
                actualMaterialUnitPrice: 5000,
                actualMaterialAmount: 500000,
                actualLaborUnitPrice: 0,
                actualLaborAmount: 0,
                actualTotal: 500000
            },
            {
                no: 3,
                room: '회의실',
                location: 'W',
                workType: '경량',
                itemName: '석고보드 취부',
                spec: '9.5T*2P',
                unit: 'M2',
                qty: 100.00,
                materialUnitPrice: 0,
                materialAmount: 0,
                contractLaborUnitPrice: 7200,
                contractLaborAmount: 720000,
                contractTotal: 720000,
                actualMaterialUnitPrice: 0,
                actualMaterialAmount: 0,
                actualLaborUnitPrice: 5200,
                actualLaborAmount: 520000,
                actualTotal: 520000
            },
            {
                no: 4,
                room: '회의실',
                location: 'W',
                workType: '도장',
                itemName: 'ALL PUTTY',
                spec: '',
                unit: 'M2',
                qty: 100.00,
                materialUnitPrice: 3400,
                materialAmount: 340000,
                contractLaborUnitPrice: 6600,
                contractLaborAmount: 660000,
                contractTotal: 1000000,
                actualMaterialUnitPrice: 2400,
                actualMaterialAmount: 240000,
                actualLaborUnitPrice: 5600,
                actualLaborAmount: 560000,
                actualTotal: 800000
            },
            {
                no: 5,
                room: '회의실',
                location: 'W',
                workType: '도장',
                itemName: '수성도장',
                spec: '',
                unit: 'M2',
                qty: 100.00,
                materialUnitPrice: 2800,
                materialAmount: 280000,
                contractLaborUnitPrice: 7200,
                contractLaborAmount: 720000,
                contractTotal: 1000000,
                actualMaterialUnitPrice: 1800,
                actualMaterialAmount: 180000,
                actualLaborUnitPrice: 6200,
                actualLaborAmount: 620000,
                actualTotal: 800000
            }
        ];

        return `
            <div class="display-table-container">
                <div class="display-table-scroll">
                    <table class="display-table default-view">
                        <thead>
                            <tr>
                                <th rowspan="3">NO</th>
                                <th rowspan="3">실</th>
                                <th rowspan="3">부위</th>
                                <th rowspan="3">공종</th>
                                <th rowspan="3">품명</th>
                                <th rowspan="3">규격</th>
                                <th rowspan="3">단위</th>
                                <th rowspan="3">수량</th>
                                <th colspan="6">도급</th>
                                <th colspan="6">실행</th>
                            </tr>
                            <tr>
                                <th colspan="2">자재비</th>
                                <th colspan="2">노무비</th>
                                <th colspan="2">합계</th>
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
                                <th>단가</th>
                                <th>금액</th>
                                <th>단가</th>
                                <th>금액</th>
                                <th>단가</th>
                                <th>금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sampleData.map(item => `
                                <tr>
                                    <td>${item.no}</td>
                                    <td>${item.room}</td>
                                    <td>${item.location}</td>
                                    <td>${item.workType}</td>
                                    <td>${item.itemName}</td>
                                    <td>${item.spec}</td>
                                    <td>${item.unit}</td>
                                    <td>${item.qty.toFixed(2)}</td>
                                    <td>₩${item.materialUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.materialAmount.toLocaleString()}</td>
                                    <td>₩${item.contractLaborUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.contractLaborAmount.toLocaleString()}</td>
                                    <td>₩${(item.materialUnitPrice + item.contractLaborUnitPrice).toLocaleString()}</td>
                                    <td>₩${item.contractTotal.toLocaleString()}</td>
                                    <td>₩${item.actualMaterialUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.actualMaterialAmount.toLocaleString()}</td>
                                    <td>₩${item.actualLaborUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.actualLaborAmount.toLocaleString()}</td>
                                    <td>₩${(item.actualMaterialUnitPrice + item.actualLaborUnitPrice).toLocaleString()}</td>
                                    <td>₩${item.actualTotal.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // 타입별보기 렌더링
    renderTypeView() {
        const sampleData = [
            {
                type: 'W-01',
                items: [
                    {
                        itemName: 'C-STUD',
                        spec: '65형',
                        unit: 'M2',
                        qty: 50.00,
                        materialUnitPrice: 3000,
                        materialAmount: 150000,
                        laborUnitPrice: 3400,
                        laborAmount: 170000,
                        contractUnitPrice: 6400,
                        contractAmount: 320000,
                        actualMaterialUnitPrice: 7500,
                        actualMaterialAmount: 375000,
                        actualLaborUnitPrice: 7000,
                        actualLaborAmount: 350000,
                        actualUnitPrice: 14500,
                        actualAmount: 725000
                    },
                    {
                        itemName: '그라스울',
                        spec: '24K50T',
                        unit: 'M2',
                        qty: 50.00,
                        materialUnitPrice: 4200,
                        materialAmount: 210000,
                        laborUnitPrice: 0,
                        laborAmount: 0,
                        contractUnitPrice: 4200,
                        contractAmount: 210000,
                        actualMaterialUnitPrice: 3500,
                        actualMaterialAmount: 175000,
                        actualLaborUnitPrice: 0,
                        actualLaborAmount: 0,
                        actualUnitPrice: 3500,
                        actualAmount: 175000
                    },
                    {
                        itemName: '그라스울 취부',
                        spec: '24K50T',
                        unit: 'M2',
                        qty: 50.00,
                        materialUnitPrice: 0,
                        materialAmount: 0,
                        laborUnitPrice: 3600,
                        laborAmount: 180000,
                        contractUnitPrice: 3600,
                        contractAmount: 180000,
                        actualMaterialUnitPrice: 0,
                        actualMaterialAmount: 0,
                        actualLaborUnitPrice: 3000,
                        actualLaborAmount: 150000,
                        actualUnitPrice: 3000,
                        actualAmount: 150000
                    },
                    {
                        itemName: '석고보드',
                        spec: '9.5T*2P',
                        unit: 'M2',
                        qty: 50.00,
                        materialUnitPrice: 6000,
                        materialAmount: 300000,
                        laborUnitPrice: 0,
                        laborAmount: 0,
                        contractUnitPrice: 6000,
                        contractAmount: 300000,
                        actualMaterialUnitPrice: 5000,
                        actualMaterialAmount: 250000,
                        actualLaborUnitPrice: 0,
                        actualLaborAmount: 0,
                        actualUnitPrice: 5000,
                        actualAmount: 250000
                    },
                    {
                        itemName: '석고보드 취부',
                        spec: '9.5T*2P',
                        unit: 'M2',
                        qty: 50.00,
                        materialUnitPrice: 0,
                        materialAmount: 0,
                        laborUnitPrice: 6240,
                        laborAmount: 312000,
                        contractUnitPrice: 6240,
                        contractAmount: 312000,
                        actualMaterialUnitPrice: 0,
                        actualMaterialAmount: 0,
                        actualLaborUnitPrice: 5200,
                        actualLaborAmount: 260000,
                        actualUnitPrice: 5200,
                        actualAmount: 260000
                    }
                ]
            }
        ];

        return `
            <div class="display-table-container">
                <div class="display-table-scroll">
                    <table class="display-table type-view">
                        <thead>
                            <tr>
                                <th rowspan="3">TYPE</th>
                                <th rowspan="3">품명</th>
                                <th rowspan="3">규격</th>
                                <th rowspan="3">단위</th>
                                <th rowspan="3">수량</th>
                                <th colspan="6">도급</th>
                                <th colspan="6">실행</th>
                            </tr>
                            <tr>
                                <th colspan="2">자재</th>
                                <th colspan="2">노무</th>
                                <th colspan="2">합계</th>
                                <th colspan="2">자재</th>
                                <th colspan="2">노무</th>
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
                            </tr>
                        </thead>
                        <tbody>
                            ${sampleData.map(typeData => {
                                let totalContractAmount = 0;
                                let totalActualAmount = 0;
                                
                                const itemRows = typeData.items.map((item, index) => {
                                    totalContractAmount += item.contractAmount;
                                    totalActualAmount += item.actualAmount;
                                    
                                    return `
                                        <tr>
                                            ${index === 0 ? `<td rowspan="${typeData.items.length + 1}">${typeData.type}</td>` : ''}
                                            <td>${item.itemName}</td>
                                            <td>${item.spec}</td>
                                            <td>${item.unit}</td>
                                            <td>${item.qty.toFixed(2)}</td>
                                            <td>₩${item.materialUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.materialAmount.toLocaleString()}</td>
                                            <td>₩${item.laborUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.laborAmount.toLocaleString()}</td>
                                            <td>₩${item.contractUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.contractAmount.toLocaleString()}</td>
                                            <td>₩${item.actualMaterialUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.actualMaterialAmount.toLocaleString()}</td>
                                            <td>₩${item.actualLaborUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.actualLaborAmount.toLocaleString()}</td>
                                            <td>₩${item.actualUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.actualAmount.toLocaleString()}</td>
                                        </tr>
                                    `;
                                }).join('');
                                
                                const subtotalRow = `
                                    <tr class="subtotal-row">
                                        <td colspan="4" style="text-align: center; font-weight: bold;">소계</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>₩${totalContractAmount.toLocaleString()}</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td>₩${totalActualAmount.toLocaleString()}</td>
                                    </tr>
                                `;
                                
                                return itemRows + subtotalRow;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // 재료별보기 렌더링
    renderMaterialView() {
        const sampleData = [
            {
                category: 'W',
                itemName: 'C-STUD',
                spec: '65형',
                specDetail: '',
                unit: 'M2',
                qty: 200.00,
                usage: 'EA',
                usageQty: 156.00,
                contractMaterialUnitPrice: 8500,
                contractMaterialAmount: 1700000,
                contractLaborUnitPrice: 8000,
                contractLaborAmount: 1600000,
                contractTotalUnitPrice: 16500,
                contractTotalAmount: 3300000,
                actualMaterialUnitPrice: 7500,
                actualMaterialAmount: 1500000,
                actualLaborUnitPrice: 7000,
                actualLaborAmount: 1400000,
                actualTotalUnitPrice: 14500,
                actualTotalAmount: 2900000
            },
            {
                category: 'W',
                itemName: '석고보드',
                spec: '9.5T*2P',
                specDetail: '',
                unit: 'M2',
                qty: 200.00,
                usage: 'EA',
                usageQty: 247.00,
                contractMaterialUnitPrice: 7000,
                contractMaterialAmount: 1400000,
                contractLaborUnitPrice: 0,
                contractLaborAmount: 0,
                contractTotalUnitPrice: 7000,
                contractTotalAmount: 1400000,
                actualMaterialUnitPrice: 5000,
                actualMaterialAmount: 1000000,
                actualLaborUnitPrice: 0,
                actualLaborAmount: 0,
                actualTotalUnitPrice: 5000,
                actualTotalAmount: 1000000
            }
        ];

        return `
            <div class="display-table-container">
                <div class="display-table-scroll">
                    <table class="display-table material-view">
                        <thead>
                            <tr>
                                <th rowspan="3">부위</th>
                                <th rowspan="3">품명</th>
                                <th rowspan="3">규격</th>
                                <th rowspan="3">SPEC</th>
                                <th rowspan="3">단위</th>
                                <th rowspan="3">수량</th>
                                <th colspan="2">발주수량</th>
                                <th colspan="6">도급</th>
                                <th colspan="6">실행</th>
                            </tr>
                            <tr>
                                <th rowspan="2">단위</th>
                                <th rowspan="2">수량</th>
                                <th colspan="2">자재비</th>
                                <th colspan="2">노무비</th>
                                <th colspan="2">합계</th>
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
                                <th>단가</th>
                                <th>금액</th>
                                <th>단가</th>
                                <th>금액</th>
                                <th>단가</th>
                                <th>금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sampleData.map(item => `
                                <tr>
                                    <td>${item.category}</td>
                                    <td>${item.itemName}</td>
                                    <td>${item.spec}</td>
                                    <td>${item.specDetail}</td>
                                    <td>${item.unit}</td>
                                    <td>${item.qty.toFixed(2)}</td>
                                    <td>${item.usage}</td>
                                    <td>${item.usageQty.toFixed(2)}</td>
                                    <td>₩${item.contractMaterialUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.contractMaterialAmount.toLocaleString()}</td>
                                    <td>₩${item.contractLaborUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.contractLaborAmount.toLocaleString()}</td>
                                    <td>₩${item.contractTotalUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.contractTotalAmount.toLocaleString()}</td>
                                    <td>₩${item.actualMaterialUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.actualMaterialAmount.toLocaleString()}</td>
                                    <td>₩${item.actualLaborUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.actualLaborAmount.toLocaleString()}</td>
                                    <td>₩${item.actualTotalUnitPrice.toLocaleString()}</td>
                                    <td>₩${item.actualTotalAmount.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // 공종별보기 렌더링
    renderWorkTypeView() {
        const sampleData = [
            {
                workType: '경량',
                items: [
                    {
                        category: 'W',
                        itemName: 'C-STUD',
                        spec: '65형',
                        unit: 'M2',
                        qty: 100.00,
                        contractMaterialUnitPrice: 9000,
                        contractMaterialAmount: 900000,
                        contractLaborUnitPrice: 0,
                        contractLaborAmount: 0,
                        contractTotalUnitPrice: 17400,
                        contractTotalAmount: 1740000,
                        actualMaterialUnitPrice: 7500,
                        actualMaterialAmount: 750000,
                        actualLaborUnitPrice: 7000,
                        actualLaborAmount: 700000,
                        actualTotalUnitPrice: 14500,
                        actualTotalAmount: 1450000
                    },
                    {
                        category: 'W',
                        itemName: '석고보드 취부',
                        spec: '9.5T*1P',
                        unit: 'M2',
                        qty: 100.00,
                        contractMaterialUnitPrice: 0,
                        contractMaterialAmount: 0,
                        contractLaborUnitPrice: 3120,
                        contractLaborAmount: 312000,
                        contractTotalUnitPrice: 3120,
                        contractTotalAmount: 312000,
                        actualMaterialUnitPrice: 0,
                        actualMaterialAmount: 0,
                        actualLaborUnitPrice: 2600,
                        actualLaborAmount: 260000,
                        actualTotalUnitPrice: 2600,
                        actualTotalAmount: 260000
                    },
                    {
                        category: 'W',
                        itemName: '그라스울 취부',
                        spec: '24K50T',
                        unit: 'M2',
                        qty: 100.00,
                        contractMaterialUnitPrice: 0,
                        contractMaterialAmount: 0,
                        contractLaborUnitPrice: 2640,
                        contractLaborAmount: 264000,
                        contractTotalUnitPrice: 2640,
                        contractTotalAmount: 264000,
                        actualMaterialUnitPrice: 0,
                        actualMaterialAmount: 0,
                        actualLaborUnitPrice: 2200,
                        actualLaborAmount: 220000,
                        actualTotalUnitPrice: 2200,
                        actualTotalAmount: 220000
                    },
                    {
                        category: 'C',
                        itemName: 'L.G.S',
                        spec: 'M-BAR',
                        unit: 'M2',
                        qty: 50.00,
                        contractMaterialUnitPrice: 9000,
                        contractMaterialAmount: 450000,
                        contractLaborUnitPrice: 8400,
                        contractLaborAmount: 420000,
                        contractTotalUnitPrice: 17400,
                        contractTotalAmount: 870000,
                        actualMaterialUnitPrice: 7500,
                        actualMaterialAmount: 375000,
                        actualLaborUnitPrice: 7000,
                        actualLaborAmount: 350000,
                        actualTotalUnitPrice: 14500,
                        actualTotalAmount: 725000
                    },
                    {
                        category: 'C',
                        itemName: '석고보드 취부',
                        spec: '9.5T*2P',
                        unit: 'M2',
                        qty: 50.00,
                        contractMaterialUnitPrice: 0,
                        contractMaterialAmount: 0,
                        contractLaborUnitPrice: 6240,
                        contractLaborAmount: 312000,
                        contractTotalUnitPrice: 6240,
                        contractTotalAmount: 312000,
                        actualMaterialUnitPrice: 0,
                        actualMaterialAmount: 0,
                        actualLaborUnitPrice: 5200,
                        actualLaborAmount: 260000,
                        actualTotalUnitPrice: 5200,
                        actualTotalAmount: 260000
                    },
                    {
                        category: 'C',
                        itemName: '시트를 취부',
                        spec: 'T자 골플',
                        unit: 'M',
                        qty: 20.00,
                        contractMaterialUnitPrice: 0,
                        contractMaterialAmount: 0,
                        contractLaborUnitPrice: 1800,
                        contractLaborAmount: 36000,
                        contractTotalUnitPrice: 1800,
                        contractTotalAmount: 36000,
                        actualMaterialUnitPrice: 0,
                        actualMaterialAmount: 0,
                        actualLaborUnitPrice: 1500,
                        actualLaborAmount: 30000,
                        actualTotalUnitPrice: 1500,
                        actualTotalAmount: 30000
                    }
                ]
            }
        ];

        return `
            <div class="display-table-container">
                <div class="display-table-scroll">
                    <table class="display-table work-type-view">
                        <thead>
                            <tr>
                                <th rowspan="3">공종</th>
                                <th rowspan="3">부위</th>
                                <th rowspan="3">품명</th>
                                <th rowspan="3">규격</th>
                                <th rowspan="3">단위</th>
                                <th rowspan="3">수량</th>
                                <th colspan="6">도급</th>
                                <th colspan="6">실행</th>
                            </tr>
                            <tr>
                                <th colspan="2">자재비</th>
                                <th colspan="2">노무비</th>
                                <th colspan="2">합계</th>
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
                                <th>단가</th>
                                <th>금액</th>
                                <th>단가</th>
                                <th>금액</th>
                                <th>단가</th>
                                <th>금액</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sampleData.map(workTypeData => {
                                let totalContractMaterialAmount = 0;
                                let totalContractLaborAmount = 0;
                                let totalContractAmount = 0;
                                let totalActualMaterialAmount = 0;
                                let totalActualLaborAmount = 0;
                                let totalActualAmount = 0;
                                
                                const itemRows = workTypeData.items.map((item, index) => {
                                    totalContractMaterialAmount += item.contractMaterialAmount;
                                    totalContractLaborAmount += item.contractLaborAmount;
                                    totalContractAmount += item.contractTotalAmount;
                                    totalActualMaterialAmount += item.actualMaterialAmount;
                                    totalActualLaborAmount += item.actualLaborAmount;
                                    totalActualAmount += item.actualTotalAmount;
                                    
                                    return `
                                        <tr>
                                            ${index === 0 ? `<td rowspan="${workTypeData.items.length + 1}">${workTypeData.workType}</td>` : ''}
                                            <td>${item.category}</td>
                                            <td>${item.itemName}</td>
                                            <td>${item.spec}</td>
                                            <td>${item.unit}</td>
                                            <td>${item.qty.toFixed(2)}</td>
                                            <td>₩${item.contractMaterialUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.contractMaterialAmount.toLocaleString()}</td>
                                            <td>₩${item.contractLaborUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.contractLaborAmount.toLocaleString()}</td>
                                            <td>₩${item.contractTotalUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.contractTotalAmount.toLocaleString()}</td>
                                            <td>₩${item.actualMaterialUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.actualMaterialAmount.toLocaleString()}</td>
                                            <td>₩${item.actualLaborUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.actualLaborAmount.toLocaleString()}</td>
                                            <td>₩${item.actualTotalUnitPrice.toLocaleString()}</td>
                                            <td>₩${item.actualTotalAmount.toLocaleString()}</td>
                                        </tr>
                                    `;
                                }).join('');
                                
                                const subtotalRow = `
                                    <tr class="subtotal-row">
                                        <td colspan="5" style="text-align: center; font-weight: bold;">소 계</td>
                                        <td></td>
                                        <td>₩${totalContractMaterialAmount.toLocaleString()}</td>
                                        <td></td>
                                        <td>₩${totalContractLaborAmount.toLocaleString()}</td>
                                        <td></td>
                                        <td>₩${totalContractAmount.toLocaleString()}</td>
                                        <td></td>
                                        <td>₩${totalActualMaterialAmount.toLocaleString()}</td>
                                        <td></td>
                                        <td>₩${totalActualLaborAmount.toLocaleString()}</td>
                                        <td></td>
                                        <td>₩${totalActualAmount.toLocaleString()}</td>
                                    </tr>
                                `;
                                
                                return itemRows + subtotalRow;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
};

// 드롭다운 토글 함수
function toggleDisplayModeDropdown() {
    const dropdown = document.getElementById('displayModeDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// 외부 클릭 시 드롭다운 닫기
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('displayModeDropdown');
    const button = document.getElementById('displayModeButton');
    
    if (dropdown && button && !button.contains(event.target) && !dropdown.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    if (window.DisplaySystem) {
        window.DisplaySystem.render();
        window.DisplaySystem.updateDropdownButton();
    }
});