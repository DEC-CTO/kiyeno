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
        // 하드코딩된 샘플 데이터 제거 - 실제 데이터는 일위대가 관리에서 생성
        const sampleData = [];

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
                            ${sampleData.length > 0 ? sampleData.map(item => `
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
                            `).join('') : `
                                <tr>
                                    <td colspan="20" style="text-align: center; padding: 40px; color: #666;">
                                        데이터가 없습니다. 일위대가 관리에서 세부아이템을 생성해주세요.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // 타입별보기 렌더링
    renderTypeView() {
        // 하드코딩된 타입별 샘플 데이터 제거 - 실제 데이터는 일위대가 관리에서 생성
        const sampleData = [];

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
                            ${sampleData.length > 0 ? sampleData.map(typeData => {
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
                            }).join('') : `
                                <tr>
                                    <td colspan="17" style="text-align: center; padding: 40px; color: #666;">
                                        데이터가 없습니다. 일위대가 관리에서 세부아이템을 생성해주세요.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // 재료별보기 렌더링
    renderMaterialView() {
        const sampleData = [];

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
                            ${sampleData.length > 0 ? sampleData.map(item => `
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
                            `).join('') : `
                                <tr>
                                    <td colspan="20" style="text-align: center; padding: 40px; color: #666;">
                                        데이터가 없습니다. 일위대가 관리에서 세부아이템을 생성해주세요.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // 공종별보기 렌더링
    renderWorkTypeView() {
        const sampleData = [];

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
                            ${sampleData.length > 0 ? sampleData.map(workTypeData => {
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
                            }).join('') : `
                                <tr>
                                    <td colspan="18" style="text-align: center; padding: 40px; color: #666;">
                                        데이터가 없습니다. 일위대가 관리에서 세부아이템을 생성해주세요.
                                    </td>
                                </tr>
                            `}
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